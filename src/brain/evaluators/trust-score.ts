import { db } from '../../db';

export async function trustScoreEvaluator(userId: string, replyText: string, context: any) {
  if (!context.lastInteraction) return;

  const latencyMs = Date.now() - context.lastInteraction.createdAt.getTime();
  
  await db.coachInteraction.update({
      where: { id: context.lastInteraction.id },
      data: { userReply: replyText, replyLatencyMs: latencyMs }
  });

  // Basic trust adjustment: fast reply < 10 mins (+0.05), slow reply (+0.01)
  const trustIncrement = latencyMs < 10 * 60 * 1000 ? 0.05 : 0.01;
  
  await db.user.update({
      where: { id: userId },
      data: { trustScore: { increment: trustIncrement }, lastReplyAt: new Date() }
  });
}
