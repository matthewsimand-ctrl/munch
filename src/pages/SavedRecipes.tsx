import { useEffect, useState, useMemo } from "react";
import {
  Heart, Clock, Users, Search, Filter, Trash2, ChevronDown,
  Plus, FolderOpen, X, Tag, Edit2, Check, ChefHat, Play,
  FolderPlus, MoreHorizontal, ShoppingCart, Import, Flame, Beef, Wheat, Droplets, Sparkles, Loader2, Wand2, Image, ArrowLeft,
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useStore } from "@/lib/store";
import { supabase } from "@/integrations/supabase/client";
import { useDbRecipes } from "@/hooks/useDbRecipes";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import NutritionCard from "@/components/NutritionCard";
import ImportRecipeDialog from "@/components/ImportRecipeDialog";
import CreateRecipeForm from "@/components/CreateRecipeForm";
import RecipeTweakDialog from "@/components/RecipeTweakDialog";
import { useChefProfiles } from "@/hooks/useChefProfiles";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { calculateMatch } from "@/lib/matchLogic";
import { parseIngredientLine, scaleIngredientQuantity } from "@/lib/ingredientText";
import { toast } from "sonner";
import type { Recipe } from "@/data/recipes";

type SortOption = "newest" | "time" | "name";
type ViewMode = "recipes" | "cookbooks";

function normalizeStringArray(value: unknown): string[] {
  if (Array.isArray(value)) return value.map((v) => String(v).trim()).filter(Boolean);
  if (typeof value === "string") {
    return value
      .split(/\r?\n/)
      .map((s) => s.trim())
      .filter(Boolean);
  }
  return [];
}

