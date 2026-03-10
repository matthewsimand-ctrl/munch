import { useState, useMemo, useEffect, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft, ArrowRight, ChefHat, CheckCircle2, Circle,
  Volume2, VolumeX, RotateCcw, Check, Star, CircleHelp,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useStore } from "@/lib/store";
import { useDbRecipes } from "@/hooks/useDbRecipes";
import { normalizeRecipe } from "@/lib/normalizeRecipe";
import { useSpeechSynthesis } from "@/hooks/useSpeechSynthesis";
import { toast } from "sonner";
import type { Recipe } from "@/data/recipes";
import { ChefPath, CookingXpBar } from "@/components/ChefCompanion";
import { buildDictionaryRegex, lookupTerm } from "@/lib/cookingDictionary";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useCookedMeals } from "@/hooks/useCookedMeals";

/* ─── Helpers ──────────────────────────────────────────────── */
function cleanInstruction(raw: string): string {
  return String(raw || "")
    .replace(/^step\s*\d+\s*[:.)\-]?\s*/i, "")
    .replace(/^\d+\s*[:.)\-]\s*/, "")
    .trim();
}

const dictionaryRegex = buildDictionaryRegex();

function renderInstructionWithDefinitions(step: string) {
  const matches = Array.from(step.matchAll(dictionaryRegex));

  if (!matches.length) return step;

  const nodes: Array<JSX.Element | string> = [];
  let lastIndex = 0;

  matches.forEach((match, index) => {
    const matchedText = match[0];
    const matchIndex = match.index ?? 0;

    if (matchIndex > lastIndex) {
      nodes.push(step.slice(lastIndex, matchIndex));
    }

    const entry = lookupTerm(matchedText);

    if (!entry) {
      nodes.push(matchedText);
    } else {
      nodes.push(
        <span key={`${matchedText}-${matchIndex}-${index}`} className="inline-flex items-baseline gap-1">
          <span className="rounded px-1 py-0.5 bg-orange-100 text-orange-700 font-semibold">
            {matchedText}
          </span>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                className="inline-flex items-center justify-center text-orange-500 hover:text-orange-600 transition-colors"
                aria-label={`Definition for ${matchedText}`}
              >
                <CircleHelp size={14} />
              </button>
            </TooltipTrigger>
            <TooltipContent className="max-w-xs">
              <p className="font-semibold text-xs text-orange-600 mb-1">{entry.term}</p>
              <p className="text-xs leading-relaxed">{entry.definition}</p>
            </TooltipContent>
          </Tooltip>
        </span>,
      );
    }

    lastIndex = matchIndex + matchedText.length;
  });

  if (lastIndex < step.length) {
    nodes.push(step.slice(lastIndex));
  }

  return nodes;
}

/* ─── Sub-components ───────────────────────────────────────── */
function ProgressDots({ total, current }: { total: number; current: number }) {
  return (
    <div className="flex items-center gap-1.5 flex-wrap justify-center">
      {Array.from({ length: total }).map((_, i) => (
        <div
          key={i}
          className="rounded-full transition-all duration-300"
          style={{
            width: i === current ? 20 : 8,
            height: 8,
            background:
              i < current
                ? "#10B981"
                : i === current
                ? "linear-gradient(90deg,#FB923C,#F97316)"
                : "rgba(0,0,0,0.10)",
          }}
        />
      ))}
    </div>
  );
}

