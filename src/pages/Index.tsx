import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowRight,
  BookOpen,
  CalendarDays,
  Crown,
  Package,
  ShoppingCart,
  Sparkles,
  TimerReset,
  Trophy,
  WandSparkles,
} from "lucide-react";
import { useStore } from "@/lib/store";
import { supabase } from "@/integrations/supabase/client";
import { MunchHeroLogo, MunchLogo } from "@/components/MunchLogo";
import { isNativeAppPlatform } from "@/lib/platform";
import AppPromoVideo from "@/components/AppPromoVideo";

const DESKTOP_BREAKPOINT = 768;

const FEATURE_CARDS = [
  {
    icon: WandSparkles,
    title: "AI recipe guidance",
    body: "Generate ideas from what you already have, import recipes from the web, and get help turning inspiration into a cookable plan.",
  },
  {
    icon: TimerReset,
    title: "Hands-free cooking flow",
    body: "Cook with step-by-step guidance, timers, voice commands, and a focused flow built to keep you moving in the kitchen.",
  },
  {
    icon: CalendarDays,
    title: "Meal planning that connects",
    body: "Plan meals, carry ingredients into grocery lists, and launch straight into Let Me Cook when it is time to make dinner.",
  },
  {
    icon: Trophy,
    title: "Gamified progress",
    body: "Earn XP, build streaks, level up your chef profile, and turn everyday cooking into something that feels rewarding.",
  },
];

const DETAIL_ITEMS = [
  { icon: Package, label: "Pantry tracking", text: "Keep tabs on what is in stock, import receipts or grocery lists, and match recipes to ingredients you already own." },
  { icon: ShoppingCart, label: "Smart grocery list", text: "Generate lists from recipes and plans, estimate totals, and export a clean checklist for Notes." },
  { icon: BookOpen, label: "Recipe library", text: "Save favorites, organize cookbooks, and bring in recipes from URLs without messy ad-heavy pages." },
  { icon: Sparkles, label: "Premium intelligence", text: "Unlock savings estimates, nutrition insights, and deeper AI assistance across the cooking experience." },
];

const PRICING = [
  {
    name: "Free",
    price: "$0",
    subtitle: "Great for getting started",
    points: [
      "Save recipes and build your pantry",
      "Use meal planning and grocery workflows",
      "Cook with guided steps and timers",
    ],
  },
  {
    name: "Premium",
    price: "$7.99 / month",
    subtitle: "For cooks who want smarter insights",
    points: [
      "Nutrition facts across recipes and meals",
      "AI savings estimates and premium helpers",
      "Enhanced import and planning experiences",
    ],
    featured: true,
  },
];

