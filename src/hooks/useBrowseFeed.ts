import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useStore } from '@/lib/store';
import type { Recipe } from '@/data/recipes';
import { rankByRecommendation } from '@/lib/recommendations';

interface BrowseRecipe extends Recipe {
  source: string;
  cuisine?: string;
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
  const ingredients = normalizeStringArray(raw?.ingredients);
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
    cuisine: raw.cuisine ? String(raw.cuisine) : undefined,
  };
}

export function useBrowseFeed() {
  const [recipes, setRecipes] = useState<BrowseRecipe[]>([]);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const { likedRecipes, savedApiRecipes } = useStore();

  const loadFeed = useCallback(async () => {
    if (loaded || loading) return;
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('search-recipes', {
        body: { mode: 'browse' },
      });
      if (error) throw error;

      const fetched: BrowseRecipe[] = (data?.recipes || [])
        .map(normalizeRecipe)
        .filter(Boolean) as BrowseRecipe[];

      const likedRecipesList: Recipe[] = likedRecipes
        .map((id) => savedApiRecipes[id])
        .filter(Boolean);

      if (likedRecipesList.length > 0) {
        const likedIds = new Set(likedRecipes);
        const ranked = rankByRecommendation(fetched, likedRecipesList, likedIds);
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
  }, [loaded, loading, likedRecipes, savedApiRecipes]);

  return { recipes, loading, loaded, loadFeed };
}
