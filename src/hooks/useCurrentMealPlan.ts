import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { getCurrentMealPlanSlot, getMealPlanDayIndex, getMealPlanWeekStart, type MealPlanSlot } from '@/lib/mealPlanUtils';
import { useStore } from '@/lib/store';

interface PlannedMeal {
  id: string;
  recipe_id: string;
  recipe_name: string;
  recipe_image: string;
  recipe_data?: Record<string, any> | null;
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
    recipe_data: item.recipe_data,
    day_of_week: item.day_of_week,
    meal_type: item.meal_type as MealPlanSlot,
  };
}

const DAY_INDEX_BY_LABEL: Record<string, number> = {
  Mon: 0,
  Tue: 1,
  Wed: 2,
  Thu: 3,
  Fri: 4,
  Sat: 5,
  Sun: 6,
};

const SLOT_BY_LABEL: Record<string, MealPlanSlot> = {
  Breakfast: 'breakfast',
  Lunch: 'lunch',
  Dinner: 'dinner',
  Snack: 'snack',
};

export function useCurrentMealPlan() {
  const localMealPlan = useStore((state) => state.mealPlan);
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

      const localItems = (localMealPlan || [])
        .map((item) => ({
          id: item.id,
          recipe_id: item.recipeId,
          recipe_name: item.recipeName,
          recipe_image: '/placeholder.svg',
          day_of_week: DAY_INDEX_BY_LABEL[item.day],
          meal_type: SLOT_BY_LABEL[item.mealType],
        }))
        .filter((item) => item.day_of_week !== undefined && item.meal_type !== undefined) as PlannedMeal[];

      let allItems = localItems;

      if (allItems.length === 0) {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          const { data: plan } = await supabase
            .from('meal_plans')
            .select('id')
            .eq('user_id', session.user.id)
            .eq('week_start', weekStart)
            .maybeSingle();

          if (plan?.id) {
            const { data: planItems } = await supabase
              .from('meal_plan_items')
              .select('*')
              .eq('meal_plan_id', plan.id)
              .order('day_of_week')
              .order('sort_order');

            allItems = (planItems || []).map(toPlannedMeal);
          }
        }
      }
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
  }, [localMealPlan]);

  return { meal, nextMeal, loading };
}