const SECTION_TABS = [
  { href: "#overview", label: "Overview" },
  { href: "#features", label: "Features" },
  { href: "#story", label: "Story" },
  { href: "#pricing", label: "Pricing" },
];

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

          <nav className="hidden lg:flex items-center gap-2 rounded-full border border-stone-200 bg-white/90 px-2 py-2 shadow-[0_10px_30px_rgba(28,25,23,0.05)]">
            {SECTION_TABS.map((tab) => (
              <a
                key={tab.href}
                href={tab.href}
                className="rounded-full px-4 py-2 text-sm font-semibold text-stone-600 transition-colors hover:bg-orange-50 hover:text-orange-600"
              >
                {tab.label}
              </a>
            ))}
          </nav>

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

      <main className="mx-auto max-w-7xl space-y-14 px-4 py-8 sm:px-6 sm:py-10 lg:px-8 lg:py-12">
        <section id="overview" className="grid gap-8 scroll-mt-28 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
          <div className="space-y-6">
            <div className="inline-flex items-center gap-2 rounded-full border border-orange-200 bg-white/80 px-3 py-1.5 text-xs font-semibold text-orange-700">
              <Sparkles size={13} />
              Your kitchen, pantry, plan, and cook flow in one place
            </div>

            <div className="space-y-4">
              <h1
                className="text-4xl font-bold leading-[1.05] text-stone-900 sm:text-5xl xl:text-6xl"
                style={{ fontFamily: "'Fraunces', Georgia, serif" }}
              >
                Munch helps people turn ingredients, recipes, and routines into a cooking habit that sticks.
              </h1>
              <p className="max-w-2xl text-base leading-7 text-stone-600 sm:text-lg sm:leading-8">
                It started as a better way to answer one daily question: what can I actually make right now? From there, Munch grew into a full cooking companion that helps you discover recipes, plan meals, manage your pantry, shop faster, and enjoy the cooking process.
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
              <a
                href="#pricing"
                className="inline-flex items-center gap-2 rounded-full border border-stone-200 bg-white px-6 py-3 text-sm font-bold text-stone-700 transition-colors hover:border-orange-200 hover:text-orange-600"
              >
                See pricing
              </a>
            </div>

            <div className="grid max-w-2xl gap-3 sm:grid-cols-3">
              {[
                { value: "Recipe to stove", label: "Discovery, planning, and cooking in one workflow" },
                { value: "AI + utility", label: "Smart help without losing practical control" },
                { value: "Built for habit", label: "Progress, streaks, XP, and momentum" },
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
                      <p className="text-xs uppercase tracking-[0.24em] text-orange-200">Let Me Cook</p>
                      <p className="text-2xl font-bold mt-2" style={{ fontFamily: "'Fraunces', Georgia, serif" }}>A calmer way to cook</p>
                    </div>
                    <MunchLogo size={54} showWordmark={false} />
                  </div>

                  <div className="mt-6 grid gap-3 sm:grid-cols-2">
                    <div className="rounded-2xl bg-white/10 border border-white/10 p-4">
                      <p className="text-xs text-orange-100">Voice-ready steps</p>
                      <p className="text-lg font-bold mt-1">Hands-free prompts, timers, and pacing</p>
                    </div>
                    <div className="rounded-2xl bg-white/10 border border-white/10 p-4">
                      <p className="text-xs text-orange-100">Session rewards</p>
                      <p className="text-lg font-bold mt-1">XP, streaks, and progress as you cook</p>
                    </div>
                  </div>

                  <div className="mt-5 rounded-2xl bg-white text-stone-900 p-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-orange-500">Why it feels different</p>
                    <p className="text-sm text-stone-600 mt-2 leading-6">
                      Munch is not just a recipe archive. It connects what is in your pantry, what is on your plan, and what is happening at the stove so the product feels like a cooking companion instead of a pile of disconnected tools.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="features" className="grid gap-5 scroll-mt-28 lg:grid-cols-2">
          {FEATURE_CARDS.map(({ icon: Icon, title, body }) => (
            <article key={title} className="rounded-[1.75rem] border border-white/70 bg-white/85 p-6 shadow-[0_18px_60px_rgba(28,25,23,0.06)]">
              <div className="w-11 h-11 rounded-2xl bg-orange-50 text-orange-500 flex items-center justify-center">
                <Icon size={20} />
              </div>
              <h2 className="text-2xl font-bold text-stone-900 mt-5" style={{ fontFamily: "'Fraunces', Georgia, serif" }}>
                {title}
              </h2>
              <p className="text-sm text-stone-600 mt-3 leading-7">{body}</p>
            </article>
          ))}
        </section>

        <section id="story" className="grid gap-8 scroll-mt-28 lg:grid-cols-[0.85fr_1.15fr] lg:items-start">
          <div className="rounded-[2rem] border border-orange-100 bg-gradient-to-br from-orange-50 via-white to-amber-50 p-7 shadow-[0_18px_60px_rgba(28,25,23,0.06)]">
            <p className="text-xs font-bold uppercase tracking-[0.28em] text-orange-500">The story</p>
            <h2 className="text-4xl font-bold text-stone-900 mt-3 leading-tight" style={{ fontFamily: "'Fraunces', Georgia, serif" }}>
              Built for the messy middle between inspiration and dinner.
            </h2>
            <p className="text-sm text-stone-600 mt-4 leading-7">
              Most cooking apps are good at one thing: storing recipes, planning a week, or helping at the stove. Munch is designed to connect the entire loop so the path from “I have chicken, rice, and spinach” to “Dinner is done” feels shorter, clearer, and more fun.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            {DETAIL_ITEMS.map(({ icon: Icon, label, text }) => (
              <article key={label} className="rounded-[1.5rem] border border-stone-200/70 bg-white p-5 shadow-[0_14px_40px_rgba(28,25,23,0.05)]">
                <div className="w-10 h-10 rounded-xl bg-stone-900 text-white flex items-center justify-center">
                  <Icon size={18} />
                </div>
                <h3 className="text-lg font-bold text-stone-900 mt-4">{label}</h3>
                <p className="text-sm text-stone-600 mt-2 leading-6">{text}</p>
              </article>
            ))}
          </div>
        </section>

        <section id="pricing" className="rounded-[2rem] border border-stone-200/80 bg-white/90 p-8 shadow-[0_18px_60px_rgba(28,25,23,0.06)] scroll-mt-28">
          <div className="flex items-end justify-between gap-6 flex-wrap">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.28em] text-orange-500">Pricing</p>
              <h2 className="text-4xl font-bold text-stone-900 mt-3" style={{ fontFamily: "'Fraunces', Georgia, serif" }}>
                Start free, upgrade when you want deeper insights.
              </h2>
              <p className="text-sm text-stone-600 mt-3 max-w-2xl leading-7">
                Munch is approachable from day one, and premium unlocks the AI-powered nutrition, savings, and enhanced planning features that make the experience even more useful.
              </p>
            </div>
            <button
              onClick={() => void handleGetStarted()}
              disabled={loading}
              className="inline-flex items-center gap-2 rounded-full border border-orange-200 bg-orange-50 px-5 py-2.5 text-sm font-bold text-orange-700 transition-colors hover:bg-orange-100 disabled:opacity-70"
            >
              {loading ? "Opening..." : hasSession ? "Continue Cooking" : "Let's Cook"}
              <ArrowRight size={15} />
            </button>
          </div>

          <div className="grid md:grid-cols-2 gap-5 mt-8">
            {PRICING.map((plan) => (
              <article
                key={plan.name}
                className={`rounded-[1.5rem] border p-6 ${plan.featured ? "border-orange-200 bg-gradient-to-br from-orange-50 to-amber-50" : "border-stone-200 bg-stone-50/60"}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-bold text-stone-900">{plan.name}</p>
                    <p className="text-3xl font-bold text-stone-900 mt-2" style={{ fontFamily: "'Fraunces', Georgia, serif" }}>
                      {plan.price}
                    </p>
                    <p className="text-sm text-stone-500 mt-2">{plan.subtitle}</p>
                  </div>
                  {plan.featured && (
                    <div className="inline-flex items-center gap-1 rounded-full bg-white px-3 py-1 text-xs font-bold text-orange-600 border border-orange-200">
                      <Crown size={12} />
                      Premium
                    </div>
                  )}
                </div>

                <div className="space-y-3 mt-6">
                  {plan.points.map((point) => (
                    <div key={point} className="flex items-start gap-3">
                      <div className="w-6 h-6 rounded-full bg-white border border-stone-200 flex items-center justify-center shrink-0 mt-0.5">
                        <Sparkles size={12} className="text-orange-500" />
                      </div>
                      <p className="text-sm text-stone-600 leading-6">{point}</p>
                    </div>
                  ))}
                </div>
              </article>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
};

export default Index;
