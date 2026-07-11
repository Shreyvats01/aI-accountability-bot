import { GoogleGenAI, Schema, Type } from '@google/genai';
import { config } from '../../config';
import { GuideTask } from '@prisma/client';

const ai = new GoogleGenAI({ apiKey: config.geminiApiKey });

const responseSchema: Schema = {
  type: Type.ARRAY,
  items: {
    type: Type.OBJECT,
    properties: {
      title: { type: Type.STRING },
      description: { type: Type.STRING },
      estimatedMinutes: { type: Type.INTEGER },
      suggestedDay: { type: Type.STRING, description: "today, tomorrow, or this_week" }
    },
    required: ['title', 'description', 'suggestedDay']
  }
};

export async function decomposeActionPlan(actionPlan: string, userId: string, sessionId: string): Promise<Omit<GuideTask, 'id' | 'createdAt' | 'completedAt' | 'session' | 'user'>[]> {
  const prompt = `
  You are an Auto-GPT inspired task decomposer.
  Read the Coach's Action Plan and extract 1 to 3 concrete, granular sub-tasks.
  
  Action Plan:
  ${actionPlan}
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: responseSchema,
      }
    });

    const text = response.text;
    if (!text) return [];
    
    const parsed = JSON.parse(text);
    return parsed.map((t: any) => ({
      userId,
      sessionId,
      title: t.title,
      description: t.description,
      estimatedMinutes: t.estimatedMinutes || null,
      suggestedDay: t.suggestedDay,
      status: 'pending'
    }));
  } catch (error) {
    console.error('Error decomposing action plan:', error);
    return [];
  }
}
