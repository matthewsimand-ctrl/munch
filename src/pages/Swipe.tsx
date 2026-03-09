import { useState, useRef, useCallback, useEffect } from "react";
import {
  X,
  Heart,
  Clock,
  Users,
  Star,
  ChevronLeft,
  ChevronRight,
  Flame,
  Leaf,
  Info,
  BookOpen,
} from "lucide-react";

// ── Mock recipe data (replace with your real source) ─────────────────────────
const RECIPES = [
  {
    id: 1,
    title: "Shakshuka with Feta",
    time: "25 min",
    servings: 4,
    rating: 4.8,
    calories: 320,
    tags: ["Vegetarian", "High Protein", "Mediterranean"],
    description:
      "Poached eggs nestled in a rich, spiced tomato sauce with crumbled feta, fresh herbs, and a side of crusty bread. A timeless one-pan wonder.",
    ingredients: ["Eggs", "Canned tomatoes", "Bell peppers", "Feta", "Cumin", "Paprika", "Garlic", "Onion"],
    emoji: "🍳",
    gradient: "from-amber-400 via-orange-400 to-red-400",
    difficulty: "Easy",
  },
  {
    id: 2,
    title: "Thai Green Curry",
    time: "35 min",
    servings: 4,
    rating: 4.7,
    calories: 480,
    tags: ["Gluten-Free", "Spicy", "Asian"],
    description:
      "Fragrant green curry paste, creamy coconut milk, fresh vegetables and your choice of protein. A weeknight favourite that tastes like takeout — only better.",
    ingredients: ["Green curry paste", "Coconut milk", "Thai basil", "Bamboo shoots", "Lime", "Fish sauce", "Zucchini"],
    emoji: "🍛",
    gradient: "from-green-400 via-emerald-400 to-teal-400",
    difficulty: "Medium",
  },
  {
    id: 3,
    title: "Lemon Herb Salmon",
    time: "20 min",
    servings: 2,
    rating: 4.9,
    calories: 410,
    tags: ["High Protein", "Omega-3", "Quick"],
    description:
      "Pan-seared salmon glazed with lemon butter, fresh dill, and capers. Ready in under 25 minutes and impressive enough for company.",
    ingredients: ["Salmon fillets", "Lemon", "Dill", "Capers", "Butter", "Garlic", "Olive oil"],
    emoji: "🐟",
    gradient: "from-blue-400 via-cyan-400 to-sky-400",
    difficulty: "Easy",
  },
  {
    id: 4,
    title: "Mushroom Risotto",
    time: "45 min",
    servings: 4,
    rating: 4.6,
    calories: 520,
    tags: ["Vegetarian", "Italian", "Comfort"],
    description:
      "Creamy Arborio rice slow-cooked with a mix of wild mushrooms, white wine, parmesan, and thyme. The ultimate cosy dinner.",
    ingredients: ["Arborio rice", "Mixed mushrooms", "Parmesan", "White wine", "Shallots", "Thyme", "Butter", "Stock"],
    emoji: "🍄",
    gradient: "from-amber-600 via-yellow-500 to-amber-400",
    difficulty: "Medium",
  },
  {
    id: 5,
    title: "BBQ Chicken Bowl",
    time: "30 min",
    servings: 2,
    rating: 4.7,
    calories: 550,
    tags: ["High Protein", "American", "Meal Prep"],
    description:
      "Smoky BBQ chicken over fluffy rice with corn, avocado, red onion and a chipotle lime drizzle. Meal-preppable and endlessly customisable.",
    ingredients: ["Chicken thighs", "BBQ sauce", "Rice", "Corn", "Avocado", "Red onion", "Lime", "Cilantro"],
    emoji: "🍗",
    gradient: "from-rose-500 via-orange-400 to-yellow-400",
    difficulty: "Easy",
  },
];

