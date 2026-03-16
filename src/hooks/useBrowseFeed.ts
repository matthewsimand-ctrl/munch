import { useState, useCallback, useEffect, useMemo } from 'react';
import { useStore } from '@/lib/store';
import type { Recipe } from '@/data/recipes';
import { invokeAppFunction } from '@/lib/functionClient';
import { rankByRecommendation } from '@/lib/recommendations';
import { normalizeIngredients } from '@/lib/normalizeIngredients';
import { classifyMealType } from '@/lib/mealTimeUtils';
import { supabase } from '@/integrations/supabase/client';

const BROWSE_FEED_CACHE_KEY = 'munch:browse-feed-cache:v2';

function readCachedBrowseFeed() {
  if (typeof window === 'undefined') return [];

  for (const storage of [window.sessionStorage, window.localStorage]) {
    try {
      const cached = storage.getItem(BROWSE_FEED_CACHE_KEY);
      if (!cached) continue;

      const parsed = JSON.parse(cached);
      if (!Array.isArray(parsed)) continue;

      const normalized = parsed
        .map(normalizeRecipe)
        .filter((recipe): recipe is BrowseRecipe => Boolean(recipe));

      if (normalized.length > 0) return normalized;
    } catch {
      continue;
    }
  }

  return [];
}

function writeCachedBrowseFeed(recipes: BrowseRecipe[]) {
  if (typeof window === 'undefined') return;

  const serialized = JSON.stringify(recipes);
  window.sessionStorage.setItem(BROWSE_FEED_CACHE_KEY, serialized);
  window.localStorage.setItem(BROWSE_FEED_CACHE_KEY, serialized);
}

interface BrowseRecipe extends Recipe {
  source: string;
  cuisine?: string;
  chef?: string | null;
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

    let score = 0;
    if (name === loweredQuery) score += 120;
    else if (name.startsWith(loweredQuery)) score += 80;
    else if (name.includes(loweredQuery)) score += 60;

    if (chef.includes(loweredQuery)) score += 24;
    if (cuisine.includes(loweredQuery)) score += 20;
    if (tags.includes(loweredQuery)) score += 18;
    if (ingredients.includes(loweredQuery)) score += 14;
    if (instructions.includes(loweredQuery)) score += 10;
    if (source.includes(loweredQuery)) score += 8;

    const sourceKey = String(recipe.source || '').toLowerCase();
    if (sourceKey === 'community' || sourceKey === 'community-seed' || sourceKey === 'imported') {
      score += 6;
    }

    return score;
  };

  return [...recipes].sort((a, b) => scoreRecipe(b) - scoreRecipe(a));
}

async function fetchPublicRecipesFallback(): Promise<BrowseRecipe[]> {
  const { data, error } = await supabase
    .from('recipes')
    .select('*')
    .eq('is_public', true)
    .order('created_at', { ascending: false })
    .limit(450);

  if (error) throw error;

  return (data || [])
    .map(normalizeRecipe)
    .filter((recipe): recipe is BrowseRecipe => Boolean(recipe));
}

async function fetchMealDbBrowseFallback(): Promise<BrowseRecipe[]> {
  const letters = 'abcdefghijklmnopqrstuvwxyz'.split('');
  const results = await Promise.allSettled(
    letters.map(async (letter) => {
      const response = await fetch(`https://www.themealdb.com/api/json/v1/1/search.php?f=${letter}`);
      const data = await response.json();
      return Array.isArray(data?.meals) ? data.meals : [];
    }),
  );

  return results
    .filter((result): result is PromiseFulfilledResult<any[]> => result.status === 'fulfilled')
    .flatMap((result) => result.value)
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
      tags: meal.strTags ? String(meal.strTags).split(',').map((tag) => tag.trim()) : [],
      instructions: typeof meal.strInstructions === 'string'
        ? meal.strInstructions.split(/\r?\n/).map((line: string) => line.trim()).filter(Boolean)
        : [],
      source: 'TheMealDB',
      source_url: meal.strSource || meal.strYoutube || undefined,
      raw_api_payload: meal,
      cuisine: meal.strArea || undefined,
    }))
    .filter((recipe): recipe is BrowseRecipe => Boolean(recipe));
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

export function useBrowseFeed() {
  const [recipes, setRecipes] = useState<BrowseRecipe[]>(() => readCachedBrowseFeed());
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(() => {
    if (typeof window === 'undefined') return false;
    return readCachedBrowseFeed().length > 0;
  });
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
  }, [activeKitchenId, kitchenViewMode]);

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

      const externalCount = fetched.filter((recipe) => {
        const source = String(recipe.source || '').toLowerCase();
        return source !== 'imported' && source !== 'community' && source !== 'community-seed';
      }).length;

      if (fetched.length < 220 || externalCount < 120) {
        const mealDbFallback = await fetchMealDbBrowseFallback();
        fetched = dedupeRecipes([
          ...fetched,
          ...mealDbFallback.filter((recipe) => !likedIds.has(String(recipe.id))),
        ]);
      } else {
        fetched = dedupeRecipes(fetched);
      }

      fetched = curateBrowseCatalog(fetched);

      const likedRecipesList: Recipe[] = likedRecipes
        .map((id) => savedApiRecipes[id])
        .filter(Boolean);

      if (likedRecipesList.length > 0 || userProfile.cuisinePreferences.length > 0 || userProfile.skillLevel || effectivePantryNames.length > 0) {
        const ranked = rankByRecommendation(fetched, likedRecipesList, likedIds, userProfile, effectivePantryNames);
        const nextRecipes = diversifyBrowseOrder(ranked.map((item) => item.recipe as BrowseRecipe));
        setRecipes(nextRecipes);
        writeCachedBrowseFeed(nextRecipes);
      } else {
        const shuffled = [...fetched].sort(() => Math.random() - 0.5);
        const nextRecipes = diversifyBrowseOrder(shuffled);
        setRecipes(nextRecipes);
        writeCachedBrowseFeed(nextRecipes);
      }

      setLoaded(true);
    } catch (e) {
      console.error('Browse feed error:', e);
    } finally {
      setLoading(false);
    }
  }, [loaded, loading, likedRecipes, savedApiRecipes, userProfile, effectivePantryNames, diversifyBrowseOrder]);

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

      const deduped = dedupeRecipes(fetched);
      const ordered = orderSearchResults(deduped, trimmedQuery);

      if (likedRecipes.length > 0 || userProfile.cuisinePreferences.length > 0 || userProfile.skillLevel || effectivePantryNames.length > 0) {
        const likedRecipesList: Recipe[] = likedRecipes
          .map((id) => savedApiRecipes[id])
          .filter(Boolean);
        const ranked = rankByRecommendation(ordered, likedRecipesList, likedIds, userProfile, effectivePantryNames);
        setSearchResults(ranked.map((item) => item.recipe as BrowseRecipe));
      } else {
        setSearchResults(ordered);
      }
      setActiveSearchQuery(trimmedQuery);
    } catch (error) {
      console.error('Search feed error:', error);
      setSearchResults([]);
      setActiveSearchQuery(trimmedQuery);
    } finally {
      setSearchLoading(false);
    }
  }, [effectivePantryNames, likedRecipes, savedApiRecipes, userProfile]);

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
