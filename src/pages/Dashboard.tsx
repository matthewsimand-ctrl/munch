import { useState, useEffect, useMemo } from "react";
import {
  Flame, Clock, Heart, ShoppingCart, ChevronRight,
  Calendar, Star, Plus, Check, Users, MapPin, X, RotateCw,
  Trophy, ChefHat, Zap, Award, Sparkles, TrendingUp, Play, Beef, Wheat, Droplets, Clock3,
  Settings, Lock, Link2, PenSquare, Crown,
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useStore } from "@/lib/store";
import { useBrowseFeed } from "@/hooks/useBrowseFeed";
import { calculateMatch } from "@/lib/matchLogic";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import MatchBadge from "@/components/MatchBadge";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { getLevel } from "@/components/ChefCompanion";
import type { Recipe } from "@/data/recipes";
import { useCurrentMealPlan } from "@/hooks/useCurrentMealPlan";
import { getMealPlanWeekStart } from "@/lib/mealPlanUtils";
import { useCookedMeals } from "@/hooks/useCookedMeals";
import { usePremiumAccess } from "@/hooks/usePremiumAccess";
import { usePremiumGate } from "@/hooks/usePremiumGate";
import { getConsumedNutritionSummary } from "@/lib/consumedNutrition";
import { useIsMobile } from "@/hooks/use-mobile";
import PremiumFeatureButton from "@/components/PremiumFeatureButton";
import RecipePreviewDialog from "@/components/RecipePreviewDialog";
import ImportRecipeDialog from "@/components/ImportRecipeDialog";
import CreateRecipeForm from "@/components/CreateRecipeForm";
import { RECIPE_IMAGE_FALLBACK_DATA_URI, applyRecipeImageFallback, getRecipeImageSrc } from "@/lib/recipeImage";
import { normalizeRecipe } from "@/lib/normalizeRecipe";
import munchLogo from "@/assets/munch-logo.webp";

const WEEK_DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const MEAL_PREP_TYPES = new Set(["Breakfast", "Lunch", "Dinner"]);
const DASHBOARD_HERO_FALLBACK_IMAGE = munchLogo;
const DASHBOARD_COOKED_MEALS_HISTORY_LIMIT = 180;
const DASHBOARD_STARTER_RECIPES: Recipe[] = [
  {
    id: "starter-sheet-pan-chicken",
    name: "Sheet Pan Chicken & Veggies",
    image: RECIPE_IMAGE_FALLBACK_DATA_URI,
    cook_time: "30 min",
    difficulty: "Easy",
    ingredients: ["2 chicken breasts", "1 bell pepper", "1 zucchini", "2 tbsp olive oil"],
    tags: ["weeknight", "high protein", "easy"],
    instructions: ["Preheat the oven.", "Season the chicken and vegetables.", "Roast until cooked through."],
    cuisine: "American",
    source: "starter",
    servings: 2,
  },
  {
    id: "starter-garlic-pasta",
    name: "Garlic Butter Pasta",
    image: RECIPE_IMAGE_FALLBACK_DATA_URI,
    cook_time: "20 min",
    difficulty: "Easy",
    ingredients: ["200 g pasta", "2 tbsp butter", "3 cloves garlic", "1/4 cup parmesan"],
    tags: ["quick", "comfort", "vegetarian"],
    instructions: ["Cook the pasta.", "Make the garlic butter.", "Toss and serve with parmesan."],
    cuisine: "Italian",
    source: "starter",
    servings: 2,
  },
  {
    id: "starter-salmon-bowl",
    name: "Salmon Rice Bowl",
    image: RECIPE_IMAGE_FALLBACK_DATA_URI,
    cook_time: "25 min",
    difficulty: "Intermediate",
    ingredients: ["2 salmon fillets", "2 cups cooked rice", "1 cucumber", "1 tbsp soy sauce"],
    tags: ["healthy", "high protein", "dinner"],
    instructions: ["Cook the salmon.", "Warm the rice.", "Assemble the bowls and serve."],
    cuisine: "Asian",
    source: "starter",
    servings: 2,
  },
];

function getMonthChangeCopy(input: { current: number; previous: number; loading: boolean }) {
  const { current, previous, loading } = input;

  if (loading) {
    return { text: "Checking monthly trend", toneClassName: "text-stone-500" };
  }

  if (previous === 0) {
    if (current === 0) {
      return { text: "No meals yet this month", toneClassName: "text-stone-500" };
    }

    return {
      text: `${current} new meal${current === 1 ? "" : "s"} this month`,
      toneClassName: "text-emerald-700",
    };
  }

  const percentChange = Math.round(((current - previous) / previous) * 100);

  if (percentChange > 0) {
    return { text: `↗ +${percentChange}% from last month`, toneClassName: "text-emerald-700" };
  }

  if (percentChange < 0) {
    return { text: `↘ ${Math.abs(percentChange)}% from last month`, toneClassName: "text-amber-700" };
  }

  return { text: "No change from last month", toneClassName: "text-stone-500" };
}

interface StatDef {
  label: string;
  value: string;
  icon: React.ElementType;
  palette: { bg: string; icon: string; text: string; bar: string };
}

function StatCard({ label, value, icon: Icon, palette }: StatDef) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative overflow-hidden rounded-2xl p-3.5 sm:p-5 border border-white/60"
      style={{ background: palette.bg, boxShadow: "0 2px 12px rgba(28,25,23,0.06)" }}
    >
      <div
        className="absolute -top-4 -right-4 w-20 h-20 rounded-full opacity-15"
        style={{ background: palette.bar }}
      />
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: palette.text, opacity: 0.6 }}>
            {label}
          </p>
          <p className="text-2xl sm:text-3xl font-bold leading-none" style={{ fontFamily: "'Fraunces', Georgia, serif", color: palette.text }}>
            {value}
          </p>
        </div>
        <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center" style={{ background: "rgba(255,255,255,0.45)" }}>
          <Icon size={16} className={palette.icon} />
        </div>
      </div>
    </motion.div>
  );
}

