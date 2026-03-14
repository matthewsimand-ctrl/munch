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

  const analyze = async () => {
    if (!isPremium) {
      toast.info('Nutrition analysis is a Premium feature.');
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await invokeAppFunction('analyze-nutrition', {
        body: { recipeName, ingredients, servings },
      });

      if (error || !data?.success) {
        toast.error(data?.error || error?.message || 'Failed to analyze nutrition');
        return;
      }

      setNutrition(data.nutrition);
      cacheNutrition(recipeId, data.nutrition);
      await supabase.from('recipe_nutrition_cache').upsert({
        recipe_id: recipeId,
        nutrition: data.nutrition,
      });
    } catch (err) {
      if (isAiAgentCallsDisabledError(err)) {
        toast.info(getAiDisabledMessage('AI nutrition analysis'));
        return;
      }

      console.error('Nutrition error:', err);
      toast.error('Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  if (!nutrition) {
    return (
      <Button
        variant="outline"
        size="sm"
        onClick={analyze}
        disabled={loading}
        className="gap-1.5"
      >
        {loading ? (
          <>
            <Loader2 className="h-3.5 w-3.5 animate-spin" /> Analyzing...
          </>
        ) : (
          <>
            {isPremium ? <Sparkles className="h-3.5 w-3.5 text-amber-500" /> : <Lock className="h-3.5 w-3.5" />} {isPremium ? 'Nutrition Facts' : 'Nutrition Facts (Premium)'}
          </>
        )}
      </Button>
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
      className="rounded-xl border border-border bg-gradient-to-br from-card to-muted/30 p-4 space-y-3"
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-amber-500" />
          <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Nutrition Facts</span>
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
    </motion.div>
  );
}
