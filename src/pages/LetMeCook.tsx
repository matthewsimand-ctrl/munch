import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Play, ChefHat, Clock, Users } from "lucide-react";
import { useStore } from "@/lib/store";
import { useDbRecipes } from "@/hooks/useDbRecipes";
import { Button } from "@/components/ui/button";
import type { Recipe } from "@/data/recipes";

function normalizeStringArray(value: unknown): string[] {
  if (Array.isArray(value)) return value.map((v) => String(v).trim()).filter(Boolean);
  if (typeof value === "string") return value.split(/\r?\n/).map((v) => v.trim()).filter(Boolean);
  return [];
}

function normalizeRecipe(recipe: any, id: string): Recipe {
  return {
    ...recipe,
    id: String(recipe?.id || id),
    name: String(recipe?.name || "Untitled Recipe"),
    image: String(recipe?.image || "/placeholder.svg"),
    cook_time: String(recipe?.cook_time || "30 min"),
    difficulty: String(recipe?.difficulty || "Intermediate"),
    ingredients: normalizeStringArray(recipe?.ingredients),
    instructions: normalizeStringArray(recipe?.instructions),
    tags: normalizeStringArray(recipe?.tags),
    servings: Number(recipe?.servings || 4),
  };
}

export default function LetMeCook() {
  const navigate = useNavigate();
  const { likedRecipes, savedApiRecipes } = useStore();
  const { data: dbRecipes = [] } = useDbRecipes();

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
        {recipes.length === 0 ? (
          <div className="bg-white border border-gray-100 rounded-2xl p-10 text-center shadow-sm">
            <ChefHat className="h-10 w-10 mx-auto text-gray-300" />
            <h2 className="text-lg font-semibold text-gray-900 mt-3">No saved recipes yet</h2>
            <p className="text-sm text-gray-500 mt-1 mb-4">Save a recipe first, then come back here to start cooking.</p>
            <Button onClick={() => navigate("/swipe")}>Explore recipes</Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {recipes.map((recipe) => (
              <div key={recipe.id} className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm flex gap-4">
                <img src={recipe.image} alt={recipe.name} className="w-24 h-24 rounded-xl object-cover bg-gray-100" />
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
        )}
      </div>
    </div>
  );
}