function SectionHeader({
  icon: Icon,
  title,
  action,
}: {
  icon: React.ElementType;
  title: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between mb-4">
      <div className="flex items-center gap-2.5">
        <div className="w-7 h-7 rounded-lg bg-orange-50 flex items-center justify-center">
          <Icon size={14} className="text-orange-500" />
        </div>
        <h2 className="text-[15px] font-bold text-stone-800" style={{ fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif" }}>
          {title}
        </h2>
      </div>
      {action}
    </div>
  );
}

function RecipeSuggestionCard({
  recipe, match, isSaved, onSave, onDismiss, onClick,
}: {
  recipe: Recipe;
  match: ReturnType<typeof calculateMatch>;
  isSaved: boolean;
  onSave: () => void;
  onDismiss: () => void;
  onClick: () => void;
}) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      className="group relative flex flex-col cursor-pointer"
      onClick={onClick}
    >
      <div className="relative rounded-xl overflow-hidden mb-3 aspect-[4/3] bg-stone-100">
        <img
          src={getRecipeImageSrc(recipe.image)}
          alt={recipe.name}
          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
          onError={applyRecipeImageFallback}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
        <button
          onClick={(e) => { e.stopPropagation(); onDismiss(); }}
          className="absolute top-2 left-2 w-7 h-7 rounded-full bg-black/25 backdrop-blur-sm flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/40"
        >
          <X size={12} />
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); if (!isSaved) onSave(); }}
          className={`absolute top-2 right-2 w-7 h-7 rounded-full backdrop-blur-sm flex items-center justify-center transition-all ${isSaved ? "bg-green-500 text-white" : "bg-black/25 text-white opacity-0 group-hover:opacity-100 hover:bg-orange-500"
            }`}
        >
          {isSaved ? <Check size={12} /> : <Plus size={12} />}
        </button>
        <div className="absolute bottom-2 right-2">
          <MatchBadge percentage={match.percentage} />
        </div>
      </div>
      <p className="text-sm font-semibold text-stone-800 line-clamp-2 leading-snug mb-1.5 group-hover:text-orange-600 transition-colors">
        {recipe.name}
      </p>
      <div className="flex items-center gap-2 text-xs text-stone-400">
        <Clock size={11} />
        <span>{recipe.cook_time}</span>
        {recipe.cuisine && (
          <>
            <span className="w-1 h-1 rounded-full bg-stone-300" />
            <span>{recipe.cuisine}</span>
          </>
        )}
      </div>
    </motion.div>
  );
}

