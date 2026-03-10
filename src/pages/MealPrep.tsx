import { useState, useMemo, useEffect, useCallback } from "react";
import {
  Calendar, Plus, X, ChevronLeft, ChevronRight,
  Clock, Shuffle, ShoppingCart, Utensils, Download, RotateCcw,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useStore } from "@/lib/store";
import { useNavigate } from "react-router-dom";
import type { Recipe } from "@/data/recipes";
import { useBrowseFeed } from "@/hooks/useBrowseFeed";
import RecipePreviewDialog from "@/components/RecipePreviewDialog";
import { toast } from "sonner";
import { jsPDF } from "jspdf";
import { format, startOfWeek } from "date-fns";

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
  weekStart?: string;
  day: string;
  mealType: MealType;
  recipeName: string;
  recipeId: string;
  cookTime?: string;
  recipeSnapshot?: any;
}

function MealSlot({
  day,
  mealType,
  meal,
  onAdd,
  onRemove,
  onMealClick,
  onDropMeal,
  onDragMeal,
  isDropTarget,
}: {
  day: string;
  mealType: MealType;
  meal?: PlannedMeal;
  onAdd: () => void;
  onRemove: () => void;
  onMealClick: () => void;
  onDropMeal: () => void;
  onDragMeal: () => void;
  isDropTarget: boolean;
}) {
  const colors = MEAL_COLORS[mealType];

  if (meal) {
    return (
      <div
        draggable
        onDragStart={onDragMeal}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => { e.preventDefault(); onDropMeal(); }}
        className="group relative rounded-full px-3 py-2 border transition-all cursor-grab active:cursor-grabbing hover:shadow-md"
        style={{ background: colors.bg, borderColor: colors.border }}
        onClick={onMealClick}
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
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => { e.preventDefault(); onDropMeal(); }}
      className="w-full rounded-xl px-3 py-2.5 border border-dashed text-stone-300 hover:border-orange-300 hover:text-orange-400 hover:bg-orange-50/50 transition-all group"
      style={{ borderColor: isDropTarget ? "rgba(251,146,60,0.75)" : "rgba(0,0,0,0.08)", background: isDropTarget ? "rgba(255,237,213,0.55)" : undefined }}
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
  const { mealPlan, addMealPlanItem, removeMealPlanItem, clearMealPlanWeek, savedApiRecipes, likedRecipes, addCustomGroceryItem } = useStore();

  const [weekOffset, setWeekOffset] = useState(0);
  const [showAddModal, setShowAddModal] = useState<{ day: string; mealType: MealType } | null>(null);
  const [showMealActionModal, setShowMealActionModal] = useState<PlannedMeal | null>(null);
  const [showSurpriseSourceModal, setShowSurpriseSourceModal] = useState(false);
  const [previewRecipe, setPreviewRecipe] = useState<Recipe | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [pendingAiSurprise, setPendingAiSurprise] = useState(false);
  const [draggedMealId, setDraggedMealId] = useState<string | null>(null);
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportSettings, setExportSettings] = useState({ pdf: true, excel: false, calendar: false });
  const [searchRecipe, setSearchRecipe] = useState("");
  const { recipes: browseRecipes, loaded: browseLoaded, loadFeed } = useBrowseFeed();

  // Get week label
  const getWeekStartForOffset = useCallback((offset: number) => {
    const base = new Date();
    base.setDate(base.getDate() + offset * 7);
    return format(startOfWeek(base, { weekStartsOn: 1 }), "yyyy-MM-dd");
  }, []);

  const weekStart = useMemo(() => getWeekStartForOffset(weekOffset), [getWeekStartForOffset, weekOffset]);

  const weekLabel = useMemo(() => {
    const start = new Date(`${weekStart}T00:00:00`);
    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    return `${start.toLocaleDateString("en-US", { month: "short", day: "numeric" })} – ${end.toLocaleDateString("en-US", { month: "short", day: "numeric" })}`;
  }, [weekStart]);

  const plannedMeals: PlannedMeal[] = (mealPlan ?? [])
    .filter((item) => (item.weekStart ?? getWeekStartForOffset(0)) === weekStart)
    .map((item, idx) => ({
      ...item,
      id: item.id ?? `${item.day}-${item.mealType}-${item.recipeId}-${idx}`,
    }));

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
      weekStart,
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

  const toRecipeShape = (recipe: any): Recipe => ({
    id: String(recipe.id),
    name: String(recipe.name ?? "Untitled recipe"),
    image: String(recipe.image ?? "/placeholder.svg"),
    cook_time: String(recipe.cook_time ?? "30 min"),
    difficulty: String(recipe.difficulty ?? "Intermediate"),
    ingredients: Array.isArray(recipe.ingredients) ? recipe.ingredients : [],
    tags: Array.isArray(recipe.tags) ? recipe.tags : [],
    instructions: Array.isArray(recipe.instructions) ? recipe.instructions : [],
    cuisine: recipe.cuisine ? String(recipe.cuisine) : undefined,
  });

  const applySurpriseMe = (sourceRecipes: any[], sourceLabel: string) => {
    if (sourceRecipes.length === 0) {
      toast.info(`No ${sourceLabel} recipes available right now.`);
      return;
    }

    const emptySlots = DAYS.flatMap((day) =>
      MEAL_TYPES
        .filter((mealType) => !getMeal(day, mealType))
        .map((mealType) => ({ day, mealType })),
    );

    if (emptySlots.length > 0) {
      emptySlots.forEach(({ day, mealType }) => {
        const recipe = sourceRecipes[Math.floor(Math.random() * sourceRecipes.length)];
        addMealPlanItem?.({ weekStart, day, mealType, recipeName: recipe.name, recipeId: recipe.id, cookTime: recipe.cook_time, recipeSnapshot: recipe });
      });
      toast.success(`🎲 Filled ${emptySlots.length} open slots with ${sourceLabel} picks!`);
      return;
    }

    const slotsToReplace = [...plannedMeals]
      .sort(() => Math.random() - 0.5)
      .slice(0, Math.min(5, plannedMeals.length));

    slotsToReplace.forEach((meal) => {
      const recipe = sourceRecipes[Math.floor(Math.random() * sourceRecipes.length)];
      removeMealPlanItem?.(meal.id);
      addMealPlanItem?.({
        weekStart,
        day: meal.day,
        mealType: meal.mealType,
        recipeName: recipe.name,
        recipeId: recipe.id,
        cookTime: recipe.cook_time,
        recipeSnapshot: recipe,
      });
    });

    toast.success(`🎲 Swapped ${slotsToReplace.length} meals with ${sourceLabel} surprises!`);
  };

  const handleSurpriseSaved = () => {
    setShowSurpriseSourceModal(false);
    applySurpriseMe(savedRecipesList, "saved");
  };

  const handleSurpriseAi = async () => {
    setShowSurpriseSourceModal(false);
    if (browseLoaded) {
      applySurpriseMe(browseRecipes, "AI-recommended");
      return;
    }
    setPendingAiSurprise(true);
    await loadFeed();
  };


  useEffect(() => {
    if (!pendingAiSurprise || !browseLoaded) return;
    applySurpriseMe(browseRecipes, "AI-recommended");
    setPendingAiSurprise(false);
  }, [pendingAiSurprise, browseLoaded, browseRecipes]);

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

  const handleResetWeek = () => {
    if (plannedCount === 0) {
      toast.info("This week is already empty.");
      return;
    }
    clearMealPlanWeek?.(weekStart);
    toast.success("Cleared all meals for this week.");
  };

  const moveMeal = (targetDay: string, targetMealType: MealType) => {
    if (!draggedMealId) return;
    const draggedMeal = plannedMeals.find((meal) => meal.id === draggedMealId);
    if (!draggedMeal) return;

    const existingTargetMeal = getMeal(targetDay, targetMealType);
    addMealPlanItem?.({
      weekStart,
      day: targetDay,
      mealType: targetMealType,
      recipeId: draggedMeal.recipeId,
      recipeName: draggedMeal.recipeName,
      cookTime: draggedMeal.cookTime,
      recipeSnapshot: draggedMeal.recipeSnapshot,
    });

    if (existingTargetMeal && existingTargetMeal.id !== draggedMeal.id) {
      removeMealPlanItem?.(existingTargetMeal.id);
    }
    removeMealPlanItem?.(draggedMeal.id);
    setDraggedMealId(null);
    toast.success(`Moved ${draggedMeal.recipeName} to ${targetDay} ${targetMealType}`);
  };

  const buildDateForDay = (day: string) => {
    const base = new Date();
    base.setDate(base.getDate() + weekOffset * 7);
    const monday = new Date(base);
    monday.setHours(0, 0, 0, 0);
    monday.setDate(base.getDate() - ((base.getDay() + 6) % 7));
    const dayIndex = DAYS.indexOf(day);
    const target = new Date(monday);
    target.setDate(monday.getDate() + dayIndex);
    return target;
  };

  const downloadTextFile = (name: string, content: string, mimeType: string) => {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = name;
    link.click();
    URL.revokeObjectURL(url);
  };

  const exportMealPlan = () => {
    if (plannedMeals.length === 0) {
      toast.info("Add meals to your plan before exporting.");
      return;
    }

    const orderedMeals = [...plannedMeals].sort((a, b) => {
      const dayDiff = DAYS.indexOf(a.day) - DAYS.indexOf(b.day);
      if (dayDiff !== 0) return dayDiff;
      return MEAL_TYPES.indexOf(a.mealType) - MEAL_TYPES.indexOf(b.mealType);
    });

    if (exportSettings.pdf) {
      const doc = new jsPDF();
      doc.setFontSize(16);
      doc.text("Meal Prep Plan", 14, 16);
      doc.setFontSize(10);
      doc.text(`Week: ${weekOffset === 0 ? "This Week" : weekLabel}`, 14, 23);
      let y = 34;
      orderedMeals.forEach((meal) => {
        doc.text(`${meal.day} • ${meal.mealType} • ${meal.recipeName}${meal.cookTime ? ` (${meal.cookTime})` : ""}`, 14, y);
        y += 7;
        if (y > 280) {
          doc.addPage();
          y = 20;
        }
      });
      doc.save("meal-plan.pdf");
    }

    if (exportSettings.excel) {
      const csv = [
        ["Day", "Meal Type", "Recipe", "Cook Time"],
        ...orderedMeals.map((meal) => [meal.day, meal.mealType, meal.recipeName, meal.cookTime ?? ""]),
      ]
        .map((row) => row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(","))
        .join("\n");
      downloadTextFile("meal-plan.csv", csv, "text/csv;charset=utf-8;");
    }

    if (exportSettings.calendar) {
      const icsEvents = orderedMeals
        .map((meal, index) => {
          const date = buildDateForDay(meal.day);
          const dateStamp = `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, "0")}${String(date.getDate()).padStart(2, "0")}`;
          return [
            "BEGIN:VEVENT",
            `UID:meal-${meal.id}-${index}@munch`,
            `DTSTAMP:${dateStamp}T090000Z`,
            `DTSTART;VALUE=DATE:${dateStamp}`,
            `DTEND;VALUE=DATE:${dateStamp}`,
            `SUMMARY:${meal.mealType}: ${meal.recipeName}`,
            "END:VEVENT",
          ].join("\n");
        })
        .join("\n");

      const ics = [
        "BEGIN:VCALENDAR",
        "VERSION:2.0",
        "PRODID:-//Munch//Meal Plan//EN",
        icsEvents,
        "END:VCALENDAR",
      ].join("\n");

      downloadTextFile("meal-plan.ics", ics, "text/calendar;charset=utf-8;");
    }

    toast.success("Meal plan exported.");
    setShowExportModal(false);
  };

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
                onClick={() => setShowExportModal(true)}
                className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white border border-stone-200 text-sm font-semibold text-stone-500 hover:border-orange-300 hover:text-orange-500 transition-colors"
              >
                <Download size={14} /> Export
              </button>
              <button
                onClick={() => setShowSurpriseSourceModal(true)}
                className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white border border-stone-200 text-sm font-semibold text-stone-500 hover:border-orange-300 hover:text-orange-500 transition-colors"
              >
                <Shuffle size={14} /> Surprise Me
              </button>
              <button
                onClick={handleResetWeek}
                className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white border border-stone-200 text-sm font-semibold text-stone-500 hover:border-orange-300 hover:text-orange-500 transition-colors"
              >
                <RotateCcw size={14} /> Reset Week
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
                    onMealClick={() => meal && setShowMealActionModal(meal)}
                    onDragMeal={() => meal && setDraggedMealId(meal.id)}
                    onDropMeal={() => moveMeal(day, mealType)}
                    isDropTarget={!!draggedMealId && (!meal || meal.id !== draggedMealId)}
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
              className="fixed top-1/2 left-1/2 w-[calc(100%-1.5rem)] max-w-md -translate-x-1/2 -translate-y-1/2 z-50 rounded-3xl overflow-hidden"
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

      {/* Meal action modal */}
      <AnimatePresence>
        {showMealActionModal && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/30 backdrop-blur-sm z-40"
              onClick={() => setShowMealActionModal(null)}
            />
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.97 }}
              className="fixed bottom-0 left-0 right-0 sm:bottom-auto sm:top-1/2 sm:left-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2 sm:max-w-sm z-50 rounded-t-3xl sm:rounded-3xl overflow-hidden"
              style={{ background: "#fff", boxShadow: "0 -8px 40px rgba(0,0,0,0.15)" }}
            >
              <div className="p-6">
                <p className="text-[10px] font-bold uppercase tracking-widest text-orange-500 mb-1">Planned Meal</p>
                <h3 className="text-lg font-bold text-stone-900" style={{ fontFamily: "'Fraunces', Georgia, serif" }}>{showMealActionModal.recipeName}</h3>
                <p className="text-xs text-stone-500 mt-1">What would you like to do?</p>
                <div className="grid grid-cols-2 gap-2 mt-5">
                  <button
                    onClick={() => {
                      const mealRecipe = plannedMeals.find((meal) => meal.id === showMealActionModal.id);
                      const recipe = savedApiRecipes[showMealActionModal.recipeId] ?? mealRecipe?.recipeSnapshot;
                      if (!recipe) {
                        toast.info("Recipe details are unavailable for this meal.");
                        setShowMealActionModal(null);
                        return;
                      }
                      setPreviewRecipe(toRecipeShape(recipe));
                      setPreviewOpen(true);
                      setShowMealActionModal(null);
                    }}
                    className="rounded-xl border border-stone-200 py-2 text-sm font-semibold text-stone-600 hover:border-orange-300 hover:text-orange-600"
                  >
                    View recipe
                  </button>
                  <button
                    onClick={() => {
                      navigate(`/cook/${showMealActionModal.recipeId}`);
                      setShowMealActionModal(null);
                    }}
                    className="rounded-xl py-2 text-sm font-semibold text-white"
                    style={{ background: "linear-gradient(135deg,#FB923C,#F97316,#EA580C)" }}
                  >
                    Start cooking
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Export modal */}
      <AnimatePresence>
        {showSurpriseSourceModal && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/30 backdrop-blur-sm z-40"
              onClick={() => setShowSurpriseSourceModal(false)}
            />
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.97 }}
              className="fixed bottom-0 left-0 right-0 sm:bottom-auto sm:top-1/2 sm:left-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2 sm:max-w-md z-50 rounded-t-3xl sm:rounded-3xl overflow-hidden"
              style={{ background: "#fff", boxShadow: "0 -8px 40px rgba(0,0,0,0.15)" }}
            >
              <div className="p-6">
                <p className="text-[10px] font-bold uppercase tracking-widest text-orange-500 mb-1">Surprise Me</p>
                <h3 className="text-lg font-bold text-stone-900" style={{ fontFamily: "'Fraunces', Georgia, serif" }}>
                  Choose your surprise source
                </h3>
                <p className="text-xs text-stone-500 mt-1">Use only recipes you saved, or let AI recommendations mix in new ideas.</p>
                <div className="grid grid-cols-1 gap-2 mt-5">
                  <button
                    onClick={handleSurpriseSaved}
                    className="rounded-xl border border-stone-200 py-2.5 text-sm font-semibold text-stone-700 hover:border-orange-300 hover:text-orange-600"
                  >
                    Use saved recipes only
                  </button>
                  <button
                    onClick={handleSurpriseAi}
                    className="rounded-xl py-2.5 text-sm font-semibold text-white"
                    style={{ background: "linear-gradient(135deg,#FB923C,#F97316,#EA580C)" }}
                  >
                    Use AI recommendations
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showExportModal && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/30 backdrop-blur-sm z-40"
              onClick={() => setShowExportModal(false)}
            />
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.97 }}
              className="fixed bottom-0 left-0 right-0 sm:bottom-auto sm:top-1/2 sm:left-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2 sm:max-w-sm z-50 rounded-t-3xl sm:rounded-3xl overflow-hidden"
              style={{ background: "#fff", boxShadow: "0 -8px 40px rgba(0,0,0,0.15)" }}
            >
              <div className="p-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-bold text-stone-900" style={{ fontFamily: "'Fraunces', Georgia, serif" }}>Export Settings</h3>
                  <button onClick={() => setShowExportModal(false)} className="w-7 h-7 rounded-lg bg-stone-100 text-stone-500 flex items-center justify-center">
                    <X size={14} />
                  </button>
                </div>
                <p className="text-xs text-stone-500 mt-1">Choose one or more formats.</p>
                <div className="space-y-2 mt-4">
                  {[
                    { key: "pdf", label: "PDF" },
                    { key: "excel", label: "Excel (.csv)" },
                    { key: "calendar", label: "Calendar (.ics)" },
                  ].map((option) => (
                    <label key={option.key} className="flex items-center gap-3 rounded-xl border border-stone-200 px-3 py-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={exportSettings[option.key as keyof typeof exportSettings]}
                        onChange={(e) => setExportSettings((prev) => ({ ...prev, [option.key]: e.target.checked }))}
                      />
                      <span className="text-sm font-medium text-stone-700">{option.label}</span>
                    </label>
                  ))}
                </div>
                <button
                  onClick={exportMealPlan}
                  className="w-full mt-5 rounded-xl py-2.5 text-sm font-semibold text-white"
                  style={{ background: "linear-gradient(135deg,#FB923C,#F97316,#EA580C)" }}
                >
                  Export plan
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <RecipePreviewDialog
        recipe={previewRecipe}
        match={null}
        open={previewOpen}
        onOpenChange={setPreviewOpen}
      />
    </div>
  );
}
