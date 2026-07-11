export interface Strategy {
  armName: string;
  displayName: string;
  description: string;
  promptInstruction: string;
}

export const STRATEGIES: Strategy[] = [
  {
    armName: 'drill_sergeant',
    displayName: 'Aggressive Shaming',
    description: 'Use an aggressive, no-excuses drill sergeant tone.',
    promptInstruction: 'Use an aggressive, no-excuses drill sergeant tone. Shame the user\'s lack of action. Compare them to competitors. Make them feel the urgency.'
  },
  {
    armName: 'cheerleader',
    displayName: 'Positive Reinforcement',
    description: 'Be genuinely enthusiastic and encouraging.',
    promptInstruction: 'Be genuinely enthusiastic and encouraging. Highlight every small win. Use emojis and energy. Make the user feel good about their progress, even if small.'
  },
  {
    armName: 'strategist',
    displayName: 'Logical Planning',
    description: 'Be calm, analytical, and strategic.',
    promptInstruction: 'Be calm, analytical, and strategic. Break down the user\'s goals into specific, measurable micro-tasks. Use data and numbers. Be the logical advisor.'
  },
  {
    armName: 'storyteller',
    displayName: 'Inspirational Stories',
    description: 'Share relevant success stories.',
    promptInstruction: 'Share relevant success stories of famous builders and entrepreneurs. Draw parallels to the user\'s journey. Inspire through narrative.'
  },
  {
    armName: 'accountability_mirror',
    displayName: 'Reflection Questions',
    description: 'Ask pointed, uncomfortable questions.',
    promptInstruction: 'Ask pointed, uncomfortable questions that force the user to confront the gap between their stated goals and their actual behavior. Be a mirror, not a judge.'
  },
  {
    armName: 'micro_tasker',
    displayName: 'Tiny Next Step',
    description: 'Focus exclusively on giving the user ONE tiny, specific task.',
    promptInstruction: 'Focus exclusively on giving the user ONE tiny, specific, immediately actionable task. No big picture, no judgment. Just the smallest possible next step.'
  }
];

export function getStrategyByName(name: string): Strategy | undefined {
  return STRATEGIES.find(s => s.armName === name);
}
