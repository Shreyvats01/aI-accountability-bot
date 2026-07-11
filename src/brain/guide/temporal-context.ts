import { HistoricalActivity } from '@prisma/client';
import { db } from '../../db';

export async function buildTemporalContext(userId: string, recordsParam?: HistoricalActivity[]): Promise<string> {
  // If records are passed directly (like in bootstrap), use them, else fetch last 7 days
  let records = recordsParam;
  
  if (!records) {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    records = await db.historicalActivity.findMany({
      where: {
        userId,
        eventAt: { gte: sevenDaysAgo }
      },
      orderBy: { eventAt: 'desc' }
    });
  }

  if (records.length === 0) return 'No recent activity found.';

  // Calculate gaps
  const now = new Date();
  
  const lastCommit = records.find(r => r.type === 'commit' || r.type === 'pr');
  const lastTweet = records.find(r => r.type === 'tweet');

  const daysSinceCommit = lastCommit ? Math.floor((now.getTime() - lastCommit.eventAt.getTime()) / (1000 * 60 * 60 * 24)) : 'Unknown';
  const daysSinceTweet = lastTweet ? Math.floor((now.getTime() - lastTweet.eventAt.getTime()) / (1000 * 60 * 60 * 24)) : 'Unknown';

  // Group by project/topic
  const topicCounts: Record<string, number> = {};
  for (const r of records) {
    for (const t of r.topics) {
      topicCounts[t] = (topicCounts[t] || 0) + 1;
    }
  }

  const topTopics = Object.entries(topicCounts).sort((a, b) => b[1] - a[1]).slice(0, 3).map(e => e[0]);

  return `
Temporal Context (Last 7 Days):
- Total Events: ${records.length}
- Days since last commit/PR: ${daysSinceCommit === 0 ? 'Today' : daysSinceCommit}
- Days since last tweet: ${daysSinceTweet === 0 ? 'Today' : daysSinceTweet}
- Recently active topics/projects: ${topTopics.length > 0 ? topTopics.join(', ') : 'None'}

Recent events summary:
${records.slice(0, 5).map(r => `[${r.eventAt.toISOString().split('T')[0]}] ${r.platform} ${r.type}: ${r.content}`).join('\n')}
  `.trim();
}
