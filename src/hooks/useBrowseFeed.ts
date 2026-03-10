import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useStore } from '@/lib/store';
import type { Recipe } from '@/data/recipes';
import { rankByRecommendation } from '@/lib/recommendations';
import { normalizeIngredients } from '@/lib/normalizeIngredients';

interface BrowseRecipe extends Recipe {
  source: string;
  cuisine?: string;
  chef?: string | null;
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
  };
}

export function useBrowseFeed() {
  const [recipes, setRecipes] = useState<BrowseRecipe[]>([]);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const { likedRecipes, savedApiRecipes, userProfile, pantryList } = useStore();

  const loadFeed = useCallback(async () => {
    if (loaded || loading) return;
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('search-recipes', {
        body: { mode: 'browse' },
      });
      if (error) throw error;

      const likedIds = new Set(likedRecipes);

      const fetched: BrowseRecipe[] = (data?.recipes || [])
        .map(normalizeRecipe)
        .filter((recipe): recipe is BrowseRecipe => Boolean(recipe) && !likedIds.has(String(recipe.id)));

      const pantryNames = pantryList.map(p => p.name);
      const likedRecipesList: Recipe[] = likedRecipes
        .map((id) => savedApiRecipes[id])
        .filter(Boolean);

      if (likedRecipesList.length > 0 || userProfile.cuisinePreferences.length > 0 || userProfile.skillLevel || pantryNames.length > 0) {
        const ranked = rankByRecommendation(fetched, likedRecipesList, likedIds, userProfile, pantryNames);
        setRecipes(ranked.map((item) => item.recipe as BrowseRecipe));
      } else {
        const shuffled = [...fetched].sort(() => Math.random() - 0.5);
        setRecipes(shuffled);
      }

      setLoaded(true);
    } catch (e) {
      console.error('Browse feed error:', e);
    } finally {
      setLoading(false);
    }
  }, [loaded, loading, likedRecipes, savedApiRecipes, userProfile, pantryList]);

  return { recipes, loading, loaded, loadFeed };
}
