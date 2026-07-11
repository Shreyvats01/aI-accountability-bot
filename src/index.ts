import { bot, setBotCommands, sendTypingIndicator, answerCallback } from './delivery/telegram';
import { db } from './db';
import { initializeDefaultBlocks, getBlock, updateBlockContent } from './brain/memory/blocks';
import { processUserReply } from './delivery/reply-processor';
import { upsertEntity } from './brain/memory/knowledge-graph';
import {
  welcomeNewUserTemplate,
  goalsReceivedTemplate,
  onboardingCompleteTemplate,
  returningUserTemplate,
  statusTemplate,
  memoryBlocksTemplate,
  strategyTemplate,
  helpTemplate,
  replyAckTemplate,
  buttonFeedbackTemplate,
  escapeMarkdown,
} from './delivery/templates';
import {
  postOnboardingKeyboard,
  statusKeyboard,
  helpKeyboard,
  backKeyboard,
  mainMenuKeyboard,
} from './delivery/keyboards';
import { updateReward } from './brain/bandit/thompson';
import { decomposeGoalIntoTasks } from './brain/guide/decompose';

import { runBootstrapForUser } from './pipeline/bootstrap';
import { getActiveSession, startGuideSession, addTurn, markSessionSynthesizing, closeSession } from './guide/session-manager';
import { generateGuideOpener, generateGuideTurn, synthesizeWithAgents } from './brain/guide/conversation';
import { evaluateGuideTurn } from './brain/evaluators/turn-evaluator';
import {
  guideOpenerTemplate,
  guideTurnTemplate,
  guideActionPlanTemplate,
  guideBootstrapCompleteTemplate
} from './delivery/templates';
import {
  guideRootCauseKeyboard,
  guideDynamicKeyboard,
  guideFreeWriteKeyboard,
  guideActionPlanKeyboard
} from './delivery/keyboards';

console.log('[Bot] Starting...');

// ─────────────────────────────────────────────────────────
//  Multi-step onboarding state (in-memory)
// ─────────────────────────────────────────────────────────
const onboardingState: Record<string, { step: string; data: Record<string, string> }> = {};

// ─────────────────────────────────────────────────────────
//  /start
// ─────────────────────────────────────────────────────────
bot.start(async (ctx) => {
  const telegramId = ctx.message.chat.id.toString();
  const firstName = ctx.message.from.first_name || 'User';

  await sendTypingIndicator(telegramId);

  const existingUser = await db.user.findUnique({ where: { telegramId } });

  if (existingUser) {
    await ctx.replyWithMarkdownV2(
      returningUserTemplate(existingUser.name || firstName, existingUser.currentStreak),
      statusKeyboard()
    );
    return;
  }

  // Begin onboarding
  onboardingState[telegramId] = { step: 'awaiting_goals', data: { name: firstName } };
  await ctx.replyWithMarkdownV2(welcomeNewUserTemplate(firstName));
});

// ─────────────────────────────────────────────────────────
//  /status
// ─────────────────────────────────────────────────────────
bot.command('status', async (ctx) => {
  const telegramId = ctx.message.chat.id.toString();
  await sendTypingIndicator(telegramId);

  const user = await db.user.findUnique({ where: { telegramId } });
  if (!user) {
    await ctx.replyWithMarkdownV2('You haven\'t set up the bot yet\\. Send /start to begin\\!');
    return;
  }

  const [lastLog, arms] = await Promise.all([
    db.dailyLog.findFirst({ where: { userId: user.id }, orderBy: { date: 'desc' } }),
    db.strategyArm.findMany({ where: { userId: user.id }, orderBy: { alpha: 'desc' } })
  ]);

  await ctx.replyWithMarkdownV2(
    statusTemplate(user, lastLog, arms[0] ?? null),
    statusKeyboard()
  );
});

