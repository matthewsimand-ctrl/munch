import { useState, useEffect, useMemo, useRef } from "react";
import {
  Flame, Clock, Heart, ShoppingCart, ChevronRight,
  Calendar, Star, Plus, Check, Users, MapPin, X, RotateCw,
  Trophy, ChefHat, Zap, Award, Camera, Sparkles, TrendingUp, Play,
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useStore } from "@/lib/store";
import { useBrowseFeed } from "@/hooks/useBrowseFeed";
import defaultChefAvatar from "@/assets/chef-avatar.png";
import { calculateMatch } from "@/lib/matchLogic";
import { parseIngredientLine } from "@/lib/ingredientText";
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

const WEEK_DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const MEAL_PREP_TYPES = new Set(["Breakfast", "Lunch", "Dinner"]);

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
      className="relative overflow-hidden rounded-2xl p-5 border border-white/60"
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
          <p className="text-3xl font-bold leading-none" style={{ fontFamily: "'Fraunces', Georgia, serif", color: palette.text }}>
            {value}
          </p>
        </div>
        <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "rgba(255,255,255,0.45)" }}>
          <Icon size={18} className={palette.icon} />
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
        {recipe.image && recipe.image !== "/placeholder.svg" ? (
          <img src={recipe.image} alt={recipe.name} className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-4xl bg-gradient-to-br from-orange-50 to-amber-50">🍽️</div>
        )}
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
  const navigate = useNavigate();
  const [displayName, setDisplayName] = useState<string | null>(null);
  const [greeting] = useState(() => {
    const h = new Date().getHours();
    if (h < 12) return "Good morning";
    if (h < 17) return "Good afternoon";
    return "Good evening";
  });

  const { recipes: browseRecipes, loading: browseLoading, loadFeed } = useBrowseFeed();
  const {
    likedRecipes, likeRecipe, savedApiRecipes, pantryList,
    addCustomGroceryItem, customGroceryItems, recipeFolders,
    cookingStreak, totalMealsCooked, cookedRecipeIds, totalXp,
    earnedBadges, earnBadge, lastCookedDate, chefAvatarUrl, setChefAvatarUrl,
    mealPlan, displayName: storeDisplayName
  } = useStore();

  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);
  const [suggestionOffset, setSuggestionOffset] = useState(0);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [avatarDialogOpen, setAvatarDialogOpen] = useState(false);
  const [avatarSkinTone, setAvatarSkinTone] = useState("#F5C9A9");
  const [avatarHair, setAvatarHair] = useState("short");
  const [avatarHairColor, setAvatarHairColor] = useState("#3F2A1D");
  const [avatarShirtColor, setAvatarShirtColor] = useState("#EA580C");
  const [avatarAccessory, setAvatarAccessory] = useState("none");
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const { meal: currentPlannedMeal, loading: currentMealLoading } = useCurrentMealPlan();
  const { meals: cookedMeals, loading: cookedMealsLoading, estimateMealSavings } = useCookedMeals();
  const [estimatingMealId, setEstimatingMealId] = useState<string | null>(null);

  const AVATAR_PRESETS = [
    defaultChefAvatar,
    "https://api.dicebear.com/9.x/adventurer/svg?seed=ChefMunch",
    "https://api.dicebear.com/9.x/notionists/svg?seed=KitchenHero",
    "https://api.dicebear.com/9.x/fun-emoji/svg?seed=Foodie",
  ];

  const buildCustomAvatar = () => {
    const hairStyle = avatarHair === "short"
      ? `<path d='M34 36c6-10 26-10 32 0v6H34z' fill='${avatarHairColor}' />`
      : avatarHair === "curly"
        ? `<path d='M33 40c1-12 33-14 35 0l-1 5H34z' fill='${avatarHairColor}' /><circle cx='38' cy='38' r='4' fill='${avatarHairColor}' /><circle cx='62' cy='38' r='4' fill='${avatarHairColor}' />`
        : `<path d='M30 42c3-13 37-13 40 0v7H30z' fill='${avatarHairColor}' />`;
    const accessory = avatarAccessory === "glasses"
      ? "<circle cx='43' cy='58' r='5' fill='none' stroke='#3A3A3A' stroke-width='1.5'/><circle cx='57' cy='58' r='5' fill='none' stroke='#3A3A3A' stroke-width='1.5'/><path d='M48 58h4' stroke='#3A3A3A' stroke-width='1.5'/>"
      : avatarAccessory === "hat"
        ? "<rect x='32' y='30' width='36' height='8' rx='3' fill='#FFFFFF'/><rect x='39' y='24' width='22' height='8' rx='3' fill='#FFFFFF'/>"
        : "";

    const svg = `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'>
      <rect width='100' height='100' rx='20' fill='#FFF7ED' />
      <circle cx='50' cy='57' r='18' fill='${avatarSkinTone}' />
      ${hairStyle}
      <circle cx='44' cy='58' r='1.7' fill='#1C1917' />
      <circle cx='56' cy='58' r='1.7' fill='#1C1917' />
      <path d='M45 66c3 2 7 2 10 0' stroke='#1C1917' stroke-width='1.8' stroke-linecap='round' fill='none'/>
      ${accessory}
      <path d='M26 100c2-17 13-24 24-24s22 7 24 24' fill='${avatarShirtColor}' />
    </svg>`;
    return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
  };

  const applyCustomAvatar = () => {
    setChefAvatarUrl(buildCustomAvatar());
    setAvatarDialogOpen(false);
    toast.success("Custom avatar updated!");
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingAvatar(true);
    try {
      const ext = file.name.split(".").pop();
      const fileName = `chef-avatar-${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from("recipe-photos").upload(fileName, file, { upsert: true });
      if (error) throw error;
      const { data: { publicUrl } } = supabase.storage.from("recipe-photos").getPublicUrl(fileName);
      setChefAvatarUrl(publicUrl);
      toast.success("Avatar updated!");
    } catch {
      toast.error("Failed to upload avatar");
    } finally {
      setUploadingAvatar(false);
    }
  };

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
  const availableSuggestions = useMemo(
    () => browseRecipes.filter((r) => !likedSet.has(r.id)),
    [browseRecipes, likedSet],
  );
  const suggestedRecipes = useMemo(
    () => availableSuggestions.slice(suggestionOffset, suggestionOffset + 3),
    [availableSuggestions, suggestionOffset],
  );

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

  useEffect(() => { loadFeed(); }, [loadFeed]);
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
      const { data: sessionData } = await supabase.auth.getSession();
      const userId = sessionData.session?.user?.id;

      if (userId) {
        const { data } = await supabase.from("profiles").select("display_name").eq("user_id", userId).maybeSingle();
        if (data?.display_name) {
          setDisplayName(data.display_name);
          return;
        }
      }

      // Fallback to store name for Guests or users without a profile record
      if (storeDisplayName) setDisplayName(storeDisplayName);
    };
    loadProfile();
  }, [storeDisplayName]);

  const selectedMatch = selectedRecipe ? calculateMatch(pantryNames, selectedRecipe.ingredients || []) : null;
  const formatIngredient = (s: string) => { const p = parseIngredientLine(s); return p.quantity ? `${p.name} (${p.quantity})` : p.name; };

  const formatCookedAt = (dateString: string) =>
    new Date(dateString).toLocaleDateString("en-US", { month: "short", day: "numeric" });

  const { isPremium } = usePremiumAccess();

  const handleEstimateSavings = async (mealId: string) => {
    if (!isPremium) {
      toast.info("AI savings estimates are a Premium feature.", {
        action: {
          label: "Open Settings",
          onClick: () => navigate("/settings"),
        },
      });
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

  const QUICK_ACTIONS = [
    { label: "Find Recipe", to: "/swipe", emoji: "🔍", color: "from-orange-50 to-amber-50" },
    { label: "Add to Pantry", to: "/pantry", emoji: "📦", color: "from-emerald-50 to-teal-50" },
    { label: "Grocery List", to: "/grocery", emoji: "🛒", color: "from-sky-50 to-blue-50" },
    { label: "Plan Meals", to: "/meal-prep", emoji: "📅", color: "from-violet-50 to-purple-50" },
  ];

  return (
    <div className="min-h-full" style={{ fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif", background: "#FFFAF5" }}>
      {/* Hero header */}
      <div
        className="relative overflow-hidden border-b"
        style={{ background: "linear-gradient(135deg,#FFF7ED 0%,#FFFAF5 60%,#FFF3E4 100%)", borderColor: "rgba(249,115,22,0.12)" }}
      >
        <div
          className="absolute inset-0 opacity-30"
          style={{ backgroundImage: "radial-gradient(circle, #FDA97440 1px, transparent 1px)", backgroundSize: "24px 24px" }}
        />
        <div className="relative max-w-7xl mx-auto px-6 py-6 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-orange-400 uppercase tracking-widest mb-1">
              {new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
            </p>
            <h1
              data-tutorial="dashboard-greeting"
              className="text-2xl sm:text-3xl font-bold text-stone-900 leading-tight"
              style={{ fontFamily: "'Fraunces', Georgia, serif" }}
            >
              {greeting}, <span className="text-orange-500">Chef {displayName || ""}</span> 👋
            </h1>
            <p className="text-sm text-stone-500 mt-1">Here's what's cooking this week</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="hidden md:block min-w-[220px] rounded-xl border px-3 py-2" style={{ background: "rgba(255,255,255,0.72)", borderColor: "rgba(249,115,22,0.20)" }}>
              <div className="flex items-center justify-between text-[11px] font-bold text-stone-600 mb-1">
                <span className="inline-flex items-center gap-1"><Star size={11} className="text-amber-500 fill-amber-500" /> Level {levelInfo.level}</span>
                <span>{totalXp} XP</span>
              </div>
              <div className="relative h-1.5 bg-amber-100 rounded-full overflow-hidden">
                <motion.div
                  className="absolute inset-y-0 left-0 rounded-full"
                  style={{ background: "linear-gradient(90deg,#FBBF24,#F59E0B)" }}
                  initial={{ width: 0 }}
                  animate={{ width: `${(levelInfo.current / levelInfo.needed) * 100}%` }}
                  transition={{ type: "spring", stiffness: 60, delay: 0.3 }}
                />
              </div>
            </div>
            <button
              onClick={() => setAvatarDialogOpen(true)}
              className="relative w-12 h-12 rounded-full overflow-hidden ring-2 ring-orange-200 ring-offset-2 group shrink-0"
              disabled={uploadingAvatar}
            >
              <img src={chefAvatarUrl || defaultChefAvatar} alt="Chef" className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <Camera size={14} className="text-white" />
              </div>
            </button>
            <input ref={avatarInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} />
            <Link
              to="/swipe"
              className="hidden sm:flex items-center gap-2 text-white text-sm font-bold px-5 py-2.5 rounded-full transition-all hover:opacity-90 active:scale-95"
              style={{ background: "linear-gradient(135deg,#FB923C,#F97316,#EA580C)", boxShadow: "0 4px 16px rgba(249,115,22,0.30)" }}
            >
              <span>🍳</span> Get Cooking
            </Link>
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="max-w-7xl mx-auto px-6 py-7 space-y-7">

        {/* Stats */}
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-3" data-tutorial="dashboard-stats">
          {stats.map((s, i) => (
            <motion.div key={s.label} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06, duration: 0.4, ease: "easeOut" }}>
              <StatCard {...s} />
            </motion.div>
          ))}
        </div>

        {/* 2-col layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* Left 2/3 */}
          <div className="lg:col-span-2 space-y-6">
            {/* Suggestions */}
            <section
              data-tutorial="dashboard-suggestions"
              className="rounded-2xl border p-5"
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
              {browseLoading ? (
                <div className="grid grid-cols-3 gap-4">
                  {[0, 1, 2].map((i) => (
                    <div key={i} className="animate-pulse">
                      <div className="rounded-xl bg-stone-100 aspect-[4/3] mb-3" />
                      <div className="h-3 bg-stone-100 rounded-full mb-2 w-4/5" />
                      <div className="h-3 bg-stone-100 rounded-full w-2/5" />
                    </div>
                  ))}
                </div>
              ) : suggestedRecipes.length === 0 ? (
                <div className="py-10 text-center">
                  <p className="text-sm text-stone-400">
                    <Link to="/swipe" className="text-orange-500 hover:underline">Browse recipes</Link> to get personalized suggestions
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {suggestedRecipes.map((recipe) => {
                    const match = calculateMatch(pantryNames, recipe.ingredients || []);
                    return (
                      <RecipeSuggestionCard
                        key={recipe.id}
                        recipe={recipe}
                        match={match}
                        isSaved={likedSet.has(recipe.id)}
                        onSave={() => handleSave(recipe)}
                        onDismiss={() => handleDismissSuggestion(recipe.id)}
                        onClick={() => setSelectedRecipe(recipe)}
                      />
                    );
                  })}
                </div>
              )}
            </section>

            {/* This week */}
            <section className="rounded-2xl border p-5" style={{ background: "#FFFFFF", borderColor: "rgba(0,0,0,0.07)", boxShadow: "0 2px 12px rgba(28,25,23,0.05)" }}>
              <SectionHeader
                icon={Calendar}
                title="This week"
                action={
                  <Link to="/meal-prep" className="text-xs text-orange-500 font-semibold hover:text-orange-600 flex items-center gap-0.5">
                    Meal Prep <ChevronRight size={13} />
                  </Link>
                }
              />
              <div className="space-y-1.5">
                {/* Current meal */}
                <div className="flex items-center gap-3 px-4 py-3 rounded-xl border" style={{ background: "linear-gradient(135deg,#FFF7ED,#FFF3E4)", borderColor: "rgba(249,115,22,0.20)" }}>
                  <div className="w-2 h-2 rounded-full bg-orange-500 animate-pulse shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] font-bold text-orange-500 uppercase tracking-wider mb-0.5">Now</p>
                    <p className="text-sm font-semibold text-stone-800 truncate">
                      {currentMealLoading ? "Loading…" : currentPlannedMeal ? currentPlannedMeal.recipe_name : "No meal planned"}
                    </p>
                  </div>
                  {currentPlannedMeal && (
                    <button
                      onClick={() => navigate(`/cook/${currentPlannedMeal.recipe_id}`)}
                      className="text-xs font-bold text-orange-600 bg-orange-100 hover:bg-orange-200 px-3 py-1.5 rounded-full transition-colors shrink-0"
                    >
                      Cook →
                    </button>
                  )}
                </div>
                {thisWeekMealRows.map(({ day, meal, done, recipeId }, index) => (
                  <div
                    key={day}
                    className="flex items-center gap-3 px-4 py-2.5 rounded-xl transition-colors"
                    style={{ background: done ? "rgba(34,197,94,0.06)" : "rgba(0,0,0,0.02)" }}
                  >
                    <span className="text-xs font-bold w-8 shrink-0" style={{ color: done ? "#15803D" : "#A8A29E" }}>{day}</span>
                    <span className="flex-1 text-sm truncate" style={{ color: done ? "#A8A29E" : "#292524", fontWeight: done ? 400 : 500, textDecoration: done ? "line-through" : "none" }}>
                      {meal}
                    </span>
                    {done ? (
                      <span className="flex items-center gap-1 text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full">
                        <Check size={10} /> Done
                      </span>
                    ) : (
                      <button
                        onClick={() => recipeId ? navigate(`/cook/${recipeId}`) : navigate("/meal-prep", { state: { selectedDay: index, openAddDialog: true, mealType: "dinner" } })}
                        className="text-xs text-stone-400 hover:text-orange-500 font-semibold flex items-center gap-1 px-2 py-1 rounded-full hover:bg-orange-50 transition-colors"
                      >
                        {recipeId ? <Play size={11} /> : <Plus size={11} />} {recipeId ? "Cook" : "Add"}
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </section>
          </div>

          {/* Right 1/3 */}
          <div className="space-y-5">
            {/* Quick actions */}
            <section
              data-tutorial="dashboard-quick-actions"
              className="rounded-2xl border p-5"
              style={{ background: "#FFFFFF", borderColor: "rgba(0,0,0,0.07)", boxShadow: "0 2px 12px rgba(28,25,23,0.05)" }}
            >
              <h2 className="text-[15px] font-bold text-stone-800 mb-3">Quick actions</h2>
              <div className="grid grid-cols-2 gap-2">
                {QUICK_ACTIONS.map(({ label, to, emoji, color }) => (
                  <Link key={label} to={to} className={`flex flex-col items-center gap-2 p-4 rounded-xl bg-gradient-to-br ${color} hover:opacity-80 transition-all active:scale-95 text-center group`}>
                    <span className="text-2xl">{emoji}</span>
                    <span className="text-xs font-semibold text-stone-600 group-hover:text-stone-800 leading-tight">{label}</span>
                  </Link>
                ))}
              </div>
            </section>

            {/* Cooked history */}
            <section className="rounded-2xl border p-5" style={{ background: "#FFFFFF", borderColor: "rgba(0,0,0,0.07)", boxShadow: "0 2px 12px rgba(28,25,23,0.05)" }}>
              <SectionHeader icon={Sparkles} title="Cooked history" />
              {cookedMealsLoading ? (
                <p className="text-xs text-stone-400">Loading meals...</p>
              ) : cookedMeals.length === 0 ? (
                <p className="text-xs text-stone-400">Cook your first meal to start your history.</p>
              ) : (
                <div className="space-y-2.5">
                  {cookedMeals.slice(0, 6).map((meal) => (
                    <div key={meal.id} className="rounded-xl border border-stone-100 px-3 py-2.5">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-stone-800 truncate">{meal.recipe_name}</p>
                          <p className="text-[10px] text-stone-400 mt-0.5">Cooked {formatCookedAt(meal.cooked_at)}</p>
                        </div>
                        {meal.estimated_savings != null && isPremium ? (
                          <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-1 rounded-full whitespace-nowrap">
                            Saved ≈ ${meal.estimated_savings.toFixed(2)}
                          </span>
                        ) : (
                          <button
                            onClick={() => handleEstimateSavings(meal.id)}
                            disabled={estimatingMealId === meal.id}
                            className="text-[10px] font-semibold text-violet-700 bg-violet-50 hover:bg-violet-100 px-2 py-1 rounded-full disabled:opacity-60"
                          >
                            {isPremium ? "✨ AI savings" : "🔒 Premium"}
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* Recent activity */}
            <section className="rounded-2xl border p-5" style={{ background: "#FFFFFF", borderColor: "rgba(0,0,0,0.07)", boxShadow: "0 2px 12px rgba(28,25,23,0.05)" }}>
              <h2 className="text-[15px] font-bold text-stone-800 mb-4">Recent activity</h2>
              <div className="space-y-3">
                {recentActivity.map((item, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-xl bg-stone-50 border border-stone-100 flex items-center justify-center text-sm shrink-0">{item.emoji}</div>
                    <div className="min-w-0 flex-1 pt-0.5">
                      <p className="text-xs text-stone-700 font-medium leading-snug">{item.text}</p>
                      <p className="text-[10px] text-stone-400 mt-0.5">{item.time}</p>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </div>
        </div>

        {/* Badges */}
        <section className="rounded-2xl border p-5" style={{ background: "#FFFFFF", borderColor: "rgba(0,0,0,0.07)", boxShadow: "0 2px 12px rgba(28,25,23,0.05)" }}>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-violet-50 flex items-center justify-center">
                <Award size={14} className="text-violet-500" />
              </div>
              <h2 className="text-[15px] font-bold text-stone-800">Badges</h2>
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
                      <span className="text-[9px] font-semibold text-stone-600 text-center leading-tight">{b.label}</span>
                    </button>
                  </TooltipTrigger>
                  <TooltipContent className="max-w-[220px] bg-stone-900 text-stone-100 border-stone-800">
                    <p className="text-xs font-semibold">{b.label}</p>
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
      </div>

      <Dialog open={avatarDialogOpen} onOpenChange={setAvatarDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Customize your avatar</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <p className="text-sm font-semibold text-stone-700 mb-2">Upload your own photo</p>
              <button
                onClick={() => avatarInputRef.current?.click()}
                className="w-full text-sm font-semibold text-orange-600 bg-orange-50 hover:bg-orange-100 border border-orange-200 rounded-lg py-2.5"
                disabled={uploadingAvatar}
              >
                {uploadingAvatar ? "Uploading..." : "Upload photo"}
              </button>
            </div>

            <div>
              <p className="text-sm font-semibold text-stone-700 mb-2">Choose a ready-made avatar</p>
              <div className="grid grid-cols-4 gap-2">
                {AVATAR_PRESETS.map((preset) => (
                  <button
                    key={preset}
                    onClick={() => { setChefAvatarUrl(preset); setAvatarDialogOpen(false); }}
                    className="rounded-xl overflow-hidden border border-stone-200 hover:border-orange-300"
                  >
                    <img src={preset} alt="Avatar preset" className="w-full h-16 object-cover bg-orange-50" />
                  </button>
                ))}
              </div>
            </div>

            <div>
              <p className="text-sm font-semibold text-stone-700 mb-2">Or build your own</p>
              <div className="grid grid-cols-2 gap-3 text-xs">
                <label className="space-y-1"><span className="font-semibold text-stone-600">Skin tone</span><input type="color" value={avatarSkinTone} onChange={(e) => setAvatarSkinTone(e.target.value)} className="w-full h-9 rounded" /></label>
                <label className="space-y-1"><span className="font-semibold text-stone-600">Hair color</span><input type="color" value={avatarHairColor} onChange={(e) => setAvatarHairColor(e.target.value)} className="w-full h-9 rounded" /></label>
                <label className="space-y-1"><span className="font-semibold text-stone-600">Shirt color</span><input type="color" value={avatarShirtColor} onChange={(e) => setAvatarShirtColor(e.target.value)} className="w-full h-9 rounded" /></label>
                <label className="space-y-1"><span className="font-semibold text-stone-600">Hair style</span>
                  <select value={avatarHair} onChange={(e) => setAvatarHair(e.target.value)} className="w-full h-9 rounded border border-stone-200 px-2">
                    <option value="short">Short</option>
                    <option value="curly">Curly</option>
                    <option value="long">Long</option>
                  </select>
                </label>
                <label className="space-y-1 col-span-2"><span className="font-semibold text-stone-600">Accessory</span>
                  <select value={avatarAccessory} onChange={(e) => setAvatarAccessory(e.target.value)} className="w-full h-9 rounded border border-stone-200 px-2">
                    <option value="none">None</option>
                    <option value="glasses">Glasses</option>
                    <option value="hat">Chef hat</option>
                  </select>
                </label>
              </div>
              <div className="mt-3 flex items-center gap-3">
                <img src={buildCustomAvatar()} alt="Custom avatar preview" className="w-14 h-14 rounded-full border border-stone-200" />
                <button onClick={applyCustomAvatar} className="text-sm font-semibold text-white bg-orange-500 hover:bg-orange-600 px-3 py-2 rounded-lg">Use this avatar</button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Recipe detail dialog */}
      <Dialog open={!!selectedRecipe} onOpenChange={() => setSelectedRecipe(null)}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-hidden flex flex-col">
          {selectedRecipe && selectedMatch && (
            <>
              <DialogHeader>
                <DialogTitle className="text-xl font-bold" style={{ fontFamily: "'Fraunces', Georgia, serif" }}>
                  {selectedRecipe.name}
                </DialogTitle>
              </DialogHeader>
              <div className="flex-1 min-h-0 overflow-y-auto pr-1">
                <div className="space-y-4 pr-2">
                  {selectedRecipe.image && selectedRecipe.image !== "/placeholder.svg" && (
                    <img src={selectedRecipe.image} alt={selectedRecipe.name} className="w-full h-44 object-cover rounded-xl" />
                  )}
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="secondary" className="gap-1"><Clock className="h-3 w-3" /> {selectedRecipe.cook_time}</Badge>
                    <Badge variant="secondary">{selectedRecipe.difficulty}</Badge>
                    <MatchBadge percentage={selectedMatch.percentage} />
                    {selectedRecipe.cuisine && <Badge variant="outline" className="gap-1"><MapPin className="h-3 w-3" /> {selectedRecipe.cuisine}</Badge>}
                    {selectedRecipe.servings && <Badge variant="secondary" className="gap-1"><Users className="h-3 w-3" /> Serves {selectedRecipe.servings}</Badge>}
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-stone-400 uppercase tracking-widest mb-2">Ingredients</p>
                    <div className="flex flex-wrap gap-1.5">
                      {selectedMatch.matched.map((ing) => (
                        <span key={ing} className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 font-medium border border-emerald-100">
                          <Check className="h-3 w-3" />{formatIngredient(ing)}
                        </span>
                      ))}
                      {selectedMatch.missing.map((ing) => (
                        <span key={ing} className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full bg-red-50 text-red-600 font-medium border border-red-100">
                          <ShoppingCart className="h-3 w-3" />{formatIngredient(ing)}
                        </span>
                      ))}
                    </div>
                    {selectedMatch.missing.length > 0 && (
                      <button onClick={() => handleAddMissing(selectedRecipe)} className="mt-2 text-xs text-orange-500 hover:text-orange-600 font-semibold flex items-center gap-1">
                        <ShoppingCart size={12} /> Add {selectedMatch.missing.length} missing to grocery list
                      </button>
                    )}
                  </div>
                  {(selectedRecipe.instructions || []).length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-stone-400 uppercase tracking-widest mb-2">Instructions</p>
                      <ol className="space-y-2">
                        {selectedRecipe.instructions
                          .map((s) => String(s || "").replace(/^step\s*\d+\s*[:.)-]?\s*/i, "").replace(/^\d+\s*[:.)-]\s*/, "").trim())
                          .filter((s) => s.length > 0)
                          .map((s, i) => (
                            <li key={i} className="flex gap-2.5 text-sm text-stone-700">
                              <span className="flex-shrink-0 w-5 h-5 rounded-full bg-orange-500 text-white text-xs flex items-center justify-center font-bold mt-0.5">{i + 1}</span>
                              {s}
                            </li>
                          ))}
                      </ol>
                    </div>
                  )}
                  {!likedSet.has(selectedRecipe.id) && (
                    <button
                      onClick={() => { handleSave(selectedRecipe); setSelectedRecipe(null); }}
                      className="w-full flex items-center justify-center gap-2 text-white font-bold py-3 rounded-xl transition-all hover:opacity-90 active:scale-95"
                      style={{ background: "linear-gradient(135deg,#FB923C,#F97316,#EA580C)", boxShadow: "0 4px 16px rgba(249,115,22,0.30)" }}
                    >
                      <Heart size={16} /> Save Recipe
                    </button>
                  )}
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
