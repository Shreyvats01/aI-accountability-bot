import { GoogleGenAI, Schema, Type } from '@google/genai';
import { config } from '../../config';
import { db } from '../../db';

const ai = new GoogleGenAI({ apiKey: config.geminiApiKey });

const sentimentSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    sentiment: { type: Type.STRING, description: "positive, neutral, or negative" }
  },
  required: ['sentiment']
};

export async function sentimentEvaluator(userId: string, replyText: string, context: any) {
  if (!context.lastInteraction) return;

  const prompt = `Analyze the sentiment of the user's reply to the AI coach.
  PREVIOUS AI MESSAGE: ${context.lastInteraction.aiResponse}
  USER REPLY: ${replyText}
  Determine sentiment.`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: { responseMimeType: 'application/json', responseSchema: sentimentSchema }
    });

    const data = JSON.parse(response.text || '{}');
    if (data.sentiment) {
      await db.coachInteraction.update({
        where: { id: context.lastInteraction.id },
        data: { userSentiment: data.sentiment }
      });
    }
  } catch (err) {
    console.error('Sentiment evaluator failed:', err);
  }
}
