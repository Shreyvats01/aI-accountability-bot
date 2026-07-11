import { PipelineAgent } from './types';
import { PipelineState } from '../state';
import { getWorkingMemory, formatWorkingMemory } from '../../brain/memory/working';
import { searchSimilarEpisodes, formatEpisodes } from '../../brain/memory/episodic';
import { getBlock } from '../../brain/memory/blocks';
import { getKnowledgeGraph } from '../../brain/memory/knowledge-graph';
import { generateEmbedding } from '../../brain/memory/embeddings';

export const librarianAgent: PipelineAgent = {
  stage: 'memory',
  nextStage: 'strategy',
  async execute(state: PipelineState, user: any): Promise<PipelineState> {
    console.log(`[Pipeline] Stage 3: Loading memory`);
    const logs = await getWorkingMemory(user.id, 7);
    state.workingMemoryText = formatWorkingMemory(logs);

    const queryText = `activity score ${state.activityScore}, strategy context, coaching session`;
    const queryVector = await generateEmbedding(queryText);
    const episodes = await searchSimilarEpisodes(user.id, queryVector, 3);
    state.relevantEpisodesText = formatEpisodes(episodes);

    const kg = await getKnowledgeGraph(user.id);
    state.knowledgeGraph = kg;

    const persona = await getBlock(user.id, 'persona');
    const human = await getBlock(user.id, 'human');
    state.personaBlock = persona?.content || '';
    state.humanBlock = human?.content || '';

    return state;
  }
};
