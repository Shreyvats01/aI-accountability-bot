import { GoogleGenAI } from '@google/genai';
import { config } from 'dotenv';
config();

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

async function run() {
  try {
    const response = await ai.models.embedContent({
      model: 'text-embedding-004',
      contents: 'hello world',
    });
    console.log(response.embeddings?.[0]?.values?.length);
  } catch (error) {
    console.error(error);
  }
}
run();
