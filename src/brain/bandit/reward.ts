import { db } from '../../db';
import { calculateReward } from '../../utils/scoring';
import { updateReward } from './thompson';
import { maybeEvolvePromptTemplate } from '../prompt-optimizer';

export async function processYesterdayReward(userId: string) {
  // Find the last two logs
  const logs = await db.dailyLog.findMany({
    where: { userId },
    orderBy: { date: 'desc' },
    take: 2
  });

  if (logs.length < 2) return null; // Not enough data

  const [todayLog, yesterdayLog] = logs;

  if (!yesterdayLog.strategyUsed) return null; // No strategy was used

  const reward = calculateReward(yesterdayLog.activityScore, todayLog.activityScore);

  await updateReward(userId, yesterdayLog.strategyUsed, reward);
  await maybeEvolvePromptTemplate(userId, yesterdayLog.strategyUsed, reward);

  // We should also link this reward to the interaction for auditability, but we'll do that in the main pipeline
  
  return { armName: yesterdayLog.strategyUsed, reward };
}
