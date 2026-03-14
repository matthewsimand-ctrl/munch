import { supabase } from '@/integrations/supabase/client';
import { AiAgentCallsDisabledError, getAiAgentCallsDisabled, isAiAgentFunction } from '@/lib/ai';

interface InvokeOptions {
  body?: unknown;
  headers?: Record<string, string>;
  method?: 'POST' | 'GET' | 'PUT' | 'PATCH' | 'DELETE';
  region?: string;
}

export async function invokeAppFunction<T = any>(functionName: string, options?: InvokeOptions): Promise<{ data: T | null; error: any }> {
  if (getAiAgentCallsDisabled() && isAiAgentFunction(functionName)) {
    throw new AiAgentCallsDisabledError(functionName);
  }

  const result = await supabase.functions.invoke(functionName, options as any);
  return result as { data: T | null; error: any };
}
