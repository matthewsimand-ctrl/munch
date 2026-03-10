import { useState, useMemo } from "react";
import {
  Calendar, Plus, X, ChevronLeft, ChevronRight,
  Clock, Shuffle, ShoppingCart, Check, Trash2, Utensils,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useStore } from "@/lib/store";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const MEAL_TYPES = ["Breakfast", "Lunch", "Dinner"] as const;
type MealType = typeof MEAL_TYPES[number];

const MEAL_COLORS: Record<MealType, { bg: string; border: string; text: string; dot: string }> = {
  Breakfast: { bg: "#FFF7ED", border: "rgba(249,115,22,0.20)", text: "#C2410C", dot: "#F97316" },
  Lunch:     { bg: "#F0FDF4", border: "rgba(34,197,94,0.20)",   text: "#15803D", dot: "#22C55E" },
  Dinner:    { bg: "#EFF6FF", border: "rgba(59,130,246,0.20)",  text: "#1D4ED8", dot: "#3B82F6" },
};

interface PlannedMeal {
  id: string;
  day: string;
  mealType: MealType;
  recipeName: string;
  recipeId: string;
  cookTime?: string;
}

function MealSlot({
  day,
  mealType,
  meal,
  onAdd,
  onRemove,
  onCook,
}: {
  day: string;
  mealType: MealType;
  meal?: PlannedMeal;
  onAdd: () => void;
  onRemove: () => void;
  onCook: () => void;
}) {
  const colors = MEAL_COLORS[mealType];

  if (meal) {
    return (
      <div
        className="group relative rounded-xl px-3 py-2.5 border transition-all cursor-pointer hover:shadow-md"
        style={{ background: colors.bg, borderColor: colors.border }}
        onClick={onCook}
      >
        <div className="flex items-start justify-between gap-1">
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-bold uppercase tracking-wider mb-0.5" style={{ color: colors.dot }}>{mealType}</p>
            <p className="text-xs font-semibold text-stone-800 leading-snug line-clamp-2">{meal.recipeName}</p>
            {meal.cookTime && (
              <p className="text-[10px] text-stone-400 mt-1 flex items-center gap-1">
                <Clock size={8} /> {meal.cookTime}
              </p>
            )}
          </div>
          <button
            onClick={(e) => { e.stopPropagation(); onRemove(); }}
            className="w-5 h-5 rounded-full flex items-center justify-center text-stone-300 hover:text-red-400 hover:bg-red-50 transition-colors opacity-0 group-hover:opacity-100 shrink-0 mt-0.5"
          >
            <X size={10} />
          </button>
        </div>
      </div>
    );
  }

  return (
    <button
      onClick={onAdd}
      className="w-full rounded-xl px-3 py-2.5 border border-dashed text-stone-300 hover:border-orange-300 hover:text-orange-400 hover:bg-orange-50/50 transition-all group"
      style={{ borderColor: "rgba(0,0,0,0.08)" }}
    >
      <p className="text-[10px] font-bold uppercase tracking-wider mb-0.5 text-left" style={{ color: "rgba(0,0,0,0.20)" }}>{mealType}</p>
      <div className="flex items-center gap-1">
        <Plus size={10} className="shrink-0" />
        <span className="text-[10px] font-semibold">Add meal</span>
      </div>
    </button>
  );
}

