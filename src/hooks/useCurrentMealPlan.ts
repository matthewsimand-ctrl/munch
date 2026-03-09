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

export function useCurrentMealPlan() {
  const [meal, setMeal] = useState<PlannedMeal | null>(null);
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
        setLoading(false);
        return;
      }

      const { data: planItems } = await supabase
        .from('meal_plan_items')
        .select('*')
        .eq('meal_plan_id', plan.id)
        .eq('day_of_week', dayOfWeek)
        .eq('meal_type', mealType)
        .order('sort_order')
        .limit(1);

      const item = planItems?.[0];
      if (!item) {
        setMeal(null);
        setLoading(false);
        return;
      }

      setMeal({
        id: item.id,
        recipe_id: item.recipe_id,
        recipe_name: item.recipe_data?.name || 'Planned meal',
        recipe_image: item.recipe_data?.image || '/placeholder.svg',
        day_of_week: item.day_of_week,
        meal_type: item.meal_type as MealPlanSlot,
      });
      setLoading(false);
    };

    load();
  }, []);

  return { meal, loading };
}
