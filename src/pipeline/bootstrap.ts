import { db } from '../db';
import { User, PlatformCredentials } from '@prisma/client';
import { bot } from '../delivery/telegram';
import { fetchGitHubHistory } from '../collectors/github';
import { scrapeXProfile } from '../collectors/x-scraper';
import { extractEntities } from '../parsers/entity-extractor';
import { upsertEntity } from '../brain/memory/knowledge-graph';
import { updateBlockContent } from '../brain/memory/blocks';
import { evaluateHistoryForUserFacts } from '../brain/evaluators/history-evaluator';
import { buildTemporalContext } from '../brain/guide/temporal-context';
import { guideBootstrapCompleteTemplate } from '../delivery/templates';

export async function runBootstrapForUser(user: User, creds: PlatformCredentials, telegramId: string) {
  try {
    // 1. Notify user it's starting
    await bot.telegram.sendMessage(telegramId, `📡 *Scanning your history\\.\\.\\.* \n_I\\'m looking at your recent commits and tweets to learn about you faster\\._`, { parse_mode: 'MarkdownV2' });

    // 2. Parallel scrape: GitHub history + X tweets
    const [ghEvents, xTweetsRaw] = await Promise.all([
      creds.githubUsername ? fetchGitHubHistory(creds.githubUsername, creds.githubPat ?? null, 30) : Promise.resolve([]),
      creds.xHandle ? scrapeXProfile(creds.xHandle, creds.xAuthToken ?? null) : Promise.resolve(null)
    ]);

    // Convert raw X articles to HistoricalActivity format
    const xEvents = (xTweetsRaw?.rawArticles || []).map((text: string, i: number) => ({
      userId: user.id,
      platform: 'x',
      type: 'tweet',
      content: text,
      url: null,
      eventAt: new Date(Date.now() - i * 1000 * 60 * 60 * 24), // Rough estimate for now since scraper doesn't get exact dates easily
      topics: [],
      sentiment: null,
      isBootstrap: true
    }));

    const allRecords = [...ghEvents.map(e => ({ ...e, userId: user.id, isBootstrap: true })), ...xEvents];

    // 3. Bulk insert into HistoricalActivity
    if (allRecords.length > 0) {
      // Prisma createMany does not return the inserted items, but we already have them in memory.
      // Filter out duplicate IDs or just use createMany.
      // Since fetchGitHubHistory doesn't return `userId` we add it above.
      await db.historicalActivity.createMany({ 
        data: allRecords, 
        skipDuplicates: true 
      });
    }

    // 4. ZEP-INSPIRED: Build temporal entity awareness & Extract Entities
    const temporalContext = await buildTemporalContext(user.id, allRecords);
    const extracted = await extractEntities(temporalContext, user.ultimateGoals);
    
    let entitiesFound = 0;
    for (const entity of extracted.entities) {
      // Upsert into World Block KG
      await upsertEntity(user.id, entity.name, { ...entity });
      entitiesFound++;
    }

    // 5. ELIZAOS-INSPIRED: Async evaluator writes discovered facts to Human block
    const discoveredFacts = await evaluateHistoryForUserFacts(allRecords, user);
    await updateBlockContent(user.id, 'human', discoveredFacts, 'bootstrap_evaluator');

    // 6. Notify user with results
    const stats = {
      commits: ghEvents.length,
      tweets: xEvents.length,
      entities: entitiesFound
    };
    await bot.telegram.sendMessage(telegramId, guideBootstrapCompleteTemplate(stats.commits, stats.tweets, stats.entities), { parse_mode: 'MarkdownV2' });

  } catch (error) {
    console.error('Error during bootstrap:', error);
    await bot.telegram.sendMessage(telegramId, `⚠️ *Bootstrap skipped\\.* We\\'ll learn about you as we go\\!`, { parse_mode: 'MarkdownV2' });
  }
}
