import { supabase } from '@/integrations/supabase/client';
import { AiAgentCallsDisabledError, getAiAgentCallsDisabled, isAiAgentFunction } from '@/lib/ai';

interface InvokeOptions {
  body?: unknown;
  headers?: Record<string, string>;
  method?: 'POST' | 'GET' | 'PUT' | 'PATCH' | 'DELETE';
  region?: string;
}

export async function invokeAppFunction<T = unknown>(functionName: string, options?: InvokeOptions) {
  if (getAiAgentCallsDisabled() && isAiAgentFunction(functionName)) {
    throw new AiAgentCallsDisabledError(functionName);
  }

  return supabase.functions.invoke<T>(functionName, options);
}
