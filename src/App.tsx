import React, { Suspense, useEffect, useRef, useState } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useStore } from "@/lib/store";
import { useCloudStoreSync } from "@/hooks/useCloudStoreSync";

import AppLayout from "@/components/AppLayout";
import Index from "./pages/Index";
import Onboarding from "./pages/Onboarding";
import Pantry from "./pages/Pantry";
import Swipe from "./pages/Swipe";
import SavedRecipes from "./pages/SavedRecipes";
import Cookbooks from "./pages/Cookbooks";
import CookbookDetails from "./pages/CookbookDetails";
import CookMode from "./pages/CookMode";
import GroceryList from "./pages/GroceryList";
import Groceries from "./pages/Groceries";
import MealPrep from "./pages/MealPrep";
import Settings from "./pages/Settings";
import Dashboard from "./pages/Dashboard";
import Auth from "./pages/Auth";
import ChefProfile from "./pages/ChefProfile";
import Dictionary from "./pages/Dictionary";
import CookedHistory from "./pages/CookedHistory";
import Kitchens from "./pages/Kitchens";
import Notifications from "./pages/Notifications";
import KitchenInviteAccept from "./pages/KitchenInviteAccept";
import PremiumBenefits from "./pages/PremiumBenefits";
import NotFound from "./pages/NotFound";
import SpotlightTutorial from "./components/SpotlightTutorial";

const queryClient = new QueryClient();
const ENABLE_SPOTLIGHT_TUTORIAL = false;
const ENABLE_CLOUD_STORE_SYNC = true;
const ENABLE_GLOBAL_FEEDBACK_PROVIDERS = true;
const ENABLE_STARTUP_DEBUG =
  new URLSearchParams(window.location.search).has("debug-startup") ||
  window.localStorage.getItem("munch:debug-startup") === "1";

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

function describeElement(element: Element | null) {
  if (!element) return "none";

  const htmlElement = element as HTMLElement;
  const tag = element.tagName.toLowerCase();
  const id = htmlElement.id ? `#${htmlElement.id}` : "";
  const className =
    typeof htmlElement.className === "string" && htmlElement.className.trim()
      ? `.${htmlElement.className.trim().split(/\s+/).slice(0, 3).join(".")}`
      : "";
  const pointerEvents = window.getComputedStyle(htmlElement).pointerEvents;
  return `${tag}${id}${className} [pointer-events:${pointerEvents}]`;
}

class AppErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { errorMessage: string | null }
> {
  state = { errorMessage: null };

  static getDerivedStateFromError(error: unknown) {
    return {
      errorMessage: error instanceof Error ? error.stack || error.message : String(error),
    };
  }

  componentDidCatch(error: unknown) {
    recordStartupStage("react-error-boundary", {
      message: error instanceof Error ? error.message : String(error),
    });
  }

  render() {
    if (this.state.errorMessage) {
      return (
        <div className="min-h-screen bg-[#fffaf5] p-6 text-stone-900">
          <div className="mx-auto max-w-3xl rounded-3xl border border-red-200 bg-white p-6 shadow-lg">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-red-500">App Crash Detected</p>
            <h1
              className="mt-3 text-3xl font-bold"
              style={{ fontFamily: "'Fraunces', Georgia, serif" }}
            >
              Munch hit a runtime error
            </h1>
            <pre className="mt-4 overflow-auto rounded-2xl bg-stone-950 p-4 text-xs text-stone-100">
              {this.state.errorMessage}
            </pre>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

function StartupDebugOverlay() {
  const location = useLocation();
  const [entries, setEntries] = useState<Array<Record<string, string | number | boolean | null>>>([]);
  const [lastPointerTarget, setLastPointerTarget] = useState("none");
  const [centerTarget, setCenterTarget] = useState("none");
  const [lastError, setLastError] = useState<string | null>(null);

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

  useEffect(() => {
    if (!ENABLE_STARTUP_DEBUG) return;

    const handleError = (event: ErrorEvent) => {
      const message = event.error?.stack || event.message || "Unknown runtime error";
      setLastError(message);
      recordStartupStage("window-error", { message: event.message || "Unknown runtime error" });
    };

    const handleRejection = (event: PromiseRejectionEvent) => {
      const reason =
        event.reason instanceof Error
          ? event.reason.stack || event.reason.message
          : String(event.reason);
      setLastError(reason);
      recordStartupStage("unhandled-rejection", { message: String(event.reason) });
    };

    const handlePointerDown = (event: PointerEvent) => {
      setLastPointerTarget(describeElement(event.target as Element | null));
    };

    const interval = window.setInterval(() => {
      const centerElement = document.elementFromPoint(window.innerWidth / 2, window.innerHeight / 2);
      setCenterTarget(describeElement(centerElement));
    }, 500);

    window.addEventListener("error", handleError);
    window.addEventListener("unhandledrejection", handleRejection);
    document.addEventListener("pointerdown", handlePointerDown, true);

    return () => {
      window.clearInterval(interval);
      window.removeEventListener("error", handleError);
      window.removeEventListener("unhandledrejection", handleRejection);
      document.removeEventListener("pointerdown", handlePointerDown, true);
    };
  }, []);

  if (!ENABLE_STARTUP_DEBUG) return null;

  return (
    <div className="pointer-events-none fixed left-3 top-3 z-[9999] w-[min(28rem,calc(100vw-1.5rem))] rounded-xl bg-stone-950/90 p-3 text-[11px] text-stone-100 shadow-2xl">
      <p className="font-semibold text-orange-300">Munch startup debug</p>
      <div className="mt-2 rounded-md bg-white/5 px-2 py-1">
        <div className="font-medium text-white">Center element</div>
        <div className="text-stone-300">{centerTarget}</div>
      </div>
      <div className="mt-2 rounded-md bg-white/5 px-2 py-1">
        <div className="font-medium text-white">Last pointer target</div>
        <div className="text-stone-300">{lastPointerTarget}</div>
      </div>
      {lastError ? (
        <div className="mt-2 rounded-md bg-red-500/15 px-2 py-1">
          <div className="font-medium text-red-200">Last error</div>
          <div className="whitespace-pre-wrap text-red-100">{lastError}</div>
        </div>
      ) : null}
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

  // ✅ FIX: Use refs for resetStore and storeOwnerUserId so this effect only runs
  // ONCE on mount. The original code had storeOwnerUserId in the dep array, which
  // caused the effect to tear down + re-run every time auth resolved (getSession →
  // setStoreOwnerUserId → storeOwnerUserId changes → effect re-runs → new listener
  // registered → listener fires → setStoreOwnerUserId → loop). In production this
  // manifested as rapid re-renders that froze the browser.
  const resetStoreRef = useRef(resetStore);
  const setStoreOwnerUserIdRef = useRef(setStoreOwnerUserId);
  const storeOwnerUserIdRef = useRef(storeOwnerUserId);

  useEffect(() => {
    resetStoreRef.current = resetStore;
  }, [resetStore]);

  useEffect(() => {
    setStoreOwnerUserIdRef.current = setStoreOwnerUserId;
  }, [setStoreOwnerUserId]);

  useEffect(() => {
    storeOwnerUserIdRef.current = storeOwnerUserId;
  }, [storeOwnerUserId]);

  useEffect(() => {
    // Runs only once on mount — reads current values via refs, not stale closure deps.
    const syncStoreOwner = (nextUserId: string | null) => {
      if (storeOwnerUserIdRef.current && storeOwnerUserIdRef.current !== nextUserId) {
        resetStoreRef.current();
      }
      storeOwnerUserIdRef.current = nextUserId;
      setStoreOwnerUserIdRef.current(nextUserId);
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
  }, []); // ← empty deps: mount/unmount only

  return (
    <>
      <Routes>
        <Route path="/" element={<Index />} />
        <Route path="/auth" element={<Auth />} />
        <Route path="/onboarding" element={<Onboarding />} />
        <Route path="/invite/kitchen/:token" element={<KitchenInviteAccept />} />
        <Route path="/cook/:id" element={<CookMode />} />

        <Route element={<AppLayout />}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/swipe" element={<Swipe />} />
          <Route path="/saved" element={<SavedRecipes />} />
          <Route path="/cookbooks" element={<Cookbooks />} />
          <Route path="/cookbooks/:id" element={<CookbookDetails />} />
          <Route path="/let-me-cook" element={<Navigate to="/saved" replace />} />
          <Route path="/pantry" element={<Pantry />} />
          <Route path="/grocery" element={<GroceryList />} />
          <Route path="/groceries" element={<Groceries />} />
          <Route path="/meal-prep" element={<MealPrep />} />
          <Route path="/kitchens" element={<Kitchens />} />
          <Route path="/notifications" element={<Notifications />} />
          <Route path="/cooked-history" element={<CookedHistory />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/premium" element={<PremiumBenefits />} />
          <Route path="/dictionary" element={<Dictionary />} />
          <Route path="/chef/:userId" element={<ChefProfile />} />
        </Route>

        <Route path="*" element={<NotFound />} />
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

  // ✅ Removed useMemo — memoizing JSX trees is an anti-pattern and
  // can cause reconciliation failures in production builds.
  return (
    <AppErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          {ENABLE_GLOBAL_FEEDBACK_PROVIDERS ? (
            <>
              <Toaster />
              <Sonner />
            </>
          ) : null}
          <BrowserRouter>
            <AppRoutes />
          </BrowserRouter>
        </TooltipProvider>
      </QueryClientProvider>
    </AppErrorBoundary>
  );
};

export default App;
