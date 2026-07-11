import { Telegraf, Markup } from 'telegraf';
import { config } from '../config';

if (!config.telegramBotToken) {
  throw new Error('TELEGRAM_BOT_TOKEN must be provided');
}

export const bot = new Telegraf(config.telegramBotToken);

// ─────────────────────────────────────────────────────────
//  Core send function with MarkdownV2 and optional keyboard
// ─────────────────────────────────────────────────────────

export async function sendMessage(
  chatId: string,
  text: string,
  extra?: Parameters<typeof bot.telegram.sendMessage>[2]
): Promise<string | null> {
  try {
    const res = await bot.telegram.sendMessage(chatId, text, {
      parse_mode: 'MarkdownV2',
      ...extra,
    });
    return res.message_id.toString();
  } catch (error) {
    console.error(`[Telegram] Failed to send to ${chatId}:`, error);
    // Retry without markdown if formatting fails
    try {
      const res = await bot.telegram.sendMessage(chatId, text.replace(/[_*[\]()~`>#+=|{}.!\\-]/g, ''), {
        ...extra,
      });
      return res.message_id.toString();
    } catch (fallbackError) {
      console.error(`[Telegram] Fallback send also failed:`, fallbackError);
      return null;
    }
  }
}

/** Send a coaching message with an inline action keyboard */
export async function sendCoachingMessage(
  chatId: string,
  text: string,
  keyboard: ReturnType<typeof Markup.inlineKeyboard>
): Promise<string | null> {
  try {
    const res = await bot.telegram.sendMessage(chatId, text, {
      parse_mode: 'MarkdownV2',
      ...keyboard,
    });
    return res.message_id.toString();
  } catch (error) {
    console.error(`[Telegram] Failed to send coaching message to ${chatId}:`, error);
    return null;
  }
}

/** Send a typing indicator (shows "typing..." in Telegram) */
export async function sendTypingIndicator(chatId: string): Promise<void> {
  try {
    await bot.telegram.sendChatAction(chatId, 'typing');
  } catch (_) {
    // Non-critical, ignore errors
  }
}

/** Edit an existing message's text */
export async function editMessage(
  chatId: string,
  messageId: string,
  text: string
): Promise<void> {
  try {
    await bot.telegram.editMessageText(chatId, parseInt(messageId), undefined, text, {
      parse_mode: 'MarkdownV2',
    });
  } catch (error) {
    console.error(`[Telegram] Failed to edit message ${messageId}:`, error);
  }
}

/** Answer a callback query with a toast notification */
export async function answerCallback(
  callbackQueryId: string,
  text?: string,
  showAlert = false
): Promise<void> {
  try {
    await bot.telegram.answerCbQuery(callbackQueryId, text, { show_alert: showAlert });
  } catch (_) {
    // Non-critical
  }
}

/** Set the bot command menu visible in the Telegram UI */
export async function setBotCommands(): Promise<void> {
  await bot.telegram.setMyCommands([
    { command: 'start', description: '🚀 Start / restart onboarding' },
    { command: 'status', description: '📊 View your stats dashboard' },
    { command: 'memory', description: '🧠 View your memory blocks' },
    { command: 'strategy', description: '🎯 View strategy leaderboard' },
    { command: 'setup', description: '🔧 Update your GitHub username' },
    { command: 'help', description: '❓ How the bot works' },
  ]);
  console.log('[Bot] Bot commands registered.');
}
