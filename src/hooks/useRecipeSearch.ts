import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Recipe } from '@/data/recipes';
import { useToast } from '@/hooks/use-toast';

interface APIRecipe extends Recipe {
  source: string;
}

export function useRecipeSearch() {
  const [apiRecipes, setApiRecipes] = useState<APIRecipe[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const { toast } = useToast();

  const search = useCallback(async (query: string) => {
    if (!query.trim()) return;
    setLoading(true);
    setSearched(true);
    try {
      const { data, error } = await supabase.functions.invoke('search-recipes', {
        body: { query },
      });
      if (error) throw error;
      const recipes: APIRecipe[] = (data?.recipes || []).filter(
        (r: APIRecipe) => r.name && r.ingredients.length > 0 && r.instructions.length > 0
      );
      setApiRecipes(recipes);
      if (recipes.length === 0) {
        toast({ title: 'No results', description: `No recipes found for "${query}"` });
      }
    } catch (e: any) {
      console.error('Recipe search error:', e);
      toast({ title: 'Search failed', description: e.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  return { apiRecipes, loading, searched, search };
}
