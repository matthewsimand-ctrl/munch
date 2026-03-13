const AI_AGENT_CALLS_DISABLED_KEY = 'munch_disable_ai_agent_calls';

export const AI_AGENT_CALLS_CHANGED_EVENT = 'munch-ai-agent-calls-changed';

const AI_AGENT_FUNCTIONS = new Set([
  'analyze-nutrition',
  'estimate-grocery-price',
  'generate-meal-plan',
  'generate-pantry-recipe',
  'import-recipe',
  'scan-fridge',
  'tweak-recipe',
]);

export function getAiAgentCallsDisabled(): boolean {
  if (typeof window === 'undefined') return false;
  return window.localStorage.getItem(AI_AGENT_CALLS_DISABLED_KEY) === 'true';
}

export function setAiAgentCallsDisabled(disabled: boolean) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(AI_AGENT_CALLS_DISABLED_KEY, disabled ? 'true' : 'false');
  window.dispatchEvent(new Event(AI_AGENT_CALLS_CHANGED_EVENT));
}

export function isAiAgentFunction(functionName: string): boolean {
  return AI_AGENT_FUNCTIONS.has(functionName);
}

export function getAiDisabledMessage(featureLabel = 'This AI feature'): string {
  return `${featureLabel} is disabled in Settings for testing.`;
}

export class AiAgentCallsDisabledError extends Error {
  functionName: string;

  constructor(functionName: string) {
    super(getAiDisabledMessage('AI agent calls'));
    this.name = 'AiAgentCallsDisabledError';
    this.functionName = functionName;
  }
}

export function isAiAgentCallsDisabledError(error: unknown): error is AiAgentCallsDisabledError {
  return error instanceof AiAgentCallsDisabledError;
}
