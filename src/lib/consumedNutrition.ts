import type { CookedMeal } from "@/hooks/useCookedMeals";

export interface NutritionSnapshot {
  calories?: number;
  protein?: number;
  carbs?: number;
  fat?: number;
  fiber?: number;
  sugar?: number;
  sodium?: number;
  saturated_fat?: number;
  cholesterol?: number;
  health_score?: number;
}

export interface ConsumedNutritionSummary {
  totalMeals: number;
  coveredMeals: number;
  coveredRecipes: number;
  totals: Required<NutritionSnapshot>;
  averageHealthScore: number;
}

const NUMERIC_KEYS: Array<keyof Required<NutritionSnapshot>> = [
  "calories",
  "protein",
  "carbs",
  "fat",
  "fiber",
  "sugar",
  "sodium",
  "saturated_fat",
  "cholesterol",
  "health_score",
];

export function getConsumedNutritionSummary(
  meals: CookedMeal[],
  cachedNutrition: Record<string, NutritionSnapshot | undefined>,
): ConsumedNutritionSummary {
  const totals: Required<NutritionSnapshot> = {
    calories: 0,
    protein: 0,
    carbs: 0,
    fat: 0,
    fiber: 0,
    sugar: 0,
    sodium: 0,
    saturated_fat: 0,
    cholesterol: 0,
    health_score: 0,
  };

  let coveredMeals = 0;
  const coveredRecipes = new Set<string>();

  meals.forEach((meal) => {
    if (!meal.recipe_id) return;
    const nutrition = cachedNutrition[meal.recipe_id];
    if (!nutrition) return;

    coveredMeals += 1;
    coveredRecipes.add(meal.recipe_id);

    NUMERIC_KEYS.forEach((key) => {
      const value = nutrition[key];
      if (typeof value === "number" && Number.isFinite(value)) {
        totals[key] += value;
      }
    });
  });

  return {
    totalMeals: meals.length,
    coveredMeals,
    coveredRecipes: coveredRecipes.size,
    totals,
    averageHealthScore: coveredMeals > 0 ? totals.health_score / coveredMeals : 0,
  };
}
