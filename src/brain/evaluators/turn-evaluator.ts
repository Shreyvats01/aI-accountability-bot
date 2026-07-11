import { GoogleGenAI } from '@google/genai';
import { config } from '../../config';
import { upsertEntity } from '../memory/knowledge-graph';

const ai = new GoogleGenAI({ apiKey: config.geminiApiKey });

export async function evaluateGuideTurn(userId: string, userMessage: string, sessionTranscript: any[]): Promise<void> {
  const transcriptText = sessionTranscript.map(t => `${t.role}: ${t.content}`).join('\n');
  const prompt = `
  You are an ElizaOS-inspired async evaluator.
  Review this guide session turn and extract ANY NEW ENTITIES (projects, tools, problems, feelings) the user mentioned.
  If they didn't mention anything new, return an empty JSON array.

  Recent Transcript:
  ${transcriptText}
  User just said: "${userMessage}"

  Respond strictly with a JSON array of objects: [{ "name": "...", "type": "project|tool|problem|emotion", "description": "..." }]
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: { responseMimeType: 'application/json' }
    });
    const text = response.text;
    if (!text) return;
    
    const entities = JSON.parse(text);
    for (const ent of entities) {
      if (ent.name && ent.type) {
        await upsertEntity(userId, ent.name, {
          type: ent.type,
          description: ent.description || 'Extracted from guide session',
          status: 'active'
        });
      }
    }
  } catch (err) {
    console.error('Error in turn evaluator:', err);
  }
}
