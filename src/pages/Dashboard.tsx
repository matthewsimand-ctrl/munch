import { useState, useEffect, useMemo, useRef } from "react";
import {
  Flame, Clock, Heart, ShoppingCart, TrendingUp, ChevronRight,
  Sparkles, Calendar, Star, Plus, Check, Users, MapPin, X, RotateCw,
  Trophy, ChefHat, Zap, Award, Camera,
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useStore } from "@/lib/store";
import { useBrowseFeed } from "@/hooks/useBrowseFeed";
import defaultChefAvatar from "@/assets/chef-avatar.png";
import { calculateMatch } from "@/lib/matchLogic";
import { parseIngredientLine } from "@/lib/ingredientText";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { getLevel } from "@/components/ChefCompanion";
import type { Recipe } from "@/data/recipes";

const ACTIVITY = [
  { type: "saved", text: "Saved Shakshuka with Feta", time: "2h ago", emoji: "🍳" },
  { type: "cooked", text: "Marked Pasta Carbonara as cooked", time: "Yesterday", emoji: "✅" },
  { type: "added", text: "Added 6 items to grocery list", time: "Yesterday", emoji: "🛒" },
  { type: "planned", text: "Planned meals for the week", time: "2 days ago", emoji: "📅" },
  { type: "saved", text: "Saved Thai Green Curry", time: "3 days ago", emoji: "🍛" },
];

