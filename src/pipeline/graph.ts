import { createInitialState } from './state';
import { saveCheckpoint, loadCheckpoint } from './checkpoint';
import { db } from '../db';
import { PipelineAgent } from './agents/types';
import { researcherAgent } from './agents/researcher';
import { parserAgent } from './agents/parser';
import { librarianAgent } from './agents/librarian';
import { strategistAgent } from './agents/strategist';
import { coachAgent } from './agents/coach-agent';
import { reflectorAgent } from './agents/reflector';

export async function runPipeline(userId: string) {
  let state = await loadCheckpoint(userId);

  if (!state || state.checkpoint === 'completed') {
    state = createInitialState(userId);
  }

  const user = await db.user.findUnique({
    where: { id: userId },
    include: { credentials: true }
  });

  if (!user) throw new Error(`User not found: ${userId}`);

  const agents: PipelineAgent[] = [
    researcherAgent,
    parserAgent,
    librarianAgent,
    strategistAgent,
    coachAgent,
    reflectorAgent
  ];

  for (const agent of agents) {
    if (state.checkpoint === 'completed') break;
    
    if (state.checkpoint === 'start') {
      state.checkpoint = 'collect'; 
    }
    
    if (state.checkpoint === agent.stage) {
      try {
        state = await agent.execute(state, user);
        state.checkpoint = agent.nextStage;
        await saveCheckpoint(state, agent.nextStage);
      } catch (err: any) {
        console.error(`[Pipeline] ❌ Failed at stage "${agent.stage}" for user ${userId}:`, err);
        state.errors.push(err.message);
        await saveCheckpoint(state, agent.stage, 'failed', err.message);
        throw err; // Stop execution on failure
      }
    }
  }

  if (state.checkpoint === 'completed') {
      await saveCheckpoint(state, 'completed', 'completed');
      console.log(`[Pipeline] ✅ Completed successfully for user ${userId} | Delivery: ${state.deliveryStatus}`);
  }
}