export default function Dashboard() {
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  const [displayName, setDisplayName] = useState<string | null>('');
  const [profileLoaded, setProfileLoaded] = useState(false);
  const [loadedHeroImageSrc, setLoadedHeroImageSrc] = useState<string | null>(null);
  const [greeting] = useState(() => {
    const h = new Date().getHours();
    if (h < 12) return "Good morning";
    if (h < 17) return "Good afternoon";
    return "Good evening";
  });
  const [dashboardReady, setDashboardReady] = useState(false);

  const { recipes: browseRecipes, loading: browseLoading, loadFeed } = useBrowseFeed({ includeMealDbFallback: false, enabled: dashboardReady });
  const {
    likedRecipes, likeRecipe, savedApiRecipes, pantryList,
    addCustomGroceryItem, customGroceryItems, recipeFolders,
    cookingStreak, totalMealsCooked, cookedRecipeIds, totalXp,
    earnedBadges, earnBadge, lastCookedDate,
    cachedNutrition,
    mealPlan, displayName: storeDisplayName,
    dashboardHeroImageMode, dashboardHeroImageSeed,
  } = useStore();

  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);
  const [suggestionOffset, setSuggestionOffset] = useState(0);
  const [addRecipeDialogOpen, setAddRecipeDialogOpen] = useState(false);
  const [showManualRecipeDialog, setShowManualRecipeDialog] = useState(false);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [quickSuggestionRecipes, setQuickSuggestionRecipes] = useState<Recipe[]>([]);
  const [importDialogTab, setImportDialogTab] = useState<"url" | "pdf" | "photo">("url");
  const [hideImportTabs, setHideImportTabs] = useState(false);
  const { isPremium } = usePremiumAccess();
  const { meal: currentPlannedMeal, nextMeal: nextPlannedMeal, loading: currentMealLoading } = useCurrentMealPlan(dashboardReady);
  const { meals: cookedMeals, loading: cookedMealsLoading, estimateMealSavings } = useCookedMeals(DASHBOARD_COOKED_MEALS_HISTORY_LIMIT, dashboardReady);
  const [estimatingMealId, setEstimatingMealId] = useState<string | null>(null);
  const nutritionSummary = useMemo(
    () => getConsumedNutritionSummary(cookedMeals, cachedNutrition),
    [cookedMeals, cachedNutrition],
  );
  const monthOverMonthMeals = useMemo(() => {
    const now = new Date();
    const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const nextMonthStart = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    const previousMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);

    let currentMonthMeals = 0;
    let previousMonthMeals = 0;

    for (const meal of cookedMeals) {
      const cookedAt = new Date(meal.cooked_at);
      if (Number.isNaN(cookedAt.getTime())) continue;

      if (cookedAt >= currentMonthStart && cookedAt < nextMonthStart) {
        currentMonthMeals += 1;
        continue;
      }

      if (cookedAt >= previousMonthStart && cookedAt < currentMonthStart) {
        previousMonthMeals += 1;
      }
    }

    return {
      currentMonthMeals,
      previousMonthMeals,
    };
  }, [cookedMeals]);
  const mealsMonthChange = useMemo(
    () => getMonthChangeCopy({
      current: monthOverMonthMeals.currentMonthMeals,
      previous: monthOverMonthMeals.previousMonthMeals,
      loading: cookedMealsLoading && cookedMeals.length === 0,
    }),
    [cookedMeals.length, cookedMealsLoading, monthOverMonthMeals.currentMonthMeals, monthOverMonthMeals.previousMonthMeals],
  );

  const upNextPlannedMeal = isPremium ? (nextPlannedMeal || currentPlannedMeal) : null;
  const upNextRecipe = upNextPlannedMeal?.recipe_data || (upNextPlannedMeal ? {
    id: upNextPlannedMeal.recipe_id,
    name: upNextPlannedMeal.recipe_name,
    image: upNextPlannedMeal.recipe_image,
    ingredients: [],
    instructions: [],
    cook_time: '',
    cuisine: '',
  } : null);
  const upNextMealLabel = upNextPlannedMeal
    ? `${upNextPlannedMeal.meal_type.charAt(0).toUpperCase()}${upNextPlannedMeal.meal_type.slice(1)}`
    : '';

  const startPlannedMeal = (plannedMeal: typeof upNextPlannedMeal) => {
    if (!plannedMeal) return;

    const recipeId = plannedMeal.recipe_id;
    const hasRecipeLocally = Boolean(savedApiRecipes[recipeId]);

    if (!hasRecipeLocally && plannedMeal.recipe_data) {
      likeRecipe(recipeId, plannedMeal.recipe_data);
    }

    const canStart = hasRecipeLocally || Boolean(plannedMeal.recipe_data);
    if (!canStart) {
      toast.info("We couldn't load this planned recipe yet. Open Meal Prep and re-save it first.");
      return;
    }

    navigate(`/cook/${recipeId}`);
  };

  useEffect(() => {
    if ("requestIdleCallback" in globalThis) {
      const handle = (globalThis as any).requestIdleCallback(() => setDashboardReady(true), { timeout: 1500 });
      return () => (globalThis as any).cancelIdleCallback(handle);
    }

    const timeout = globalThis.setTimeout(() => setDashboardReady(true), 1200);
    return () => globalThis.clearTimeout(timeout);
  }, []);

  const BADGES = useMemo(() => [
    { id: "first_cook", label: "First Cook", emoji: "👨‍🍳", desc: "Cook your first recipe", current: totalMealsCooked, target: 1, unlocked: totalMealsCooked >= 1 },
    { id: "streak_3", label: "3-Day Streak", emoji: "🔥", desc: "Cook on 3 consecutive days", current: cookingStreak, target: 3, unlocked: cookingStreak >= 3 },
    { id: "streak_7", label: "Week Warrior", emoji: "⚡", desc: "Maintain a 7-day streak", current: cookingStreak, target: 7, unlocked: cookingStreak >= 7 },
    { id: "5_recipes", label: "5 Recipes", emoji: "📖", desc: "Cook 5 different recipes", current: cookedRecipeIds.length, target: 5, unlocked: cookedRecipeIds.length >= 5 },
    { id: "10_meals", label: "Meal Master", emoji: "🏆", desc: "Cook 10 total meals", current: totalMealsCooked, target: 10, unlocked: totalMealsCooked >= 10 },
    { id: "level_5", label: "Level 5", emoji: "⭐", desc: "Reach chef level 5", current: getLevel(totalXp).level, target: 5, unlocked: getLevel(totalXp).level >= 5 },
    { id: "saver_10", label: "Collector", emoji: "💎", desc: "Save 10 recipes", current: likedRecipes.length, target: 10, unlocked: likedRecipes.length >= 10 },
    { id: "level_10", label: "Chef Pro", emoji: "👑", desc: "Reach chef level 10", current: getLevel(totalXp).level, target: 10, unlocked: getLevel(totalXp).level >= 10 },
  ], [totalMealsCooked, cookingStreak, cookedRecipeIds.length, totalXp, likedRecipes.length]);

  useEffect(() => {
    BADGES.forEach((b) => {
      if (b.unlocked && !earnedBadges.includes(b.id)) {
        earnBadge(b.id);
        toast.success(`🏅 Badge unlocked: ${b.label}!`);
      }
    });
  }, [BADGES, earnedBadges, earnBadge]);

  const levelInfo = getLevel(totalXp);
  const thisWeekMealRows = useMemo(() => {
    const weekStart = getMealPlanWeekStart();
    return WEEK_DAYS.map((day) => {
      const dayMeals = (mealPlan || []).filter((item) => (item.weekStart ?? weekStart) === weekStart && item.day === day && MEAL_PREP_TYPES.has(item.mealType));
      if (dayMeals.length === 0) return { day, meal: "—", recipeId: null, done: false };

      const sortedDayMeals = [...dayMeals].sort((a, b) => {
        const mealOrder = { Breakfast: 0, Lunch: 1, Snack: 2, Dinner: 3 } as Record<string, number>;
        return (mealOrder[a.mealType] ?? 99) - (mealOrder[b.mealType] ?? 99);
      });
      const primary = sortedDayMeals[0];
      return {
        day,
        meal: primary.recipeName,
        recipeId: primary.recipeId,
        done: cookedRecipeIds.includes(primary.recipeId),
      };
    });
  }, [mealPlan, cookedRecipeIds]);
  const likedSet = useMemo(() => new Set(likedRecipes), [likedRecipes]);
  const pantryNames = useMemo(() => pantryList.map((p) => p.name), [pantryList]);
  useEffect(() => {
    let cancelled = false;

    const loadQuickSuggestions = async () => {
      const { data, error } = await supabase
        .from("recipes")
        .select("id, name, image, cook_time, difficulty, ingredients, instructions, tags, source, source_url, cuisine, chef, created_by, servings")
        .eq("is_public", true)
        .order("created_at", { ascending: false })
        .limit(18);

      if (cancelled || error) return;

      setQuickSuggestionRecipes(
        (data || [])
          .map((recipe) => normalizeRecipe(recipe))
          .filter((recipe) => !likedSet.has(recipe.id)),
      );
    };

    if (!dashboardReady) return;

    if (quickSuggestionRecipes.length === 0) {
      void loadQuickSuggestions();
    }

    return () => {
      cancelled = true;
    };
  }, [dashboardReady, likedSet, quickSuggestionRecipes.length]);

  const availableSuggestions = useMemo(
    () => {
      const primary = browseRecipes.filter((r) => !likedSet.has(r.id));
      if (primary.length > 0) return primary;
      return quickSuggestionRecipes.filter((r) => !likedSet.has(r.id));
    },
    [browseRecipes, likedSet, quickSuggestionRecipes],
  );
  const suggestedRecipes = useMemo(
    () => availableSuggestions.slice(suggestionOffset, suggestionOffset + 3),
    [availableSuggestions, suggestionOffset],
  );
  const dashboardDisplaySuggestions = suggestedRecipes.length > 0 ? suggestedRecipes : DASHBOARD_STARTER_RECIPES;
  const suggestionsLoading = browseLoading && availableSuggestions.length === 0;

  const recentActivity = useMemo(() => {
    const items: Array<{ text: string; time: string; emoji: string }> = [];
    if (likedRecipes.length > 0) {
      const id = likedRecipes[likedRecipes.length - 1];
      items.push({ text: `Saved ${savedApiRecipes[id]?.name || "a recipe"}`, time: "Recently", emoji: "❤️" });
    }
    if (lastCookedDate) items.push({ text: `Cooked ${totalMealsCooked} meal${totalMealsCooked === 1 ? "" : "s"} so far`, time: "Recently", emoji: "👨‍🍳" });
    if (customGroceryItems.length > 0) items.push({ text: `${customGroceryItems.length} item${customGroceryItems.length === 1 ? "" : "s"} on grocery list`, time: "Live", emoji: "🛒" });
    if (recipeFolders.length > 0) items.push({ text: `${recipeFolders.length} cookbook${recipeFolders.length === 1 ? "" : "s"} created`, time: "Live", emoji: "📚" });
    if (items.length === 0) return [{ text: "No activity yet — save a recipe to get started", time: "Now", emoji: "✨" }];
    return items.slice(0, 5);
  }, [likedRecipes, savedApiRecipes, lastCookedDate, totalMealsCooked, customGroceryItems.length, recipeFolders.length]);

  const stats: StatDef[] = useMemo(() => [
    {
      label: "Cooking Streak", value: `${cookingStreak}🔥`, icon: Flame,
      palette: { bg: "linear-gradient(135deg,#FFF1E6 0%,#FFE4CC 100%)", icon: "text-orange-500", text: "#7C2D12", bar: "#F97316" }
    },
    {
      label: "Meals Cooked", value: String(totalMealsCooked), icon: ChefHat,
      palette: { bg: "linear-gradient(135deg,#ECFDF5 0%,#D1FAE5 100%)", icon: "text-emerald-500", text: "#064E3B", bar: "#10B981" }
    },
    {
      label: "Recipes Saved", value: String(likedRecipes.length), icon: Heart,
      palette: { bg: "linear-gradient(135deg,#FFF1F2 0%,#FFE4E6 100%)", icon: "text-rose-500", text: "#881337", bar: "#F43F5E" }
    },
    {
      label: "Recipes Cooked", value: String(cookedRecipeIds.length), icon: Trophy,
      palette: { bg: "linear-gradient(135deg,#FFFBEB 0%,#FEF3C7 100%)", icon: "text-amber-500", text: "#78350F", bar: "#F59E0B" }
    },
  ], [likedRecipes.length, cookingStreak, totalMealsCooked, cookedRecipeIds.length]);

  useEffect(() => {
    if (!dashboardReady) return;
    void loadFeed();
  }, [dashboardReady, loadFeed]);
  useEffect(() => {
    if (availableSuggestions.length === 0) { if (suggestionOffset !== 0) setSuggestionOffset(0); return; }
    if (suggestionOffset >= availableSuggestions.length) setSuggestionOffset(Math.max(0, availableSuggestions.length - 3));
  }, [availableSuggestions.length, suggestionOffset]);

  const handleDismissSuggestion = (_id: string) => { setSuggestionOffset((p) => p + 1); };
  const handleRefreshSuggestions = () => {
    const maxOffset = Math.max(0, availableSuggestions.length - 3);
    const next = Math.min(maxOffset, suggestionOffset + 3);
    if (next === suggestionOffset) { toast.info("You're already viewing the freshest set"); return; }
    setSuggestionOffset(next);
  };
  const handleSave = (recipe: Recipe) => { likeRecipe(recipe.id, recipe); toast.success(`Saved ${recipe.name}`); };
  const handleAddMissing = (recipe: Recipe) => {
    const match = calculateMatch(pantryNames, recipe.ingredients || []);
    if (match.missing.length === 0) { toast.info("You have all the ingredients!"); return; }
    match.missing.forEach((ing) => addCustomGroceryItem(ing));
    toast.success(`Added ${match.missing.length} items to grocery list`);
  };

  useEffect(() => {
    const loadProfile = async () => {
      setProfileLoaded(false);
      const { data: sessionData } = await supabase.auth.getSession();
      const userId = sessionData.session?.user?.id;

      if (userId) {
        const { data } = await supabase.from("profiles").select("display_name").eq("user_id", userId).maybeSingle();
        if (data) {
          if (data.display_name) {
            setDisplayName(data.display_name);
          }
          setProfileLoaded(true);
          return;
        }
      }

      // Fallback to store name for Guests or users without a profile record
      if (storeDisplayName) setDisplayName(storeDisplayName);
      setProfileLoaded(true);
    };
    loadProfile();
  }, [storeDisplayName]);

  useEffect(() => {
    if (!displayName && storeDisplayName) {
      setDisplayName(storeDisplayName);
    }
  }, [displayName, storeDisplayName]);

  const { openPremiumPage } = usePremiumGate();

  const selectedMatch = selectedRecipe ? calculateMatch(pantryNames, selectedRecipe.ingredients || []) : null;

  const formatCookedAt = (dateString: string) =>
    new Date(dateString).toLocaleDateString("en-US", { month: "short", day: "numeric" });

  const handleEstimateSavings = async (mealId: string) => {
    if (!isPremium) {
      openPremiumPage("AI savings estimates");
      return;
    }

    const meal = cookedMeals.find((item) => item.id === mealId);
    if (!meal) return;

    setEstimatingMealId(mealId);
    const updated = await estimateMealSavings(meal);
    if (updated?.estimated_savings != null) {
      toast.success(`AI estimate: about $${updated.estimated_savings.toFixed(2)} saved`);
    } else {
      toast.error("Could not estimate savings right now");
    }
    setEstimatingMealId(null);
  };

  const handleOpenMealPrep = (state?: Record<string, unknown>) => {
    if (!isPremium) {
      openPremiumPage("Meal Prep");
      return;
    }

    navigate("/meal-prep", state ? { state } : undefined);
  };

  const QUICK_ACTIONS = [
    { label: "Find Recipe", to: "/swipe", emoji: "🔍", color: "from-orange-50 to-amber-50" },
    { label: "Saved", to: "/saved", emoji: "❤️", color: "from-rose-50 to-orange-50" },
    { label: "Add Recipe", action: "add-recipe", emoji: "➕", color: "from-amber-50 to-orange-50" },
    { label: "Groceries", to: "/groceries", emoji: "🛒", color: "from-sky-50 to-blue-50" },
    { label: "Plan Meals", to: "/meal-prep", emoji: "📅", color: "from-violet-50 to-purple-50", premium: true },
    ...(isMobile ? [{ label: "Settings", to: "/settings", emoji: "⚙️", color: "from-stone-50 to-slate-100" }] : [{ label: "Add to Pantry", to: "/pantry", emoji: "📦", color: "from-emerald-50 to-teal-50" }]),
  ];

  const heroImageOptions = useMemo(
    () =>
      [
        upNextPlannedMeal?.recipe_data,
        currentPlannedMeal?.recipe_data,
        ...Object.values(savedApiRecipes).slice(-8),
        ...DASHBOARD_STARTER_RECIPES,
        ...suggestedRecipes,
        ...availableSuggestions,
      ]
        .filter((recipe): recipe is Recipe => Boolean(recipe))
        .map((recipe) => getRecipeImageSrc(recipe.image))
        .filter(Boolean)
        .filter((src, index, arr) => arr.indexOf(src) === index),
    [availableSuggestions, currentPlannedMeal?.recipe_data, savedApiRecipes, suggestedRecipes, upNextPlannedMeal?.recipe_data],
  );
  const heroDaySeed = useMemo(() => {
    const today = new Date();
    const startOfYear = new Date(today.getFullYear(), 0, 0);
    const diff = today.getTime() - startOfYear.getTime();
    return Math.floor(diff / 86400000);
  }, []);
  const heroImageIndex =
    dashboardHeroImageMode === "daily"
      ? heroDaySeed
      : dashboardHeroImageSeed;
  const heroImageSrc =
    heroImageOptions.length > 0
      ? heroImageOptions[heroImageIndex % heroImageOptions.length]
      : DASHBOARD_HERO_FALLBACK_IMAGE;
  const resolvedChefName = displayName || storeDisplayName || "";
  const heroHeading = resolvedChefName ? `Chef ${resolvedChefName}` : "Chef";
  const heroImageReady = Boolean(loadedHeroImageSrc);

  useEffect(() => {
    if (!heroImageSrc) {
      setLoadedHeroImageSrc(null);
      return;
    }

    let cancelled = false;
    const image = new Image();
    image.onload = () => {
      if (!cancelled) {
        setLoadedHeroImageSrc(heroImageSrc);
      }
    };
    image.onerror = () => {
      if (!cancelled) {
        setLoadedHeroImageSrc(null);
      }
    };
    image.src = heroImageSrc;

    return () => {
      cancelled = true;
    };
  }, [heroImageSrc]);

  const dashboardQuestLabel = pantryList[0]?.name
    ? `Make something with ${pantryList[0].name}`
    : "Save a recipe that matches your pantry";
  const dashboardQuestXp = pantryList.length > 0 ? 50 : 25;
  const topMetricCards = [
    {
      key: "meals",
      label: "Meals Cooked",
      value: totalMealsCooked,
      icon: ChefHat,
      detail: `${monthOverMonthMeals.currentMonthMeals} this month`,
      tone: "bg-emerald-50 text-emerald-600",
    },
    {
      key: "saved",
      label: "Recipes Saved",
      value: likedRecipes.length,
      icon: Heart,
      detail: "total",
      tone: "bg-orange-50 text-orange-500",
    },
  ];
  const mobileDashboardStats = [
    {
      key: "streak",
      label: "Streak",
      value: `${cookingStreak}`,
      suffix: "days",
      icon: Flame,
      cardClassName: "border-orange-200/80 bg-[linear-gradient(135deg,#FFF1E6,#FFE3C7)] text-orange-900",
      iconClassName: "bg-white/80 text-orange-500",
    },
    {
      key: "meals",
      label: "Meals",
      value: `${totalMealsCooked}`,
      suffix: "cooked",
      icon: ChefHat,
      cardClassName: "border-emerald-200/80 bg-[linear-gradient(135deg,#ECFDF5,#D7FBE8)] text-emerald-950",
      iconClassName: "bg-white/80 text-emerald-600",
    },
    {
      key: "saved",
      label: "Saved",
      value: `${likedRecipes.length}`,
      suffix: "recipes",
      icon: Heart,
      cardClassName: "border-violet-200/80 bg-[linear-gradient(135deg,#F6F0FF,#EDE2FF)] text-violet-950",
      iconClassName: "bg-white/80 text-violet-600",
    },
  ];
  const upNextMatch = upNextRecipe ? calculateMatch(pantryNames, upNextRecipe.ingredients || []) : null;
  const upNextCoverage = upNextMatch ? Math.max(18, upNextMatch.percentage) : 24;

  return (
    <div className="min-h-full" style={{ fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif", background: "#FFFAF5" }}>
      {/* Body */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 sm:py-5 space-y-5 sm:space-y-6">
        <section className="space-y-4">
          <div
            className="relative overflow-hidden rounded-[1.8rem] border border-orange-100 min-h-[176px] px-4 py-4 sm:min-h-[200px] sm:rounded-[2rem] sm:p-5 sm:px-8 sm:py-6"
            style={{
              background: "linear-gradient(135deg,#1C1917 0%,#292524 42%,#44403C 100%)",
              boxShadow: "0 16px 40px rgba(28,25,23,0.10)",
            }}
          >
            {loadedHeroImageSrc && (
              <img
                src={loadedHeroImageSrc}
                alt=""
                aria-hidden="true"
                className="absolute inset-0 h-full w-full object-cover"
                onError={() => setLoadedHeroImageSrc(null)}
              />
            )}
            {loadedHeroImageSrc && (
              <div className="absolute inset-0 bg-[linear-gradient(110deg,rgba(28,25,23,0.74)_0%,rgba(28,25,23,0.58)_34%,rgba(28,25,23,0.36)_62%,rgba(28,25,23,0.2)_100%)]" />
            )}
            {loadedHeroImageSrc && (
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.14),transparent_24%),radial-gradient(circle_at_bottom_left,rgba(0,0,0,0.22),transparent_30%)] backdrop-blur-[2px]" />
            )}
            <div className="relative flex flex-col gap-4 sm:gap-6 sm:flex-row sm:items-start sm:justify-between">
              <div className="max-w-xl">
                <p className={`text-[11px] font-bold uppercase tracking-[0.22em] ${heroImageReady ? "text-orange-50" : "text-orange-100"}`}>
                  {greeting}
                </p>
                <h2 className={`mt-2 text-[2rem] font-bold leading-none sm:mt-3 sm:text-5xl ${heroImageReady ? "text-white" : "text-white"}`} style={{ fontFamily: "'Fraunces', Georgia, serif" }}>
                  {heroHeading}
                </h2>
                <div className="mt-2.5 flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-white/30 bg-white/14 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.16em] text-white backdrop-blur-sm">
                    <Award className="h-3.5 w-3.5 text-amber-200" />
                    Level {levelInfo.level}
                  </span>
                  <span className="inline-flex items-center rounded-full border border-white/20 bg-black/15 px-3 py-1 text-[11px] font-semibold text-white/90">
                    {levelInfo.current}/{levelInfo.needed} XP to next level
                  </span>
                </div>
                <p className={`mt-3 text-[10px] font-bold uppercase tracking-[0.22em] sm:text-[11px] ${heroImageReady ? "text-orange-100" : "text-stone-200"}`}>
                  {new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
                </p>
                <p className="mt-3 max-w-md text-sm font-semibold leading-6 text-white sm:mt-5 sm:text-base">
                  Your kitchen snapshot is ready, with tailored picks, pantry-aware inspiration, and your next meal at a glance.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2 self-start sm:justify-end">
                <Link
                  to="/settings"
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-orange-300/60 bg-white/90 text-stone-700 shadow-sm backdrop-blur transition-colors hover:bg-orange-50"
                  aria-label="Open settings"
                >
                  <Settings size={18} />
                </Link>
              </div>
            </div>
          </div>

          {isMobile ? (
            <div className="-mx-1 flex snap-x snap-mandatory gap-3 overflow-x-auto px-1 pb-1 scrollbar-hide">
              {mobileDashboardStats.map(({ key, label, value, suffix, icon: Icon, cardClassName, iconClassName }) => (
                <section
                  key={key}
                  className={`min-w-[148px] snap-start rounded-[1.5rem] border p-4 shadow-[0_10px_24px_rgba(28,25,23,0.06)] ${cardClassName}`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-[0.18em] opacity-70">{label}</p>
                      <p className="mt-3 text-3xl font-bold leading-none" style={{ fontFamily: "'Fraunces', Georgia, serif" }}>{value}</p>
                      <p className="mt-2 text-xs font-semibold opacity-75">{suffix}</p>
                    </div>
                    <div className={`flex h-10 w-10 items-center justify-center rounded-2xl ${iconClassName}`}>
                      <Icon size={18} />
                    </div>
                  </div>
                </section>
              ))}
            </div>
          ) : (
          <div className="grid gap-4 lg:grid-cols-[1.05fr_1fr_1fr]">
            <section className="relative overflow-hidden rounded-[1.75rem] border border-orange-100 bg-white p-5 shadow-[0_10px_28px_rgba(28,25,23,0.06)]">
              <div className="absolute -right-6 -top-5 h-24 w-24 rounded-full bg-orange-100/80" />
              <div className="relative flex items-center justify-between gap-3">
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-orange-700">Cooking Streak</p>
                  <div className="mt-4 flex items-end gap-2">
                    <p className="text-5xl font-bold leading-none text-orange-800" style={{ fontFamily: "'Fraunces', Georgia, serif" }}>{cookingStreak}</p>
                    <p className="pb-1 text-sm font-semibold text-orange-700">day{cookingStreak === 1 ? "" : "s"}</p>
                  </div>
                </div>
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-orange-50 text-orange-500">
                  <Flame size={22} />
                </div>
              </div>
              <div className="mt-6 h-2.5 rounded-full bg-orange-100 overflow-hidden">
                <motion.div
                  className="h-full rounded-full"
                  style={{ background: "linear-gradient(90deg,#FB923C,#F97316)" }}
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.min(100, (cookingStreak / 14) * 100)}%` }}
                  transition={{ type: "spring", stiffness: 60, delay: 0.2 }}
                />
              </div>
              <div className="mt-3 flex items-center justify-between text-sm text-stone-500">
                <span>{Math.max(totalMealsCooked, 1) * 50} XP earned</span>
                <span>Keep it going</span>
              </div>
            </section>

            {topMetricCards.map(({ key, label, value, icon: Icon, tone, detail }) => (
              <section key={key} className="relative overflow-hidden rounded-[1.75rem] border border-orange-100 bg-white p-5 shadow-[0_10px_24px_rgba(28,25,23,0.05)]">
                <div className={`absolute -right-6 -top-5 h-24 w-24 rounded-full ${key === "saved" ? "bg-violet-100/80" : "bg-emerald-100/80"}`} />
                <div className="relative flex items-center justify-between gap-3">
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-stone-500">{label}</p>
                    <div className="mt-4 flex items-end gap-2">
                      <p className={`text-5xl font-bold leading-none ${key === "saved" ? "text-violet-600" : "text-emerald-700"}`} style={{ fontFamily: "'Fraunces', Georgia, serif" }}>{value}</p>
                      <p className="pb-1 text-sm font-semibold text-stone-600">{detail}</p>
                    </div>
                    {key === "meals" ? (
                      <p className={`mt-4 text-sm font-semibold ${mealsMonthChange.toneClassName}`}>{mealsMonthChange.text}</p>
                    ) : (
                      <div className="mt-4 flex items-center -space-x-2">
                        {likedRecipes.slice(0, 3).map((id, index) => (
                          <img
                            key={id}
                            src={getRecipeImageSrc(savedApiRecipes[id]?.image)}
                            alt=""
                            className="h-8 w-8 rounded-full border-2 border-white object-cover"
                            onError={applyRecipeImageFallback}
                            style={{ zIndex: 4 - index }}
                          />
                        ))}
                        {likedRecipes.length > 3 && (
                          <span className="inline-flex h-8 min-w-8 items-center justify-center rounded-full border-2 border-white bg-orange-100 px-2 text-xs font-bold text-orange-700">
                            +{likedRecipes.length - 3}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                  <div className={`flex h-14 w-14 items-center justify-center rounded-full ${tone}`}>
                    <Icon size={22} />
                  </div>
                </div>
              </section>
            ))}
          </div>
          )}
        </section>

        {/* 2-col layout */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3 lg:items-start">

          {/* Left 2/3 */}
          <div className="lg:col-span-2 space-y-6">
            {/* Suggestions */}
            <section
              data-tutorial="dashboard-suggestions"
              className="rounded-2xl border p-4 sm:p-5"
              style={{ background: "#FFFFFF", borderColor: "rgba(0,0,0,0.07)", boxShadow: "0 2px 12px rgba(28,25,23,0.05)" }}
            >
              <SectionHeader
                icon={TrendingUp}
                title="Suggested for you"
                action={
                  <div className="flex items-center gap-2">
                    <button onClick={handleRefreshSuggestions} className="inline-flex items-center gap-1.5 text-xs text-stone-500 hover:text-stone-700 font-semibold px-2.5 py-1 rounded-lg hover:bg-stone-100 transition-colors">
                      <RotateCw size={11} /> Refresh
                    </button>
                    <Link to="/swipe" className="text-xs text-orange-500 font-semibold hover:text-orange-600 flex items-center gap-0.5">
                      See all <ChevronRight size={13} />
                    </Link>
                  </div>
                }
              />
              {suggestionsLoading && dashboardDisplaySuggestions.length === 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
                  {[0, 1, 2].map((i) => (
                    <div key={i} className="animate-pulse">
                      <div className="rounded-xl bg-stone-100 aspect-[4/3] mb-3" />
                      <div className="h-3 bg-stone-100 rounded-full mb-2 w-4/5" />
                      <div className="h-3 bg-stone-100 rounded-full w-2/5" />
                    </div>
                  ))}
                </div>
              ) : (
                <div className={isMobile ? "-mx-1 flex snap-x snap-mandatory gap-3 overflow-x-auto px-1 pb-1 scrollbar-hide" : "grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4"}>
                  {dashboardDisplaySuggestions.slice(0, 3).map((recipe) => {
                    const match = calculateMatch(pantryNames, recipe.ingredients || []);
                    return (
                      <div key={recipe.id} className={isMobile ? "min-w-[82%] snap-start" : ""}>
                        <RecipeSuggestionCard
                          recipe={recipe}
                          match={match}
                          isSaved={likedSet.has(recipe.id)}
                          onSave={() => handleSave(recipe)}
                          onDismiss={() => handleDismissSuggestion(recipe.id)}
                          onClick={() => setSelectedRecipe(recipe)}
                        />
                      </div>
                    );
                  })}
                </div>
              )}
            </section>

            {!isMobile && (
              <section
                className="rounded-2xl border p-4 sm:p-5"
                style={{ background: "#FFFFFF", borderColor: "rgba(0,0,0,0.07)", boxShadow: "0 2px 12px rgba(28,25,23,0.05)" }}
              >
                <SectionHeader icon={Sparkles} title="Nutrition consumed" />
                {isPremium ? (
                  <>
                    <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4">
                      <div>
                        <p className="text-sm text-stone-500">
                          Premium nutrition totals from {nutritionSummary.coveredMeals} of {nutritionSummary.totalMeals} cooked meal{nutritionSummary.totalMeals === 1 ? "" : "s"}.
                        </p>
                        {nutritionSummary.coveredMeals > 0 && (
                          <p className="text-xs text-emerald-700 mt-2 font-semibold">
                            Average meal health score: {nutritionSummary.averageHealthScore.toFixed(1)}/10
                          </p>
                        )}
                      </div>
                      {nutritionSummary.coveredMeals > 0 && (
                        <div className="rounded-xl border border-orange-100 bg-orange-50 px-4 py-3 min-w-[180px]">
                          <p className="text-[11px] font-semibold uppercase tracking-wide text-orange-600/70">Calories consumed</p>
                          <p className="text-2xl font-bold text-orange-700 mt-1">{Math.round(nutritionSummary.totals.calories)}</p>
                        </div>
                      )}
                    </div>

                    {nutritionSummary.coveredMeals === 0 ? (
                      <div className="rounded-xl border border-dashed border-stone-200 bg-stone-50 p-4 mt-4">
                        <p className="text-sm font-semibold text-stone-600">No nutrition totals yet</p>
                        <p className="text-xs text-stone-400 mt-1">Analyze nutrition on your recipes and your cooked totals will start building here.</p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4">
                        {[
                          { label: "Protein", value: `${Math.round(nutritionSummary.totals.protein)}g`, icon: Beef, tone: "bg-sky-50 text-sky-500" },
                          { label: "Carbs", value: `${Math.round(nutritionSummary.totals.carbs)}g`, icon: Wheat, tone: "bg-amber-50 text-amber-500" },
                          { label: "Fat", value: `${Math.round(nutritionSummary.totals.fat)}g`, icon: Droplets, tone: "bg-rose-50 text-rose-500" },
                          { label: "Fiber", value: `${Math.round(nutritionSummary.totals.fiber)}g`, icon: Sparkles, tone: "bg-emerald-50 text-emerald-500" },
                        ].map((stat) => (
                          <div key={stat.label} className="rounded-xl border border-stone-100 px-3 py-3 bg-stone-50">
                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${stat.tone}`}>
                              <stat.icon size={14} />
                            </div>
                            <p className="text-[11px] text-stone-400 font-semibold uppercase tracking-wide mt-3">{stat.label}</p>
                            <p className="text-lg font-bold text-stone-800 mt-1">{stat.value}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                ) : (
                  <div className="relative mt-1 overflow-hidden rounded-2xl border border-orange-100 bg-gradient-to-br from-white via-orange-50/40 to-orange-100/40 p-4 sm:p-5">
                    <div className="pointer-events-none absolute inset-0">
                      <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-orange-200/35 blur-2xl" />
                      <div className="absolute -left-6 bottom-0 h-24 w-24 rounded-full bg-amber-200/30 blur-2xl" />
                    </div>
                    <div className="relative min-h-[300px] sm:min-h-[260px]">
                      <div className="grid grid-cols-2 gap-3 opacity-25 blur-[1.5px] sm:grid-cols-4">
                        {[
                          { label: "Protein", value: "92g", icon: Beef, tone: "bg-sky-50 text-sky-500" },
                          { label: "Carbs", value: "188g", icon: Wheat, tone: "bg-amber-50 text-amber-500" },
                          { label: "Fat", value: "61g", icon: Droplets, tone: "bg-rose-50 text-rose-500" },
                          { label: "Fiber", value: "24g", icon: Sparkles, tone: "bg-emerald-50 text-emerald-500" },
                        ].map((stat) => (
                          <div key={stat.label} className="rounded-xl border border-stone-100 px-3 py-3 bg-stone-50/90">
                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${stat.tone}`}>
                              <stat.icon size={14} />
                            </div>
                            <p className="text-[11px] text-stone-400 font-semibold uppercase tracking-wide mt-3">{stat.label}</p>
                            <p className="text-lg font-bold text-stone-800 mt-1">{stat.value}</p>
                          </div>
                        ))}
                      </div>
                      <div className="absolute inset-x-0 top-1/2 flex -translate-y-1/2 justify-center px-4">
                        <div className="w-full max-w-sm rounded-2xl border border-orange-200 bg-white/96 p-5 text-center shadow-[0_16px_40px_rgba(249,115,22,0.12)] backdrop-blur">
                          <p className="text-sm font-semibold text-stone-800">Unlock nutrition consumed</p>
                          <p className="mt-2 text-sm text-stone-500">
                            Become a member to track calories, macros, fiber, and overall meal health across everything you cook.
                          </p>
                          <PremiumFeatureButton
                            label="Get Premium"
                            onClick={() => openPremiumPage("Nutrition consumed")}
                            variant="soft"
                            className="mt-4 mx-auto h-11 w-auto px-5"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </section>
            )}

            {!isMobile && (
              <section className="rounded-2xl border p-4 sm:p-5" style={{ background: "#FFFFFF", borderColor: "rgba(0,0,0,0.07)", boxShadow: "0 2px 12px rgba(28,25,23,0.05)" }}>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-violet-50 flex items-center justify-center">
                      <Award size={14} className="text-violet-500" />
                    </div>
                    <h2 className="text-[15px] font-bold text-stone-800" style={{ fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif" }}>
                      Badges
                    </h2>
                  </div>
                  <span className="text-[11px] text-stone-400 font-bold bg-stone-100 px-2.5 py-1 rounded-full">
                    {BADGES.filter((b) => b.unlocked).length} / {BADGES.length}
                  </span>
                </div>
                <TooltipProvider>
                  <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2">
                    {BADGES.map((b) => (
                      <Tooltip key={b.id}>
                        <TooltipTrigger asChild>
                          <button
                            type="button"
                            title={`${b.label}: ${b.desc}`}
                            className={`w-full flex flex-col items-center gap-1 p-2.5 rounded-xl border transition-all cursor-help ${b.unlocked ? "border-amber-100 bg-gradient-to-br from-amber-50 to-orange-50" : "border-stone-100 bg-stone-50 opacity-40 grayscale"
                              }`}
                          >
                            <span className="text-xl leading-none">{b.emoji}</span>
                            <span className="text-[10px] font-semibold text-stone-600 text-center leading-tight" style={{ fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif" }}>
                              {b.label}
                            </span>
                          </button>
                        </TooltipTrigger>
                        <TooltipContent className="max-w-[220px] bg-stone-900 text-stone-100 border-stone-800">
                          <p className="text-xs font-semibold" style={{ fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif" }}>{b.label}</p>
                          <p className="mt-1 text-[10px] font-bold uppercase tracking-wide text-orange-300">How to earn</p>
                          <p className="text-[11px] text-stone-300 mt-1">{b.desc}</p>
                          <p className="text-[11px] text-orange-300 mt-1.5">
                            {b.unlocked ? "Unlocked" : `Progress: ${Math.min(b.current, b.target)} / ${b.target}`}
                          </p>
                        </TooltipContent>
                      </Tooltip>
                    ))}
                  </div>
                </TooltipProvider>
              </section>
            )}

          </div>

          {/* Right 1/3 */}
          <div className="space-y-5">
            {isPremium && (
              <section
                className="rounded-[1.9rem] border border-orange-100 bg-white p-5 shadow-[0_10px_24px_rgba(28,25,23,0.05)]"
              >
                <div className="flex items-center justify-between gap-3">
                  <SectionHeader icon={Clock3} title="Up Next" />
                  {upNextPlannedMeal && (
                    <span className="rounded-full border border-orange-200 bg-orange-50 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-orange-700">
                      Scheduled
                    </span>
                  )}
                </div>
                {upNextRecipe ? (
                  <>
                    <div className="mt-5 flex items-start gap-4">
                      <div className="h-24 w-24 overflow-hidden rounded-2xl border border-stone-100 bg-stone-100">
                        <img
                          src={getRecipeImageSrc(upNextRecipe.image)}
                          alt={upNextRecipe.name}
                          className="h-full w-full object-cover"
                          onError={applyRecipeImageFallback}
                        />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-[1.55rem] font-bold leading-tight text-stone-900" style={{ fontFamily: "'Fraunces', Georgia, serif" }}>
                          {upNextRecipe.name}
                        </p>
                        <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-stone-600">
                          {upNextMealLabel && (
                            <span className="inline-flex items-center rounded-full border border-stone-200 bg-stone-50 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-stone-600">
                              {upNextMealLabel}
                            </span>
                          )}
                          {(upNextRecipe.cuisine || upNextRecipe.cook_time) && (
                            <span>
                              {upNextRecipe.cuisine || "Planned meal"}{upNextRecipe.cook_time ? ` • ${upNextRecipe.cook_time}` : ""}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="mt-6">
                      <div className="flex items-center justify-between text-sm font-semibold text-stone-600">
                        <span>Prep Progress</span>
                        <span className="text-emerald-700">{upNextMatch ? `${upNextMatch.percentage}% ready` : "Ready to cook"}</span>
                      </div>
                      <div className="mt-2 h-2.5 rounded-full bg-stone-100 overflow-hidden">
                        <div className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-orange-500" style={{ width: `${upNextCoverage}%` }} />
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        startPlannedMeal(upNextPlannedMeal);
                      }}
                      className="mt-6 w-full rounded-full bg-orange-500 px-5 py-3 text-sm font-bold text-white transition-colors hover:bg-orange-600"
                    >
                      Launch Cooking Mode
                    </button>
                  </>
                ) : (
                  <div className="mt-5 space-y-3 rounded-2xl border border-dashed border-stone-200 bg-stone-50 p-4">
                    <p className="text-sm text-stone-500">
                      Plan a meal to see your next scheduled cook here.
                    </p>
                    <button
                      type="button"
                      onClick={() => handleOpenMealPrep()}
                      className="inline-flex w-full items-center justify-center rounded-full bg-orange-500 px-5 py-3 text-sm font-bold text-white transition-colors hover:bg-orange-600"
                    >
                      Open Meal Prep
                    </button>
                  </div>
                )}
              </section>
            )}

            <section
              data-tutorial="dashboard-quick-actions"
              className="rounded-[1.9rem] border border-orange-100 bg-white p-4 shadow-[0_10px_24px_rgba(28,25,23,0.05)]"
            >
              <h3 className="mb-3 text-xl font-bold text-stone-900" style={{ fontFamily: "'Fraunces', Georgia, serif" }}>
                Quick Actions
              </h3>
              <div className="grid grid-cols-2 gap-3">
                {QUICK_ACTIONS.slice(0, 5).map(({ label, to, emoji, premium, action }, index, arr) => {
                  const isLastOddItem = arr.length % 2 === 1 && index === arr.length - 1;
                  const sharedClassName = `flex min-h-[108px] flex-col items-center justify-center gap-2 rounded-[1.35rem] bg-orange-50/60 p-3 text-center transition-colors hover:bg-orange-100/70 ${isLastOddItem ? "col-span-2" : ""}`;

                  return premium ? (
                    <button
                      key={label}
                      type="button"
                      onClick={() => handleOpenMealPrep()}
                      className={sharedClassName}
                    >
                      <span className="flex h-11 w-11 items-center justify-center rounded-full bg-white text-xl shadow-sm">{emoji}</span>
                      <span className="text-xs font-semibold text-stone-700">{label}</span>
                    </button>
                  ) : action === "add-recipe" ? (
                    <button
                      key={label}
                      type="button"
                      onClick={() => setAddRecipeDialogOpen(true)}
                      className={sharedClassName}
                    >
                      <span className="flex h-11 w-11 items-center justify-center rounded-full bg-white text-xl shadow-sm">{emoji}</span>
                      <span className="text-xs font-semibold text-stone-700">{label}</span>
                    </button>
                  ) : (
                    <Link
                      key={label}
                      to={to}
                      className={sharedClassName}
                    >
                      <span className="flex h-11 w-11 items-center justify-center rounded-full bg-white text-xl shadow-sm">{emoji}</span>
                      <span className="text-xs font-semibold text-stone-700">{label}</span>
                    </Link>
                  );
                })}
              </div>
            </section>
          </div>
        </div>

      </div>

      <Dialog open={addRecipeDialogOpen} onOpenChange={setAddRecipeDialogOpen}>
        <DialogContent className="w-[calc(100vw-1rem)] max-w-sm overflow-hidden rounded-[1.75rem] border border-orange-100 bg-[#fffaf5] p-0 shadow-[0_24px_60px_rgba(249,115,22,0.16)]">
          <DialogHeader className="border-b border-orange-100/80 bg-gradient-to-br from-orange-50 via-white to-orange-50/60 px-5 py-4 text-left">
            <DialogTitle className="text-left">Add a recipe</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 px-4 py-4">
            <button
              type="button"
              onClick={() => {
                setAddRecipeDialogOpen(false);
                setShowManualRecipeDialog(true);
              }}
              className="flex w-full items-start gap-3 rounded-2xl border border-orange-100 bg-white px-4 py-3 text-left transition-all hover:border-orange-200 hover:bg-orange-50/60"
            >
              <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-orange-50 text-orange-500">
                <PenSquare size={18} />
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-semibold text-stone-800">Manual</span>
                <span className="mt-1 block text-xs leading-5 text-stone-500">Add your own recipe with ingredients and steps.</span>
              </span>
            </button>

            <button
              type="button"
              onClick={() => {
                setAddRecipeDialogOpen(false);
                setImportDialogTab("url");
                setHideImportTabs(false);
                setImportDialogOpen(true);
              }}
              className="flex w-full items-start gap-3 rounded-2xl border border-orange-100 bg-white px-4 py-3 text-left transition-all hover:border-orange-200 hover:bg-orange-50/60"
            >
              <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-orange-50 text-orange-500">
                <Link2 size={18} />
              </span>
              <span className="min-w-0">
                <span className="flex items-center gap-2 text-sm font-semibold text-stone-800">
                  <span>Import</span>
                  <span className="inline-flex items-center rounded-full bg-orange-50 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-orange-600">
                    <Crown size={10} className="mr-1" />
                    Premium
                  </span>
                </span>
                <span className="mt-1 block text-xs leading-5 text-stone-500">Import from URL, file, or photo.</span>
              </span>
            </button>
          </div>
        </DialogContent>
      </Dialog>

      <ImportRecipeDialog
        open={importDialogOpen}
        onOpenChange={(open) => {
          setImportDialogOpen(open);
          if (!open) setHideImportTabs(false);
        }}
        initialTab={importDialogTab}
        hideTabSelector={hideImportTabs}
      />

      <Dialog open={showManualRecipeDialog} onOpenChange={setShowManualRecipeDialog}>
        <DialogContent className="w-[calc(100vw-1rem)] max-w-[1120px] overflow-hidden rounded-[1.75rem] border border-orange-100 bg-[#fffaf7] p-0 shadow-[0_28px_80px_rgba(249,115,22,0.16)]">
          <DialogHeader className="border-b border-orange-100/80 bg-gradient-to-br from-orange-50 via-white to-orange-50/60 px-5 py-4 text-left">
            <DialogTitle>Add recipe</DialogTitle>
          </DialogHeader>
          <div className="max-h-[calc(100dvh-6rem)] overflow-y-auto px-4 py-4 sm:px-6 sm:py-5">
            <CreateRecipeForm onClose={() => setShowManualRecipeDialog(false)} />
          </div>
        </DialogContent>
      </Dialog>

      <RecipePreviewDialog
        recipe={selectedRecipe}
        match={selectedMatch}
        open={!!selectedRecipe}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedRecipe(null);
          }
        }}
        mode="explore"
        isSaved={selectedRecipe ? likedSet.has(selectedRecipe.id) : false}
        onSave={(recipe) => {
          handleSave(recipe);
          setSelectedRecipe(null);
        }}
        onAddMissingToGrocery={(recipe, missingIngredients) => {
          missingIngredients.forEach((ingredient) => addCustomGroceryItem(ingredient));
          toast.success(`Added ${missingIngredients.length} items from "${recipe.name}" to grocery list`);
        }}
      />
    </div>
  );
}
