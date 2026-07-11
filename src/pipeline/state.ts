import { ActivityData } from '../utils/scoring';
import { EpisodicMemory } from '@prisma/client';
import { KnowledgeGraph } from '../brain/memory/knowledge-graph';

export interface PipelineState {
  // Meta
  userId: string;
  runDate: Date;
  checkpoint: string;
  errors: string[];

  // Stage 1: Collection
  rawGithub: any | null;
  rawX: any | null;
  rawLinkedIn: any | null;

  // Stage 2: Scoring
  activityData: ActivityData | null;
  activityScore: number;
  dailyLogId: string | null;

  // Stage 3: Memory
  workingMemoryText: string;
  relevantEpisodesText: string;
  knowledgeGraph: KnowledgeGraph | null;
  personaBlock: string;
  humanBlock: string;

  // Stage 4: Strategy
  selectedStrategy: string;
  banditSamples: Record<string, number>;

  // Stage 5: Generation
  scratchpad: string;
  coachMessage: string | null;
  curiosityQuestion: string | null;
  pendingTasks: any[] | null;

  // Stage 6: Delivery
  deliveryStatus: 'pending' | 'sent' | 'skipped' | 'failed';

  // Stage 7: Reflection
  yesterdayReward: number | null;
}

export function createInitialState(userId: string): PipelineState {
  return {
    userId,
    runDate: new Date(),
    checkpoint: 'start',
    errors: [],
    rawGithub: null,
    rawX: null,
    rawLinkedIn: null,
    activityData: null,
    activityScore: 0,
    dailyLogId: null,
    workingMemoryText: '',
    relevantEpisodesText: '',
    knowledgeGraph: null,
    personaBlock: '',
    humanBlock: '',
    selectedStrategy: '',
    banditSamples: {},
    scratchpad: '',
    coachMessage: null,
    curiosityQuestion: null,
    pendingTasks: null,
    deliveryStatus: 'pending',
    yesterdayReward: null
  };
}
