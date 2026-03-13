import type { Recipe } from '@/data/recipes';

function getRawPayload(recipe: Recipe): Record<string, unknown> | null {
  if (!recipe.raw_api_payload || typeof recipe.raw_api_payload !== 'object' || Array.isArray(recipe.raw_api_payload)) {
    return null;
  }

  return recipe.raw_api_payload as Record<string, unknown>;
}

export function isImportedCommunityRecipe(recipe: Recipe) {
  return String(recipe.source || '').toLowerCase() === 'imported';
}

export function getRecipeSharedByName(recipe: Recipe): string | null {
  const payload = getRawPayload(recipe);
  const sharedBy = payload?.shared_by_name;
  return typeof sharedBy === 'string' && sharedBy.trim() ? sharedBy.trim() : null;
}

export function getRecipeSourceBadge(recipe: Recipe): string | null {
  if (!isImportedCommunityRecipe(recipe)) return null;

  const sharedBy = getRecipeSharedByName(recipe);
  if (sharedBy) return `Shared by ${sharedBy}`;

  if (recipe.source_url) {
    try {
      return new URL(recipe.source_url).hostname.replace(/^www\./, '');
    } catch {
      return 'Community import';
    }
  }

  return 'Community import';
}
