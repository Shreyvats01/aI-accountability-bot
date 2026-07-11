import { GoogleGenAI, Schema, Type } from '@google/genai';
import { config } from '../../config';
import { db } from '../../db';

const ai = new GoogleGenAI({ apiKey: config.geminiApiKey });

const taskSchema: Schema = {
  type: Type.ARRAY,
  items: {
    type: Type.OBJECT,
    properties: {
      title: { type: Type.STRING, description: "Short title of the task" },
      description: { type: Type.STRING, description: "Detailed description of what needs to be done" },
      estimatedMinutes: { type: Type.INTEGER },
      suggestedDay: { type: Type.STRING, description: "today, tomorrow, or this_week" }
    },
    required: ['title', 'description', 'estimatedMinutes', 'suggestedDay']
  }
};

export async function decomposeGoalIntoTasks(userId: string, goalText: string, sessionId: string) {
  const prompt = `
  The user has stated the following high-level goal:
  "${goalText}"
  
  Break this goal down into 3-5 concrete, actionable daily tasks. 
  Assign one task for "today", one or two for "tomorrow", and the rest for "this_week".
  Keep the tasks highly specific and achievable within 30-90 minutes each.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: { responseMimeType: 'application/json', responseSchema: taskSchema }
    });

    const tasks = JSON.parse(response.text || '[]');
    
    if (tasks.length > 0) {
      await db.guideTask.createMany({
        data: tasks.map((t: any) => ({
          userId,
          sessionId,
          title: t.title,
          description: t.description,
          estimatedMinutes: t.estimatedMinutes,
          suggestedDay: t.suggestedDay
        }))
      });
      
      await db.guideSession.update({
        where: { id: sessionId },
        data: { status: 'active', actionPlanSent: 'Decomposed tasks into daily plan' }
      });
    }
  } catch (err) {
    console.error('Failed to decompose goal:', err);
  }
}
