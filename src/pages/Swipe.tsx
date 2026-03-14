import { useState, useMemo, useCallback, useEffect, useRef } from "react";
import {
  Heart, X, Clock, ChefHat, Flame, Filter,
  ChevronDown, Sparkles, Search,
} from "lucide-react";
import { motion, AnimatePresence, useMotionValue, useTransform, animate } from "framer-motion";
import { useStore } from "@/lib/store";
import { useBrowseFeed } from "@/hooks/useBrowseFeed";
import { calculateMatch } from "@/lib/matchLogic";
import MatchBadge from "@/components/MatchBadge";
import { toast } from "sonner";
import type { Recipe } from "@/data/recipes";
import RecipePreviewDialog from "@/components/RecipePreviewDialog";
import { ChefProfileModal } from "@/components/ChefProfileModal";
import { Input } from "@/components/ui/input";
import { classifyMealType } from "@/lib/mealTimeUtils";
import { getRecipeSourceBadge, isImportedCommunityRecipe } from "@/lib/recipeAttribution";

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
  onChefClick: (chefId: string | null, chefName: string | null) => void;
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
    animate(x, 0, { type: "spring", stiffness: 260, damping: 24 });
    animate(y, 0, { type: "spring", stiffness: 260, damping: 24 });
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
      dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
      dragElastic={0.2}
      dragMomentum={false}
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
      data-tutorial={isTop ? "recipe-card" : undefined}
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
            {isImportedCommunityRecipe(recipe) && (
              <span
                className="px-2.5 py-1 rounded-full text-xs font-bold"
                style={{ background: "rgba(255,255,255,0.92)", color: "#9A3412", backdropFilter: "blur(8px)" }}
              >
                {getRecipeSourceBadge(recipe)}
              </span>
            )}
            {matchPercent >= 80 && (
              <span
                className="px-2.5 py-1 rounded-full text-xs font-bold flex items-center gap-1"
                style={{ background: "rgba(249,115,22,0.90)", color: "#fff", backdropFilter: "blur(8px)" }}
              >
                <Sparkles size={10} /> Great match!
              </span>
            )}
          </div>
          <MatchBadge percentage={matchPercent} dataTutorial={isTop ? "match-percentage" : undefined} />
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
                onClick={(e) => { e.stopPropagation(); onChefClick(recipe.created_by ?? null, recipe.chef!); }}
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
          {isImportedCommunityRecipe(recipe) && (
            <p className="mt-2 text-xs text-orange-100/95 font-medium">
              {getRecipeSourceBadge(recipe)}
            </p>
          )}
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

const TUTORIAL_RECIPE = {
  id: "tutorial-omelette",
  name: "Egg on Toast",
  chef: "Demo Chef",
  image: "https://images.unsplash.com/photo-1525351484163-7529414344d8?q=80&w=800&auto=format&fit=crop",
  ingredients: ["Eggs", "Bread"],
  instructions: ["Toast the bread until golden.", "Crack eggs into a pan and cook for 2 minutes or to your preference.", "Place eggs on the toast and serve hot."],
  cook_time: "5 min",
  difficulty: "easy",
  cuisine: "Breakfast",
  servings: 1,
  source: "Tutorial",
  is_public: true,
  tags: ["tutorial", "easy"],
};

/* ── Main ──────────────────────────────────────────────────── */
const FILTERS = ["All", "Quick (<30 min)", "Vegetarian", "High Protein", "Easy", "Asian", "Italian", "Mexican"];