/* ─── Main ─────────────────────────────────────────────────── */
export default function CookMode() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { savedApiRecipes, markRecipeCooked, rateRecipe, recipeRatings } = useStore();
  const { data: dbRecipes = [] } = useDbRecipes();
  const { isSpeaking, speak, stop } = useSpeechSynthesis();
  const { trackCookedMeal } = useCookedMeals(1);

  const [stepIndex, setStepIndex] = useState(0);
  const [checkedIngredients, setCheckedIngredients] = useState<Set<number>>(new Set());
  const [ttsEnabled, setTtsEnabled] = useState(true);
  const [done, setDone] = useState(false);
  const [showIngredients, setShowIngredients] = useState(false);

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
  const isLastStep = stepIndex === steps.length - 1;
  const sessionXp = Math.max(0, (steps.length - 1) * 15) + 50;
  const currentRating = recipe && id ? recipeRatings[id] ?? 0 : 0;

  /* ── TTS: speak is ONLY called from button click handlers ──
     Never put speak() in a useEffect — browsers block speech
     that isn't triggered by a direct user gesture.           */

  const handleToggleTts = useCallback(() => {
    if (isSpeaking) {
      stop();
    } else if (ttsEnabled && steps[stepIndex]) {
      // This is a direct button click → allowed by browser
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
      markRecipeCooked?.(id!);
      void trackCookedMeal({
        recipeId: id!,
        recipeName: recipe.name,
        cookTime: recipe.cook_time,
        ingredientCount: ingredients.length,
      });
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
    // Called from "Start Cooking" button — user gesture, TTS allowed
    if (ttsEnabled && steps[0]) {
      speak(steps[0]);
    }
  }, [ttsEnabled, steps, speak]);

  /* ── Keyboard nav ── */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight" || e.key === "ArrowDown") { e.preventDefault(); goNext(); }
      if (e.key === "ArrowLeft" || e.key === "ArrowUp") { e.preventDefault(); goPrev(); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [goNext, goPrev]);

  /* ── Auto-speak first step on mount: we cannot do this since it
     requires a user gesture. User must press play or tap Next.  */

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

          <div className="mb-7">
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

          <div className="flex gap-3 justify-center">
            <button
              onClick={() => { setDone(false); setStepIndex(0); }}
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
        className="border-b px-6 py-4 flex items-center justify-between gap-4"
        style={{
          background: "linear-gradient(135deg,#FFF7ED 0%,#FFFAF5 100%)",
          borderColor: "rgba(249,115,22,0.12)",
        }}
      >
        <button
          onClick={() => { stop(); navigate(-1); }}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white border border-stone-200 text-xs font-semibold text-stone-600 hover:border-orange-300 transition-colors"
        >
          <ArrowLeft size={13} /> Exit
        </button>

        <div className="text-center flex-1">
          <p className="text-[10px] font-bold text-orange-400 uppercase tracking-widest">Now cooking</p>
          <p
            className="text-sm font-bold text-stone-800 line-clamp-1"
            style={{ fontFamily: "'Fraunces', Georgia, serif" }}
          >
            {recipe.name}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Ingredients toggle */}
          <button
            onClick={() => setShowIngredients((v) => !v)}
            className="px-3 py-2 rounded-xl bg-white border border-stone-200 text-xs font-semibold text-stone-600 hover:border-orange-300 transition-colors"
          >
            Ingredients
          </button>
          {/* TTS toggle */}
          <button
            onClick={handleToggleTts}
            className={`w-9 h-9 rounded-xl flex items-center justify-center transition-colors ${
              ttsEnabled
                ? "bg-orange-500 text-white border border-orange-500"
                : "bg-white border border-stone-200 text-stone-400 hover:border-orange-300"
            }`}
            title={ttsEnabled ? "Mute voice" : "Enable voice"}
          >
            {ttsEnabled ? <Volume2 size={15} /> : <VolumeX size={15} />}
          </button>
        </div>
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
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                {ingredients.map((ing, i) => {
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
          <div
            className="rounded-2xl border px-4 py-3"
            style={{ background: "#fff", borderColor: "rgba(249,115,22,0.14)", boxShadow: "0 4px 18px rgba(249,115,22,0.08)" }}
          >
            <ChefPath currentStep={stepIndex} totalSteps={steps.length} isDone={done} />
            <div className="mt-2 pt-2 border-t" style={{ borderColor: "rgba(249,115,22,0.12)" }}>
              <CookingXpBar currentStep={stepIndex} isDone={done} />
            </div>
          </div>

          {/* Recipe image – shown on step 0 */}
          {stepIndex === 0 && recipe.image && recipe.image !== "/placeholder.svg" && (
            <motion.div
              initial={{ opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              className="rounded-2xl overflow-hidden aspect-video"
              style={{ boxShadow: "0 8px 32px rgba(28,25,23,0.12)" }}
            >
              <img src={recipe.image} alt={recipe.name} className="w-full h-full object-cover" />
            </motion.div>
          )}

          {/* Progress */}
          <div className="flex items-center justify-between text-xs font-semibold text-stone-400">
            <span>Step {stepIndex + 1} of {steps.length}</span>
            <ProgressDots total={steps.length} current={stepIndex} />
            <span>{Math.round(((stepIndex + 1) / steps.length) * 100)}%</span>
          </div>

          {/* Step card */}
          <AnimatePresence mode="wait">
            <motion.div
              key={stepIndex}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -16 }}
              transition={{ duration: 0.25, ease: "easeOut" }}
              className="rounded-2xl border p-8"
              style={{
                background: "#fff",
                borderColor: "rgba(249,115,22,0.15)",
                boxShadow: "0 4px 24px rgba(249,115,22,0.08)",
              }}
            >
              {/* Step number pill */}
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

                {/* Read aloud button — direct user gesture → TTS always works here */}
                <button
                  onClick={handleReadStep}
                  className={`ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
                    isSpeaking
                      ? "bg-orange-100 text-orange-600 border border-orange-200"
                      : "bg-stone-100 text-stone-500 border border-stone-200 hover:bg-orange-50 hover:text-orange-500 hover:border-orange-200"
                  }`}
                >
                  {isSpeaking ? <VolumeX size={12} /> : <Volume2 size={12} />}
                  {isSpeaking ? "Stop" : "Read aloud"}
                </button>
              </div>

              <TooltipProvider delayDuration={120}>
                <p
                  className="text-xl font-medium text-stone-800 leading-relaxed"
                  style={{ fontFamily: "'Fraunces', Georgia, serif" }}
                >
                  {renderInstructionWithDefinitions(steps[stepIndex])}
                </p>
              </TooltipProvider>
            </motion.div>
          </AnimatePresence>

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
