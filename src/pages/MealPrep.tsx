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
import PremiumFeatureButton from "@/components/PremiumFeatureButton";
import { toast } from "sonner";
import { jsPDF } from "jspdf";
import { format, startOfWeek } from "date-fns";
import { usePremiumAccess } from "@/hooks/usePremiumAccess";
import { usePremiumGate } from "@/hooks/usePremiumGate";
import { calculateMatch } from "@/lib/matchLogic";
import { useKitchenMealPlan } from "@/hooks/useKitchenMealPlan";
import { useKitchenGroceryList } from "@/hooks/useKitchenGroceryList";
import { applyRecipeImageFallback, getRecipeImageSrc } from "@/lib/recipeImage";

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
        className="group relative rounded-2xl px-3 py-3 border transition-all cursor-grab active:cursor-grabbing hover:shadow-md"
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
            className="w-5 h-5 rounded-lg flex items-center justify-center text-stone-300 hover:text-red-400 hover:bg-red-50 transition-colors opacity-0 group-hover:opacity-100 shrink-0 mt-0.5"
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
  const { mealPlan, addMealPlanItem, removeMealPlanItem, clearMealPlanWeek, savedApiRecipes, likedRecipes, likeRecipe, addCustomGroceryItem, pantryList, activeKitchenId, activeKitchenName } = useStore();
  const { isPremium } = usePremiumAccess();
  const { openPremiumPage } = usePremiumGate();

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
  const [exportScope, setExportScope] = useState<"week" | "day">("week");
  const [exportDay, setExportDay] = useState<(typeof DAYS)[number]>(DAYS[0]);
  const [searchRecipe, setSearchRecipe] = useState("");
  const { recipes: browseRecipes, loaded: browseLoaded, loadFeed } = useBrowseFeed();

  // Get week label
  const getWeekStartForOffset = useCallback((offset: number) => {
    const base = new Date();
    base.setDate(base.getDate() + offset * 7);
    return format(startOfWeek(base, { weekStartsOn: 1 }), "yyyy-MM-dd");
  }, []);

  const weekStart = useMemo(() => getWeekStartForOffset(weekOffset), [getWeekStartForOffset, weekOffset]);
  const kitchenMealPlan = useKitchenMealPlan(activeKitchenId, weekStart);
  const kitchenGrocery = useKitchenGroceryList(activeKitchenId);
  const isKitchenMode = Boolean(activeKitchenId);

  const weekLabel = useMemo(() => {
    const start = new Date(`${weekStart}T00:00:00`);
    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    return `${start.toLocaleDateString("en-US", { month: "short", day: "numeric" })} – ${end.toLocaleDateString("en-US", { month: "short", day: "numeric" })}`;
  }, [weekStart]);

  const localPlannedMeals: PlannedMeal[] = (mealPlan ?? [])
    .filter((item) => (item.weekStart ?? getWeekStartForOffset(0)) === weekStart)
    .map((item, idx) => ({
      ...item,
      mealType: item.mealType as MealType,
      id: item.id ?? `${item.day}-${item.mealType}-${item.recipeId}-${idx}`,
    }));
  const plannedMeals: PlannedMeal[] = isKitchenMode ? (kitchenMealPlan.items as PlannedMeal[]) : localPlannedMeals;

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

  const pantryNames = useMemo(
    () => pantryList.map((item) => item.name).filter(Boolean),
    [pantryList],
  );

  const handleAddMeal = (recipe: any) => {
    if (!showAddModal) return;
    if (isKitchenMode) {
      void kitchenMealPlan.addMeal({
        weekStart,
        day: showAddModal.day,
        mealType: showAddModal.mealType,
        recipeName: recipe.name,
        recipeId: recipe.id,
        cookTime: recipe.cook_time,
        recipeSnapshot: recipe,
      });
    } else {
      addMealPlanItem?.({
        weekStart,
        day: showAddModal.day,
        mealType: showAddModal.mealType,
        recipeName: recipe.name,
        recipeId: recipe.id,
        cookTime: recipe.cook_time,
      });
    }
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

  const startPlannedMealCooking = (meal: PlannedMeal) => {
    const recipe = savedApiRecipes[meal.recipeId] ?? meal.recipeSnapshot;
    if (!recipe) {
      toast.info("Recipe details are unavailable for this meal.");
      return;
    }

    if (!savedApiRecipes[meal.recipeId]) {
      likeRecipe(meal.recipeId, recipe);
    }

    navigate(`/cook/${meal.recipeId}`);
  };

  const applySurpriseMe = (sourceRecipes: any[], sourceLabel: string) => {
    if (sourceRecipes.length === 0) {
      toast.info(`No ${sourceLabel} recipes available right now.`);
      return;
    }

    const prioritizedRecipes = [...sourceRecipes].sort((recipeA, recipeB) => {
      const aIngredients = Array.isArray(recipeA.ingredients) ? recipeA.ingredients : [];
      const bIngredients = Array.isArray(recipeB.ingredients) ? recipeB.ingredients : [];
      const aMatch = calculateMatch(pantryNames, aIngredients).percentage;
      const bMatch = calculateMatch(pantryNames, bIngredients).percentage;
      return bMatch - aMatch;
    });

    const pickRecipe = () => {
      if (prioritizedRecipes.length <= 3) {
        return prioritizedRecipes[Math.floor(Math.random() * prioritizedRecipes.length)];
      }

      const topCandidates = prioritizedRecipes.slice(0, Math.max(3, Math.ceil(prioritizedRecipes.length * 0.35)));
      return topCandidates[Math.floor(Math.random() * topCandidates.length)];
    };

    const emptySlots = DAYS.flatMap((day) =>
      MEAL_TYPES
        .filter((mealType) => !getMeal(day, mealType))
        .map((mealType) => ({ day, mealType })),
    );

    if (emptySlots.length > 0) {
      emptySlots.forEach(({ day, mealType }) => {
        const recipe = pickRecipe();
        if (isKitchenMode) {
          void kitchenMealPlan.addMeal({ weekStart, day, mealType, recipeName: recipe.name, recipeId: recipe.id, cookTime: recipe.cook_time, recipeSnapshot: recipe });
        } else {
          addMealPlanItem?.({ weekStart, day, mealType, recipeName: recipe.name, recipeId: recipe.id, cookTime: recipe.cook_time, recipeSnapshot: recipe });
        }
      });
      toast.success(`🎲 Filled ${emptySlots.length} open slots with ${sourceLabel} picks!`);
      return;
    }

    const slotsToReplace = [...plannedMeals]
      .sort(() => Math.random() - 0.5)
      .slice(0, Math.min(5, plannedMeals.length));

    slotsToReplace.forEach((meal) => {
      const recipe = pickRecipe();
      if (isKitchenMode) {
        void kitchenMealPlan.removeMeal(meal.id);
        void kitchenMealPlan.addMeal({
          weekStart,
          day: meal.day,
          mealType: meal.mealType,
          recipeName: recipe.name,
          recipeId: recipe.id,
          cookTime: recipe.cook_time,
          recipeSnapshot: recipe,
        });
      } else {
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
      }
    });

    toast.success(`🎲 Swapped ${slotsToReplace.length} meals with ${sourceLabel} surprises!`);
  };

  const handleSurpriseSaved = () => {
    setShowSurpriseSourceModal(false);
    applySurpriseMe(savedRecipesList, "saved");
  };

  const handleSurpriseAi = async () => {
    setShowSurpriseSourceModal(false);
    if (!isPremium) {
      openPremiumPage("AI meal autofill");
      return;
    }

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
      const recipe = savedApiRecipes[id] ?? plannedMeals.find((meal) => meal.recipeId === id)?.recipeSnapshot;
      if (recipe?.ingredients) {
        recipe.ingredients.forEach((ing: string) => {
          if (isKitchenMode) {
            const parsed = ing;
            void kitchenGrocery.addItem({
              name: parsed,
              quantity: "1",
            });
          } else {
            addCustomGroceryItem?.(ing);
          }
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
    if (isKitchenMode) {
      void kitchenMealPlan.clearWeek();
    } else {
      clearMealPlanWeek?.(weekStart);
    }
    toast.success("Cleared all meals for this week.");
  };

  const moveMeal = (targetDay: string, targetMealType: MealType) => {
    if (!draggedMealId) return;
    const draggedMeal = plannedMeals.find((meal) => meal.id === draggedMealId);
    if (!draggedMeal) return;

    const existingTargetMeal = getMeal(targetDay, targetMealType);
    if (isKitchenMode) {
      void kitchenMealPlan.addMeal({
        weekStart,
        day: targetDay,
        mealType: targetMealType,
        recipeId: draggedMeal.recipeId,
        recipeName: draggedMeal.recipeName,
        cookTime: draggedMeal.cookTime,
        recipeSnapshot: draggedMeal.recipeSnapshot,
      });
    } else {
      addMealPlanItem?.({
        weekStart,
        day: targetDay,
        mealType: targetMealType,
        recipeId: draggedMeal.recipeId,
        recipeName: draggedMeal.recipeName,
        cookTime: draggedMeal.cookTime,
        recipeSnapshot: draggedMeal.recipeSnapshot,
      });
    }

    if (existingTargetMeal && existingTargetMeal.id !== draggedMeal.id) {
      if (isKitchenMode) {
        void kitchenMealPlan.removeMeal(existingTargetMeal.id);
      } else {
        removeMealPlanItem?.(existingTargetMeal.id);
      }
    }
    if (isKitchenMode) {
      void kitchenMealPlan.removeMeal(draggedMeal.id);
    } else {
      removeMealPlanItem?.(draggedMeal.id);
    }
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

  const getRecipeDetails = (meal: PlannedMeal) => {
    const source = meal.recipeSnapshot ?? savedApiRecipes[meal.recipeId] ?? {};
    const ingredients = Array.isArray(source.ingredients) ? source.ingredients.map(String) : [];
    const instructions = Array.isArray(source.instructions) ? source.instructions.map(String) : [];
    return { ingredients, instructions };
  };

  const exportPdf = (orderedMeals: PlannedMeal[]) => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 14;

    const drawHeader = (subtitle: string) => {
      doc.setFillColor(251, 146, 60);
      doc.rect(0, 0, pageWidth, 28, "F");
      doc.setTextColor(255, 255, 255);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(18);
      doc.text("MUNCH · Meal Prep", margin, 12);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.text(subtitle, margin, 19);
      doc.text(`Generated ${new Date().toLocaleDateString()}`, pageWidth - margin, 19, { align: "right" });
      doc.setTextColor(41, 37, 36);
    };

    drawHeader(exportScope === "week" ? `Weekly plan · ${weekLabel}` : `${exportDay} · Detailed plan`);

    if (exportScope === "week") {
      let y = 38;
      DAYS.forEach((day) => {
        const dayMeals = orderedMeals.filter((meal) => meal.day === day);
        if (y > pageHeight - 30) {
          doc.addPage();
          drawHeader(`Weekly plan · ${weekLabel}`);
          y = 38;
        }

        doc.setFillColor(255, 247, 237);
        doc.roundedRect(margin, y, pageWidth - margin * 2, 9, 2, 2, "F");
        doc.setTextColor(194, 65, 12);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(11);
        doc.text(day, margin + 3, y + 6);
        y += 13;

        if (dayMeals.length === 0) {
          doc.setFont("helvetica", "italic");
          doc.setTextColor(120, 113, 108);
          doc.setFontSize(10);
          doc.text("No meals planned.", margin + 3, y);
          y += 8;
          return;
        }

        dayMeals.forEach((meal) => {
          if (y > pageHeight - 18) {
            doc.addPage();
            drawHeader(`Weekly plan · ${weekLabel}`);
            y = 38;
          }
          doc.setTextColor(41, 37, 36);
          doc.setFont("helvetica", "bold");
          doc.setFontSize(10);
          doc.text(`${meal.mealType}`, margin + 3, y);
          doc.setFont("helvetica", "normal");
          doc.text(`• ${meal.recipeName}${meal.cookTime ? ` (${meal.cookTime})` : ""}`, margin + 24, y);
          y += 7;
        });
        y += 3;
      });
    } else {
      let y = 38;
      orderedMeals.forEach((meal, index) => {
        const { ingredients, instructions } = getRecipeDetails(meal);
        const cardHeight = 18;
        if (y > pageHeight - 35) {
          doc.addPage();
          drawHeader(`${exportDay} · Detailed plan`);
          y = 38;
        }

        doc.setFillColor(239, 246, 255);
        doc.roundedRect(margin, y, pageWidth - margin * 2, cardHeight, 3, 3, "F");
        doc.setTextColor(30, 64, 175);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(12);
        doc.text(`${meal.mealType}: ${meal.recipeName}`, margin + 4, y + 7);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(71, 85, 105);
        doc.setFontSize(10);
        doc.text(`Cook time: ${meal.cookTime ?? "N/A"}`, margin + 4, y + 13);
        y += cardHeight + 4;

        doc.setTextColor(41, 37, 36);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(10);
        doc.text("Ingredients", margin + 2, y);
        y += 5;
        doc.setFont("helvetica", "normal");

        const ingredientLines = ingredients.length > 0 ? ingredients : ["No ingredients available."];
        ingredientLines.forEach((ingredient) => {
          const wrapped = doc.splitTextToSize(`• ${ingredient}`, pageWidth - margin * 2 - 8);
          const lineHeight = 4.5 * wrapped.length;
          if (y + lineHeight > pageHeight - 16) {
            doc.addPage();
            drawHeader(`${exportDay} · Detailed plan`);
            y = 38;
          }
          doc.text(wrapped, margin + 4, y);
          y += lineHeight;
        });

        y += 2;
        doc.setFont("helvetica", "bold");
        doc.text("Instructions", margin + 2, y);
        y += 5;
        doc.setFont("helvetica", "normal");

        const steps = instructions.length > 0 ? instructions : ["No instructions available."];
        steps.forEach((step, stepIndex) => {
          const wrapped = doc.splitTextToSize(`${stepIndex + 1}. ${step}`, pageWidth - margin * 2 - 8);
          const lineHeight = 4.5 * wrapped.length;
          if (y + lineHeight > pageHeight - 16) {
            doc.addPage();
            drawHeader(`${exportDay} · Detailed plan`);
            y = 38;
          }
          doc.text(wrapped, margin + 4, y);
          y += lineHeight;
        });

        if (index < orderedMeals.length - 1) {
          y += 4;
          doc.setDrawColor(231, 229, 228);
          doc.line(margin, y, pageWidth - margin, y);
          y += 6;
        }
      });
    }

    const fileSuffix = exportScope === "week" ? `week-${weekStart}` : `${weekStart}-${exportDay.toLowerCase()}`;
    doc.save(`meal-plan-${fileSuffix}.pdf`);
  };

  const exportMealPlan = () => {
    if (plannedMeals.length === 0) {
      toast.info("Add meals to your plan before exporting.");
      return;
    }

    const mealsByScope = exportScope === "week"
      ? plannedMeals
      : plannedMeals.filter((meal) => meal.day === exportDay);

    if (mealsByScope.length === 0) {
      toast.info(exportScope === "week" ? "No meals planned this week to export." : `No meals planned for ${exportDay}.`);
      return;
    }

    const orderedMeals = [...mealsByScope].sort((a, b) => {
      const dayDiff = DAYS.indexOf(a.day) - DAYS.indexOf(b.day);
      if (dayDiff !== 0) return dayDiff;
      return MEAL_TYPES.indexOf(a.mealType) - MEAL_TYPES.indexOf(b.mealType);
    });

    if (exportSettings.pdf) {
      exportPdf(orderedMeals);
    }

    if (exportSettings.excel) {
      const csv = [
        ["Day", "Meal Type", "Recipe", "Cook Time"],
        ...orderedMeals.map((meal) => [meal.day, meal.mealType, meal.recipeName, meal.cookTime ?? ""]),
      ]
        .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","))
        .join("\n");
      const csvName = exportScope === "week" ? "meal-plan-week.csv" : `meal-plan-${exportDay.toLowerCase()}.csv`;
      downloadTextFile(csvName, csv, "text/csv;charset=utf-8;");
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

      const calendarName = exportScope === "week" ? "meal-plan-week.ics" : `meal-plan-${exportDay.toLowerCase()}.ics`;
      downloadTextFile(calendarName, ics, "text/calendar;charset=utf-8;");
    }

    toast.success("Meal plan exported.");
    setShowExportModal(false);
  };

  if (!isPremium) {
    return (
      <div
        className="min-h-full"
        style={{ fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif", background: "#FFFAF5" }}
      >
        <div
          className="border-b"
          style={{ background: "linear-gradient(135deg,#FFF7ED 0%,#FFFAF5 100%)", borderColor: "rgba(249,115,22,0.12)" }}
        >
          <div className="max-w-4xl mx-auto px-4 py-5 sm:px-6 sm:py-8">
            <p className="text-[10px] font-bold text-orange-400 uppercase tracking-widest mb-1">Planning</p>
            <h1 className="text-xl font-bold text-stone-900 sm:text-3xl" style={{ fontFamily: "'Fraunces', Georgia, serif" }}>
              Meal Planner
            </h1>
            <p className="text-sm text-stone-500 mt-2 max-w-2xl">
              Build your week, auto-fill meals with Surprise Me, and turn your plan into a grocery list with one tap.
            </p>
          </div>
        </div>

        <div className="max-w-4xl mx-auto px-4 py-6 sm:px-6 sm:py-10">
          <div
            className="rounded-[28px] border p-5 sm:p-8"
            style={{
              background: "linear-gradient(145deg, rgba(255,255,255,0.96), rgba(255,247,237,0.96))",
              borderColor: "rgba(249,115,22,0.16)",
              boxShadow: "0 24px 60px rgba(120, 53, 15, 0.08)",
            }}
          >
            <div className="flex flex-wrap items-center gap-3 mb-5">
              <div
                className="inline-flex h-12 w-12 items-center justify-center rounded-2xl"
                style={{ background: "linear-gradient(135deg,#7C3AED,#9333EA)", boxShadow: "0 10px 24px rgba(124,58,237,0.28)" }}
              >
                <Calendar size={22} className="text-white" />
              </div>
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-orange-500">Members Only</p>
                <h2 className="text-2xl font-bold text-stone-900" style={{ fontFamily: "'Fraunces', Georgia, serif" }}>
                  Unlock meal prep and Surprise Me
                </h2>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 mb-6">
              {[
                { title: "Plan the week", copy: "Map breakfast, lunch, and dinner across the whole week." },
                { title: "Surprise Me", copy: "Let AI or your saved recipes fill empty slots in seconds." },
                { title: "Shop faster", copy: "Turn your meal plan into a grocery list when you're ready." },
                { title: "Export anywhere", copy: "Download your plan as a PDF, CSV spreadsheet, or calendar file for the week or a single day." },
              ].map((item) => (
                <div
                  key={item.title}
                  className="rounded-2xl border p-4"
                  style={{ background: "rgba(255,255,255,0.82)", borderColor: "rgba(216,180,254,0.4)" }}
                >
                  <p className="text-sm font-semibold text-stone-800">{item.title}</p>
                  <p className="text-xs leading-5 text-stone-500 mt-1">{item.copy}</p>
                </div>
              ))}
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-stone-500 max-w-xl">
                Become a member to use Meal Prep, including AI-powered Surprise Me suggestions and exports for PDF, CSV, and calendar formats.
              </p>
              <PremiumFeatureButton
                label="Unlock Meal Prep"
                onClick={() => openPremiumPage("Meal Prep")}
                className="w-full justify-center sm:w-auto"
              />
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-full" style={{ fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif", background: "#FFFAF5" }}>

      {/* Header */}
      <div
        className="border-b"
        style={{ background: "linear-gradient(135deg,#FFF7ED 0%,#FFFAF5 100%)", borderColor: "rgba(249,115,22,0.12)" }}
      >
        <div className="mx-auto max-w-[1440px] px-4 py-4 sm:px-6 sm:py-6">
          <div className="mb-4 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className="text-[10px] font-bold text-orange-400 uppercase tracking-widest mb-1">Planning</p>
              <h1 className="text-xl font-bold text-stone-900 sm:text-2xl" style={{ fontFamily: "'Fraunces', Georgia, serif" }}>
                Meal Planner
              </h1>
              {isKitchenMode && (
                <p className="text-[11px] font-semibold text-orange-500 mt-1">Shared with {activeKitchenName || "Kitchen"}</p>
              )}
              <p className="text-xs text-stone-400 mt-1">{plannedCount} of {totalSlots} slots filled</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
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
      <div className="mx-auto max-w-[1440px] px-4 py-4 sm:px-6 sm:py-6">
        <div className="overflow-x-auto pb-2">
          <div className="grid min-w-[980px] grid-cols-7 gap-4 xl:min-w-0">
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
                    onRemove={() => {
                      if (isKitchenMode) {
                        void kitchenMealPlan.removeMeal(meal!.id);
                      } else {
                        removeMealPlanItem?.(meal!.id);
                      }
                      toast.success("Removed from plan");
                    }}
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
              className="fixed bottom-0 left-0 right-0 sm:bottom-auto sm:top-1/2 sm:left-1/2 sm:w-[calc(100%-2rem)] sm:max-w-2xl lg:max-w-3xl sm:-translate-x-1/2 sm:-translate-y-1/2 z-50 rounded-t-3xl sm:rounded-3xl overflow-hidden max-h-[90vh] flex flex-col"
              style={{ background: "#fff", boxShadow: "0 -8px 40px rgba(0,0,0,0.15)" }}
            >
              <div className="flex-1 min-h-0 overflow-y-auto">
                <div className="p-6 sm:p-7">
                <div className="sticky top-0 z-10 mb-4 flex items-center justify-between bg-white pb-3">
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

              <div className="grid max-h-[56vh] grid-cols-1 gap-2 overflow-y-auto lg:grid-cols-2">
                  {filteredRecipes.length === 0 ? (
                    <div className="py-8 text-center lg:col-span-2">
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
                        className="w-full flex items-center gap-3 rounded-2xl border border-stone-100 bg-white px-3 py-3 text-left transition-colors group hover:border-orange-200 hover:bg-orange-50/70 sm:px-4 sm:py-3.5"
                      >
                        <div className="h-12 w-12 overflow-hidden rounded-xl shrink-0 bg-stone-100">
                          <img
                            src={getRecipeImageSrc(recipe.image)}
                            alt={recipe.name}
                            className="w-full h-full object-cover"
                            onError={applyRecipeImageFallback}
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-stone-800 truncate group-hover:text-orange-700 transition-colors">{recipe.name}</p>
                          <div className="mt-1 flex items-center gap-2 text-[11px] text-stone-400">
                            <span className="inline-flex items-center gap-1"><Clock size={10} /> {recipe.cook_time}</span>
                            {recipe.cuisine && (
                              <span className="inline-flex items-center gap-1">
                                <span className="h-1 w-1 rounded-full bg-stone-300" />
                                {recipe.cuisine}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="shrink-0 rounded-xl border border-stone-200 px-2.5 py-1.5 text-[11px] font-semibold text-stone-500 group-hover:border-orange-300 group-hover:text-orange-600 transition-colors">
                          Add
                        </div>
                      </button>
                    ))
                  )}
                </div>
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
                      startPlannedMealCooking(showMealActionModal);
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
              className="fixed left-1/2 top-1/2 z-50 w-[calc(100%-1.5rem)] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-3xl overflow-hidden"
              style={{ background: "#fff", boxShadow: "0 -8px 40px rgba(0,0,0,0.15)" }}
            >
              <div className="p-6">
                <p className="text-[10px] font-bold uppercase tracking-widest text-orange-500 mb-1">Surprise Me</p>
                <h3 className="text-lg font-bold text-stone-900" style={{ fontFamily: "'Fraunces', Georgia, serif" }}>
                  Choose your surprise source
                </h3>
                <p className="text-xs text-stone-500 mt-1">Use only recipes you saved, or let AI recommendations mix in new ideas with higher ingredient match.</p>
                <div className="grid grid-cols-1 gap-2 mt-5">
                  <button
                    onClick={handleSurpriseSaved}
                    className="rounded-xl border border-stone-200 py-2.5 text-sm font-semibold text-stone-700 hover:border-orange-300 hover:text-orange-600"
                  >
                    Use saved recipes only
                  </button>
                  <button
                    onClick={handleSurpriseAi}
                    className="rounded-xl py-2.5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-75"
                    style={{ background: "linear-gradient(135deg,#FB923C,#F97316,#EA580C)" }}
                  >
                    {isPremium ? "Use AI recommendations" : "Use AI recommendations · Premium"}
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
              className="fixed bottom-0 left-0 right-0 sm:bottom-auto sm:top-1/2 sm:left-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2 sm:max-w-sm z-50 rounded-t-3xl sm:rounded-3xl max-h-[92vh] sm:max-h-[85vh] overflow-y-auto"
              style={{ background: "#fff", boxShadow: "0 -8px 40px rgba(0,0,0,0.15)" }}
            >
              <div className="p-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-bold text-stone-900" style={{ fontFamily: "'Fraunces', Georgia, serif" }}>Export Settings</h3>
                  <button onClick={() => setShowExportModal(false)} className="w-7 h-7 rounded-lg bg-stone-100 text-stone-500 flex items-center justify-center">
                    <X size={14} />
                  </button>
                </div>
                <p className="text-xs text-stone-500 mt-1">Choose format and what range to include.</p>
                <div className="mt-4">
                  <p className="text-[11px] uppercase tracking-wide font-semibold text-stone-500 mb-2">Export range</p>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => setExportScope("week")}
                      className="rounded-xl border px-3 py-2 text-sm font-semibold transition-colors"
                      style={{
                        borderColor: exportScope === "week" ? "rgba(249,115,22,0.45)" : "rgba(231,229,228,1)",
                        background: exportScope === "week" ? "rgba(255,237,213,0.8)" : "#fff",
                        color: exportScope === "week" ? "#C2410C" : "#57534E",
                      }}
                    >
                      Full week
                    </button>
                    <button
                      onClick={() => setExportScope("day")}
                      className="rounded-xl border px-3 py-2 text-sm font-semibold transition-colors"
                      style={{
                        borderColor: exportScope === "day" ? "rgba(249,115,22,0.45)" : "rgba(231,229,228,1)",
                        background: exportScope === "day" ? "rgba(255,237,213,0.8)" : "#fff",
                        color: exportScope === "day" ? "#C2410C" : "#57534E",
                      }}
                    >
                      Single day
                    </button>
                  </div>
                  {exportScope === "day" && (
                    <div className="mt-3 rounded-xl border border-orange-100 bg-orange-50/60 p-3">
                      <p className="text-[11px] uppercase tracking-wide font-semibold text-orange-700 mb-2">Select day</p>
                      <div className="grid grid-cols-4 gap-1.5">
                        {DAYS.map((day) => (
                          <button
                            key={day}
                            onClick={() => setExportDay(day)}
                            className="rounded-lg px-2 py-1.5 text-xs font-semibold transition-colors"
                            style={{
                              background: exportDay === day ? "#F97316" : "#fff",
                              color: exportDay === day ? "#fff" : "#78716C",
                              border: "1px solid rgba(251,146,60,0.35)",
                            }}
                          >
                            {day}
                          </button>
                        ))}
                      </div>
                      <p className="text-[11px] text-orange-700 mt-2">Single-day PDF includes ingredients and instructions.</p>
                    </div>
                  )}
                </div>
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
