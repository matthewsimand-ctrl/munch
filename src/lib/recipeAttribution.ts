import type { Recipe } from '@/data/recipes';

function getRawPayload(recipe: Recipe | null | undefined): Record<string, unknown> | null {
  if (!recipe) return null;
  if (!recipe.raw_api_payload || typeof recipe.raw_api_payload !== 'object' || Array.isArray(recipe.raw_api_payload)) {
    return null;
  }

  return recipe.raw_api_payload as Record<string, unknown>;
}

export function isImportedCommunityRecipe(recipe: Recipe | null | undefined) {
  if (!recipe) return false;
  const source = String(recipe.source || '').toLowerCase();
  if (source === 'imported') return true;
  if (source === 'themealdb' || source === 'spoonacular' || source === 'tasty') return false;
  if (isMunchAuthoredRecipe(recipe)) return false;
  return Boolean(getResolvedRecipeSourceUrl(recipe));
}

export function isMunchSeedRecipe(recipe: Recipe | null | undefined) {
  if (!recipe) return false;
  return String(recipe.source || '').toLowerCase() === 'community-seed' && !getResolvedRecipeSourceUrl(recipe);
}

export function isMunchAuthoredRecipe(recipe: Recipe | null | undefined) {
  if (!recipe) return false;
  return isMunchSeedRecipe(recipe) || String(recipe.chef || '').trim().toLowerCase() === 'munch';
}

export function isImportedUrlRecipe(recipe: Recipe | null | undefined) {
  if (!recipe) return false;
  return isImportedCommunityRecipe(recipe) && Boolean(getResolvedRecipeSourceUrl(recipe));
}

export function getResolvedRecipeSourceUrl(recipe: Recipe | null | undefined): string | null {
  if (!recipe) return null;

  const directSourceUrl = String(recipe.source_url || '').trim();
  if (directSourceUrl) return directSourceUrl;

  const payload = getRawPayload(recipe);
  const payloadSourceUrl = payload?.source_url;
  if (typeof payloadSourceUrl === 'string' && payloadSourceUrl.trim()) return payloadSourceUrl.trim();

  const originalSourceUrl = payload?.original_source_url;
  if (typeof originalSourceUrl === 'string' && originalSourceUrl.trim()) return originalSourceUrl.trim();

  return null;
}

export function getRecipeSourceHostname(url: string | undefined): string | null {
  if (!url) return null;

  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return null;
  }
}

export function getRecipeSharedByName(recipe: Recipe | null | undefined): string | null {
  const payload = getRawPayload(recipe);
  const sharedBy = payload?.shared_by_name;
  return typeof sharedBy === 'string' && sharedBy.trim() ? sharedBy.trim() : null;
}

export function getRecipeSourceBadge(recipe: Recipe | null | undefined): string | null {
  if (!recipe) return null;
  if (isMunchAuthoredRecipe(recipe)) return 'munch';

  if (!isImportedCommunityRecipe(recipe)) return null;

  if (isImportedUrlRecipe(recipe)) {
    return getRecipeSourceHostname(getResolvedRecipeSourceUrl(recipe) || undefined) || 'Imported recipe';
  }

  if (recipe.chef?.trim()) return recipe.chef.trim();

  return 'Community recipe';
}
