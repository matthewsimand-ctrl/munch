import { useMemo, useState } from "react";
import { ArrowLeft, Plus } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { useStore } from "@/lib/store";
import { toast } from "sonner";

export default function CookbookDetails() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { recipeFolders, savedApiRecipes, likedRecipes, addRecipeToFolder } = useStore();
  const [showAddRecipes, setShowAddRecipes] = useState(false);

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

  const onAddRecipe = (recipeId: string) => {
    if (!cookbook) return;
    addRecipeToFolder(cookbook.id, recipeId);
    toast.success("Recipe added to cookbook");
  };

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
      <div className="max-w-4xl mx-auto">
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
              <p className="text-xs font-semibold text-stone-600 mb-2">Add from My Recipes</p>
              {availableRecipes.length === 0 ? (
                <p className="text-xs text-stone-400">No additional saved recipes available to add.</p>
              ) : (
                <div className="space-y-2">
                  {availableRecipes.map((recipe) => (
                    <div key={recipe.id} className="flex items-center justify-between gap-2 text-sm">
                      <span className="text-stone-700 truncate">{recipe.name}</span>
                      <button
                        onClick={() => onAddRecipe(recipe.id)}
                        className="px-2 py-1 rounded-lg text-xs font-semibold bg-white border border-orange-200 text-orange-600"
                      >
                        Add
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {recipes.length === 0 ? (
            <div className="p-4 text-sm text-stone-400">No recipes in this cookbook yet.</div>
          ) : (
            <div className="p-4 space-y-2">
              {recipes.map((recipe) => (
                <div key={recipe.id} className="text-sm text-stone-700 border-b border-stone-100 pb-2 last:border-0">
                  {recipe.name}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
