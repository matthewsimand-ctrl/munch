import { useState, useMemo, useCallback, useEffect, useRef } from "react";
import {
  Heart, X, Clock, ChefHat, Flame, Filter,
  ChevronDown, Sparkles,
} from "lucide-react";
import { motion, AnimatePresence, useMotionValue, useTransform } from "framer-motion";
import { useStore } from "@/lib/store";
import { useBrowseFeed } from "@/hooks/useBrowseFeed";
import { calculateMatch } from "@/lib/matchLogic";
import MatchBadge from "@/components/MatchBadge";
import { toast } from "sonner";
import type { Recipe } from "@/data/recipes";
import RecipePreviewDialog from "@/components/RecipePreviewDialog";
import { Input } from "@/components/ui/input";

/* ── Filter pill ───────────────────────────────────────────── */
function FilterPill({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all whitespace-nowrap"
      style={
        active
          ? {
              background: "linear-gradient(135deg,#FB923C,#F97316)",
              color: "#fff",
              boxShadow: "0 2px 8px rgba(249,115,22,0.30)",
            }
          : {
              background: "#fff",
              color: "#57534E",
              border: "1px solid rgba(0,0,0,0.08)",
            }
      }
    >
      {label}
    </button>
  );
}

/* ── Swipe card ────────────────────────────────────────────── */
function SwipeCard({
  recipe,
  matchPercent,
  onSwipeLeft,
  onSwipeRight,
  isTop,
  onOpenDetails,
  onChefClick,
}: {
  recipe: Recipe;
  matchPercent: number;
  onSwipeLeft: () => void;
  onSwipeRight: () => void;
  isTop: boolean;
  onOpenDetails: () => void;
  onChefClick: (chef: string) => void;
}) {
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const didMoveRef = useRef(false);
  const rotate = useTransform(x, [-200, 200], [-18, 18]);
  const likeOpacity = useTransform(x, [20, 100], [0, 1]);
  const nopeOpacity = useTransform(x, [-100, -20], [1, 0]);

  const handleDragEnd = (_: unknown, info: { offset: { x: number; y: number } }) => {
    if (info.offset.x > 100) { onSwipeRight(); return; }
    if (info.offset.x < -100) { onSwipeLeft(); return; }
  };

  const diffBadge =
    recipe.difficulty === "easy"
      ? { label: "Easy", color: "#059669", bg: "#ECFDF5" }
      : recipe.difficulty === "medium"
      ? { label: "Med", color: "#D97706", bg: "#FFF3C4" }
      : { label: "Hard", color: "#DC2626", bg: "#FEF2F2" };

  return (
    <motion.div
      drag={isTop}
      dragElastic={0.12}
      onDragEnd={handleDragEnd}
      onPanStart={() => {
        didMoveRef.current = false;
      }}
      onPan={(_, info) => {
        if (Math.hypot(info.offset.x, info.offset.y) > 8) {
          didMoveRef.current = true;
        }
      }}
      style={{ x, y, rotate, touchAction: "none" }}
      className="absolute inset-0 cursor-grab active:cursor-grabbing select-none"
      whileDrag={{ scale: 1.02 }}
      onTap={() => {
        if (isTop && !didMoveRef.current) onOpenDetails();
      }}
    >
      {/* Card */}
      <div
        className="w-full h-full rounded-3xl overflow-hidden relative"
        style={{ boxShadow: "0 20px 60px rgba(28,25,23,0.20), 0 4px 16px rgba(28,25,23,0.10)" }}
      >
        {/* Hero image */}
        {recipe.image && recipe.image !== "/placeholder.svg" ? (
          <img src={recipe.image} alt={recipe.name} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-8xl bg-gradient-to-br from-orange-50 via-amber-50 to-yellow-50">
            🍽️
          </div>
        )}

        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/10 to-transparent" />

        {/* Top badges */}
        <div className="absolute top-4 left-4 right-4 flex items-start justify-between">
          <div className="flex flex-col gap-2">
            {matchPercent >= 80 && (
              <span
                className="px-2.5 py-1 rounded-full text-xs font-bold flex items-center gap-1"
                style={{ background: "rgba(249,115,22,0.90)", color: "#fff", backdropFilter: "blur(8px)" }}
              >
                <Sparkles size={10} /> Great match!
              </span>
            )}
          </div>
          <MatchBadge percentage={matchPercent} />
        </div>

        {/* Swipe indicators */}
        {isTop && (
          <>
            <motion.div
              style={{ opacity: likeOpacity }}
              className="absolute top-8 left-6 px-4 py-2 rounded-xl border-4 border-emerald-400 text-emerald-400 font-black text-2xl rotate-[-15deg]"
            >
              SAVE
            </motion.div>
            <motion.div
              style={{ opacity: nopeOpacity }}
              className="absolute top-8 right-6 px-4 py-2 rounded-xl border-4 border-red-400 text-red-400 font-black text-2xl rotate-[15deg]"
            >
              SKIP
            </motion.div>
          </>
        )}

        {/* Bottom info */}
        <div className="absolute bottom-0 left-0 right-0 p-5">
          <div className="flex items-center gap-2 mb-2">
            {recipe.cuisine && (
              <span
                className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider"
                style={{ background: "rgba(255,255,255,0.15)", color: "#fff", backdropFilter: "blur(4px)" }}
              >
                {recipe.cuisine}
              </span>
            )}
            <span
              className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider"
              style={{ background: diffBadge.bg, color: diffBadge.color }}
            >
              {diffBadge.label}
            </span>
          </div>

          <h2
            className="text-white text-2xl font-bold leading-tight mb-3"
            style={{ fontFamily: "'Fraunces', Georgia, serif", textShadow: "0 1px 8px rgba(0,0,0,0.4)" }}
          >
            {recipe.name}
          </h2>

          <div className="flex items-center gap-4 text-white/80 text-sm">
            <span className="flex items-center gap-1.5">
              <Clock size={13} />
              {recipe.cook_time}
            </span>
            {recipe.chef && (
              <button
                onClick={(e) => { e.stopPropagation(); onChefClick(recipe.chef!); }}
                className="underline underline-offset-2 text-orange-200 hover:text-orange-100"
              >
                {recipe.chef}
              </button>
            )}
            {recipe.servings && (
              <span className="flex items-center gap-1.5">
                <ChefHat size={13} />
                Serves {recipe.servings}
              </span>
            )}
            {recipe.calories && (
              <span className="flex items-center gap-1.5">
                <Flame size={13} />
                {recipe.calories} cal
              </span>
            )}
          </div>
          {(recipe.protein || recipe.carbs || recipe.fat) && (
            <p className="mt-2 text-xs text-white/80">
              {recipe.protein ? `${Math.round(recipe.protein)}g protein` : null}
              {recipe.carbs ? ` • ${Math.round(recipe.carbs)}g carbs` : null}
              {recipe.fat ? ` • ${Math.round(recipe.fat)}g fat` : null}
            </p>
          )}
        </div>
      </div>
    </motion.div>
  );
}

