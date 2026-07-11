import { PipelineAgent } from './types';
import { PipelineState } from '../state';
import { db } from '../../db';
import { checkInterventionNeeded } from '../../brain/intervention';
import { generateCoachingMessage } from '../../brain/coach';
import { generateCuriosityQuestion } from '../../brain/curiosity';
import { sendMessage } from '../../delivery/telegram';
import { coachingMessageTemplate } from '../../delivery/templates';
import { coachingMessageKeyboard } from '../../delivery/keyboards';

export const coachAgent: PipelineAgent = {
  stage: 'generate',
  nextStage: 'reflect',
  async execute(state: PipelineState, user: any): Promise<PipelineState> {
    console.log(`[Pipeline] Stage 5: Checking intervention and generating message`);
    const intervention = await checkInterventionNeeded(state);
    console.log(`[Pipeline] Intervention decision: ${intervention.urgency} — ${intervention.reason}`);

    if (intervention.urgency === 'skip') {
      state.deliveryStatus = 'skipped';
    } else {
      const { scratchpad, message, prompt } = await generateCoachingMessage(state);
      state.scratchpad = scratchpad;
      state.coachMessage = message;

      const question = generateCuriosityQuestion(state.knowledgeGraph!, []);
      state.curiosityQuestion = question;

      const freshUser2 = await db.user.findUnique({ where: { id: user.id } });
      const formattedMessage = coachingMessageTemplate({
        message,
        score: state.activityScore,
        strategy: state.selectedStrategy,
        urgency: intervention.urgency,
        curiosityQuestion: question,
        streak: freshUser2?.currentStreak ?? 0,
      });

      const interaction = await db.coachInteraction.create({
        data: {
          userId: user.id,
          strategyUsed: state.selectedStrategy,
          banditSamples: state.banditSamples,
          promptSent: prompt,
          aiResponse: message,
          interventionLevel: intervention.urgency,
          curiosityQuestion: question
        }
      });

      const keyboard = coachingMessageKeyboard(interaction.id);
      const msgId = await sendMessage(user.telegramId, formattedMessage, keyboard);
      state.deliveryStatus = msgId ? 'sent' : 'failed';

      if (question) {
        await db.curiosityLog.create({
          data: {
            userId: user.id,
            questionAsked: question,
            questionType: 'gap_detection',
            targetGap: 'knowledge_graph_gap'
          }
        });
      }

      await db.dailyLog.update({
        where: { id: state.dailyLogId! },
        data: {
          strategyUsed: state.selectedStrategy,
          coachMessage: formattedMessage,
          interventionLevel: intervention.urgency,
          messageDeliveredAt: new Date()
        }
      });
    }

    return state;
  }
};
