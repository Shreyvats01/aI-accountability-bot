import { db } from '../../db';

export async function getWorkingMemory(userId: string, days: number = 7) {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - days);

  return db.dailyLog.findMany({
    where: {
      userId,
      date: {
        gte: cutoffDate
      }
    },
    orderBy: {
      date: 'desc'
    }
  });
}

export function formatWorkingMemory(logs: any[]): string {
  if (logs.length === 0) return 'No recent activity logs available.';
  
  return logs.map(log => {
    const data = typeof log.activityData === 'string' ? JSON.parse(log.activityData) : log.activityData;
    return `[${log.date.toISOString().split('T')[0]}] Score: ${log.activityScore}\nData: ${JSON.stringify(data)}`;
  }).join('\n\n');
}
