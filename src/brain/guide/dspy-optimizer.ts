import { db } from '../../db';
import { GUIDE_STRATEGIES } from './strategies';
import { GoogleGenAI } from '@google/genai';
import { config } from '../../config';

const ai = new GoogleGenAI({ apiKey: config.geminiApiKey });

export async function getPromptTemplate(userId: string, armName: string): Promise<string> {
  const custom = await db.guidePromptTemplate.findFirst({
    where: { userId, armName },
    orderBy: { version: 'desc' }
  });

  if (custom) return custom.template;

  const defaultStrategy = GUIDE_STRATEGIES.find(s => s.armName === armName);
  return defaultStrategy ? defaultStrategy.instruction : 'Be a helpful accountability coach.';
}

export async function optimizeGuidePrompt(userId: string, armName: string): Promise<void> {
  // 1. Fetch recent sessions for this arm (successes and failures)
  const sessions = await db.guideSession.findMany({
    where: { userId, guideStrategy: armName, rewardScore: { not: null } },
    orderBy: { createdAt: 'desc' },
    take: 10
  });

  if (sessions.length < 5) return;

  const successes = sessions.filter(s => (s.rewardScore || 0) > 0.5);
  const failures = sessions.filter(s => (s.rewardScore || 0) <= 0.5);

  const currentTemplate = await getPromptTemplate(userId, armName);

  const prompt = `
  You are a DSPy-inspired prompt optimizer.
  Your goal is to rewrite the prompt instruction template for a specific Guide Strategy to make it more effective for this user.
  
  Strategy Name: ${armName}
  Current Template:
  ${currentTemplate}

  Successful Sessions (Reward > 0.5):
  ${successes.map(s => `Plan Output:\n${s.actionPlanSent}`).join('\n\n')}

  Failed Sessions (Reward <= 0.5):
  ${failures.map(s => `Plan Output:\n${s.actionPlanSent}`).join('\n\n')}

  Write a new, optimized instruction template. Keep the core identity of the strategy, but adapt the wording/focus to produce more outputs like the successful ones and fewer like the failures.
  Output ONLY the new raw text template. No markdown blocks or explanations.
  `;

  try {
    const res = await ai.models.generateContent({ model: 'gemini-2.5-flash', contents: prompt });
    const newTemplate = res.text?.trim();
    if (!newTemplate) return;

    const currentVersion = await db.guidePromptTemplate.findFirst({
      where: { userId, armName },
      orderBy: { version: 'desc' }
    });

    await db.guidePromptTemplate.create({
      data: {
        userId,
        armName,
        template: newTemplate,
        version: currentVersion ? currentVersion.version + 1 : 1,
        derivedFrom: currentVersion ? currentVersion.id : null
      }
    });

    console.log(`[DSPy] Optimized prompt template for ${armName} (v${currentVersion ? currentVersion.version + 1 : 1})`);
  } catch (err) {
    console.error('Error optimizing prompt template:', err);
  }
}
