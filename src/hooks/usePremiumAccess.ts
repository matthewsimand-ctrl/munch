import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { isPremiumSession } from "@/lib/premium";

export function usePremiumAccess() {
  const [isPremium, setIsPremium] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const syncPremium = async () => {
      const { data } = await supabase.auth.getSession();
      if (!mounted) return;
      setIsPremium(isPremiumSession(data.session));
      setLoading(false);
    };

    void syncPremium();

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsPremium(isPremiumSession(session));
      setLoading(false);
    });

    const handlePremiumOverrideChange = () => {
      void syncPremium();
    };

    window.addEventListener("storage", handlePremiumOverrideChange);
    window.addEventListener("munch-premium-override-changed", handlePremiumOverrideChange);

    return () => {
      mounted = false;
      authListener.subscription.unsubscribe();
      window.removeEventListener("storage", handlePremiumOverrideChange);
      window.removeEventListener("munch-premium-override-changed", handlePremiumOverrideChange);
    };
  }, []);

  return { isPremium, loading };
}
