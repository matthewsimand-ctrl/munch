import type { Recipe } from '@/data/recipes';
import { normalizeIngredients } from '@/lib/normalizeIngredients';

export function normalizeStringArray(value: unknown): string[] {
  if (Array.isArray(value)) return value.map((v) => String(v).trim()).filter(Boolean);
  if (typeof value === 'string') {
    return value
      .split(/\r?\n/)
      .map((s) => s.trim())
      .filter(Boolean);
  }
  return [];
}

export function normalizeRecipe(recipe: any, idFallback?: string): Recipe {
  return {
    ...recipe,
    id: String(recipe?.id || idFallback || ''),
    name: String(recipe?.name || 'Untitled Recipe'),
    image: String(recipe?.image || '/placeholder.svg'),
    cook_time: String(recipe?.cook_time || '30 min'),
    difficulty: String(recipe?.difficulty || 'Intermediate'),
    ingredients: normalizeIngredients(recipe?.ingredients, recipe?.raw_api_payload),
    instructions: normalizeStringArray(recipe?.instructions),
    tags: normalizeStringArray(recipe?.tags),
    cuisine: recipe?.cuisine || null,
    source: recipe?.source ? String(recipe.source) : undefined,
    source_url: recipe?.source_url ? String(recipe.source_url) : undefined,
    raw_api_payload: recipe?.raw_api_payload ?? undefined,
    created_by: recipe?.created_by ?? null,
    is_public: typeof recipe?.is_public === 'boolean' ? recipe.is_public : undefined,
    servings: Number(recipe?.servings || 4),
  };
}
