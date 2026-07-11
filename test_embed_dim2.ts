import { GoogleGenAI } from '@google/genai';
import { config } from 'dotenv';
config();

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

async function run() {
  try {
    const response = await ai.models.embedContent({
      model: 'text-embedding-004',
      contents: 'hello world',
      config: { outputDimensionality: 768, apiVersion: 'v1alpha' }
    });
    console.log("text-embedding-004 size with config v1alpha:", response.embeddings?.[0]?.values?.length);
  } catch (error) {
    console.error("error with text-embedding-004 v1alpha", error.message);
  }
}
run();