// ─────────────────────────────────────────────────────────
//  /memory
// ─────────────────────────────────────────────────────────
bot.command('memory', async (ctx) => {
  const telegramId = ctx.message.chat.id.toString();
  await sendTypingIndicator(telegramId);

  const user = await db.user.findUnique({ where: { telegramId } });
  if (!user) { await ctx.reply('Send /start first.'); return; }

  const [persona, human] = await Promise.all([
    getBlock(user.id, 'persona'),
    getBlock(user.id, 'human'),
  ]);

  await ctx.replyWithMarkdownV2(
    memoryBlocksTemplate(persona?.content ?? 'Not initialized.', human?.content ?? 'Not initialized.'),
    backKeyboard()
  );
});

// ─────────────────────────────────────────────────────────
//  /strategy
// ─────────────────────────────────────────────────────────
bot.command('strategy', async (ctx) => {
  const telegramId = ctx.message.chat.id.toString();
  await sendTypingIndicator(telegramId);

  const user = await db.user.findUnique({ where: { telegramId } });
  if (!user) { await ctx.reply('Send /start first.'); return; }

  const arms = await db.strategyArm.findMany({ where: { userId: user.id } });

  if (arms.length === 0) {
    await ctx.replyWithMarkdownV2(`No strategy data yet\\. I'll start learning after your first nightly pipeline\\!`);
    return;
  }

  await ctx.replyWithMarkdownV2(strategyTemplate(arms), backKeyboard());
});

// ─────────────────────────────────────────────────────────
//  /setup — update GitHub username
// ─────────────────────────────────────────────────────────
bot.command('setup', async (ctx) => {
  const telegramId = ctx.message.chat.id.toString();
  onboardingState[telegramId] = { step: 'awaiting_github', data: {} };
  await ctx.replyWithMarkdownV2(
    `🔧 *Update Your Profile*\n━━━━━━━━━━━━━━━\n\nWhat is your *GitHub username*?\n\n_e\\.g\\. \`shreyy\` — I'll use it to auto\\-track your commits and PRs_\n\nType \`skip\` to cancel\\.`
  );
});

// ─────────────────────────────────────────────────────────
//  /help
// ─────────────────────────────────────────────────────────
bot.command('help', async (ctx) => {
  await sendTypingIndicator(ctx.message.chat.id.toString());
  await ctx.replyWithMarkdownV2(helpTemplate(), helpKeyboard());
});

// ─────────────────────────────────────────────────────────
//  /guide
// ─────────────────────────────────────────────────────────
bot.command('guide', async (ctx) => {
  const telegramId = ctx.message.chat.id.toString();
  await sendTypingIndicator(telegramId);
  const user = await db.user.findUnique({ where: { telegramId } });
  if (!user) { await ctx.reply('Send /start first.'); return; }

  const opener = await generateGuideOpener(user.id);
  await startGuideSession(user.id, 'command', undefined, opener.strategy);
  const session = await getActiveSession(user.id);
  if (session) await addTurn(session.id, 'bot', opener.text);

  await ctx.replyWithMarkdownV2(
    guideOpenerTemplate(user.name || 'there', opener.text),
    guideRootCauseKeyboard(opener.quickReplies)
  );
});

