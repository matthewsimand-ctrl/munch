import { supabase } from '@/integrations/supabase/client';
import { AiAgentCallsDisabledError, getAiAgentCallsDisabled, isAiAgentFunction } from '@/lib/ai';

interface InvokeOptions {
  body?: unknown;
  headers?: Record<string, string>;
  method?: 'POST' | 'GET' | 'PUT' | 'PATCH' | 'DELETE';
  region?: string;
}

async function enrichFunctionError(error: any) {
  if (!error || typeof error !== 'object') return error;

  const context = (error as { context?: Response }).context;
  if (!context || typeof context.clone !== 'function') return error;

  try {
    const responseClone = context.clone();
    const contentType = responseClone.headers.get('content-type') || '';

    if (contentType.includes('application/json')) {
      const payload = await responseClone.json();
      const message =
        (typeof payload?.error === 'string' && payload.error.trim()) ||
        (typeof payload?.message === 'string' && payload.message.trim()) ||
        null;

      if (message) {
        return {
          ...error,
          message,
          details: payload,
        };
      }
    }

    const text = (await responseClone.text()).trim();
    if (text) {
      return {
        ...error,
        message: text,
      };
    }
  } catch {
    return error;
  }

  return error;
}

export async function invokeAppFunction<T = any>(functionName: string, options?: InvokeOptions): Promise<{ data: T | null; error: any }> {
  if (getAiAgentCallsDisabled() && isAiAgentFunction(functionName)) {
    throw new AiAgentCallsDisabledError(functionName);
  }

  const result = await supabase.functions.invoke(functionName, options as any);
  const enrichedError = await enrichFunctionError((result as { error?: any }).error);
  return {
    ...(result as { data: T | null; error: any }),
    error: enrichedError,
  };
}
