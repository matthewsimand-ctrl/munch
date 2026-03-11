import type { Session } from "@supabase/supabase-js";

const PREMIUM_OVERRIDE_KEY = "munch_premium_override";

export function getPremiumOverride(): boolean {
  if (typeof window === "undefined") return false;
  return window.localStorage.getItem(PREMIUM_OVERRIDE_KEY) === "true";
}

export function setPremiumOverride(enabled: boolean) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(PREMIUM_OVERRIDE_KEY, enabled ? "true" : "false");
  window.dispatchEvent(new Event("munch-premium-override-changed"));
}

export function isPremiumSession(session: Session | null): boolean {
  if (getPremiumOverride()) return true;

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