// ─────────────────────────────────────────────────────────
//  PERSISTENT REPLY KEYBOARD SHORTCUTS
// ─────────────────────────────────────────────────────────
async function handleTextShortcut(ctx: any, text: string): Promise<boolean> {
  const telegramId = ctx.message.chat.id.toString();
  const user = await db.user.findUnique({ where: { telegramId } });

  if (text === '📊 My Stats') {
    if (!user) { await ctx.reply('Send /start first.'); return true; }
    await sendTypingIndicator(telegramId);
    const [lastLog, arms] = await Promise.all([
      db.dailyLog.findFirst({ where: { userId: user.id }, orderBy: { date: 'desc' } }),
      db.strategyArm.findMany({ where: { userId: user.id }, orderBy: { alpha: 'desc' } })
    ]);
    await ctx.replyWithMarkdownV2(statusTemplate(user, lastLog, arms[0] ?? null), statusKeyboard());
    return true;
  }

  if (text === '🧠 Memory') {
    if (!user) { await ctx.reply('Send /start first.'); return true; }
    await sendTypingIndicator(telegramId);
    const [persona, human] = await Promise.all([getBlock(user.id, 'persona'), getBlock(user.id, 'human')]);
    await ctx.replyWithMarkdownV2(memoryBlocksTemplate(persona?.content ?? '…', human?.content ?? '…'), backKeyboard());
    return true;
  }

  if (text === '🎯 Strategy') {
    if (!user) { await ctx.reply('Send /start first.'); return true; }
    await sendTypingIndicator(telegramId);
    const arms = await db.strategyArm.findMany({ where: { userId: user.id } });
    if (arms.length === 0) { await ctx.reply('No data yet. Run the nightly pipeline first!'); return true; }
    await ctx.replyWithMarkdownV2(strategyTemplate(arms), backKeyboard());
    return true;
  }

  if (text === '❓ Help') {
    await sendTypingIndicator(telegramId);
    await ctx.replyWithMarkdownV2(helpTemplate(), helpKeyboard());
    return true;
  }

  return false;
}