function normalizeRecipeData(recipe: any, idFallback: string): Recipe {
  return {
    ...recipe,
    id: String(recipe?.id || idFallback),
    name: String(recipe?.name || 'Untitled Recipe'),
    image: String(recipe?.image || '/placeholder.svg'),
    cook_time: String(recipe?.cook_time || '30 min'),
    difficulty: String(recipe?.difficulty || 'Intermediate'),
    ingredients: normalizeStringArray(recipe?.ingredients),
    instructions: normalizeStringArray(recipe?.instructions),
    tags: normalizeStringArray(recipe?.tags),
    cuisine: recipe?.cuisine || null,
    servings: Number(recipe?.servings || 4),
  };
}
export default function SavedRecipes() {
  const navigate = useNavigate();
  const {
    likedRecipes, savedApiRecipes, unlikeRecipe, pantryList,
    recipeTags, addRecipeTag, removeRecipeTag, setRecipeIngredients, recipeIngredientOverrides,
    recipeFolders, createFolder, renameFolder, updateFolderCover, deleteFolder,
    addRecipeToFolder, removeRecipeFromFolder,
    addCustomGroceryItem, cachedNutrition, cacheNutrition,
  } = useStore();
  const { data: dbRecipes = [] } = useDbRecipes();

  const [search, setSearch] = useState("");
  const [activeTags, setActiveTags] = useState<string[]>([]);
  const [sort, setSort] = useState<SortOption>("newest");
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>("recipes");
  const [activeFolderId, setActiveFolderId] = useState<string | null>(null);
  const [showCreateRecipe, setShowCreateRecipe] = useState(false);
  const [tweakingRecipe, setTweakingRecipe] = useState<Recipe | null>(null);

  // Tag editing
  const [editingTagsFor, setEditingTagsFor] = useState<string | null>(null);
  const [newTagInput, setNewTagInput] = useState("");

  // Cookbook creation
  const [showNewCookbook, setShowNewCookbook] = useState(false);
  const [newCookbookName, setNewCookbookName] = useState("");
  const [newCookbookCover, setNewCookbookCover] = useState("");
  const [renamingFolder, setRenamingFolder] = useState<string | null>(null);
  const [analyzingNutrition, setAnalyzingNutrition] = useState<string | null>(null);
  const [renameInput, setRenameInput] = useState("");
  const [editingIngredients, setEditingIngredients] = useState<string[]>([]);
  const [ingredientInput, setIngredientInput] = useState("");
  const [isEditingIngredients, setIsEditingIngredients] = useState(false);
  const [servingMultiplier, setServingMultiplier] = useState(1);
  const [groceryAddedRecipeIds, setGroceryAddedRecipeIds] = useState<string[]>([]);

  // Resolve all saved recipes from DB + saved API cache
  const allSavedRecipes: Recipe[] = useMemo(() => {
    return likedRecipes
      .map((id) => {
        const dbRecipe = dbRecipes.find((r) => r.id === id);
        if (dbRecipe) {
          const normalized = normalizeRecipeData(dbRecipe, id);
          return recipeIngredientOverrides[id] ? { ...normalized, ingredients: recipeIngredientOverrides[id] } : normalized;
        }

        const apiRecipe = savedApiRecipes[id];
        if (apiRecipe) {
          const normalized = normalizeRecipeData(apiRecipe, id);
          return recipeIngredientOverrides[id] ? { ...normalized, ingredients: recipeIngredientOverrides[id] } : normalized;
        }

        return null;
      })
      .filter(Boolean) as Recipe[];
  }, [likedRecipes, dbRecipes, savedApiRecipes, recipeIngredientOverrides]);

  // Fetch chef profiles for recipes with created_by
  const chefIds = useMemo(() => allSavedRecipes.map(r => r.created_by).filter(Boolean), [allSavedRecipes]);
  const { data: chefProfiles = {} } = useChefProfiles(chefIds);

  // Collect all unique user tags
  const allTags = useMemo(() => {
    const tags = new Set<string>();
    allSavedRecipes.forEach((r) => {
      (r.tags || []).forEach((t) => tags.add(t));
      (recipeTags[r.id] || []).forEach((t) => tags.add(t));
    });
    return ["All", ...Array.from(tags).sort()];
  }, [allSavedRecipes, recipeTags]);

  // Get recipes for current view
  const visibleRecipes = useMemo(() => {
    let list = allSavedRecipes;

    // Filter by folder
    if (viewMode === "cookbooks" && activeFolderId) {
      const folder = recipeFolders.find((f) => f.id === activeFolderId);
      if (folder) {
        list = list.filter((r) => folder.recipeIds.includes(r.id));
      }
    }

    // Filter by tags (multi-select)
    if (activeTags.length > 0) {
      list = list.filter((r) => {
        const userTags = recipeTags[r.id] || [];
        const allTags = [...(r.tags || []), ...userTags];
        return activeTags.some(t => allTags.includes(t));
      });
    }

    // Search (name, ingredients, cuisine, tags)
    if (search) {
      const q = search.toLowerCase();
      list = list.filter((r) => {
        const userTags = recipeTags[r.id] || [];
        const allTags = [...(r.tags || []), ...userTags];
        return (
          r.name.toLowerCase().includes(q) ||
          (r.cuisine && r.cuisine.toLowerCase().includes(q)) ||
          r.ingredients.some(ing => ing.toLowerCase().includes(q)) ||
          allTags.some(tag => tag.toLowerCase().includes(q))
        );
      });
    }

    // Sort
    list = [...list].sort((a, b) => {
      if (sort === "time") return parseInt(a.cook_time || "0") - parseInt(b.cook_time || "0");
      if (sort === "name") return a.name.localeCompare(b.name);
      // newest: reverse the natural (oldest-first) order
      return -1;
    });

    return list;
  }, [allSavedRecipes, viewMode, activeFolderId, recipeFolders, activeTags, recipeTags, search, sort]);

  const visibleCookbooks = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return recipeFolders;
    return recipeFolders.filter((folder) => folder.name.toLowerCase().includes(q));
  }, [recipeFolders, search]);

  const pantryNames = pantryList.map((p) => p.name);
  const selectedIngredients = selectedRecipe ? normalizeStringArray((selectedRecipe as any).ingredients) : [];
  const scaledServings = selectedRecipe ? Math.max(1, Math.round((selectedRecipe.servings || 4) * servingMultiplier)) : 1;
  const selectedInstructions = selectedRecipe ? normalizeStringArray((selectedRecipe as any).instructions) : [];
  const handleRemove = (id: string) => {
    unlikeRecipe(id);
    toast.success("Recipe removed from saved");
  };

  const handleAddTag = (recipeId: string) => {
    if (newTagInput.trim()) {
      addRecipeTag(recipeId, newTagInput.trim());
      setNewTagInput("");
    }
  };

  const handleCreateCookbook = () => {
    if (newCookbookName.trim()) {
      createFolder(newCookbookName.trim(), newCookbookCover.trim() || undefined);
      setNewCookbookName("");
      setNewCookbookCover("");
      setShowNewCookbook(false);
      toast.success("Cookbook created");
    }
  };

  const handleRenameFolder = (folderId: string) => {
    if (renameInput.trim()) {
      renameFolder(folderId, renameInput.trim());
      setRenamingFolder(null);
      setRenameInput("");
    }
  };

  useEffect(() => {
    if (!selectedRecipe) return;
    setEditingIngredients(normalizeStringArray((selectedRecipe as any).ingredients));
    setIngredientInput("");
    setIsEditingIngredients(false);
    setServingMultiplier(1);
  }, [selectedRecipe?.id]);

  const addEditingIngredient = () => {
    const value = ingredientInput.trim().toLowerCase();
    if (!value || editingIngredients.includes(value)) return;
    setEditingIngredients((prev) => [...prev, value]);
    setIngredientInput("");
  };

  const saveEditedIngredients = () => {
    if (!selectedRecipe) return;
    if (editingIngredients.length === 0) {
      toast.error("Add at least one ingredient");
      return;
    }

    setRecipeIngredients(selectedRecipe.id, editingIngredients);
    setSelectedRecipe((prev) => (prev ? { ...prev, ingredients: editingIngredients } : prev));
    setIsEditingIngredients(false);
    toast.success("Ingredients updated");
  };

  const handleAddMissingToGrocery = (recipe: Recipe) => {
    const ingredients = normalizeStringArray((recipe as any).ingredients);
    const match = calculateMatch(pantryNames, ingredients);
    if (match.missing.length === 0) {
      toast.info("You already have all the ingredients!");
      return;
    }
    match.missing.forEach((ing) => {
      const parsed = parseIngredientLine(ing);
      addCustomGroceryItem(parsed.name, parsed.quantity || "1");
    });
    setGroceryAddedRecipeIds((prev) => prev.includes(recipe.id) ? prev : [...prev, recipe.id]);
    toast.success(`Added ${match.missing.length} items to grocery list`);
  };

  const quickAnalyzeNutrition = async (recipe: Recipe) => {
    setAnalyzingNutrition(recipe.id);
    try {
      const { data, error } = await supabase.functions.invoke('analyze-nutrition', {
        body: { recipeName: recipe.name, ingredients: recipe.ingredients, servings: recipe.servings || 4 },
      });
      if (error || !data?.success) {
        toast.error('Failed to analyze nutrition');
        return;
      }
      cacheNutrition(recipe.id, data.nutrition);
      toast.success('Nutrition facts generated!');
    } catch {
      toast.error('Something went wrong');
    } finally {
      setAnalyzingNutrition(null);
    }
  };

  const getFolderNames = (recipeId: string) => {
    return recipeFolders.filter((f) => f.recipeIds.includes(recipeId)).map((f) => f.name);
  };

  const activeFolder = recipeFolders.find((f) => f.id === activeFolderId);
  const activeCookbookName = activeFolder?.name || "Cookbook";
  const isRecipeListingView = viewMode === "recipes" || (viewMode === "cookbooks" && Boolean(activeFolderId));

  return (
    <div className="min-h-full bg-muted/30">
      {/* Header */}
      <div className="bg-background border-b border-border px-6 py-5">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl font-bold text-orange-500">Saved Recipes</h1>
              <p className="text-sm text-muted-foreground mt-0.5">
                {allSavedRecipes.length} recipes across your cookbooks
              </p>
            </div>
            <div className="flex items-center gap-2">
              <ImportRecipeDialog>
                <button className="flex items-center gap-2 bg-muted hover:bg-muted/80 text-foreground text-sm font-semibold px-4 py-2.5 rounded-xl transition-colors border border-border">
                  <Import size={15} />
                  Import
                </button>
              </ImportRecipeDialog>
              <button
                onClick={() => setShowCreateRecipe(true)}
                className="flex items-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground text-sm font-semibold px-4 py-2.5 rounded-xl transition-colors shadow-sm"
              >
                <Plus size={15} />
                Add Recipe
              </button>
              <Link
                to="/swipe"
                className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition-colors shadow-sm"
              >
                <Heart size={15} />
                Browse More
              </Link>
            </div>
          </div>

          {/* Search + sort */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1 max-w-md">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={isRecipeListingView ? "Search your recipes…" : "Search cookbooks…"}
                className="w-full pl-9 pr-4 py-2.5 text-sm bg-muted border border-transparent rounded-xl focus:outline-none focus:bg-background focus:border-orange-300 transition-all placeholder:text-muted-foreground"
              />
            </div>
            <div className="relative">
              <select
                value={sort}
                onChange={(e) => setSort(e.target.value as SortOption)}
                className="appearance-none pl-9 pr-8 py-2.5 text-sm bg-muted border border-transparent rounded-xl focus:outline-none focus:bg-background focus:border-orange-300 transition-all text-foreground font-medium cursor-pointer"
              >
                <option value="newest">Newest first</option>
                <option value="time">Quickest first</option>
                <option value="name">A – Z</option>
              </select>
              <Filter size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
              <ChevronDown size={13} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
            </div>
          </div>
        </div>
      </div>

      {/* Tabs: Recipes / Cookbooks */}
      <div className="bg-background border-b border-border px-6 py-3">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => { setViewMode("recipes"); setActiveFolderId(null); }}
              className={`text-xs font-semibold px-3.5 py-1.5 rounded-full border transition-all ${
                viewMode === "recipes"
                  ? "bg-orange-500 text-white border-orange-500"
                  : "bg-background text-muted-foreground border-border hover:border-foreground/30"
              }`}
            >
              My Recipes
            </button>
            <button
              onClick={() => { setViewMode("cookbooks"); setActiveFolderId(null); }}
              className={`text-xs font-semibold px-3.5 py-1.5 rounded-full border transition-all ${
                viewMode === "cookbooks"
                  ? "bg-orange-500 text-white border-orange-500"
                  : "bg-background text-muted-foreground border-border hover:border-foreground/30"
              }`}
            >
              Cookbooks
            </button>
            {viewMode === "cookbooks" && (
              <button
                onClick={() => setShowNewCookbook(true)}
                className="text-xs font-semibold px-3 py-1.5 rounded-full border border-dashed border-border text-muted-foreground hover:border-orange-300 hover:text-orange-500 transition-all flex items-center gap-1"
              >
                <FolderPlus size={11} /> New Cookbook
              </button>
            )}
          </div>

          {/* Cookbook actions */}
          {viewMode === "cookbooks" && activeFolder && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="text-muted-foreground hover:text-foreground transition-colors">
                  <MoreHorizontal size={16} />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                <DropdownMenuItem onClick={() => { setRenamingFolder(activeFolder.id); setRenameInput(activeFolder.name); }}>
                  <Edit2 size={12} className="mr-2" /> Rename
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="text-destructive" onClick={() => { deleteFolder(activeFolder.id); setActiveFolderId(null); toast.success("Cookbook deleted"); }}>
                  <Trash2 size={12} className="mr-2" /> Delete Cookbook
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>

      {viewMode === "cookbooks" && activeFolder && (
        <div className="bg-orange-50/70 border-b border-orange-100 px-6 py-2.5">
          <div className="max-w-7xl mx-auto text-xs font-medium text-orange-700 flex items-center gap-2">
            <button
              onClick={() => setActiveFolderId(null)}
              className="inline-flex items-center gap-1 text-orange-700/90 hover:text-orange-900 transition-colors"
            >
              <ArrowLeft size={12} /> Cookbooks
            </button>
            <span>/</span>
            {activeFolder.coverImage ? (
              <img src={activeFolder.coverImage} alt={activeCookbookName} className="h-5 w-5 rounded object-cover" />
            ) : (
              <FolderOpen size={12} />
            )}
            Viewing cookbook: {activeCookbookName}
          </div>
        </div>
      )}

      {/* Tag filters (multi-select) */}
      {isRecipeListingView && (
        <div className="bg-background border-b border-border px-6 py-2.5">
          <div className="max-w-7xl mx-auto flex gap-2 overflow-x-auto scrollbar-hide pb-0.5">
            <button
              onClick={() => setActiveTags([])}
              className={`shrink-0 text-xs font-semibold px-3 py-1.5 rounded-full border transition-all ${
                activeTags.length === 0
                  ? "bg-orange-500 text-white border-orange-500"
                  : "bg-background text-muted-foreground border-border hover:border-foreground/30"
              }`}
            >
              All
            </button>
            {allTags.filter(t => t !== "All").map((tag) => {
              const isActive = activeTags.includes(tag);
              return (
                <button
                  key={tag}
                  onClick={() => {
                    setActiveTags(prev =>
                      isActive ? prev.filter(t => t !== tag) : [...prev, tag]
                    );
                  }}
                  className={`shrink-0 text-xs font-semibold px-3 py-1.5 rounded-full border transition-all ${
                    isActive
                      ? "bg-orange-500 text-white border-orange-500"
                      : "bg-background text-muted-foreground border-border hover:border-foreground/30"
                  }`}
                >
                  {tag}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Grid */}
      <div className="max-w-7xl mx-auto px-6 py-6">
        {!isRecipeListingView ? (
          visibleCookbooks.length === 0 ? (
            <div className="text-center py-24">
              <div className="text-5xl mb-4">📚</div>
              <h3 className="text-lg font-semibold text-foreground">No cookbooks found</h3>
              <p className="text-sm text-muted-foreground mt-1">
                {recipeFolders.length === 0 ? "Create your first cookbook to organize your recipes." : "Try a different search term."}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
              {visibleCookbooks.map((folder) => {
                const recipeCount = folder.recipeIds.length;
                const previewRecipe = allSavedRecipes.find((recipe) => folder.recipeIds.includes(recipe.id));

                return (
                  <div
                    key={folder.id}
                    className="group text-left rounded-2xl overflow-hidden border border-border bg-background shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all"
                  >
                    <div onClick={() => setActiveFolderId(folder.id)} className="w-full text-left cursor-pointer">
                    <div className="relative h-48">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          const cover = window.prompt("Enter a cover image URL", folder.coverImage || "");
                          if (cover !== null) {
                            updateFolderCover(folder.id, cover.trim());
                            toast.success("Cookbook cover updated");
                          }
                        }}
                        className="absolute top-3 right-3 z-10 inline-flex items-center gap-1 rounded-full bg-black/40 backdrop-blur px-2.5 py-1 text-[11px] font-semibold text-white hover:bg-black/55 transition-colors"
                        title="Update cookbook cover"
                      >
                        <Image size={12} /> Cover
                      </button>
                      {folder.coverImage || previewRecipe?.image ? (
                        <img
                          src={folder.coverImage || previewRecipe?.image}
                          alt={folder.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-orange-400 via-orange-500 to-rose-500" />
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                      <div className="absolute bottom-3 left-3 right-3">
                        <p className="text-white text-lg font-semibold leading-tight line-clamp-2">{folder.name}</p>
                        <p className="text-white/80 text-xs mt-1">{recipeCount} {recipeCount === 1 ? "recipe" : "recipes"}</p>
                      </div>
                    </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )
        ) : visibleRecipes.length === 0 ? (
          <div className="text-center py-24">
            <div className="text-5xl mb-4">🍽️</div>
            <h3 className="text-lg font-semibold text-foreground">No recipes found</h3>
            <p className="text-sm text-muted-foreground mt-1">
              {allSavedRecipes.length === 0 ? "Browse recipes and save your favorites!" : "Try adjusting your search or filters"}
            </p>
            {allSavedRecipes.length === 0 && (
              <Link to="/swipe" className="inline-flex items-center gap-2 mt-4 bg-orange-500 hover:bg-orange-600 text-white text-sm font-semibold px-4 py-2 rounded-xl transition-colors">
                <Heart size={14} /> Browse Recipes
              </Link>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {visibleRecipes.map((recipe) => {
              const match = calculateMatch(pantryNames, recipe.ingredients || []);
              const userTags = recipeTags[recipe.id] || [];
              const allRecipeTags = [...(recipe.tags || []), ...userTags];
              const folderNames = getFolderNames(recipe.id);

              return (
                <div
                  key={recipe.id}
                  className="bg-background rounded-2xl border border-border shadow-sm overflow-hidden hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 group"
                >
                  {/* Card image */}
                  <div
                    className="h-36 relative cursor-pointer"
                    onClick={() => setSelectedRecipe(recipe)}
                  >
                    {recipe.image ? (
                      <img src={recipe.image} alt={recipe.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-orange-400 to-pink-400" />
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />

                    {/* Remove button */}
                    <button
                      onClick={(e) => { e.stopPropagation(); handleRemove(recipe.id); }}
                      className="absolute top-2.5 right-2.5 w-7 h-7 rounded-full bg-black/20 backdrop-blur-sm flex items-center justify-center text-white/80 hover:bg-red-500/80 hover:text-white opacity-0 group-hover:opacity-100 transition-all"
                      title="Remove"
                    >
                      <Trash2 size={12} />
                    </button>

                    {/* Chef name on image */}
                    {recipe.created_by && chefProfiles[recipe.created_by] && (
                      <button
                        onClick={(e) => { e.stopPropagation(); navigate(`/chef/${recipe.created_by}`); }}
                        className="absolute bottom-2.5 left-2.5 inline-flex items-center gap-1 text-[10px] text-white/90 hover:text-white font-medium bg-black/30 backdrop-blur-sm px-2 py-0.5 rounded-full transition-colors"
                      >
                        <ChefHat size={10} /> {chefProfiles[recipe.created_by].display_name || 'Chef'}
                      </button>
                    )}

                    {/* Match badge */}
                    <div className={`absolute bottom-2.5 right-2.5 px-2 py-0.5 rounded-full text-white text-xs font-bold ${
                      match.percentage >= 80 ? "bg-green-500" : match.percentage >= 50 ? "bg-yellow-500" : "bg-orange-500"
                    }`}>
                      {match.percentage}% match
                    </div>
                  </div>

                  {/* Card body */}
                  <div className="p-3.5">
                    <h3
                      className="text-sm font-bold text-foreground mb-1 leading-tight group-hover:text-orange-500 transition-colors cursor-pointer"
                      onClick={() => setSelectedRecipe(recipe)}
                    >
                      {recipe.name}
                    </h3>

                    {/* Chef attribution */}
                    {recipe.created_by && chefProfiles[recipe.created_by] && (
                      <button
                        onClick={(e) => { e.stopPropagation(); navigate(`/chef/${recipe.created_by}`); }}
                        className="inline-flex items-center gap-1 text-[10px] text-primary hover:underline mb-1"
                      >
                        <ChefHat size={10} /> by {chefProfiles[recipe.created_by].display_name || 'Chef'}
                      </button>
                    )}

                    <div className="flex items-center gap-3 text-xs text-muted-foreground mb-2.5">
                      <span className="flex items-center gap-1"><Clock size={11} /> {recipe.cook_time}</span>
                      {recipe.servings && <span className="flex items-center gap-1"><Users size={11} /> {recipe.servings}</span>}
                    </div>

                    {/* Ingredient preview */}
                    {recipe.ingredients.length > 0 && (
                      <div className="flex flex-wrap gap-1 mb-2">
                        {recipe.ingredients.slice(0, 3).map((ing) => (
                          <span key={ing} className="text-[10px] px-1.5 py-0.5 rounded-full bg-success/10 text-success font-medium truncate max-w-[100px]">
                            {ing}
                          </span>
                        ))}
                        {recipe.ingredients.length > 3 && (
                          <span className="text-[10px] text-muted-foreground py-0.5">+{recipe.ingredients.length - 3}</span>
                        )}
                      </div>
                    )}

                    {/* Nutrition preview (if cached) or generate button */}
                    {cachedNutrition[recipe.id] ? (() => {
                      const n = cachedNutrition[recipe.id];
                      return (
                        <div className="flex items-center gap-2 mb-2 px-2 py-1.5 rounded-lg bg-muted/50 border border-border">
                          <Flame size={12} className="text-primary shrink-0" />
                          <span className="text-[11px] font-bold text-foreground">{Math.round(n.calories)} kcal</span>
                          <span className="text-[10px] text-muted-foreground">·</span>
                          <span className="text-[10px] text-muted-foreground flex items-center gap-0.5"><Beef size={9} /> {Math.round(n.protein)}g</span>
                          <span className="text-[10px] text-muted-foreground flex items-center gap-0.5"><Wheat size={9} /> {Math.round(n.carbs)}g</span>
                          <span className="text-[10px] text-muted-foreground flex items-center gap-0.5"><Droplets size={9} /> {Math.round(n.fat)}g</span>
                        </div>
                      );
                    })() : recipe.ingredients.length > 0 && (
                      <button
                        onClick={(e) => { e.stopPropagation(); quickAnalyzeNutrition(recipe); }}
                        disabled={analyzingNutrition === recipe.id}
                        className="inline-flex items-center gap-1 text-[10px] text-muted-foreground hover:text-primary mb-2 transition-colors disabled:opacity-50"
                        title="Generate nutrition facts"
                      >
                        {analyzingNutrition === recipe.id ? (
                          <Loader2 size={11} className="animate-spin" />
                        ) : (
                          <Sparkles size={11} className="text-amber-500" />
                        )}
                        {analyzingNutrition === recipe.id ? 'Analyzing...' : 'Nutrition'}
                      </button>
                    )}

                    {/* Cookbooks with remove X + add icon inline */}
                    {recipeFolders.length > 0 && (
                      <div className="flex flex-wrap gap-1 mb-2 items-center">
                        {recipeFolders.filter(f => f.recipeIds.includes(recipe.id)).map((folder) => (
                          <span key={folder.id} className="inline-flex items-center gap-0.5 text-[10px] bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded-full font-medium">
                            <FolderOpen size={8} /> {folder.name}
                            <button
                              onClick={(e) => { e.stopPropagation(); removeRecipeFromFolder(folder.id, recipe.id); toast.success(`Removed from ${folder.name}`); }}
                              className="ml-0.5 hover:text-red-500 transition-colors"
                            >
                              <X size={8} />
                            </button>
                          </span>
                        ))}
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button className="text-muted-foreground hover:text-orange-500 transition-colors" title="Add to cookbook">
                              <FolderPlus size={12} />
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="start">
                            {recipeFolders.map((folder) => {
                              const inFolder = folder.recipeIds.includes(recipe.id);
                              return (
                                <DropdownMenuItem
                                  key={folder.id}
                                  onClick={() => {
                                    if (inFolder) {
                                      removeRecipeFromFolder(folder.id, recipe.id);
                                      toast.success(`Removed from ${folder.name}`);
                                    } else {
                                      addRecipeToFolder(folder.id, recipe.id);
                                      toast.success(`Added to ${folder.name}`);
                                    }
                                  }}
                                >
                                  {inFolder ? <Check size={12} className="mr-2 text-green-500" /> : <FolderOpen size={12} className="mr-2" />}
                                  {folder.name}
                                </DropdownMenuItem>
                              );
                            })}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    )}

                    {/* Tags with remove X */}
                    <div className="flex flex-wrap gap-1 mb-2">
                      {allRecipeTags.slice(0, 3).map((t) => {
                        const isUserTag = userTags.includes(t);
                        return (
                          <span key={t} className="inline-flex items-center gap-0.5 text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded-full">
                            {t}
                            {isUserTag && (
                              <button
                                onClick={(e) => { e.stopPropagation(); removeRecipeTag(recipe.id, t); }}
                                className="ml-0.5 hover:text-red-500 transition-colors"
                              >
                                <X size={10} />
                              </button>
                            )}
                          </span>
                        );
                      })}
                      {allRecipeTags.length > 3 && (
                        <span className="text-xs text-muted-foreground">+{allRecipeTags.length - 3}</span>
                      )}
                      <button
                        onClick={() => setEditingTagsFor(editingTagsFor === recipe.id ? null : recipe.id)}
                        className="text-xs text-orange-500 hover:text-orange-600 flex items-center gap-0.5"
                      >
                        <Tag size={10} />
                      </button>
                    </div>

                    {/* Inline tag editor */}
                    {editingTagsFor === recipe.id && (
                      <div className="mb-2 p-2 bg-muted rounded-lg space-y-1.5">
                        <div className="flex flex-wrap gap-1">
                          {userTags.map((t) => (
                            <span key={t} className="inline-flex items-center gap-1 text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full">
                              {t}
                              <button onClick={() => removeRecipeTag(recipe.id, t)} className="hover:text-red-500">
                                <X size={10} />
                              </button>
                            </span>
                          ))}
                        </div>
                        <div className="flex gap-1">
                          <Input
                            value={newTagInput}
                            onChange={(e) => setNewTagInput(e.target.value)}
                            onKeyDown={(e) => { if (e.key === "Enter") handleAddTag(recipe.id); }}
                            placeholder="Add tag…"
                            className="h-7 text-xs"
                          />
                          <button onClick={() => handleAddTag(recipe.id)} className="shrink-0 h-7 w-7 bg-orange-500 text-white rounded-md flex items-center justify-center hover:bg-orange-600">
                            <Plus size={12} />
                          </button>
                        </div>
                      </div>
                    )}


                    <div className="flex items-center justify-between pt-2.5 border-t border-border">
                      <span className="text-xs text-muted-foreground">{recipe.difficulty}</span>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={(e) => { e.stopPropagation(); setTweakingRecipe(recipe); }}
                          className="text-xs text-primary hover:text-primary/80 font-semibold flex items-center gap-1 transition-colors"
                          title="AI Tweak"
                        >
                          <Wand2 size={12} />
                        </button>
                        <button
                          onClick={() => setSelectedRecipe(recipe)}
                          className="text-xs text-orange-500 font-semibold hover:text-orange-600 transition-colors"
                        >
                          View Recipe →
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* New Cookbook Dialog */}
      <Dialog open={showNewCookbook} onOpenChange={setShowNewCookbook}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Create Cookbook</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Input
              value={newCookbookName}
              onChange={(e) => setNewCookbookName(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") handleCreateCookbook(); }}
              placeholder="Cookbook title…"
              autoFocus
            />
            <Input
              value={newCookbookCover}
              onChange={(e) => setNewCookbookCover(e.target.value)}
              placeholder="Cover image URL (optional)"
            />
            <div className="flex justify-end gap-2">
              <button onClick={() => setShowNewCookbook(false)} className="text-sm text-muted-foreground hover:text-foreground px-3 py-1.5">Cancel</button>
              <button onClick={handleCreateCookbook} className="text-sm bg-orange-500 hover:bg-orange-600 text-white font-semibold px-4 py-1.5 rounded-lg">Create</button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Rename Cookbook Dialog */}
      <Dialog open={!!renamingFolder} onOpenChange={() => setRenamingFolder(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Rename Cookbook</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Input
              value={renameInput}
              onChange={(e) => setRenameInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && renamingFolder) handleRenameFolder(renamingFolder); }}
              autoFocus
            />
            <div className="flex justify-end gap-2">
              <button onClick={() => setRenamingFolder(null)} className="text-sm text-muted-foreground hover:text-foreground px-3 py-1.5">Cancel</button>
              <button onClick={() => renamingFolder && handleRenameFolder(renamingFolder)} className="text-sm bg-orange-500 hover:bg-orange-600 text-white font-semibold px-4 py-1.5 rounded-lg">Rename</button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add Recipe Dialog */}
      <Dialog open={showCreateRecipe} onOpenChange={setShowCreateRecipe}>
        <DialogContent className="max-w-2xl h-[90vh] flex flex-col overflow-hidden">
          <DialogHeader className="shrink-0">
            <DialogTitle>Add a Recipe</DialogTitle>
          </DialogHeader>
          <ScrollArea className="flex-1 min-h-0">
            <div className="px-1 pb-4">
              <CreateRecipeForm onClose={() => setShowCreateRecipe(false)} />
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* Recipe Detail Dialog */}
      <Dialog open={!!selectedRecipe} onOpenChange={() => setSelectedRecipe(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
          {selectedRecipe && (
            <>
              <DialogHeader>
                <DialogTitle className="text-xl font-bold">{selectedRecipe.name}</DialogTitle>
                {selectedRecipe.created_by && chefProfiles[selectedRecipe.created_by] && (
                  <button
                    onClick={() => { setSelectedRecipe(null); navigate(`/chef/${selectedRecipe.created_by}`); }}
                    className="inline-flex items-center gap-1 text-xs text-primary hover:underline w-fit"
                  >
                    <ChefHat className="h-3 w-3" /> by {chefProfiles[selectedRecipe.created_by].display_name || 'Chef'}
                  </button>
                )}
              </DialogHeader>
              <div className="flex-1 min-h-0 overflow-y-auto -mx-6 px-6">
                <div className="space-y-6 pb-4">
                  {/* Image */}
                  {selectedRecipe.image && (
                    <div className="relative rounded-xl overflow-hidden aspect-video">
                      <img src={selectedRecipe.image} alt={selectedRecipe.name} className="w-full h-full object-cover" />
                    </div>
                  )}

                  {/* Meta */}
                  <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
                    <Badge variant="secondary" className="gap-1"><Clock size={12} /> {selectedRecipe.cook_time}</Badge>
                    <Badge variant="secondary">{selectedRecipe.difficulty}</Badge>
                    {selectedRecipe.cuisine && <Badge variant="outline">{selectedRecipe.cuisine}</Badge>}
                    {selectedRecipe.servings && <Badge variant="secondary" className="gap-1"><Users size={12} /> Serves {selectedRecipe.servings}</Badge>}
                  </div>

                  {/* Tags */}
                  <div className="flex flex-wrap gap-1.5">
                    {(selectedRecipe.tags || []).map((t) => (
                      <Badge key={t} variant="outline" className="text-xs">{t}</Badge>
                    ))}
                  </div>

                  <div className="flex items-center justify-between rounded-lg border border-border bg-muted/30 p-3">
                    <p className="text-sm text-muted-foreground">Servings: <span className="font-semibold text-foreground">{scaledServings}</span></p>
                    <div className="inline-flex items-center gap-1">
                      {[0.5, 1, 2].map((value) => (
                        <button
                          key={value}
                          onClick={() => setServingMultiplier(value)}
                          className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-colors ${servingMultiplier === value ? "bg-orange-500 text-white" : "bg-background text-muted-foreground hover:text-foreground"}`}
                        >
                          {value}x
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Ingredients with match */}
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-sm font-semibold text-foreground">
                        Ingredients
                        {editingIngredients.length > 0 && (() => {
                          const m = calculateMatch(pantryNames, editingIngredients);
                          return (
                            <span className={`ml-2 text-xs font-bold px-2 py-0.5 rounded-full text-white ${
                              m.percentage >= 80 ? "bg-green-500" : m.percentage >= 50 ? "bg-yellow-500" : "bg-orange-500"
                            }`}>
                              {m.percentage}% match
                            </span>
                          );
                        })()}
                      </h3>
                      {!isEditingIngredients ? (
                        <button
                          onClick={() => setIsEditingIngredients(true)}
                          className="text-xs font-semibold text-orange-500 hover:text-orange-600"
                        >
                          Edit ingredients
                        </button>
                      ) : (
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => {
                              setEditingIngredients(selectedIngredients);
                              setIsEditingIngredients(false);
                              setIngredientInput("");
                            }}
                            className="text-xs font-semibold text-muted-foreground hover:text-foreground"
                          >
                            Cancel
                          </button>
                          <button
                            onClick={saveEditedIngredients}
                            className="text-xs font-semibold text-orange-500 hover:text-orange-600"
                          >
                            Save
                          </button>
                        </div>
                      )}
                    </div>

                    {isEditingIngredients ? (
                      <div className="space-y-2">
                        <div className="flex flex-wrap gap-2">
                          {editingIngredients.map((ing) => (
                            <span key={ing} className="inline-flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-full bg-muted text-foreground font-medium">
                              {ing}
                              <button onClick={() => setEditingIngredients((prev) => prev.filter((i) => i !== ing))} className="text-muted-foreground hover:text-destructive">
                                <X size={12} />
                              </button>
                            </span>
                          ))}
                        </div>
                        <div className="flex gap-2">
                          <Input
                            value={ingredientInput}
                            onChange={(e) => setIngredientInput(e.target.value)}
                            onKeyDown={(e) => { if (e.key === "Enter") addEditingIngredient(); }}
                            placeholder="Add ingredient…"
                          />
                          <button
                            onClick={addEditingIngredient}
                            className="px-3 py-2 rounded-lg bg-orange-500 text-white hover:bg-orange-600"
                          >
                            <Plus size={14} />
                          </button>
                        </div>
                      </div>
                    ) : editingIngredients.length > 0 ? (() => {
                      const m = calculateMatch(pantryNames, editingIngredients);
                      return (
                        <>
                          <div className="flex flex-wrap gap-2">
                            {m.matched.map((ing) => {
                              const parsed = parseIngredientLine(ing);
                              const scaledQty = parsed.quantity ? scaleIngredientQuantity(parsed.quantity, servingMultiplier) : "";
                              return (
                                <span key={ing} className="inline-flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-full bg-green-100 text-green-700 font-medium">
                                  <Check size={14} /> {parsed.name}{scaledQty ? ` (${scaledQty})` : ""}
                                </span>
                              );
                            })}
                            {m.missing.map((ing) => {
                              const parsed = parseIngredientLine(ing);
                              const scaledQty = parsed.quantity ? scaleIngredientQuantity(parsed.quantity, servingMultiplier) : "";
                              return (
                                <span key={ing} className="inline-flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-full bg-red-50 text-red-600 font-medium">
                                  <ShoppingCart size={14} /> {parsed.name}{scaledQty ? ` (${scaledQty})` : ""}
                                </span>
                              );
                            })}
                          </div>
                          {m.missing.length > 0 && (() => {
                            const recipeForGrocery = { ...selectedRecipe, ingredients: editingIngredients } as Recipe;
                            const alreadyAdded = groceryAddedRecipeIds.includes(recipeForGrocery.id);
                            return (
                              <button
                                onClick={() => handleAddMissingToGrocery(recipeForGrocery)}
                                disabled={alreadyAdded}
                                className={`mt-3 flex items-center gap-2 text-sm font-semibold transition-colors ${alreadyAdded ? "text-muted-foreground cursor-not-allowed" : "text-orange-500 hover:text-orange-600"}`}
                              >
                                <ShoppingCart size={14} /> {alreadyAdded ? "Already added to grocery list" : `Add ${m.missing.length} missing items to grocery list`}
                              </button>
                            );
                          })()}
                        </>
                      );
                    })() : (
                      <p className="text-sm text-muted-foreground italic">No ingredients added yet.</p>
                    )}
                  </div>

                  {/* Instructions */}
                  {selectedInstructions.length > 0 ? (
                    <div>
                      <h3 className="text-sm font-semibold text-foreground mb-3">Instructions</h3>
                      <ol className="space-y-3">
                        {selectedInstructions.map((step, i) => (
                          <li key={i} className="flex gap-3 text-sm text-muted-foreground">
                            <span className="flex-shrink-0 w-6 h-6 bg-orange-100 text-orange-600 rounded-full flex items-center justify-center text-xs font-bold">
                              {i + 1}
                            </span>
                            <span>{step}</span>
                          </li>
                        ))}
                      </ol>
                    </div>
                  ) : (
                    <div className="text-sm text-muted-foreground italic">
                      No instructions available for this recipe.
                    </div>
                  )}

                  {/* Nutrition */}
                  <NutritionCard
                    recipeId={selectedRecipe.id}
                    recipeName={selectedRecipe.name}
                    ingredients={selectedIngredients}
                    servings={selectedRecipe.servings}
                  />

                  {/* Action buttons */}
                  <div className="flex gap-2">
                    <button
                      onClick={() => { setSelectedRecipe(null); setTweakingRecipe(selectedRecipe); }}
                      className="flex-1 flex items-center justify-center gap-2 bg-muted hover:bg-muted/80 text-foreground font-bold py-3 rounded-xl transition-colors border border-border"
                    >
                      <Wand2 size={16} /> AI Tweak
                    </button>
                    <button
                      onClick={() => { setSelectedRecipe(null); navigate(`/cook/${selectedRecipe.id}`); }}
                      className="flex-1 flex items-center justify-center gap-2 bg-orange-500 hover:bg-orange-600 text-white font-bold py-3 rounded-xl transition-colors"
                    >
                      <Play size={18} /> Start Cooking
                    </button>
                  </div>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* AI Tweak Dialog */}
      {tweakingRecipe && (
        <RecipeTweakDialog
          recipe={tweakingRecipe}
          open={!!tweakingRecipe}
          onOpenChange={(v) => { if (!v) setTweakingRecipe(null); }}
        />
      )}
    </div>
  );
}