export default function MealPrepScreen() {
  const navigate = useNavigate();
  const { mealPlan, addMealPlanItem, removeMealPlanItem, savedApiRecipes, likedRecipes, addCustomGroceryItem } = useStore();

  const [weekOffset, setWeekOffset] = useState(0);
  const [showAddModal, setShowAddModal] = useState<{ day: string; mealType: MealType } | null>(null);
  const [searchRecipe, setSearchRecipe] = useState("");

  // Get week label
  const weekLabel = useMemo(() => {
    const now = new Date();
    now.setDate(now.getDate() + weekOffset * 7);
    const start = new Date(now);
    start.setDate(now.getDate() - now.getDay() + 1);
    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    return `${start.toLocaleDateString("en-US", { month: "short", day: "numeric" })} – ${end.toLocaleDateString("en-US", { month: "short", day: "numeric" })}`;
  }, [weekOffset]);

  const plannedMeals: PlannedMeal[] = mealPlan ?? [];

  const getMeal = (day: string, mealType: MealType) =>
    plannedMeals.find((m) => m.day === day && m.mealType === mealType);

  const savedRecipesList = useMemo(
    () => likedRecipes.map((id: string) => savedApiRecipes[id]).filter(Boolean),
    [likedRecipes, savedApiRecipes],
  );

  const filteredRecipes = useMemo(
    () => savedRecipesList.filter((r: any) => r.name.toLowerCase().includes(searchRecipe.toLowerCase())),
    [savedRecipesList, searchRecipe],
  );

  const handleAddMeal = (recipe: any) => {
    if (!showAddModal) return;
    addMealPlanItem?.({
      day: showAddModal.day,
      mealType: showAddModal.mealType,
      recipeName: recipe.name,
      recipeId: recipe.id,
      cookTime: recipe.cook_time,
    });
    toast.success(`Added ${recipe.name}`);
    setShowAddModal(null);
    setSearchRecipe("");
  };

  const handleSurpriseMe = () => {
    if (savedRecipesList.length === 0) {
      toast.info("Save some recipes first to use Surprise Me!");
      return;
    }
    let added = 0;
    DAYS.forEach((day) => {
      MEAL_TYPES.forEach((mealType) => {
        if (!getMeal(day, mealType) && savedRecipesList.length > 0) {
          const recipe = savedRecipesList[Math.floor(Math.random() * savedRecipesList.length)];
          addMealPlanItem?.({ day, mealType, recipeName: recipe.name, recipeId: recipe.id, cookTime: recipe.cook_time });
          added++;
        }
      });
    });
    toast.success(`🎲 Filled ${added} empty slots!`);
  };

  const handleGenerateGroceryList = () => {
    const recipeIds = [...new Set(plannedMeals.map((m) => m.recipeId))];
    let added = 0;
    recipeIds.forEach((id) => {
      const recipe = savedApiRecipes[id];
      if (recipe?.ingredients) {
        recipe.ingredients.forEach((ing: string) => {
          addCustomGroceryItem?.(ing);
          added++;
        });
      }
    });
    toast.success(`Added ${added} ingredients to grocery list`);
    navigate("/grocery");
  };

  const plannedCount = plannedMeals.length;
  const totalSlots = DAYS.length * MEAL_TYPES.length;

  return (
    <div className="min-h-full" style={{ fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif", background: "#FFFAF5" }}>

      {/* Header */}
      <div
        className="border-b"
        style={{ background: "linear-gradient(135deg,#FFF7ED 0%,#FFFAF5 100%)", borderColor: "rgba(249,115,22,0.12)" }}
      >
        <div className="max-w-6xl mx-auto px-6 py-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              <p className="text-[10px] font-bold text-orange-400 uppercase tracking-widest mb-1">Planning</p>
              <h1 className="text-2xl font-bold text-stone-900" style={{ fontFamily: "'Fraunces', Georgia, serif" }}>
                Meal Planner
              </h1>
              <p className="text-xs text-stone-400 mt-1">{plannedCount} of {totalSlots} slots filled</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleSurpriseMe}
                className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white border border-stone-200 text-sm font-semibold text-stone-500 hover:border-orange-300 hover:text-orange-500 transition-colors"
              >
                <Shuffle size={14} /> Surprise Me
              </button>
              <button
                onClick={handleGenerateGroceryList}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold text-white transition-all hover:opacity-90 active:scale-95"
                style={{ background: "linear-gradient(135deg,#FB923C,#F97316,#EA580C)", boxShadow: "0 4px 16px rgba(249,115,22,0.30)" }}
              >
                <ShoppingCart size={14} /> Grocery List
              </button>
            </div>
          </div>

          {/* Progress bar */}
          <div>
            <div className="relative h-2 bg-orange-100 rounded-full overflow-hidden">
              <motion.div
                className="absolute inset-y-0 left-0 rounded-full"
                style={{ background: "linear-gradient(90deg,#FB923C,#F97316)" }}
                animate={{ width: `${(plannedCount / totalSlots) * 100}%` }}
                transition={{ type: "spring", stiffness: 60 }}
              />
            </div>
            <div className="flex items-center justify-between mt-1.5">
              <p className="text-[10px] text-stone-400 font-medium">{totalSlots - plannedCount} slots remaining</p>
              {/* Week nav */}
              <div className="flex items-center gap-2">
                <button onClick={() => setWeekOffset((w) => w - 1)} className="w-6 h-6 rounded-lg flex items-center justify-center text-stone-400 hover:text-orange-500 hover:bg-orange-50 transition-colors">
                  <ChevronLeft size={14} />
                </button>
                <span className="text-[10px] font-bold text-stone-500">{weekOffset === 0 ? "This Week" : weekLabel}</span>
                <button onClick={() => setWeekOffset((w) => w + 1)} className="w-6 h-6 rounded-lg flex items-center justify-center text-stone-400 hover:text-orange-500 hover:bg-orange-50 transition-colors">
                  <ChevronRight size={14} />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Planner grid */}
      <div className="max-w-6xl mx-auto px-6 py-6">
        <div className="grid grid-cols-7 gap-3">
          {/* Day headers */}
          {DAYS.map((day) => {
            const dayMeals = plannedMeals.filter((m) => m.day === day);
            return (
              <div key={day} className="text-center">
                <p className="text-[11px] font-bold text-stone-500 uppercase tracking-wider mb-1">{day}</p>
                {dayMeals.length > 0 && (
                  <div className="w-1.5 h-1.5 rounded-full bg-orange-400 mx-auto mb-2" />
                )}
              </div>
            );
          })}

          {/* Meal slots */}
          {DAYS.map((day) => (
            <div key={day} className="space-y-2">
              {MEAL_TYPES.map((mealType) => {
                const meal = getMeal(day, mealType);
                return (
                  <MealSlot
                    key={`${day}-${mealType}`}
                    day={day}
                    mealType={mealType}
                    meal={meal}
                    onAdd={() => setShowAddModal({ day, mealType })}
                    onRemove={() => { removeMealPlanItem?.(meal!.id); toast.success("Removed from plan"); }}
                    onCook={() => meal && navigate(`/cook/${meal.recipeId}`)}
                  />
                );
              })}
            </div>
          ))}
        </div>

        {/* Summary cards */}
        {plannedCount > 0 && (
          <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              { label: "Breakfasts", count: plannedMeals.filter((m) => m.mealType === "Breakfast").length, color: "#F97316", emoji: "🌅" },
              { label: "Lunches", count: plannedMeals.filter((m) => m.mealType === "Lunch").length, color: "#22C55E", emoji: "☀️" },
              { label: "Dinners", count: plannedMeals.filter((m) => m.mealType === "Dinner").length, color: "#3B82F6", emoji: "🌙" },
            ].map(({ label, count, color, emoji }) => (
              <div
                key={label}
                className="rounded-2xl border p-4 flex items-center gap-4"
                style={{ background: "#fff", borderColor: "rgba(0,0,0,0.07)", boxShadow: "0 2px 8px rgba(28,25,23,0.04)" }}
              >
                <div className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl" style={{ background: `${color}15` }}>
                  {emoji}
                </div>
                <div>
                  <p className="text-2xl font-bold text-stone-800" style={{ fontFamily: "'Fraunces', Georgia, serif" }}>{count}</p>
                  <p className="text-xs text-stone-400 font-semibold">{label} planned</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add meal modal */}
      <AnimatePresence>
        {showAddModal && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/30 backdrop-blur-sm z-40"
              onClick={() => setShowAddModal(null)}
            />
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.97 }}
              className="fixed bottom-0 left-0 right-0 sm:bottom-auto sm:top-1/2 sm:left-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2 sm:max-w-md z-50 rounded-t-3xl sm:rounded-3xl overflow-hidden"
              style={{ background: "#fff", boxShadow: "0 -8px 40px rgba(0,0,0,0.15)" }}
            >
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest mb-0.5" style={{ color: MEAL_COLORS[showAddModal.mealType].dot }}>
                      {showAddModal.mealType}
                    </p>
                    <h3 className="text-lg font-bold text-stone-900" style={{ fontFamily: "'Fraunces', Georgia, serif" }}>
                      {showAddModal.day} — Choose recipe
                    </h3>
                  </div>
                  <button onClick={() => setShowAddModal(null)} className="w-8 h-8 rounded-xl bg-stone-100 flex items-center justify-center text-stone-500">
                    <X size={14} />
                  </button>
                </div>

                <div className="relative mb-4">
                  <input
                    autoFocus
                    value={searchRecipe}
                    onChange={(e) => setSearchRecipe(e.target.value)}
                    placeholder="Search saved recipes…"
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border text-sm text-stone-700 placeholder:text-stone-300 outline-none focus:border-orange-300 transition-colors"
                    style={{ borderColor: "rgba(0,0,0,0.09)" }}
                  />
                  <Utensils size={13} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-300" />
                </div>

                <div className="space-y-1 max-h-72 overflow-y-auto">
                  {filteredRecipes.length === 0 ? (
                    <div className="py-8 text-center">
                      <p className="text-sm text-stone-400">No saved recipes found</p>
                      <button onClick={() => { setShowAddModal(null); navigate("/swipe"); }} className="mt-2 text-xs text-orange-500 font-semibold hover:underline">
                        Discover recipes →
                      </button>
                    </div>
                  ) : (
                    filteredRecipes.map((recipe: any) => (
                      <button
                        key={recipe.id}
                        onClick={() => handleAddMeal(recipe)}
                        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-orange-50 transition-colors text-left group"
                      >
                        <div className="w-10 h-10 rounded-xl overflow-hidden shrink-0 bg-stone-100">
                          {recipe.image && recipe.image !== "/placeholder.svg" ? (
                            <img src={recipe.image} alt={recipe.name} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-lg">🍽️</div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-stone-800 truncate group-hover:text-orange-700 transition-colors">{recipe.name}</p>
                          <p className="text-[10px] text-stone-400 flex items-center gap-1 mt-0.5"><Clock size={9} /> {recipe.cook_time}</p>
                        </div>
                        <Plus size={14} className="text-stone-300 group-hover:text-orange-400 transition-colors" />
                      </button>
                    ))
                  )}
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
