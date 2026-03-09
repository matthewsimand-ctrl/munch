import { useState, useRef, useCallback, useEffect, useMemo } from "react";
import {
  X,
  Heart,
  Clock,
  Users,
  Star,
  ChefHat,
  Filter,
  Loader2,
  Check,
  ShoppingCart,
  Play,
} from "lucide-react";
import { useBrowseFeed } from "@/hooks/useBrowseFeed";
import { useNavigate } from "react-router-dom";
import { useStore } from "@/lib/store";
import { calculateMatch } from "@/lib/matchLogic";
import { parseIngredientLine, scaleIngredientQuantity } from "@/lib/ingredientText";
import { AnimatePresence, motion } from "framer-motion";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import NutritionCard from "@/components/NutritionCard";
import { toast } from "sonner";

interface Recipe {
  id: string;
  name: string;
  image: string;
  cook_time: string;
  difficulty: string;
  ingredients: string[];
  tags: string[];
  instructions: string[];
  cuisine?: string;
  servings?: number;
}

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

const DIFFICULTY_FILTERS = ["All", "Beginner", "Intermediate", "Advanced"];
const TIME_FILTERS = ["All", "< 30 min", "30-60 min", "> 60 min"];
const CUISINE_FILTERS = ["All", "Italian", "Asian", "Mexican", "Mediterranean", "American"];

