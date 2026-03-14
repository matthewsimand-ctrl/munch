import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

const LOCAL_KEY = "munch_local_cooked_meals";
const DUPLICATE_WINDOW_MS = 90 * 1000;

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

function isDuplicateCookSession(a: { recipe_id: string; cooked_at: string }, b: { recipe_id: string; cooked_at: string }) {
  if (a.recipe_id !== b.recipe_id) return false;
  return Math.abs(new Date(a.cooked_at).getTime() - new Date(b.cooked_at).getTime()) < DUPLICATE_WINDOW_MS;
}

function isCookedMealsTableMissing(error: { code?: string | null; message?: string | null; details?: string | null } | null) {
  const text = `${error?.code || ""} ${error?.message || ""} ${error?.details || ""}`.toLowerCase();
  return text.includes("cooked_meals")
    && (
      text.includes("404")
      || text.includes("pgrst205")
      || text.includes("42p01")
      || text.includes("could not find the table")
      || text.includes("relation")
    );
}

function readLocalMeals(): CookedMeal[] {
  try {
    const raw = localStorage.getItem(LOCAL_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as CookedMeal[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeLocalMeals(meals: CookedMeal[]) {
  try {
    localStorage.setItem(LOCAL_KEY, JSON.stringify(meals.slice(0, 200)));
  } catch {
    // Ignore local storage failures.
  }
}

export function useCookedMeals(limit = 12) {
  const [meals, setMeals] = useState<CookedMeal[]>([]);
  const [loading, setLoading] = useState(true);
  const cookedMealsTableUnavailableRef = useRef(false);

  const loadMeals = useCallback(async () => {
    setLoading(true);
    const { data: { session } } = await supabase.auth.getSession();

    if (!session?.user) {
      setMeals(readLocalMeals().slice(0, limit));
      setLoading(false);
      return;
    }

    if (cookedMealsTableUnavailableRef.current) {
      setMeals(readLocalMeals().slice(0, limit));
      setLoading(false);
      return;
    }

    const { data, error } = await (supabase as any)
      .from("cooked_meals")
      .select("id, recipe_id, recipe_name, cooked_at, estimated_savings, metadata")
      .eq("user_id", session.user.id)
      .order("cooked_at", { ascending: false })
      .limit(limit);

    if (error) {
      if (isCookedMealsTableMissing(error)) {
        cookedMealsTableUnavailableRef.current = true;
      }
      setMeals(readLocalMeals().slice(0, limit));
      setLoading(false);
      return;
    }

    const remoteMeals = (data || []) as CookedMeal[];
    const localMeals = readLocalMeals();
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
    const cookedAt = new Date().toISOString();
    const localMeal: CookedMeal = {
      id: crypto.randomUUID(),
      recipe_id: input.recipeId,
      recipe_name: input.recipeName,
      cooked_at: cookedAt,
      estimated_savings: null,
      metadata: {
        cook_time: input.cookTime ?? null,
        ingredient_count: input.ingredientCount ?? null,
      },
    };

    try {
      const existing = readLocalMeals();
      if (existing.some((meal) => isDuplicateCookSession(meal, localMeal))) return;

      writeLocalMeals([localMeal, ...existing]);
    } catch {}

    setMeals((prev) => {
      if (prev.some((meal) => isDuplicateCookSession(meal, localMeal))) return prev;
      return [localMeal, ...prev].slice(0, limit);
    });

    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) return;
    if (cookedMealsTableUnavailableRef.current) return;

    const { data: recentMeals, error: recentMealsError } = await supabase
      .from("cooked_meals")
      .select("id, recipe_id, recipe_name, cooked_at, estimated_savings, metadata")
      .eq("user_id", session.user.id)
      .eq("recipe_id", input.recipeId)
      .order("cooked_at", { ascending: false })
      .limit(1);

    if (recentMealsError) {
      if (isCookedMealsTableMissing(recentMealsError)) {
        cookedMealsTableUnavailableRef.current = true;
      }
      return;
    }

    const latest = (recentMeals?.[0] ?? null) as CookedMeal | null;
    if (latest && isDuplicateCookSession(latest, localMeal)) {
      setMeals((prev) => {
        const filtered = prev.filter((meal) => meal.id !== localMeal.id);
        return [latest, ...filtered].slice(0, limit);
      });
      return;
    }

    const { data: inserted, error: insertError } = await supabase.from("cooked_meals").insert({
      user_id: session.user.id,
      recipe_id: input.recipeId,
      recipe_name: input.recipeName,
      metadata: {
        cook_time: input.cookTime ?? null,
        ingredient_count: input.ingredientCount ?? null,
      },
    }).select("id, recipe_id, recipe_name, cooked_at, estimated_savings, metadata").maybeSingle();

    if (insertError) {
      if (isCookedMealsTableMissing(insertError)) {
        cookedMealsTableUnavailableRef.current = true;
      }
      return;
    }

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

    const applyLocalEstimate = (nextMeal: CookedMeal) => {
      setMeals((prev) => prev.map((item) => (item.id === nextMeal.id ? nextMeal : item)));

      const localMeals = readLocalMeals();
      if (localMeals.some((item) => item.id === nextMeal.id)) {
        writeLocalMeals(localMeals.map((item) => (item.id === nextMeal.id ? nextMeal : item)));
      }
    };

    if (cookedMealsTableUnavailableRef.current) {
      const locallyUpdated = { ...meal, estimated_savings: estimated };
      applyLocalEstimate(locallyUpdated);
      return locallyUpdated;
    }

    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) {
      const locallyUpdated = { ...meal, estimated_savings: estimated };
      applyLocalEstimate(locallyUpdated);
      return locallyUpdated;
    }

    const { data: updated, error } = await supabase
      .from("cooked_meals")
      .update({ estimated_savings: estimated })
      .eq("id", meal.id)
      .select("id, recipe_id, recipe_name, cooked_at, estimated_savings, metadata")
      .maybeSingle();

    if (error) {
      if (isCookedMealsTableMissing(error)) {
        cookedMealsTableUnavailableRef.current = true;
        const locallyUpdated = { ...meal, estimated_savings: estimated };
        applyLocalEstimate(locallyUpdated);
        return locallyUpdated;
      }
      return null;
    }

    if (!updated) {
      const locallyUpdated = { ...meal, estimated_savings: estimated };
      applyLocalEstimate(locallyUpdated);
      return locallyUpdated;
    }

    const updatedMeal = updated as CookedMeal;
    applyLocalEstimate(updatedMeal);
    return updatedMeal;
  }, []);

  return { meals, loading, loadMeals, trackCookedMeal, estimateMealSavings };
}
