import { GoogleGenAI } from '@google/genai';
import { config } from 'dotenv';
config();

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

async function run() {
  try {
    const response = await ai.models.list();
    const models = [];
    for await (const m of response) {
      models.push(m.name);
    }
    console.log(models);
  } catch (error) {
    console.error(error);
  }
}
run();