// ─────────────────────────────────────────────────────────
//  TEXT HANDLER — onboarding + shortcuts + replies
// ─────────────────────────────────────────────────────────
bot.on('text', async (ctx) => {
  const telegramId = ctx.message.chat.id.toString();
  const text = ctx.message.text;

  // Skip command messages
  if (text.startsWith('/')) return;

  // Check persistent keyboard shortcuts first
  const wasShortcut = await handleTextShortcut(ctx, text);
  if (wasShortcut) return;

  // Multi-step onboarding state machine
  const state = onboardingState[telegramId];
  if (state) {
    if (state.step === 'awaiting_goals') {
      state.data.goals = text;
      state.step = 'awaiting_github';
      await ctx.replyWithMarkdownV2(goalsReceivedTemplate(text));
      return;
    }

    if (state.step === 'awaiting_github') {
      const githubUsername = text.toLowerCase() === 'skip' ? null : text.trim().replace(/^@/, '');
      state.data.github = githubUsername || '';
      state.step = 'awaiting_x';
      await ctx.replyWithMarkdownV2(
        `🐦 *One more thing*\n\nWhat is your X \\(Twitter\\) handle?\n\n_e\\.g\\. \`shreyy\` — I'll use it to learn about your interests and public updates\\._\n\nType \`skip\` to cancel\\.`
      );
      return;
    }

    if (state.step === 'awaiting_x') {
      const xHandle = text.toLowerCase() === 'skip' ? null : text.trim().replace(/^@/, '');
      const githubUsername = state.data.github || null;
      state.step = 'done';
      delete onboardingState[telegramId];

      await sendTypingIndicator(telegramId);

      const user = await db.user.upsert({
        where: { telegramId },
        update: { name: state.data.name, ultimateGoals: state.data.goals || 'Build consistent habits.' },
        create: {
          telegramId,
          name: state.data.name,
          ultimateGoals: state.data.goals || 'Build consistent habits.'
        }
      });

      if (githubUsername) {
        await db.platformCredentials.upsert({
          where: { userId: user.id },
          update: { githubUsername },
          create: { userId: user.id, githubUsername }
        });
        await upsertEntity(user.id, githubUsername, {
          type: 'github_profile',
          description: `User's GitHub profile`,
          status: 'active'
        });
      }

      if (xHandle) {
        await db.platformCredentials.update({
          where: { userId: user.id },
          data: { xHandle }
        });
      }

      await initializeDefaultBlocks(user.id, user.name || 'User', user.ultimateGoals);

      const humanContent = `Name: ${user.name}\nGoals: ${user.ultimateGoals}\nTimezone: Asia/Kolkata\n${githubUsername ? `GitHub: ${githubUsername}` : 'GitHub: not set'}\nThis profile will evolve as I learn more about you.`;
      await updateBlockContent(user.id, 'human', humanContent, 'onboarding');

      // Auto-GPT Goal Decomposition
      const session = await db.guideSession.create({
        data: { userId: user.id, status: 'synthesizing', triggerType: 'command' }
      });
      decomposeGoalIntoTasks(user.id, user.ultimateGoals, session.id).catch(console.error);

      await ctx.replyWithMarkdownV2(
        onboardingCompleteTemplate(user.name || 'User', user.ultimateGoals, githubUsername),
        postOnboardingKeyboard()
      );

      // Show the persistent keyboard
      await ctx.reply('Your quick-access menu is ready 👇', mainMenuKeyboard());

      // Trigger Bootstrap async
      const creds = await db.platformCredentials.findUnique({ where: { userId: user.id } });
      if (creds) {
        setImmediate(() => runBootstrapForUser(user, creds, telegramId).catch(console.error));
      }
      return;
    }
  }

  const user = await db.user.findUnique({ where: { telegramId } });
  if (!user) {
    await ctx.replyWithMarkdownV2(`I don\\'t think we\\'ve been introduced yet\\! Send /start to get set up\\.`);
    return;
  }

  // --- GUIDE SYSTEM ROUTING & NLP TRIGGER ---
  const activeSession = await getActiveSession(user.id);
  if (activeSession) {
    // Add turn and generate response
    await sendTypingIndicator(telegramId);
    await addTurn(activeSession.id, 'user', text);
    // Silent turn evaluator
    setImmediate(() => evaluateGuideTurn(user.id, text, activeSession.transcript as any[]).catch(console.error));

    const reply = await generateGuideTurn(activeSession, text);
    
    // update session with bot turn
    await addTurn(activeSession.id, 'bot', reply.text);

    if (reply.isFinalQuestion) {
      await ctx.reply(reply.text, guideFreeWriteKeyboard());
    } else {
      await ctx.reply(reply.text, reply.buttons && reply.buttons.length > 0 ? guideDynamicKeyboard(reply.buttons) : undefined);
    }
    return;
  }

  // Check NLP Trigger for Guide
  const triggerWords = ['stuck', 'distracted', 'lost', 'confused', 'overwhelmed', 'don\'t know what to do', 'help me focus', 'can\'t focus', 'procrastinating'];
  if (triggerWords.some(w => text.toLowerCase().includes(w))) {
    await sendTypingIndicator(telegramId);
    const opener = await generateGuideOpener(user.id);
    await startGuideSession(user.id, 'nlp_detected', text, opener.strategy);
    await addTurn((await getActiveSession(user.id))!.id, 'bot', opener.text);
    await ctx.replyWithMarkdownV2(guideOpenerTemplate(user.name || 'there', opener.text), guideRootCauseKeyboard(opener.quickReplies));
    return;
  }

  // Normal conversation reply → process with memory engine
  const userCheck = await db.user.findUnique({ where: { telegramId } });
  if (userCheck) {
    processUserReply(userCheck.id, text).catch(console.error);
    await ctx.replyWithMarkdownV2(replyAckTemplate(userCheck.name || 'there'));
  } else {
    await ctx.replyWithMarkdownV2(`I don\\'t think we\\'ve been introduced yet\\! Send /start to get set up\\.`);
  }
});

// ─────────────────────────────────────────────────────────
//  CALLBACK QUERY HANDLERS (inline button presses)
// ─────────────────────────────────────────────────────────
bot.action('show_stats', async (ctx) => {
  const telegramId = ctx.callbackQuery.from.id.toString();
  await answerCallback(ctx.callbackQuery.id);
  await sendTypingIndicator(telegramId);

  const user = await db.user.findUnique({ where: { telegramId } });
  if (!user) { await ctx.reply('Send /start first.'); return; }

  const [lastLog, arms] = await Promise.all([
    db.dailyLog.findFirst({ where: { userId: user.id }, orderBy: { date: 'desc' } }),
    db.strategyArm.findMany({ where: { userId: user.id }, orderBy: { alpha: 'desc' } })
  ]);

  await ctx.replyWithMarkdownV2(statusTemplate(user, lastLog, arms[0] ?? null), statusKeyboard());
});

