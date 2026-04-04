import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { LoaderCircle } from "lucide-react";
import { useStore } from "@/lib/store";
import { supabase } from "@/integrations/supabase/client";
import { MunchLogo } from "@/components/MunchLogo";

async function resolveAppStartRoute({
  onboardingComplete,
  isGuest,
  completeOnboarding,
  setDisplayName,
}: {
  onboardingComplete: boolean;
  isGuest: boolean;
  completeOnboarding: () => void;
  setDisplayName: (name: string) => void;
}) {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session && !isGuest) {
    return "/auth";
  }

  if (session && !onboardingComplete) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("display_name, username")
      .eq("user_id", session.user.id)
      .maybeSingle();

    if (profile?.display_name && (profile as any)?.username) {
      setDisplayName(profile.display_name);
      completeOnboarding();
      return "/dashboard";
    }
  }

  if (session) {
    const { data: profileCheck } = await supabase
      .from("profiles")
      .select("display_name, username")
      .eq("user_id", session.user.id)
      .maybeSingle();

    if (profileCheck?.display_name && (profileCheck as any)?.username) {
      return "/dashboard";
    }

    return "/onboarding";
  }

  if (isGuest) {
    return onboardingComplete ? "/dashboard" : "/onboarding";
  }

  return "/onboarding";
}

const Index = () => {
  const navigate = useNavigate();
  const { onboardingComplete, isGuest, completeOnboarding, setDisplayName } = useStore();
  const [sessionResolved, setSessionResolved] = useState(false);

  useEffect(() => {
    const syncSession = async () => {
      await supabase.auth.getSession();
      setSessionResolved(true);
    };

    void syncSession();

    const { data: authListener } = supabase.auth.onAuthStateChange(() => {
      setSessionResolved(true);
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!sessionResolved) return;

    const redirectToApp = async () => {
      const target = await resolveAppStartRoute({
        onboardingComplete,
        isGuest,
        completeOnboarding,
        setDisplayName,
      });
      navigate(target, { replace: true });
    };

    void redirectToApp();
  }, [completeOnboarding, isGuest, navigate, onboardingComplete, sessionResolved, setDisplayName]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top,rgba(251,146,60,0.18),transparent_24%),linear-gradient(180deg,#fffaf5_0%,#fff7ed_52%,#ffffff_100%)] px-6">
      <div className="flex w-full max-w-sm flex-col items-center gap-5 rounded-[2rem] border border-white/80 bg-white/92 px-8 py-10 text-center shadow-[0_24px_80px_rgba(28,25,23,0.10)] backdrop-blur">
        <MunchLogo className="justify-center" size={64} wordmarkClassName="font-display text-3xl font-semibold text-stone-900" />
        <div className="space-y-2">
          <p className="text-sm font-semibold text-stone-800">Opening Munch</p>
          <p className="text-sm leading-6 text-stone-500">
            Routing you to the right screen.
          </p>
        </div>
        <LoaderCircle className="h-5 w-5 animate-spin text-orange-500" aria-hidden="true" />
      </div>
    </div>
  );
};

export default Index;
