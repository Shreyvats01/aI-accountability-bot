import { GoogleGenAI } from '@google/genai';
import { config } from '../../config';

const ai = new GoogleGenAI({ apiKey: config.geminiApiKey });

export async function runDiagnostician(transcript: any[], context: string): Promise<string> {
  const prompt = `
  You are the Diagnostician agent in a 3-agent CrewAI setup.
  Analyze the conversation transcript and the temporal context.
  Output a concise root cause analysis of why the user is stuck or distracted.
  Is it a technical bug? Scope creep? Burnout? Emotional block?

  Context:
  ${context}

  Transcript:
  ${JSON.stringify(transcript, null, 2)}
  `;

  try {
    const res = await ai.models.generateContent({ model: 'gemini-2.5-flash', contents: prompt });
    return res.text ?? 'Could not diagnose.';
  } catch (err) {
    return 'Diagnostic failed.';
  }
}

export async function runPsychologist(transcript: any[], diagnostic: string): Promise<string> {
  const prompt = `
  You are the Psychologist agent in a 3-agent CrewAI setup.
  Read the transcript and the Diagnostician's report.
  Assess the user's emotional state and what kind of psychological support they need right now.

  Diagnostic:
  ${diagnostic}

  Transcript:
  ${JSON.stringify(transcript, null, 2)}
  `;

  try {
    const res = await ai.models.generateContent({ model: 'gemini-2.5-flash', contents: prompt });
    return res.text ?? 'Could not assess emotional state.';
  } catch (err) {
    return 'Psychological assessment failed.';
  }
}

export async function runCoach(
  transcript: any[], diagnostic: string, emotional: string,
  personaBlock: string, humanBlock: string, worldBlock: string,
  promptTemplate: string
): Promise<string> {
  const prompt = `
  You are the Final Coach agent.
  Using the Diagnostic report, the Psychologist report, and your memory blocks, 
  generate the final Action Plan message to send to the user.
  
  YOUR PERSONA:
  ${personaBlock}
  
  ABOUT THE USER:
  ${humanBlock}

  WORLD KNOWLEDGE:
  ${worldBlock}

  Diagnostic: ${diagnostic}
  Emotional State: ${emotional}

  Strategy Instruction Template:
  ${promptTemplate}

  Write the final message. It should be highly actionable, empathetic, and specific to their context.
  Keep it under 1000 characters.
  `;

  try {
    const res = await ai.models.generateContent({ model: 'gemini-2.5-flash', contents: prompt });
    return res.text ?? 'Could not generate action plan.';
  } catch (err) {
    return 'Failed to generate action plan.';
  }
}
