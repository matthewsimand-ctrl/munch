import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Play, ChefHat, Clock, Users, Grid3X3, List, Flame, Star, Search, X } from "lucide-react";
import { useStore } from "@/lib/store";
import { toast } from "sonner";
import { useDbRecipes } from "@/hooks/useDbRecipes";
import { useCurrentMealPlan } from "@/hooks/useCurrentMealPlan";
import type { Recipe } from "@/data/recipes";
import { normalizeRecipe } from "@/lib/normalizeRecipe";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";

export default function LetMeCook() {
  const navigate = useNavigate();
  const { likedRecipes, savedApiRecipes, likeRecipe } = useStore();
  const [view, setView] = useState<"grid" | "list">("grid");
  const [search, setSearch] = useState("");
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

  const filtered = useMemo(() => {
    if (!search.trim()) return recipes;
    return recipes.filter((r) => r.name.toLowerCase().includes(search.toLowerCase()));
  }, [recipes, search]);

  const featuredMeal = nextMeal || currentPlannedMeal;

  return (
    <div
      className="min-h-full"
      style={{ fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif", background: "#FFFAF5" }}
    >
      {/* Header */}
      <div
        className="relative overflow-hidden border-b"
        style={{
          background: "linear-gradient(135deg,#FFF7ED 0%,#FFFAF5 60%,#FFF3E4 100%)",
          borderColor: "rgba(249,115,22,0.12)",
        }}
      >
        {/* Dot texture */}
        <div
          className="absolute inset-0 opacity-25"
          style={{
            backgroundImage: "radial-gradient(circle, #FDA97440 1px, transparent 1px)",
            backgroundSize: "24px 24px",
          }}
        />
        <div className="relative max-w-5xl mx-auto px-6 py-7">
          <p className="text-[10px] font-bold text-orange-400 uppercase tracking-widest mb-1">
            Ready to cook?
          </p>
          <div className="flex items-end justify-between gap-4">
            <div>
              <h1
                className="text-3xl font-bold text-stone-900 leading-tight"
                style={{ fontFamily: "'Fraunces', Georgia, serif" }}
              >
                Let Me Cook
              </h1>
              <p className="text-sm text-stone-500 mt-1">
                {recipes.length} saved recipe{recipes.length !== 1 ? "s" : ""} · pick one to start
              </p>
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
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-6 space-y-5">

        {/* Up next from meal prep */}
        {!currentMealLoading && featuredMeal && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-2xl overflow-hidden border"
            style={{
              background: "linear-gradient(135deg,#FFF7ED 0%,#FFF3E4 100%)",
              borderColor: "rgba(249,115,22,0.20)",
              boxShadow: "0 4px 20px rgba(249,115,22,0.10)",
            }}
          >
            <div className="p-5 flex items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div
                  className="w-11 h-11 rounded-2xl flex items-center justify-center shrink-0"
                  style={{ background: "linear-gradient(135deg,#FB923C,#F97316)", boxShadow: "0 4px 12px rgba(249,115,22,0.35)" }}
                >
                  <Flame size={18} className="text-white" />
                </div>
                <div>
                  <p className="text-[10px] font-bold text-orange-500 uppercase tracking-widest mb-0.5">
                    Up next · From your meal plan
                  </p>
                  <h2 className="text-base font-bold text-stone-900" style={{ fontFamily: "'Fraunces', Georgia, serif" }}>
                    {featuredMeal.recipe_name}
                  </h2>
                </div>
              </div>
              <button
                onClick={() => navigate(`/cook/${featuredMeal.recipe_id}`)}
                className="flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold text-white transition-all hover:opacity-90 active:scale-95 shrink-0"
                style={{
                  background: "linear-gradient(135deg,#FB923C,#F97316,#EA580C)",
                  boxShadow: "0 4px 16px rgba(249,115,22,0.30)",
                }}
              >
                <Play size={14} fill="currentColor" />
                Start Cooking
              </button>
            </div>
          </motion.div>
        )}

        {/* Search */}
        {recipes.length > 4 && (
          <div className="relative">
            <Search size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-300" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search your recipes…"
              className="w-full pl-10 pr-10 py-3 rounded-xl border text-sm text-stone-700 placeholder:text-stone-300 outline-none focus:border-orange-300 transition-colors"
              style={{ background: "#fff", borderColor: "rgba(0,0,0,0.09)" }}
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-stone-300 hover:text-stone-500"
              >
                <X size={13} />
              </button>
            )}
          </div>
        )}

        {/* Empty state */}
        {recipes.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-2xl border p-14 text-center"
            style={{ background: "#fff", borderColor: "rgba(0,0,0,0.07)", boxShadow: "0 2px 12px rgba(28,25,23,0.05)" }}
          >
            <div className="w-20 h-20 rounded-2xl bg-orange-50 flex items-center justify-center text-4xl mx-auto mb-4">
              👨‍🍳
            </div>
            <p
              className="text-xl font-bold text-stone-800 mb-1"
              style={{ fontFamily: "'Fraunces', Georgia, serif" }}
            >
              No saved recipes yet
            </p>
            <p className="text-sm text-stone-400 mb-5">
              Save a recipe first, then come back here to start cooking.
            </p>
            <button
              onClick={() => navigate("/swipe")}
              className="px-5 py-2.5 rounded-full text-sm font-bold text-white transition-all hover:opacity-90"
              style={{
                background: "linear-gradient(135deg,#FB923C,#F97316,#EA580C)",
                boxShadow: "0 4px 16px rgba(249,115,22,0.30)",
              }}
            >
              Explore Recipes
            </button>
          </motion.div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center">
            <p className="text-stone-400 text-sm">No recipes match your search</p>
          </div>
        ) : (
          <AnimatePresence>
            {view === "grid" ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {filtered.map((recipe, i) => (
                  <GridCard key={recipe.id} recipe={recipe} index={i} onStart={() => navigate(`/cook/${recipe.id}`)} />
                ))}
              </div>
            ) : (
              <div
                className="rounded-2xl border overflow-hidden divide-y"
                style={{ background: "#fff", borderColor: "rgba(0,0,0,0.07)", divideColor: "rgba(0,0,0,0.05)" }}
              >
                {filtered.map((recipe, i) => (
                  <ListRow key={recipe.id} recipe={recipe} index={i} onStart={() => navigate(`/cook/${recipe.id}`)} />
                ))}
              </div>
            )}
          </AnimatePresence>
        )}
      </div>
    </div>
  );
}

