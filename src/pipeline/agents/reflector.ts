import { PipelineAgent } from './types';
import { PipelineState } from '../state';
import { db } from '../../db';
import { createEpisode } from '../../brain/memory/episodic';
import { processYesterdayReward } from '../../brain/bandit/reward';
import { updateReward } from '../../brain/bandit/thompson';
import { optimizeGuidePrompt } from '../../brain/guide/dspy-optimizer';

export const reflectorAgent: PipelineAgent = {
  stage: 'reflect',
  nextStage: 'completed',
  async execute(state: PipelineState, user: any): Promise<PipelineState> {
    console.log(`[Pipeline] Stage 6: Reflection and reward processing`);

    const rewardResult = await processYesterdayReward(user.id);
    if (rewardResult) {
      state.yesterdayReward = rewardResult.reward;
      console.log(`[Pipeline] Reward for "${rewardResult.armName}": ${rewardResult.reward}`);
    }

    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const sessions = await db.guideSession.findMany({ 
      where: { userId: user.id, status: 'completed', rewardScore: null, synthesizedAt: { gte: yesterday } } 
    });

    for (const session of sessions) {
      if (!session.synthesizedAt) continue;
      
      const twelveHoursLater = new Date(session.synthesizedAt.getTime() + 12 * 60 * 60 * 1000);
      const activityCount = await db.historicalActivity.count({
        where: { userId: user.id, eventAt: { gte: session.synthesizedAt, lte: twelveHoursLater } }
      });
      const reward = activityCount > 0 ? 1.0 : 0.0;

      const tasksCompleted = await db.guideTask.count({ where: { sessionId: session.id, status: 'done' } });
      const finalReward = Math.min(1.0, reward + tasksCompleted * 0.2);

      if (session.guideStrategy) {
        await updateReward(user.id, session.guideStrategy, finalReward);
      }
      await db.guideSession.update({ where: { id: session.id }, data: { rewardScore: finalReward, rewardCalculatedAt: new Date() } });

      if (session.guideStrategy) {
        const arm = await db.strategyArm.findUnique({ where: { userId_armName: { userId: user.id, armName: session.guideStrategy } } });
        if (arm && arm.totalPulls >= 5 && arm.totalPulls % 5 === 0) {
          optimizeGuidePrompt(user.id, session.guideStrategy).catch(console.error);
        }
      }
    }

    const freshUser = await db.user.findUnique({ where: { id: user.id } });
    if (freshUser) {
      let episodeEventType: string | null = null;
      let episodeNarrative: string | null = null;

      if (freshUser.currentStreak === 0 && state.activityScore === 0) {
        const previousLogs = await db.dailyLog.findMany({ where: { userId: user.id }, orderBy: { date: 'desc' }, take: 2 });
        if (previousLogs.length >= 2 && previousLogs[1].activityScore > 0) {
          episodeEventType = 'streak_broken';
          episodeNarrative = `User's streak broke today. Activity score was 0. Previous day score: ${previousLogs[1].activityScore}.`;
        }
      } else if (state.activityScore >= 15) {
        episodeEventType = 'high_activity_day';
        episodeNarrative = `Exceptional activity day. Score: ${state.activityScore}. Strategy used: ${state.selectedStrategy}.`;
      }

      if (episodeEventType && episodeNarrative) {
        await createEpisode(
          user.id,
          episodeEventType,
          episodeNarrative,
          { score: state.activityScore, strategy: state.selectedStrategy, date: new Date() },
          state.activityScore > 5 ? 'positive' : 'negative',
          state.selectedStrategy,
          rewardResult?.reward !== undefined ? (rewardResult.reward > 0.5 ? 'success' : 'failure') : 'neutral'
        );
        console.log(`[Pipeline] Created episode: ${episodeEventType}`);
      }
    }

    return state;
  }
};
