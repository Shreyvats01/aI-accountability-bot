import { db } from '../db';

/**
 * Computes the cosine distance between two vectors.
 * Returns a value between 0 (identical) and 2 (opposite).
 */
function cosineDistance(a: number[], b: number[]): number {
  if (a.length !== b.length) throw new Error('Vector length mismatch');
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  const similarity = dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  return 1 - similarity; // cosine distance (0 = identical, 2 = opposite)
}

export interface PersonaDriftResult {
  driftScore: number;
  status: 'healthy' | 'warning' | 'critical';
  message: string;
}

export async function checkPersonaDrift(userId: string): Promise<PersonaDriftResult | null> {
  // Fetch original and current embeddings via raw SQL since Prisma doesn't return vector columns natively
  const result: any[] = await db.$queryRaw`
    SELECT 
      embedding::text AS current_embedding,
      "originalEmbedding"::text AS original_embedding
    FROM "MemoryBlock"
    WHERE "userId" = ${userId} AND "blockType" = 'persona'
    LIMIT 1;
  `;

  if (result.length === 0) return null;
  const row = result[0];
  if (!row.current_embedding || !row.original_embedding) return null;

  // Parse the vector string format: "[0.1,0.2,...]"
  const parseVector = (s: string): number[] =>
    s.replace(/^\[|\]$/g, '').split(',').map(Number);

  const current = parseVector(row.current_embedding);
  const original = parseVector(row.original_embedding);

  const driftScore = cosineDistance(current, original);

  let status: PersonaDriftResult['status'];
  let message: string;

  if (driftScore > 0.5) {
    status = 'critical';
    message = `Persona has drifted significantly (score: ${driftScore.toFixed(3)}). Core identity may have been lost. Consider reviewing.`;
  } else if (driftScore > 0.3) {
    status = 'warning';
    message = `Persona is evolving noticeably (score: ${driftScore.toFixed(3)}). This is expected if coaching strategies have been adapting.`;
  } else {
    status = 'healthy';
    message = `Persona drift is within healthy bounds (score: ${driftScore.toFixed(3)}).`;
  }

  return { driftScore, status, message };
}
