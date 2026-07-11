import { GoogleGenAI } from '@google/genai';
import { config } from 'dotenv';
config();

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

async function run() {
  try {
    const response = await ai.models.embedContent({
      model: 'gemini-embedding-2',
      contents: 'hello world',
    });
    console.log("gemini-embedding-2 size:", response.embeddings?.[0]?.values?.length);
  } catch (error) {
    console.error("error with gemini-embedding-2", error.message);
  }
}
run();
