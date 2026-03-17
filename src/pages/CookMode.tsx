import { useState, useMemo, useEffect, useCallback, useRef } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft, ArrowRight, ChefHat, CheckCircle2, Circle, X,
  Volume2, VolumeX, RotateCcw, Check, Star, CircleHelp,
  Mic, MicOff, Timer, Pause, Play as PlayIcon, Zap
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useStore } from "@/lib/store";
import { useDbRecipes } from "@/hooks/useDbRecipes";
import { normalizeRecipe } from "@/lib/normalizeRecipe";
import { useSpeechSynthesis } from "@/hooks/useSpeechSynthesis";
import { toast } from "sonner";
import type { Recipe } from "@/data/recipes";
import { useVoiceCommands } from "@/hooks/useVoiceCommands";
import { getLevel } from "@/components/ChefCompanion";
import { buildDictionaryRegex, lookupTerm } from "@/lib/cookingDictionary";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useCookedMeals } from "@/hooks/useCookedMeals";
import { composeIngredientLine, parseIngredientLine, scaleIngredientQuantity } from "@/lib/ingredientText";
import { useKitchenPantry } from "@/hooks/useKitchenPantry";
import { applyRecipeImageFallback, getRecipeImageSrc } from "@/lib/recipeImage";

interface ActiveTimer {
  id: string;
  label: string;
  totalSeconds: number;
  remainingSeconds: number;
  isPaused: boolean;
  sourceStep: number;
}

/* ─── Helpers ──────────────────────────────────────────────── */
function cleanInstruction(raw: string): string {
  return String(raw || "")
    .replace(/^step\s*\d+\s*[:.)\-]?\s*/i, "")
    .replace(/^\d+\s*[:.)\-]\s*/, "")
    .trim();
}

const dictionaryRegex = buildDictionaryRegex();
const timerRegex = /\b(\d+(?:\.\d+)?)\s*(min|minute|minutes|hr|hour|hours|sec|second|seconds)\b/gi;
const XP_PER_STEP = 15;
const COMPLETION_BONUS_XP = 50;

function renderInstructionWithDefinitions(step: string, onTimerClick?: (seconds: number, label: string) => void) {
  // Combine both dictionary and timer matches
  const dictMatches = Array.from(step.matchAll(dictionaryRegex));
  const timeMatches = Array.from(step.matchAll(timerRegex));

  const allMatches = [
    ...dictMatches.map(m => ({ type: 'dict' as const, match: m })),
    ...timeMatches.map(m => ({ type: 'timer' as const, match: m }))
  ].sort((a, b) => (a.match.index ?? 0) - (b.match.index ?? 0));

  if (!allMatches.length) return step;

  const nodes: Array<JSX.Element | string> = [];
  let lastIndex = 0;

  allMatches.forEach(({ type, match }, index) => {
    const matchedText = match[0];
    const matchIndex = match.index ?? 0;

    // Handle overlapping matches – skip if this match starts before the previous one ended
    if (matchIndex < lastIndex) return;

    if (matchIndex > lastIndex) {
      nodes.push(step.slice(lastIndex, matchIndex));
    }

    if (type === 'dict') {
      const entry = lookupTerm(matchedText);
      if (!entry) {
        nodes.push(matchedText);
      } else {
        nodes.push(
          <span key={`dict-${matchedText}-${matchIndex}-${index}`} className="inline-flex items-baseline gap-1">
            <span className="rounded px-1 py-0.5 bg-orange-100 text-orange-700 font-semibold cursor-help">
              {matchedText}
            </span>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  data-tutorial="dictionary-term"
                  className="inline-flex items-center justify-center text-orange-500 hover:text-orange-600 transition-colors"
                  aria-label={`Definition for ${matchedText}`}
                >
                  <CircleHelp size={14} />
                </button>
              </TooltipTrigger>
              <TooltipContent className="max-w-xs shadow-xl border-orange-100">
                <p className="font-semibold text-xs text-orange-600 mb-1">{entry.term}</p>
                <p className="text-xs leading-relaxed">{entry.definition}</p>
              </TooltipContent>
            </Tooltip>
          </span>
        );
      }
    } else {
      // Timer match
      const amount = parseFloat(match[1]);
      const unit = match[2].toLowerCase();
      let seconds = 0;
      if (unit.startsWith('hr') || unit.startsWith('hour')) seconds = amount * 3600;
      else if (unit.startsWith('min')) seconds = amount * 60;
      else if (unit.startsWith('sec')) seconds = amount;

      nodes.push(
        <button
          key={`timer-${matchedText}-${matchIndex}-${index}`}
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onTimerClick?.(seconds, matchedText);
          }}
          className="inline-block border-b-2 border-dashed border-orange-400 text-orange-700 font-bold hover:bg-orange-50 px-0.5 transition-colors"
        >
          {matchedText}
        </button>
      );
    }

    lastIndex = matchIndex + matchedText.length;
  });

  if (lastIndex < step.length) {
    nodes.push(step.slice(lastIndex));
  }

  return nodes;
}