export default function Browse() {
  const navigate = useNavigate();
  const { recipes, loading, loaded, loadFeed } = useBrowseFeed();
  const { pantryList, likeRecipe, likedRecipes, addCustomGroceryItem } = useStore();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [animating, setAnimating] = useState<"left" | "right" | null>(null);
  const [difficultyFilter, setDifficultyFilter] = useState("All");
  const [timeFilter, setTimeFilter] = useState("All");
  const [cuisineFilter, setCuisineFilter] = useState("All");
  const [showFilters, setShowFilters] = useState(false);
  const [swipeIndicator, setSwipeIndicator] = useState<"saved" | "passed" | null>(null);
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);
  const [servingMultiplier, setServingMultiplier] = useState(1);
  const [groceryAddedRecipeIds, setGroceryAddedRecipeIds] = useState<string[]>([]);
  const constraintsRef = useRef(null);

  useEffect(() => {
    loadFeed();
  }, [loadFeed]);

  // Apply filters
  const filteredRecipes = recipes.filter((r) => {
    if (difficultyFilter !== "All" && r.difficulty !== difficultyFilter) return false;
    if (cuisineFilter !== "All" && r.cuisine !== cuisineFilter) return false;
    if (timeFilter !== "All") {
      const time = parseInt(r.cook_time);
      if (timeFilter === "< 30 min" && time >= 30) return false;
      if (timeFilter === "30-60 min" && (time < 30 || time >= 60)) return false;
      if (timeFilter === "> 60 min" && time < 60) return false;
    }
    return true;
  }) as Recipe[];

  const currentRecipe = filteredRecipes[currentIndex];
  const nextRecipe = filteredRecipes[currentIndex + 1];

  // Calculate match for current recipe
  const pantryNames = pantryList.map((p) => p.name);
  const currentMatch = currentRecipe ? calculateMatch(pantryNames, currentRecipe.ingredients) : null;
  const nextMatch = nextRecipe ? calculateMatch(pantryNames, nextRecipe.ingredients) : null;
  const selectedIngredients = selectedRecipe ? normalizeStringArray((selectedRecipe as any).ingredients) : [];
  const selectedMatch = selectedRecipe ? calculateMatch(pantryNames, selectedIngredients) : null;
  const scaledServings = selectedRecipe ? Math.max(1, Math.round((selectedRecipe.servings || 4) * servingMultiplier)) : 1;
  const selectedInstructions = selectedRecipe ? normalizeStringArray((selectedRecipe as any).instructions) : [];
  const selectedSource = selectedRecipe ? String((selectedRecipe as any).source || "Unknown source") : null;
  const selectedSourceUrl = selectedRecipe ? String((selectedRecipe as any).source_url || "").trim() : "";
  const selectedRawPayload = selectedRecipe ? ((selectedRecipe as any).raw_api_payload ?? selectedRecipe) : null;
  const isSelectedRecipeAddedToGrocery = useMemo(() => (
    selectedRecipe ? groceryAddedRecipeIds.includes(selectedRecipe.id) : false
  ), [groceryAddedRecipeIds, selectedRecipe]);


  useEffect(() => {
    if (!selectedRecipe) return;
    setServingMultiplier(1);
  }, [selectedRecipe?.id]);
  // Count saved recipes
  const savedCount = likedRecipes.length;

  const handlePass = useCallback(() => {
    if (animating || !filteredRecipes.length) return;
    setAnimating("left");
    setSwipeIndicator("passed");
    setTimeout(() => {
      setCurrentIndex((i) => Math.min(i + 1, filteredRecipes.length - 1));
      setAnimating(null);
      setSwipeIndicator(null);
    }, 500);
  }, [animating, filteredRecipes.length]);

  const handleSave = useCallback(() => {
    if (animating || !currentRecipe) return;
    likeRecipe(currentRecipe.id, currentRecipe);
    setAnimating("right");
    setSwipeIndicator("saved");
    setTimeout(() => {
      setCurrentIndex((i) => Math.min(i + 1, filteredRecipes.length - 1));
      setAnimating(null);
      setSwipeIndicator(null);
    }, 500);
  }, [animating, currentRecipe, filteredRecipes.length, likeRecipe]);

  // Keyboard support
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft" || e.key === "x") handlePass();
      if (e.key === "ArrowRight" || e.key === "s") handleSave();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [handlePass, handleSave]);

  const isSaved = currentRecipe ? likedRecipes.includes(currentRecipe.id) : false;

  if (loading || !loaded) {
    return (
      <div className="min-h-full bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-orange-500 mx-auto mb-3" />
          <p className="text-sm text-gray-500">Loading recipes...</p>
        </div>
      </div>
    );
  }

  if (!filteredRecipes.length) {
    return (
      <div className="min-h-full bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <ChefHat className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-sm text-gray-500">No recipes match your filters</p>
          <button
            onClick={() => {
              setDifficultyFilter("All");
              setTimeFilter("All");
              setCuisineFilter("All");
            }}
            className="mt-3 text-sm text-orange-500 hover:text-orange-600 font-semibold"
          >
            Clear filters
          </button>
        </div>
      </div>
    );
  }

  const matchBadgeColor = (percentage: number) => {
    if (percentage >= 80) return "bg-green-500";
    if (percentage >= 50) return "bg-yellow-500";
    return "bg-orange-500";
  };

  return (
    <div className="min-h-full bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 px-6 py-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate('/dashboard')} className="flex items-center gap-2 shrink-0">
              <div className="w-7 h-7 bg-orange-500 rounded-lg flex items-center justify-center">
                <ChefHat className="text-white" size={14} />
              </div>
            </button>
            <div>
              <h1 className="text-xl font-bold text-orange-500">Explore</h1>
              <p className="text-xs text-gray-500 mt-0.5">{filteredRecipes.length} to browse</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <Filter size={14} /> Filters
            </button>
            <div className="flex items-center gap-2 text-sm text-gray-500 bg-gray-50 rounded-lg px-3 py-2">
              <Heart size={14} className="text-rose-400 fill-rose-400" />
              <span className="font-semibold text-gray-700">{savedCount}</span> saved
            </div>
          </div>
        </div>

        {/* Filters panel */}
        {showFilters && (
          <div className="max-w-5xl mx-auto mt-4 p-4 bg-gray-50 rounded-xl space-y-3">
            <div>
              <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1.5 block">Difficulty</label>
              <div className="flex gap-2 flex-wrap">
                {DIFFICULTY_FILTERS.map((f) => (
                  <button
                    key={f}
                    onClick={() => setDifficultyFilter(f)}
                    className={`text-xs font-medium px-3 py-1.5 rounded-full border transition-all ${
                      difficultyFilter === f
                        ? "bg-orange-500 text-white border-orange-500"
                        : "bg-white text-gray-600 border-gray-200 hover:border-gray-300"
                    }`}
                  >
                    {f}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1.5 block">Cook Time</label>
              <div className="flex gap-2 flex-wrap">
                {TIME_FILTERS.map((f) => (
                  <button
                    key={f}
                    onClick={() => setTimeFilter(f)}
                    className={`text-xs font-medium px-3 py-1.5 rounded-full border transition-all ${
                      timeFilter === f
                        ? "bg-orange-500 text-white border-orange-500"
                        : "bg-white text-gray-600 border-gray-200 hover:border-gray-300"
                    }`}
                  >
                    {f}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1.5 block">Cuisine</label>
              <div className="flex gap-2 flex-wrap">
                {CUISINE_FILTERS.map((f) => (
                  <button
                    key={f}
                    onClick={() => setCuisineFilter(f)}
                    className={`text-xs font-medium px-3 py-1.5 rounded-full border transition-all ${
                      cuisineFilter === f
                        ? "bg-orange-500 text-white border-orange-500"
                        : "bg-white text-gray-600 border-gray-200 hover:border-gray-300"
                    }`}
                  >
                    {f}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Body */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        <div className="flex flex-col items-center justify-center">

          {/* ── Card stack (centered) ─────────────────────────────────────── */}
          <div className="w-full flex flex-col items-center gap-5">
            {/* Card area */}
            <div
              ref={constraintsRef}
              className="relative w-full max-w-md"
              style={{ height: 560 }}
            >
              {/* Swipe Indicator Overlay */}
              <AnimatePresence>
                {swipeIndicator && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.5 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    className="absolute inset-0 z-50 flex items-center justify-center pointer-events-none"
                  >
                    {swipeIndicator === "saved" ? (
                      <div className="bg-green-500 text-white px-8 py-4 rounded-2xl shadow-2xl flex items-center gap-3 text-2xl font-bold">
                        <Heart className="fill-white" size={32} />
                        SAVED
                      </div>
                    ) : (
                      <div className="bg-red-500 text-white px-8 py-4 rounded-2xl shadow-2xl flex items-center gap-3 text-2xl font-bold">
                        <X size={32} strokeWidth={3} />
                        PASS
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Stack: next card (static, no animation) */}
              {nextRecipe && !animating && (
                <div
                  className="absolute inset-0 rounded-3xl overflow-hidden shadow-lg pointer-events-none"
                  style={{
                    transform: "scale(0.95) translateY(12px)",
                    opacity: 0.5,
                    zIndex: 0,
                  }}
                >
                  {nextRecipe.image ? (
                    <img src={nextRecipe.image} alt={nextRecipe.name} className="absolute inset-0 w-full h-full object-cover" />
                  ) : (
                    <div className="absolute inset-0 bg-gradient-to-br from-orange-400 to-pink-400 opacity-90" />
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
                  <div className="absolute bottom-4 left-4 right-4 text-white">
                    <h3 className="text-xl font-bold">{nextRecipe.name}</h3>
                  </div>
                  {nextMatch && (
                    <div className={`absolute bottom-4 right-4 ${matchBadgeColor(nextMatch.percentage)} text-white px-3 py-1 rounded-full text-sm font-bold shadow-md`}>
                      {nextMatch.percentage}% Match
                    </div>
                  )}
                </div>
              )}

              {/* Top card */}
              {currentRecipe && (
                <div
                  onClick={() => setSelectedRecipe(currentRecipe)}
                  className="absolute inset-0 rounded-3xl overflow-hidden shadow-2xl cursor-pointer"
                  style={{
                    transform: `
                      translateX(${animating === "left" ? -300 : animating === "right" ? 300 : 0}px)
                      rotate(${animating === "left" ? -15 : animating === "right" ? 15 : 0}deg)
                      scale(1)
                    `,
                    opacity: animating ? 0 : 1,
                    transition: "transform 0.4s cubic-bezier(.34,1.56,.64,1), opacity 0.3s ease",
                    zIndex: 10,
                  }}
                >
                  {currentRecipe.image ? (
                    <img src={currentRecipe.image} alt={currentRecipe.name} className="absolute inset-0 w-full h-full object-cover" />
                  ) : (
                    <div className="absolute inset-0 bg-gradient-to-br from-orange-400 to-pink-400 opacity-90" />
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
                  <div className="relative h-full flex flex-col justify-between p-6 text-white">
                    <div className="flex items-start justify-between">
                      <div className="flex flex-wrap gap-1.5">
                        {currentRecipe.tags.slice(0, 2).map((t) => (
                          <span key={t} className="text-xs bg-white/20 backdrop-blur-sm px-2.5 py-0.5 rounded-full font-medium">
                            {t}
                          </span>
                        ))}
                      </div>
                      <div className="flex items-center gap-1 bg-white/20 backdrop-blur-sm px-2.5 py-0.5 rounded-full text-xs font-semibold">
                        <Star size={11} className="fill-white" /> {currentRecipe.difficulty}
                      </div>
                    </div>
                      <div className="max-w-[80%]">
                      {/* Match Badge */}
                      {currentMatch && (
                        <div className={`inline-flex items-center gap-1.5 ${matchBadgeColor(currentMatch.percentage)} text-white px-3 py-1.5 rounded-full text-sm font-bold shadow-md mb-3`}>
                          <Check size={14} /> {currentMatch.percentage}% Match
                        </div>
                      )}
                      <h2 className="text-3xl font-bold leading-tight mb-2">{currentRecipe.name}</h2>
                      <div className="flex items-center gap-4 text-sm text-white/90 mb-2">
                        <span className="flex items-center gap-1"><Clock size={13} /> {currentRecipe.cook_time}</span>
                        {currentRecipe.cuisine && <span className="flex items-center gap-1">🌍 {currentRecipe.cuisine}</span>}
                      </div>
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {currentRecipe.ingredients.slice(0, 3).map((line) => {
                          const parsed = parseIngredientLine(line);
                          const label = parsed.quantity ? `${parsed.name} · ${parsed.quantity}` : parsed.name;
                          return (
                            <span key={`${currentRecipe.id}-${line}`} className="text-[11px] bg-white/20 backdrop-blur-sm px-2.5 py-1 rounded-full font-medium">
                              {label}
                            </span>
                          );
                        })}
                      </div>
                      <p className="text-xs text-white/90 mt-2">Tap photo to open full recipe details</p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Action buttons */}
            <div className="w-full max-w-md bg-white rounded-2xl border border-gray-100 shadow-sm px-4 py-3">
              <div className="flex items-center justify-between gap-4">
              <button
                onClick={handlePass}
                className="w-16 h-16 rounded-full bg-white border-2 border-gray-200 shadow-md flex items-center justify-center text-gray-400 hover:border-red-300 hover:text-red-400 hover:scale-110 transition-all"
                title="Pass (←)"
              >
                <X size={22} strokeWidth={2.5} />
              </button>

              <div className="text-center">
                <p className="text-xs uppercase tracking-wide text-gray-400">Recipe</p>
                <p className="text-sm font-semibold text-gray-700">{currentIndex + 1} / {filteredRecipes.length}</p>
              </div>

              <button
                onClick={handleSave}
                className={`w-16 h-16 rounded-full shadow-md flex items-center justify-center transition-all hover:scale-110 ${
                  isSaved
                    ? "bg-rose-500 border-2 border-rose-500 text-white"
                    : "bg-white border-2 border-gray-200 text-gray-400 hover:border-rose-300 hover:text-rose-400"
                }`}
                title="Save (→)"
              >
                <Heart size={22} strokeWidth={2.5} className={isSaved ? "fill-white" : ""} />
              </button>
              </div>
            </div>

            {/* Keyboard hint */}
            <div className="hidden md:flex items-center gap-4 text-xs text-gray-400">
              <div className="flex items-center gap-1.5">
                <kbd className="px-1.5 py-0.5 bg-white border border-gray-200 rounded text-gray-500 font-mono shadow-sm">←</kbd>
                <span>Pass</span>
              </div>
              <div className="flex items-center gap-1.5">
                <kbd className="px-1.5 py-0.5 bg-white border border-gray-200 rounded text-gray-500 font-mono shadow-sm">→</kbd>
                <span>Save</span>
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* Recipe Detail Dialog */}
      <Dialog open={!!selectedRecipe} onOpenChange={() => setSelectedRecipe(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">{selectedRecipe?.name}</DialogTitle>
          </DialogHeader>
          <div className="flex-1 min-h-0 overflow-y-auto -mx-6 px-6">
            {selectedRecipe && selectedMatch && (
              <div className="space-y-6 pb-4">
                {/* Image */}
                {selectedRecipe.image && (
                  <div className="relative rounded-xl overflow-hidden aspect-video">
                    <img src={selectedRecipe.image} alt={selectedRecipe.name} className="w-full h-full object-cover" />
                    <div className={`absolute bottom-3 right-3 ${matchBadgeColor(selectedMatch.percentage)} text-white px-3 py-1.5 rounded-full text-sm font-bold shadow-md`}>
                      {selectedMatch.percentage}% Match
                    </div>
                  </div>
                )}

                {/* Meta */}
                <div className="flex flex-wrap gap-4 text-sm text-gray-600">
                  <span className="flex items-center gap-1.5"><Clock size={16} /> {selectedRecipe.cook_time}</span>
                  <span className="flex items-center gap-1.5"><Star size={16} /> {selectedRecipe.difficulty}</span>
                  {selectedRecipe.cuisine && <span className="flex items-center gap-1.5">🌍 {selectedRecipe.cuisine}</span>}
                </div>

                {/* Tags */}
                <div className="flex flex-wrap gap-2">
                  {selectedRecipe.tags.map((t) => (
                    <span key={t} className="text-xs bg-gray-100 text-gray-600 px-2.5 py-1 rounded-full font-medium">
                      {t}
                    </span>
                  ))}
                </div>

                <div className="flex items-center justify-between rounded-lg border border-gray-200 bg-gray-50 p-3">
                  <p className="text-sm text-gray-600">Servings: <span className="font-semibold text-gray-900">{scaledServings}</span></p>
                  <div className="inline-flex items-center gap-1">
                    {[0.5, 1, 2].map((value) => (
                      <button
                        key={value}
                        onClick={() => setServingMultiplier(value)}
                        className={`px-2.5 py-1 rounded-md text-xs font-semibold ${servingMultiplier === value ? "bg-primary text-primary-foreground" : "bg-white text-gray-500"}`}
                      >
                        {value}x
                      </button>
                    ))}
                  </div>
                </div>

                <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 text-sm">
                  <p className="text-gray-500">Source</p>
                  {selectedSourceUrl ? (
                    <a className="font-semibold text-primary hover:underline" href={selectedSourceUrl} target="_blank" rel="noreferrer">
                      {selectedSource}
                    </a>
                  ) : (
                    <p className="font-semibold text-gray-900">{selectedSource}</p>
                  )}
                </div>

                {/* Ingredients */}
                <div>
                  <h3 className="text-sm font-semibold text-gray-900 mb-3">Ingredients</h3>
                  <ul className="space-y-2">
                    {selectedIngredients.map((ingredientLine) => {
                      const parsed = parseIngredientLine(ingredientLine);
                      const scaledQty = parsed.quantity ? scaleIngredientQuantity(parsed.quantity, servingMultiplier) : "";
                      const isMatched = selectedMatch.matched.includes(ingredientLine);
                      return (
                        <li key={ingredientLine} className="flex items-center justify-between rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm">
                          <span className="font-medium text-gray-900">{parsed.name}</span>
                          <div className="flex items-center gap-2">
                            {scaledQty && <span className="text-gray-500">{scaledQty}</span>}
                            {isMatched ? (
                              <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-xs font-semibold text-green-700"><Check size={12} /> In pantry</span>
                            ) : (
                              <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2 py-0.5 text-xs font-semibold text-red-600"><ShoppingCart size={12} /> Missing</span>
                            )}
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                  {/* Add missing to grocery */}
                  {selectedMatch.missing.length > 0 && (
                    <button
                      onClick={() => {
                        selectedMatch.missing.forEach((ing) => {
                          const parsed = parseIngredientLine(ing);
                          const qty = parsed.quantity ? scaleIngredientQuantity(parsed.quantity, servingMultiplier) : "1";
                          addCustomGroceryItem(parsed.name, qty);
                        });
                        setGroceryAddedRecipeIds((prev) => prev.includes(selectedRecipe!.id) ? prev : [...prev, selectedRecipe!.id]);
                        toast.success(`Added ${selectedMatch.missing.length} items to grocery list`);
                      }}
                      disabled={isSelectedRecipeAddedToGrocery}
                      className={`mt-3 flex items-center gap-2 text-sm font-semibold transition-colors ${isSelectedRecipeAddedToGrocery ? "text-muted-foreground cursor-not-allowed" : "text-primary hover:text-primary/80"}`}
                    >
                      <ShoppingCart size={14} /> {isSelectedRecipeAddedToGrocery ? "Already added to grocery list" : `Add ${selectedMatch.missing.length} missing items to grocery list`}
                    </button>
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
                  servings={scaledServings}
                />

                <details className="rounded-lg border border-gray-200 bg-gray-50 p-3" open>
                  <summary className="cursor-pointer text-sm font-semibold text-gray-800">View raw API JSON</summary>
                  <pre className="mt-3 max-h-64 overflow-auto rounded bg-white p-3 text-xs text-gray-700">
{JSON.stringify(selectedRawPayload, null, 2)}
                    </pre>
                  {(selectedRecipe as any)?.raw_api_payload == null && (
                    <p className="mt-2 text-xs text-gray-500">Showing normalized recipe object because the source did not provide raw payload.</p>
                  )}
                </details>

                {/* Save button */}
                <Button
                  onClick={() => {
                    if (selectedRecipe) {
                      likeRecipe(selectedRecipe.id, selectedRecipe as any);
                      toast.success(`${selectedRecipe.name} saved!`);
                      setSelectedRecipe(null);
                    }
                  }}
                  className="w-full flex items-center justify-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground font-bold py-3 rounded-xl"
                >
                  <Heart size={18} /> Save Recipe
                </Button>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
