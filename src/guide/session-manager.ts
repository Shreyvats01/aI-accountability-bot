import { db } from '../db';
import { GuideSession } from '@prisma/client';

export async function getActiveSession(userId: string): Promise<GuideSession | null> {
  return db.guideSession.findFirst({
    where: { userId, status: { in: ['active', 'synthesizing'] } },
    orderBy: { createdAt: 'desc' }
  });
}

export async function startGuideSession(userId: string, triggerType: string, phrase?: string, strategy?: string): Promise<GuideSession> {
  return db.guideSession.create({
    data: {
      userId,
      triggerType,
      triggerPhrase: phrase,
      guideStrategy: strategy,
      transcript: []
    }
  });
}

export async function addTurn(sessionId: string, role: 'bot' | 'user', content: string): Promise<GuideSession> {
  const session = await db.guideSession.findUnique({ where: { id: sessionId } });
  if (!session) throw new Error('Session not found');

  const transcript = (session.transcript as any[]) || [];
  transcript.push({ role, content });

  return db.guideSession.update({
    where: { id: sessionId },
    data: {
      transcript,
      turnCount: role === 'user' ? session.turnCount + 1 : session.turnCount
    }
  });
}

export async function markSessionSynthesizing(sessionId: string): Promise<void> {
  await db.guideSession.update({
    where: { id: sessionId },
    data: { status: 'synthesizing' }
  });
}

export async function closeSession(
  sessionId: string, 
  actionPlan: string, 
  diagnostic: string, 
  psychologist: string, 
  templateUsed: string
): Promise<void> {
  await db.guideSession.update({
    where: { id: sessionId },
    data: {
      status: 'completed',
      actionPlanSent: actionPlan,
      diagnosticianOutput: diagnostic,
      psychologistOutput: psychologist,
      promptTemplate: templateUsed,
      synthesizedAt: new Date()
    }
  });
}

export async function abandonSession(sessionId: string): Promise<void> {
  await db.guideSession.update({
    where: { id: sessionId },
    data: { status: 'abandoned' }
  });
}
