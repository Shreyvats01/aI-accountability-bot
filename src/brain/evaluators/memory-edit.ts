import { GoogleGenAI, Schema, Type } from '@google/genai';
import { config } from '../../config';
import { updateBlockContent } from '../memory/blocks';

const ai = new GoogleGenAI({ apiKey: config.geminiApiKey });

const editSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    shouldEditHumanBlock: { type: Type.BOOLEAN },
    newHumanBlockContent: { type: Type.STRING },
  },
  required: ['shouldEditHumanBlock', 'newHumanBlockContent']
};

export async function memoryEditEvaluator(userId: string, replyText: string, context: any) {
  if (!context.humanBlock) return;

  // Simple heuristic to save tokens
  if (replyText.length < 10) return;

  const prompt = `
  USER REPLY: ${replyText}
  CURRENT HUMAN MEMORY BLOCK: ${context.humanBlock.content}
  If the reply contains new facts about the user, rewrite the CURRENT HUMAN MEMORY BLOCK to include them seamlessly. Keep it concise.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: { responseMimeType: 'application/json', responseSchema: editSchema }
    });

    const data = JSON.parse(response.text || '{}');
    if (data.shouldEditHumanBlock && data.newHumanBlockContent) {
      await updateBlockContent(userId, 'human', data.newHumanBlockContent, 'async_evaluator');
    }
  } catch (err) {
    console.error('Memory edit evaluator failed:', err);
  }
}