bot.action('show_memory', async (ctx) => {
  const telegramId = ctx.callbackQuery.from.id.toString();
  await answerCallback(ctx.callbackQuery.id);
  await sendTypingIndicator(telegramId);

  const user = await db.user.findUnique({ where: { telegramId } });
  if (!user) return;

  const [persona, human] = await Promise.all([getBlock(user.id, 'persona'), getBlock(user.id, 'human')]);
  await ctx.replyWithMarkdownV2(
    memoryBlocksTemplate(persona?.content ?? '…', human?.content ?? '…'),
    backKeyboard()
  );
});

bot.action('show_strategy', async (ctx) => {
  const telegramId = ctx.callbackQuery.from.id.toString();
  await answerCallback(ctx.callbackQuery.id);
  await sendTypingIndicator(telegramId);

  const user = await db.user.findUnique({ where: { telegramId } });
  if (!user) return;

  const arms = await db.strategyArm.findMany({ where: { userId: user.id } });
  if (arms.length === 0) {
    await ctx.replyWithMarkdownV2('No strategy data yet\\. I\'ll start learning after your first nightly pipeline\\!');
    return;
  }
  await ctx.replyWithMarkdownV2(strategyTemplate(arms), backKeyboard());
});

bot.action('show_help', async (ctx) => {
  await answerCallback(ctx.callbackQuery.id);
  await ctx.replyWithMarkdownV2(helpTemplate(), helpKeyboard());
});

bot.action('setup_github', async (ctx) => {
  const telegramId = ctx.callbackQuery.from.id.toString();
  await answerCallback(ctx.callbackQuery.id);
  onboardingState[telegramId] = { step: 'awaiting_github', data: {} };
  await ctx.replyWithMarkdownV2(
    `🔧 *Update GitHub Username*\n\nWhat is your GitHub username?\n\n_e\\.g\\. \`shreyy\`_\n\nType \`skip\` to cancel\\.`
  );
});

// Coaching message reactions — feed directly into the bandit
bot.action(/^mark_done:(.+)$/, async (ctx) => {
  const telegramId = ctx.callbackQuery.from.id.toString();
  await answerCallback(ctx.callbackQuery.id, '✅ Marked done!');

  const user = await db.user.findUnique({ where: { telegramId } });
  if (!user) return;

  // Boost trust score
  await db.user.update({ where: { id: user.id }, data: { trustScore: { increment: 0.1 } } });

  await ctx.editMessageReplyMarkup({ inline_keyboard: [] }); // remove buttons
  await ctx.replyWithMarkdownV2(buttonFeedbackTemplate('done', user.name || 'there'));
});

bot.action(/^energized:(.+)$/, async (ctx) => {
  const telegramId = ctx.callbackQuery.from.id.toString();
  await answerCallback(ctx.callbackQuery.id, "⚡️ That's the energy!");

  const user = await db.user.findUnique({ where: { telegramId } });
  if (!user) return;

  await db.user.update({ where: { id: user.id }, data: { trustScore: { increment: 0.05 } } });
  await ctx.editMessageReplyMarkup({ inline_keyboard: [] });
  await ctx.replyWithMarkdownV2(buttonFeedbackTemplate('energized', user.name || 'there'));
});

bot.action(/^not_helpful:(.+)$/, async (ctx) => {
  const telegramId = ctx.callbackQuery.from.id.toString();
  const interactionId = (ctx.match as RegExpExecArray)[1];
  await answerCallback(ctx.callbackQuery.id, "Noted — I'll adapt tomorrow.");

  const user = await db.user.findUnique({ where: { telegramId } });
  if (!user) return;

  // Mark the strategy as a failure in the bandit
  const interaction = await db.coachInteraction.findUnique({ where: { id: interactionId } });
  if (interaction) {
    await updateReward(user.id, interaction.strategyUsed, 0.0); // direct failure signal
    await db.coachInteraction.update({
      where: { id: interactionId },
      data: { userSentiment: 'negative', rewardScore: 0.0 }
    });
  }

  await ctx.editMessageReplyMarkup({ inline_keyboard: [] });
  await ctx.replyWithMarkdownV2(buttonFeedbackTemplate('not_helpful', user.name || 'there'));
});

