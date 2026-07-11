import { db } from '../db';
import { getBlock } from '../brain/memory/blocks';
import { sentimentEvaluator } from '../brain/evaluators/sentiment';
import { memoryEditEvaluator } from '../brain/evaluators/memory-edit';
import { entityExtractionEvaluator } from '../brain/evaluators/entity-extraction';
import { trustScoreEvaluator } from '../brain/evaluators/trust-score';

async function getReplyContext(userId: string) {
  const [lastInteraction, humanBlock] = await Promise.all([
    db.coachInteraction.findFirst({ where: { userId }, orderBy: { createdAt: 'desc' } }),
    getBlock(userId, 'human')
  ]);
  return { lastInteraction, humanBlock };
}

async function runEvaluatorChain(userId: string, replyText: string) {
  const context = await getReplyContext(userId);
  await Promise.allSettled([
    sentimentEvaluator(userId, replyText, context),
    memoryEditEvaluator(userId, replyText, context),
    entityExtractionEvaluator(userId, replyText, context),
    trustScoreEvaluator(userId, replyText, context)
  ]);
}

export async function processUserReply(userId: string, replyText: string) {
  runEvaluatorChain(userId, replyText).catch(err => 
    console.error('[Evaluator] Chain failed:', err)
  );
}
