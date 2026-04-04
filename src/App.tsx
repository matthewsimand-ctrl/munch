import { Suspense, lazy, useEffect, useRef } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useStore } from "@/lib/store";
import AppLayout from "@/components/AppLayout";
import { useCloudStoreSync } from "@/hooks/useCloudStoreSync";

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

const queryClient = new QueryClient();

function RouteElement({ children }: { children: React.ReactNode }) {
  return <Suspense fallback={null}>{children}</Suspense>;
}

function AppRoutes() {
  const {
    storeOwnerUserId,
    setStoreOwnerUserId,
    resetStore,
    showTutorial,
    setShowTutorial,
  } = useStore();

  const resetStoreRef = useRef(resetStore);
  const setStoreOwnerUserIdRef = useRef(setStoreOwnerUserId);
  const storeOwnerUserIdRef = useRef(storeOwnerUserId);
  useCloudStoreSync();

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
    const syncStoreOwner = (nextUserId: string | null, reason: "initial" | "auth-change" | "signed-out") => {
      const switchedUsers = Boolean(
        storeOwnerUserIdRef.current &&
        nextUserId &&
        storeOwnerUserIdRef.current !== nextUserId
      );
      const explicitSignOut = reason === "signed-out" && Boolean(storeOwnerUserIdRef.current);

      if (switchedUsers || explicitSignOut) {
        resetStoreRef.current();
      }

      storeOwnerUserIdRef.current = nextUserId;
      setStoreOwnerUserIdRef.current(nextUserId);
    };

    void supabase.auth.getSession().then(({ data: { session } }) => {
      syncStoreOwner(session?.user?.id ?? null, "initial");
    });

    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      syncStoreOwner(
        session?.user?.id ?? null,
        event === "SIGNED_OUT" ? "signed-out" : "auth-change"
      );
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (showTutorial) {
      setShowTutorial(false);
    }
  }, [setShowTutorial, showTutorial]);

  return (
    <Routes>
      <Route path="/" element={<RouteElement><Index /></RouteElement>} />
      <Route path="/auth" element={<RouteElement><Auth /></RouteElement>} />
      <Route path="/onboarding" element={<RouteElement><Onboarding /></RouteElement>} />
      <Route path="/invite/kitchen/:token" element={<RouteElement><KitchenInviteAccept /></RouteElement>} />
      <Route path="/cook/:id" element={<RouteElement><CookMode /></RouteElement>} />

      <Route element={<AppLayout />}>
        <Route path="/dashboard" element={<RouteElement><Dashboard /></RouteElement>} />
        <Route path="/swipe" element={<RouteElement><Swipe /></RouteElement>} />
        <Route path="/saved" element={<RouteElement><SavedRecipes /></RouteElement>} />
        <Route path="/cookbooks" element={<RouteElement><Cookbooks /></RouteElement>} />
        <Route path="/cookbooks/:id" element={<RouteElement><CookbookDetails /></RouteElement>} />
        <Route path="/let-me-cook" element={<Navigate to="/saved" replace />} />
        <Route path="/pantry" element={<RouteElement><Pantry /></RouteElement>} />
        <Route path="/grocery" element={<RouteElement><GroceryList /></RouteElement>} />
        <Route path="/groceries" element={<RouteElement><Groceries /></RouteElement>} />
        <Route path="/meal-prep" element={<RouteElement><MealPrep /></RouteElement>} />
        <Route path="/kitchens" element={<RouteElement><Kitchens /></RouteElement>} />
        <Route path="/notifications" element={<RouteElement><Notifications /></RouteElement>} />
        <Route path="/cooked-history" element={<RouteElement><CookedHistory /></RouteElement>} />
        <Route path="/settings" element={<RouteElement><Settings /></RouteElement>} />
        <Route path="/premium" element={<RouteElement><PremiumBenefits /></RouteElement>} />
        <Route path="/dictionary" element={<RouteElement><Dictionary /></RouteElement>} />
        <Route path="/chef/:userId" element={<RouteElement><ChefProfile /></RouteElement>} />
      </Route>

      <Route path="*" element={<RouteElement><NotFound /></RouteElement>} />
    </Routes>
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
