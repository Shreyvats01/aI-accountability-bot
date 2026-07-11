import { PipelineAgent } from './types';
import { PipelineState } from '../state';
import { selectStrategy } from '../../brain/bandit/thompson';

export const strategistAgent: PipelineAgent = {
  stage: 'strategy',
  nextStage: 'generate',
  async execute(state: PipelineState, user: any): Promise<PipelineState> {
    console.log(`[Pipeline] Stage 4: Selecting strategy via Thompson Sampling`);
    const { selectedArm, samples } = await selectStrategy(user.id);
    state.selectedStrategy = selectedArm;
    state.banditSamples = samples;
    console.log(`[Pipeline] Selected strategy: ${selectedArm}`);

    return state;
  }
};
