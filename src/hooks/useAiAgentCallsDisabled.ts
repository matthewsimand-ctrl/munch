import { useEffect, useState } from 'react';
import { AI_AGENT_CALLS_CHANGED_EVENT, getAiAgentCallsDisabled } from '@/lib/ai';

export function useAiAgentCallsDisabled() {
  const [aiAgentCallsDisabled, setAiAgentCallsDisabled] = useState(getAiAgentCallsDisabled());

  useEffect(() => {
    const sync = () => setAiAgentCallsDisabled(getAiAgentCallsDisabled());

    window.addEventListener('storage', sync);
    window.addEventListener(AI_AGENT_CALLS_CHANGED_EVENT, sync);

    return () => {
      window.removeEventListener('storage', sync);
      window.removeEventListener(AI_AGENT_CALLS_CHANGED_EVENT, sync);
    };
  }, []);

  return aiAgentCallsDisabled;
}
