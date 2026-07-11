import { PipelineState } from '../pipeline/state';
import { db } from '../db';

export interface InterventionDecision {
  shouldIntervene: boolean;
  urgency: 'skip' | 'low' | 'medium' | 'high' | 'critical';
  reason: string;
}

export async function checkInterventionNeeded(state: PipelineState): Promise<InterventionDecision> {
  const user = await db.user.findUnique({ where: { id: state.userId } });
  if (!user) throw new Error('User not found');

  if (state.activityScore > 5) {
    return { shouldIntervene: true, urgency: 'low', reason: 'High activity, just send brief praise.' };
  }

  if (state.activityScore > 0) {
    return { shouldIntervene: true, urgency: 'medium', reason: 'Normal activity, standard coaching.' };
  }

  // Activity is 0
  if (user.currentStreak > 0) {
    return { shouldIntervene: true, urgency: 'high', reason: 'Streak at risk of breaking today.' };
  }

  // Already 0 streak
  const recentLogs = await db.dailyLog.findMany({
    where: { userId: user.id },
    orderBy: { date: 'desc' },
    take: 3
  });

  const inactiveDays = recentLogs.filter(l => l.activityScore === 0).length;
  
  if (inactiveDays >= 2) {
    return { shouldIntervene: true, urgency: 'critical', reason: 'Multiple days of zero activity.' };
  }

  return { shouldIntervene: true, urgency: 'medium', reason: 'Zero activity today, but streak was already 0.' };
}
