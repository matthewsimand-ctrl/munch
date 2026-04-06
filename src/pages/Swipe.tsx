import { useState, useMemo, useCallback, useEffect, useRef } from "react";
import {
  Heart, X, Clock, ChefHat, Flame, Filter,
  Sparkles, Search, Info,
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
import { getRecipeChefName, getRecipeSourceBadge, getResolvedRecipeSourceUrl, isImportedCommunityRecipe, isMunchAuthoredRecipe, shouldShowChefAttribution } from "@/lib/recipeAttribution";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Slider } from "@/components/ui/slider";
import RecipeAttributionIcon from "@/components/RecipeAttributionIcon";
import { MUNCH_CHEF_NAME, MUNCH_OFFICIAL_USER_ID } from "@/lib/munchIdentity";
import { applyRecipeImageFallback, getRecipeImageSrc } from "@/lib/recipeImage";

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
  const ignoreCardTapRef = useRef(false);
  const rotate = useTransform(x, [-200, 200], [-18, 18]);
  const likeOpacity = useTransform(x, [20, 100], [0, 1]);
  const nopeOpacity = useTransform(x, [-100, -20], [1, 0]);

  const handleDragEnd = (_: unknown, info: { offset: { x: number; y: number } }) => {
    if (info.offset.x > 100) { onSwipeRight(); return; }
    if (info.offset.x < -100) { onSwipeLeft(); return; }
    animate(x, 0, { type: "spring", stiffness: 180, damping: 18, mass: 0.7 });
    animate(y, 0, { type: "spring", stiffness: 180, damping: 18, mass: 0.7 });
  };

  const normalizedDifficulty = String(recipe.difficulty || "").toLowerCase();
  const diffBadge =
    normalizedDifficulty === "easy"
      ? { label: "Easy", className: "bg-success/15 text-success" }
      : normalizedDifficulty === "medium" || normalizedDifficulty === "intermediate"
        ? { label: "Med", className: "bg-warning/20 text-warning-foreground" }
        : { label: "Hard", className: "bg-destructive/15 text-destructive" };
  const topChipClass = "inline-flex items-center gap-1.5 rounded-full border border-card/40 bg-card/90 px-2.5 py-1 text-xs font-bold text-primary shadow-sm text-shadow-soft";
  const matchChipClass = "inline-flex items-center gap-1 rounded-full bg-primary/90 px-2.5 py-1 text-xs font-bold text-primary-foreground shadow-sm text-shadow-soft";
  const overlayChipClass = "rounded-full border border-primary-foreground/20 bg-primary-foreground/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-primary-foreground text-shadow-soft";

  const sourceBadge = getRecipeSourceBadge(recipe);
  const resolvedSourceUrl = getResolvedRecipeSourceUrl(recipe);
  const isMunchRecipe = isMunchAuthoredRecipe(recipe);
  const isMealDbRecipe = String(recipe.source || '').toLowerCase() === 'themealdb';
  const resolvedChefName = getRecipeChefName(recipe) || (isMunchRecipe ? MUNCH_CHEF_NAME : null);
  const resolvedChefId = shouldShowChefAttribution(recipe)
    ? (recipe.created_by || (isMunchRecipe ? MUNCH_OFFICIAL_USER_ID : null))
    : null;
  const handleCardActivate = () => {
    if (ignoreCardTapRef.current) {
      ignoreCardTapRef.current = false;
      return;
    }
    if (isTop && !didMoveRef.current) onOpenDetails();
  };

  return (
    <motion.div
      drag={isTop}
      dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
      dragElastic={0.32}
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
      whileDrag={{ scale: 1.03 }}
      onClick={handleCardActivate}
      data-tutorial={isTop ? "recipe-card" : undefined}
    >
      {/* Card */}
      <div
        className="relative h-full w-full overflow-hidden rounded-3xl shadow-[0_20px_60px_hsl(var(--foreground)/0.20),0_4px_16px_hsl(var(--foreground)/0.10)]"
      >
        {/* Hero image */}
        <img
          src={getRecipeImageSrc(recipe.image)}
          alt={recipe.name}
          className="w-full h-full object-cover"
          loading={isTop ? "eager" : "lazy"}
          decoding="async"
          onError={applyRecipeImageFallback}
        />

        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-foreground/85 via-foreground/10 to-transparent" />

        {/* Top badges */}
        <div className="absolute top-4 left-4 right-4 flex items-start justify-between">
          <div className="flex flex-col gap-2">
            {sourceBadge && !isMealDbRecipe && (
              resolvedSourceUrl ? (
                <a
                  href={resolvedSourceUrl}
                  target="_blank"
                  rel="noreferrer"
                  onClick={(event) => event.stopPropagation()}
                  className={topChipClass}
                >
                  <RecipeAttributionIcon recipe={recipe} sizeClassName="h-3.5 w-3.5" />
                  <span>{sourceBadge}</span>
                </a>
              ) : (
                <span className={topChipClass}>
                  <RecipeAttributionIcon recipe={recipe} sizeClassName="h-3.5 w-3.5" />
                  <span>{sourceBadge}</span>
                </span>
              )
            )}
            {matchPercent >= 80 && (
              <span className={matchChipClass}>
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
              <span className={overlayChipClass}>
                {recipe.cuisine}
              </span>
            )}
            <span
              className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${diffBadge.className}`}
            >
              {diffBadge.label}
            </span>
          </div>

          <h2 className="mb-3 font-display text-2xl font-bold leading-tight text-primary-foreground text-shadow-strong">
            {recipe.name}
          </h2>

          <div className="flex items-center gap-4 text-sm text-primary-foreground/80 text-shadow-soft">
            <span className="flex items-center gap-1.5">
              <Clock size={13} />
              {recipe.cook_time}
            </span>
            {resolvedChefName && resolvedChefId && (
              <button
                onPointerDown={() => { ignoreCardTapRef.current = true; }}
                onClick={(e) => {
                  e.stopPropagation();
                  ignoreCardTapRef.current = true;
                  onChefClick(resolvedChefId, resolvedChefName);
                }}
                className="inline-flex items-center gap-1.5 rounded-full border border-primary-foreground/20 bg-primary-foreground/10 px-2 py-1 text-primary-foreground/90 text-shadow-soft hover:bg-primary-foreground/15 hover:text-primary-foreground"
              >
                <RecipeAttributionIcon recipe={{ ...recipe, chef: resolvedChefName, created_by: resolvedChefId }} sizeClassName="h-3.5 w-3.5" className={isMunchRecipe ? "rounded-full bg-white/95 p-0.5" : ""} />
                {resolvedChefName}
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
            <p className="mt-2 text-xs font-medium text-primary-foreground/95 text-shadow-soft">
              {getRecipeSourceBadge(recipe)}
            </p>
          )}
          {(recipe.protein || recipe.carbs || recipe.fat) && (
            <p className="mt-2 text-xs text-primary-foreground/80 text-shadow-soft">
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
const MEAL_TYPE_FILTERS = ["breakfast", "lunch", "dinner", "dessert", "snack"] as const;
const DISLIKED_RECIPE_COOLDOWN_MS = 1000 * 60 * 60 * 24 * 3;

function recipeIsVegetarian(recipe: Recipe) {
  const tags = (recipe.tags || []).map((tag) => tag.toLowerCase());
  if (tags.some((tag) => tag.includes("vegetarian") || tag.includes("vegan"))) return true;

  const nonVegetarianTerms = [
    "chicken", "beef", "pork", "lamb", "fish", "salmon", "tuna", "shrimp",
    "bacon", "sausage", "turkey", "duck", "anchovy", "prawn",
  ];

  return !(recipe.ingredients || []).some((ingredient) => {
    const normalized = ingredient.toLowerCase();
    return nonVegetarianTerms.some((term) => normalized.includes(term));
  });
}

function recipeIsHighProtein(recipe: Recipe) {
  if (typeof recipe.protein === "number") return recipe.protein >= 20;
  return (recipe.tags || []).some((tag) => tag.toLowerCase().includes("high-protein") || tag.toLowerCase().includes("high protein"));
}

function recipeIsEasy(recipe: Recipe) {
  const difficulty = String(recipe.difficulty || "").toLowerCase().trim();
  return difficulty === "easy" || difficulty === "beginner";
}

export default function SwipeScreen() {
  const {
    recipes,
    loading,
    loadingMore,
    loaded,
    loadFeed,
    loadMore,
    hasMore,
    searchFeed,
    searchResults,
    searchLoading,
    activeSearchQuery,
  } = useBrowseFeed();
  const {
    likedRecipes,
    dislikedRecipes,
    likeRecipe,
    dislikeRecipe,
    clearExpiredDislikes,
    pantryList,
    addCustomGroceryItem,
    addToGrocery,
  } = useStore();

  const [cardIndex, setCardIndex] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedChefId, setSelectedChefId] = useState<string | null>(null);
  const [selectedChefName, setSelectedChefName] = useState<string | null>(null);
  const [recipeToRestoreAfterChefClose, setRecipeToRestoreAfterChefClose] = useState<Recipe | null>(null);
  const [pendingChefProfile, setPendingChefProfile] = useState<{ chefId: string | null; chefName: string | null } | null>(null);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [selectedMealTypes, setSelectedMealTypes] = useState<string[]>([]);
  const [selectedCuisine, setSelectedCuisine] = useState("");
  const [minimumMatch, setMinimumMatch] = useState(0);
  const [onlyHighProtein, setOnlyHighProtein] = useState(false);
  const [onlyVegetarian, setOnlyVegetarian] = useState(false);
  const [onlyQuick, setOnlyQuick] = useState(false);
  const [onlyEasy, setOnlyEasy] = useState(false);
  const [previewRecipe, setPreviewRecipe] = useState<Recipe | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [saveButtonPulse, setSaveButtonPulse] = useState(false);
  const [likedBurst, setLikedBurst] = useState<{ id: number; recipeId: string } | null>(null);
  const [cardActionStamp, setCardActionStamp] = useState<"save" | "skip" | null>(null);
  const [previousRecipe, setPreviousRecipe] = useState<Recipe | null>(null);
  const previewDismissActionRef = useRef<"save" | "skip" | null>(null);
  const dislikeCleanupCutoffRef = useRef(Date.now() - DISLIKED_RECIPE_COOLDOWN_MS);

  const pantryNames = useMemo(() => pantryList.map((p) => p.name), [pantryList]);
  const likedSet = useMemo(() => new Set(likedRecipes), [likedRecipes]);
  const trimmedSearchQuery = searchQuery.trim();
  const committedSearchQuery = activeSearchQuery.trim();
  const isSearchPending = trimmedSearchQuery.length > 0 && (searchLoading || committedSearchQuery !== trimmedSearchQuery);
  const dislikedSet = useMemo(
    () => new Set(
      Object.entries(dislikedRecipes)
        .filter(([, timestamp]) => {
          const numericTimestamp = typeof timestamp === "number" ? timestamp : Number(timestamp);
          return Number.isFinite(numericTimestamp) && numericTimestamp >= Date.now() - DISLIKED_RECIPE_COOLDOWN_MS;
        })
        .map(([recipeId]) => recipeId)
    ),
    [dislikedRecipes],
  );
  const sourceRecipes = useMemo(() => {
    const base = isSearchPending
      ? []
      : activeSearchQuery
        ? searchResults
        : recipes;
    return base.filter((recipe) => !likedSet.has(recipe.id) && !dislikedSet.has(recipe.id));
  }, [activeSearchQuery, dislikedSet, isSearchPending, likedSet, recipes, searchResults]);
  const searchFeedRef = useRef(searchFeed);
  const availableCuisines = useMemo(
    () => Array.from(new Set(sourceRecipes.map((recipe) => recipe.cuisine?.trim()).filter(Boolean) as string[])).sort(),
    [sourceRecipes],
  );
  const activeFilterCount = [
    selectedMealTypes.length > 0,
    selectedCuisine.length > 0,
    minimumMatch > 0,
    onlyHighProtein,
    onlyVegetarian,
    onlyQuick,
    onlyEasy,
  ].filter(Boolean).length;

  useEffect(() => {
    searchFeedRef.current = searchFeed;
  }, [searchFeed]);

  useEffect(() => {
    const trimmedQuery = searchQuery.trim();
    const timeout = window.setTimeout(() => {
      void searchFeedRef.current(trimmedQuery);
    }, trimmedQuery ? 250 : 0);

    return () => window.clearTimeout(timeout);
  }, [searchQuery]);

  const filtered = useMemo(() => {
    let byFilter = sourceRecipes;

    if (selectedMealTypes.length > 0) {
      byFilter = byFilter.filter((recipe) => {
        const mealTypes = classifyMealType(recipe);
        return selectedMealTypes.some((mealType) => mealTypes.includes(mealType as any));
      });
    }

    if (selectedCuisine) {
      byFilter = byFilter.filter((recipe) => (recipe.cuisine || "").toLowerCase() === selectedCuisine.toLowerCase());
    }

    if (onlyHighProtein) {
      byFilter = byFilter.filter((recipe) => recipeIsHighProtein(recipe));
    }

    if (onlyVegetarian) {
      byFilter = byFilter.filter((recipe) => recipeIsVegetarian(recipe));
    }

    if (onlyQuick) {
      byFilter = byFilter.filter((recipe) => parseInt(recipe.cook_time || "999", 10) <= 30);
    }

    if (onlyEasy) {
      byFilter = byFilter.filter((recipe) => recipeIsEasy(recipe));
    }

    if (minimumMatch > 0) {
      byFilter = byFilter.filter((recipe) => calculateMatch(pantryNames, recipe.ingredients || []).percentage >= minimumMatch);
    }

    if (selectedChefId) { // Changed from selectedChef to selectedChefId
      byFilter = byFilter.filter((r) => r.created_by === selectedChefId); // Filter by chefId
    }

    const normalizedQuery = committedSearchQuery.toLowerCase();
    if (normalizedQuery) {
      const isMealQuery = ["breakfast", "lunch", "dinner", "dessert", "snack"].includes(normalizedQuery);

      byFilter = byFilter.filter((recipe) => {
        // If searching specifically for a meal type, use the rigorous classifier
        if (isMealQuery) {
          const types = classifyMealType(recipe);
          if (types.includes(normalizedQuery as any)) return true;
        }

        // Higher priority fields
        const sourceUrl = getResolvedRecipeSourceUrl(recipe) || "";
        const sourceHostname = sourceUrl
          ? (() => {
              try {
                return new URL(sourceUrl).hostname.replace(/^www\./, "");
              } catch {
                return sourceUrl;
              }
            })()
          : "";

        const coreMatch = [recipe.name, recipe.cuisine || "", recipe.chef || "", recipe.source || "", sourceHostname, sourceUrl]
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
  }, [
    sourceRecipes,
    selectedMealTypes,
    selectedCuisine,
    minimumMatch,
    onlyHighProtein,
    onlyVegetarian,
    onlyQuick,
    onlyEasy,
    selectedChefId,
    committedSearchQuery,
    pantryNames,
  ]);

  useEffect(() => {
    setCardIndex(0);
    setPreviousRecipe(null);
  }, [
    searchQuery,
    selectedChefId,
    selectedMealTypes,
    selectedCuisine,
    minimumMatch,
    onlyHighProtein,
    onlyVegetarian,
    onlyQuick,
    onlyEasy,
  ]);

  useEffect(() => {
    setCardIndex((currentIndex) => {
      if (filtered.length === 0) return 0;
      return Math.min(currentIndex, filtered.length - 1);
    });
  }, [filtered.length]);

  const current = filtered[cardIndex] || null;
  const prev = previousRecipe;
  const next = filtered[cardIndex + 1] || null;

  const currentMatch = current ? calculateMatch(pantryNames, current.ingredients || []) : null;
  const nextMatch = next ? calculateMatch(pantryNames, next.ingredients || []) : null;
  const prevMatch = prev ? calculateMatch(pantryNames, prev.ingredients || []) : null;

  const advance = useCallback(() => setCardIndex((i) => i + 1), []);

  const triggerLikedAnimation = useCallback((recipeId: string) => {
    setLikedBurst({ id: Date.now(), recipeId });
  }, []);

  const signalCardAction = useCallback((action: "save" | "skip") => {
    setCardActionStamp(action);
    window.setTimeout(() => setCardActionStamp(null), 320);
  }, []);

  useEffect(() => {
    if (!likedBurst) return;
    const timeout = window.setTimeout(() => setLikedBurst(null), 700);
    return () => window.clearTimeout(timeout);
  }, [likedBurst]);

  useEffect(() => {
    if (!pendingChefProfile || previewOpen || previewRecipe) return;
    setSelectedChefId(pendingChefProfile.chefId);
    setSelectedChefName(pendingChefProfile.chefName);
    setPendingChefProfile(null);
  }, [pendingChefProfile, previewOpen, previewRecipe]);

  const saveAndContinue = useCallback((recipe: Recipe, options?: { closePreview?: boolean }) => {
    setPreviousRecipe(recipe);
    likeRecipe(recipe.id, recipe);
    triggerLikedAnimation(recipe.id);
    signalCardAction("save");
    toast.success(`Saved ${recipe.name}`, { duration: 1200, position: "bottom-right" });

    if (options?.closePreview) {
      setPreviewOpen(false);
      setPreviewRecipe(null);
    }
  }, [likeRecipe, signalCardAction, triggerLikedAnimation]);

  const handleSave = useCallback(() => {
    if (!current) return;
    saveAndContinue(current);
  }, [current, saveAndContinue]);

  const handleSkip = useCallback(() => {
    if (!current) return;
    setPreviousRecipe(current);
    dislikeRecipe(current.id);
    signalCardAction("skip");
  }, [current, dislikeRecipe, signalCardAction]);

  const handleSkipButton = useCallback(() => {
    if (!current) return;
    setPreviousRecipe(current);
    dislikeRecipe(current.id);
    signalCardAction("skip");
  }, [current, dislikeRecipe, signalCardAction]);

  const handleSaveButton = useCallback(() => {
    if (!current) return;
    setSaveButtonPulse(true);
    window.setTimeout(() => setSaveButtonPulse(false), 280);
    saveAndContinue(current);
  }, [current, saveAndContinue]);

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

  useEffect(() => {
    if (activeSearchQuery) return;
    if (!hasMore || loading || loadingMore) return;

    const remainingCards = filtered.length - cardIndex;
    if (remainingCards <= 8) {
      void loadMore();
    }
  }, [activeSearchQuery, cardIndex, filtered.length, hasMore, loadMore, loading, loadingMore]);

  useEffect(() => {
    if (activeSearchQuery) return;
    if (!hasMore || loading || loadingMore) return;
    if (activeFilterCount === 0) return;

    if (filtered.length < 12) {
      void loadMore();
    }
  }, [activeFilterCount, activeSearchQuery, filtered.length, hasMore, loadMore, loading, loadingMore]);

  useEffect(() => {
    clearExpiredDislikes(dislikeCleanupCutoffRef.current);
    dislikeCleanupCutoffRef.current = Date.now() - DISLIKED_RECIPE_COOLDOWN_MS;
  }, [clearExpiredDislikes]);

  return (
    <div
      className="flex min-h-full flex-col bg-background font-sans"
    >

      {/* Header */}
      <div className="border-b border-border/60 bg-gradient-to-br from-secondary via-background to-background px-4 pb-4 pt-4 sm:px-6 sm:pt-6">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col gap-3 sm:gap-4">
            <div className="mb-2 flex items-start justify-between gap-4 sm:mb-1">
              <div>
                <p className="text-[10px] font-bold text-orange-400 uppercase tracking-widest mb-1">Swipe to discover</p>
                <h1 className="font-display text-xl font-bold text-stone-900 sm:text-2xl">
                  Find Recipes
                </h1>
                <p className="text-xs text-stone-400 mt-1">{Math.max(filtered.length - cardIndex, 0)} recipes matching your taste</p>
              </div>
              <button
                onClick={() => setFiltersOpen(true)}
                className="relative flex h-11 w-11 items-center justify-center rounded-full border border-stone-200 text-stone-500 bg-white hover:border-orange-300 hover:text-orange-500 transition-colors shrink-0 shadow-sm"
              >
                <Filter size={16} />
                <span className="sr-only">Open filters</span>
                {activeFilterCount > 0 && <span className="absolute mt-[-2rem] ml-[1.6rem] inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-orange-500 px-1.5 text-[10px] font-bold text-white shadow-sm">{activeFilterCount}</span>}
              </button>
            </div>

            <div className="relative rounded-[1.4rem] border bg-white px-1.5 py-1 shadow-[0_10px_24px_rgba(249,115,22,0.06)]">
              <Input
                value={searchQuery}
                onChange={(event) => {
                  setSearchQuery(event.target.value);
                  setCardIndex(0);
                }}
                placeholder="Search recipes, ingredients..."
                className="h-10 sm:h-11 border-0 bg-transparent pl-11 rounded-[1.1rem] text-sm shadow-none focus-visible:ring-0 focus-visible:ring-offset-0"
              />
              <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-orange-500" size={18} />
            </div>
            {activeFilterCount > 0 && (
              <div className="flex flex-wrap gap-2">
                {selectedMealTypes.map((mealType) => (
                  <button
                    key={mealType}
                    type="button"
                    onClick={() => setSelectedMealTypes((prev) => prev.filter((value) => value !== mealType))}
                    className="inline-flex items-center gap-1.5 rounded-full border border-orange-200 bg-white px-3 py-1 text-[11px] font-semibold text-orange-600 transition-colors hover:border-orange-300 hover:bg-orange-50"
                  >
                    {mealType[0].toUpperCase() + mealType.slice(1)}
                    <X size={11} />
                  </button>
                ))}
                {selectedCuisine && (
                  <button
                    type="button"
                    onClick={() => setSelectedCuisine("")}
                    className="inline-flex items-center gap-1.5 rounded-full border border-orange-200 bg-white px-3 py-1 text-[11px] font-semibold text-orange-600 transition-colors hover:border-orange-300 hover:bg-orange-50"
                  >
                    {selectedCuisine}
                    <X size={11} />
                  </button>
                )}
                {minimumMatch > 0 && (
                  <button
                    type="button"
                    onClick={() => setMinimumMatch(0)}
                    className="inline-flex items-center gap-1.5 rounded-full border border-orange-200 bg-white px-3 py-1 text-[11px] font-semibold text-orange-600 transition-colors hover:border-orange-300 hover:bg-orange-50"
                  >
                    {minimumMatch}%+ match
                    <X size={11} />
                  </button>
                )}
                {onlyHighProtein && (
                  <button
                    type="button"
                    onClick={() => setOnlyHighProtein(false)}
                    className="inline-flex items-center gap-1.5 rounded-full border border-orange-200 bg-white px-3 py-1 text-[11px] font-semibold text-orange-600 transition-colors hover:border-orange-300 hover:bg-orange-50"
                  >
                    High protein
                    <X size={11} />
                  </button>
                )}
                {onlyVegetarian && (
                  <button
                    type="button"
                    onClick={() => setOnlyVegetarian(false)}
                    className="inline-flex items-center gap-1.5 rounded-full border border-orange-200 bg-white px-3 py-1 text-[11px] font-semibold text-orange-600 transition-colors hover:border-orange-300 hover:bg-orange-50"
                  >
                    Vegetarian
                    <X size={11} />
                  </button>
                )}
                {onlyQuick && (
                  <button
                    type="button"
                    onClick={() => setOnlyQuick(false)}
                    className="inline-flex items-center gap-1.5 rounded-full border border-orange-200 bg-white px-3 py-1 text-[11px] font-semibold text-orange-600 transition-colors hover:border-orange-300 hover:bg-orange-50"
                  >
                    Quick
                    <X size={11} />
                  </button>
                )}
                {onlyEasy && (
                  <button
                    type="button"
                    onClick={() => setOnlyEasy(false)}
                    className="inline-flex items-center gap-1.5 rounded-full border border-orange-200 bg-white px-3 py-1 text-[11px] font-semibold text-orange-600 transition-colors hover:border-orange-300 hover:bg-orange-50"
                  >
                    Easy
                    <X size={11} />
                  </button>
                )}
              </div>
            )}
          </div>
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
      <div className="flex-1 flex flex-col items-center justify-start px-4 sm:px-6 pt-4 sm:pt-6 pb-6 overflow-hidden">
        <div className="w-full max-w-5xl flex flex-col items-center">
          <div className="relative flex items-center justify-center h-[340px] sm:h-[470px] w-full">
          {(loading || isSearchPending) && filtered.length === 0 ? (
            <div className="w-[260px] shrink-0 rounded-3xl bg-stone-100 animate-pulse aspect-[31/42] sm:w-[310px]" />
          ) : cardIndex >= filtered.length ? (
            <div className="w-[280px] shrink-0 rounded-3xl flex flex-col items-center justify-center gap-4 border-2 border-dashed border-stone-200 bg-white shadow-sm aspect-[31/42] sm:w-[320px]">
              <span className="text-6xl">🍳</span>
              <div className="text-center">
                <p className="font-bold text-stone-700" style={{ fontFamily: "'Fraunces', Georgia, serif" }}>
                  You've seen everything!
                </p>
                <p className="text-sm text-stone-400 mt-1">Try a different filter or check back soon</p>
              </div>
              <button
                onClick={() => { setCardIndex(0); setSelectedMealTypes([]); setSelectedCuisine(""); }}
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
                    initial={{ opacity: 0, scale: 0.74, x: -56 }}
                    animate={{ opacity: 0.34, scale: 0.82, x: -160 }}
                    exit={{ opacity: 0, scale: 0.7, x: -220 }}
                    transition={{ duration: 0.4 }}
                    className="absolute left-1/2 top-1/2 z-0 hidden h-[340px] w-[250px] -translate-x-1/2 -translate-y-1/2 pointer-events-none sm:block"
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
                    initial={{ opacity: 0, scale: 0.74, x: 56 }}
                    animate={{ opacity: 0.34, scale: 0.82, x: 160 }}
                    exit={{ opacity: 0, scale: 0.7, x: 220 }}
                    transition={{ duration: 0.4 }}
                    className="absolute left-1/2 top-1/2 z-0 hidden h-[340px] w-[250px] -translate-x-1/2 -translate-y-1/2 pointer-events-none sm:block"
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
                    animate={{ opacity: 1, scale: 1, y: 0, x: 0 }}
                    exit={{
                      opacity: 0,
                      scale: 0.5,
                      transition: { duration: 0.2 }
                    }}
                    transition={{ type: 'spring', damping: 20, stiffness: 100 }}
                    className="relative z-10 h-[330px] w-[260px] sm:h-[420px] sm:w-[310px]"
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
                className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-white border flex items-center justify-center text-red-400 hover:border-red-300 hover:text-red-500 transition-all active:scale-90 shadow-[0_10px_26px_rgba(28,25,23,0.08)]"
                style={{ borderColor: "rgba(248,113,113,0.32)" }}
              >
                <X size={22} />
              </button>

              <button
                onClick={() => {
                  if (!current) return;
                  setPreviewRecipe(current);
                  setPreviewOpen(true);
                }}
                className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-white border flex items-center justify-center text-sky-500 hover:border-sky-300 hover:text-sky-600 transition-all active:scale-90 shadow-[0_10px_26px_rgba(28,25,23,0.08)]"
                style={{ borderColor: "rgba(59,130,246,0.28)" }}
                aria-label="More info"
              >
                <Info size={20} />
              </button>

              {/* Save */}
              <motion.button
                onClick={handleSaveButton}
                data-tutorial="like-button"
                className="w-12 h-12 sm:w-14 sm:h-14 rounded-full flex items-center justify-center text-white transition-all active:scale-90 shadow-[0_14px_30px_rgba(249,115,22,0.28)]"
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
            <div className="mt-3 text-center">
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
        onOpenChange={(open) => {
          const pendingAction = previewDismissActionRef.current;
          previewDismissActionRef.current = null;

          if (!open && pendingAction === "save") {
            setPreviewRecipe(null);
            setPreviewOpen(false);
            return;
          }

          setPreviewOpen(open);
          if (!open) {
            setPreviewRecipe(null);
          }
        }}
        mode="explore"
        onAddMissingToGrocery={(recipe, missingIngredients) => {
          missingIngredients.forEach((ing) => addCustomGroceryItem(ing));
          addToGrocery(recipe.id); // Track that this recipe is in the grocery list
          toast.success(`Added ${missingIngredients.length} items from "${recipe.name}" to grocery list`);
        }}
        onChefClick={(chefId, chefName) => {
          if (previewRecipe) {
            setRecipeToRestoreAfterChefClose(previewRecipe);
          }
          setPendingChefProfile({ chefId, chefName });
          setPreviewOpen(false);
          setPreviewRecipe(null);
        }}
        onSave={(recipe) => {
          previewDismissActionRef.current = "save";
          saveAndContinue(recipe, { closePreview: true });
        }}
      />

      <Dialog open={filtersOpen} onOpenChange={setFiltersOpen}>
        <DialogContent className="w-[calc(100vw-1rem)] max-w-lg max-h-[calc(100dvh-env(safe-area-inset-top)-env(safe-area-inset-bottom)-1rem)] overflow-hidden p-0">
          <DialogHeader>
            <DialogTitle className="px-4 pt-4 sm:px-6 sm:pt-6">Discover Filters</DialogTitle>
          </DialogHeader>
          <div className="max-h-[65vh] space-y-5 overflow-y-auto px-4 pb-4 pr-2 sm:px-6 sm:pb-6 sm:pr-4">
            <section className="space-y-3 rounded-2xl border border-stone-200 bg-white p-4">
              <div>
                <p className="text-sm font-semibold text-stone-800">Meal type</p>
                <p className="mt-1 text-xs text-stone-500">Pick one or more kinds of recipes you want to see.</p>
              </div>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {MEAL_TYPE_FILTERS.map((mealType) => {
                  const active = selectedMealTypes.includes(mealType);
                  return (
                    <button
                      key={mealType}
                      type="button"
                      onClick={() => {
                        setSelectedMealTypes((prev) =>
                          prev.includes(mealType)
                            ? prev.filter((value) => value !== mealType)
                            : [...prev, mealType],
                        );
                      }}
                      className={`rounded-2xl border px-3 py-2 text-sm font-semibold transition-colors ${
                        active
                          ? "border-orange-500 bg-orange-50 text-orange-600"
                          : "border-stone-200 bg-white text-stone-600 hover:border-orange-300"
                      }`}
                    >
                      {mealType[0].toUpperCase() + mealType.slice(1)}
                    </button>
                  );
                })}
              </div>
            </section>

            <section className="space-y-3 rounded-2xl border border-stone-200 bg-white p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-stone-800">Pantry match</p>
                  <p className="mt-1 text-xs text-stone-500">Only show recipes that meet your minimum ingredient match.</p>
                </div>
                <span className="rounded-full bg-orange-50 px-3 py-1 text-sm font-semibold text-orange-600">
                  {minimumMatch}%
                </span>
              </div>
              <Slider
                value={[minimumMatch]}
                onValueChange={(value) => setMinimumMatch(value[0] ?? 0)}
                min={0}
                max={100}
                step={5}
              />
            </section>

            <section className="space-y-3 rounded-2xl border border-stone-200 bg-white p-4">
              <div>
                <p className="text-sm font-semibold text-stone-800">Cuisine</p>
                <p className="mt-1 text-xs text-stone-500">Focus on a specific cuisine, or leave it open.</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedCuisine("")}
                  className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ${
                    !selectedCuisine
                      ? "border-orange-500 bg-orange-50 text-orange-600"
                      : "border-stone-200 bg-white text-stone-600 hover:border-orange-300"
                  }`}
                >
                  All cuisines
                </button>
                {availableCuisines.map((cuisine) => (
                  <button
                    key={cuisine}
                    type="button"
                    onClick={() => setSelectedCuisine(cuisine)}
                    className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ${
                      selectedCuisine === cuisine
                        ? "border-orange-500 bg-orange-50 text-orange-600"
                        : "border-stone-200 bg-white text-stone-600 hover:border-orange-300"
                    }`}
                  >
                    {cuisine}
                  </button>
                ))}
              </div>
            </section>

            <section className="space-y-3 rounded-2xl border border-stone-200 bg-white p-4">
              <div>
                <p className="text-sm font-semibold text-stone-800">Recipe traits</p>
                <p className="mt-1 text-xs text-stone-500">Tighten the feed around the styles you want today.</p>
              </div>
              <div className="space-y-3">
                {[
                  { checked: onlyHighProtein, onChange: setOnlyHighProtein, label: "High protein", description: "Prioritize protein-forward recipes." },
                  { checked: onlyVegetarian, onChange: setOnlyVegetarian, label: "Vegetarian", description: "Hide meat and seafood recipes." },
                  { checked: onlyQuick, onChange: setOnlyQuick, label: "Quick meals", description: "30 minutes or less." },
                  { checked: onlyEasy, onChange: setOnlyEasy, label: "Easy", description: "Beginner-friendly recipes." },
                ].map((item) => (
                  <label key={item.label} className="flex items-start gap-3 rounded-2xl border border-stone-100 bg-stone-50/70 px-3 py-3">
                    <Checkbox
                      checked={item.checked}
                      onCheckedChange={(checked) => item.onChange(Boolean(checked))}
                      className="mt-0.5"
                    />
                    <span>
                      <span className="block text-sm font-semibold text-stone-800">{item.label}</span>
                      <span className="block text-xs text-stone-500">{item.description}</span>
                    </span>
                  </label>
                ))}
              </div>
            </section>

          </div>
          <div className="border-t border-stone-200 bg-background px-6 py-4">
            <div className="flex flex-col gap-2 sm:flex-row sm:justify-between">
              <button
                type="button"
                onClick={() => {
                  setSelectedMealTypes([]);
                  setSelectedCuisine("");
                  setMinimumMatch(0);
                  setOnlyHighProtein(false);
                  setOnlyVegetarian(false);
                  setOnlyQuick(false);
                  setOnlyEasy(false);
                }}
                className="rounded-2xl border border-stone-200 px-4 py-3 text-sm font-semibold text-stone-600 transition-colors hover:border-orange-300 hover:text-orange-600"
              >
                Clear filters
              </button>
              <button
                type="button"
                onClick={() => setFiltersOpen(false)}
                className="rounded-2xl bg-orange-500 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-orange-600"
              >
                Show recipes
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <ChefProfileModal
        chefId={selectedChefId}
        chefName={selectedChefName}
        open={!!selectedChefId}
        onNavigateToProfile={() => {
          setRecipeToRestoreAfterChefClose(null);
        }}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedChefId(null);
            setSelectedChefName(null);
            if (recipeToRestoreAfterChefClose) {
              const recipeToRestore = recipeToRestoreAfterChefClose;
              setRecipeToRestoreAfterChefClose(null);
              window.requestAnimationFrame(() => {
                setPreviewRecipe(recipeToRestore);
                setPreviewOpen(true);
              });
            }
          }
        }}
      />
    </div>
  );
}
