import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { Recipe } from '@/data/recipes';

interface BrowseRecipe extends Recipe {
  source: string;
  cuisine?: string;
}

export function useBrowseFeed() {
  const [recipes, setRecipes] = useState<BrowseRecipe[]>([]);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);

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
      setRecipes(fetched);
      setLoaded(true);
    } catch (e) {
      console.error('Browse feed error:', e);
    } finally {
      setLoading(false);
    }
  }, [loaded, loading]);

  return { recipes, loading, loaded, loadFeed };
}
