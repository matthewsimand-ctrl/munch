import { useState, useMemo } from "react";
import {
  Heart, Clock, Users, Search, Filter, Trash2, ChevronDown,
  Plus, FolderOpen, X, Tag, Edit2, Check, ChefHat, Play,
  FolderPlus, MoreHorizontal, ShoppingCart, Import,
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useStore } from "@/lib/store";
import { useDbRecipes } from "@/hooks/useDbRecipes";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import NutritionCard from "@/components/NutritionCard";
import ImportRecipeDialog from "@/components/ImportRecipeDialog";
import CreateRecipeForm from "@/components/CreateRecipeForm";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { calculateMatch } from "@/lib/matchLogic";
import { toast } from "sonner";
import type { Recipe } from "@/data/recipes";

type SortOption = "newest" | "time" | "name";
type ViewMode = "all" | "folder";

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
    recipeTags, addRecipeTag, removeRecipeTag,
    recipeFolders, createFolder, renameFolder, deleteFolder,
    addRecipeToFolder, removeRecipeFromFolder,
    addCustomGroceryItem,
  } = useStore();
  const { data: dbRecipes = [] } = useDbRecipes();

  const [search, setSearch] = useState("");
  const [activeTag, setActiveTag] = useState("All");
  const [sort, setSort] = useState<SortOption>("newest");
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>("all");
  const [activeFolderId, setActiveFolderId] = useState<string | null>(null);
  const [showCreateRecipe, setShowCreateRecipe] = useState(false);

  // Tag editing
  const [editingTagsFor, setEditingTagsFor] = useState<string | null>(null);
  const [newTagInput, setNewTagInput] = useState("");

  // Folder creation
  const [showNewFolder, setShowNewFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [renamingFolder, setRenamingFolder] = useState<string | null>(null);
  const [renameInput, setRenameInput] = useState("");

  // Resolve all saved recipes from DB + saved API cache
  const allSavedRecipes: Recipe[] = useMemo(() => {
    return likedRecipes
      .map((id) => {
        const dbRecipe = dbRecipes.find((r) => r.id === id);
        if (dbRecipe) return normalizeRecipeData(dbRecipe, id);

        const apiRecipe = savedApiRecipes[id];
        if (apiRecipe) return normalizeRecipeData(apiRecipe, id);

        return null;
      })
      .filter(Boolean) as Recipe[];
  }, [likedRecipes, dbRecipes, savedApiRecipes]);

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
    if (viewMode === "folder" && activeFolderId) {
      const folder = recipeFolders.find((f) => f.id === activeFolderId);
      if (folder) {
        list = list.filter((r) => folder.recipeIds.includes(r.id));
      }
    }

    // Filter by tag
    if (activeTag !== "All") {
      list = list.filter((r) => {
        const userTags = recipeTags[r.id] || [];
        return (r.tags || []).includes(activeTag) || userTags.includes(activeTag);
      });
    }

    // Search
    if (search) {
      const q = search.toLowerCase();
      list = list.filter((r) => r.name.toLowerCase().includes(q));
    }

    // Sort
    list = [...list].sort((a, b) => {
      if (sort === "time") return parseInt(a.cook_time || "0") - parseInt(b.cook_time || "0");
      if (sort === "name") return a.name.localeCompare(b.name);
      return 0;
    });

    return list;
  }, [allSavedRecipes, viewMode, activeFolderId, recipeFolders, activeTag, recipeTags, search, sort]);

  const pantryNames = pantryList.map((p) => p.name);
  const selectedIngredients = selectedRecipe ? normalizeStringArray((selectedRecipe as any).ingredients) : [];
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

  const handleCreateFolder = () => {
    if (newFolderName.trim()) {
      createFolder(newFolderName.trim());
      setNewFolderName("");
      setShowNewFolder(false);
      toast.success("Folder created");
    }
  };

  const handleRenameFolder = (folderId: string) => {
    if (renameInput.trim()) {
      renameFolder(folderId, renameInput.trim());
      setRenamingFolder(null);
      setRenameInput("");
    }
  };

  const handleAddMissingToGrocery = (recipe: Recipe) => {
    const match = calculateMatch(pantryNames, recipe.ingredients || []);
    if (match.missing.length === 0) {
      toast.info("You already have all the ingredients!");
      return;
    }
    match.missing.forEach((ing) => addCustomGroceryItem(ing));
    toast.success(`Added ${match.missing.length} items to grocery list`);
  };

  // Get folder names for a recipe
  const getFolderNames = (recipeId: string) => {
    return recipeFolders.filter((f) => f.recipeIds.includes(recipeId)).map((f) => f.name);
  };

  const activeFolder = recipeFolders.find((f) => f.id === activeFolderId);

  return (
    <div className="min-h-full bg-muted/30">
      {/* Header */}
      <div className="bg-background border-b border-border px-6 py-5">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl font-bold text-orange-500">Saved Recipes</h1>
              <p className="text-sm text-muted-foreground mt-0.5">
                {allSavedRecipes.length} recipes in your collection
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
                placeholder="Search your recipes…"
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

      {/* Tabs: All / Folders */}
      <div className="bg-background border-b border-border px-6 py-3">
        <div className="max-w-7xl mx-auto flex items-center gap-4">
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => { setViewMode("all"); setActiveFolderId(null); setActiveTag("All"); }}
              className={`text-xs font-semibold px-3.5 py-1.5 rounded-full border transition-all ${
                viewMode === "all"
                  ? "bg-orange-500 text-white border-orange-500"
                  : "bg-background text-muted-foreground border-border hover:border-foreground/30"
              }`}
            >
              All Recipes
            </button>
            {recipeFolders.map((folder) => (
              <button
                key={folder.id}
                onClick={() => { setViewMode("folder"); setActiveFolderId(folder.id); }}
                className={`text-xs font-semibold px-3.5 py-1.5 rounded-full border transition-all flex items-center gap-1 ${
                  viewMode === "folder" && activeFolderId === folder.id
                    ? "bg-orange-500 text-white border-orange-500"
                    : "bg-background text-muted-foreground border-border hover:border-foreground/30"
                }`}
              >
                <FolderOpen size={11} /> {folder.name}
                <span className="text-[10px] opacity-70">({folder.recipeIds.length})</span>
              </button>
            ))}
            <button
              onClick={() => setShowNewFolder(true)}
              className="text-xs font-semibold px-3 py-1.5 rounded-full border border-dashed border-border text-muted-foreground hover:border-orange-300 hover:text-orange-500 transition-all flex items-center gap-1"
            >
              <FolderPlus size={11} /> New Folder
            </button>
          </div>

          {/* Folder actions */}
          {viewMode === "folder" && activeFolder && (
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
                <DropdownMenuItem className="text-destructive" onClick={() => { deleteFolder(activeFolder.id); setViewMode("all"); setActiveFolderId(null); toast.success("Folder deleted"); }}>
                  <Trash2 size={12} className="mr-2" /> Delete Folder
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>

      {/* Tag filters */}
      <div className="bg-background border-b border-border px-6 py-2.5">
        <div className="max-w-7xl mx-auto flex gap-2 overflow-x-auto scrollbar-hide pb-0.5">
          {allTags.map((tag) => (
            <button
              key={tag}
              onClick={() => setActiveTag(tag)}
              className={`shrink-0 text-xs font-semibold px-3 py-1.5 rounded-full border transition-all ${
                activeTag === tag
                  ? "bg-orange-500 text-white border-orange-500"
                  : "bg-background text-muted-foreground border-border hover:border-foreground/30"
              }`}
            >
              {tag}
            </button>
          ))}
        </div>
      </div>

      {/* Grid */}
      <div className="max-w-7xl mx-auto px-6 py-6">
        {visibleRecipes.length === 0 ? (
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
                    <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />

                    {/* Remove button */}
                    <button
                      onClick={(e) => { e.stopPropagation(); handleRemove(recipe.id); }}
                      className="absolute top-2.5 right-2.5 w-7 h-7 rounded-full bg-black/20 backdrop-blur-sm flex items-center justify-center text-white/80 hover:bg-red-500/80 hover:text-white opacity-0 group-hover:opacity-100 transition-all"
                      title="Remove"
                    >
                      <Trash2 size={12} />
                    </button>

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

                    <div className="flex items-center gap-3 text-xs text-muted-foreground mb-2.5">
                      <span className="flex items-center gap-1"><Clock size={11} /> {recipe.cook_time}</span>
                      {recipe.servings && <span className="flex items-center gap-1"><Users size={11} /> {recipe.servings}</span>}
                    </div>

                    {/* Folder indicators */}
                    {folderNames.length > 0 && (
                      <div className="flex flex-wrap gap-1 mb-2">
                        {folderNames.map((name) => (
                          <span key={name} className="inline-flex items-center gap-0.5 text-[10px] bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded-full font-medium">
                            <FolderOpen size={8} /> {name}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Tags with edit */}
                    <div className="flex flex-wrap gap-1 mb-2">
                      {allRecipeTags.slice(0, 3).map((t) => (
                        <span key={t} className="text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded-full">
                          {t}
                        </span>
                      ))}
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

                    {/* Folder assignment */}
                    {recipeFolders.length > 0 && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button className="text-xs text-muted-foreground hover:text-orange-500 flex items-center gap-1 mb-2">
                            <FolderPlus size={10} /> Add to folder
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
                    )}

                    <div className="flex items-center justify-between pt-2.5 border-t border-border">
                      <span className="text-xs text-muted-foreground">{recipe.difficulty}</span>
                      <button
                        onClick={() => setSelectedRecipe(recipe)}
                        className="text-xs text-orange-500 font-semibold hover:text-orange-600 transition-colors"
                      >
                        View Recipe →
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* New Folder Dialog */}
      <Dialog open={showNewFolder} onOpenChange={setShowNewFolder}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Create Folder</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Input
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") handleCreateFolder(); }}
              placeholder="Folder name…"
              autoFocus
            />
            <div className="flex justify-end gap-2">
              <button onClick={() => setShowNewFolder(false)} className="text-sm text-muted-foreground hover:text-foreground px-3 py-1.5">Cancel</button>
              <button onClick={handleCreateFolder} className="text-sm bg-orange-500 hover:bg-orange-600 text-white font-semibold px-4 py-1.5 rounded-lg">Create</button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Rename Folder Dialog */}
      <Dialog open={!!renamingFolder} onOpenChange={() => setRenamingFolder(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Rename Folder</DialogTitle>
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
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>Add a Recipe</DialogTitle>
          </DialogHeader>
          <ScrollArea className="flex-1 -mx-6 px-6">
            <CreateRecipeForm onClose={() => setShowCreateRecipe(false)} />
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
              </DialogHeader>
              <ScrollArea className="flex-1 -mx-6 px-6">
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

                  {/* Ingredients with match */}
                  {selectedRecipe.ingredients && selectedRecipe.ingredients.length > 0 && (() => {
                    const m = calculateMatch(pantryNames, selectedRecipe.ingredients);
                    return (
                      <div>
                        <h3 className="text-sm font-semibold text-foreground mb-3">
                          Ingredients
                          <span className={`ml-2 text-xs font-bold px-2 py-0.5 rounded-full text-white ${
                            m.percentage >= 80 ? "bg-green-500" : m.percentage >= 50 ? "bg-yellow-500" : "bg-orange-500"
                          }`}>
                            {m.percentage}% match
                          </span>
                        </h3>
                        <div className="flex flex-wrap gap-2">
                          {m.matched.map((ing) => (
                            <span key={ing} className="inline-flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-full bg-green-100 text-green-700 font-medium">
                              <Check size={14} /> {ing}
                            </span>
                          ))}
                          {m.missing.map((ing) => (
                            <span key={ing} className="inline-flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-full bg-red-50 text-red-600 font-medium">
                              <ShoppingCart size={14} /> {ing}
                            </span>
                          ))}
                        </div>
                        {m.missing.length > 0 && (
                          <button
                            onClick={() => handleAddMissingToGrocery(selectedRecipe)}
                            className="mt-3 flex items-center gap-2 text-sm text-orange-500 hover:text-orange-600 font-semibold transition-colors"
                          >
                            <ShoppingCart size={14} /> Add {m.missing.length} missing items to grocery list
                          </button>
                        )}
                      </div>
                    );
                  })()}

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
                    ingredients={selectedRecipe.ingredients || []}
                    servings={selectedRecipe.servings}
                  />

                  {/* Start cooking */}
                  <button
                    onClick={() => { setSelectedRecipe(null); navigate(`/cook/${selectedRecipe.id}`); }}
                    className="w-full flex items-center justify-center gap-2 bg-orange-500 hover:bg-orange-600 text-white font-bold py-3 rounded-xl transition-colors"
                  >
                    <Play size={18} /> Start Cooking
                  </button>
                </div>
              </ScrollArea>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