function formatTimerClock(seconds: number) {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

function StepTimerCard({
  label,
  totalSeconds,
  remainingSeconds,
  isActive,
  isPaused,
  onStart,
  onTogglePause,
  onEnd,
}: {
  label: string;
  totalSeconds: number;
  remainingSeconds?: number;
  isActive: boolean;
  isPaused: boolean;
  onStart: () => void;
  onTogglePause: () => void;
  onEnd: () => void;
}) {
  const seconds = isActive ? remainingSeconds ?? totalSeconds : totalSeconds;
  const safeTotal = Math.max(totalSeconds, 1);
  const progress = isActive ? Math.max(0, Math.min(1, seconds / safeTotal)) : 1;
  const radius = 24;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference * (1 - progress);
  const strokeDasharray = `${circumference * progress} ${circumference}`;
  const ringColor = isActive && seconds <= 10 ? "#DC2626" : "#F97316";

  return (
    <div
      className="rounded-2xl border px-4 py-4"
      style={{
        background: isActive ? "linear-gradient(135deg,rgba(255,247,237,0.95),#fff)" : "#fff",
        borderColor: isActive ? "rgba(249,115,22,0.28)" : "rgba(249,115,22,0.12)",
        boxShadow: isActive ? "0 10px 24px rgba(249,115,22,0.12)" : "0 4px 14px rgba(249,115,22,0.06)",
      }}
    >
      <div className="flex flex-col items-center text-center gap-3">
        <div
          className="w-10 h-10 rounded-2xl flex items-center justify-center shrink-0"
          style={{ background: "rgba(249,115,22,0.12)", color: "#EA580C" }}
        >
          <Timer size={18} />
        </div>

        <div className="min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-orange-400">
            {isActive ? "Timer Running" : "Detected Timer"}
          </p>
          <p className="text-sm font-bold text-stone-800">{label}</p>
        </div>

        <div className="relative w-20 h-20 shrink-0">
          <svg className="w-20 h-20 -rotate-90" viewBox="0 0 56 56" aria-hidden="true">
            <circle
              cx="28"
              cy="28"
              r={radius}
              fill="none"
              stroke="rgba(249,115,22,0.16)"
              strokeWidth="4"
            />
            <circle
              cx="28"
              cy="28"
              r={radius}
              fill="none"
              stroke={ringColor}
              strokeWidth="4"
              strokeLinecap="round"
              strokeDasharray={strokeDasharray}
              strokeDashoffset={strokeDashoffset}
              className="transition-[stroke-dashoffset] duration-1000 ease-linear"
            />
          </svg>

          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-sm font-black text-stone-900 leading-none" style={{ fontVariantNumeric: "tabular-nums" }}>
              {formatTimerClock(seconds)}
            </span>
          </div>
        </div>

      </div>

      <div className="mt-4 flex items-center justify-center gap-2">
        {isActive ? (
          <>
            <button
              type="button"
              onClick={onTogglePause}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-orange-100 text-orange-700 font-semibold text-xs hover:bg-orange-200 transition-colors"
            >
              {isPaused ? <PlayIcon size={14} fill="currentColor" /> : <Pause size={14} fill="currentColor" />}
              {isPaused ? "Resume" : "Pause"}
            </button>
            <button
              type="button"
              onClick={onEnd}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-stone-100 text-stone-600 font-semibold text-xs hover:bg-red-100 hover:text-red-600 transition-colors"
            >
              <X size={14} />
              End
            </button>
          </>
        ) : (
          <button
            type="button"
            onClick={onStart}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-orange-500 text-white font-semibold text-xs hover:opacity-90 transition-opacity"
            style={{ boxShadow: "0 8px 16px rgba(249,115,22,0.18)" }}
          >
            <PlayIcon size={14} fill="currentColor" />
            Start Timer
          </button>
        )}
      </div>
    </div>
  );
}

/* ─── Sub-components ───────────────────────────────────────── */
function CookingJourneyTrack({
  progress,
  emoji,
}: {
  progress: number;
  emoji: string;
}) {
  const clampedProgress = Math.min(progress, 1);

  return (
    <div className="relative w-full max-w-xs h-7 px-5">
      <div className="absolute left-5 right-5 top-1/2 -translate-y-1/2 h-1.5 rounded-full bg-orange-100" />
      <motion.div
        className="absolute left-5 top-1/2 -translate-y-1/2 h-1.5 rounded-full bg-gradient-to-r from-orange-300 to-orange-500"
        animate={{ width: `calc(${clampedProgress * 100}% * (100% - 2.5rem) / 100%)` }}
        transition={{ type: "spring", stiffness: 90, damping: 18 }}
        style={{ maxWidth: "calc(100% - 2.5rem)" }}
      />
      <span className="absolute left-0 top-1/2 -translate-y-1/2 text-sm">🍽️</span>
      <span className="absolute right-0 top-1/2 -translate-y-1/2 text-sm">🏁</span>
      <motion.span
        className="absolute top-1/2 -translate-y-1/2 text-base"
        animate={{ left: `calc(${clampedProgress * 100}% * (100% - 2.5rem) / 100% + 1rem)` }}
        transition={{ type: "spring", stiffness: 110, damping: 16 }}
      >
        {emoji}
      </motion.span>
    </div>
  );
}

function StepProgressHeader({
  total,
  current,
  progress,
  emoji,
}: {
  total: number;
  current: number;
  progress: number;
  emoji: string;
}) {
  const stepNumber = current + 1;

  return (
    <div className="flex items-center gap-4 text-xs font-semibold text-stone-400">
      <span className="shrink-0">Step {stepNumber} of {total}</span>
      <div className="flex-1 min-w-0 flex items-center justify-center">
        <CookingJourneyTrack progress={progress} emoji={emoji} />
      </div>
    </div>
  );
}

/* ─── Main ─────────────────────────────────────────────────── */
export default function CookMode() {
  const { id } = useParams<{ id: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const {
    savedApiRecipes,
    markRecipeCooked,
    rateRecipe,
    recipeRatings,
    totalXp,
    addXp,
    cookingStreak,
    pantryList,
    updatePantryItem,
    removePantryItem,
    activeKitchenId,
  } = useStore();
  const kitchenPantry = useKitchenPantry(activeKitchenId);
  const isKitchenMode = Boolean(activeKitchenId);
  const { data: dbRecipes = [] } = useDbRecipes();
  const { isSpeaking, speak, stop } = useSpeechSynthesis();
  const { trackCookedMeal } = useCookedMeals(1);

  const [flowState, setFlowState] = useState<'prep' | 'cooking'>('prep');
  const [stepIndex, setStepIndex] = useState(0);
  const [checkedIngredients, setCheckedIngredients] = useState<Set<number>>(new Set());
  const [ttsEnabled, setTtsEnabled] = useState(true);
  const [done, setDone] = useState(false);
  const [showIngredients, setShowIngredients] = useState(false);
  const [activeTimers, setActiveTimers] = useState<ActiveTimer[]>([]);
  const [earnedSessionXp, setEarnedSessionXp] = useState(0);
  const [xpPopup, setXpPopup] = useState<{ id: number; amount: number; label: string } | null>(null);
  const [pantryDecisionMade, setPantryDecisionMade] = useState(false);
  const [showAllStepsView, setShowAllStepsView] = useState(false);
  const [portionFactor, setPortionFactor] = useState<number>(() => {
    const candidate = (location.state as { portionFactor?: number } | null)?.portionFactor;
    return candidate === 0.5 || candidate === 1 || candidate === 2 ? candidate : 1;
  });
  const hasTrackedCookRef = useRef(false);
  const awardedStepsRef = useRef<Set<number>>(new Set());
  const awardedCompletionRef = useRef(false);

  /* ── Resolve recipe ── */
  const recipe = useMemo<Recipe | null>(() => {
    if (!id) return null;
    const dbRec = dbRecipes.find((r) => r.id === id);
    if (dbRec) return normalizeRecipe(dbRec, id);
    const apiRec = savedApiRecipes[id];
    if (apiRec) return normalizeRecipe(apiRec, id);
    return null;
  }, [id, dbRecipes, savedApiRecipes]);

  const steps = useMemo<string[]>(
    () => (recipe?.instructions ?? []).map(cleanInstruction).filter(Boolean),
    [recipe],
  );
  const ingredients = recipe?.ingredients ?? [];
  const scaledIngredients = useMemo(
    () => ingredients.map((ingredient) => {
      if (portionFactor === 1) return ingredient;
      const parts = parseIngredientLine(ingredient);
      if (!parts.quantity) return ingredient;
      return composeIngredientLine({
        ...parts,
        quantity: scaleIngredientQuantity(parts.quantity, portionFactor),
      });
    }),
    [ingredients, portionFactor],
  );
  const isLastStep = stepIndex === steps.length - 1;
  const sessionXp = Math.max(0, (steps.length - 1) * 15) + 50;
  const currentRating = recipe && id ? recipeRatings[id] ?? 0 : 0;
  const levelInfo = getLevel(totalXp);
  const headerProgress = steps.length > 1 ? stepIndex / (steps.length - 1) : 0;
  const headerChefEmoji = useMemo(() => {
    if (done) return "🎉";
    if (activeTimers.length > 0) return "⏳";
    const progress = stepIndex / Math.max(steps.length - 1, 1);
    if (progress < 0.2) return "👨‍🍳";
    if (progress < 0.45) return "🔪";
    if (progress < 0.7) return "🥘";
    if (progress < 0.95) return "🍳";
    return "😋";
  }, [activeTimers.length, done, stepIndex, steps.length]);
  const pantryItemsToUse = useMemo(() => {
    const availablePantryItems = isKitchenMode
      ? kitchenPantry.items.map((item) => ({ ...item, category: item.category ?? undefined }))
      : pantryList;
    const recipeIngredientNames = ingredients
      .map((ingredient) => parseIngredientLine(ingredient).name.toLowerCase().trim())
      .filter(Boolean);

    return availablePantryItems.filter((item) => {
      const pantryName = item.name.toLowerCase().trim();
      return recipeIngredientNames.some((ingredient) =>
        ingredient.includes(pantryName) || pantryName.includes(ingredient)
      );
    });
  }, [ingredients, isKitchenMode, kitchenPantry.items, pantryList]);

  const awardXp = useCallback((amount: number, label: string) => {
    addXp(amount);
    setEarnedSessionXp((prev) => prev + amount);
    setXpPopup({ id: Date.now() + amount, amount, label });
  }, [addXp]);

  /* ── TTS: speak is ONLY called from button click handlers ──
     Never put speak() in a useEffect — browsers block speech
     that isn't triggered by a direct user gesture.           */

  const handleToggleTts = useCallback(() => {
    if (isSpeaking) {
      stop();
    } else if (!ttsEnabled && steps[stepIndex]) {
      // User turned TTS ON: start speaking immediately as authorized by this click
      speak(steps[stepIndex]);
    }
    setTtsEnabled((v) => !v);
  }, [isSpeaking, stop, ttsEnabled, speak, steps, stepIndex]);

  const handleReadStep = useCallback(() => {
    // Direct user click — always allowed
    if (isSpeaking) {
      stop();
    } else if (steps[stepIndex]) {
      speak(steps[stepIndex]);
    }
  }, [isSpeaking, stop, speak, steps, stepIndex]);

  const goNext = useCallback(() => {
    stop(); // stop current speech
    if (isLastStep) {
      setDone(true);
      if (!hasTrackedCookRef.current) {
        hasTrackedCookRef.current = true;
        markRecipeCooked?.(id!);
        void trackCookedMeal({
          recipeId: id!,
          recipeName: recipe.name,
          cookTime: recipe.cook_time,
          ingredientCount: ingredients.length,
        });
      }
      return;
    }
    const next = stepIndex + 1;
    setStepIndex(next);
    // Auto-read next step only if TTS is enabled AND this is a user gesture (it is — button click)
    if (ttsEnabled && steps[next]) {
      speak(steps[next]);
    }
  }, [stop, isLastStep, stepIndex, ttsEnabled, steps, speak, markRecipeCooked, id, trackCookedMeal, recipe?.name, recipe?.cook_time, ingredients.length]);

  const goPrev = useCallback(() => {
    stop();
    const prev = Math.max(0, stepIndex - 1);
    setStepIndex(prev);
    if (ttsEnabled && steps[prev]) {
      speak(steps[prev]);
    }
  }, [stop, stepIndex, ttsEnabled, steps, speak]);

  const handleStart = useCallback(() => {
    // Called from "Let's Cook" button — user gesture, TTS allowed
    setFlowState('cooking');
    if (ttsEnabled && steps[0]) {
      speak(steps[0]);
    }
  }, [ttsEnabled, steps, speak]);

  useEffect(() => {
    hasTrackedCookRef.current = false;
    awardedStepsRef.current = new Set();
    awardedCompletionRef.current = false;
    setEarnedSessionXp(0);
    setXpPopup(null);
    setPantryDecisionMade(false);
  }, [id]);

  const handlePantryUseConfirmed = useCallback(() => {
    if (pantryDecisionMade || pantryItemsToUse.length === 0) return;

    pantryItemsToUse.forEach((item) => {
      const quantityNumber = Number.parseFloat(item.quantity || "");
      if (Number.isFinite(quantityNumber) && quantityNumber > 1) {
        if (isKitchenMode) {
          void kitchenPantry.updateItem(item.id, { quantity: String(quantityNumber - 1) });
        } else {
          updatePantryItem(item.id, { quantity: String(quantityNumber - 1) });
        }
      } else {
        if (isKitchenMode) {
          void kitchenPantry.removeItem(item.id);
        } else {
          removePantryItem(item.id);
        }
      }
    });

    setPantryDecisionMade(true);
    toast.success("Pantry updated after cooking");
  }, [isKitchenMode, kitchenPantry, pantryDecisionMade, pantryItemsToUse, removePantryItem, updatePantryItem]);

  useEffect(() => {
    if (stepIndex <= 0) return;
    if (awardedStepsRef.current.has(stepIndex)) return;

    awardedStepsRef.current.add(stepIndex);
    awardXp(XP_PER_STEP, `Step ${stepIndex + 1} complete`);
  }, [awardXp, stepIndex]);

  useEffect(() => {
    if (!done || awardedCompletionRef.current) return;

    awardedCompletionRef.current = true;
    awardXp(COMPLETION_BONUS_XP, "Recipe complete");
  }, [awardXp, done]);

  useEffect(() => {
    if (!xpPopup) return;
    const timeout = window.setTimeout(() => setXpPopup(null), 1400);
    return () => window.clearTimeout(timeout);
  }, [xpPopup]);

  useEffect(() => {
    if (activeTimers.length === 0) return;

    const hasRunningTimer = activeTimers.some((timer) => !timer.isPaused);
    if (!hasRunningTimer) return;

    const interval = setTimeout(() => {
      const completedLabels: string[] = [];

      setActiveTimers((prev) => prev.flatMap((timer) => {
        if (timer.isPaused) return [timer];

        if (timer.remainingSeconds <= 1) {
          completedLabels.push(timer.label);
          return [];
        }

        return [{
          ...timer,
          remainingSeconds: timer.remainingSeconds - 1,
        }];
      }));

      completedLabels.forEach((label) => {
        toast.success(`${label} done! ⏱️`);
        speak(`${label} timer is done!`);
      });
    }, 1000);

    return () => clearTimeout(interval);
  }, [activeTimers, speak]);

  /* ── Auto-Detect Timers ── */
  const detectedTimers = useMemo(() => {
    const step = steps[stepIndex] || "";
    const timers: { label: string, seconds: number }[] = [];
    let match;
    const seen = new Set<string>();

    // Reset regex index for safety
    timerRegex.lastIndex = 0;
    while ((match = timerRegex.exec(step)) !== null) {
      const amount = parseFloat(match[1]);
      const unit = match[2].toLowerCase();
      let seconds = 0;
      if (unit.startsWith('hr') || unit.startsWith('hour')) seconds = amount * 3600;
      else if (unit.startsWith('min')) seconds = amount * 60;
      else if (unit.startsWith('sec')) seconds = amount;

      const label = match[0].toLowerCase();
      if (seconds > 0 && !seen.has(label)) {
        timers.push({ label: match[0], seconds });
        seen.add(label);
      }
    }
    return timers;
  }, [steps, stepIndex]);

  const buildTimerId = useCallback((sourceStep: number, label: string) => `${sourceStep}:${label.toLowerCase()}`, []);

  const upsertTimer = useCallback((sourceStep: number, label: string, totalSeconds: number, remainingSeconds = totalSeconds) => {
    const timerId = buildTimerId(sourceStep, label);

    setActiveTimers((prev) => {
      const existingIndex = prev.findIndex((timer) => timer.id === timerId);
      const nextTimer: ActiveTimer = {
        id: timerId,
        label,
        totalSeconds,
        remainingSeconds,
        isPaused: false,
        sourceStep,
      };

      if (existingIndex === -1) {
        return [...prev, nextTimer];
      }

      const next = [...prev];
      next[existingIndex] = nextTimer;
      return next;
    });
  }, [buildTimerId]);

  const currentStepActiveTimers = useMemo(
    () => activeTimers.filter((timer) => timer.sourceStep === stepIndex),
    [activeTimers, stepIndex],
  );

  const detachedActiveTimers = useMemo(
    () => activeTimers.filter((timer) => timer.sourceStep !== stepIndex),
    [activeTimers, stepIndex],
  );

  const mostRecentActiveTimer = activeTimers[activeTimers.length - 1] ?? null;

  const resolveVoiceTimerTarget = useCallback((seconds?: number) => {
    if (typeof seconds === "number" && seconds > 0) {
      const matchedTimer = detectedTimers.find((timer) => timer.seconds === seconds);
      return matchedTimer
        ? { seconds: matchedTimer.seconds, label: matchedTimer.label, sourceStep: stepIndex }
        : { seconds, label: `${Math.round(seconds / 60)} min`, sourceStep: stepIndex };
    }

    const pausedCurrentStepTimer = currentStepActiveTimers.find((timer) => timer.isPaused);
    if (pausedCurrentStepTimer) {
      return {
        seconds: pausedCurrentStepTimer.totalSeconds,
        label: pausedCurrentStepTimer.label,
        sourceStep: pausedCurrentStepTimer.sourceStep,
        remainingSeconds: pausedCurrentStepTimer.remainingSeconds,
      };
    }

    if (detectedTimers.length > 0) {
      return { ...detectedTimers[0], sourceStep: stepIndex };
    }

    if (mostRecentActiveTimer) {
      return {
        seconds: mostRecentActiveTimer.totalSeconds,
        label: mostRecentActiveTimer.label,
        sourceStep: mostRecentActiveTimer.sourceStep,
        remainingSeconds: mostRecentActiveTimer.remainingSeconds,
      };
    }

    return null;
  }, [currentStepActiveTimers, detectedTimers, mostRecentActiveTimer, stepIndex]);

  const {
    isListening, lastCommand, commandStatus, error, toggleListening
  } = useVoiceCommands({
    onNext: goNext,
    onPrevious: goPrev,
    onRepeat: handleReadStep,
    onStartTimer: (seconds) => {
      const targetTimer = resolveVoiceTimerTarget(seconds);
      if (!targetTimer) {
        return false;
      }

      upsertTimer(
        targetTimer.sourceStep,
        targetTimer.label,
        targetTimer.seconds,
        targetTimer.remainingSeconds ?? targetTimer.seconds,
      );
      return true;
    },
    onPauseTimer: () => {
      if (!mostRecentActiveTimer) return;
      setActiveTimers((prev) => prev.map((timer) => timer.id === mostRecentActiveTimer.id ? { ...timer, isPaused: true } : timer));
    },
    onStopTimer: () => {
      if (!mostRecentActiveTimer) return;
      setActiveTimers((prev) => prev.filter((timer) => timer.id !== mostRecentActiveTimer.id));
    },
  });

  useEffect(() => {
    if (error) toast.error(error);
  }, [error]);

  /* ── Keyboard nav ── */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight" || e.key === "ArrowDown") { e.preventDefault(); goNext(); }
      if (e.key === "ArrowLeft" || e.key === "ArrowUp") { e.preventDefault(); goPrev(); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [goNext, goPrev]);

  const handleStartTimer = useCallback((seconds: number, label: string) => {
    upsertTimer(stepIndex, label, seconds);
    toast.success(`Timer set for ${label}`);
  }, [stepIndex, upsertTimer]);

  const isDetectedTimerActive = useCallback((timer: { label: string; seconds: number }) => {
    const timerId = buildTimerId(stepIndex, timer.label);
    return activeTimers.some((activeTimer) => activeTimer.id === timerId);
  }, [activeTimers, buildTimerId, stepIndex]);

  if (!recipe) {
    return (
      <div className="min-h-full flex items-center justify-center" style={{ background: "#FFFAF5" }}>
        <div className="text-center">
          <p className="text-stone-500 mb-4">Recipe not found</p>
          <button onClick={() => navigate("/let-me-cook")} className="px-4 py-2 rounded-xl bg-orange-500 text-white text-sm font-semibold">
            Back to recipes
          </button>
        </div>
      </div>
    );
  }

  if (steps.length === 0) {
    return (
      <div className="min-h-full flex items-center justify-center" style={{ background: "#FFFAF5" }}>
        <div className="text-center max-w-sm">
          <div className="w-16 h-16 rounded-2xl bg-orange-50 flex items-center justify-center text-3xl mx-auto mb-4">🍳</div>
          <p className="font-bold text-stone-800 mb-2" style={{ fontFamily: "'Fraunces', Georgia, serif" }}>No instructions available</p>
          <p className="text-sm text-stone-400 mb-5">This recipe doesn't have step-by-step instructions yet.</p>
          <button onClick={() => navigate(-1)} className="px-4 py-2 rounded-xl bg-orange-500 text-white text-sm font-semibold">Go back</button>
        </div>
      </div>
    );
  }

  // Prep Screen (Mise en place)
  if (flowState === 'prep') {
    const allChecked = Array.from({ length: ingredients.length }).every((_, i) => checkedIngredients.has(i));

    return (
      <div className="min-h-full flex flex-col" style={{ background: "#FFFAF5", fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif" }}>
        {/* Simple Top Bar */}
        <div className="border-b px-6 py-4 flex items-center justify-between" style={{ background: "linear-gradient(135deg,#FFF7ED 0%,#FFFAF5 100%)", borderColor: "rgba(249,115,22,0.12)" }}>
          <button onClick={() => navigate(-1)} className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white border border-stone-200 text-xs font-semibold text-stone-600 hover:border-orange-300 transition-colors">
            <ArrowLeft size={13} /> Back
          </button>
          <div className="text-center">
            <p className="text-[10px] font-bold text-orange-400 uppercase tracking-widest">Mise en Place</p>
            <p className="text-sm font-bold text-stone-800" style={{ fontFamily: "'Fraunces', Georgia, serif" }}>Prepare Your Ingredients</p>
          </div>
          <div className="w-[60px]" /> {/* Spacer */}
        </div>

        <div className="flex-1 max-w-2xl mx-auto w-full px-6 py-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-[32px] border border-stone-100 overflow-hidden shadow-[0_20px_48px_rgba(249,115,22,0.08)] mb-8"
          >
            <div className="relative w-full aspect-[16/9] overflow-hidden">
              <img
                src={getRecipeImageSrc(recipe.image)}
                alt={recipe.name}
                className="w-full h-full object-cover"
                onError={applyRecipeImageFallback}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent" />
              <div className="absolute bottom-4 left-6 right-6">
                <h2
                  className="text-xl font-bold text-white drop-shadow-md"
                  style={{ fontFamily: "'Fraunces', Georgia, serif" }}
                >
                  {recipe.name}
                </h2>
                {(recipe.cook_time || recipe.difficulty) && (
                  <p className="text-sm text-white/90 mt-0.5">
                    {[recipe.cook_time, recipe.difficulty].filter(Boolean).join(" · ")}
                  </p>
                )}
              </div>
            </div>
            <div className="px-8 pt-6 pb-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-stone-900" style={{ fontFamily: "'Fraunces', Georgia, serif" }}>Ingredients Needed</h2>
              <div className="flex items-center gap-3">
                <div className="inline-flex rounded-xl border border-stone-200 bg-white p-1 gap-1">
                  {[0.5, 1, 2].map((factor) => (
                    <button
                      key={factor}
                      type="button"
                      onClick={() => setPortionFactor(factor)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                        portionFactor === factor ? "bg-orange-500 text-white" : "text-stone-500 hover:bg-orange-50"
                      }`}
                    >
                      {factor === 0.5 ? "1/2x" : `${factor}x`}
                    </button>
                  ))}
                </div>
                <button
                  onClick={() => {
                    if (allChecked) {
                      setCheckedIngredients(new Set());
                    } else {
                      setCheckedIngredients(new Set(ingredients.map((_, i) => i)));
                    }
                  }}
                  className="text-[10px] font-bold text-orange-600 hover:text-orange-700 uppercase tracking-wider bg-orange-50 px-3 py-1 rounded-full transition-colors"
                >
                  {allChecked ? 'Deselect All' : 'Select All'}
                </button>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  {checkedIngredients.size}/{ingredients.length}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {scaledIngredients.map((ing, i) => {
                const checked = checkedIngredients.has(i);
                return (
                  <button
                    key={i}
                    onClick={() => setCheckedIngredients(prev => {
                      const next = new Set(prev);
                      checked ? next.delete(i) : next.add(i);
                      return next;
                    })}
                    className={`flex items-center gap-4 p-4 rounded-2xl text-left transition-all duration-300 border ${checked
                      ? 'bg-emerald-50/50 border-emerald-100 text-emerald-950'
                      : 'bg-stone-50/50 border-stone-100 text-stone-800 hover:border-orange-200'
                      }`}
                  >
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center transition-colors ${checked ? 'bg-emerald-500 text-white' : 'bg-white border-2 border-stone-200'
                      }`}>
                      {checked && <Check size={14} />}
                    </div>
                    <span className={`text-sm font-medium leading-relaxed ${checked ? 'line-through opacity-50' : ''}`}>
                      {ing}
                    </span>
                  </button>
                );
              })}
            </div>
            </div>
          </motion.div>

          <button
            onClick={handleStart}
            className={`w-full py-4 rounded-2xl text-lg font-black text-white transition-all duration-300 shadow-[0_12px_24px_rgba(249,115,22,0.2)] active:scale-[0.98] ${allChecked ? 'bg-emerald-500 shadow-emerald-200' : 'bg-orange-500'
              }`}
            style={{
              background: allChecked
                ? "linear-gradient(135deg,#10B981,#059669)"
                : "linear-gradient(135deg,#FB923C,#F97316,#EA580C)"
            }}
          >
            {allChecked ? "All Ready—Let's Cook!" : "Let's Get Cooking"}
          </button>

          {!allChecked && (
            <p className="text-center text-stone-400 text-xs mt-4 font-semibold italic">
              {scaledIngredients.length - checkedIngredients.size} items remaining
            </p>
          )}
        </div>
      </div>
    );
  }

  /* ── Done screen ── */
  if (done) {
    return (
      <div
        className="min-h-full flex flex-col items-center justify-center px-6 py-10"
        style={{ background: "linear-gradient(135deg,#FFF7ED 0%,#FFFAF5 100%)" }}
      >
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 200 }}
          className="w-full max-w-md rounded-3xl border p-7 text-center"
          style={{ background: "#fff", borderColor: "rgba(249,115,22,0.16)", boxShadow: "0 20px 48px rgba(249,115,22,0.14)" }}
        >
          <div
            className="w-24 h-24 rounded-3xl flex items-center justify-center text-5xl mx-auto mb-6"
            style={{ background: "linear-gradient(135deg,#FB923C,#F97316)", boxShadow: "0 8px 32px rgba(249,115,22,0.35)" }}
          >
            🏆
          </div>
          <h2
            className="text-3xl font-bold text-stone-900 mb-2"
            style={{ fontFamily: "'Fraunces', Georgia, serif" }}
          >
            Bon appétit!
          </h2>
          <p className="text-stone-500 mb-5">You finished cooking <strong>{recipe.name}</strong>. Enjoy!</p>

          <div className="rounded-2xl border px-4 py-3 mb-6" style={{ borderColor: "rgba(16,185,129,0.2)", background: "rgba(16,185,129,0.08)" }}>
            <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-emerald-600 mb-1">XP earned</p>
            <p className="text-2xl font-black text-emerald-700">+{sessionXp} XP</p>
          </div>

          <div className="mb-7" data-tutorial="rating-stars">
            <p className="text-xs uppercase tracking-[0.14em] text-stone-400 font-bold mb-2">Rate this recipe</p>
            <div className="flex items-center justify-center gap-1.5">
              {Array.from({ length: 5 }).map((_, index) => {
                const value = index + 1;
                const active = value <= currentRating;

                return (
                  <button
                    key={value}
                    onClick={() => {
                      rateRecipe(id!, value);
                      toast.success(`Saved your ${value}-star rating`);
                    }}
                    className="w-10 h-10 rounded-xl border flex items-center justify-center transition-colors"
                    style={{
                      borderColor: active ? "rgba(251,191,36,0.45)" : "rgba(0,0,0,0.1)",
                      background: active ? "rgba(251,191,36,0.18)" : "#fff",
                    }}
                    aria-label={`Rate ${value} stars`}
                  >
                    <Star size={18} className={active ? "text-amber-500 fill-amber-500" : "text-stone-300"} />
                  </button>
                );
              })}
            </div>
          </div>

          {pantryItemsToUse.length > 0 && (
            <div
              className="rounded-2xl border px-4 py-4 mb-7 text-left"
              style={{ borderColor: "rgba(249,115,22,0.16)", background: "rgba(255,247,237,0.82)" }}
            >
              <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-orange-500 mb-2">Pantry update</p>
              <p className="text-sm font-semibold text-stone-800">Remove the ingredients used from your pantry?</p>
              <p className="text-xs text-stone-500 mt-1">
                We matched {pantryItemsToUse.length} pantry item{pantryItemsToUse.length === 1 ? "" : "s"} to this recipe.
              </p>
              <div className="flex flex-wrap gap-2 mt-3">
                {pantryItemsToUse.slice(0, 5).map((item) => (
                  <span
                    key={item.id}
                    className="inline-flex px-2.5 py-1 rounded-full bg-white border border-orange-100 text-[11px] font-semibold text-orange-700"
                  >
                    {item.name}
                  </span>
                ))}
              </div>
              <div className="flex gap-3 mt-4">
                <button
                  onClick={handlePantryUseConfirmed}
                  disabled={pantryDecisionMade}
                  className="flex-1 px-4 py-2.5 rounded-xl text-sm font-bold text-white disabled:opacity-70"
                  style={{ background: "linear-gradient(135deg,#FB923C,#F97316,#EA580C)" }}
                >
                  {pantryDecisionMade ? "Pantry Updated" : "Yes, update pantry"}
                </button>
                <button
                  onClick={() => setPantryDecisionMade(true)}
                  disabled={pantryDecisionMade}
                  className="flex-1 px-4 py-2.5 rounded-xl text-sm font-bold bg-white border border-stone-200 text-stone-600 disabled:opacity-70"
                >
                  Keep as is
                </button>
              </div>
            </div>
          )}

          <div className="flex gap-3 justify-center">
            <button
              onClick={() => {
                hasTrackedCookRef.current = false;
                awardedStepsRef.current = new Set();
                awardedCompletionRef.current = false;
                setEarnedSessionXp(0);
                setXpPopup(null);
                setPantryDecisionMade(false);
                setDone(false);
                setStepIndex(0);
              }}
              className="flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-bold bg-white border border-stone-200 text-stone-600 hover:border-orange-300 transition-colors"
            >
              <RotateCcw size={14} /> Cook again
            </button>
            <button
              onClick={() => navigate("/let-me-cook")}
              className="flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-bold text-white transition-all hover:opacity-90"
              style={{ background: "linear-gradient(135deg,#FB923C,#F97316,#EA580C)", boxShadow: "0 4px 16px rgba(249,115,22,0.30)" }}
            >
              <ChefHat size={14} /> More recipes
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  /* ── Cook screen ── */
  return (
    <div
      className="min-h-full flex flex-col"
      style={{ fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif", background: "#FFFAF5" }}
    >
      {/* Top bar */}
      <div
        className="border-b px-6 py-4"
        style={{
          background: "linear-gradient(135deg,#FFF7ED 0%,#FFFAF5 100%)",
          borderColor: "rgba(249,115,22,0.12)",
        }}
      >
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-between gap-4">
            <button
              onClick={() => { stop(); navigate(-1); }}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white border border-stone-200 text-xs font-semibold text-stone-600 hover:border-orange-300 transition-colors"
            >
              <ArrowLeft size={13} /> Exit
            </button>

            <div className="text-center flex-1 min-w-0">
              <p className="text-[10px] font-bold text-orange-400 uppercase tracking-widest">Now cooking</p>
              <div className="flex items-center justify-center gap-2 min-w-0">
                <motion.span
                  key={headerChefEmoji}
                  initial={{ scale: 0.85, opacity: 0.6 }}
                  animate={{ scale: 1, opacity: 1, y: activeTimers.length > 0 ? [0, -3, 0] : [0, -1, 0] }}
                  transition={{
                    opacity: { duration: 0.2 },
                    scale: { duration: 0.2 },
                    y: { duration: activeTimers.length > 0 ? 0.6 : 1, repeat: Infinity, repeatType: "loop", ease: "easeInOut" },
                  }}
                  className="text-lg shrink-0"
                  aria-hidden="true"
                >
                  {headerChefEmoji}
                </motion.span>
                <p
                  className="text-sm font-bold text-stone-800 line-clamp-1"
                  style={{ fontFamily: "'Fraunces', Georgia, serif" }}
                >
                  {recipe.name}
                </p>
                <span className="shrink-0 rounded-full bg-white/90 border border-orange-200 px-2 py-0.5 text-[10px] font-bold text-orange-600">
                  Lv.{levelInfo.level}
                </span>
                <span className="shrink-0 rounded-full bg-amber-50 border border-amber-200 px-2 py-0.5 text-[10px] font-bold text-amber-600 inline-flex items-center gap-1">
                  <Zap size={10} className="fill-current" />
                  +{earnedSessionXp} XP
                </span>
                {cookingStreak > 0 && (
                  <span className="shrink-0 rounded-full bg-emerald-50 border border-emerald-200 px-2 py-0.5 text-[10px] font-bold text-emerald-600">
                    Streak {cookingStreak}
                  </span>
                )}
              </div>
              <div className="h-5 mt-1 flex items-center justify-center">
                <AnimatePresence mode="wait">
                  {xpPopup && (
                    <motion.div
                      key={xpPopup.id}
                      initial={{ opacity: 0, y: 6, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -8, scale: 0.98 }}
                      className="inline-flex items-center gap-1 rounded-full bg-amber-100/90 border border-amber-200 px-2.5 py-0.5 text-[10px] font-bold text-amber-700"
                    >
                      <Zap size={10} className="fill-current" />
                      +{xpPopup.amount} XP · {xpPopup.label}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowAllStepsView((value) => !value)}
                className={`px-3 py-2 rounded-xl text-xs font-semibold transition-colors ${showAllStepsView
                  ? "bg-orange-500 text-white border border-orange-500"
                  : "bg-white border border-stone-200 text-stone-600 hover:border-orange-300"
                  }`}
              >
                {showAllStepsView ? "Step View" : "All Steps"}
              </button>
              <button
                onClick={() => setShowIngredients((v) => !v)}
                className="px-3 py-2 rounded-xl bg-white border border-stone-200 text-xs font-semibold text-stone-600 hover:border-orange-300 transition-colors"
              >
                Ingredients
              </button>
              <div className="inline-flex rounded-xl border border-stone-200 bg-white p-1 gap-1">
                {[0.5, 1, 2].map((factor) => (
                  <button
                    key={factor}
                    type="button"
                    onClick={() => setPortionFactor(factor)}
                    className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                      portionFactor === factor ? "bg-orange-500 text-white" : "text-stone-500 hover:bg-orange-50"
                    }`}
                  >
                    {factor === 0.5 ? "1/2x" : `${factor}x`}
                  </button>
                ))}
              </div>
              <button
                onClick={toggleListening}
                className={`w-9 h-9 rounded-xl flex items-center justify-center transition-colors ${isListening
                  ? "bg-emerald-500 text-white border border-emerald-500"
                  : "bg-white border border-stone-200 text-stone-400 hover:border-emerald-300"
                  }`}
                title={isListening ? "Stop listening" : "Enable hands-free mode"}
              >
                {isListening ? <Mic size={15} /> : <MicOff size={15} />}
              </button>
              <button
                onClick={handleToggleTts}
                className={`w-9 h-9 rounded-xl flex items-center justify-center transition-colors ${ttsEnabled
                  ? "bg-orange-500 text-white border border-orange-500"
                  : "bg-white border border-stone-200 text-stone-400 hover:border-orange-300"
                  }`}
                title={ttsEnabled ? "Mute voice" : "Enable voice"}
              >
                {ttsEnabled ? <Volume2 size={15} /> : <VolumeX size={15} />}
              </button>
            </div>
          </div>

        </div>
      </div>

      {/* Voice Status */}
      <div className="fixed top-24 left-1/2 -translate-x-1/2 z-50 flex flex-col items-center gap-2 pointer-events-none">
        <AnimatePresence>
          {lastCommand && (
            <motion.div
              initial={{ opacity: 0, y: -10, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.9 }}
              className={`px-4 py-2 rounded-full shadow-lg border text-sm font-bold flex items-center gap-2
                ${commandStatus === 'success' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-red-50 text-red-700 border-red-200'}
              `}
            >
              {lastCommand}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Ingredients slide-down */}
      <AnimatePresence>
        {showIngredients && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden border-b"
            style={{ borderColor: "rgba(249,115,22,0.12)", background: "#FFF7ED" }}
          >
            <div className="px-6 py-4 max-w-2xl mx-auto">
              <p className="text-[10px] font-bold text-orange-400 uppercase tracking-widest mb-3">Ingredients</p>
              <div className="grid grid-cols-2 gap-1.5">
                {scaledIngredients.map((ing, i) => {
                  const checked = checkedIngredients.has(i);
                  return (
                    <button
                      key={i}
                      onClick={() =>
                        setCheckedIngredients((prev) => {
                          const next = new Set(prev);
                          checked ? next.delete(i) : next.add(i);
                          return next;
                        })
                      }
                      className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-left transition-colors"
                      style={{
                        background: checked ? "rgba(34,197,94,0.08)" : "rgba(255,255,255,0.7)",
                        border: `1px solid ${checked ? "rgba(34,197,94,0.25)" : "rgba(0,0,0,0.07)"}`,
                      }}
                    >
                      <div className="shrink-0">
                        {checked
                          ? <CheckCircle2 size={15} className="text-emerald-500" />
                          : <Circle size={15} className="text-stone-300" />
                        }
                      </div>
                      <span
                        className="text-xs font-medium"
                        style={{ color: checked ? "#6B7280" : "#292524", textDecoration: checked ? "line-through" : "none" }}
                      >
                        {ing}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Step area */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-8">
        <div className="w-full max-w-2xl space-y-6">
          {/* Progress */}
          <StepProgressHeader
            total={steps.length}
            current={stepIndex}
            progress={headerProgress}
            emoji={headerChefEmoji}
          />

          {/* Step card */}
          {showAllStepsView ? (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              data-tutorial="cooking-step-card"
              className="rounded-2xl border p-6 sm:p-8"
              style={{
                background: "#fff",
                borderColor: "rgba(249,115,22,0.15)",
                boxShadow: "0 4px 24px rgba(249,115,22,0.08)",
              }}
            >
              <div className="flex items-center justify-between gap-3 mb-5">
                <div>
                  <p className="text-[10px] font-bold text-stone-400 uppercase tracking-widest">Full recipe view</p>
                  <p className="text-sm font-semibold text-stone-700">See every step before you move through the flow</p>
                </div>
                <button
                  onClick={handleReadStep}
                  data-tutorial="read-aloud-btn"
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${isSpeaking
                    ? "bg-orange-100 text-orange-600 border border-orange-200"
                    : "bg-stone-100 text-stone-500 border border-stone-200 hover:bg-orange-50 hover:text-orange-500 hover:border-orange-200"
                    }`}
                >
                  {isSpeaking ? <VolumeX size={12} /> : <Volume2 size={12} />}
                  {isSpeaking ? "Stop" : "Read current"}
                </button>
              </div>

              <TooltipProvider delayDuration={120}>
                <div className="space-y-3">
                  {steps.map((step, index) => {
                    const active = index === stepIndex;
                    return (
                      <button
                        key={`${index}-${step}`}
                        type="button"
                        onClick={() => setStepIndex(index)}
                        className={`w-full text-left rounded-2xl border px-4 py-4 transition-colors ${active ? "border-orange-200 bg-orange-50/70" : "border-stone-200 bg-stone-50/70 hover:border-orange-200 hover:bg-orange-50/40"}`}
                      >
                        <div className="flex items-start gap-3">
                          <div
                            className={`w-8 h-8 rounded-xl flex items-center justify-center text-sm font-black shrink-0 ${active ? "text-white" : "text-stone-600 bg-white border border-stone-200"}`}
                            style={active ? { background: "linear-gradient(135deg,#FB923C,#F97316)" } : undefined}
                          >
                            {index + 1}
                          </div>
                          <div className="min-w-0">
                            <p className="text-[10px] font-bold uppercase tracking-widest text-stone-400 mb-1">
                              {active ? "Current step" : `Step ${index + 1}`}
                            </p>
                            <div
                              className="text-base sm:text-lg font-medium text-stone-800 leading-relaxed"
                              style={{ fontFamily: "'Fraunces', Georgia, serif" }}
                            >
                              {renderInstructionWithDefinitions(step, handleStartTimer)}
                            </div>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </TooltipProvider>
            </motion.div>
          ) : (
            <AnimatePresence mode="wait">
              <motion.div
                key={stepIndex}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -16 }}
                transition={{ duration: 0.25, ease: "easeOut" }}
                data-tutorial="cooking-step-card"
                className="rounded-2xl border p-8"
                style={{
                  background: "#fff",
                  borderColor: "rgba(249,115,22,0.15)",
                  boxShadow: "0 4px 24px rgba(249,115,22,0.08)",
                }}
              >
                <div className="flex items-center gap-3 mb-5">
                  <div
                    className="w-9 h-9 rounded-xl flex items-center justify-center text-white text-sm font-black shrink-0"
                    style={{ background: "linear-gradient(135deg,#FB923C,#F97316)" }}
                  >
                    {stepIndex + 1}
                  </div>
                  <p
                    className="text-[10px] font-bold text-stone-400 uppercase tracking-widest"
                  >
                    {isLastStep ? "Final step" : `Step ${stepIndex + 1}`}
                  </p>

                  <button
                    onClick={handleReadStep}
                    data-tutorial="read-aloud-btn"
                    className={`ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${isSpeaking
                      ? "bg-orange-100 text-orange-600 border border-orange-200"
                      : "bg-stone-100 text-stone-500 border border-stone-200 hover:bg-orange-50 hover:text-orange-500 hover:border-orange-200"
                      }`}
                  >
                    {isSpeaking ? <VolumeX size={12} /> : <Volume2 size={12} />}
                    {isSpeaking ? "Stop" : "Read aloud"}
                  </button>
                </div>

                <TooltipProvider delayDuration={120}>
                  <div
                    className="text-xl font-medium text-stone-800 leading-relaxed"
                    style={{ fontFamily: "'Fraunces', Georgia, serif" }}
                  >
                    {renderInstructionWithDefinitions(steps[stepIndex], handleStartTimer)}
                  </div>
                </TooltipProvider>

                {(detectedTimers.length > 0 || detachedActiveTimers.length > 0) && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    data-tutorial="timers-section"
                    className="mt-6 pt-5 flex flex-col items-center space-y-3"
                    style={{ borderTop: "1px dashed rgba(249,115,22,0.2)" }}
                  >
                    <p className="text-[10px] font-bold text-orange-400 uppercase tracking-widest">
                      Step Timers
                    </p>

                    <div className={`grid gap-3 w-full ${detectedTimers.length + detachedActiveTimers.length > 1 ? "sm:grid-cols-2" : "max-w-sm mx-auto"}`}>
                      {detectedTimers.map((timer, index) => {
                        const timerId = buildTimerId(stepIndex, timer.label);
                        const activeTimer = activeTimers.find((item) => item.id === timerId);
                        const isActive = Boolean(activeTimer);

                        return (
                          <StepTimerCard
                            key={`${timer.label}-${index}`}
                            label={timer.label}
                            totalSeconds={timer.seconds}
                            remainingSeconds={isActive ? activeTimer?.remainingSeconds ?? timer.seconds : timer.seconds}
                            isActive={isActive}
                            isPaused={activeTimer?.isPaused ?? false}
                            onStart={() => handleStartTimer(timer.seconds, timer.label)}
                            onTogglePause={() => {
                              if (!activeTimer) return;
                              setActiveTimers((prev) => prev.map((item) => (
                                item.id === activeTimer.id
                                  ? { ...item, isPaused: !item.isPaused }
                                  : item
                              )));
                            }}
                            onEnd={() => {
                              setActiveTimers((prev) => prev.filter((item) => item.id !== timerId));
                            }}
                          />
                        );
                      })}

                      {detachedActiveTimers.map((timer) => (
                        <StepTimerCard
                          key={timer.id}
                          label={timer.label}
                          totalSeconds={timer.totalSeconds}
                          remainingSeconds={timer.remainingSeconds}
                          isActive
                          isPaused={timer.isPaused}
                          onStart={() => {}}
                          onTogglePause={() => {
                            setActiveTimers((prev) => prev.map((item) => (
                              item.id === timer.id
                                ? { ...item, isPaused: !item.isPaused }
                                : item
                            )));
                          }}
                          onEnd={() => {
                            setActiveTimers((prev) => prev.filter((item) => item.id !== timer.id));
                          }}
                        />
                      ))}
                    </div>
                  </motion.div>
                )}
              </motion.div>
            </AnimatePresence>
          )}

          {/* Navigation */}
          <div className="flex items-center gap-3">
            <button
              onClick={goPrev}
              disabled={stepIndex === 0}
              className="flex items-center gap-2 px-5 py-3 rounded-xl bg-white border border-stone-200 text-sm font-semibold text-stone-600 hover:border-orange-300 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <ArrowLeft size={15} /> Back
            </button>

            <button
              onClick={stepIndex === 0 ? () => { handleStart(); goNext(); } : goNext}
              data-tutorial="step-controls"
              className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold text-white transition-all hover:opacity-90 active:scale-[0.98]"
              style={{
                background: isLastStep
                  ? "linear-gradient(135deg,#10B981,#059669)"
                  : "linear-gradient(135deg,#FB923C,#F97316,#EA580C)",
                boxShadow: isLastStep
                  ? "0 4px 16px rgba(16,185,129,0.30)"
                  : "0 4px 16px rgba(249,115,22,0.30)",
              }}
            >
              {isLastStep ? (
                <><Check size={16} /> I'm done!</>
              ) : (
                <>Next step <ArrowRight size={15} /></>
              )}
            </button>
          </div>

          {/* Keyboard hint */}
          <p className="text-center text-[10px] text-stone-300 font-medium">
            ← → arrow keys to navigate steps
          </p>
        </div>
      </div>
    </div>
  );
}
