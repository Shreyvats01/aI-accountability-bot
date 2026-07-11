import { GoogleGenAI, Schema, Type } from '@google/genai';
import { config } from '../config';
import { Entity, Relationship } from '../brain/memory/knowledge-graph';

const ai = new GoogleGenAI({ apiKey: config.geminiApiKey });

const responseSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    entities: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          name: { type: Type.STRING },
          type: { type: Type.STRING, description: "e.g., project, person, tool, language" },
          description: { type: Type.STRING }
        },
        required: ['name', 'type']
      }
    },
    relationships: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          from: { type: Type.STRING },
          relation: { type: Type.STRING },
          to: { type: Type.STRING },
          note: { type: Type.STRING }
        },
        required: ['from', 'relation', 'to']
      }
    }
  },
  required: ['entities', 'relationships']
};

export async function extractEntities(rawActivity: string, userGoals: string) {
  const prompt = `
  You are an entity extraction engine for an accountability bot.
  Analyze the user's daily activity logs and extract notable entities (projects they worked on, tools they used, people they collaborated with).
  Focus ONLY on things related to their productivity and goals.
  
  User Goals: ${userGoals}
  
  Daily Activity Text:
  ${rawActivity}
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
    if (!text) return { entities: [], relationships: [] };
    
    const parsed = JSON.parse(text);
    return parsed as {
      entities: Array<Entity & { name: string }>;
      relationships: Relationship[];
    };
  } catch (error) {
    console.error('Error extracting entities:', error);
    return { entities: [], relationships: [] };
  }
}
