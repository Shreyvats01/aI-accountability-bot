import { db } from '../../db';
import { generateEmbedding } from './embeddings';

export async function searchSimilarEpisodes(userId: string, queryEmbedding: number[], limit: number = 3) {
  // Using pgvector cosine distance operator (<=>)
  const episodes: any[] = await db.$queryRaw`
    SELECT id, "eventType", narrative, "triggerContext", "emotionalTone", "activeStrategy", "strategyOutcome", "createdAt"
    FROM "EpisodicMemory"
    WHERE "userId" = ${userId}
    ORDER BY embedding <=> ${queryEmbedding}::vector
    LIMIT ${limit};
  `;
  return episodes;
}

export async function createEpisode(
  userId: string,
  eventType: string,
  narrative: string,
  triggerContext: any,
  emotionalTone?: string,
  activeStrategy?: string,
  strategyOutcome?: string
) {
  const vector = await generateEmbedding(narrative);
  
  const result: any[] = await db.$queryRaw`
    INSERT INTO "EpisodicMemory" (id, "userId", "eventType", narrative, "triggerContext", embedding, "emotionalTone", "activeStrategy", "strategyOutcome", "createdAt")
    VALUES (gen_random_uuid(), ${userId}, ${eventType}, ${narrative}, ${JSON.stringify(triggerContext)}::jsonb, ${vector}::vector, ${emotionalTone || null}, ${activeStrategy || null}, ${strategyOutcome || null}, NOW())
    RETURNING id;
  `;
  
  return db.episodicMemory.findUnique({ where: { id: result[0].id } });
}

export function formatEpisodes(episodes: any[]): string {
  if (episodes.length === 0) return 'No relevant past episodes found.';
  return episodes.map((ep, i) => `Episode ${i+1} (${ep.createdAt}): [${ep.eventType}] ${ep.narrative} | Tone: ${ep.emotionalTone} | Strategy Outcome: ${ep.strategyOutcome}`).join('\n');
}
