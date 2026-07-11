import { StrategyArm, DailyLog, User } from '@prisma/client';

// ─────────────────────────────────────────────────────────
//  HELPERS
// ─────────────────────────────────────────────────────────

function streakBar(streak: number): string {
  const filled = Math.min(streak, 10);
  return '🔥'.repeat(filled) + '○'.repeat(Math.max(0, 10 - filled));
}

function trustBar(trust: number): string {
  const level = Math.round(trust * 10);
  return '█'.repeat(level) + '░'.repeat(10 - level);
}

function scoreLabel(score: number): string {
  if (score >= 20) return '🚀 Exceptional';
  if (score >= 10) return '💪 Productive';
  if (score >= 5)  return '✅ Active';
  if (score > 0)   return '🌱 Light';
  return '💤 Rest day';
}

function urgencyEmoji(urgency: string): string {
  const map: Record<string, string> = {
    critical: '🚨', high: '⚠️', medium: '📣', low: '💬', skip: '🌙'
  };
  return map[urgency] || '📣';
}

// ─────────────────────────────────────────────────────────
//  WELCOME & ONBOARDING
// ─────────────────────────────────────────────────────────

export function welcomeNewUserTemplate(name: string): string {
  return `✨ *Hey ${name}\\!* Welcome to your AI Accountability Coach\\.

I'm not your average reminder bot\\. I:

🧠 *Learn* how you think and work over time
📈 *Track* your GitHub & social activity automatically  
🎯 *Adapt* my coaching style based on what actually works for *you*
⚡️ *Evolve* my own personality as our relationship deepens

━━━━━━━━━━━━━━━
Let's get started\\. *What are your main goals?*

For example:
_"Ship my SaaS product, grow X to 5k followers, build a consistent coding habit"_`;
}

export function goalsReceivedTemplate(goals: string): string {
  return `🎯 *Goals locked in\\!*

${escapeMarkdown(goals)}

━━━━━━━━━━━━━━━
Now, what's your *GitHub username*?

I'll use it to automatically track your commits, PRs, and code reviews — no manual logging needed\\.

_Type_ \`skip\` _if you'd rather set this up later\\._`;
}

export function onboardingCompleteTemplate(name: string, goals: string, github: string | null): string {
  return `🚀 *You're all set, ${escapeMarkdown(name)}\\!*

Here's what I've initialized for you:

📋 *Goals:* ${escapeMarkdown(goals)}
${github ? `💻 *GitHub:* @${escapeMarkdown(github)}\n` : ''}🧠 *Memory:* 4 blocks initialized \\(persona, human, world, scratchpad\\)
🎲 *Strategy:* 6 coaching arms ready for Thompson Sampling

━━━━━━━━━━━━━━━
*Tonight* I'll run my first pipeline and send you a personalized coaching message\\.

The more you reply to my messages, the faster I learn what works for you\\.

_See you tonight_ 🌙`;
}

export function returningUserTemplate(name: string, streak: number): string {
  return `👋 *Welcome back, ${escapeMarkdown(name)}\\!*

${streak > 0 ? `You're on a *${streak}\\-day streak* ${streakBar(streak)}` : 'No active streak — let\'s change that tonight\\.'}

Your coach is running automatically every night\\.`;
}

// ─────────────────────────────────────────────────────────
//  COACHING MESSAGE
// ─────────────────────────────────────────────────────────

export function coachingMessageTemplate(opts: {
  message: string;
  score: number;
  strategy: string;
  urgency: string;
  curiosityQuestion: string | null;
  streak: number;
}): string {
  const { message, score, strategy, urgency, curiosityQuestion, streak } = opts;
  const label = scoreLabel(score);
  const urg = urgencyEmoji(urgency);
  const strategyDisplay = strategy.replace(/_/g, ' ');

  return `${urg} *Nightly Check\\-In* ${urg}
━━━━━━━━━━━━━━━

${escapeMarkdown(message)}