type Recipe = typeof RECIPES[0];

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
      {/* Gradient background */}
      <div className={`absolute inset-0 bg-gradient-to-br ${recipe.gradient} opacity-90`} />

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
            <Star size={11} className="fill-white" /> {recipe.rating}
          </div>
        </div>

        {/* Emoji */}
        <div className="text-7xl text-center select-none">{recipe.emoji}</div>

        {/* Bottom info */}
        <div>
          <h2 className="text-2xl font-bold leading-tight mb-2">{recipe.title}</h2>
          <div className="flex items-center gap-4 text-sm text-white/80">
            <span className="flex items-center gap-1"><Clock size={13} /> {recipe.time}</span>
            <span className="flex items-center gap-1"><Users size={13} /> {recipe.servings} servings</span>
            <span className="flex items-center gap-1"><Flame size={13} /> {recipe.calories} cal</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Browse() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [savedIds, setSavedIds] = useState<number[]>([]);
  const [animating, setAnimating] = useState<"left" | "right" | null>(null);
  const constraintsRef = useRef(null);

  const currentRecipe = RECIPES[currentIndex];
  const nextRecipe = RECIPES[(currentIndex + 1) % RECIPES.length];
  const nextNextRecipe = RECIPES[(currentIndex + 2) % RECIPES.length];

  const handlePass = useCallback(() => {
    if (animating) return;
    setAnimating("left");
    setTimeout(() => {
      setCurrentIndex((i) => (i + 1) % RECIPES.length);
      setAnimating(null);
    }, 350);
  }, [animating]);

  const handleSave = useCallback(() => {
    if (animating) return;
    setSavedIds((ids) =>
      ids.includes(currentRecipe.id) ? ids : [...ids, currentRecipe.id]
    );
    setAnimating("right");
    setTimeout(() => {
      setCurrentIndex((i) => (i + 1) % RECIPES.length);
      setAnimating(null);
    }, 350);
  }, [animating, currentRecipe.id]);

  // Keyboard support
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft" || e.key === "x") handlePass();
      if (e.key === "ArrowRight" || e.key === "s") handleSave();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [handlePass, handleSave]);

  const isSaved = savedIds.includes(currentRecipe.id);

  return (
    <div className="min-h-full bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 px-6 py-5">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Browse</h1>
            <p className="text-sm text-gray-500 mt-0.5">Swipe or use ← → arrow keys</p>
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <Heart size={14} className="text-rose-400 fill-rose-400" />
            <span className="font-semibold text-gray-700">{savedIds.length}</span> saved this session
          </div>
        </div>
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
              <SwipeCard recipe={nextNextRecipe} offset={16} scale={0.88} opacity={0.5} />
              {/* Stack: next */}
              <SwipeCard recipe={nextRecipe} offset={8} scale={0.94} opacity={0.75} />
              {/* Top card */}
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
                <div className={`absolute inset-0 bg-gradient-to-br ${currentRecipe.gradient} opacity-90`} />
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
                      <Star size={11} className="fill-white" /> {currentRecipe.rating}
                    </div>
                  </div>
                  <div className="text-7xl text-center select-none">{currentRecipe.emoji}</div>
                  <div>
                    <h2 className="text-2xl font-bold leading-tight mb-2">{currentRecipe.title}</h2>
                    <div className="flex items-center gap-4 text-sm text-white/80">
                      <span className="flex items-center gap-1"><Clock size={13} /> {currentRecipe.time}</span>
                      <span className="flex items-center gap-1"><Users size={13} /> {currentRecipe.servings} serv.</span>
                      <span className="flex items-center gap-1"><Flame size={13} /> {currentRecipe.calories} cal</span>
                    </div>
                  </div>
                </div>
              </div>
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
                {currentIndex + 1} / {RECIPES.length}
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
          <div className="hidden lg:flex flex-col gap-4 w-80 xl:w-96 shrink-0">

            {/* Recipe detail card */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              {/* Gradient strip */}
              <div className={`h-2 bg-gradient-to-r ${currentRecipe.gradient}`} />

              <div className="p-5">
                <div className="flex items-start justify-between mb-3">
                  <h2 className="text-lg font-bold text-gray-900 leading-tight">{currentRecipe.title}</h2>
                  <span className="text-2xl ml-2 shrink-0">{currentRecipe.emoji}</span>
                </div>

                <div className="flex flex-wrap gap-1.5 mb-4">
                  {currentRecipe.tags.map((t) => (
                    <span key={t} className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full font-medium">
                      {t}
                    </span>
                  ))}
                </div>

                <p className="text-sm text-gray-600 leading-relaxed mb-4">{currentRecipe.description}</p>

                {/* Stats */}
                <div className="grid grid-cols-3 gap-3 mb-4">
                  {[
                    { label: "Time", value: currentRecipe.time, icon: Clock },
                    { label: "Servings", value: `${currentRecipe.servings}`, icon: Users },
                    { label: "Calories", value: `${currentRecipe.calories}`, icon: Flame },
                  ].map(({ label, value, icon: Icon }) => (
                    <div key={label} className="bg-gray-50 rounded-xl p-2.5 text-center">
                      <Icon size={14} className="mx-auto text-gray-400 mb-1" />
                      <div className="text-sm font-bold text-gray-800">{value}</div>
                      <div className="text-xs text-gray-400">{label}</div>
                    </div>
                  ))}
                </div>

                {/* Ingredients */}
                <div className="border-t border-gray-100 pt-4">
                  <div className="flex items-center gap-1.5 mb-2.5">
                    <Leaf size={13} className="text-green-500" />
                    <span className="text-xs font-semibold text-gray-700 uppercase tracking-wide">Ingredients</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {currentRecipe.ingredients.map((ing) => (
                      <span key={ing} className="text-xs bg-green-50 text-green-700 px-2 py-0.5 rounded-full">
                        {ing}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Navigation between recipes */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
              <p className="text-xs text-gray-500 font-medium uppercase tracking-wide mb-3">Up next</p>
              <div className="flex flex-col gap-2">
                {[nextRecipe, nextNextRecipe].map((r, i) => (
                  <div key={r.id} className="flex items-center gap-3 p-2 rounded-xl hover:bg-gray-50 transition-colors cursor-pointer">
                    <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${r.gradient} flex items-center justify-center text-lg shrink-0 opacity-${i === 0 ? "100" : "60"}`}>
                      {r.emoji}
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm font-medium text-gray-800 truncate">{r.title}</div>
                      <div className="text-xs text-gray-400">{r.time} · {r.calories} cal</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
