import { PipelineAgent } from './types';
import { PipelineState } from '../state';
import { db } from '../../db';
import { parseRawActivity } from '../../parsers/ai-parser';
import { extractEntities } from '../../parsers/entity-extractor';
import { scoreActivity } from '../../utils/scoring';
import { getBlock } from '../../brain/memory/blocks';
import { upsertEntity, addRelationship } from '../../brain/memory/knowledge-graph';

export const parserAgent: PipelineAgent = {
  stage: 'parse',
  nextStage: 'memory',
  async execute(state: PipelineState, user: any): Promise<PipelineState> {
    console.log(`[Pipeline] Stage 2: Parsing and scoring activity`);
    state.activityData = await parseRawActivity(state.rawGithub, state.rawX, state.rawLinkedIn);
    state.activityScore = scoreActivity(state.activityData!);

    const todayDate = new Date(state.runDate.toISOString().split('T')[0] + 'T00:00:00.000Z');
    const log = await db.dailyLog.upsert({
      where: { userId_date: { userId: user.id, date: todayDate } },
      update: { activityData: state.activityData as any, activityScore: state.activityScore },
      create: { userId: user.id, date: todayDate, activityData: state.activityData as any, activityScore: state.activityScore }
    });
    state.dailyLogId = log.id;

    const freshUser = await db.user.findUnique({ where: { id: user.id } });
    if (freshUser) {
      if (state.activityScore > 0) {
        const newStreak = freshUser.currentStreak + 1;
        await db.user.update({
          where: { id: user.id },
          data: {
            currentStreak: newStreak,
            longestStreak: newStreak > freshUser.longestStreak ? newStreak : freshUser.longestStreak
          }
        });
      } else {
        await db.user.update({ where: { id: user.id }, data: { currentStreak: 0 } });
      }
    }

    if (state.activityData) {
      const activitySummary = JSON.stringify(state.activityData);
      const humanBlock = await getBlock(user.id, 'human');
      const userGoals = humanBlock?.content || '';
      try {
        const extracted = await extractEntities(activitySummary, userGoals);
        for (const entity of extracted.entities) {
          await upsertEntity(user.id, entity.name, { type: entity.type, description: entity.description });
        }
        for (const rel of extracted.relationships) {
          await addRelationship(user.id, rel);
        }
        console.log(`[Pipeline] Extracted ${extracted.entities.length} entities`);
      } catch (err) {
        console.warn('[Pipeline] Entity extraction failed:', err);
      }
    }

    const pendingTasks = await db.guideTask.findMany({
      where: { userId: user.id, status: 'pending', suggestedDay: 'today' }
    });
    if (pendingTasks.length > 0) {
      state.pendingTasks = pendingTasks;
    }

    return state;
  }
};
