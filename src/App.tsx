import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
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
import MealPrep from "./pages/MealPrep";
import Settings from "./pages/Settings";
import Dashboard from "./pages/Dashboard";
import LetMeCook from "./pages/LetMeCook";
import Auth from "./pages/Auth";
import ChefProfile from "./pages/ChefProfile";
import Dictionary from "./pages/Dictionary";
import CookedHistory from "./pages/CookedHistory";
import Kitchens from "./pages/Kitchens";
import NotFound from "./pages/NotFound";
import SpotlightTutorial from "./components/SpotlightTutorial";

const queryClient = new QueryClient();

function AppRoutes() {
  const { completeTutorial, showTutorial, setShowTutorial } = useStore();

  const handleTutorialComplete = () => {
    setShowTutorial(false);
    completeTutorial();
  };

  return (
    <>
      <Routes>
        {/* Full-screen flows — no sidebar */}
        <Route path="/" element={<Index />} />
        <Route path="/auth" element={<Auth />} />
        <Route path="/onboarding" element={<Onboarding />} />
        <Route path="/cook/:id" element={<CookMode />} />

        {/* Main app — sidebar on desktop, bottom nav on mobile */}
        <Route element={<AppLayout />}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/swipe" element={<Swipe />} />
          <Route path="/saved" element={<SavedRecipes />} />
          <Route path="/cookbooks" element={<Cookbooks />} />
          <Route path="/cookbooks/:id" element={<CookbookDetails />} />
          <Route path="/let-me-cook" element={<LetMeCook />} />
          <Route path="/pantry" element={<Pantry />} />
          <Route path="/grocery" element={<GroceryList />} />
          <Route path="/meal-prep" element={<MealPrep />} />
          <Route path="/kitchens" element={<Kitchens />} />
          <Route path="/cooked-history" element={<CookedHistory />} />
          <Route path="/settings" element={<Settings />} />
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
