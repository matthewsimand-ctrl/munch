import { describe, expect, it, beforeEach } from 'vitest';

import {
  getAiAgentCallsDisabled,
  getAiDisabledMessage,
  isAiAgentFunction,
  setAiAgentCallsDisabled,
} from '@/lib/ai';

describe('ai testing helpers', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('persists the AI agent disable toggle in localStorage', () => {
    setAiAgentCallsDisabled(true);
    expect(getAiAgentCallsDisabled()).toBe(true);

    setAiAgentCallsDisabled(false);
    expect(getAiAgentCallsDisabled()).toBe(false);
  });

  it('recognizes AI-backed edge functions only', () => {
    expect(isAiAgentFunction('import-recipe')).toBe(true);
    expect(isAiAgentFunction('scrape-recipe')).toBe(false);
    expect(isAiAgentFunction('search-recipes')).toBe(false);
  });

  it('builds a readable settings message', () => {
    expect(getAiDisabledMessage('AI nutrition analysis')).toBe(
      'AI nutrition analysis is disabled in Settings for testing.'
    );
  });
});
