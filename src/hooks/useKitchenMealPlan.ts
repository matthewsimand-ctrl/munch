import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface KitchenMealPlanItem {
  id: string;
  weekStart: string;
  day: string;
  mealType: string;
  recipeName: string;
  recipeId: string;
  cookTime?: string;
  recipeSnapshot?: any;
}

const DAY_TO_INDEX: Record<string, number> = {
  Mon: 0,
  Tue: 1,
  Wed: 2,
  Thu: 3,
  Fri: 4,
  Sat: 5,
  Sun: 6,
};

const INDEX_TO_DAY = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function toMealTypeLabel(value: string) {
  const normalized = String(value || '').trim().toLowerCase();
  if (!normalized) return 'Dinner';
  return `${normalized.charAt(0).toUpperCase()}${normalized.slice(1)}`;
}

export function useKitchenMealPlan(activeKitchenId: string | null, weekStart: string) {
  const [mealPlanId, setMealPlanId] = useState<string | null>(null);
  const [items, setItems] = useState<KitchenMealPlanItem[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    if (!activeKitchenId) {
      setMealPlanId(null);
      setItems([]);
      return;
    }

    setLoading(true);
    try {
      let { data: plan, error: planError } = await supabase
        .from('kitchen_meal_plans')
        .select('id')
        .eq('kitchen_id', activeKitchenId)
        .eq('week_start', weekStart)
        .maybeSingle();

      if (planError) throw planError;

      if (!plan) {
        const { data: authData } = await supabase.auth.getUser();
        const user = authData.user;
        if (!user) {
          setItems([]);
          return;
        }

        const { data: createdPlan, error: createError } = await supabase
          .from('kitchen_meal_plans')
          .insert({
            kitchen_id: activeKitchenId,
            week_start: weekStart,
            created_by: user.id,
          })
          .select('id')
          .single();

        if (createError) throw createError;
        plan = createdPlan;
      }

      setMealPlanId(String(plan.id));

      const { data: itemRows, error: itemError } = await supabase
        .from('kitchen_meal_plan_items')
        .select('id, day_of_week, meal_type, recipe_id, recipe_data')
        .eq('meal_plan_id', plan.id)
        .order('day_of_week', { ascending: true })
        .order('sort_order', { ascending: true });

      if (itemError) throw itemError;

      setItems((itemRows || []).map((item: any) => {
        const snapshot = item.recipe_data || {};
        return {
          id: String(item.id),
          weekStart,
          day: INDEX_TO_DAY[item.day_of_week] || 'Mon',
          mealType: toMealTypeLabel(String(item.meal_type || 'Dinner')),
          recipeName: String(snapshot.recipeName || snapshot.name || 'Planned meal'),
          recipeId: String(snapshot.externalRecipeId || item.recipe_id || snapshot.id || item.id),
          cookTime: snapshot.cookTime || snapshot.cook_time || undefined,
          recipeSnapshot: snapshot.recipeSnapshot || snapshot,
        };
      }));
    } finally {
      setLoading(false);
    }
  }, [activeKitchenId, weekStart]);

  useEffect(() => {
    void load();
  }, [load]);

  const addMeal = useCallback(async (item: Omit<KitchenMealPlanItem, 'id'>) => {
    if (!mealPlanId) return;

    const existing = items.find((meal) => meal.day === item.day && meal.mealType === item.mealType);
    if (existing) {
      await removeMeal(existing.id);
    }

    const recipeId = UUID_PATTERN.test(item.recipeId) ? item.recipeId : null;
    const recipeData = {
      id: recipeId ?? null,
      externalRecipeId: recipeId ? null : item.recipeId,
      recipeName: item.recipeName,
      cookTime: item.cookTime,
      recipeSnapshot: item.recipeSnapshot ?? null,
    };

    const { error } = await supabase
      .from('kitchen_meal_plan_items')
      .insert({
        meal_plan_id: mealPlanId,
        day_of_week: DAY_TO_INDEX[item.day] ?? 0,
        meal_type: item.mealType.toLowerCase(),
        recipe_id: recipeId,
        recipe_data: recipeData,
        servings: 2,
      });

    if (error) throw error;
    await load();
  }, [items, load, mealPlanId]);

  const removeMeal = useCallback(async (id: string) => {
    const { error } = await supabase.from('kitchen_meal_plan_items').delete().eq('id', id);
    if (error) throw error;
    await load();
  }, [load]);

  const clearWeek = useCallback(async () => {
    if (!mealPlanId) return;
    const { error } = await supabase.from('kitchen_meal_plan_items').delete().eq('meal_plan_id', mealPlanId);
    if (error) throw error;
    await load();
  }, [load, mealPlanId]);

  return useMemo(() => ({
    mealPlanId,
    items,
    loading,
    load,
    addMeal,
    removeMeal,
    clearWeek,
  }), [mealPlanId, items, loading, load, addMeal, removeMeal, clearWeek]);
}
