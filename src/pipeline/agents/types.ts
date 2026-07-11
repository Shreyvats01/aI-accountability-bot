import { PipelineState } from '../state';

export interface PipelineAgent {
  stage: string;
  nextStage: string;
  execute(state: PipelineState, user: any): Promise<PipelineState>;
}
