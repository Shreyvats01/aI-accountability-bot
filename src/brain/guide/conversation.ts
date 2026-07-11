import { GoogleGenAI } from '@google/genai';
import { config } from '../../config';
import { GuideSession, GuideTask } from '@prisma/client';
import { buildTemporalContext } from './temporal-context';
import { getPromptTemplate } from './dspy-optimizer';
import { runDiagnostician, runPsychologist, runCoach } from './agents';
import { decomposeActionPlan } from './decomposer';
import { getBlock } from '../memory/blocks';
import { getKnowledgeGraph } from '../memory/knowledge-graph';
import { selectStrategy } from '../bandit/thompson';
import { GUIDE_STRATEGIES } from './strategies';
import { db } from '../../db';

const ai = new GoogleGenAI({ apiKey: config.geminiApiKey });

export async function generateGuideOpener(userId: string): Promise<{ text: string; quickReplies: string[], strategy: string }> {
  const temporalContext = await buildTemporalContext(userId);
  
  // Select strategy via bandit (but using guide arms)
  // For simplicity here, we assume selectStrategy can handle guide arms if we pass a different subset
  // Actually, let's just pick a random one for now to bootstrap the bandit, or use the existing mechanism
  // We'll pick a random strategy from GUIDE_STRATEGIES for now if bandit isn't fully separated
  const arm = GUIDE_STRATEGIES[Math.floor(Math.random() * GUIDE_STRATEGIES.length)].armName;

  const prompt = `
  You are an Accountability Coach opening a guide session.
  The user is distracted, stuck, or overwhelmed.
  Read their temporal context and write a 1-2 sentence opener.
  Acknowledge their recent history.
  Then, provide 3 short "quick reply" options for them to tap to explain why they are stuck.

  Temporal Context:
  ${temporalContext}

  Format strictly:
  OPENER: [Your text]
  OPTION 1: [Short reason]
  OPTION 2: [Short reason]
  OPTION 3: [Short reason]
  `;

  try {
    const res = await ai.models.generateContent({ model: 'gemini-2.5-flash', contents: prompt });
    const text = res.text ?? '';
    const opener = text.match(/OPENER:\s*([\s\S]*?)OPTION 1:/)?.[1]?.trim() || 'I see you might be stuck. What\'s going on?';
    const opt1 = text.match(/OPTION 1:\s*(.*)/)?.[1]?.trim() || 'Code Problem';
    const opt2 = text.match(/OPTION 2:\s*(.*)/)?.[1]?.trim() || 'Overwhelmed';
    const opt3 = text.match(/OPTION 3:\s*(.*)/)?.[1]?.trim() || 'Distracted';

    return { text: opener, quickReplies: [opt1, opt2, opt3], strategy: arm };
  } catch (err) {
    return { text: 'I see you might be stuck. What\'s going on?', quickReplies: ['Code Problem', 'Overwhelmed', 'Distracted'], strategy: 'guide_direct' };
  }
}

export async function generateGuideTurn(session: GuideSession, userMessage: string): Promise<{ text: string; buttons?: string[]; isFinalQuestion: boolean }> {
  const isFinal = session.turnCount >= 3;
  
  if (isFinal) {
    return {
      text: "Got it. Take a minute and just brain-dump exactly what you are feeling or what is blocking you right now. Write as much as you need, then tap 'Give me my plan'.",
      isFinalQuestion: true
    };
  }

  const prompt = `
  You are an Accountability Coach mid-conversation.
  The user is stuck.
  
  Transcript so far:
  ${JSON.stringify(session.transcript)}

  Write a short, empathetic 1-2 sentence response. 
  End with a clarifying question to narrow down the root cause.
  Provide 2 short options for them to tap, or they can free-write.

  Format:
  RESPONSE: [Your text]
  OPTION 1: [Short option]
  OPTION 2: [Short option]
  `;

  try {
    const res = await ai.models.generateContent({ model: 'gemini-2.5-flash', contents: prompt });
    const text = res.text ?? '';
    const responseText = text.match(/RESPONSE:\s*([\s\S]*?)OPTION 1:/)?.[1]?.trim() || 'Tell me more.';
    const opt1 = text.match(/OPTION 1:\s*(.*)/)?.[1]?.trim() || 'Technical block';
    const opt2 = text.match(/OPTION 2:\s*(.*)/)?.[1]?.trim() || 'Lack of motivation';

    return { text: responseText, buttons: [opt1, opt2], isFinalQuestion: false };
  } catch (err) {
    return { text: 'Tell me more.', isFinalQuestion: false };
  }
}

export async function synthesizeWithAgents(session: GuideSession): Promise<{
  actionPlan: string;
  tasks: GuideTask[];
  diagnosticianOutput: string;
  psychologistOutput: string;
}> {
  const temporalContext = await buildTemporalContext(session.userId);
  const transcript = session.transcript as any[];

  // 1. CrewAI Sequence
  const diagnostic = await runDiagnostician(transcript, temporalContext);
  const emotional = await runPsychologist(transcript, diagnostic);

  const personaBlock = (await getBlock(session.userId, 'persona'))?.content || '';
  const humanBlock = (await getBlock(session.userId, 'human'))?.content || '';
  const kg = await getKnowledgeGraph(session.userId);
  const worldBlock = JSON.stringify(kg);

  const template = await getPromptTemplate(session.userId, session.guideStrategy!);

  const actionPlan = await runCoach(transcript, diagnostic, emotional, personaBlock, humanBlock, worldBlock, template);

  // 2. Auto-GPT Decomposition
  const taskData = await decomposeActionPlan(actionPlan, session.userId, session.id);
  const tasks = [];
  if (taskData.length > 0) {
    await db.guideTask.createMany({ data: taskData });
    tasks.push(...(await db.guideTask.findMany({ where: { sessionId: session.id } })));
  }

  return { actionPlan, tasks, diagnosticianOutput: diagnostic, psychologistOutput: emotional };
}
