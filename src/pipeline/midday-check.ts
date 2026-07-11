import { db } from '../db';
import { checkInterventionNeeded } from '../brain/intervention';
import { sendMessage } from '../delivery/telegram';
import { createInitialState } from './state';

async function main() {
  console.log('Starting midday intervention check...');
  const users = await db.user.findMany({ select: { id: true, telegramId: true } });
  
  for (const user of users) {
    // We create a dummy state just to pass to checkInterventionNeeded
    // In a real app, this would use a fast DB check for today's activity
    const dummyState = createInitialState(user.id);
    const todayDate = new Date(new Date().toISOString().split('T')[0] + 'T00:00:00.000Z');
    const log = await db.dailyLog.findUnique({ where: { userId_date: { userId: user.id, date: todayDate } } });
    dummyState.activityScore = log?.activityScore ?? 0;
    
    const decision = await checkInterventionNeeded(dummyState);
    if (decision.shouldIntervene && ['high', 'critical'].includes(decision.urgency)) {
       console.log(`Sending midday nudge to ${user.id}`);
       await sendMessage(user.telegramId, "Midday check-in: Let's get something shipped today. Open your editor.");
    }
  }
  console.log('Midday check complete.');
}

main().catch(console.error);
