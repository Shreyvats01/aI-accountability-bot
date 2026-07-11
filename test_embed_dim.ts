import { GoogleGenAI } from '@google/genai';
import { config } from 'dotenv';
config();

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

async function run() {
  try {
    const response = await ai.models.embedContent({
      model: 'gemini-embedding-001',
      contents: 'hello world',
      config: { outputDimensionality: 768 }
    });
    console.log("gemini-embedding-001 size with config:", response.embeddings?.[0]?.values?.length);
  } catch (error) {
    console.error("error with gemini-embedding-001", error.message);
  }
}
run();
