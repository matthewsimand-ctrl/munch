import { useState, useEffect, useMemo, useRef } from "react";
import {
  Flame, Clock, Heart, ShoppingCart, ChevronRight,
  Calendar, Star, Plus, Check, Users, MapPin, X, RotateCw,
  Trophy, ChefHat, Zap, Award, Camera, Sparkles, TrendingUp,
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
import MatchBadge from "@/components/MatchBadge";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { getLevel } from "@/components/ChefCompanion";
import type { Recipe } from "@/data/recipes";
import { useCurrentMealPlan } from "@/hooks/useCurrentMealPlan";

const MEAL_PLAN = [
  { day: "Mon", meal: "Pasta Carbonara", done: true },
  { day: "Tue", meal: "Thai Green Curry", done: true },
  { day: "Wed", meal: "Lemon Herb Salmon", done: false },
  { day: "Thu", meal: "—", done: false },
  { day: "Fri", meal: "BBQ Chicken Bowl", done: false },
];

interface StatDef {
  label: string;
  value: string;
  icon: React.FC<{ size?: number; className?: string }>;
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
  icon: React.FC<{ size?: number; className?: string }>;
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
          className={`absolute top-2 right-2 w-7 h-7 rounded-full backdrop-blur-sm flex items-center justify-center transition-all ${
            isSaved ? "bg-green-500 text-white" : "bg-black/25 text-white opacity-0 group-hover:opacity-100 hover:bg-orange-500"
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
  } = useStore();

  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);
  const [suggestionOffset, setSuggestionOffset] = useState(0);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const { meal: currentPlannedMeal, loading: currentMealLoading } = useCurrentMealPlan();

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
    { id: "first_cook",  label: "First Cook",   emoji: "👨‍🍳", desc: "Cook your first recipe",          unlocked: totalMealsCooked >= 1 },
    { id: "streak_3",   label: "3-Day Streak",  emoji: "🔥", desc: "3 consecutive days cooking",      unlocked: cookingStreak >= 3 },
    { id: "streak_7",   label: "Week Warrior",  emoji: "⚡", desc: "7-day cooking streak",             unlocked: cookingStreak >= 7 },
    { id: "5_recipes",  label: "5 Recipes",     emoji: "📖", desc: "Cook 5 different recipes",         unlocked: cookedRecipeIds.length >= 5 },
    { id: "10_meals",   label: "Meal Master",   emoji: "🏆", desc: "Cook 10 total meals",              unlocked: totalMealsCooked >= 10 },
    { id: "level_5",    label: "Level 5",       emoji: "⭐", desc: "Reach cooking level 5",            unlocked: getLevel(totalXp).level >= 5 },
    { id: "saver_10",   label: "Collector",     emoji: "💎", desc: "Save 10 recipes",                  unlocked: likedRecipes.length >= 10 },
    { id: "level_10",   label: "Chef Pro",      emoji: "👑", desc: "Reach cooking level 10",           unlocked: getLevel(totalXp).level >= 10 },
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
    { label: "Cooking Streak", value: `${cookingStreak}🔥`, icon: Flame,
      palette: { bg: "linear-gradient(135deg,#FFF1E6 0%,#FFE4CC 100%)", icon: "text-orange-500", text: "#7C2D12", bar: "#F97316" } },
    { label: "Meals Cooked", value: String(totalMealsCooked), icon: ChefHat,
      palette: { bg: "linear-gradient(135deg,#ECFDF5 0%,#D1FAE5 100%)", icon: "text-emerald-500", text: "#064E3B", bar: "#10B981" } },
    { label: "Recipes Saved", value: String(likedRecipes.length), icon: Heart,
      palette: { bg: "linear-gradient(135deg,#FFF1F2 0%,#FFE4E6 100%)", icon: "text-rose-500", text: "#881337", bar: "#F43F5E" } },
    { label: "Recipes Cooked", value: String(cookedRecipeIds.length), icon: Trophy,
      palette: { bg: "linear-gradient(135deg,#FFFBEB 0%,#FEF3C7 100%)", icon: "text-amber-500", text: "#78350F", bar: "#F59E0B" } },
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
    async function loadProfile() {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        const { data } = await supabase.from("profiles").select("display_name").eq("user_id", session.user.id).single();
        if (data?.display_name) setDisplayName(data.display_name);
      }
    }
    loadProfile();
  }, []);

  const selectedMatch = selectedRecipe ? calculateMatch(pantryNames, selectedRecipe.ingredients || []) : null;
  const formatIngredient = (s: string) => { const p = parseIngredientLine(s); return p.quantity ? `${p.name} (${p.quantity})` : p.name; };

  const QUICK_ACTIONS = [
    { label: "Find Recipe",   to: "/swipe",     emoji: "🔍", color: "from-orange-50 to-amber-50" },
    { label: "Add to Pantry", to: "/pantry",    emoji: "📦", color: "from-emerald-50 to-teal-50" },
    { label: "Grocery List",  to: "/grocery",   emoji: "🛒", color: "from-sky-50 to-blue-50" },
    { label: "Plan Meals",    to: "/meal-prep", emoji: "📅", color: "from-violet-50 to-purple-50" },
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
            <h1 className="text-2xl sm:text-3xl font-bold text-stone-900 leading-tight" style={{ fontFamily: "'Fraunces', Georgia, serif" }}>
              {greeting}{displayName ? `, ${displayName}` : ""} 👋
            </h1>
            <p className="text-sm text-stone-500 mt-1">Here's what's cooking this week</p>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={() => avatarInputRef.current?.click()}
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
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
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
            <section className="rounded-2xl border p-5" style={{ background: "#FFFFFF", borderColor: "rgba(0,0,0,0.07)", boxShadow: "0 2px 12px rgba(28,25,23,0.05)" }}>
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
                {MEAL_PLAN.map(({ day, meal, done }, index) => (
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
                        onClick={() => navigate("/meal-prep", { state: { selectedDay: index, openAddDialog: true, mealType: "dinner" } })}
                        className="text-xs text-stone-400 hover:text-orange-500 font-semibold flex items-center gap-1 px-2 py-1 rounded-full hover:bg-orange-50 transition-colors"
                      >
                        <Plus size={11} /> Add
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
            <section className="rounded-2xl border p-5" style={{ background: "#FFFFFF", borderColor: "rgba(0,0,0,0.07)", boxShadow: "0 2px 12px rgba(28,25,23,0.05)" }}>
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

        {/* XP + Badges */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <section className="rounded-2xl border p-5" style={{ background: "linear-gradient(135deg,#FFF7ED 0%,#FFFAF5 100%)", borderColor: "rgba(249,115,22,0.15)", boxShadow: "0 2px 12px rgba(249,115,22,0.06)" }}>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-100 flex items-center justify-center">
                <Star size={16} className="text-amber-500 fill-amber-500" />
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <h2 className="text-[15px] font-bold text-stone-800">Cooking XP</h2>
                  <span className="text-sm font-bold text-amber-600 bg-amber-50 px-2.5 py-0.5 rounded-full border border-amber-100">Level {levelInfo.level}</span>
                </div>
                <p className="text-xs text-stone-400 mt-0.5">{totalXp} total XP earned</p>
              </div>
            </div>
            <div className="relative h-2.5 bg-amber-100 rounded-full overflow-hidden">
              <motion.div
                className="absolute inset-y-0 left-0 rounded-full"
                style={{ background: "linear-gradient(90deg,#FBBF24,#F59E0B)" }}
                initial={{ width: 0 }}
                animate={{ width: `${(levelInfo.current / levelInfo.needed) * 100}%` }}
                transition={{ type: "spring", stiffness: 60, delay: 0.3 }}
              />
            </div>
            <div className="flex justify-between text-[10px] text-stone-400 mt-2 font-medium">
              <span>{levelInfo.current} XP</span>
              <span>{levelInfo.needed} to next level</span>
            </div>
          </section>

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
            <div className="grid grid-cols-4 gap-2">
              {BADGES.map((b) => (
                <div
                  key={b.id}
                  title={b.desc}
                  className={`flex flex-col items-center gap-1 p-2.5 rounded-xl border transition-all ${
                    b.unlocked ? "border-amber-100 bg-gradient-to-br from-amber-50 to-orange-50" : "border-stone-100 bg-stone-50 opacity-40 grayscale"
                  }`}
                >
                  <span className="text-xl leading-none">{b.emoji}</span>
                  <span className="text-[9px] font-semibold text-stone-600 text-center leading-tight">{b.label}</span>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>

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
