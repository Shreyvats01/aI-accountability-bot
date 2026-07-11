import { GoogleGenAI } from '@google/genai';
import { config } from '../../config';

const ai = new GoogleGenAI({ apiKey: config.geminiApiKey });

/**
 * Generates a 768-dimensional embedding for the given text using Gemini.
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  try {
    const response = await ai.models.embedContent({
      model: 'gemini-embedding-2',
      contents: text,
      config: { outputDimensionality: 768 },
    });
    return response.embeddings?.[0]?.values || [];
  } catch (error) {
    console.error('Error generating embedding:', error);
    throw error;
  }
}
