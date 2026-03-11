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

    return () => {
      mounted = false;
      authListener.subscription.unsubscribe();
    };
  }, []);

  return { isPremium, loading };
}
