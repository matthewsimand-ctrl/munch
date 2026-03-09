import { useState, useRef, useCallback, useEffect } from "react";
import {
  X,
  Heart,
  Clock,
  Users,
  Star,
  Flame,
  Leaf,
  ChefHat,
  Filter,
  Loader2,
} from "lucide-react";
import { useBrowseFeed } from "@/hooks/useBrowseFeed";
import { useNavigate } from "react-router-dom";

interface Recipe {
  id: string;
  name: string;
  image: string;
  cook_time: string;
  difficulty: string;
  ingredients: string[];
  tags: string[];
  instructions: string[];
  source: string;
  cuisine?: string;
}

const DIFFICULTY_FILTERS = ["All", "Beginner", "Intermediate", "Advanced"];
const TIME_FILTERS = ["All", "< 30 min", "30-60 min", "> 60 min"];
const CUISINE_FILTERS = ["All", "Italian", "Asian", "Mexican", "Mediterranean", "American"];

function SwipeCard({
  recipe,
  offset,
  scale,
  opacity,
}: {
  recipe: Recipe;
  offset: number;
  scale: number;
  opacity: number;
}) {
  const gradient = recipe.cuisine 
    ? `from-${recipe.cuisine === "Italian" ? "green" : recipe.cuisine === "Mexican" ? "orange" : "blue"}-400 to-${recipe.cuisine === "Italian" ? "red" : recipe.cuisine === "Mexican" ? "red" : "purple"}-400`
    : "from-orange-400 to-pink-400";

  return (
    <div
      className="absolute inset-0 rounded-3xl overflow-hidden shadow-2xl"
      style={{
        transform: `translateY(${offset}px) scale(${scale})`,
        opacity,
        transition: "transform 0.35s cubic-bezier(.34,1.56,.64,1), opacity 0.3s ease",
        zIndex: Math.round(opacity * 10),
      }}
    >
      {/* Image or gradient */}
      {recipe.image ? (
        <img src={recipe.image} alt={recipe.name} className="absolute inset-0 w-full h-full object-cover" />
      ) : (
        <div className={`absolute inset-0 bg-gradient-to-br ${gradient} opacity-90`} />
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />

      {/* Content */}
      <div className="relative h-full flex flex-col justify-between p-6 text-white">
        {/* Top row */}
        <div className="flex items-start justify-between">
          <div className="flex flex-wrap gap-1.5">
            {recipe.tags.slice(0, 2).map((t) => (
              <span key={t} className="text-xs bg-white/20 backdrop-blur-sm px-2.5 py-0.5 rounded-full font-medium">
                {t}
              </span>
            ))}
          </div>
          <div className="flex items-center gap-1 bg-white/20 backdrop-blur-sm px-2.5 py-0.5 rounded-full text-xs font-semibold">
            <Star size={11} className="fill-white" /> {recipe.difficulty}
          </div>
        </div>

        {/* Bottom info */}
        <div>
          <h2 className="text-2xl font-bold leading-tight mb-2">{recipe.name}</h2>
          <div className="flex items-center gap-4 text-sm text-white/80">
            <span className="flex items-center gap-1"><Clock size={13} /> {recipe.cook_time}</span>
            {recipe.cuisine && <span className="flex items-center gap-1">🌍 {recipe.cuisine}</span>}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Browse() {
  const navigate = useNavigate();
  const { recipes, loading, loaded, loadFeed } = useBrowseFeed();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [savedIds, setSavedIds] = useState<string[]>([]);
  const [animating, setAnimating] = useState<"left" | "right" | null>(null);
  const [difficultyFilter, setDifficultyFilter] = useState("All");
  const [timeFilter, setTimeFilter] = useState("All");
  const [cuisineFilter, setCuisineFilter] = useState("All");
  const [showFilters, setShowFilters] = useState(false);
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
  });

  const currentRecipe = filteredRecipes[currentIndex];
  const nextRecipe = filteredRecipes[(currentIndex + 1) % filteredRecipes.length];
  const nextNextRecipe = filteredRecipes[(currentIndex + 2) % filteredRecipes.length];

  const handlePass = useCallback(() => {
    if (animating || !filteredRecipes.length) return;
    setAnimating("left");
    setTimeout(() => {
      setCurrentIndex((i) => (i + 1) % filteredRecipes.length);
      setAnimating(null);
    }, 350);
  }, [animating, filteredRecipes.length]);

  const handleSave = useCallback(() => {
    if (animating || !currentRecipe) return;
    setSavedIds((ids) =>
      ids.includes(currentRecipe.id) ? ids : [...ids, currentRecipe.id]
    );
    setAnimating("right");
    setTimeout(() => {
      setCurrentIndex((i) => (i + 1) % filteredRecipes.length);
      setAnimating(null);
    }, 350);
  }, [animating, currentRecipe, filteredRecipes.length]);

  // Keyboard support
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft" || e.key === "x") handlePass();
      if (e.key === "ArrowRight" || e.key === "s") handleSave();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [handlePass, handleSave]);

  const isSaved = currentRecipe ? savedIds.includes(currentRecipe.id) : false;

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

  return (
    <div className="min-h-full bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 px-6 py-5">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate('/dashboard')} className="flex items-center gap-2 shrink-0">
              <div className="w-7 h-7 bg-orange-500 rounded-lg flex items-center justify-center">
                <ChefHat className="text-white" size={14} />
              </div>
            </button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Recipes</h1>
              <p className="text-sm text-gray-500 mt-0.5">{filteredRecipes.length} recipes · Use ← → keys</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <Filter size={14} /> Filters
            </button>
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <Heart size={14} className="text-rose-400 fill-rose-400" />
              <span className="font-semibold text-gray-700">{savedIds.length}</span> saved
            </div>
          </div>
        </div>

        {/* Filters panel */}
        {showFilters && (
          <div className="max-w-7xl mx-auto mt-4 p-4 bg-gray-50 rounded-xl space-y-3">
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
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="flex flex-col lg:flex-row gap-8 items-start justify-center">

          {/* ── Card stack (centered) ─────────────────────────────────────── */}
          <div className="w-full lg:w-auto flex flex-col items-center gap-6">
            {/* Card area */}
            <div
              ref={constraintsRef}
              className="relative w-full max-w-sm"
              style={{ height: 420 }}
            >
              {/* Stack: next-next */}
              {nextNextRecipe && <SwipeCard recipe={nextNextRecipe} offset={16} scale={0.88} opacity={0.5} />}
              {/* Stack: next */}
              {nextRecipe && <SwipeCard recipe={nextRecipe} offset={8} scale={0.94} opacity={0.75} />}
              {/* Top card */}
              {currentRecipe && (
                <div
                  className="absolute inset-0 rounded-3xl overflow-hidden shadow-2xl cursor-grab active:cursor-grabbing"
                  style={{
                    transform: `
                      translateX(${animating === "left" ? -300 : animating === "right" ? 300 : 0}px)
                      rotate(${animating === "left" ? -15 : animating === "right" ? 15 : 0}deg)
                      scale(1)
                    `,
                    opacity: animating ? 0 : 1,
                    transition: "transform 0.35s cubic-bezier(.34,1.56,.64,1), opacity 0.3s ease",
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
                    <div>
                      <h2 className="text-2xl font-bold leading-tight mb-2">{currentRecipe.name}</h2>
                      <div className="flex items-center gap-4 text-sm text-white/80">
                        <span className="flex items-center gap-1"><Clock size={13} /> {currentRecipe.cook_time}</span>
                        {currentRecipe.cuisine && <span className="flex items-center gap-1">🌍 {currentRecipe.cuisine}</span>}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Action buttons */}
            <div className="flex items-center gap-6">
              <button
                onClick={handlePass}
                className="w-14 h-14 rounded-full bg-white border-2 border-gray-200 shadow-md flex items-center justify-center text-gray-400 hover:border-red-300 hover:text-red-400 hover:scale-110 transition-all"
                title="Pass (←)"
              >
                <X size={22} strokeWidth={2.5} />
              </button>

              <div className="text-xs text-gray-400 font-medium text-center leading-tight">
                {currentIndex + 1} / {filteredRecipes.length}
              </div>

              <button
                onClick={handleSave}
                className={`w-14 h-14 rounded-full shadow-md flex items-center justify-center transition-all hover:scale-110 ${
                  isSaved
                    ? "bg-rose-500 border-2 border-rose-500 text-white"
                    : "bg-white border-2 border-gray-200 text-gray-400 hover:border-rose-300 hover:text-rose-400"
                }`}
                title="Save (→)"
              >
                <Heart size={22} strokeWidth={2.5} className={isSaved ? "fill-white" : ""} />
              </button>
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

          {/* ── Info panel (desktop only) ─────────────────────────────────── */}
          {currentRecipe && (
            <div className="hidden lg:flex flex-col gap-4 w-80 xl:w-96 shrink-0">

              {/* Recipe detail card */}
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="p-5">
                  <div className="flex items-start justify-between mb-3">
                    <h2 className="text-lg font-bold text-gray-900 leading-tight">{currentRecipe.name}</h2>
                  </div>

                  <div className="flex flex-wrap gap-1.5 mb-4">
                    {currentRecipe.tags.map((t) => (
                      <span key={t} className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full font-medium">
                        {t}
                      </span>
                    ))}
                  </div>

                  {/* Stats */}
                  <div className="grid grid-cols-2 gap-3 mb-4">
                    <div className="bg-gray-50 rounded-xl p-2.5 text-center">
                      <Clock size={14} className="mx-auto text-gray-400 mb-1" />
                      <div className="text-sm font-bold text-gray-800">{currentRecipe.cook_time}</div>
                      <div className="text-xs text-gray-400">Time</div>
                    </div>
                    <div className="bg-gray-50 rounded-xl p-2.5 text-center">
                      <Star size={14} className="mx-auto text-gray-400 mb-1" />
                      <div className="text-sm font-bold text-gray-800">{currentRecipe.difficulty}</div>
                      <div className="text-xs text-gray-400">Difficulty</div>
                    </div>
                  </div>

                  {/* Ingredients */}
                  <div className="border-t border-gray-100 pt-4">
                    <div className="flex items-center gap-1.5 mb-2.5">
                      <Leaf size={13} className="text-green-500" />
                      <span className="text-xs font-semibold text-gray-700 uppercase tracking-wide">Ingredients ({currentRecipe.ingredients.length})</span>
                    </div>
                    <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto">
                      {currentRecipe.ingredients.slice(0, 10).map((ing, i) => (
                        <span key={i} className="text-xs bg-green-50 text-green-700 px-2 py-0.5 rounded-full">
                          {ing}
                        </span>
                      ))}
                      {currentRecipe.ingredients.length > 10 && (
                        <span className="text-xs text-gray-400 px-2 py-0.5">
                          +{currentRecipe.ingredients.length - 10} more
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Source info */}
              {currentRecipe.source && (
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
                  <p className="text-xs text-gray-500 font-medium uppercase tracking-wide mb-2">Recipe Source</p>
                  <p className="text-sm text-gray-700">{currentRecipe.source}</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