// --- GUIDE SYSTEM CALLBACKS ---

bot.action(/^guide_option:(.+)$/, async (ctx) => {
  const telegramId = ctx.callbackQuery.from.id.toString();
  await answerCallback(ctx.callbackQuery.id);
  
  const user = await db.user.findUnique({ where: { telegramId } });
  if (!user) return;

  const session = await getActiveSession(user.id);
  if (!session) return;

  // Extract text from the button pressed
  const idx = parseInt((ctx.match as RegExpExecArray)[1], 10);
  const inlineKeyboard = (ctx.callbackQuery.message as any).reply_markup.inline_keyboard;
  const buttonText = inlineKeyboard.flat()[idx]?.text || 'User selected an option';

  await ctx.editMessageReplyMarkup({ inline_keyboard: [] });
  await ctx.reply(`👉 ${buttonText}`);

  await sendTypingIndicator(telegramId);
  await addTurn(session.id, 'user', buttonText);
  
  const reply = await generateGuideTurn(session, buttonText);
  await addTurn(session.id, 'bot', reply.text);

  if (reply.isFinalQuestion) {
    await ctx.reply(reply.text, guideFreeWriteKeyboard());
  } else {
    await ctx.reply(reply.text, reply.buttons && reply.buttons.length > 0 ? guideDynamicKeyboard(reply.buttons) : undefined);
  }
});

bot.action('guide_done', async (ctx) => {
  const telegramId = ctx.callbackQuery.from.id.toString();
  await answerCallback(ctx.callbackQuery.id);
  
  const user = await db.user.findUnique({ where: { telegramId } });
  if (!user) return;

  const session = await getActiveSession(user.id);
  if (!session) return;

  await ctx.editMessageReplyMarkup({ inline_keyboard: [] });
  await ctx.reply("⏳ *Analyzing and building your plan...*", { parse_mode: 'MarkdownV2' });

  await markSessionSynthesizing(session.id);
  
  try {
    const result = await synthesizeWithAgents(session);
    await closeSession(session.id, result.actionPlan, result.diagnosticianOutput, result.psychologistOutput, session.promptTemplate || 'default');
    
    await ctx.replyWithMarkdownV2(
      guideActionPlanTemplate(result.actionPlan, result.tasks, session.guideStrategy!),
      guideActionPlanKeyboard(session.id, result.tasks)
    );
  } catch (err) {
    console.error('Error synthesizing guide plan:', err);
    await ctx.reply('⚠️ Sorry, I ran into an issue generating your plan. Please try /guide again later.');
  }
});

bot.action(/^guide_task_done:(.+)$/, async (ctx) => {
  await answerCallback(ctx.callbackQuery.id, 'Task marked as completed! 🎉');
  const taskId = (ctx.match as RegExpExecArray)[1];
  
  await db.guideTask.update({
    where: { id: taskId },
    data: { status: 'done', completedAt: new Date() }
  });

  // Remove the specific button (for simplicity, we'll just say "Good job!")
  await ctx.reply('✅ Great job completing that task!');
});

bot.action(/^guide_all_done:(.+)$/, async (ctx) => {
  await answerCallback(ctx.callbackQuery.id, 'All done!');
  await ctx.editMessageReplyMarkup({ inline_keyboard: [] });
  await ctx.reply('🎉 You completed your guide session plan!');
});

// ─────────────────────────────────────────────────────────
//  LAUNCH
// ─────────────────────────────────────────────────────────
bot.launch().then(async () => {
  console.log('[Bot] Bot is running!');
  await setBotCommands();
});

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
