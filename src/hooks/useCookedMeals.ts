import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

const LOCAL_KEY = "munch_local_cooked_meals";

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

    const getLocalMeals = (): CookedMeal[] => {
      try {
        const raw = localStorage.getItem(LOCAL_KEY);
        if (!raw) return [];
        const parsed = JSON.parse(raw) as CookedMeal[];
        return Array.isArray(parsed) ? parsed : [];
      } catch {
        return [];
      }
    };

    if (!session?.user) {
      setMeals(getLocalMeals().slice(0, limit));
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
      setMeals(getLocalMeals().slice(0, limit));
      setLoading(false);
      return;
    }

    const remoteMeals = (data || []) as CookedMeal[];
    const localMeals = getLocalMeals();
    const merged = [...remoteMeals];
    const existingIds = new Set(remoteMeals.map((meal) => meal.id));
    for (const localMeal of localMeals) {
      if (!existingIds.has(localMeal.id)) merged.push(localMeal);
    }

    merged.sort((a, b) => new Date(b.cooked_at).getTime() - new Date(a.cooked_at).getTime());
    setMeals(merged.slice(0, limit));
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
    const localMeal: CookedMeal = {
      id: crypto.randomUUID(),
      recipe_id: input.recipeId,
      recipe_name: input.recipeName,
      cooked_at: new Date().toISOString(),
      estimated_savings: null,
      metadata: {
        cook_time: input.cookTime ?? null,
        ingredient_count: input.ingredientCount ?? null,
      },
    };

    try {
      const raw = localStorage.getItem(LOCAL_KEY);
      const parsed = raw ? (JSON.parse(raw) as CookedMeal[]) : [];
      const next = [localMeal, ...(Array.isArray(parsed) ? parsed : [])].slice(0, 200);
      localStorage.setItem(LOCAL_KEY, JSON.stringify(next));
    } catch {
      // Ignore local storage failures.
    }

    setMeals((prev) => [localMeal, ...prev].slice(0, limit));

    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) return;

    const { data: inserted } = await supabase.from("cooked_meals").insert({
      user_id: session.user.id,
      recipe_id: input.recipeId,
      recipe_name: input.recipeName,
      metadata: {
        cook_time: input.cookTime ?? null,
        ingredient_count: input.ingredientCount ?? null,
      },
    }).select("id, recipe_id, recipe_name, cooked_at, estimated_savings, metadata").maybeSingle();

    if (inserted) {
      setMeals((prev) => {
        const filtered = prev.filter((meal) => meal.id !== localMeal.id);
        return [inserted as CookedMeal, ...filtered].slice(0, limit);
      });
    }
  }, [limit]);

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
