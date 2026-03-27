import { useState, useCallback, useEffect, useMemo } from 'react';
import { useStore } from '@/lib/store';
import type { Recipe } from '@/data/recipes';
import { invokeAppFunction } from '@/lib/functionClient';
import { rankByRecommendation } from '@/lib/recommendations';
import { normalizeIngredients } from '@/lib/normalizeIngredients';
import { classifyMealType } from '@/lib/mealTimeUtils';
import { supabase } from '@/integrations/supabase/client';
import { canPubliclyShareImportedUrlRecipe, isImportedUrlRecipe } from '@/lib/importVisibilityPolicy';

const BROWSE_FEED_CACHE_KEY = 'munch:browse-feed-cache:v3';
const MAX_CACHED_BROWSE_RECIPES = 80;
const MAX_BROWSE_CACHE_CHARS = 250000;
const MAX_RECOMMENDATION_CANDIDATES = 180;
const MAX_TASTE_PROFILE_LIKES = 24;

// ✅ MealDB fetch constants — kept small to prevent main-thread saturation.
// Reduced from 26 letters to avoid freezing production on cold-start edge function timeouts.
const MEALDB_LETTERS = 'abcdefghijklm'.split('');
const MEALDB_MAX_RESULTS = 60;

/**
 * Yields control back to the browser between heavy processing steps.
 * Uses the Scheduler API when available (Chrome 115+), falls back to setTimeout(0).
 * This prevents long synchronous tasks from blocking user input and causing the
 * browser's "page unresponsive" dialog.
 */
function yieldToMain(): Promise<void> {
  const w = window as Window & { scheduler?: { yield?: () => Promise<void> } };
  if (w.scheduler?.yield) {
    return w.scheduler.yield();
  }
  return new Promise<void>((resolve) => setTimeout(resolve, 0));
}

function sanitizeCachedImage(image: unknown) {
  const value = typeof image === 'string' ? image.trim() : '';
  if (!value) return '';
  if (value.startsWith('data:image/') && value.length > 2000) {
    return '';
  }
  return value;
}

function sanitizeRecipeForCache(recipe: BrowseRecipe): BrowseRecipe {
  return {
    ...recipe,
    image: sanitizeCachedImage(recipe.image),
    raw_api_payload: undefined,
  };
}

function readCachedBrowseFeed() {
  if (typeof window === 'undefined') return [];

  for (const storage of [window.sessionStorage, window.localStorage]) {
    try {
      const cached = storage.getItem(BROWSE_FEED_CACHE_KEY);
      if (!cached) continue;
      if (cached.length > MAX_BROWSE_CACHE_CHARS) {
        storage.removeItem(BROWSE_FEED_CACHE_KEY);
        continue;
      }

      const parsed = JSON.parse(cached);
      if (!Array.isArray(parsed)) continue;

      const normalized = parsed
        .map(normalizeRecipe)
        .filter((recipe): recipe is BrowseRecipe => Boolean(recipe) && isBrowseVisibleRecipe(recipe));

      if (normalized.length > 0) return normalized;
    } catch {
      continue;
    }
  }

  return [];
}

function writeCachedBrowseFeed(recipes: BrowseRecipe[]) {
  if (typeof window === 'undefined') return;

  // Sanitize before writing to avoid accumulating large base64 images in localStorage,
  // which would cause a multi-second synchronous JSON.parse freeze on the next page load.
  const sanitized = recipes
    .slice(0, MAX_CACHED_BROWSE_RECIPES)
    .map(sanitizeRecipeForCache);
  try {
    const serialized = JSON.stringify(sanitized);
    if (serialized.length > MAX_BROWSE_CACHE_CHARS) {
      window.localStorage.removeItem(BROWSE_FEED_CACHE_KEY);
      window.sessionStorage.removeItem(BROWSE_FEED_CACHE_KEY);
      return;
    }
    window.sessionStorage.setItem(BROWSE_FEED_CACHE_KEY, serialized);
    window.localStorage.setItem(BROWSE_FEED_CACHE_KEY, serialized);
  } catch (e) {
    // If localStorage is full, try to clear old cache and retry once
    try {
      window.localStorage.removeItem(BROWSE_FEED_CACHE_KEY);
      window.sessionStorage.removeItem(BROWSE_FEED_CACHE_KEY);
    } catch {
      // Ignore — storage unavailable
    }
  }
}

