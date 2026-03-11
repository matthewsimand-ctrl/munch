import type { Session } from "@supabase/supabase-js";

export function isPremiumSession(session: Session | null): boolean {
  const user = session?.user;
  if (!user) return false;

  const metadata = {
    ...(user.user_metadata || {}),
    ...(user.app_metadata || {}),
  } as Record<string, unknown>;

  return metadata.is_premium === true
    || metadata.premium === true
    || metadata.subscription_tier === "premium"
    || metadata.plan === "premium"
    || metadata.role === "premium";
}