function GridCard({ recipe, index, onStart }: { recipe: Recipe; index: number; onStart: () => void }) {
  const diff = recipe.difficulty ?? "medium";
  const diffColor =
    diff === "easy" ? { text: "#059669", bg: "#ECFDF5" } :
    diff === "medium" ? { text: "#D97706", bg: "#FFF3C4" } :
    { text: "#DC2626", bg: "#FEF2F2" };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04, duration: 0.35, ease: "easeOut" }}
      className="group rounded-2xl overflow-hidden border bg-white hover:border-orange-200 transition-all"
      style={{ borderColor: "rgba(0,0,0,0.07)", boxShadow: "0 2px 8px rgba(28,25,23,0.04)" }}
    >
      {/* Image */}
      <div className="relative aspect-[16/9] overflow-hidden bg-stone-100">
        {recipe.image && recipe.image !== "/placeholder.svg" ? (
          <img
            src={recipe.image}
            alt={recipe.name}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-4xl bg-gradient-to-br from-orange-50 to-amber-50">
            🍽️
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />
        <span
          className="absolute top-3 left-3 px-2 py-0.5 rounded-full text-[10px] font-bold"
          style={{ background: diffColor.bg, color: diffColor.text }}
        >
          {diff}
        </span>
      </div>

      {/* Content */}
      <div className="p-4">
        <p className="font-bold text-stone-800 line-clamp-1 mb-2 group-hover:text-orange-700 transition-colors"
          style={{ fontFamily: "'Fraunces', Georgia, serif" }}>
          {recipe.name}
        </p>
        <div className="flex items-center gap-3 text-xs text-stone-400 mb-4">
          <span className="flex items-center gap-1"><Clock size={11} /> {recipe.cook_time}</span>
          {recipe.servings && <span className="flex items-center gap-1"><Users size={11} /> {recipe.servings} servings</span>}
        </div>
        <button
          onClick={onStart}
          className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold text-white transition-all hover:opacity-90 active:scale-95"
          style={{
            background: "linear-gradient(135deg,#FB923C,#F97316,#EA580C)",
            boxShadow: "0 3px 12px rgba(249,115,22,0.30)",
          }}
        >
          <Play size={14} fill="currentColor" />
          Start Cooking
        </button>
      </div>
    </motion.div>
  );
}

function ListRow({ recipe, index, onStart }: { recipe: Recipe; index: number; onStart: () => void }) {
  const diff = recipe.difficulty ?? "medium";
  const diffColor =
    diff === "easy" ? "text-emerald-600 bg-emerald-50" :
    diff === "medium" ? "text-amber-600 bg-amber-50" :
    "text-red-600 bg-red-50";

  return (
    <motion.div
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.03, duration: 0.3, ease: "easeOut" }}
      className="flex items-center gap-4 p-4 group hover:bg-orange-50/40 transition-colors"
    >
      <div className="w-16 h-16 rounded-xl overflow-hidden bg-stone-100 shrink-0">
        {recipe.image && recipe.image !== "/placeholder.svg" ? (
          <img src={recipe.image} alt={recipe.name} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-2xl bg-gradient-to-br from-orange-50 to-amber-50">🍽️</div>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-stone-800 truncate group-hover:text-orange-700 transition-colors">
          {recipe.name}
        </p>
        <div className="flex items-center gap-2 mt-1 text-xs text-stone-400">
          <span className="flex items-center gap-1"><Clock size={11} /> {recipe.cook_time}</span>
          {recipe.servings && <span className="flex items-center gap-1"><Users size={11} /> {recipe.servings} servings</span>}
          <span className={`px-2 py-0.5 rounded-full font-semibold ${diffColor}`}>{diff}</span>
        </div>
      </div>
      <button
        onClick={onStart}
        className="flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-bold text-white transition-all hover:opacity-90 active:scale-95 shrink-0"
        style={{
          background: "linear-gradient(135deg,#FB923C,#F97316,#EA580C)",
          boxShadow: "0 3px 10px rgba(249,115,22,0.28)",
        }}
      >
        <Play size={13} fill="currentColor" />
        Cook
      </button>
    </motion.div>
  );
}