interface BrowseRecipe extends Recipe {
  source: string;
  cuisine?: string;
  chef?: string | null;
}

function isBrowseVisibleRecipe(recipe: BrowseRecipe) {
  if (!isImportedUrlRecipe(recipe.source, recipe.source_url)) return true;
  return canPubliclyShareImportedUrlRecipe(recipe.source_url).allowed;
}

function normalizeText(value: string) {
  return value
    .toLowerCase()
    .replace(/https?:\/\/|www\./g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function normalizeUrl(value?: string) {
  if (!value) return '';
  try {
    const parsed = new URL(value);
    return `${parsed.hostname.replace(/^www\./, '')}${parsed.pathname}`.replace(/\/+$/, '').toLowerCase();
  } catch {
    return normalizeText(value);
  }
}

function extractIngredientTokens(recipe: BrowseRecipe) {
  return recipe.ingredients
    .slice(0, 4)
    .map((ingredient) => normalizeText(ingredient).split(' ').slice(-2).join(' '))
    .filter(Boolean)
    .join('|');
}

function buildRecipeDedupKeys(recipe: BrowseRecipe) {
  const normalizedName = normalizeText(recipe.name);
  const normalizedUrl = normalizeUrl(recipe.source_url);
  const ingredientTokens = extractIngredientTokens(recipe);

  return [
    normalizedUrl ? `url:${normalizedUrl}` : '',
    normalizedName ? `name:${normalizedName}` : '',
    normalizedName && ingredientTokens ? `fingerprint:${normalizedName}|${ingredientTokens}` : '',
  ].filter(Boolean);
}

function dedupeRecipes(recipes: BrowseRecipe[]) {
  const seen = new Set<string>();
  return recipes.filter((recipe) => {
    const keys = buildRecipeDedupKeys(recipe);
    if (keys.length === 0) return false;
    if (keys.some((key) => seen.has(key))) return false;
    keys.forEach((key) => seen.add(key));
    return recipe.ingredients.length > 0 && recipe.instructions.length > 0;
  });
}

function curateBrowseCatalog(recipes: BrowseRecipe[]) {
  const imported: BrowseRecipe[] = [];
  const community: BrowseRecipe[] = [];
  const external: BrowseRecipe[] = [];

  recipes.forEach((recipe) => {
    const source = String(recipe.source || '').toLowerCase();
    if (source === 'imported') {
      imported.push(recipe);
      return;
    }

    if (source === 'community' || source === 'community-seed') {
      community.push(recipe);
      return;
    }

    external.push(recipe);
  });

  const importedLimit = Math.max(8, Math.floor(recipes.length * 0.18));
  const importedPool = imported.slice(0, importedLimit);
  const curated: BrowseRecipe[] = [];
  let communityIndex = 0;
  let externalIndex = 0;
  let importedIndex = 0;

  while (
    communityIndex < community.length ||
    externalIndex < external.length ||
    importedIndex < importedPool.length
  ) {
    if (communityIndex < community.length) {
      curated.push(community[communityIndex]);
      communityIndex += 1;
    }

    for (let count = 0; count < 2 && externalIndex < external.length; count += 1) {
      curated.push(external[externalIndex]);
      externalIndex += 1;
    }

    if (importedIndex < importedPool.length && curated.length % 9 === 0) {
      curated.push(importedPool[importedIndex]);
      importedIndex += 1;
    }

    if (communityIndex >= community.length && externalIndex < external.length && importedIndex >= importedPool.length) {
      curated.push(...external.slice(externalIndex));
      break;
    }
  }

  return curated;
}

function orderSearchResults(recipes: BrowseRecipe[], query: string) {
  const loweredQuery = normalizeText(query);

  const scoreRecipe = (recipe: BrowseRecipe) => {
    const name = normalizeText(recipe.name);
    const chef = normalizeText(recipe.chef || '');
    const cuisine = normalizeText(recipe.cuisine || '');
    const tags = (recipe.tags || []).map((tag) => normalizeText(tag)).join(' ');
    const ingredients = (recipe.ingredients || []).map((ingredient) => normalizeText(ingredient)).join(' ');
    const instructions = (recipe.instructions || []).slice(0, 6).map((step) => normalizeText(step)).join(' ');
    const source = normalizeText(recipe.source || '');
    const sourceUrl = normalizeUrl(recipe.source_url);

    let score = 0;
    if (name === loweredQuery) score += 120;
    else if (name.startsWith(loweredQuery)) score += 80;
    else if (name.includes(loweredQuery)) score += 60;

    if (chef.includes(loweredQuery)) score += 24;
    if (cuisine.includes(loweredQuery)) score += 20;
    if (tags.includes(loweredQuery)) score += 18;
    if (ingredients.includes(loweredQuery)) score += 14;
    if (instructions.includes(loweredQuery)) score += 10;
    if (sourceUrl.includes(loweredQuery)) score += 22;
    if (source.includes(loweredQuery)) score += 8;

    const sourceKey = String(recipe.source || '').toLowerCase();
    if (sourceKey === 'community' || sourceKey === 'community-seed' || sourceKey === 'imported') {
      score += 6;
    }

    return score;
  };

  return [...recipes].sort((a, b) => scoreRecipe(b) - scoreRecipe(a));
}

function recipeMatchesSearch(recipe: BrowseRecipe, query: string) {
  const loweredQuery = normalizeText(query);
  if (!loweredQuery) return true;

  const searchableFields = [
    recipe.name,
    recipe.chef || '',
    recipe.cuisine || '',
    recipe.source || '',
    normalizeUrl(recipe.source_url),
    ...(recipe.tags || []),
    ...(recipe.ingredients || []),
    ...(recipe.instructions || []).slice(0, 6),
  ]
    .map((value) => normalizeText(String(value || '')))
    .filter(Boolean);

  return searchableFields.some((value) => value.includes(loweredQuery));
}

async function fetchPublicRecipesFallback(): Promise<BrowseRecipe[]> {
  const { data, error } = await supabase
    .from('recipes')
    .select('id, name, image, cook_time, difficulty, ingredients, instructions, tags, source, source_url, cuisine, chef, created_by, servings')
    .eq('is_public', true)
    .order('created_at', { ascending: false })
    .limit(450);

  if (error) throw error;

  return (data || [])
    .map(normalizeRecipe)
    .filter((recipe): recipe is BrowseRecipe => Boolean(recipe) && isBrowseVisibleRecipe(recipe));
}

async function fetchMealDbBrowseFallback(): Promise<BrowseRecipe[]> {
  // Capped at MEALDB_LETTERS (13) and MEALDB_MAX_RESULTS (60) to prevent
  // main-thread saturation. Fetching all 26 letters caused production freezes.
  const allMeals: any[] = [];

  for (let i = 0; i < MEALDB_LETTERS.length; i += 6) {
    const batch = MEALDB_LETTERS.slice(i, i + 6);
    const results = await Promise.allSettled(
      batch.map(async (letter) => {
        const response = await fetch(`https://www.themealdb.com/api/json/v1/1/search.php?f=${letter}`);
        const data = await response.json();
        return Array.isArray(data?.meals) ? data.meals : [];
      }),
    );
    results
      .filter((result): result is PromiseFulfilledResult<any[]> => result.status === 'fulfilled')
      .flatMap((result) => result.value)
      .forEach((meal) => allMeals.push(meal));

    if (allMeals.length >= MEALDB_MAX_RESULTS * 2) break;

    // Yield between batches so the browser can process user input
    await yieldToMain();
  }

  return allMeals
    .slice(0, MEALDB_MAX_RESULTS * 2)
    .map((meal: any) => normalizeRecipe({
      id: `mealdb-${meal.idMeal}`,
      name: meal.strMeal,
      image: meal.strMealThumb,
      cook_time: '30 min',
      difficulty: 'Intermediate',
      ingredients: Array.from({ length: 20 }, (_, index) => {
        const ingredient = String(meal[`strIngredient${index + 1}`] || '').trim();
        const measure = String(meal[`strMeasure${index + 1}`] || '').trim();
        return ingredient ? `${measure ? `${measure} ` : ''}${ingredient}`.trim() : '';
      }).filter(Boolean),
      tags: meal.strTags ? String(meal.strTags).split(',').map((tag: string) => tag.trim()) : [],
      instructions: typeof meal.strInstructions === 'string'
        ? meal.strInstructions.split(/\r?\n/).map((line: string) => line.trim()).filter(Boolean)
        : [],
      source: 'TheMealDB',
      source_url: meal.strSource || meal.strYoutube || undefined,
      raw_api_payload: meal,
      cuisine: meal.strArea || undefined,
    }))
    .filter((recipe): recipe is BrowseRecipe => Boolean(recipe))
    .slice(0, MEALDB_MAX_RESULTS);
}

function normalizeStringArray(value: unknown): string[] {
  if (Array.isArray(value)) return value.map((v) => String(v).trim()).filter(Boolean);
  if (typeof value === 'string') {
    return value
      .split(/\r?\n/)
      .map((s) => s.trim())
      .filter(Boolean);
  }
  return [];
}

function normalizeRecipe(raw: any): BrowseRecipe | null {
  const name = String(raw?.name || '').trim();
  const ingredients = normalizeIngredients(raw?.ingredients, raw?.raw_api_payload);
  const instructions = normalizeStringArray(raw?.instructions);

  if (!name || ingredients.length === 0 || instructions.length === 0) return null;

  return {
    id: String(raw.id),
    name,
    image: String(raw.image || '/placeholder.svg'),
    cook_time: String(raw.cook_time || '30 min'),
    difficulty: String(raw.difficulty || 'Intermediate'),
    ingredients,
    tags: normalizeStringArray(raw.tags),
    instructions,
    source: String(raw.source || 'TheMealDB'),
    source_url: raw.source_url ? String(raw.source_url) : undefined,
    raw_api_payload: raw.raw_api_payload ?? undefined,
    cuisine: raw.cuisine ? String(raw.cuisine) : undefined,
    chef: raw.chef ? String(raw.chef) : null,
    created_by: raw.created_by ? String(raw.created_by) : null,
  };
}

export function useBrowseFeed(options?: { includeMealDbFallback?: boolean; enabled?: boolean }) {
  // ✅ Default MealDB fallback to FALSE. It's expensive even when capped, and the
  // dashboard already passes false explicitly. The Swipe page should also pass false
  // unless MealDB content is specifically desired and the app is stable.
  const includeMealDbFallback = options?.includeMealDbFallback ?? false;
  const enabled = options?.enabled ?? true;
  const [cachedInitialRecipes] = useState<BrowseRecipe[]>(() => readCachedBrowseFeed());
  const [recipes, setRecipes] = useState<BrowseRecipe[]>(cachedInitialRecipes);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(cachedInitialRecipes.length > 0);
  const [searchResults, setSearchResults] = useState<BrowseRecipe[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [activeSearchQuery, setActiveSearchQuery] = useState('');
  const [kitchenPantryNames, setKitchenPantryNames] = useState<string[]>([]);
  const {
    likedRecipes,
    savedApiRecipes,
    userProfile,
    pantryList,
    activeKitchenId,
    kitchenViewMode,
  } = useStore();

  useEffect(() => {
    if (!enabled) {
      setKitchenPantryNames([]);
      return;
    }

    let cancelled = false;

    const loadKitchenPantry = async () => {
      if (!activeKitchenId || kitchenViewMode !== 'kitchen') {
        setKitchenPantryNames([]);
        return;
      }

      const { data, error } = await supabase
        .from('kitchen_pantry_items')
        .select('name')
        .eq('kitchen_id', activeKitchenId);

      if (error) {
        console.error('Kitchen pantry load error:', error);
        if (!cancelled) setKitchenPantryNames([]);
        return;
      }

      if (!cancelled) {
        setKitchenPantryNames(
          (data || [])
            .map((item: any) => String(item.name || '').trim())
            .filter(Boolean),
        );
      }
    };

    void loadKitchenPantry();

    return () => {
      cancelled = true;
    };
  }, [activeKitchenId, enabled, kitchenViewMode]);

  const effectivePantryNames = useMemo(() => {
    if (activeKitchenId && kitchenViewMode === 'kitchen') {
      return kitchenPantryNames;
    }
    return pantryList.map((p) => p.name);
  }, [activeKitchenId, kitchenPantryNames, kitchenViewMode, pantryList]);

  const diversifyBrowseOrder = useCallback((rankedRecipes: BrowseRecipe[]) => {
    const desserts = rankedRecipes.filter((recipe) => classifyMealType(recipe).includes('dessert'));
    const mains = rankedRecipes.filter((recipe) => !classifyMealType(recipe).includes('dessert'));

    if (desserts.length === 0 || mains.length === 0) return rankedRecipes;

    const reordered: BrowseRecipe[] = [];
    let mainIndex = 0;
    let dessertIndex = 0;

    while (mainIndex < mains.length || dessertIndex < desserts.length) {
      for (let count = 0; count < 3 && mainIndex < mains.length; count += 1) {
        reordered.push(mains[mainIndex]);
        mainIndex += 1;
      }

      if (dessertIndex < desserts.length) {
        reordered.push(desserts[dessertIndex]);
        dessertIndex += 1;
      }

      if (mainIndex >= mains.length && dessertIndex < desserts.length) {
        reordered.push(...desserts.slice(dessertIndex));
        break;
      }
    }

    return reordered;
  }, []);

  const loadFeed = useCallback(async () => {
    if (!enabled) {
      setLoading(false);
      return;
    }

    if (loaded || loading) return;
    setLoading(true);

    try {
      const likedIds = new Set(likedRecipes);
      let fetched: BrowseRecipe[] = [];

      const edgePromise = (async () => {
        const { data, error } = await invokeAppFunction('search-recipes', {
          body: { mode: 'browse' },
        });
        if (error) throw error;

        return (data?.recipes || [])
          .map(normalizeRecipe)
          .filter((recipe): recipe is BrowseRecipe => Boolean(recipe) && !likedIds.has(String(recipe.id)));
      })();

      const quickFallbackPromise = fetchPublicRecipesFallback()
        .then((results) => results.filter((recipe) => !likedIds.has(String(recipe.id))));

      const timeoutPromise = new Promise<null>((resolve) => {
        window.setTimeout(() => resolve(null), 1200);
      });

      const earlyResult = await Promise.race([
        edgePromise.then((results) => ({ type: 'edge' as const, recipes: results })).catch((error) => {
          console.error('Browse feed edge fallback triggered:', error);
          return { type: 'edge' as const, recipes: [] as BrowseRecipe[] };
        }),
        quickFallbackPromise.then((results) => ({ type: 'public' as const, recipes: results })).catch(() => ({ type: 'public' as const, recipes: [] as BrowseRecipe[] })),
        timeoutPromise,
      ]);

      if (earlyResult && earlyResult.recipes.length > 0) {
        const earlyCurated = curateBrowseCatalog(dedupeRecipes(earlyResult.recipes));
        if (earlyCurated.length > 0) {
          setRecipes(earlyCurated);
        }
      }

      try {
        fetched = await edgePromise;
      } catch (edgeError) {
        console.error('Browse feed edge fallback triggered:', edgeError);
      }

      if (fetched.length === 0) {
        fetched = await quickFallbackPromise;
      }

      // Yield before heavy processing so the browser can handle any pending input
      await yieldToMain();

      const externalCount = fetched.filter((recipe) => {
        const source = String(recipe.source || '').toLowerCase();
        return source !== 'imported' && source !== 'community' && source !== 'community-seed';
      }).length;

      if (includeMealDbFallback && (fetched.length < 80 || externalCount < 30)) {
        const mealDbFallback = await fetchMealDbBrowseFallback();
        fetched = dedupeRecipes([
          ...fetched,
          ...mealDbFallback.filter((recipe) => !likedIds.has(String(recipe.id))),
        ]);
      } else {
        fetched = dedupeRecipes(fetched);
      }

      // Yield again before ranking (most expensive step)
      await yieldToMain();

      fetched = curateBrowseCatalog(fetched);

      const likedRecipesList: Recipe[] = likedRecipes
        .slice(-MAX_TASTE_PROFILE_LIKES)
        .map((id) => savedApiRecipes[id])
        .filter(Boolean);

      let nextRecipes: BrowseRecipe[];

      if (likedRecipesList.length > 0 || userProfile.cuisinePreferences.length > 0 || userProfile.skillLevel || effectivePantryNames.length > 0) {
        const priorityPool = fetched.slice(0, MAX_RECOMMENDATION_CANDIDATES);
        const overflowPool = fetched.slice(MAX_RECOMMENDATION_CANDIDATES);

        // Yield before the ranking computation — this is the most CPU-intensive step
        await yieldToMain();

        const ranked = rankByRecommendation(priorityPool, likedRecipesList, likedIds, userProfile, effectivePantryNames);
        nextRecipes = diversifyBrowseOrder([
          ...ranked.map((item) => item.recipe as BrowseRecipe),
          ...overflowPool,
        ]);
      } else {
        const shuffled = [...fetched].sort(() => Math.random() - 0.5);
        nextRecipes = diversifyBrowseOrder(shuffled);
      }

      setRecipes(nextRecipes);

      // Write cache in a deferred task so it doesn't block the render
      window.setTimeout(() => writeCachedBrowseFeed(nextRecipes), 0);

      setLoaded(true);
    } catch (e) {
      console.error('Browse feed error:', e);
    } finally {
      setLoading(false);
    }
  }, [enabled, loaded, loading, likedRecipes, savedApiRecipes, userProfile, effectivePantryNames, diversifyBrowseOrder, includeMealDbFallback]);

  const searchFeed = useCallback(async (query: string) => {
    const trimmedQuery = query.trim();
    if (!trimmedQuery) {
      setActiveSearchQuery('');
      setSearchResults([]);
      setSearchLoading(false);
      return;
    }

    setSearchLoading(true);

    try {
      const likedIds = new Set(likedRecipes);
      const { data, error } = await invokeAppFunction('search-recipes', {
        body: { mode: 'search', query: trimmedQuery },
      });

      if (error) throw error;

      const fetched = (data?.recipes || [])
        .map(normalizeRecipe)
        .filter((recipe): recipe is BrowseRecipe => Boolean(recipe) && !likedIds.has(String(recipe.id)));

      await yieldToMain();

      const localMatches = dedupeRecipes([
        ...recipes.filter((recipe) => !likedIds.has(String(recipe.id)) && recipeMatchesSearch(recipe, trimmedQuery)),
        ...readCachedBrowseFeed().filter((recipe) => !likedIds.has(String(recipe.id)) && recipeMatchesSearch(recipe, trimmedQuery)),
      ]);

      const deduped = dedupeRecipes([...fetched, ...localMatches]);
      const ordered = orderSearchResults(deduped, trimmedQuery);

      await yieldToMain();

      if (likedRecipes.length > 0 || userProfile.cuisinePreferences.length > 0 || userProfile.skillLevel || effectivePantryNames.length > 0) {
        const likedRecipesList: Recipe[] = likedRecipes
          .slice(-MAX_TASTE_PROFILE_LIKES)
          .map((id) => savedApiRecipes[id])
          .filter(Boolean);
        const priorityPool = ordered.slice(0, MAX_RECOMMENDATION_CANDIDATES);
        const overflowPool = ordered.slice(MAX_RECOMMENDATION_CANDIDATES);
        const ranked = rankByRecommendation(priorityPool, likedRecipesList, likedIds, userProfile, effectivePantryNames);
        setSearchResults([
          ...ranked.map((item) => item.recipe as BrowseRecipe),
          ...overflowPool,
        ]);
      } else {
        setSearchResults(ordered);
      }
      setActiveSearchQuery(trimmedQuery);
    } catch (error) {
      console.error('Search feed error:', error);
      const catchLikedIds = new Set(likedRecipes);
      const localFallback = orderSearchResults(
        dedupeRecipes(
          recipes.filter((recipe) => !catchLikedIds.has(String(recipe.id)) && recipeMatchesSearch(recipe, trimmedQuery)),
        ),
        trimmedQuery,
      );
      setSearchResults(localFallback);
      setActiveSearchQuery(trimmedQuery);
    } finally {
      setSearchLoading(false);
    }
  }, [effectivePantryNames, likedRecipes, recipes, savedApiRecipes, userProfile]);

  return {
    recipes,
    loading,
    loaded,
    loadFeed,
    searchFeed,
    searchResults,
    searchLoading,
    activeSearchQuery,
  };
}
