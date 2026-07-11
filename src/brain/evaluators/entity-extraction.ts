import { GoogleGenAI, Schema, Type } from '@google/genai';
import { config } from '../../config';
import { db } from '../../db';

const ai = new GoogleGenAI({ apiKey: config.geminiApiKey });

const entitySchema: Schema = {
  type: Type.OBJECT,
  properties: {
    extractedFacts: { type: Type.ARRAY, items: { type: Type.STRING } },
    answeredCuriosityQuestion: { type: Type.BOOLEAN }
  },
  required: ['extractedFacts', 'answeredCuriosityQuestion']
};

export async function entityExtractionEvaluator(userId: string, replyText: string, context: any) {
  const prompt = `
  USER REPLY: ${replyText}
  PREVIOUS AI MESSAGE: ${context.lastInteraction?.aiResponse || 'None'}
  Extract new facts. Did they answer the curiosity question (if asked)?
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: { responseMimeType: 'application/json', responseSchema: entitySchema }
    });

    const data = JSON.parse(response.text || '{}');
    
    if (context.lastInteraction && data.answeredCuriosityQuestion) {
       await db.coachInteraction.update({
         where: { id: context.lastInteraction.id },
         data: { curiosityAnswered: true }
       });
       
       if (context.lastInteraction.curiosityQuestion) {
           await db.curiosityLog.create({
               data: {
                   userId,
                   questionAsked: context.lastInteraction.curiosityQuestion,
                   questionType: 'evaluator_detected',
                   userAnswer: replyText,
                   answeredAt: new Date(),
                   kgUpdated: data.extractedFacts && data.extractedFacts.length > 0
               }
           });
       }
    }
  } catch (err) {
    console.error('Entity extraction evaluator failed:', err);
  }
}
