import dotenv from 'dotenv';
dotenv.config();

const requiredEnvVars = [
  'DATABASE_URL',
  'DIRECT_URL',
  'GEMINI_API_KEY',
  'TELEGRAM_BOT_TOKEN',
  'ENCRYPTION_KEY'
];

for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    throw new Error(`Missing required environment variable: ${envVar}`);
  }
}

export const config = {
  databaseUrl: process.env.DATABASE_URL!,
  directUrl: process.env.DIRECT_URL!,
  geminiApiKey: process.env.GEMINI_API_KEY!,
  telegramBotToken: process.env.TELEGRAM_BOT_TOKEN!,
  encryptionKey: process.env.ENCRYPTION_KEY!
};

export const DEFAULT_PERSONA_BLOCK = `I am an adaptive accountability coach. I am currently learning what coaching style works best for this user. I will experiment with different approaches — strategic planning, tough love, positive reinforcement, and micro-tasking — and adapt based on real outcomes. My core values: honesty, consistency, and genuine care for the user's growth.`;

export const DEFAULT_HUMAN_BLOCK = (name: string, goals: string) => `Name: ${name}\nGoals: ${goals}\nThis is a new user profile. Patterns and weaknesses are yet to be discovered.`;

export const DEFAULT_WORLD_BLOCK = JSON.stringify({ entities: {}, relationships: [] });
