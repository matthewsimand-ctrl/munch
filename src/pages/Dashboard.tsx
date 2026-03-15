import { useState, useEffect, useMemo, useRef } from "react";
import {
  Flame, Clock, Heart, ShoppingCart, ChevronRight,
  Calendar, Star, Plus, Check, Users, MapPin, X, RotateCw,
  Trophy, ChefHat, Zap, Award, Camera, Sparkles, TrendingUp, Play, Beef, Wheat, Droplets, Bell, CheckCheck,
  Settings,
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
import { getConsumedNutritionSummary } from "@/lib/consumedNutrition";
import { useNotifications } from "@/hooks/useNotifications";
import { useIsMobile } from "@/hooks/use-mobile";

const WEEK_DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const MEAL_PREP_TYPES = new Set(["Breakfast", "Lunch", "Dinner"]);
const AVATAR_SKIN_TONES = ["#F9D7C0", "#F2C3A2", "#D9A07B", "#A86D49", "#6D4431"];
const AVATAR_HAIR_COLORS = ["#2B1D16", "#5B3B2A", "#8A5A3C", "#C47D3D", "#D9DDE6"];
const AVATAR_OUTFIT_COLORS = ["#EA580C", "#2563EB", "#0F766E", "#7C3AED", "#BE123C"];
const AVATAR_BACKGROUND_COLORS = ["#FFF3E4", "#FDE68A", "#DBEAFE", "#DCFCE7", "#F5D0FE"];
const AVATAR_APPEARANCE_OPTIONS = [
  { value: "androgynous", label: "Balanced" },
  { value: "feminine", label: "Soft" },
  { value: "masculine", label: "Bold" },
] as const;
const AVATAR_HAIR_OPTIONS = [
  { value: "crop", label: "Crop" },
  { value: "waves", label: "Waves" },
  { value: "taper", label: "Taper" },
  { value: "long", label: "Long" },
] as const;
const AVATAR_ACCESSORY_OPTIONS = [
  { value: "none", label: "Clean" },
  { value: "glasses", label: "Glasses" },
  { value: "chef-hat", label: "Chef Hat" },
] as const;
const AVATAR_STARTERS = [
  {
    label: "Classic",
    appearance: "androgynous",
    skinTone: "#F2C3A2",
    hair: "crop",
    hairColor: "#3F2A1D",
    shirtColor: "#EA580C",
    backgroundColor: "#FFF3E4",
    accessory: "none",
  },
  {
    label: "Weekend",
    appearance: "feminine",
    skinTone: "#D9A07B",
    hair: "waves",
    hairColor: "#2B1D16",
    shirtColor: "#0F766E",
    backgroundColor: "#DCFCE7",
    accessory: "glasses",
  },
  {
    label: "Studio",
    appearance: "masculine",
    skinTone: "#F9D7C0",
    hair: "taper",
    hairColor: "#5B3B2A",
    shirtColor: "#2563EB",
    backgroundColor: "#DBEAFE",
    accessory: "none",
  },
  {
    label: "Chef",
    appearance: "feminine",
    skinTone: "#A86D49",
    hair: "long",
    hairColor: "#2B1D16",
    shirtColor: "#BE123C",
    backgroundColor: "#FDE68A",
    accessory: "chef-hat",
  },
] as const;

type AvatarAppearance = typeof AVATAR_APPEARANCE_OPTIONS[number]["value"];
type AvatarHairStyle = typeof AVATAR_HAIR_OPTIONS[number]["value"];
type AvatarAccessory = typeof AVATAR_ACCESSORY_OPTIONS[number]["value"];

function buildAvatarSvg({
  appearance,
  skinTone,
  hair,
  hairColor,
  shirtColor,
  backgroundColor,
  accessory,
}: {
  appearance: AvatarAppearance;
  skinTone: string;
  hair: AvatarHairStyle;
  hairColor: string;
  shirtColor: string;
  backgroundColor: string;
  accessory: AvatarAccessory;
}) {
  const faceRx = appearance === "feminine" ? 27 : appearance === "masculine" ? 29 : 28;
  const faceRy = appearance === "feminine" ? 31 : appearance === "masculine" ? 32.5 : 31.5;
  const chinPath = appearance === "feminine"
    ? "M52 46c-13 0-23 12-23 28 0 18 11 31 23 31s23-13 23-31c0-16-10-28-23-28Z"
    : appearance === "masculine"
      ? "M52 45c-14 0-25 12-25 29 0 19 11 33 25 33s25-14 25-33c0-17-11-29-25-29Z"
      : "M52 45.5c-13.5 0-24 12-24 28.5 0 18.5 11 32 24 32s24-13.5 24-32c0-16.5-10.5-28.5-24-28.5Z";
  const neckWidth = appearance === "masculine" ? 18 : appearance === "feminine" ? 14 : 16;
  const mouthPath = appearance === "feminine"
    ? "M44 87c4 3 12 3 16 0"
    : appearance === "masculine"
      ? "M45 87c3.5 2 10.5 2 14 0"
      : "M44.5 87c3.8 2.5 11.2 2.5 15 0";
  const browStroke = appearance === "feminine" ? 2.4 : appearance === "masculine" ? 3.1 : 2.7;
  const lipColor = appearance === "feminine" ? "#A94E67" : appearance === "masculine" ? "#704031" : "#8C4B3E";
  const jawShadow = appearance === "masculine" ? 0.18 : 0.12;
  const shoulderTop = appearance === "feminine" ? 114 : appearance === "masculine" ? 110 : 112;
  const jacketPath = appearance === "feminine"
    ? "M12 156c3-27 20-44 40-44 20 0 37 17 40 44H12Z"
    : appearance === "masculine"
      ? "M6 156c4-30 21-48 46-48s42 18 46 48H6Z"
      : "M10 156c4-28 21-46 42-46s38 18 42 46H10Z";
  const apronPath = appearance === "masculine"
    ? "M33 114h38l10 42H23l10-42Z"
    : "M35 116h34l9 40H26l9-40Z";
  const backgroundAccent = appearance === "feminine" ? "#FFFFFF" : appearance === "masculine" ? "#F8FAFC" : "#FFF7ED";

  const hairBack = hair === "crop"
    ? `<path d="M21 58c2-18 16-31 31-31s30 11 32 31v10H21Z" fill="url(#hairBase)" />`
    : hair === "waves"
      ? `<path d="M16 58c2-24 17-37 36-37s34 13 36 37v26H16Z" fill="url(#hairBase)" />`
      : hair === "taper"
        ? `<path d="M22 58c3-16 16-28 30-28 14 0 27 11 30 28v8H22Z" fill="url(#hairBase)" />`
        : `<path d="M15 58c2-24 17-38 37-38 20 0 35 14 37 38v40H15Z" fill="url(#hairBase)" />`;

  const hairFront = hair === "crop"
    ? `<path d="M24 56c5-14 16-22 28-22 12 0 23 8 28 22-4-3-8-4-13-4-4 0-8 1-12 4-3-3-7-4-12-4-6 0-11 2-19 4Z" fill="url(#hairDepth)" />`
    : hair === "waves"
      ? `<path d="M19 56c5-20 17-29 33-29 18 0 31 11 34 30-5-4-9-6-15-6-5 0-10 2-14 5-4-3-8-5-13-5-7 0-12 2-25 5Z" fill="url(#hairDepth)" /><path d="M21 62c3 9 9 16 16 18 5 1 9 0 15-4 5 4 10 5 15 4 7-2 13-9 16-18" fill="none" stroke="url(#hairShine)" stroke-width="5" stroke-linecap="round" opacity="0.75" />`
      : hair === "taper"
        ? `<path d="M25 54c6-12 16-18 27-18 11 0 21 6 27 18-5-2-9-3-13-3-5 0-9 1-14 4-4-3-8-4-13-4-4 0-8 1-14 3Z" fill="url(#hairDepth)" /><path d="M31 44c6-6 13-9 21-9 8 0 16 3 21 9" fill="none" stroke="url(#hairShine)" stroke-width="4" stroke-linecap="round" opacity="0.6" />`
        : `<path d="M18 56c6-20 18-30 34-30 18 0 32 11 35 31-4-4-9-6-15-6-6 0-10 2-14 6-4-4-8-6-14-6-6 0-11 2-26 5Z" fill="url(#hairDepth)" /><path d="M19 67c2 13 7 24 16 31" fill="none" stroke="url(#hairDepth)" stroke-width="7" stroke-linecap="round" opacity="0.92" /><path d="M85 67c-2 13-7 24-16 31" fill="none" stroke="url(#hairDepth)" stroke-width="7" stroke-linecap="round" opacity="0.92" />`;

  const accessoryMarkup = accessory === "glasses"
    ? `
      <rect x="31" y="67" width="16" height="12" rx="5" fill="rgba(255,255,255,0.14)" stroke="#2B211D" stroke-width="2.3" />
      <rect x="57" y="67" width="16" height="12" rx="5" fill="rgba(255,255,255,0.14)" stroke="#2B211D" stroke-width="2.3" />
      <path d="M47 73h10" stroke="#2B211D" stroke-width="2.3" stroke-linecap="round" />
      <path d="M31 72h-4M77 72h4" stroke="#2B211D" stroke-width="2" stroke-linecap="round" opacity="0.55" />
    `
    : accessory === "chef-hat"
      ? `
        <g transform="translate(0 -2)">
          <rect x="28" y="28" width="48" height="13" rx="5" fill="#FFFFFF" />
          <path d="M34 29c0-8 5-13 11-13 4 0 7 1 10 5 3-4 6-5 10-5 7 0 11 5 11 13" fill="#FFFFFF" />
          <path d="M30 36h44" stroke="#E7E5E4" stroke-width="2" />
        </g>
      `
      : "";

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 104 160">
    <defs>
      <linearGradient id="bgGrad" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="${backgroundColor}" />
        <stop offset="100%" stop-color="#FFFDF8" />
      </linearGradient>
      <linearGradient id="hairBase" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="${hairColor}" />
        <stop offset="100%" stop-color="#1C1917" />
      </linearGradient>
      <linearGradient id="hairDepth" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="${hairColor}" />
        <stop offset="100%" stop-color="#24140E" />
      </linearGradient>
      <linearGradient id="hairShine" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="#FFFFFF" stop-opacity="0.35" />
        <stop offset="100%" stop-color="#FFFFFF" stop-opacity="0" />
      </linearGradient>
      <linearGradient id="shirtGrad" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="${shirtColor}" />
        <stop offset="100%" stop-color="#1C1917" stop-opacity="0.34" />
      </linearGradient>
      <linearGradient id="apronGrad" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="#FFFDF9" />
        <stop offset="100%" stop-color="#F5EFE7" />
      </linearGradient>
      <radialGradient id="faceGrad" cx="40%" cy="28%" r="74%">
        <stop offset="0%" stop-color="${skinTone}" />
        <stop offset="100%" stop-color="#000000" stop-opacity="0.12" />
      </radialGradient>
      <radialGradient id="skinWarmth" cx="50%" cy="70%" r="70%">
        <stop offset="0%" stop-color="#FFFFFF" stop-opacity="0.04" />
        <stop offset="100%" stop-color="#A05538" stop-opacity="0.12" />
      </radialGradient>
    </defs>
    <rect width="104" height="160" rx="30" fill="url(#bgGrad)" />
    <rect x="10" y="10" width="84" height="140" rx="24" fill="${backgroundAccent}" opacity="0.24" />
    <path d="M0 126c18-10 35-15 52-15 19 0 36 5 52 15v34H0Z" fill="#FFFFFF" opacity="0.18" />
    <ellipse cx="52" cy="146" rx="28" ry="5" fill="#000000" opacity="0.045" />
    <path d="${jacketPath}" fill="url(#shirtGrad)" />
    <path d="${apronPath}" fill="url(#apronGrad)" opacity="0.94" />
    <path d="M${52 - neckWidth / 2} ${shoulderTop}h${neckWidth}v16h-${neckWidth}z" fill="url(#faceGrad)" opacity="0.96" />
    ${hairBack}
    <path d="${chinPath}" fill="url(#faceGrad)" />
    <ellipse cx="52" cy="76" rx="${faceRx}" ry="${faceRy}" fill="url(#skinWarmth)" />
    ${hairFront}
    <path d="M37 67c3-1.5 7-1.5 11 0" stroke="#3B2A20" stroke-width="${browStroke}" stroke-linecap="round" fill="none" opacity="0.8" />
    <path d="M56 67c3-1.5 7-1.5 11 0" stroke="#3B2A20" stroke-width="${browStroke}" stroke-linecap="round" fill="none" opacity="0.8" />
    <ellipse cx="42.5" cy="74" rx="2.6" ry="3.1" fill="#1C1917" />
    <ellipse cx="61.5" cy="74" rx="2.6" ry="3.1" fill="#1C1917" />
    <circle cx="41.8" cy="73.1" r="0.8" fill="#FFFFFF" opacity="0.92" />
    <circle cx="60.8" cy="73.1" r="0.8" fill="#FFFFFF" opacity="0.92" />
    <path d="M52 78v7" stroke="#A96547" stroke-width="1.4" stroke-linecap="round" opacity="0.5" />
    <path d="${mouthPath}" stroke="${lipColor}" stroke-width="2.2" stroke-linecap="round" fill="none" />
    <path d="M28 113c7 6 15 9 24 9s17-3 24-9" fill="none" stroke="#FFFFFF" stroke-width="1.4" opacity="0.18" />
    <path d="M28 116c7 5 15 8 24 8s17-3 24-8" fill="none" stroke="#000000" stroke-width="1.4" opacity="${jawShadow}" />
    ${accessoryMarkup}
  </svg>`;

  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

function formatRelative(timestamp: string) {
  const diffMs = Date.now() - new Date(timestamp).getTime();
  const diffMin = Math.max(1, Math.floor(diffMs / 60000));
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.floor(diffHr / 24);
  return `${diffDay}d ago`;
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
  const isMobile = useIsMobile();
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
    cachedNutrition,
    mealPlan, displayName: storeDisplayName
  } = useStore();

  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);
  const [suggestionOffset, setSuggestionOffset] = useState(0);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [avatarDialogOpen, setAvatarDialogOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [avatarAppearance, setAvatarAppearance] = useState<AvatarAppearance>("androgynous");
  const [avatarSkinTone, setAvatarSkinTone] = useState("#F5C9A9");
  const [avatarHair, setAvatarHair] = useState<AvatarHairStyle>("crop");
  const [avatarHairColor, setAvatarHairColor] = useState("#3F2A1D");
  const [avatarShirtColor, setAvatarShirtColor] = useState("#EA580C");
  const [avatarBackgroundColor, setAvatarBackgroundColor] = useState("#FFF3E4");
  const [avatarAccessory, setAvatarAccessory] = useState<AvatarAccessory>("none");
  const [avatarPhotoPreview, setAvatarPhotoPreview] = useState<string | null>(null);
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const { meal: currentPlannedMeal, loading: currentMealLoading } = useCurrentMealPlan();
  const { meals: cookedMeals, loading: cookedMealsLoading, estimateMealSavings } = useCookedMeals();
  const { notifications, unreadCount, loading: notificationsLoading, markAsRead, markAllAsRead } = useNotifications();
  const [estimatingMealId, setEstimatingMealId] = useState<string | null>(null);
  const nutritionSummary = useMemo(
    () => getConsumedNutritionSummary(cookedMeals, cachedNutrition),
    [cookedMeals, cachedNutrition],
  );

  const startCurrentPlannedMeal = () => {
    if (!currentPlannedMeal) return;

    const recipeId = currentPlannedMeal.recipe_id;
    const hasRecipeLocally = Boolean(savedApiRecipes[recipeId]);

    if (!hasRecipeLocally && currentPlannedMeal.recipe_data) {
      likeRecipe(recipeId, currentPlannedMeal.recipe_data);
    }

    const canStart = hasRecipeLocally || Boolean(currentPlannedMeal.recipe_data);
    if (!canStart) {
      toast.info("We couldn't load this planned recipe yet. Open Meal Prep and re-save it first.");
      return;
    }

    navigate(`/cook/${recipeId}`);
  };

  const buildCustomAvatar = () =>
    buildAvatarSvg({
      appearance: avatarAppearance,
      skinTone: avatarSkinTone,
      hair: avatarHair,
      hairColor: avatarHairColor,
      shirtColor: avatarShirtColor,
      backgroundColor: avatarBackgroundColor,
      accessory: avatarAccessory,
    });

  const applyAvatarStarter = (starter: typeof AVATAR_STARTERS[number]) => {
    setAvatarAppearance(starter.appearance);
    setAvatarSkinTone(starter.skinTone);
    setAvatarHair(starter.hair);
    setAvatarHairColor(starter.hairColor);
    setAvatarShirtColor(starter.shirtColor);
    setAvatarBackgroundColor(starter.backgroundColor);
    setAvatarAccessory(starter.accessory);
    setAvatarPhotoPreview(null);
  };

  const applyCustomAvatar = () => {
    setChefAvatarUrl(buildCustomAvatar());
    setAvatarPhotoPreview(null);
    setAvatarDialogOpen(false);
    toast.success("Custom avatar updated!");
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const localPreviewUrl = URL.createObjectURL(file);
    setAvatarPhotoPreview(localPreviewUrl);
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
      URL.revokeObjectURL(localPreviewUrl);
      setAvatarPhotoPreview(null);
      toast.error("Failed to upload avatar");
    } finally {
      setUploadingAvatar(false);
    }
  };

  useEffect(() => {
    return () => {
      if (avatarPhotoPreview?.startsWith("blob:")) {
        URL.revokeObjectURL(avatarPhotoPreview);
      }
    };
  }, [avatarPhotoPreview]);

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

  const handleOpenNotification = async (notification: typeof notifications[number]) => {
    try {
      if (!notification.read_at) {
        await markAsRead(notification.id);
      }

      setNotificationsOpen(false);

      if (notification.type === "kitchen_invite") {
        navigate("/kitchens");
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Could not open notification";
      toast.error(message);
    }
  };

  const handleMarkAllNotifications = async () => {
    try {
      await markAllAsRead();
      toast.success("Marked all notifications as read");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Could not update notifications";
      toast.error(message);
    }
  };

  const QUICK_ACTIONS = [
    { label: "Find Recipe", to: "/swipe", emoji: "🔍", color: "from-orange-50 to-amber-50" },
    { label: "Saved", to: "/saved", emoji: "❤️", color: "from-rose-50 to-orange-50" },
    { label: "Groceries", to: "/groceries", emoji: "🛒", color: "from-sky-50 to-blue-50" },
    { label: "Plan Meals", to: "/meal-prep", emoji: "📅", color: "from-violet-50 to-purple-50" },
    ...(isMobile ? [{ label: "Settings", to: "/settings", emoji: "⚙️", color: "from-stone-50 to-slate-100" }] : [{ label: "Add to Pantry", to: "/pantry", emoji: "📦", color: "from-emerald-50 to-teal-50" }]),
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
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 py-5 sm:py-6 flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold text-orange-400 uppercase tracking-widest mb-1">
              {new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
            </p>
            <h1
              data-tutorial="dashboard-greeting"
              className="text-xl sm:text-3xl font-bold text-stone-900 leading-tight"
              style={{ fontFamily: "'Fraunces', Georgia, serif" }}
            >
              {greeting}, <span className="text-orange-500">Chef {displayName || ""}</span> 👋
            </h1>
            <p className="text-xs sm:text-sm text-stone-500 mt-1">Here's what's cooking this week</p>
          </div>
          <div className="flex items-center gap-2 sm:gap-4">
            <button
              onClick={() => setNotificationsOpen(true)}
              className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-orange-200 bg-white/85 text-stone-700 shadow-sm transition-colors hover:bg-orange-50"
              aria-label="Open notifications"
            >
              <Bell size={18} />
              {unreadCount > 0 && (
                <span className="absolute -right-1 -top-1 inline-flex min-w-5 items-center justify-center rounded-full bg-orange-500 px-1.5 py-0.5 text-[10px] font-bold text-white">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
            </button>
            <button
              onClick={() => navigate("/settings")}
              className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-orange-200 bg-white/85 text-stone-700 shadow-sm transition-colors hover:bg-orange-50 md:hidden"
              aria-label="Open settings"
            >
              <Settings size={18} />
            </button>
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
              className="relative w-10 h-10 sm:w-12 sm:h-12 rounded-full overflow-hidden ring-2 ring-orange-200 ring-offset-2 group shrink-0"
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
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-5 sm:py-7 space-y-5 sm:space-y-7">

        {/* Stats */}
        <div className={`grid gap-3 ${isMobile ? "grid-cols-2" : "grid-cols-2 xl:grid-cols-4"}`} data-tutorial="dashboard-stats">
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
              {browseLoading ? (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
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
            <section className="rounded-2xl border p-4 sm:p-5" style={{ background: "#FFFFFF", borderColor: "rgba(0,0,0,0.07)", boxShadow: "0 2px 12px rgba(28,25,23,0.05)" }}>
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
                      onClick={startCurrentPlannedMeal}
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
              className="rounded-2xl border p-4 sm:p-5"
              style={{ background: "#FFFFFF", borderColor: "rgba(0,0,0,0.07)", boxShadow: "0 2px 12px rgba(28,25,23,0.05)" }}
            >
              <h2 className="text-[15px] font-bold text-stone-800 mb-3">Quick actions</h2>
              <div className="grid grid-cols-2 gap-2">
                {QUICK_ACTIONS.map(({ label, to, emoji, color }) => (
                  <Link key={label} to={to} className={`flex flex-col items-center gap-1.5 p-3 sm:p-4 rounded-xl bg-gradient-to-br ${color} hover:opacity-80 transition-all active:scale-95 text-center group`}>
                    <span className="text-xl sm:text-2xl">{emoji}</span>
                    <span className="text-xs font-semibold text-stone-600 group-hover:text-stone-800 leading-tight">{label}</span>
                  </Link>
                ))}
              </div>
            </section>

            {/* Cooked history */}
            <section className={`rounded-2xl border p-4 sm:p-5 ${isMobile ? "hidden" : ""}`} style={{ background: "#FFFFFF", borderColor: "rgba(0,0,0,0.07)", boxShadow: "0 2px 12px rgba(28,25,23,0.05)" }}>
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
            <section className={`rounded-2xl border p-4 sm:p-5 ${isMobile ? "hidden" : ""}`} style={{ background: "#FFFFFF", borderColor: "rgba(0,0,0,0.07)", boxShadow: "0 2px 12px rgba(28,25,23,0.05)" }}>
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

        {isPremium && !isMobile && (
          <section
            className="rounded-2xl border p-4 sm:p-5"
            style={{ background: "#FFFFFF", borderColor: "rgba(0,0,0,0.07)", boxShadow: "0 2px 12px rgba(28,25,23,0.05)" }}
          >
            <SectionHeader icon={Sparkles} title="Nutrition consumed" />
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
          </section>
        )}

        {/* Badges */}
        <section className={`rounded-2xl border p-4 sm:p-5 ${isMobile ? "hidden" : ""}`} style={{ background: "#FFFFFF", borderColor: "rgba(0,0,0,0.07)", boxShadow: "0 2px 12px rgba(28,25,23,0.05)" }}>
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
        <DialogContent className="max-h-[88vh] max-w-2xl overflow-hidden p-5">
          <DialogHeader>
            <DialogTitle>Customize your avatar</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 md:grid-cols-[0.9fr_1.1fr]">
            <div className="rounded-3xl border border-orange-100 bg-gradient-to-b from-orange-50/70 to-white p-4">
              <p className="text-xs font-bold uppercase tracking-[0.22em] text-orange-500">Live preview</p>
              <div className="mt-3 flex flex-col items-center rounded-[2rem] border border-white/80 bg-white/80 p-4 shadow-sm">
                <img
                  src={avatarPhotoPreview || buildCustomAvatar()}
                  alt="Custom avatar preview"
                  className="h-32 w-32 rounded-[1.75rem] border border-orange-100 bg-white object-cover shadow-sm"
                />
                <p className="mt-3 text-sm font-semibold text-stone-800">Chef profile avatar</p>
                <p className="mt-1 text-center text-xs leading-5 text-stone-500">
                  Pick a starter, fine-tune the details, or upload your own photo.
                </p>
              </div>

              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                {AVATAR_STARTERS.map((starter) => (
                  <button
                    key={starter.label}
                    type="button"
                    onClick={() => applyAvatarStarter(starter)}
                    className="flex items-center gap-3 rounded-2xl border border-stone-200 bg-white px-3 py-2.5 text-left transition-colors hover:border-orange-300 hover:bg-orange-50"
                  >
                    <img
                      src={buildAvatarSvg(starter)}
                      alt={`${starter.label} avatar starter`}
                      className="h-10 w-10 rounded-2xl border border-stone-100 bg-white"
                    />
                    <div>
                      <p className="text-sm font-semibold text-stone-800">{starter.label}</p>
                      <p className="text-[11px] text-stone-500">Load this look</p>
                    </div>
                  </button>
                ))}
              </div>

              <button
                onClick={() => avatarInputRef.current?.click()}
                className="mt-3 w-full rounded-2xl border border-orange-200 bg-white px-4 py-2.5 text-sm font-semibold text-orange-600 transition-colors hover:bg-orange-100"
                disabled={uploadingAvatar}
              >
                {uploadingAvatar ? "Uploading..." : avatarPhotoPreview ? "Replace photo" : "Upload your own photo"}
              </button>

              {avatarPhotoPreview && (
                <button
                  type="button"
                  onClick={() => setAvatarPhotoPreview(null)}
                  className="mt-2 w-full rounded-2xl border border-stone-200 bg-white px-4 py-2.5 text-sm font-semibold text-stone-600 transition-colors hover:border-orange-300 hover:text-orange-600"
                >
                  Return to avatar builder
                </button>
              )}

              <button
                onClick={applyCustomAvatar}
                className="mt-3 w-full rounded-2xl bg-orange-500 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-orange-600 disabled:opacity-60"
                disabled={Boolean(avatarPhotoPreview)}
              >
                Save this avatar
              </button>
            </div>

            <div className="max-h-[72vh] space-y-3 overflow-y-auto pr-1">
              <div className="rounded-3xl border border-stone-200 bg-white p-4">
                <p className="text-sm font-semibold text-stone-800">Appearance</p>
                <div className="mt-3 grid grid-cols-3 gap-2">
                  {AVATAR_APPEARANCE_OPTIONS.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => {
                        setAvatarAppearance(option.value);
                        setAvatarPhotoPreview(null);
                      }}
                      className={`rounded-2xl border px-3 py-2 text-xs font-semibold transition-colors ${
                        avatarAppearance === option.value
                          ? "border-orange-500 bg-orange-50 text-orange-600"
                          : "border-stone-200 bg-white text-stone-600 hover:border-orange-300"
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="rounded-3xl border border-stone-200 bg-white p-4">
                <p className="text-sm font-semibold text-stone-800">Style</p>
                <div className="mt-3 grid grid-cols-2 gap-2">
                  {AVATAR_HAIR_OPTIONS.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => {
                        setAvatarHair(option.value);
                        setAvatarPhotoPreview(null);
                      }}
                      className={`rounded-2xl border px-3 py-2 text-sm font-semibold transition-colors ${
                        avatarHair === option.value
                          ? "border-orange-500 bg-orange-50 text-orange-600"
                          : "border-stone-200 bg-white text-stone-600 hover:border-orange-300"
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="rounded-3xl border border-stone-200 bg-white p-4">
                <p className="text-sm font-semibold text-stone-800">Accessory</p>
                <div className="mt-3 grid grid-cols-3 gap-2">
                  {AVATAR_ACCESSORY_OPTIONS.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => {
                        setAvatarAccessory(option.value);
                        setAvatarPhotoPreview(null);
                      }}
                      className={`rounded-2xl border px-3 py-2 text-xs font-semibold transition-colors ${
                        avatarAccessory === option.value
                          ? "border-orange-500 bg-orange-50 text-orange-600"
                          : "border-stone-200 bg-white text-stone-600 hover:border-orange-300"
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="rounded-3xl border border-stone-200 bg-white p-4">
                <p className="text-sm font-semibold text-stone-800">Colors</p>
                <div className="mt-4 space-y-4">
                  {[
                    { label: "Skin tone", value: avatarSkinTone, options: AVATAR_SKIN_TONES, onSelect: setAvatarSkinTone },
                    { label: "Hair color", value: avatarHairColor, options: AVATAR_HAIR_COLORS, onSelect: setAvatarHairColor },
                    { label: "Outfit", value: avatarShirtColor, options: AVATAR_OUTFIT_COLORS, onSelect: setAvatarShirtColor },
                    { label: "Background", value: avatarBackgroundColor, options: AVATAR_BACKGROUND_COLORS, onSelect: setAvatarBackgroundColor },
                  ].map((group) => (
                    <div key={group.label}>
                      <p className="text-xs font-semibold uppercase tracking-wide text-stone-500">{group.label}</p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {group.options.map((option) => (
                          <button
                            key={option}
                            type="button"
                            onClick={() => {
                              group.onSelect(option);
                              setAvatarPhotoPreview(null);
                            }}
                            className={`h-9 w-9 rounded-full border-2 transition-transform hover:scale-105 ${
                              group.value === option ? "border-stone-900" : "border-white"
                            }`}
                            style={{ background: option, boxShadow: "0 1px 4px rgba(28,25,23,0.14)" }}
                            aria-label={`${group.label} ${option}`}
                          />
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={notificationsOpen} onOpenChange={setNotificationsOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between gap-3 pr-8">
              <span>Notifications</span>
              <button
                type="button"
                onClick={() => void handleMarkAllNotifications()}
                disabled={unreadCount === 0}
                className="inline-flex items-center gap-1.5 rounded-full border border-stone-200 px-3 py-1 text-xs font-semibold text-stone-600 disabled:opacity-50"
              >
                <CheckCheck className="h-3.5 w-3.5" />
                Mark all read
              </button>
            </DialogTitle>
          </DialogHeader>
          <div className="max-h-[60vh] space-y-3 overflow-y-auto pr-1">
            {notificationsLoading ? (
              <div className="rounded-2xl border border-dashed border-stone-200 px-4 py-8 text-center text-sm text-stone-400">
                Loading notifications...
              </div>
            ) : notifications.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-stone-200 px-4 py-10 text-center">
                <Bell className="mx-auto mb-3 h-8 w-8 text-stone-300" />
                <p className="text-sm font-semibold text-stone-600">No notifications yet</p>
                <p className="mt-1 text-xs text-stone-400">Kitchen invites and shared activity will show up here.</p>
              </div>
            ) : (
              notifications.map((notification) => (
                <button
                  key={notification.id}
                  onClick={() => void handleOpenNotification(notification)}
                  className={`w-full rounded-2xl border px-4 py-4 text-left transition-colors ${
                    notification.read_at ? "border-stone-200 bg-white" : "border-orange-200 bg-orange-50/70"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-stone-900">{notification.title}</p>
                      <p className="mt-1 text-sm text-stone-600">{notification.body}</p>
                      <p className="mt-2 text-xs text-stone-400">{formatRelative(notification.created_at)}</p>
                    </div>
                    {!notification.read_at && (
                      <span className="mt-1 inline-flex h-2.5 w-2.5 rounded-full bg-orange-500" />
                    )}
                  </div>
                </button>
              ))
            )}
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
