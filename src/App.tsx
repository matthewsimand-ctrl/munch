import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { useStore } from "@/lib/store";
import Index from "./pages/Index";
import Onboarding from "./pages/Onboarding";
import Pantry from "./pages/Pantry";
import Swipe from "./pages/Swipe";
import SavedRecipes from "./pages/SavedRecipes";
import CookMode from "./pages/CookMode";
import GroceryList from "./pages/GroceryList";
import MealPrep from "./pages/MealPrep";
import Settings from "./pages/Settings";
import Dashboard from "./pages/Dashboard";
import Auth from "./pages/Auth";
import ChefProfile from "./pages/ChefProfile";
import NotFound from "./pages/NotFound";
import SpotlightTutorial from "./components/SpotlightTutorial";

const queryClient = new QueryClient();

function AppRoutes() {
  const { tutorialComplete, completeTutorial, showTutorial, setShowTutorial } = useStore();

  const handleTutorialComplete = () => {
    setShowTutorial(false);
    completeTutorial();
  };

  return (
    <>
      <Routes>
        <Route path="/" element={<Index />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/auth" element={<Auth />} />
        <Route path="/onboarding" element={<Onboarding />} />
        <Route path="/pantry" element={<Pantry />} />
        <Route path="/swipe" element={<Swipe />} />
        <Route path="/saved" element={<SavedRecipes />} />
        <Route path="/cook/:id" element={<CookMode />} />
        <Route path="/grocery" element={<GroceryList />} />
        <Route path="/meal-prep" element={<MealPrep />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/chef/:userId" element={<ChefProfile />} />
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