/* ── Main ──────────────────────────────────────────────────── */
const FILTERS = ["All", "Quick (<30 min)", "Vegetarian", "High Protein", "Easy", "Asian", "Italian", "Mexican"];

export default function SwipeScreen() {
  const { recipes, loading, loaded, loadFeed } = useBrowseFeed();
  const { likedRecipes, likeRecipe, pantryList, addCustomGroceryItem } = useStore();

  const [cardIndex, setCardIndex] = useState(0);
  const [activeFilter, setActiveFilter] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedChef, setSelectedChef] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [previewRecipe, setPreviewRecipe] = useState<Recipe | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [swipeFeedback, setSwipeFeedback] = useState<"saved" | "skipped" | null>(null);

  const pantryNames = useMemo(() => pantryList.map((p) => p.name), [pantryList]);
  const likedSet = useMemo(() => new Set(likedRecipes), [likedRecipes]);

  const filtered = useMemo(() => {
    let byFilter = recipes;
    if (activeFilter === "Quick (<30 min)") {
      byFilter = recipes.filter((r) => {
        const m = parseInt(r.cook_time || "99");
        return m <= 30;
      });
    } else if (activeFilter === "Easy") {
      byFilter = recipes.filter((r) => r.difficulty === "easy");
    } else if (activeFilter !== "All") {
      byFilter = recipes.filter(
        (r) =>
          r.tags?.some((t: string) => t.toLowerCase().includes(activeFilter.toLowerCase())) ||
          r.cuisine?.toLowerCase().includes(activeFilter.toLowerCase()),
      );
    }

    if (selectedChef) {
      byFilter = byFilter.filter((r) => (r.chef || "").toLowerCase() === selectedChef.toLowerCase());
    }

    const normalizedQuery = searchQuery.trim().toLowerCase();
    if (normalizedQuery) {
      byFilter = byFilter.filter((recipe) => {
        const tags = recipe.tags?.join(" ") || "";
        const ingredients = recipe.ingredients?.join(" ") || "";
        const instructions = recipe.instructions?.join(" ") || "";
        const searchableText = [recipe.name, tags, ingredients, instructions, recipe.chef || ""]
          .join(" ")
          .toLowerCase();

        return searchableText.includes(normalizedQuery);
      });
    }

    return byFilter;
  }, [recipes, activeFilter, selectedChef, searchQuery]);

  const stack = useMemo(() => filtered.slice(cardIndex, cardIndex + 3), [filtered, cardIndex]);
  const current = stack[0];
  const currentMatch = current ? calculateMatch(pantryNames, current.ingredients || []) : null;

  const advance = useCallback(() => setCardIndex((i) => i + 1), []);

  const handleSave = useCallback(() => {
    if (!current) return;
    likeRecipe(current.id, current);
    setSwipeFeedback("saved");
    setTimeout(() => setSwipeFeedback(null), 420);
    toast.success(`❤️ Saved "${current.name}" to cookbook`);
    advance();
  }, [current, likeRecipe, advance]);

  const handleSkip = useCallback(() => {
    if (!current) return;
    setSwipeFeedback("skipped");
    setTimeout(() => setSwipeFeedback(null), 420);
    advance();
  }, [current, advance]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (!current || previewOpen) return;
      if (event.key === "ArrowLeft") {
        event.preventDefault();
        handleSkip();
      }
      if (event.key === "ArrowRight") {
        event.preventDefault();
        handleSave();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [current, previewOpen, handleSave, handleSkip]);


  useEffect(() => {
    if (!loaded) {
      loadFeed();
    }
  }, [loaded, loadFeed]);

  return (
    <div className="min-h-full flex flex-col" style={{ fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif", background: "#FFFAF5" }}>

      {/* Header */}
      <div
        className="border-b px-6 py-4"
        style={{ background: "linear-gradient(135deg,#FFF7ED 0%,#FFFAF5 100%)", borderColor: "rgba(249,115,22,0.12)" }}
      >
        <div className="max-w-2xl mx-auto">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h1 className="text-xl font-bold text-stone-900" style={{ fontFamily: "'Fraunces', Georgia, serif" }}>
                Discover Recipes
              </h1>
              <p className="text-xs text-stone-400 mt-0.5">
                {filtered.length - cardIndex} recipes left to explore
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowFilters((v) => !v)}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white border text-sm font-semibold text-stone-600 hover:border-orange-300 transition-colors"
                style={{ borderColor: showFilters ? "#F97316" : "rgba(0,0,0,0.09)" }}
              >
                <Filter size={13} /> Filter
                <ChevronDown size={12} className={`transition-transform ${showFilters ? "rotate-180" : ""}`} />
              </button>
            </div>
          </div>

          {/* Filters */}
          <AnimatePresence>
            {showFilters && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <div className="space-y-3 pb-1">
                  <Input
                    value={searchQuery}
                    onChange={(event) => {
                      setSearchQuery(event.target.value);
                      setCardIndex(0);
                    }}
                    placeholder="Search recipes, tags, ingredients, instructions, chefs"
                    className="bg-white"
                  />
                  <div className="flex gap-2 overflow-x-auto scrollbar-hide">
                    {FILTERS.map((f) => (
                      <FilterPill
                        key={f}
                        label={f}
                        active={activeFilter === f}
                        onClick={() => { setActiveFilter(f); setCardIndex(0); }}
                      />
                    ))}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {selectedChef && (
        <div className="max-w-2xl mx-auto px-6 pt-3">
          <button
            onClick={() => { setSelectedChef(null); setCardIndex(0); }}
            className="px-3 py-1 rounded-full bg-orange-100 text-orange-700 text-xs font-semibold"
          >
            Chef: {selectedChef} ✕
          </button>
        </div>
      )}

      {/* Card stack area */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-8">
        <div className="w-full max-w-sm">
          {loading ? (
            <div className="aspect-[3/4] rounded-3xl bg-stone-100 animate-pulse" />
          ) : stack.length === 0 ? (
            <div className="aspect-[3/4] rounded-3xl flex flex-col items-center justify-center gap-4 border-2 border-dashed border-stone-200">
              <span className="text-6xl">🍳</span>
              <div className="text-center">
                <p className="font-bold text-stone-700" style={{ fontFamily: "'Fraunces', Georgia, serif" }}>
                  You've seen everything!
                </p>
                <p className="text-sm text-stone-400 mt-1">Try a different filter or check back soon</p>
              </div>
              <button
                onClick={() => { setCardIndex(0); setActiveFilter("All"); }}
                className="mt-2 px-5 py-2.5 rounded-full text-sm font-bold text-white"
                style={{ background: "linear-gradient(135deg,#FB923C,#F97316,#EA580C)", boxShadow: "0 4px 16px rgba(249,115,22,0.30)" }}
              >
                Start Over
              </button>
            </div>
          ) : (
            <div className="relative" style={{ height: "480px" }}>
              {/* Background cards (depth effect) */}
              {stack.slice(1, 3).map((recipe, i) => (
                <div
                  key={recipe.id}
                  className="absolute inset-0 rounded-3xl overflow-hidden"
                  style={{
                    transform: `scale(${0.95 - i * 0.04}) translateY(${(i + 1) * 12}px)`,
                    zIndex: 2 - i,
                    opacity: 0.7 - i * 0.2,
                  }}
                >
                  {recipe.image && recipe.image !== "/placeholder.svg" ? (
                    <img src={recipe.image} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-orange-50 to-amber-50" />
                  )}
                </div>
              ))}

              {/* Top card */}
              <div className="absolute inset-0" style={{ zIndex: 10 }}>
                <AnimatePresence mode="popLayout">
                  {swipeFeedback && (
                    <motion.div
                      key={swipeFeedback}
                      initial={{ opacity: 0, scale: 0.8, y: 12 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.9, y: -6 }}
                      className={`absolute top-6 left-1/2 -translate-x-1/2 z-20 px-4 py-2 rounded-full text-sm font-bold ${swipeFeedback === "saved" ? "bg-emerald-500 text-white" : "bg-red-500 text-white"}`}
                    >
                      {swipeFeedback === "saved" ? "Saved" : "Skipped"}
                    </motion.div>
                  )}
                  {current && (
                    <SwipeCard
                      key={current.id}
                      recipe={current}
                      matchPercent={currentMatch?.percentage ?? 0}
                      onSwipeLeft={handleSkip}
                      onSwipeRight={handleSave}
                      isTop
                      onOpenDetails={() => { setPreviewRecipe(current); setPreviewOpen(true); }}
                      onChefClick={(chef) => { setSelectedChef(chef); setCardIndex(0); }}
                    />
                  )}
                </AnimatePresence>
              </div>
            </div>
          )}

          {/* Action buttons */}
          {stack.length > 0 && !loading && (
            <div className="flex items-center justify-center gap-5 mt-6">
              {/* Skip */}
              <button
                onClick={handleSkip}
                className="w-14 h-14 rounded-full bg-white border border-stone-200 flex items-center justify-center text-stone-400 hover:border-red-300 hover:text-red-400 transition-all active:scale-90 shadow-sm hover:shadow-md"
              >
                <X size={22} />
              </button>

              {/* Save */}
              <button
                onClick={handleSave}
                className="w-14 h-14 rounded-full flex items-center justify-center text-white transition-all active:scale-90"
                style={{
                  background: likedSet.has(current?.id ?? "") ? "#10B981" : "linear-gradient(135deg,#FB923C,#F97316,#EA580C)",
                  boxShadow: "0 4px 20px rgba(249,115,22,0.35)",
                }}
              >
                <Heart size={22} fill={likedSet.has(current?.id ?? "") ? "#fff" : "none"} />
              </button>
            </div>
          )}

          {/* Keyboard hint */}
          {stack.length > 0 && !loading && (
            <div className="mt-4 text-center">
              <div className="text-xs text-stone-400 font-medium">
                Use keyboard arrows to swipe
              </div>
            </div>
          )}
        </div>
      </div>

      <RecipePreviewDialog
        recipe={previewRecipe}
        match={previewRecipe ? calculateMatch(pantryNames, previewRecipe.ingredients || []) : null}
        open={previewOpen}
        onOpenChange={setPreviewOpen}
        mode="explore"
        onAddMissingToGrocery={(recipe, missingIngredients) => {
          missingIngredients.forEach((ing) => addCustomGroceryItem(ing));
          toast.success(`Added ${missingIngredients.length} items from "${recipe.name}" to grocery list`);
        }}
        onSave={(recipe) => {
          likeRecipe(recipe.id, recipe);
          toast.success(`❤️ Saved "${recipe.name}" to cookbook`);
        }}
      />
    </div>
  );
}
