import { db } from '../db';
import { PipelineState } from './state';

export async function saveCheckpoint(state: PipelineState, stage: string, status: string = 'running', error?: string) {
  const date = state.runDate.toISOString().split('T')[0] + 'T00:00:00.000Z';
  
  await db.pipelineCheckpoint.upsert({
    where: {
      userId_runDate: {
        userId: state.userId,
        runDate: new Date(date)
      }
    },
    update: {
      stage,
      status,
      stateSnapshot: state as any,
      errorMessage: error,
      retryCount: status === 'failed' ? { increment: 1 } : undefined
    },
    create: {
      userId: state.userId,
      runDate: new Date(date),
      stage,
      status,
      stateSnapshot: state as any,
      errorMessage: error
    }
  });
}

export async function loadCheckpoint(userId: string): Promise<PipelineState | null> {
  const date = new Date().toISOString().split('T')[0] + 'T00:00:00.000Z';
  
  const cp = await db.pipelineCheckpoint.findUnique({
    where: {
      userId_runDate: {
        userId,
        runDate: new Date(date)
      }
    }
  });
  
  if (!cp) return null;
  return cp.stateSnapshot as unknown as PipelineState;
}
