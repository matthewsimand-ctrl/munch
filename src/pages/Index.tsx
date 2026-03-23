import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowRight,
  Sparkles,
} from "lucide-react";
import { useStore } from "@/lib/store";
import { supabase } from "@/integrations/supabase/client";
import { MunchHeroLogo, MunchLogo } from "@/components/MunchLogo";
import { isNativeAppPlatform } from "@/lib/platform";
import AppPromoVideo from "@/components/AppPromoVideo";

const DESKTOP_BREAKPOINT = 768;

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
  const { data: { session } } = await supabase.auth.getSession();

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
  const [isDesktopViewport, setIsDesktopViewport] = useState(
    () => window.innerWidth >= DESKTOP_BREAKPOINT
  );
  const [loading, setLoading] = useState(false);
  const [hasSession, setHasSession] = useState(false);
  const [sessionResolved, setSessionResolved] = useState(false);
  const isNativeApp = isNativeAppPlatform();

  useEffect(() => {
    const onResize = () => {
      setIsDesktopViewport(window.innerWidth >= DESKTOP_BREAKPOINT);
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  useEffect(() => {
    const syncSession = async () => {
      const { data } = await supabase.auth.getSession();
      setHasSession(Boolean(data.session));
      setSessionResolved(true);
    };

    void syncSession();

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      setHasSession(Boolean(session));
      setSessionResolved(true);
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!sessionResolved) return;
    if (!isNativeApp && !hasSession && !isGuest) return;

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
  }, [completeOnboarding, hasSession, isGuest, isNativeApp, navigate, onboardingComplete, sessionResolved, setDisplayName]);

  const handleGetStarted = async () => {
    setLoading(true);
    try {
      const target = await resolveAppStartRoute({
        onboardingComplete,
        isGuest,
        completeOnboarding,
        setDisplayName,
      });
      navigate(target);
    } finally {
      setLoading(false);
    }
  };

  if (isNativeApp && !hasSession && !isGuest) {
    return (
      <div className="relative min-h-screen overflow-hidden bg-stone-950 text-white">
        <AppPromoVideo
          className="absolute inset-0"
          videoClassName="h-full w-full object-cover"
          posterClassName="hidden"
          priority
        />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(251,146,60,0.18),transparent_22%),linear-gradient(180deg,rgba(17,24,39,0.08)_0%,rgba(17,24,39,0.56)_50%,rgba(17,24,39,0.82)_100%)]" />

        <div className="relative z-10 flex min-h-screen flex-col justify-between px-6 pb-8 pt-10">
          <div className="flex justify-center">
            <div className="rounded-full border border-white/20 bg-black/20 px-4 py-2 backdrop-blur">
              <MunchLogo
                size={40}
                wordmarkClassName="text-xl font-bold tracking-tight text-white"
                subtitleClassName="hidden"
              />
            </div>
          </div>

          <div className="space-y-6">
            <div className="space-y-4">
              <div className="inline-flex items-center gap-2 rounded-full bg-white/14 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.24em] text-orange-100 backdrop-blur">
                Quick Tour
              </div>
              <h1
                className="max-w-sm text-4xl font-bold leading-tight text-white"
                style={{ fontFamily: "'Fraunces', Georgia, serif" }}
              >
                Your kitchen runs smoother with Munch.
              </h1>
              <p className="max-w-sm text-sm leading-6 text-white/78">
                Save recipes, swipe for ideas, plan meals, and cook with a step-by-step flow built for real kitchens.
              </p>
            </div>

            <div className="space-y-3">
              <button
                onClick={() => navigate(`/auth?mode=signup&next=${encodeURIComponent("/onboarding")}`)}
                className="flex w-full items-center justify-center gap-2 rounded-full px-5 py-4 text-sm font-bold text-white shadow-[0_20px_40px_rgba(249,115,22,0.28)] transition-all active:scale-[0.98]"
                style={{ background: "linear-gradient(135deg,#FB923C,#F97316,#EA580C)" }}
              >
                Get Started
                <ArrowRight size={16} />
              </button>

              <button
                onClick={() => navigate(`/auth?next=${encodeURIComponent("/onboarding")}`)}
                className="w-full rounded-full border border-white/22 bg-white/12 px-5 py-4 text-sm font-semibold text-white backdrop-blur transition-colors hover:bg-white/18"
              >
                I already have an account
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (isNativeApp) return null;

  return (
    <div
      className="min-h-screen text-stone-900"
      style={{
        background:
          "radial-gradient(circle at top left, rgba(251,146,60,0.18), transparent 26%), radial-gradient(circle at top right, rgba(251,191,36,0.16), transparent 20%), linear-gradient(180deg, #fffaf5 0%, #fff7ed 42%, #ffffff 100%)",
        fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif",
      }}
    >
      <header className="sticky top-0 z-20 border-b border-orange-100/70 backdrop-blur bg-white/78">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
          <MunchLogo
            size={48}
            subtitle="Cook smarter with the food you already have"
            wordmarkClassName="text-lg font-bold tracking-tight text-stone-900"
            subtitleClassName="text-xs text-stone-500"
          />

          <button
            onClick={() => void handleGetStarted()}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-full px-4 py-2.5 text-sm font-bold text-white transition-all hover:opacity-90 active:scale-95 disabled:opacity-70 sm:px-5"
            style={{ background: "linear-gradient(135deg,#FB923C,#F97316,#EA580C)", boxShadow: "0 10px 30px rgba(249,115,22,0.22)" }}
          >
            {loading ? "Opening..." : hasSession ? "Continue Cooking" : "Let's Cook"}
            <ArrowRight size={15} />
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-10 lg:px-8 lg:py-12">
        <section className="grid gap-8 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
          <div className="space-y-6">
            <div className="inline-flex items-center gap-2 rounded-full border border-orange-200 bg-white/80 px-3 py-1.5 text-xs font-semibold text-orange-700">
              <Sparkles size={13} />
              Save recipes, plan meals, and cook in one place
            </div>

            <div className="space-y-4">
              <h1
                className="text-4xl font-bold leading-[1.05] text-stone-900 sm:text-5xl xl:text-6xl"
                style={{ fontFamily: "'Fraunces', Georgia, serif" }}
              >
                Munch helps people turn ingredients, recipes, and routines into a cooking habit that sticks.
              </h1>
              <p className="max-w-2xl text-base leading-7 text-stone-600 sm:text-lg sm:leading-8">
                Start with a cleaner sign-in flow, then jump straight into recipes, pantry, grocery, meal planning, and cooking mode without the extra marketing screens in between.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                onClick={() => void handleGetStarted()}
                disabled={loading}
                className="inline-flex items-center gap-2 rounded-full px-6 py-3 text-sm font-bold text-white transition-all hover:opacity-90 active:scale-95 disabled:opacity-70"
                style={{ background: "linear-gradient(135deg,#FB923C,#F97316,#EA580C)", boxShadow: "0 12px 34px rgba(249,115,22,0.24)" }}
              >
                {loading ? "Opening..." : hasSession ? "Continue Cooking" : "Let's Cook"}
                <ArrowRight size={16} />
              </button>
            </div>

            <div className="grid max-w-2xl gap-3 sm:grid-cols-3">
              {[
                { value: "Cross-device kitchen", label: "Your saved recipes, pantry, and lists should follow you" },
                { value: "Faster loading", label: "A lighter entry screen and less heavy page-to-page churn" },
                { value: "Built for cooking", label: "Discovery, planning, and cooking in one workflow" },
              ].map((item) => (
                <div key={item.value} className="rounded-2xl border border-white/70 bg-white/80 p-4 shadow-[0_12px_40px_rgba(28,25,23,0.05)]">
                  <p className="text-sm font-bold text-stone-900">{item.value}</p>
                  <p className="text-xs text-stone-500 mt-2 leading-5">{item.label}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="relative">
            <div className="absolute inset-0 rounded-[2rem] bg-gradient-to-br from-orange-200/50 via-amber-100/40 to-transparent blur-3xl" />
            <div className="relative rounded-[2rem] border border-white/70 bg-white/85 p-5 shadow-[0_24px_80px_rgba(28,25,23,0.12)] sm:p-6">
              <div className="grid items-center gap-6">
                <div className="flex justify-center">
                  <MunchHeroLogo size={isDesktopViewport ? 340 : 260} />
                </div>
                <div className="rounded-[1.5rem] bg-gradient-to-br from-stone-900 via-orange-950 to-orange-700 p-6 text-white overflow-hidden">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs uppercase tracking-[0.24em] text-orange-200">Munch</p>
                      <p className="text-2xl font-bold mt-2" style={{ fontFamily: "'Fraunces', Georgia, serif" }}>A cleaner start into your kitchen</p>
                    </div>
                    <MunchLogo size={54} showWordmark={false} />
                  </div>

                  <div className="mt-6 grid gap-3 sm:grid-cols-2">
                    <div className="rounded-2xl bg-white/10 border border-white/10 p-4">
                      <p className="text-xs text-orange-100">Recipe import</p>
                      <p className="text-lg font-bold mt-1">Bring in recipes, save them, and keep them in your library</p>
                    </div>
                    <div className="rounded-2xl bg-white/10 border border-white/10 p-4">
                      <p className="text-xs text-orange-100">Plan and shop</p>
                      <p className="text-lg font-bold mt-1">Turn meals into a pantry-aware grocery workflow</p>
                    </div>
                  </div>

                  <div className="mt-5 rounded-2xl bg-white text-stone-900 p-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-orange-500">What is changing now</p>
                    <p className="text-sm text-stone-600 mt-2 leading-6">
                      This screen is intentionally lighter for now so the app gets you to sign in and into the product faster, while the richer walkthrough stays inside onboarding where it belongs.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
};

export default Index;
