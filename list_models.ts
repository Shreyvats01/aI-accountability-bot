import { GoogleGenAI } from '@google/genai';
import { config } from 'dotenv';
config();

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

async function run() {
  try {
    const response = await ai.models.list();
    const models = [];
    for await (const m of response) {
      if (m.name.includes('text-embedding-004')) {
        models.push(m.name);
      }
    }
    console.log("TEXT EMBEDDING 004 MODELS:", models);
  } catch (error) {
    console.error(error);
  }
}
run();
