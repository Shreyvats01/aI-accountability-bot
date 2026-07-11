import { Markup } from 'telegraf';

// ─────────────────────────────────────────────────────────
//  INLINE KEYBOARDS (attached to messages)
// ─────────────────────────────────────────────────────────

/** Keyboard shown on every nightly coaching message */
export function coachingMessageKeyboard(interactionId: string) {
  return Markup.inlineKeyboard([
    [
      Markup.button.callback('✅ Done for today', `mark_done:${interactionId}`),
      Markup.button.callback('💪 Let\'s go!', `energized:${interactionId}`),
    ],
    [
      Markup.button.callback('😐 Not helpful', `not_helpful:${interactionId}`),
      Markup.button.callback('📊 My Stats', 'show_stats'),
    ]
  ]);
}

/** Keyboard shown after onboarding completes */
export function postOnboardingKeyboard() {
  return Markup.inlineKeyboard([
    [Markup.button.callback('📊 View My Stats', 'show_stats')],
    [Markup.button.callback('🔧 Update GitHub Username', 'setup_github')],
    [Markup.button.callback('💬 How does this work?', 'show_help')],
  ]);
}

/** Keyboard shown on /status */
export function statusKeyboard() {
  return Markup.inlineKeyboard([
    [
      Markup.button.callback('🧠 My Memory Blocks', 'show_memory'),
      Markup.button.callback('🎯 My Strategy', 'show_strategy'),
    ],
    [Markup.button.callback('🔧 Update Profile', 'setup_github')],
  ]);
}

/** Keyboard for help / how-it-works */
export function helpKeyboard() {
  return Markup.inlineKeyboard([
    [Markup.button.callback('📊 My Stats', 'show_stats')],
    [Markup.button.callback('🔧 Setup Profile', 'setup_github')],
  ]);
}

/** Back to home keyboard */
export function backKeyboard() {
  return Markup.inlineKeyboard([
    [Markup.button.callback('« Back to Stats', 'show_stats')],
  ]);
}

// ─────────────────────────────────────────────────────────
//  PERSISTENT REPLY KEYBOARD (always visible at bottom)
// ─────────────────────────────────────────────────────────

/** Persistent bottom keyboard after onboarding */
export function mainMenuKeyboard() {
  return Markup.keyboard([
    ['📊 My Stats', '🧠 Memory'],
    ['🎯 Strategy', '❓ Help'],
  ])
    .resize()
    .persistent();
}

export function removeKeyboard() {
  return Markup.removeKeyboard();
}

// ─────────────────────────────────────────────────────────
//  GUIDE SYSTEM KEYBOARDS
// ─────────────────────────────────────────────────────────

export function guideRootCauseKeyboard(options: string[]) {
  return Markup.inlineKeyboard(
    options.map((opt, idx) => [Markup.button.callback(opt, `guide_option:${idx}`)])
  );
}

export function guideDynamicKeyboard(options: string[]) {
  return Markup.inlineKeyboard(
    options.map((opt, idx) => [Markup.button.callback(opt, `guide_option:${idx}`)])
  );
}

export function guideFreeWriteKeyboard() {
  return Markup.inlineKeyboard([
    [Markup.button.callback("✅ Give me my plan", "guide_done")]
  ]);
}

export function guideActionPlanKeyboard(sessionId: string, tasks: any[]) {
  const buttons = tasks.map(t => [Markup.button.callback(`✔️ ${t.title}`, `guide_task_done:${t.id}`)]);
  buttons.push([Markup.button.callback("✅ All Done", `guide_all_done:${sessionId}`)]);
  return Markup.inlineKeyboard(buttons);
}
