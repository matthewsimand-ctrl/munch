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

export function isMunchSeedRecipe(recipe: Recipe) {
  return String(recipe.source || '').toLowerCase() === 'community-seed';
}

export function isMunchAuthoredRecipe(recipe: Recipe) {
  return isMunchSeedRecipe(recipe) || String(recipe.chef || '').trim().toLowerCase() === 'munch';
}

export function isImportedUrlRecipe(recipe: Recipe) {
  return isImportedCommunityRecipe(recipe) && Boolean(String(recipe.source_url || '').trim());
}

export function getRecipeSourceHostname(url: string | undefined): string | null {
  if (!url) return null;

  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return null;
  }
}

export function getRecipeSharedByName(recipe: Recipe): string | null {
  const payload = getRawPayload(recipe);
  const sharedBy = payload?.shared_by_name;
  return typeof sharedBy === 'string' && sharedBy.trim() ? sharedBy.trim() : null;
}

export function getRecipeSourceBadge(recipe: Recipe): string | null {
  if (isMunchAuthoredRecipe(recipe)) return 'munch';

  if (!isImportedCommunityRecipe(recipe)) return null;

  if (isImportedUrlRecipe(recipe)) {
    return getRecipeSourceHostname(recipe.source_url) || 'Imported recipe';
  }

  if (recipe.chef?.trim()) return recipe.chef.trim();

  return 'Community recipe';
}
