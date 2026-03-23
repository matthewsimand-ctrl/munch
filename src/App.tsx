import { Suspense, lazy, useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useStore } from "@/lib/store";
import { useCloudStoreSync } from "@/hooks/useCloudStoreSync";

const AppLayout = lazy(() => import("@/components/AppLayout"));
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

function RouteFallback() {
  return (
    <div
      className="min-h-screen flex items-center justify-center bg-[#FFFAF5] px-4"
      style={{ fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif" }}
    >
      <div className="text-center">
        <p
          className="text-2xl font-semibold text-stone-900"
          style={{ fontFamily: "'Fraunces', Georgia, serif" }}
        >
          Loading Munch
        </p>
        <p className="mt-2 text-sm text-stone-500">Just a moment while we open your kitchen.</p>
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

  useCloudStoreSync();

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

  return (
    <>
      <Suspense fallback={<RouteFallback />}>
        <Routes>
          {/* Full-screen flows — no sidebar */}
          <Route path="/" element={<Index />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/onboarding" element={<Onboarding />} />
          <Route path="/invite/kitchen/:token" element={<KitchenInviteAccept />} />
          <Route path="/cook/:id" element={<CookMode />} />

          {/* Main app — sidebar on desktop, bottom nav on mobile */}
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
          <SpotlightTutorial onComplete={handleTutorialComplete} />
        )}
      </Suspense>
    </>
  );
}

const App = () => (
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

export default App;
