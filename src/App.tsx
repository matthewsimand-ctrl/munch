import { useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useStore } from "@/lib/store";
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
      {showTutorial && (
        <SpotlightTutorial onComplete={handleTutorialComplete} />
      )}
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
