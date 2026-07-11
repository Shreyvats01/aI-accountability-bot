import { db } from '../../db';
import { generateEmbedding } from './embeddings';
import { DEFAULT_PERSONA_BLOCK, DEFAULT_HUMAN_BLOCK, DEFAULT_WORLD_BLOCK } from '../../config';

export async function getBlock(userId: string, blockType: string) {
  return db.memoryBlock.findUnique({
    where: {
      userId_blockType: {
        userId,
        blockType
      }
    }
  });
}

export async function getAllBlocks(userId: string) {
  return db.memoryBlock.findMany({
    where: { userId }
  });
}

export async function updateBlockContent(userId: string, blockType: string, newContent: string, editedBy: string) {
  const block = await getBlock(userId, blockType);
  if (!block) {
    throw new Error(`Block ${blockType} not found for user ${userId}`);
  }

  // Generate new embedding if needed (e.g. persona)
  let embeddingObj = {};
  if (blockType === 'persona') {
    const vector = await generateEmbedding(newContent);
    // Prisma pgvector uses raw queries for updates to vector columns typically, 
    // but Prisma also supports it via typed parameters if configured, otherwise we use raw SQL.
    await db.$executeRaw`
      UPDATE "MemoryBlock" 
      SET content = ${newContent}, 
          embedding = ${vector}::vector,
          version = version + 1,
          "lastEditedBy" = ${editedBy},
          "updatedAt" = NOW()
      WHERE id = ${block.id}
    `;
    return getBlock(userId, blockType);
  }

  return db.memoryBlock.update({
    where: { id: block.id },
    data: {
      content: newContent,
      version: { increment: 1 },
      lastEditedBy: editedBy
    }
  });
}

export async function initializeDefaultBlocks(userId: string, name: string, goals: string) {
  const blocks = [
    { type: 'persona', content: DEFAULT_PERSONA_BLOCK },
    { type: 'human', content: DEFAULT_HUMAN_BLOCK(name, goals) },
    { type: 'world', content: DEFAULT_WORLD_BLOCK },
    { type: 'scratchpad', content: 'No observations yet. This is a new user — focus on learning their patterns.' }
  ];

  for (const b of blocks) {
    if (b.type === 'persona') {
      const vector = await generateEmbedding(b.content);
      // Use ON CONFLICT DO NOTHING to be idempotent across multiple /start calls
      await db.$executeRaw`
        INSERT INTO "MemoryBlock" (id, "userId", "blockType", content, embedding, "originalContent", "originalEmbedding", "updatedAt")
        VALUES (gen_random_uuid(), ${userId}, ${b.type}, ${b.content}, ${vector}::vector, ${b.content}, ${vector}::vector, NOW())
        ON CONFLICT ("userId", "blockType") DO NOTHING
      `;
    } else {
      // Use upsert with skip on conflict for non-vector blocks
      await db.memoryBlock.upsert({
        where: { userId_blockType: { userId, blockType: b.type } },
        create: { userId, blockType: b.type, content: b.content },
        update: {} // Don't overwrite if already exists
      });
    }
  }
}

export async function applyMemoryEdit(userId: string, blockType: string, targetText: string, replacementText: string, editedBy: string) {
  const block = await getBlock(userId, blockType);
  if (!block) throw new Error('Block not found');
  
  const newContent = block.content.replace(targetText, replacementText);
  return updateBlockContent(userId, blockType, newContent, editedBy);
}
