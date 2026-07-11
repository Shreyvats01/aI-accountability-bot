import { db } from '../db';
import { runPipeline } from './graph';

async function main() {
  console.log('Starting nightly pipeline...');
  const users = await db.user.findMany({ select: { id: true } });
  
  for (const user of users) {
    console.log(`Running pipeline for user: ${user.id}`);
    await runPipeline(user.id);
  }
  console.log('Nightly pipeline complete.');
}

main().catch(console.error);
