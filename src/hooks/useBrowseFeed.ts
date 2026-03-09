import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useStore } from '@/lib/store';
import type { Recipe } from '@/data/recipes';
import { rankByRecommendation } from '@/lib/recommendations';

interface BrowseRecipe extends Recipe {
  source: string;
  cuisine?: string;
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
      const fetched: BrowseRecipe[] = (data?.recipes || []).filter(
        (r: BrowseRecipe) => r.name && r.ingredients.length > 0 && r.instructions.length > 0
      );
      
      // Build liked recipes list for recommendation algorithm
      const likedRecipesList: Recipe[] = likedRecipes
        .map((id) => savedApiRecipes[id])
        .filter(Boolean);
      
      // Rank by recommendation score if user has liked recipes
      if (likedRecipesList.length > 0) {
        const likedIds = new Set(likedRecipes);
        const ranked = rankByRecommendation(fetched, likedRecipesList, likedIds);
        setRecipes(ranked.map((item) => item.recipe as BrowseRecipe));
      } else {
        // Shuffle for new users (discovery mode)
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
