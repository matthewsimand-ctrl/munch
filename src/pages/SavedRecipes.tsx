import { useState, useMemo, useEffect } from "react";
import {
  Search, FolderPlus, Folder, Clock,
  Filter, Grid3X3, List, Star, BookOpen, X, Trash2,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useStore } from "@/lib/store";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useBrowseFeed } from "@/hooks/useBrowseFeed";
import { calculateMatch } from "@/lib/matchLogic";
import RecipePreviewDialog from "@/components/RecipePreviewDialog";
import ImportRecipeDialog from "@/components/ImportRecipeDialog";
import CreateRecipeForm from "@/components/CreateRecipeForm";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import type { Recipe } from "@/data/recipes";

const getCookStats = (recipe: Recipe, rating?: number) => ({
  stars: rating ?? ((recipe.name.length % 2) + 4),
  timesCooked: (recipe.id.charCodeAt(0) % 12) + 3,
});

const SORT_OPTIONS = ["Recently Saved", "Cook Time", "Rating", "Name A–Z"];
const CUISINE_TAGS = ["All", "Italian", "Asian", "Mexican", "Mediterranean", "American", "Indian"];

function RecipeCard({
  recipe,
  view,
  rating,
  onCook,
  onUnsave,
}: {
  recipe: Recipe;
  view: "grid" | "list";
  rating?: number;
  onCook: () => void;
  onUnsave: () => void;
}) {
  const diff = recipe.difficulty ?? "medium";
  const diffColor =
    diff === "easy" ? "text-emerald-600 bg-emerald-50" :
    diff === "medium" ? "text-amber-600 bg-amber-50" :
    "text-red-600 bg-red-50";

  if (view === "list") {
    const { stars, timesCooked } = getCookStats(recipe, rating);
    return (
      <motion.div
        layout
        initial={{ opacity: 0, x: -8 }}
        animate={{ opacity: 1, x: 0 }}
        className="flex items-center gap-4 p-4 rounded-2xl group hover:bg-orange-50/60 transition-colors cursor-pointer border border-transparent hover:border-orange-100"
        onClick={onCook}
      >
        <div className="w-16 h-16 rounded-xl overflow-hidden shrink-0 bg-stone-100">
          {recipe.image && recipe.image !== "/placeholder.svg" ? (
            <img src={recipe.image} alt={recipe.name} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-2xl bg-gradient-to-br from-orange-50 to-amber-50">🍽️</div>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-stone-800 truncate text-sm group-hover:text-orange-700 transition-colors">
            {recipe.name}
          </p>
          <div className="flex items-center gap-3 mt-1 text-xs text-stone-400">
            <span className="flex items-center gap-1"><Clock size={11} /> {recipe.cook_time}</span>
            <span className={`px-2 py-0.5 rounded-full font-semibold ${diffColor}`}>{diff}</span>
            <span className="flex items-center gap-1 text-amber-500">
              <Star size={11} fill="currentColor" /> {stars.toFixed(1)}
            </span>
            <span>{timesCooked}x cooked</span>
          </div>
          {!!recipe.tags?.length && <p className="mt-1 text-xs text-stone-500 line-clamp-1">{recipe.tags.slice(0, 3).join(" • ")}</p>}
        </div>
        <button
          onClick={(e) => { e.stopPropagation(); onUnsave(); }}
          className="w-8 h-8 rounded-xl flex items-center justify-center text-stone-300 hover:text-red-400 hover:bg-red-50 transition-colors opacity-0 group-hover:opacity-100"
        >
          <Trash2 size={14} />
        </button>
      </motion.div>
    );
  }

  const { stars, timesCooked } = getCookStats(recipe, rating);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      className="group cursor-pointer"
      onClick={onCook}
    >
      <div className="relative rounded-2xl overflow-hidden aspect-[4/3] mb-3 bg-stone-100">
        {recipe.image && recipe.image !== "/placeholder.svg" ? (
          <img src={recipe.image} alt={recipe.name} className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-4xl bg-gradient-to-br from-orange-50 to-amber-50">🍽️</div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
        <button
          onClick={(e) => { e.stopPropagation(); onUnsave(); }}
          className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/30 backdrop-blur-sm flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500"
        >
          <X size={12} />
        </button>
        <div className="absolute bottom-2 left-2">
          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${diffColor}`}>{diff}</span>
        </div>
        <div className="absolute bottom-2 right-2 flex items-center gap-1 bg-black/30 backdrop-blur-sm px-2 py-0.5 rounded-full text-amber-400 text-[10px] font-bold">
          <Star size={9} fill="currentColor" /> {stars.toFixed(1)}
        </div>
      </div>
      <p className="text-sm font-semibold text-stone-800 line-clamp-2 leading-snug mb-1 group-hover:text-orange-600 transition-colors">
        {recipe.name}
      </p>
      <div className="flex items-center gap-2 text-xs text-stone-400">
        <Clock size={11} /> {recipe.cook_time}
        <span className="w-1 h-1 rounded-full bg-stone-300" />
        <span>{timesCooked}x cooked</span>
        {recipe.cuisine && <><span className="w-1 h-1 rounded-full bg-stone-300" /><span>{recipe.cuisine}</span></>}
      </div>
      {!!recipe.tags?.length && <p className="text-[11px] text-stone-500 mt-1 line-clamp-1">{recipe.tags.slice(0, 3).join(" • ")}</p>}
    </motion.div>
  );
}

export default function MyRecipesScreen() {
  const navigate = useNavigate();
  const {
    likedRecipes, savedApiRecipes, unlikeRecipe,
    recipeFolders, addFolder, removeFolder,
    recipeRatings, pantryList,
  } = useStore();
  const { loaded: exploreLoaded, loadFeed } = useBrowseFeed();
  const [search, setSearch] = useState("");
  const [view, setView] = useState<"grid" | "list">("grid");
  const [sortBy, setSortBy] = useState(SORT_OPTIONS[0]);
  const [activeCuisine, setActiveCuisine] = useState("All");
  const [activeFolder, setActiveFolder] = useState<string | null>(null);
  const [showNewFolder, setShowNewFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [displayName, setDisplayName] = useState<string>("My");
  const [previewRecipe, setPreviewRecipe] = useState<Recipe | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [showManualRecipeDialog, setShowManualRecipeDialog] = useState(false);

  useEffect(() => {
    const loadName = async () => {
      const { data: sessionData } = await supabase.auth.getSession();
      const userId = sessionData.session?.user?.id;
      if (!userId) return;
      const { data } = await supabase.from("profiles").select("display_name").eq("user_id", userId).single();
      if (data?.display_name) setDisplayName(data.display_name);
    };
    loadName();
  }, []);

  const savedRecipes = useMemo<Recipe[]>(
    () => likedRecipes.map((id) => savedApiRecipes[id]).filter(Boolean),
    [likedRecipes, savedApiRecipes],
  );
  const pantryNames = useMemo(() => pantryList.map((item) => item.name), [pantryList]);

  useEffect(() => {
    if (!exploreLoaded) loadFeed();
  }, [exploreLoaded, loadFeed]);

  const filtered = useMemo(() => {
    let list = savedRecipes;
    if (search) list = list.filter((r) => r.name.toLowerCase().includes(search.toLowerCase()));
    if (activeCuisine !== "All") list = list.filter((r) => r.cuisine?.toLowerCase() === activeCuisine.toLowerCase());
    if (sortBy === "Cook Time") list = [...list].sort((a, b) => parseInt(a.cook_time || "0") - parseInt(b.cook_time || "0"));
    if (sortBy === "Name A–Z") list = [...list].sort((a, b) => a.name.localeCompare(b.name));
    if (sortBy === "Rating") list = [...list].sort((a, b) => (recipeRatings?.[b.id] ?? 0) - (recipeRatings?.[a.id] ?? 0));
    return list;
  }, [savedRecipes, search, activeCuisine, sortBy, recipeRatings]);

  const handleAddFolder = () => {
    if (!newFolderName.trim()) return;
    addFolder(newFolderName.trim());
    setNewFolderName("");
    setShowNewFolder(false);
    toast.success(`Created "${newFolderName.trim()}"`);
  };

  const handleUnsave = (id: string) => {
    unlikeRecipe(id);
    toast.success("Removed from cookbook");
  };

  const openPreview = (recipe: Recipe) => {
    setPreviewRecipe(recipe);
    setPreviewOpen(true);
  };

  const previewMatch = previewRecipe ? calculateMatch(pantryNames, previewRecipe.ingredients || []) : null;

  return (
    <div className="min-h-full" style={{ fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif", background: "#FFFAF5" }}>

      {/* Header */}
      <div
        className="border-b px-6 pt-6 pb-0"
        style={{ background: "linear-gradient(135deg,#FFF7ED 0%,#FFFAF5 100%)", borderColor: "rgba(249,115,22,0.12)" }}
      >
        <div className="max-w-6xl mx-auto">
          <div className="flex items-start justify-between mb-5">
            <div>
              <p className="text-[10px] font-bold text-orange-400 uppercase tracking-widest mb-1">Your collection</p>
              <h1 className="text-2xl font-bold text-stone-900" style={{ fontFamily: "'Fraunces', Georgia, serif" }}>
                {displayName}'s Recipes
              </h1>
              <p className="text-xs text-stone-400 mt-1">{savedRecipes.length} saved recipe{savedRecipes.length !== 1 ? "s" : ""}</p>
            </div>
            <div className="flex items-center gap-2">
              <button className="px-3 py-2 rounded-xl text-xs font-semibold bg-orange-500 text-white">
                My Recipes
              </button>
              <ImportRecipeDialog>
                <button className="px-3 py-2 rounded-xl bg-white border border-stone-200 text-xs font-semibold text-stone-600 hover:border-orange-300">
                  Import
                </button>
              </ImportRecipeDialog>
              <button
                onClick={() => setShowManualRecipeDialog(true)}
                className="px-3 py-2 rounded-xl bg-white border border-stone-200 text-xs font-semibold text-stone-600 hover:border-orange-300"
              >
                Add Manual
              </button>
              <button
                onClick={() => setView(view === "grid" ? "list" : "grid")}
                className="w-9 h-9 rounded-xl bg-white border border-stone-200 flex items-center justify-center text-stone-500 hover:border-orange-300 hover:text-orange-500 transition-colors"
              >
                {view === "grid" ? <List size={16} /> : <Grid3X3 size={16} />}
              </button>
            </div>
          </div>

          {/* Folders */}
          <div className="flex items-center gap-2 pb-4 overflow-x-auto scrollbar-hide">
            <button
              onClick={() => setActiveFolder(null)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
                !activeFolder ? "bg-stone-900 text-white" : "bg-white border border-stone-200 text-stone-600 hover:border-stone-300"
              }`}
            >
              <BookOpen size={11} /> All Recipes
            </button>
            {(recipeFolders ?? []).map((folder) => (
              <button
                key={folder.id}
                onClick={() => setActiveFolder(folder.id === activeFolder ? null : folder.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all group ${
                  activeFolder === folder.id ? "bg-stone-900 text-white" : "bg-white border border-stone-200 text-stone-600 hover:border-stone-300"
                }`}
              >
                <Folder size={11} /> {folder.name}
                <span
                  onClick={(e) => { e.stopPropagation(); removeFolder(folder.id); }}
                  className={`ml-0.5 opacity-0 group-hover:opacity-100 hover:text-red-400 transition-opacity ${activeFolder === folder.id ? "text-white/60" : ""}`}
                >
                  <X size={9} />
                </span>
              </button>
            ))}
            {showNewFolder ? (
              <div className="flex items-center gap-1.5 bg-white border border-orange-300 rounded-full px-2 py-1">
                <input
                  autoFocus
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") handleAddFolder(); if (e.key === "Escape") setShowNewFolder(false); }}
                  placeholder="Folder name…"
                  className="text-xs outline-none w-24 text-stone-700 placeholder:text-stone-300"
                />
                <button onClick={handleAddFolder} className="text-orange-500 font-bold text-xs">Add</button>
              </div>
            ) : (
              <button
                onClick={() => setShowNewFolder(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold text-stone-400 border border-dashed border-stone-300 hover:border-orange-300 hover:text-orange-500 transition-colors whitespace-nowrap"
              >
                <FolderPlus size={11} /> New folder
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="max-w-6xl mx-auto px-6 py-4">
        <div className="flex items-center gap-3 mb-4">
          {/* Search */}
          <div className="flex-1 relative">
            <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-300" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search your recipes…"
              className="w-full pl-9 pr-4 py-2.5 rounded-xl border text-sm text-stone-700 placeholder:text-stone-300 outline-none focus:border-orange-300 transition-colors"
              style={{ background: "#fff", borderColor: "rgba(0,0,0,0.09)" }}
            />
            {search && (
              <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-300 hover:text-stone-500">
                <X size={13} />
              </button>
            )}
          </div>

          {/* Sort */}
          <div className="relative">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="appearance-none pl-3 pr-8 py-2.5 rounded-xl border text-xs font-semibold text-stone-600 outline-none cursor-pointer"
              style={{ background: "#fff", borderColor: "rgba(0,0,0,0.09)" }}
            >
              {SORT_OPTIONS.map((o) => <option key={o}>{o}</option>)}
            </select>
            <Filter size={12} className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 pointer-events-none" />
          </div>
        </div>

        {/* Cuisine filter */}
        <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
          {CUISINE_TAGS.map((c) => (
            <button
              key={c}
              onClick={() => setActiveCuisine(c)}
              className="px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap transition-all"
              style={
                activeCuisine === c
                  ? { background: "linear-gradient(135deg,#FB923C,#F97316)", color: "#fff", boxShadow: "0 2px 8px rgba(249,115,22,0.25)" }
                  : { background: "#fff", color: "#57534E", border: "1px solid rgba(0,0,0,0.08)" }
              }
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="max-w-6xl mx-auto px-6 pb-10">
        {savedRecipes.length === 0 ? (
          <div className="py-20 flex flex-col items-center gap-4 text-center">
            <div className="w-20 h-20 rounded-2xl bg-orange-50 flex items-center justify-center text-4xl">📖</div>
            <div>
              <p className="font-bold text-stone-700 text-lg" style={{ fontFamily: "'Fraunces', Georgia, serif" }}>
                Your cookbook is empty
              </p>
              <p className="text-sm text-stone-400 mt-1">Start swiping to save your favourite recipes</p>
            </div>
            <button
              onClick={() => navigate("/swipe")}
              className="px-5 py-2.5 rounded-full text-sm font-bold text-white"
              style={{ background: "linear-gradient(135deg,#FB923C,#F97316,#EA580C)", boxShadow: "0 4px 16px rgba(249,115,22,0.30)" }}
            >
              Discover Recipes
            </button>
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center">
            <p className="text-stone-400 text-sm">No recipes match your search</p>
          </div>
        ) : (
          <AnimatePresence>
            <div className={view === "grid" ? "grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-5" : "space-y-1"}>
              {filtered.map((recipe) => (
                <RecipeCard
                  key={recipe.id}
                  recipe={recipe}
                  view={view}
                  rating={recipeRatings?.[recipe.id]}
                  onCook={() => openPreview(recipe)}
                  onUnsave={() => handleUnsave(recipe.id)}
                />
              ))}
            </div>
          </AnimatePresence>
        )}
      </div>

      <RecipePreviewDialog
        recipe={previewRecipe}
        match={previewMatch}
        open={previewOpen}
        onOpenChange={setPreviewOpen}
      />

      <Dialog open={showManualRecipeDialog} onOpenChange={setShowManualRecipeDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add Manual Recipe</DialogTitle>
          </DialogHeader>
          <CreateRecipeForm onClose={() => setShowManualRecipeDialog(false)} />
        </DialogContent>
      </Dialog>
    </div>
  );
}
