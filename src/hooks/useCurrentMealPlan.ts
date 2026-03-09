import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { getCurrentMealPlanSlot, getMealPlanDayIndex, getMealPlanWeekStart, type MealPlanSlot } from '@/lib/mealPlanUtils';

interface PlannedMeal {
  id: string;
  recipe_id: string;
  recipe_name: string;
  recipe_image: string;
  day_of_week: number;
  meal_type: MealPlanSlot;
}

const SLOT_ORDER: MealPlanSlot[] = ['breakfast', 'lunch', 'snack', 'dinner'];

function slotIndex(slot: MealPlanSlot) {
  return SLOT_ORDER.indexOf(slot);
}

function toPlannedMeal(item: any): PlannedMeal {
  return {
    id: item.id,
    recipe_id: item.recipe_id,
    recipe_name: item.recipe_data?.name || 'Planned meal',
    recipe_image: item.recipe_data?.image || '/placeholder.svg',
    day_of_week: item.day_of_week,
    meal_type: item.meal_type as MealPlanSlot,
  };
}

export function useCurrentMealPlan() {
  const [meal, setMeal] = useState<PlannedMeal | null>(null);
  const [nextMeal, setNextMeal] = useState<PlannedMeal | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const now = new Date();
      const weekStart = getMealPlanWeekStart(now);
      const dayOfWeek = getMealPlanDayIndex(now);
      const mealType = getCurrentMealPlanSlot(now);

      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        setMeal(null);
        setNextMeal(null);
        setLoading(false);
        return;
      }

      const { data: plan } = await supabase
        .from('meal_plans')
        .select('id')
        .eq('user_id', session.user.id)
        .eq('week_start', weekStart)
        .maybeSingle();

      if (!plan?.id) {
        setMeal(null);
        setNextMeal(null);
        setLoading(false);
        return;
      }

      const { data: planItems } = await supabase
        .from('meal_plan_items')
        .select('*')
        .eq('meal_plan_id', plan.id)
        .order('day_of_week')
        .order('sort_order');

      const allItems = (planItems || []).map(toPlannedMeal);
      const current = allItems.find((item) => item.day_of_week === dayOfWeek && item.meal_type === mealType) || null;
      setMeal(current);

      const currentKey = dayOfWeek * 10 + slotIndex(mealType);
      const next =
        allItems.find((item) => item.day_of_week * 10 + slotIndex(item.meal_type) >= currentKey) ||
        allItems[0] ||
        null;
      setNextMeal(next);
      setLoading(false);
    };

    load();
  }, []);

  return { meal, nextMeal, loading };
}