━━━━━━━━━━━━━━━
🔥 Streak: *${streak} days* \\| 📊 Score: *${score}* \\(${label}\\)
🎯 Strategy: \`${escapeMarkdown(strategyDisplay)}\`
${curiosityQuestion ? `\n💡 *${escapeMarkdown(curiosityQuestion)}*` : ''}`;
}

// ─────────────────────────────────────────────────────────
//  STATUS DASHBOARD
// ─────────────────────────────────────────────────────────

export function statusTemplate(user: User, lastLog: DailyLog | null, topArm: StrategyArm | null): string {
  const score = lastLog?.activityScore ?? 0;
  const topStrategy = topArm?.armName?.replace(/_/g, ' ') ?? 'Exploring\\.\\.\\. \\(not enough data yet\\)';
  const winRate = topArm && topArm.totalPulls > 0
    ? ((topArm.alpha / (topArm.alpha + topArm.beta)) * 100).toFixed(0)
    : '0';

  return `📊 *Your Dashboard*
━━━━━━━━━━━━━━━

🔥 *Streak*
${streakBar(user.currentStreak)} ${user.currentStreak} days
_Best: ${user.longestStreak} days_

📅 *Today's Score:* ${score} — ${scoreLabel(score)}

🤖 *Learned Strategy*
Top performer: \`${escapeMarkdown(topStrategy)}\`
Win rate: ${winRate}%

🤝 *Trust Level*
${trustBar(user.trustScore)} ${Math.round(user.trustScore * 100)}%
_Increases every time you reply to me_

⏰ *Last Activity:* ${lastLog ? new Date(lastLog.date).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' }) : 'No data yet'}
━━━━━━━━━━━━━━━
_I learn more about you every day\\._`;
}

// ─────────────────────────────────────────────────────────
//  MEMORY BLOCKS VIEWER
// ─────────────────────────────────────────────────────────

export function memoryBlocksTemplate(persona: string, human: string): string {
  return `🧠 *Your Memory Blocks*
━━━━━━━━━━━━━━━

🎭 *Persona Block* \\(how I see myself\\)
_${escapeMarkdown(persona.slice(0, 200))}${persona.length > 200 ? '\\.\\.\\.' : ''}_

👤 *Human Block* \\(what I know about you\\)
_${escapeMarkdown(human.slice(0, 300))}${human.length > 300 ? '\\.\\.\\.' : ''}_

━━━━━━━━━━━━━━━
_These blocks evolve automatically as I learn more about you\\._`;
}

// ─────────────────────────────────────────────────────────
//  STRATEGY VIEWER
// ─────────────────────────────────────────────────────────

export function strategyTemplate(arms: StrategyArm[]): string {
  const sorted = [...arms].sort((a, b) =>
    (b.alpha / (b.alpha + b.beta)) - (a.alpha / (a.alpha + a.beta))
  );

  const lines = sorted.map((arm, i) => {
    const winRate = ((arm.alpha / (arm.alpha + arm.beta)) * 100).toFixed(0);
    const bar = '█'.repeat(Math.round(Number(winRate) / 10)) + '░'.repeat(10 - Math.round(Number(winRate) / 10));
    const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : '  ';
    const name = arm.armName.replace(/_/g, ' ');
    return `${medal} \`${escapeMarkdown(name)}\`\n    ${bar} ${winRate}% \\(${arm.totalPulls} pulls\\)`;
  });

  return `🎯 *Strategy Leaderboard*
━━━━━━━━━━━━━━━
_Thompson Sampling win rates \\(higher = better for you\\)_

${lines.join('\n\n')}

━━━━━━━━━━━━━━━
_Updates every night based on your engagement\\._`;
}

// ─────────────────────────────────────────────────────────
//  HELP
// ─────────────────────────────────────────────────────────

