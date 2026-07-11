import { GoogleGenAI } from '@google/genai';
import { config } from '../../config';
import { User, HistoricalActivity } from '@prisma/client';

const ai = new GoogleGenAI({ apiKey: config.geminiApiKey });

export async function evaluateHistoryForUserFacts(records: HistoricalActivity[], user: User): Promise<string> {
  const prompt = `
  You are an ElizaOS-inspired async evaluator agent for an Accountability Coach.
  Your task is to review the user's historical commits and tweets, and extract structured facts about them.
  These facts will be saved to their "Human Memory Block" to give the coach deep context.

  User Stated Goals: ${user.ultimateGoals}

  Raw Historical Activity (Last 30 Days):
  ${records.map(r => `[${r.eventAt.toISOString().split('T')[0]}] ${r.platform} ${r.type}: ${r.content}`).join('\n')}

  Extract and format your response EXACTLY like this:
  Name: ${user.name}
  Goals: ${user.ultimateGoals}
  Timezone: ${user.timezone}

  Primary Tech Stack:
  - [Language/Framework]

  Active Projects:
  - [Project Name]: [Brief inference of what it is based on commits/tweets]

  Working Patterns:
  - [Observation about their commit frequency, tweet frequency, etc.]
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });
    return response.text ?? `Name: ${user.name}\nGoals: ${user.ultimateGoals}\nTimezone: ${user.timezone}\nFailed to extract history facts.`;
  } catch (err) {
    console.error('Error evaluating history for user facts:', err);
    return `Name: ${user.name}\nGoals: ${user.ultimateGoals}\nTimezone: ${user.timezone}\nError: Could not extract history facts.`;
  }
}
