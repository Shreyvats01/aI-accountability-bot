import { GoogleGenAI } from '@google/genai';
import { config } from '../config';
import { db } from '../db';

const ai = new GoogleGenAI({ apiKey: config.geminiApiKey });

export async function getLatestTemplate(userId: string, armName: string): Promise<string | null> {
  const template = await db.guidePromptTemplate.findFirst({
    where: { userId, armName },
    orderBy: { version: 'desc' }
  });
  return template?.template || null;
}

export async function savePromptTemplate(userId: string, armName: string, template: string) {
  const latest = await db.guidePromptTemplate.findFirst({
    where: { userId, armName },
    orderBy: { version: 'desc' }
  });

  const nextVersion = (latest?.version || 0) + 1;

  await db.guidePromptTemplate.create({
    data: {
      userId,
      armName,
      template,
      version: nextVersion,
      derivedFrom: latest?.id
    }
  });
}

export async function maybeEvolvePromptTemplate(userId: string, armName: string, currentReward: number): Promise<void> {
  const arm = await db.strategyArm.findUnique({
    where: { userId_armName: { userId, armName } }
  });

  if (!arm || arm.totalPulls < 10) return;

  const successRate = arm.totalRewards / arm.totalPulls;
  
  // If the success rate is below 40%, attempt to mutate the prompt to improve it
  if (successRate < 0.4) {
    const currentTemplate = await getLatestTemplate(userId, armName);
    if (!currentTemplate) return; 

    const newTemplate = await mutatePromptWithGemini(currentTemplate, armName, successRate);
    if (newTemplate) {
      await savePromptTemplate(userId, armName, newTemplate);
    }
  }
}

async function mutatePromptWithGemini(currentTemplate: string, armName: string, successRate: number): Promise<string | null> {
  const prompt = `
  You are an AI prompt optimizer. The following prompt template (Strategy: ${armName}) is currently achieving a low success rate of ${(successRate * 100).toFixed(1)}% in motivating the user.

  CURRENT PROMPT:
  ${currentTemplate}

  TASK: Rewrite this coaching instruction to be more effective. Keep the core strategy intent but change the wording, focus, or psychological approach to try and improve user engagement.
  Output ONLY the new prompt text.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });
    
    return response.text?.trim() || null;
  } catch (err) {
    console.error('Failed to mutate prompt:', err);
    return null;
  }
}
