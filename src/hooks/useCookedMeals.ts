import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface CookedMeal {
  id: string;
  recipe_id: string;
  recipe_name: string;
  cooked_at: string;
  estimated_savings: number | null;
  metadata: { cook_time?: string | null; ingredient_count?: number | null } | null;
}

function estimateSavingsFromRecipe(input: { cookTime?: string; ingredientCount?: number }) {
  const cookMinutes = Number.parseInt((input.cookTime || "").replace(/[^0-9]/g, ""), 10) || 30;
  const ingredientCount = Math.max(3, input.ingredientCount ?? 6);

  const atHomeCost = 2.5 + ingredientCount * 0.85 + cookMinutes * 0.03;
  const eatOutCost = 10 + ingredientCount * 0.9 + cookMinutes * 0.05;
  const savings = Math.max(2, eatOutCost - atHomeCost);

  return Number(savings.toFixed(2));
}

export function useCookedMeals(limit = 12) {
  const [meals, setMeals] = useState<CookedMeal[]>([]);
  const [loading, setLoading] = useState(true);

  const loadMeals = useCallback(async () => {
    setLoading(true);
    const { data: { session } } = await supabase.auth.getSession();

    if (!session?.user) {
      setMeals([]);
      setLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from("cooked_meals")
      .select("id, recipe_id, recipe_name, cooked_at, estimated_savings, metadata")
      .eq("user_id", session.user.id)
      .order("cooked_at", { ascending: false })
      .limit(limit);

    if (error) {
      setMeals([]);
      setLoading(false);
      return;
    }

    setMeals((data || []) as CookedMeal[]);
    setLoading(false);
  }, [limit]);

  useEffect(() => {
    loadMeals();

    const { data: authListener } = supabase.auth.onAuthStateChange(() => {
      loadMeals();
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, [loadMeals]);

  const trackCookedMeal = useCallback(async (input: {
    recipeId: string;
    recipeName: string;
    cookTime?: string;
    ingredientCount?: number;
  }) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) return;

    await supabase.from("cooked_meals").insert({
      user_id: session.user.id,
      recipe_id: input.recipeId,
      recipe_name: input.recipeName,
      metadata: {
        cook_time: input.cookTime ?? null,
        ingredient_count: input.ingredientCount ?? null,
      },
    });
  }, []);

  const estimateMealSavings = useCallback(async (meal: CookedMeal) => {
    const estimated = estimateSavingsFromRecipe({
      cookTime: meal.metadata?.cook_time ?? undefined,
      ingredientCount: meal.metadata?.ingredient_count ?? undefined,
    });

    const { data: updated, error } = await supabase
      .from("cooked_meals")
      .update({ estimated_savings: estimated })
      .eq("id", meal.id)
      .select("id, recipe_id, recipe_name, cooked_at, estimated_savings, metadata")
      .maybeSingle();

    if (error || !updated) return null;

    setMeals((prev) => prev.map((item) => (item.id === meal.id ? (updated as CookedMeal) : item)));
    return updated as CookedMeal;
  }, []);

  return { meals, loading, loadMeals, trackCookedMeal, estimateMealSavings };
}
