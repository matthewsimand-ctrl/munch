import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Play, ChefHat, Clock, Users, Grid3X3, List } from "lucide-react";
import { useStore } from "@/lib/store";
import { toast } from "sonner";
import { useDbRecipes } from "@/hooks/useDbRecipes";
import { useCurrentMealPlan } from "@/hooks/useCurrentMealPlan";
import { Button } from "@/components/ui/button";
import type { Recipe } from "@/data/recipes";
import { normalizeRecipe } from "@/lib/normalizeRecipe";

export default function LetMeCook() {
  const navigate = useNavigate();
  const { likedRecipes, savedApiRecipes, likeRecipe } = useStore();
  const [view, setView] = useState<"grid" | "list">("grid");
  const { data: dbRecipes = [] } = useDbRecipes();
  const { meal: currentPlannedMeal, nextMeal, loading: currentMealLoading } = useCurrentMealPlan();


  const handleStartPlannedMeal = () => {
    const plannedMeal = nextMeal || currentPlannedMeal;
    if (!plannedMeal) return;

    const recipeId = plannedMeal.recipe_id;
    const hasRecipeLocally = Boolean(dbRecipes.find((r) => r.id === recipeId) || savedApiRecipes[recipeId]);

    if (!hasRecipeLocally && plannedMeal.recipe_data) {
      likeRecipe(recipeId, plannedMeal.recipe_data);
    }

    const canStart = hasRecipeLocally || Boolean(plannedMeal.recipe_data);
    if (!canStart) {
      toast.info("We couldn't load this planned recipe yet. Save it first, then try again.");
      return;
    }

    navigate(`/cook/${recipeId}`);
  };

  const recipes = useMemo(() => likedRecipes.map((id) => {
    const dbRecipe = dbRecipes.find((r) => r.id === id);
    if (dbRecipe) return normalizeRecipe(dbRecipe, id);
    const apiRecipe = savedApiRecipes[id];
    return apiRecipe ? normalizeRecipe(apiRecipe, id) : null;
  }).filter(Boolean) as Recipe[], [likedRecipes, dbRecipes, savedApiRecipes]);

  return (
    <div className="min-h-full bg-gray-50">
      <div className="bg-white border-b border-gray-100 px-6 py-5">
        <div className="max-w-5xl mx-auto">
          <h1 className="text-2xl font-bold text-gray-900">Let me Cook</h1>
          <p className="text-sm text-gray-500 mt-1">Pick one of your saved recipes to jump straight into cook mode.</p>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-6">
        <div className="bg-orange-50 border border-orange-100 rounded-2xl p-4 mb-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold text-orange-600 uppercase tracking-wide">From Meal Prep · Up next</p>
              <h2 className="text-base font-bold text-gray-900 mt-1">
                {currentMealLoading
                  ? "Loading your planned meal..."
                  : nextMeal
                    ? nextMeal.recipe_name
                    : "No meals are planned for this week"}
              </h2>
            </div>
            {(nextMeal || currentPlannedMeal) && (
              <Button size="sm" onClick={handleStartPlannedMeal}>
                <Play className="h-3.5 w-3.5 mr-1.5" /> Start Planned Meal
              </Button>
            )}
          </div>
        </div>

        {recipes.length === 0 ? (
          <div className="bg-white border border-gray-100 rounded-2xl p-10 text-center shadow-sm">
            <ChefHat className="h-10 w-10 mx-auto text-gray-300" />
            <h2 className="text-lg font-semibold text-gray-900 mt-3">No saved recipes yet</h2>
            <p className="text-sm text-gray-500 mt-1 mb-4">Save a recipe first, then come back here to start cooking.</p>
            <Button onClick={() => navigate("/swipe")}>Explore recipes</Button>
          </div>
        ) : (
          <>
            <div className="flex justify-end mb-4">
              <button
                onClick={() => setView(view === "grid" ? "list" : "grid")}
                className="w-9 h-9 rounded-xl bg-white border border-stone-200 flex items-center justify-center text-stone-500 hover:border-orange-300 hover:text-orange-500 transition-colors"
                aria-label={`Switch to ${view === "grid" ? "list" : "grid"} view`}
              >
                {view === "grid" ? <List size={16} /> : <Grid3X3 size={16} />}
              </button>
            </div>
            <div className={view === "grid" ? "grid grid-cols-1 md:grid-cols-2 gap-4" : "space-y-3"}>
            {recipes.map((recipe) => (
              <div
                key={recipe.id}
                className={`bg-white border border-gray-100 rounded-2xl p-4 shadow-sm flex gap-4 ${view === "list" ? "items-center" : ""}`}
              >
                <img src={recipe.image} alt={recipe.name} className={`${view === "grid" ? "w-24 h-24" : "w-16 h-16"} rounded-xl object-cover bg-gray-100`} />
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-gray-900 truncate">{recipe.name}</h3>
                  <div className="flex flex-wrap gap-3 text-xs text-gray-500 mt-2">
                    <span className="inline-flex items-center gap-1"><Clock className="h-3.5 w-3.5" /> {recipe.cook_time}</span>
                    <span className="inline-flex items-center gap-1"><Users className="h-3.5 w-3.5" /> {recipe.servings || 4} servings</span>
                  </div>
                  <Button className="mt-4" size="sm" onClick={() => navigate(`/cook/${recipe.id}`)}>
                    <Play className="h-3.5 w-3.5 mr-1.5" /> Start Cooking
                  </Button>
                </div>
              </div>
            ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
