import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Sparkles, Loader2, Flame, Beef, Wheat, Droplets, Heart, Lock } from 'lucide-react';
import { getAiDisabledMessage, isAiAgentCallsDisabledError } from '@/lib/ai';
import { invokeAppFunction } from '@/lib/functionClient';
import { useStore } from '@/lib/store';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import { usePremiumAccess } from '@/hooks/usePremiumAccess';
import { usePremiumGate } from '@/hooks/usePremiumGate';
import PremiumFeatureButton from '@/components/PremiumFeatureButton';

export interface NutritionData {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  sugar: number;
  sodium: number;
  saturated_fat?: number;
  cholesterol?: number;
  servings: number;
  serving_size: string;
  health_score: number;
  notes: string;
}

interface NutritionCardProps {
  recipeId: string;
  recipeName: string;
  ingredients: string[];
  servings?: number;
}

export default function NutritionCard({ recipeId, recipeName, ingredients, servings = 1 }: NutritionCardProps) {
  const { cachedNutrition, cacheNutrition } = useStore();
  const { isPremium } = usePremiumAccess();
  const { openPremiumPage } = usePremiumGate();
  const [nutrition, setNutrition] = useState<NutritionData | null>(cachedNutrition[recipeId] || null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setNutrition(cachedNutrition[recipeId] || null);
  }, [recipeId, cachedNutrition]);

  useEffect(() => {
    if (cachedNutrition[recipeId]) return;

    let cancelled = false;

    const loadSharedNutrition = async () => {
      const { data, error } = await (supabase as any)
        .from('recipe_nutrition_cache')
        .select('nutrition')
        .eq('recipe_id', recipeId)
        .maybeSingle();

      if (cancelled || error || !data?.nutrition) return;

      setNutrition(data.nutrition as NutritionData);
      cacheNutrition(recipeId, data.nutrition);
    };

    void loadSharedNutrition();

    return () => {
      cancelled = true;
    };
  }, [cacheNutrition, cachedNutrition, recipeId]);

  const analyze = async (options?: { silent?: boolean }) => {
    if (!isPremium) {
      if (!options?.silent) {
        openPremiumPage("Nutritional Facts");
      }
      return;
    }

    const silent = options?.silent ?? false;
    setLoading(true);
    try {
      const { data, error } = await invokeAppFunction('analyze-nutrition', {
        body: { recipeName, ingredients, servings },
      });

      if (error || !data?.success) {
        if (!silent) {
          toast.error(data?.error || error?.message || 'Failed to analyze nutritional facts');
        }
        return;
      }

      setNutrition(data.nutrition);
      cacheNutrition(recipeId, data.nutrition);
      await (supabase as any).from('recipe_nutrition_cache').upsert({
        recipe_id: recipeId,
        nutrition: data.nutrition,
      });
    } catch (err) {
      if (isAiAgentCallsDisabledError(err)) {
        if (!silent) {
          toast.info(getAiDisabledMessage('AI nutritional facts'));
        }
        return;
      }

      console.error('Nutrition error:', err);
      if (!silent) {
        toast.error('Something went wrong');
      }
    } finally {
      setLoading(false);
    }
  };

  if (!nutrition) {
    const showOuterHeader = true;

    return (
      <div className="rounded-xl border border-border bg-gradient-to-br from-card to-muted/30 p-4 space-y-3">
        {showOuterHeader && (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {isPremium ? <Sparkles className="h-4 w-4 text-amber-500" /> : <Lock className="h-4 w-4 text-muted-foreground" />}
              <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Nutritional Facts</span>
            </div>
          </div>
        )}
        <div className="px-1 py-2 text-center">
          {loading ? (
            <p className="inline-flex items-center gap-2 text-sm font-medium text-stone-500">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading nutritional facts...
            </p>
          ) : !isPremium ? (
            <div className="mx-auto w-full max-w-[520px]">
              <div className="relative min-h-[320px] overflow-hidden rounded-[1.75rem] border border-stone-200 bg-white px-6 py-6 text-left shadow-sm">
                <div className="pointer-events-none select-none blur-[6px]">
                  <div className="flex items-center justify-end">
                    <div className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">8/10</div>
                  </div>
                  <div className="mt-3 flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-full bg-orange-100">
                      <Flame className="h-5 w-5 text-orange-500" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-stone-900">520</p>
                      <p className="text-[10px] uppercase tracking-wide text-stone-500">kcal per serving</p>
                    </div>
                  </div>
                  <div className="mt-3 h-2 overflow-hidden rounded-full bg-stone-100">
                    <div className="flex h-full">
                      <div className="h-full w-[34%] bg-sky-400" />
                      <div className="h-full w-[41%] bg-amber-400" />
                      <div className="h-full w-[25%] bg-rose-400" />
                    </div>
                  </div>
                  <div className="mt-5 grid grid-cols-4 gap-4">
                    {[
                      { label: 'Protein', value: '28g', color: 'text-sky-500' },
                      { label: 'Carbs', value: '42g', color: 'text-amber-500' },
                      { label: 'Fat', value: '18g', color: 'text-rose-400' },
                      { label: 'Fiber', value: '7g', color: 'text-emerald-500' },
                    ].map((item) => (
                      <div key={item.label} className="text-center">
                        <div className={`mx-auto mb-1 h-3.5 w-3.5 rounded-full bg-current ${item.color}`} />
                        <p className="text-sm font-bold text-stone-900">{item.value}</p>
                        <p className="text-[9px] text-stone-500">{item.label}</p>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="absolute inset-0 bg-white/18" />
                <div className="absolute inset-0 z-10 flex items-center justify-center p-5">
                  <div className="w-full max-w-[360px] rounded-2xl border border-orange-300 bg-white px-5 py-5 text-center shadow-lg">
                    <p className="inline-flex items-center gap-2 text-sm font-bold text-stone-900">
                      <Lock className="h-4 w-4 text-orange-500" />
                      Premium unlock
                    </p>
                    <p className="mt-1 text-xs leading-5 text-stone-700">
                      Become a member to view nutritional information about your recipe.
                    </p>
                    <PremiumFeatureButton
                      label="See Member Benefits"
                      onClick={() => openPremiumPage("Nutritional Facts")}
                      variant="soft"
                      className="mt-3 h-10 rounded-xl px-3 text-sm"
                    />
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <Button
              variant="outline"
              size="sm"
              onClick={() => void analyze()}
              className="gap-1.5"
            >
              {isPremium ? <Sparkles className="h-3.5 w-3.5 text-amber-500" /> : <Lock className="h-3.5 w-3.5" />}
              Generate Nutritional Facts
            </Button>
          )}
        </div>
      </div>
    );
  }

  const healthColor = nutrition.health_score >= 7 ? 'text-emerald-500' : nutrition.health_score >= 4 ? 'text-amber-500' : 'text-red-500';
  const healthBg = nutrition.health_score >= 7 ? 'bg-emerald-500/10' : nutrition.health_score >= 4 ? 'bg-amber-500/10' : 'bg-red-500/10';

  const macros = [
    { label: 'Protein', value: nutrition.protein, unit: 'g', icon: Beef, color: 'text-blue-500', bg: 'bg-blue-500' },
    { label: 'Carbs', value: nutrition.carbs, unit: 'g', icon: Wheat, color: 'text-amber-500', bg: 'bg-amber-500' },
    { label: 'Fat', value: nutrition.fat, unit: 'g', icon: Droplets, color: 'text-rose-400', bg: 'bg-rose-400' },
    { label: 'Fiber', value: nutrition.fiber, unit: 'g', icon: Heart, color: 'text-emerald-500', bg: 'bg-emerald-500' },
  ];

  const totalMacroG = nutrition.protein + nutrition.carbs + nutrition.fat;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative rounded-xl border border-border bg-gradient-to-br from-card to-muted/30 p-4 space-y-3 overflow-hidden"
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-amber-500" />
          <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Nutritional Facts</span>
        </div>
        <div className={`flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full ${healthBg} ${healthColor}`}>
          <Heart className="h-3 w-3" />
          {nutrition.health_score}/10
        </div>
      </div>

      {/* Calories hero */}
      <div className="flex items-center gap-3">
        <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
          <Flame className="h-6 w-6 text-primary" />
        </div>
        <div>
          <p className="text-2xl font-bold text-card-foreground">{Math.round(nutrition.calories)}</p>
          <p className="text-[10px] text-muted-foreground uppercase tracking-wide">kcal per serving</p>
        </div>
        <div className="ml-auto text-right">
          <p className="text-xs text-muted-foreground">{nutrition.serving_size}</p>
          <p className="text-[10px] text-muted-foreground">{nutrition.servings} serving{nutrition.servings !== 1 ? 's' : ''}</p>
        </div>
      </div>

      {/* Macro bar */}
      {totalMacroG > 0 && (
        <div className="h-2 rounded-full overflow-hidden flex bg-muted">
          {macros.slice(0, 3).map(m => (
            <div
              key={m.label}
              className={`${m.bg} h-full transition-all`}
              style={{ width: `${(m.value / totalMacroG) * 100}%` }}
            />
          ))}
        </div>
      )}

      {/* Macro grid */}
      <div className="grid grid-cols-4 gap-2">
        {macros.map(({ label, value, unit, icon: Icon, color }) => (
          <div key={label} className="text-center space-y-0.5">
            <Icon className={`h-3.5 w-3.5 mx-auto ${color}`} />
            <p className="text-sm font-bold text-card-foreground">{Math.round(value)}{unit}</p>
            <p className="text-[9px] text-muted-foreground">{label}</p>
          </div>
        ))}
      </div>

      {/* Extra details */}
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-[10px] text-muted-foreground border-t border-border pt-2">
        <span>Sugar: {Math.round(nutrition.sugar)}g</span>
        <span>Sodium: {Math.round(nutrition.sodium)}mg</span>
        {nutrition.saturated_fat != null && <span>Sat. Fat: {Math.round(nutrition.saturated_fat)}g</span>}
        {nutrition.cholesterol != null && <span>Cholesterol: {Math.round(nutrition.cholesterol)}mg</span>}
      </div>

      {/* AI note */}
      {nutrition.notes && (
        <p className="text-[10px] text-muted-foreground italic">
          💡 {nutrition.notes}
        </p>
      )}

      {!isPremium && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-stone-950/12 backdrop-blur-[6px]">
          <div className="mx-4 max-w-[280px] rounded-2xl border border-orange-300 bg-white px-4 py-4 text-center shadow-lg">
            <p className="inline-flex items-center gap-2 text-sm font-bold text-stone-900">
              <Lock className="h-4 w-4 text-orange-500" />
              Premium unlock
            </p>
            <p className="mt-1 text-xs leading-5 text-stone-700">
              Become a member to view nutritional information about your recipe.
            </p>
            <PremiumFeatureButton
              label="See Member Benefits"
              onClick={() => openPremiumPage("Nutritional Facts")}
              variant="soft"
              className="mt-3 h-10 rounded-xl px-3 text-sm"
            />
          </div>
        </div>
      )}
    </motion.div>
  );
}
