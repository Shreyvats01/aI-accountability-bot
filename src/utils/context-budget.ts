/**
 * Context budget allocation in tokens.
 */
export interface ContextBudget {
  persona: number;
  human: number;
  world: number;
  recall: number;
  scratchpad: number;
  working: number;
}

export const DEFAULT_CONTEXT_BUDGET: ContextBudget = {
  persona: 300,
  human: 400,
  world: 300,
  recall: 500,
  scratchpad: 200,
  working: 400
};

/**
 * Roughly estimates the number of tokens in a string.
 * Assumes an average of ~4 characters per token.
 */
export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

/**
 * Trims a string to fit within a specified token budget.
 * Adds an ellipsis if trimmed.
 */
export function trimToTokenBudget(text: string, maxTokens: number): string {
  const maxChars = maxTokens * 4;
  if (text.length <= maxChars) {
    return text;
  }
  return text.substring(0, maxChars - 12) + '...[trimmed]';
}
