import { Suspense, lazy, useEffect, useState } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useStore } from "@/lib/store";
import { useCloudStoreSync } from "@/hooks/useCloudStoreSync";

import AppLayout from "@/components/AppLayout";
const Index = lazy(() => import("./pages/Index"));
const Onboarding = lazy(() => import("./pages/Onboarding"));
const Pantry = lazy(() => import("./pages/Pantry"));
const Swipe = lazy(() => import("./pages/Swipe"));
const SavedRecipes = lazy(() => import("./pages/SavedRecipes"));
const Cookbooks = lazy(() => import("./pages/Cookbooks"));
const CookbookDetails = lazy(() => import("./pages/CookbookDetails"));
const CookMode = lazy(() => import("./pages/CookMode"));
const GroceryList = lazy(() => import("./pages/GroceryList"));
const Groceries = lazy(() => import("./pages/Groceries"));
const MealPrep = lazy(() => import("./pages/MealPrep"));
const Settings = lazy(() => import("./pages/Settings"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Auth = lazy(() => import("./pages/Auth"));
const ChefProfile = lazy(() => import("./pages/ChefProfile"));
const Dictionary = lazy(() => import("./pages/Dictionary"));
const CookedHistory = lazy(() => import("./pages/CookedHistory"));
const Kitchens = lazy(() => import("./pages/Kitchens"));
const Notifications = lazy(() => import("./pages/Notifications"));
const KitchenInviteAccept = lazy(() => import("./pages/KitchenInviteAccept"));
const PremiumBenefits = lazy(() => import("./pages/PremiumBenefits"));
const NotFound = lazy(() => import("./pages/NotFound"));
const SpotlightTutorial = lazy(() => import("./components/SpotlightTutorial"));

const queryClient = new QueryClient();
const ENABLE_SPOTLIGHT_TUTORIAL = false;
const ENABLE_CLOUD_STORE_SYNC = false;
const ENABLE_ROUTE_PRELOAD = false;
const ENABLE_STARTUP_DEBUG =
  new URLSearchParams(window.location.search).has("debug-startup") ||
  window.localStorage.getItem("munch:debug-startup") === "1";

const ROUTE_PRELOADERS = [
  () => import("./pages/Dashboard"),
  () => import("./pages/Swipe"),
  () => import("./pages/SavedRecipes"),
  () => import("./pages/Pantry"),
  () => import("./pages/GroceryList"),
  () => import("./pages/Settings"),
  () => import("./pages/MealPrep"),
];

function recordStartupStage(stage: string, extra?: Record<string, string | number | boolean | null>) {
  const payload = {
    stage,
    at: new Date().toISOString(),
    path: window.location.pathname,
    ...(extra || {}),
  };

  const target = window as Window & {
    __munchStartupLog?: Array<Record<string, string | number | boolean | null>>;
    __munchLastStartupStage?: typeof payload;
  };

  target.__munchStartupLog = [...(target.__munchStartupLog || []).slice(-19), payload];
  target.__munchLastStartupStage = payload;

  try {
    window.sessionStorage.setItem("munch:last-startup-stage", JSON.stringify(payload));
    window.sessionStorage.setItem("munch:startup-log", JSON.stringify(target.__munchStartupLog));
  } catch {
    // Ignore storage issues in private or restricted environments.
  }
}

function RouteFallback() {
  return (
    <div className="flex min-h-[40vh] items-center justify-center px-4 py-12">
      <div className="rounded-2xl border border-orange-100 bg-white/90 px-5 py-4 shadow-[0_12px_40px_rgba(28,25,23,0.06)]">
        <p
          className="text-lg font-semibold text-stone-900"
          style={{ fontFamily: "'Fraunces', Georgia, serif" }}
        >
          Loading
        </p>
        <p className="mt-1 text-sm text-stone-500">Opening this page…</p>
      </div>
    </div>
  );
}

function StartupDebugOverlay() {
  const location = useLocation();
  const [entries, setEntries] = useState<Array<Record<string, string | number | boolean | null>>>([]);

  useEffect(() => {
    if (!ENABLE_STARTUP_DEBUG) return;
    const target = window as Window & {
      __munchStartupLog?: Array<Record<string, string | number | boolean | null>>;
    };
    setEntries([...(target.__munchStartupLog || [])]);
    const interval = window.setInterval(() => {
      setEntries([...(target.__munchStartupLog || [])]);
    }, 400);
    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!ENABLE_STARTUP_DEBUG) return;
    recordStartupStage("route-visible", { path: location.pathname });
  }, [location.pathname]);

  if (!ENABLE_STARTUP_DEBUG) return null;

  return (
    <div className="pointer-events-none fixed left-3 top-3 z-[9999] w-[min(26rem,calc(100vw-1.5rem))] rounded-xl bg-stone-950/90 p-3 text-[11px] text-stone-100 shadow-2xl">
      <p className="font-semibold text-orange-300">Munch startup debug</p>
      <div className="mt-2 space-y-1">
        {entries.slice(-8).reverse().map((entry, index) => (
          <div key={`${entry.at}-${index}`} className="rounded-md bg-white/5 px-2 py-1">
            <div className="font-medium text-white">{String(entry.stage)}</div>
            <div className="text-stone-300">{String(entry.path || "")}</div>
            <div className="text-stone-400">{String(entry.at || "")}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function AppRouteElement({ children }: { children: React.ReactNode }) {
  return <Suspense fallback={<RouteFallback />}>{children}</Suspense>;
}

function AppRoutes() {
  const {
    completeTutorial,
    showTutorial,
    setShowTutorial,
    storeOwnerUserId,
    setStoreOwnerUserId,
    resetStore,
  } = useStore();

  const handleTutorialComplete = () => {
    setShowTutorial(false);
    completeTutorial();
  };

  if (ENABLE_CLOUD_STORE_SYNC) {
    useCloudStoreSync();
  }

  useEffect(() => {
    recordStartupStage("app-routes-mounted");
  }, []);

  useEffect(() => {
    if (!ENABLE_SPOTLIGHT_TUTORIAL && showTutorial) {
      setShowTutorial(false);
    }
  }, [setShowTutorial, showTutorial]);

  useEffect(() => {
    const syncStoreOwner = (nextUserId: string | null) => {
      if (storeOwnerUserId && storeOwnerUserId !== nextUserId) {
        resetStore();
      }
      setStoreOwnerUserId(nextUserId);
    };

    void supabase.auth.getSession().then(({ data: { session } }) => {
      syncStoreOwner(session?.user?.id ?? null);
    });

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      syncStoreOwner(session?.user?.id ?? null);
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, [resetStore, setStoreOwnerUserId, storeOwnerUserId]);

  useEffect(() => {
    if (!ENABLE_ROUTE_PRELOAD) return;
    recordStartupStage("route-preload-scheduled");

    const preload = () => {
      recordStartupStage("route-preload-start");
      for (const load of ROUTE_PRELOADERS) {
        void load();
      }
      recordStartupStage("route-preload-complete");
    };

    if ("requestIdleCallback" in window) {
      const handle = window.requestIdleCallback(() => preload(), { timeout: 1200 });
      return () => window.cancelIdleCallback(handle);
    }

    const timeout = window.setTimeout(preload, 900);
    return () => window.clearTimeout(timeout);
  }, []);

  return (
    <>
      <Routes>
        <Route path="/" element={<AppRouteElement><Index /></AppRouteElement>} />
        <Route path="/auth" element={<AppRouteElement><Auth /></AppRouteElement>} />
        <Route path="/onboarding" element={<AppRouteElement><Onboarding /></AppRouteElement>} />
        <Route path="/invite/kitchen/:token" element={<AppRouteElement><KitchenInviteAccept /></AppRouteElement>} />
        <Route path="/cook/:id" element={<AppRouteElement><CookMode /></AppRouteElement>} />

        <Route element={<AppLayout />}>
          <Route path="/dashboard" element={<AppRouteElement><Dashboard /></AppRouteElement>} />
          <Route path="/swipe" element={<AppRouteElement><Swipe /></AppRouteElement>} />
          <Route path="/saved" element={<AppRouteElement><SavedRecipes /></AppRouteElement>} />
          <Route path="/cookbooks" element={<AppRouteElement><Cookbooks /></AppRouteElement>} />
          <Route path="/cookbooks/:id" element={<AppRouteElement><CookbookDetails /></AppRouteElement>} />
          <Route path="/let-me-cook" element={<Navigate to="/saved" replace />} />
          <Route path="/pantry" element={<AppRouteElement><Pantry /></AppRouteElement>} />
          <Route path="/grocery" element={<AppRouteElement><GroceryList /></AppRouteElement>} />
          <Route path="/groceries" element={<AppRouteElement><Groceries /></AppRouteElement>} />
          <Route path="/meal-prep" element={<AppRouteElement><MealPrep /></AppRouteElement>} />
          <Route path="/kitchens" element={<AppRouteElement><Kitchens /></AppRouteElement>} />
          <Route path="/notifications" element={<AppRouteElement><Notifications /></AppRouteElement>} />
          <Route path="/cooked-history" element={<AppRouteElement><CookedHistory /></AppRouteElement>} />
          <Route path="/settings" element={<AppRouteElement><Settings /></AppRouteElement>} />
          <Route path="/premium" element={<AppRouteElement><PremiumBenefits /></AppRouteElement>} />
          <Route path="/dictionary" element={<AppRouteElement><Dictionary /></AppRouteElement>} />
          <Route path="/chef/:userId" element={<AppRouteElement><ChefProfile /></AppRouteElement>} />
        </Route>

        <Route path="*" element={<AppRouteElement><NotFound /></AppRouteElement>} />
      </Routes>
      {ENABLE_SPOTLIGHT_TUTORIAL && showTutorial && (
        <Suspense fallback={null}>
          <SpotlightTutorial onComplete={handleTutorialComplete} />
        </Suspense>
      )}
      <StartupDebugOverlay />
    </>
  );
}

const App = () => {
  useEffect(() => {
    recordStartupStage("app-mounted");
  }, []);

  // ✅ Removed useMemo wrapper — memoizing JSX/component trees is an anti-pattern
  // and can cause reconciliation issues in production builds.
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AppRoutes />
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
