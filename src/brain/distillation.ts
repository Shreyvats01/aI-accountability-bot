import { GoogleGenAI } from '@google/genai';
import { config } from '../config';
import { db } from '../db';
import { getBlock, updateBlockContent } from './memory/blocks';

const ai = new GoogleGenAI({ apiKey: config.geminiApiKey });

export async function runWeeklyDistillation(userId: string) {
  // 1. Gather all logs and interactions from the past 7 days
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const [logs, interactions] = await Promise.all([
    db.dailyLog.findMany({ where: { userId, date: { gte: sevenDaysAgo } } }),
    db.coachInteraction.findMany({ where: { userId, createdAt: { gte: sevenDaysAgo } } })
  ]);

  const personaBlock = await getBlock(userId, 'persona');
  if (!personaBlock) return;

  const prompt = `
  You are the AI coach's meta-reflection engine.
  Analyze the user's activity and interactions over the last 7 days to evolve the coaching PERSONA.
  
  CURRENT PERSONA:
  ${personaBlock.content}
  
  WEEKLY LOGS:
  ${JSON.stringify(logs.map(l => ({ date: l.date, score: l.activityScore, strategy: l.strategyUsed })))}
  
  USER REPLIES (Interactions):
  ${JSON.stringify(interactions.map(i => ({ strategy: i.strategyUsed, reply: i.userReply, sentiment: i.userSentiment })))}
  
  TASK:
  Based on what worked and what didn't this week, rewrite the CURRENT PERSONA block.
  If they responded well to a certain strategy, integrate that into your identity. 
  If they ignored a strategy, note to avoid it.
  Return ONLY the new persona text.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });

    const newPersona = response.text?.trim();
    if (newPersona && newPersona.length > 10) {
      await updateBlockContent(userId, 'persona', newPersona, 'distillation_engine');
      console.log(`[Distillation] Persona updated for user ${userId}. New length: ${newPersona.length} chars.`);
    } else {
      console.warn(`[Distillation] Gemini returned empty persona for user ${userId}. Skipping update.`);
    }
  } catch (error) {
    console.error('Error during weekly distillation:', error);
  }
}
