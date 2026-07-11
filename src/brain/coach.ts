import { GoogleGenAI } from '@google/genai';
import { config } from '../config';
import { PipelineState } from '../pipeline/state';
import { getStrategyByName } from './bandit/strategies';
import { getLatestTemplate } from './prompt-optimizer';

const ai = new GoogleGenAI({ apiKey: config.geminiApiKey });

export async function generateCoachingMessage(state: PipelineState): Promise<{ scratchpad: string; message: string; prompt: string }> {
  const strategy = getStrategyByName(state.selectedStrategy);
  if (!strategy) throw new Error('Unknown strategy selected');

  const evolvedTemplate = await getLatestTemplate(state.userId, state.selectedStrategy);
  const promptInstruction = evolvedTemplate ?? strategy.promptInstruction;

  const prompt = `You are the AI Accountability Coach.

YOUR PERSONA:
${state.personaBlock}

ABOUT THE USER:
${state.humanBlock}

USER'S WORLD (Knowledge Graph Context):
${JSON.stringify(state.knowledgeGraph, null, 2)}

RECENT ACTIVITY (Working Memory - Last 7 Days):
${state.workingMemoryText}

RELEVANT PAST EPISODES (Recall Memory):
${state.relevantEpisodesText}
${state.pendingTasks && state.pendingTasks.length > 0 ? `
USER'S OUTSTANDING TASKS TODAY:
${state.pendingTasks.map((t: any) => `- ${t.title}: ${t.description}`).join('\n')}
` : ''}
SELECTED COACHING STRATEGY TONIGHT: ${strategy.displayName}
Instruction: ${promptInstruction}

ACTIVITY SCORE TODAY: ${state.activityScore}

YOUR TASK:
1. Write a short SCRATCHPAD paragraph (internal thought process) explaining WHY you are choosing your specific wording based on the strategy and the user's data.
2. Write the MESSAGE to the user. Keep it under 500 characters. Fit the selected strategy perfectly. Be specific about what you know about them, not generic.

Format your response exactly like this:
SCRATCHPAD:
[Your internal reasoning]

MESSAGE:
[Your message to the user]`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });
    
    const text = response.text ?? '';
    
    const scratchpadMatch = text.match(/SCRATCHPAD:\s*([\s\S]*?)MESSAGE:/);
    const messageMatch = text.match(/MESSAGE:\s*([\s\S]*)/);
    
    return {
      scratchpad: scratchpadMatch ? scratchpadMatch[1].trim() : 'No reasoning provided.',
      message: messageMatch ? messageMatch[1].trim() : text,
      prompt
    };
  } catch (error) {
    console.error('Error generating coaching message:', error);
    return {
      scratchpad: 'Failed to generate.',
      message: 'Error: Could not generate your coaching message. Please check the API key quota.',
      prompt
    };
  }
}