export function helpTemplate(): string {
  return `❓ *How Your AI Coach Works*
━━━━━━━━━━━━━━━

*Every night at 11:59 PM,* I automatically:

1️⃣ *Collect* — Scrape your GitHub commits, PRs, and social activity
2️⃣ *Score* — Calculate your daily productivity score
3️⃣ *Remember* — Search my memory for relevant past patterns
4️⃣ *Strategize* — Use AI to pick the best coaching approach for *you tonight*
5️⃣ *Generate* — Write a personalized message using your full context
6️⃣ *Learn* — The next day, measure if yesterday's strategy worked

━━━━━━━━━━━━━━━
🧠 *My Memory System* \\(4 blocks\\)
• *Persona* — My coaching identity \\(evolves over time\\)
• *Human* — Everything I know about you
• *World* — Your projects, tools, and relationships
• *Scratchpad* — My nightly reasoning

🎲 *Thompson Sampling Bandit*
I run 6 coaching strategies and track which one gets you more productive the next day\\.

━━━━━━━━━━━━━━━
*Commands:*
/status — Your stats dashboard
/setup — Update your GitHub username
/memory — View your memory blocks
/strategy — See strategy leaderboard`;
}

// ─────────────────────────────────────────────────────────
//  REPLY ACKNOWLEDGEMENTS
// ─────────────────────────────────────────────────────────

export function replyAckTemplate(name: string): string {
  const messages = [
    `📝 Got it, ${escapeMarkdown(name)}\\! I've updated my notes\\. This will inform tonight's coaching\\.`,
    `🧠 Noted\\! I'm weaving this into my understanding of you\\.`,
    `✅ Logged\\! Your context just got richer\\. I'll use this tonight\\.`,
    `💾 Saved to memory\\! The more you tell me, the better I coach you\\.`,
  ];
  return messages[Math.floor(Math.random() * messages.length)];
}

export function buttonFeedbackTemplate(action: string, name: string): string {
  const map: Record<string, string> = {
    done: `✅ *Marked done\\!* Great work today, ${escapeMarkdown(name)}\\. That's going in the books\\.`,
    energized: `⚡️ *Let's go\\!* I love that energy, ${escapeMarkdown(name)}\\.  Keep it rolling\\.`,
    not_helpful: `👍 Noted\\! I'll try a different approach tomorrow\\. Your feedback directly shapes my strategy\\.`,
  };
  return map[action] ?? `✅ Got it\\!`;
}

// ─────────────────────────────────────────────────────────
//  UTILITY
// ─────────────────────────────────────────────────────────

/**
 * Escapes special MarkdownV2 characters.
 * Must escape: _ * [ ] ( ) ~ ` > # + - = | { } . !
 */
export function escapeMarkdown(text: string): string {
  return text.replace(/[_*[\]()~`>#+=|{}.!\\-]/g, '\\$&');
}

// ─────────────────────────────────────────────────────────
//  GUIDE SYSTEM TEMPLATES
// ─────────────────────────────────────────────────────────

export function guideBootstrapCompleteTemplate(commits: number, tweets: number, entities: number): string {
  return `✅ *History Scan Complete*

I processed:
• \`${commits}\` GitHub commits/PRs
• \`${tweets}\` X (Twitter) posts
• Discovered \`${entities}\` key topics/entities

I now have a baseline understanding of your projects and habits\\. We\\'re ready to go\\!`;
}

export function guideOpenerTemplate(name: string, openerText: string): string {
  return `🧭 *Guide Session*
━━━━━━━━━━━━━━━
Hey ${escapeMarkdown(name)},

${escapeMarkdown(openerText)}`;
}

export function guideTurnTemplate(text: string, turnNumber: number, maxTurns: number): string {
  return `💬 *Guide* \\(Turn ${turnNumber}/${maxTurns}\\)
━━━━━━━━━━━━━━━
${escapeMarkdown(text)}`;
}

export function guideActionPlanTemplate(plan: string, tasks: any[], strategy: string): string {
  let taskStr = '';
  if (tasks && tasks.length > 0) {
    taskStr = `\n\n📌 *Your Next Steps:*\n` + tasks.map((t, i) => `*${i+1}\\.* ${escapeMarkdown(t.title)} \\(${t.estimatedMinutes || '?'} min\\)`).join('\n');
  }

  return `🎯 *Action Plan*
━━━━━━━━━━━━━━━
${escapeMarkdown(plan)}
${taskStr}

_Strategy used: ${escapeMarkdown(strategy)}_`;
}
