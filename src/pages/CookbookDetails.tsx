import { useMemo, useState } from "react";
import { ArrowLeft, Check, Clock, Plus, Star } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { useStore } from "@/lib/store";
import { toast } from "sonner";
import RecipePreviewDialog from "@/components/RecipePreviewDialog";
import { calculateMatch } from "@/lib/matchLogic";
import type { Recipe } from "@/data/recipes";

const getCookStats = (recipe: Recipe, rating?: number) => ({
  stars: rating ?? ((recipe.name.length % 2) + 4),
  timesCooked: (recipe.id.charCodeAt(0) % 12) + 3,
});

export default function CookbookDetails() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const {
    recipeFolders,
    savedApiRecipes,
    likedRecipes,
    recipeRatings,
    cachedNutrition,
    pantryList,
    addRecipeToFolder,
    addCustomGroceryItem,
  } = useStore();
  const [showAddRecipes, setShowAddRecipes] = useState(false);
  const [selectedRecipeIds, setSelectedRecipeIds] = useState<string[]>([]);
  const [previewRecipe, setPreviewRecipe] = useState<Recipe | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);

  const cookbook = useMemo(
    () => recipeFolders.find((folder) => folder.id === id) ?? null,
    [recipeFolders, id],
  );

  const recipes = useMemo(() => {
    if (!cookbook) return [];
    return cookbook.recipeIds.map((recipeId) => savedApiRecipes[recipeId]).filter(Boolean);
  }, [cookbook, savedApiRecipes]);

  const availableRecipes = useMemo(() => {
    if (!cookbook) return [];
    const existing = new Set(cookbook.recipeIds);
    return likedRecipes
      .map((recipeId) => savedApiRecipes[recipeId])
      .filter((recipe) => recipe && !existing.has(recipe.id));
  }, [cookbook, likedRecipes, savedApiRecipes]);

  const pantryNames = useMemo(() => pantryList.map((item) => item.name), [pantryList]);

  const onToggleRecipe = (recipeId: string) => {
    setSelectedRecipeIds((prev) =>
      prev.includes(recipeId)
        ? prev.filter((idValue) => idValue !== recipeId)
        : [...prev, recipeId],
    );
  };

  const onAddSelectedRecipes = () => {
    if (!cookbook || selectedRecipeIds.length === 0) return;
    selectedRecipeIds.forEach((recipeId) => addRecipeToFolder(cookbook.id, recipeId));
    toast.success(`Added ${selectedRecipeIds.length} recipe${selectedRecipeIds.length === 1 ? "" : "s"} to cookbook`);
    setSelectedRecipeIds([]);
    setShowAddRecipes(false);
  };

  const openPreview = (recipe: Recipe) => {
    setPreviewRecipe(recipe);
    setPreviewOpen(true);
  };

  const previewMatch = previewRecipe ? calculateMatch(pantryNames, previewRecipe.ingredients || []) : null;

  if (!cookbook) {
    return (
      <div className="min-h-full px-6 py-6" style={{ background: "#FFFAF5" }}>
        <div className="max-w-4xl mx-auto rounded-2xl border border-stone-200 bg-white p-6">
          <p className="text-sm text-stone-500 mb-3">Cookbook not found.</p>
          <button
            onClick={() => navigate("/cookbooks")}
            className="px-3 py-2 rounded-xl text-xs font-semibold bg-orange-500 text-white"
          >
            Back to Cookbooks
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-full px-6 py-6" style={{ background: "#FFFAF5" }}>
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={() => navigate("/cookbooks")}
            className="px-3 py-2 rounded-xl text-xs font-semibold bg-white border border-stone-200 text-stone-600 inline-flex items-center gap-1"
          >
            <ArrowLeft size={12} /> Back to Cookbooks
          </button>
          <button
            onClick={() => setShowAddRecipes((prev) => !prev)}
            className="px-3 py-2 rounded-xl text-xs font-semibold bg-orange-500 text-white inline-flex items-center gap-1"
          >
            <Plus size={12} /> {showAddRecipes ? "Done" : "Add Recipes"}
          </button>
        </div>

        <div className="rounded-2xl bg-white border border-stone-200 overflow-hidden">
          <div className="p-4 border-b border-stone-100">
            <h1 className="text-2xl font-bold text-stone-900" style={{ fontFamily: "'Fraunces', Georgia, serif" }}>
              {cookbook.name}
            </h1>
            <p className="text-xs text-stone-400 mt-1">{recipes.length} recipe{recipes.length !== 1 ? "s" : ""}</p>
          </div>

          {showAddRecipes && (
            <div className="p-4 border-b border-stone-100 bg-orange-50/40">
              <p className="text-xs font-semibold text-stone-700 mb-1">Add from My Recipes</p>
              <p className="text-xs text-stone-500 mb-3">Select one or more recipes and add them to this cookbook.</p>
              {availableRecipes.length === 0 ? (
                <p className="text-xs text-stone-400">No additional saved recipes available to add.</p>
              ) : (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-44 overflow-y-auto pr-1">
                    {availableRecipes.map((recipe) => {
                      const checked = selectedRecipeIds.includes(recipe.id);
                      return (
                        <label
                          key={recipe.id}
                          className={`text-xs rounded-xl border px-3 py-2 flex items-center gap-2 cursor-pointer transition-colors ${checked ? "border-orange-300 bg-orange-100/70 text-orange-700" : "border-stone-200 bg-white text-stone-600"}`}
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => onToggleRecipe(recipe.id)}
                          />
                          <span className="truncate">{recipe.name}</span>
                        </label>
                      );
                    })}
                  </div>
                  <button
                    onClick={onAddSelectedRecipes}
                    disabled={selectedRecipeIds.length === 0}
                    className="mt-3 px-3 py-2 rounded-xl text-xs font-semibold bg-orange-500 text-white inline-flex items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Check size={12} /> Add Selected ({selectedRecipeIds.length})
                  </button>
                </>
              )}
            </div>
          )}

          {recipes.length === 0 ? (
            <div className="p-6 text-sm text-stone-500">No recipes in this cookbook yet.</div>
          ) : (
            <div className="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {recipes.map((recipe) => {
                const rating = recipeRatings?.[recipe.id];
                const stats = getCookStats(recipe, rating);
                const nutrition = cachedNutrition?.[recipe.id];
                const difficulty = recipe.difficulty ?? "medium";
                const diffColor =
                  difficulty === "easy"
                    ? "text-emerald-600 bg-emerald-50"
                    : difficulty === "medium"
                      ? "text-amber-600 bg-amber-50"
                      : "text-red-600 bg-red-50";

                return (
                  <button
                    key={recipe.id}
                    onClick={() => openPreview(recipe)}
                    className="text-left rounded-2xl overflow-hidden border border-stone-200 bg-white hover:border-orange-200 hover:shadow-sm transition-all"
                  >
                    <div className="aspect-[4/3] bg-stone-100 overflow-hidden">
                      {recipe.image && recipe.image !== "/placeholder.svg" ? (
                        <img src={recipe.image} alt={recipe.name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-4xl bg-gradient-to-br from-orange-50 to-amber-50">🍽️</div>
                      )}
                    </div>
                    <div className="p-3">
                      <p className="font-semibold text-sm text-stone-800 line-clamp-1">{recipe.name}</p>
                      <div className="flex items-center gap-2 mt-2 text-[11px] text-stone-400">
                        <span className="flex items-center gap-1"><Clock size={11} /> {recipe.cook_time}</span>
                        <span className={`px-2 py-0.5 rounded-full font-semibold ${diffColor}`}>{difficulty}</span>
                        <span className="flex items-center gap-1 text-amber-500"><Star size={11} fill="currentColor" /> {stats.stars.toFixed(1)}</span>
                      </div>
                      {(nutrition?.calories || nutrition?.protein) && (
                        <p className="mt-1 text-[11px] text-stone-500 line-clamp-1">
                          {nutrition?.calories ? `${Math.round(nutrition.calories)} cal` : null}
                          {nutrition?.protein ? ` • ${Math.round(nutrition.protein)}g protein` : null}
                        </p>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <RecipePreviewDialog
        recipe={previewRecipe}
        match={previewMatch}
        open={previewOpen}
        onOpenChange={setPreviewOpen}
        onAddMissingToGrocery={(recipe, missingIngredients) => {
          missingIngredients.forEach((ingredient) => addCustomGroceryItem(ingredient));
          toast.success(`Added ${missingIngredients.length} items from "${recipe.name}" to grocery list`);
        }}
      />
    </div>
  );
}
