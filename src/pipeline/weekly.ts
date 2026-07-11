import { db } from '../db';
import { runWeeklyDistillation } from '../brain/distillation';

async function main() {
  console.log('[Weekly] Starting weekly distillation for all users...');
  const users = await db.user.findMany({ select: { id: true, name: true } });

  for (const user of users) {
    console.log(`[Weekly] Distilling for user: ${user.name || user.id}`);
    try {
      await runWeeklyDistillation(user.id);
    } catch (err) {
      console.error(`[Weekly] Failed for user ${user.id}:`, err);
    }
  }
  console.log('[Weekly] Distillation complete.');
}

main().catch(console.error);