export default function SwipeScreen() {
  const { recipes, loading, loaded, loadFeed } = useBrowseFeed();
  const { likedRecipes, likeRecipe, pantryList, addCustomGroceryItem, addToGrocery } = useStore();

  const [cardIndex, setCardIndex] = useState(0);
  const [activeFilter, setActiveFilter] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedChefId, setSelectedChefId] = useState<string | null>(null);
  const [selectedChefName, setSelectedChefName] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [previewRecipe, setPreviewRecipe] = useState<Recipe | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [saveButtonPulse, setSaveButtonPulse] = useState(false);
  const [likedBurst, setLikedBurst] = useState<{ id: number; recipeId: string } | null>(null);
  const [cardActionStamp, setCardActionStamp] = useState<"save" | "skip" | null>(null);

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

    if (selectedChefId) { // Changed from selectedChef to selectedChefId
      byFilter = byFilter.filter((r) => r.created_by === selectedChefId); // Filter by chefId
    }

    const normalizedQuery = searchQuery.trim().toLowerCase();
    if (normalizedQuery) {
      const isMealQuery = ["breakfast", "lunch", "dinner", "dessert", "snack"].includes(normalizedQuery);

      byFilter = byFilter.filter((recipe) => {
        // If searching specifically for a meal type, use the rigorous classifier
        if (isMealQuery) {
          const types = classifyMealType(recipe);
          if (types.includes(normalizedQuery as any)) return true;
        }

        // Higher priority fields
        const coreMatch = [recipe.name, recipe.cuisine || "", recipe.chef || ""]
          .some(text => text.toLowerCase().includes(normalizedQuery));

        if (coreMatch) return true;

        // Tag match
        const tagMatch = recipe.tags?.some(tag => tag.toLowerCase().includes(normalizedQuery));
        if (tagMatch) return true;

        // Ingredient match
        const ingredientMatch = recipe.ingredients?.some(ing => ing.toLowerCase().includes(normalizedQuery));
        if (ingredientMatch) return true;

        // Instructions match (lowest priority, maybe restrict it)
        const instructionMatch = recipe.instructions?.some(step => step.toLowerCase().includes(normalizedQuery));
        return instructionMatch;
      });
    }

    const { showTutorial } = useStore.getState();
    let final = byFilter;
    if (showTutorial && !byFilter.some(r => r.id === TUTORIAL_RECIPE.id)) {
      final = [TUTORIAL_RECIPE, ...byFilter];
    }

    return final;
  }, [recipes, activeFilter, searchQuery, selectedChefId]); // Added selectedChefId to dependencies

  useEffect(() => {
    setCardIndex(0);
  }, [activeFilter, searchQuery, selectedChefId]);

  const current = filtered[cardIndex] || null;
  const prev = cardIndex > 0 ? filtered[cardIndex - 1] : null;
  const next = filtered[cardIndex + 1] || null;

  const currentMatch = current ? calculateMatch(pantryNames, current.ingredients || []) : null;
  const nextMatch = next ? calculateMatch(pantryNames, next.ingredients || []) : null;
  const prevMatch = prev ? calculateMatch(pantryNames, prev.ingredients || []) : null;

  const advance = useCallback(() => setCardIndex((i) => i + 1), []);

  const triggerLikedAnimation = useCallback((recipeId: string) => {
    setLikedBurst({ id: Date.now(), recipeId });
  }, []);

  useEffect(() => {
    if (!likedBurst) return;
    const timeout = window.setTimeout(() => setLikedBurst(null), 700);
    return () => window.clearTimeout(timeout);
  }, [likedBurst]);

  const saveAndAdvance = useCallback((recipe: Recipe, options?: { closePreview?: boolean; advanceCard?: boolean }) => {
    likeRecipe(recipe.id, recipe);
    triggerLikedAnimation(recipe.id);

    if (options?.closePreview) {
      setPreviewOpen(false);
      setPreviewRecipe(null);
    }

    if (options?.advanceCard !== false) {
      advance();
    }
  }, [advance, likeRecipe, triggerLikedAnimation]);

  const handleSave = useCallback(() => {
    if (!current) return;
    saveAndAdvance(current);
  }, [current, saveAndAdvance]);

  const handleSkip = useCallback(() => {
    if (!current) return;
    advance();
  }, [current, advance]);

  const handleSkipButton = useCallback(() => {
    if (!current) return;
    setCardActionStamp("skip");
    window.setTimeout(() => setCardActionStamp(null), 220);
    window.setTimeout(() => {
      advance();
    }, 120);
  }, [advance, current]);

  const handleSaveButton = useCallback(() => {
    if (!current) return;
    setSaveButtonPulse(true);
    window.setTimeout(() => setSaveButtonPulse(false), 280);
    setCardActionStamp("save");
    window.setTimeout(() => setCardActionStamp(null), 220);
    likeRecipe(current.id, current);
    triggerLikedAnimation(current.id);
    window.setTimeout(() => {
      advance();
    }, 120);
  }, [advance, current, likeRecipe, triggerLikedAnimation]);

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
          <div className="flex flex-col gap-3">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[10px] font-bold text-orange-400 uppercase tracking-widest mb-1">Discover</p>
                <h1
                  className="text-2xl font-bold text-stone-900"
                  style={{ fontFamily: "'Fraunces', Georgia, serif" }}
                >
                  Find Recipes
                </h1>
              </div>
              <button
                onClick={() => setShowFilters((v) => !v)}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-orange-600 bg-white border border-orange-100 hover:bg-orange-50 transition-colors shrink-0"
              >
                <Filter size={12} /> {showFilters ? "Hide Filters" : "Filters"}
                <ChevronDown size={11} className={`transition-transform ${showFilters ? "rotate-180" : ""}`} />
              </button>
            </div>

            <div className="relative">
              <Input
                value={searchQuery}
                onChange={(event) => {
                  setSearchQuery(event.target.value);
                  setCardIndex(0);
                }}
                placeholder="Search recipes, ingredients..."
                className="bg-white h-11 pl-10 rounded-xl border-stone-200"
              />
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400" size={16} />
            </div>

            <p className="text-xs text-stone-400 font-medium">
              {filtered.length - cardIndex} recipes matching your taste
            </p>
          </div>

          <AnimatePresence>
            {showFilters && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <div className="flex gap-2 overflow-x-auto scrollbar-hide py-2">
                  {FILTERS.map((f) => (
                    <FilterPill
                      key={f}
                      label={f}
                      active={activeFilter === f}
                      onClick={() => { setActiveFilter(f); setCardIndex(0); }}
                    />
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {selectedChefId && ( // Changed from selectedChef to selectedChefId
        <div className="max-w-2xl mx-auto px-6 pt-3">
          <button
            onClick={() => { setSelectedChefId(null); setSelectedChefName(null); setCardIndex(0); }} // Updated to clear both id and name
            className="px-3 py-1 rounded-full bg-orange-100 text-orange-700 text-xs font-semibold"
          >
            Chef: {selectedChefName} ✕ {/* Display selectedChefName */}
          </button>
        </div>
      )}

      {/* Carousel area */}
      <div className="flex-1 flex flex-col items-center justify-start p-4 sm:p-6 pt-5 sm:pt-8 md:pt-6 overflow-hidden">
        <div className="w-full max-w-5xl flex flex-col items-center">
          <div className="relative flex items-center justify-center h-[400px] sm:h-[520px] w-full">
          {loading ? (
            <div className="aspect-[3/4] rounded-3xl bg-stone-100 animate-pulse" />
          ) : filtered.length === cardIndex ? (
            <div className="w-[300px] sm:w-[340px] aspect-[3/4] rounded-3xl flex flex-col items-center justify-center gap-4 border-2 border-dashed border-stone-200 bg-white shadow-sm">
              <span className="text-6xl">🍳</span>
              <div className="text-center">
                <p className="font-bold text-stone-700" style={{ fontFamily: "'Fraunces', Georgia, serif" }}>
                  You've seen everything!
                </p>
                <p className="text-sm text-stone-400 mt-1">Try a different filter or check back soon</p>
              </div>
              <button
                onClick={() => { setCardIndex(0); setActiveFilter("All"); }}
                className="mt-2 px-5 py-2.5 rounded-full text-sm font-bold text-white shadow-lg transition-transform active:scale-95"
                style={{ background: "linear-gradient(135deg,#FB923C,#F97316,#EA580C)" }}
              >
                Start Over
              </button>
            </div>
          ) : (
            <div className="flex items-center justify-center gap-4 w-full h-full relative" data-tutorial="swipe-carousel">
              <AnimatePresence>
                {likedBurst && (
                  <motion.div
                    key={likedBurst.id}
                    initial={{ opacity: 0, scale: 0.6, y: 30 }}
                    animate={{ opacity: 1, scale: 1.15, y: -10 }}
                    exit={{ opacity: 0, scale: 1.4, y: -40 }}
                    transition={{ duration: 0.55, ease: "easeOut" }}
                    className="pointer-events-none absolute z-20 flex flex-col items-center gap-2"
                  >
                    <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/92 text-white shadow-2xl">
                      <Heart size={28} fill="currentColor" />
                    </div>
                    <div className="rounded-full bg-white/92 px-3 py-1 text-xs font-bold text-emerald-700 shadow-sm">
                      Saved
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
              <AnimatePresence mode="popLayout">
                {/* Previous Card (Left) */}
                {prev && (
                  <motion.div
                    key={`prev-${prev.id}`}
                    initial={{ opacity: 0, scale: 0.6, x: -100, rotateY: 45 }}
                    animate={{ opacity: 0.4, scale: 0.75, x: -260, rotateY: 35, filter: 'blur(8px)' }}
                    exit={{ opacity: 0, scale: 0.5, x: -400 }}
                    transition={{ duration: 0.4 }}
                    className="absolute z-0 hidden sm:block w-[300px] h-[400px] pointer-events-none"
                    style={{ perspective: 1000 }}
                  >
                    <SwipeCard
                      recipe={prev}
                      matchPercent={prevMatch?.percentage ?? 0}
                      onSwipeLeft={() => { }}
                      onSwipeRight={() => { }}
                      isTop={false}
                      onOpenDetails={() => { }}
                      onChefClick={() => { }}
                    />
                  </motion.div>
                )}

                {/* Next Card (Right) */}
                {next && (
                  <motion.div
                    key={`next-${next.id}`}
                    initial={{ opacity: 0, scale: 0.6, x: 100, rotateY: -45 }}
                    animate={{ opacity: 0.4, scale: 0.75, x: 260, rotateY: -35, filter: 'blur(8px)' }}
                    exit={{ opacity: 0, scale: 0.5, x: 400 }}
                    transition={{ duration: 0.4 }}
                    className="absolute z-0 hidden sm:block w-[300px] h-[400px] pointer-events-none"
                    style={{ perspective: 1000 }}
                  >
                    <SwipeCard
                      recipe={next}
                      matchPercent={nextMatch?.percentage ?? 0}
                      onSwipeLeft={() => { }}
                      onSwipeRight={() => { }}
                      isTop={false}
                      onOpenDetails={() => { }}
                      onChefClick={() => { }}
                    />
                  </motion.div>
                )}

                {/* Current Card (Center) */}
                {current && (
                  <motion.div
                    key={`current-${current.id}`}
                    initial={{ opacity: 0, scale: 0.8, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0, x: 0, rotateY: 0, filter: 'blur(0px)' }}
                    exit={{
                      opacity: 0,
                      scale: 0.5,
                      transition: { duration: 0.2 }
                    }}
                    transition={{ type: 'spring', damping: 20, stiffness: 100 }}
                    className="z-10 w-[300px] sm:w-[340px] h-[380px] sm:h-[460px]"
                    style={{ perspective: 1000 }}
                  >
                    <AnimatePresence>
                      {cardActionStamp === "save" && (
                        <motion.div
                          initial={{ opacity: 0, scale: 0.8, x: -18, rotate: -18 }}
                          animate={{ opacity: 1, scale: 1, x: 0, rotate: -15 }}
                          exit={{ opacity: 0, scale: 1.08 }}
                          className="pointer-events-none absolute left-6 top-8 z-30 rounded-xl border-4 border-emerald-400 px-4 py-2 text-2xl font-black text-emerald-400"
                        >
                          SAVE
                        </motion.div>
                      )}
                      {cardActionStamp === "skip" && (
                        <motion.div
                          initial={{ opacity: 0, scale: 0.8, x: 18, rotate: 18 }}
                          animate={{ opacity: 1, scale: 1, x: 0, rotate: 15 }}
                          exit={{ opacity: 0, scale: 1.08 }}
                          className="pointer-events-none absolute right-6 top-8 z-30 rounded-xl border-4 border-red-400 px-4 py-2 text-2xl font-black text-red-400"
                        >
                          SKIP
                        </motion.div>
                      )}
                    </AnimatePresence>
                    <SwipeCard
                      recipe={current}
                      matchPercent={currentMatch?.percentage ?? 0}
                      onSwipeLeft={handleSkip}
                      onSwipeRight={handleSave}
                      isTop
                      onOpenDetails={() => { setPreviewRecipe(current); setPreviewOpen(true); }}
                      onChefClick={(chefId, chefName) => {
                        setSelectedChefId(chefId);
                        setSelectedChefName(chefName);
                      }}
                    />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}
          </div>

          {/* Action buttons - below carousel */}
          {(current || loading) && !loading && (
            <div className="flex items-center justify-center gap-4 mt-4 sm:mt-6">
              {/* Skip */}
              <button
                onClick={handleSkipButton}
                className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-white border border-stone-200 flex items-center justify-center text-stone-400 hover:border-red-300 hover:text-red-400 transition-all active:scale-90 shadow-sm hover:shadow-md"
              >
                <X size={20} />
              </button>

              {/* Save */}
              <motion.button
                onClick={handleSaveButton}
                data-tutorial="like-button"
                className="w-12 h-12 sm:w-14 sm:h-14 rounded-full flex items-center justify-center text-white transition-all active:scale-90 shadow-lg hover:shadow-orange-200/50"
                animate={saveButtonPulse ? { scale: [1, 1.14, 0.96, 1], rotate: [0, -8, 8, 0] } : { scale: 1, rotate: 0 }}
                transition={{ duration: 0.28 }}
                style={{
                  background: likedSet.has(current?.id ?? "") ? "#10B981" : "linear-gradient(135deg,#FB923C,#F97316,#EA580C)",
                }}
              >
                <Heart size={20} fill={likedSet.has(current?.id ?? "") ? "#fff" : "none"} />
              </motion.button>
            </div>
          )}

          {/* Keyboard hint */}
          {current && !loading && (
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
          addToGrocery(recipe.id); // Track that this recipe is in the grocery list
          toast.success(`Added ${missingIngredients.length} items from "${recipe.name}" to grocery list`);
        }}
        onSave={(recipe) => {
          saveAndAdvance(recipe, { closePreview: true, advanceCard: true });
        }}
      />

      <ChefProfileModal
        chefId={selectedChefId}
        chefName={selectedChefName}
        open={!!selectedChefId}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedChefId(null);
            setSelectedChefName(null);
          }
        }}
      />
    </div>
  );
}