const MEAL_PLAN = [
  { day: "Mon", meal: "Pasta Carbonara", done: true },
  { day: "Tue", meal: "Thai Green Curry", done: true },
  { day: "Wed", meal: "Lemon Herb Salmon", done: false },
  { day: "Thu", meal: "—", done: false },
  { day: "Fri", meal: "BBQ Chicken Bowl", done: false },
];

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
  const { likedRecipes, likeRecipe, savedApiRecipes, pantryList, addCustomGroceryItem, cookingStreak, totalMealsCooked, cookedRecipeIds, totalXp, earnedBadges, earnBadge, chefAvatarUrl, setChefAvatarUrl } = useStore();
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);
  const [suggestionOffset, setSuggestionOffset] = useState(0);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingAvatar(true);
    try {
      const ext = file.name.split('.').pop();
      const fileName = `chef-avatar-${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from('recipe-photos').upload(fileName, file, { upsert: true });
      if (error) throw error;
      const { data: { publicUrl } } = supabase.storage.from('recipe-photos').getPublicUrl(fileName);
      setChefAvatarUrl(publicUrl);
      toast.success('Avatar updated!');
    } catch {
      toast.error('Failed to upload avatar');
    } finally {
      setUploadingAvatar(false);
    }
  };

  const BADGES = useMemo(() => [
    { id: 'first_cook', label: 'First Cook', emoji: '👨‍🍳', desc: 'Cook your first recipe', unlocked: totalMealsCooked >= 1 },
    { id: 'streak_3', label: '3-Day Streak', emoji: '🔥', desc: '3 consecutive days cooking', unlocked: cookingStreak >= 3 },
    { id: 'streak_7', label: 'Week Warrior', emoji: '⚡', desc: '7-day cooking streak', unlocked: cookingStreak >= 7 },
    { id: '5_recipes', label: '5 Recipes', emoji: '📖', desc: 'Cook 5 different recipes', unlocked: cookedRecipeIds.length >= 5 },
    { id: '10_meals', label: 'Meal Master', emoji: '🏆', desc: 'Cook 10 total meals', unlocked: totalMealsCooked >= 10 },
    { id: 'level_5', label: 'Level 5', emoji: '⭐', desc: 'Reach cooking level 5', unlocked: getLevel(totalXp).level >= 5 },
    { id: 'saver_10', label: 'Collector', emoji: '💎', desc: 'Save 10 recipes', unlocked: likedRecipes.length >= 10 },
    { id: 'level_10', label: 'Chef Pro', emoji: '👑', desc: 'Reach cooking level 10', unlocked: getLevel(totalXp).level >= 10 },
  ], [totalMealsCooked, cookingStreak, cookedRecipeIds.length, totalXp, likedRecipes.length]);

  // Auto-earn badges
  useEffect(() => {
    BADGES.forEach(b => {
      if (b.unlocked && !earnedBadges.includes(b.id)) {
        earnBadge(b.id);
        toast.success(`🏅 Badge unlocked: ${b.label}!`);
      }
    });
  }, [BADGES, earnedBadges, earnBadge]);

  const levelInfo = getLevel(totalXp);

  const likedSet = useMemo(() => new Set(likedRecipes), [likedRecipes]);
  const pantryNames = useMemo(() => pantryList.map(p => p.name), [pantryList]);
  const availableSuggestions = useMemo(() => browseRecipes.filter((recipe) => !likedSet.has(recipe.id)), [browseRecipes, likedSet]);
  const suggestedRecipes = useMemo(() => availableSuggestions.slice(suggestionOffset, suggestionOffset + 3), [availableSuggestions, suggestionOffset]);

  const stats = useMemo(() => [
    { label: "Cooking Streak", value: `${cookingStreak}🔥`, icon: Flame, color: "text-orange-500", bg: "bg-orange-50" },
    { label: "Meals Cooked", value: String(totalMealsCooked), icon: ChefHat, color: "text-emerald-500", bg: "bg-emerald-50" },
    { label: "Recipes Saved", value: String(likedRecipes.length), icon: Heart, color: "text-rose-500", bg: "bg-rose-50" },
    { label: "Recipes Curated", value: String(cookedRecipeIds.length), icon: Trophy, color: "text-amber-500", bg: "bg-amber-50" },
  ], [likedRecipes.length, cookingStreak, totalMealsCooked, cookedRecipeIds.length]);

  useEffect(() => {
    loadFeed();
  }, [loadFeed]);


  useEffect(() => {
    if (availableSuggestions.length === 0) {
      if (suggestionOffset !== 0) setSuggestionOffset(0);
      return;
    }
    if (suggestionOffset >= availableSuggestions.length) {
      setSuggestionOffset(Math.max(0, availableSuggestions.length - 3));
    }
  }, [availableSuggestions.length, suggestionOffset]);

  const handleDismissSuggestion = (recipeId: string) => {
    const idx = availableSuggestions.findIndex((recipe) => recipe.id === recipeId);
    if (idx === -1) return;
    const replacement = availableSuggestions[idx + 3];
    setSuggestionOffset((prev) => prev + 1);
    if (replacement) {
      toast.success(`Showing ${replacement.name} instead`);
    } else {
      toast.info('No more suggestions right now');
    }
  };

  const handleRefreshSuggestions = () => {
    if (availableSuggestions.length <= 3) {
      toast.info('No additional suggestions available yet');
      return;
    }
    const maxOffset = Math.max(0, availableSuggestions.length - 3);
    const nextOffset = Math.min(maxOffset, suggestionOffset + 3);
    if (nextOffset === suggestionOffset) {
      toast.info('You're already viewing the freshest set');
      return;
    }
    setSuggestionOffset(nextOffset);
  };

  useEffect(() => {
    async function loadProfile() {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        const { data } = await supabase
          .from('profiles')
          .select('display_name')
          .eq('user_id', session.user.id)
          .single();
        if (data?.display_name) setDisplayName(data.display_name);
      }
    }
    loadProfile();
  }, []);

  const handleSave = (recipe: Recipe) => {
    likeRecipe(recipe.id, recipe);
    toast.success(`Saved ${recipe.name}`);
  };

  const handleAddMissing = (recipe: Recipe) => {
    const match = calculateMatch(pantryNames, recipe.ingredients || []);
    if (match.missing.length === 0) { toast.info("You have all the ingredients!"); return; }
    match.missing.forEach(ing => addCustomGroceryItem(ing));
    toast.success(`Added ${match.missing.length} items to grocery list`);
  };

  const selectedMatch = selectedRecipe ? calculateMatch(pantryNames, selectedRecipe.ingredients || []) : null;

  const formatIngredientWithQuantity = (ingredient: string) => {
    const parsed = parseIngredientLine(ingredient);
    return parsed.quantity ? `${parsed.name} (${parsed.quantity})` : parsed.name;
  };

  return (
    <div className="min-h-full bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 px-6 py-5">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {greeting}{displayName ? `, ${displayName}` : ''} 👋
            </h1>
            <p className="text-sm text-gray-500 mt-0.5">Here's what's cooking this week</p>
          </div>
          <Link
            to="/swipe"
            className="hidden sm:flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition-colors shadow-sm"
          >
            <Sparkles size={15} />
            Find Recipes
          </Link>
        </div>
      </div>

      {/* Body */}
      <div className="max-w-7xl mx-auto px-6 py-6">
        {/* Stats row */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {stats.map(({ label, value, icon: Icon, color, bg }) => (
            <div key={label} className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm flex items-center gap-4">
              <div className={`w-11 h-11 rounded-xl ${bg} flex items-center justify-center shrink-0`}>
                <Icon size={20} className={color} />
              </div>
              <div>
                <div className="text-2xl font-bold text-gray-900 leading-none">{value}</div>
                <div className="text-xs text-gray-500 mt-1">{label}</div>
              </div>
            </div>
          ))}
        </div>



        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            {/* Suggested for you */}
            <section className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="flex items-center justify-between px-5 pt-5 pb-4">
                <div className="flex items-center gap-2">
                  <TrendingUp size={17} className="text-orange-500" />
                  <h2 className="text-base font-bold text-gray-900">Suggested for you</h2>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleRefreshSuggestions}
                    className="inline-flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-700 font-semibold px-2.5 py-1 rounded-md hover:bg-gray-100"
                    title="Show a fresh set of suggestions"
                  >
                    <RotateCw size={12} /> Fresh
                  </button>
                  <Link to="/swipe" className="text-xs text-orange-500 font-semibold hover:text-orange-600 flex items-center gap-1">
                    See all <ChevronRight size={13} />
                  </Link>
                </div>
              </div>

              {browseLoading ? (
                <div className="p-8 text-center text-sm text-gray-400">Loading suggestions...</div>
              ) : suggestedRecipes.length === 0 ? (
                <div className="p-8 text-center text-sm text-gray-400">
                  <Link to="/swipe" className="text-orange-500 hover:underline">Browse recipes</Link> to get personalized suggestions
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-gray-100">
                  {suggestedRecipes.map((recipe) => {
                    const match = calculateMatch(pantryNames, recipe.ingredients || []);
                    const isSaved = likedSet.has(recipe.id);
                    return (
                      <div
                        key={recipe.id}
                        className="p-4 hover:bg-gray-50 cursor-pointer transition-all group relative"
                        onClick={() => setSelectedRecipe(recipe)}
                      >
                        {/* Dismiss button */}
                        <button
                          onClick={(e) => { e.stopPropagation(); handleDismissSuggestion(recipe.id); }}
                          className="absolute top-3 left-3 w-7 h-7 rounded-full flex items-center justify-center transition-all z-10 bg-gray-100 text-gray-500 hover:bg-gray-200"
                          title="Show a different recipe"
                        >
                          <X size={14} />
                        </button>

                        {/* Save button */}
                        <button
                          onClick={(e) => { e.stopPropagation(); if (!isSaved) handleSave(recipe); }}
                          className={`absolute top-3 right-3 w-7 h-7 rounded-full flex items-center justify-center transition-all z-10 ${
                            isSaved
                              ? 'bg-green-100 text-green-600'
                              : 'bg-gray-100 text-gray-400 hover:bg-orange-100 hover:text-orange-500'
                          }`}
                          title={isSaved ? 'Saved' : 'Save recipe'}
                        >
                          {isSaved ? <Check size={14} /> : <Plus size={14} />}
                        </button>

                        {/* Image */}
                        {recipe.image && recipe.image !== '/placeholder.svg' ? (
                          <img src={recipe.image} alt={recipe.name} className="w-full h-24 object-cover rounded-lg mb-3" />
                        ) : (
                          <div className="w-full h-24 bg-gradient-to-br from-orange-100 to-pink-100 rounded-lg mb-3 flex items-center justify-center text-3xl">
                            🍽️
                          </div>
                        )}

                        <div className="text-sm font-semibold text-gray-900 mb-1 group-hover:text-orange-600 transition-colors line-clamp-2">
                          {recipe.name}
                        </div>
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-xs text-gray-500 flex items-center gap-1">
                            <Clock size={11} /> {recipe.cook_time}
                          </span>
                          <span className={`text-xs font-bold px-1.5 py-0.5 rounded-full ${
                            match.percentage >= 80 ? 'bg-green-100 text-green-700' : match.percentage >= 50 ? 'bg-yellow-100 text-yellow-700' : 'bg-orange-100 text-orange-700'
                          }`}>
                            {match.percentage}%
                          </span>
                        </div>
                        {recipe.cuisine && (
                          <span className="inline-block text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full font-medium">
                            {recipe.cuisine}
                          </span>
                        )}
                        {recipe.source && (
                          <span className="inline-block text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full font-medium mt-1">
                            Source: {recipe.source}
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </section>

            {/* This week's meal plan */}
            <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Calendar size={17} className="text-orange-500" />
                  <h2 className="text-base font-bold text-gray-900">This week</h2>
                </div>
                <Link to="/mealprep" className="text-xs text-orange-500 font-semibold hover:text-orange-600 flex items-center gap-1">
                  Meal Prep <ChevronRight size={13} />
                </Link>
              </div>
              <div className="space-y-2">
                {MEAL_PLAN.map(({ day, meal, done }) => (
                  <div key={day} className={`flex items-center gap-4 px-3 py-2.5 rounded-xl transition-colors ${done ? "bg-green-50" : "bg-gray-50 hover:bg-gray-100"}`}>
                    <div className={`text-xs font-bold w-8 shrink-0 ${done ? "text-green-600" : "text-gray-500"}`}>{day}</div>
                    <div className={`text-sm flex-1 ${done ? "text-gray-400 line-through" : "text-gray-800 font-medium"}`}>{meal}</div>
                    {!done && meal === "—" && (
                      <button className="text-xs text-orange-500 font-semibold hover:text-orange-600 flex items-center gap-1">
                        <Plus size={12} /> Add
                      </button>
                    )}
                    {done && <span className="text-xs text-green-500 font-semibold">Done</span>}
                  </div>
                ))}
              </div>
            </section>
          </div>

          {/* Right column */}
          <div className="space-y-6">
            <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <h2 className="text-base font-bold text-gray-900 mb-3">Quick actions</h2>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { label: "Find Recipe", to: "/swipe", emoji: "🔍" },
                  { label: "Add to Pantry", to: "/pantry", emoji: "📦" },
                  { label: "Grocery List", to: "/grocery", emoji: "🛒" },
                  { label: "Plan Meals 🧠", to: "/meal-prep", emoji: "📅" },
                ].map(({ label, to, emoji }) => (
                  <Link key={label} to={to} className="flex flex-col items-center gap-1.5 p-3 bg-gray-50 hover:bg-orange-50 rounded-xl transition-colors text-center group">
                    <span className="text-2xl">{emoji}</span>
                    <span className="text-xs font-semibold text-gray-600 group-hover:text-orange-600 transition-colors leading-tight">{label}</span>
                  </Link>
                ))}
              </div>
            </section>

            <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <h2 className="text-base font-bold text-gray-900 mb-4">Recent activity</h2>
              <div className="space-y-3">
                {ACTIVITY.map((item, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-xl bg-gray-50 flex items-center justify-center text-base shrink-0">{item.emoji}</div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs text-gray-800 font-medium leading-snug">{item.text}</p>
                      <p className="text-xs text-gray-400 mt-0.5">{item.time}</p>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </div>
        </div>

        {/* XP & Badges — at bottom */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-8">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <div className="flex items-center gap-3 mb-3">
              <button
                onClick={() => avatarInputRef.current?.click()}
                className="relative w-10 h-10 rounded-full bg-amber-50 overflow-hidden group shrink-0"
                title="Change avatar"
                disabled={uploadingAvatar}
              >
                <img src={chefAvatarUrl || defaultChefAvatar} alt="Chef" className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <Camera size={14} className="text-white" />
                </div>
              </button>
              <input ref={avatarInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} />
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <Star size={15} className="text-amber-500 fill-amber-500" />
                  <h2 className="text-base font-bold text-gray-900">Cooking XP</h2>
                  <span className="ml-auto text-sm font-bold text-amber-600">Level {levelInfo.level}</span>
                </div>
              </div>
            </div>
            <div className="relative h-3 bg-gray-100 rounded-full overflow-hidden mb-2">
              <motion.div
                className="absolute inset-y-0 left-0 bg-gradient-to-r from-amber-400 to-amber-500 rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${(levelInfo.current / levelInfo.needed) * 100}%` }}
                transition={{ type: 'spring', stiffness: 80 }}
              />
            </div>
            <div className="flex justify-between text-xs text-gray-500">
              <span>{totalXp} total XP</span>
              <span>{levelInfo.current}/{levelInfo.needed} to next level</span>
            </div>
          </div>
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <div className="flex items-center gap-2 mb-3">
              <Award size={17} className="text-violet-500" />
              <h2 className="text-base font-bold text-gray-900">Badges</h2>
              <span className="ml-auto text-xs text-gray-400 font-semibold">
                {BADGES.filter(b => b.unlocked).length}/{BADGES.length}
              </span>
            </div>
            <div className="grid grid-cols-4 gap-2">
              {BADGES.map(b => (
                <div
                  key={b.id}
                  className={`relative flex flex-col items-center gap-1 p-2 rounded-xl transition-all ${
                    b.unlocked ? 'bg-amber-50' : 'bg-gray-50 opacity-40 grayscale'
                  }`}
                >
                  <div className="absolute top-1 right-1 group cursor-help z-30">
                    <div className="w-3.5 h-3.5 rounded-full bg-gray-200 text-gray-500 flex items-center justify-center text-[8px] font-bold leading-none">i</div>
                    <div className="absolute z-50 bottom-full right-0 mb-1 hidden group-hover:block w-32 p-1.5 bg-gray-800 text-white text-[10px] rounded-lg shadow-lg leading-snug">
                      {b.desc}
                    </div>
                  </div>
                  <span className="text-xl">{b.emoji}</span>
                  <span className="text-[10px] font-semibold text-gray-700 text-center leading-tight">{b.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Recipe Detail Dialog */}
      <Dialog open={!!selectedRecipe} onOpenChange={() => setSelectedRecipe(null)}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-hidden flex flex-col">
          {selectedRecipe && selectedMatch && (
            <>
              <DialogHeader>
                <DialogTitle className="text-lg font-bold">{selectedRecipe.name}</DialogTitle>
              </DialogHeader>
              <ScrollArea className="flex-1 min-h-0">
                <div className="space-y-4 pr-2">
                  {selectedRecipe.image && selectedRecipe.image !== '/placeholder.svg' && (
                    <img src={selectedRecipe.image} alt={selectedRecipe.name} className="w-full h-40 object-cover rounded-xl" />
                  )}

                  <div className="flex flex-wrap gap-2">
                    <Badge variant="secondary" className="gap-1"><Clock className="h-3 w-3" /> {selectedRecipe.cook_time}</Badge>
                    <Badge variant="secondary">{selectedRecipe.difficulty}</Badge>
                    <Badge variant="outline" className="font-bold">{selectedMatch.percentage}% match</Badge>
                    {selectedRecipe.cuisine && <Badge variant="outline" className="gap-1"><MapPin className="h-3 w-3" /> {selectedRecipe.cuisine}</Badge>}
                    {selectedRecipe.servings && <Badge variant="secondary" className="gap-1"><Users className="h-3 w-3" /> Serves {selectedRecipe.servings}</Badge>}
                    {selectedRecipe.source && <Badge variant="outline">Source: {selectedRecipe.source}</Badge>}
                  </div>

                  {/* Ingredients */}
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Ingredients</p>
                    <div className="flex flex-wrap gap-1.5">
                      {selectedMatch.matched.map(ing => (
                        <span key={ing} className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-green-100 text-green-700 font-medium">
                          <Check className="h-3 w-3" />{formatIngredientWithQuantity(ing)}
                        </span>
                      ))}
                      {selectedMatch.missing.map(ing => (
                        <span key={ing} className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-red-50 text-red-600 font-medium">
                          <ShoppingCart className="h-3 w-3" />{formatIngredientWithQuantity(ing)}
                        </span>
                      ))}
                    </div>
                    {selectedMatch.missing.length > 0 && (
                      <button
                        onClick={() => handleAddMissing(selectedRecipe)}
                        className="mt-2 text-xs text-orange-500 hover:text-orange-600 font-semibold flex items-center gap-1"
                      >
                        <ShoppingCart size={12} /> Add {selectedMatch.missing.length} to grocery list
                      </button>
                    )}
                  </div>

                  {/* Instructions */}
                  {(selectedRecipe.instructions || []).length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Instructions</p>
                      <ol className="space-y-2">
                        {selectedRecipe.instructions
                          .map((step) => String(step || "").replace(/^step\s*\d+\s*[:.)-]?\s*/i, "").replace(/^\d+\s*[:.)-]\s*/, "").trim())
                          .filter((step) => step.length > 0)
                          .map((step, i) => (
                            <li key={i} className="flex gap-2 text-sm text-foreground">
                              <span className="flex-shrink-0 h-5 w-5 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center font-bold">{i + 1}</span>
                              {step}
                            </li>
                          ))}
                      </ol>
                    </div>
                  )}

                  {/* Save button */}
                  {!likedSet.has(selectedRecipe.id) && (
                    <button
                      onClick={() => { handleSave(selectedRecipe); setSelectedRecipe(null); }}
                      className="w-full flex items-center justify-center gap-2 bg-orange-500 hover:bg-orange-600 text-white font-bold py-3 rounded-xl transition-colors"
                    >
                      <Heart size={18} /> Save Recipe
                    </button>
                  )}
                </div>
              </ScrollArea>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
