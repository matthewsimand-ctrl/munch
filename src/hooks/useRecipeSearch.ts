import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Recipe } from '@/data/recipes';
import { useToast } from '@/hooks/use-toast';
import { useStore } from '@/lib/store';
import { normalizeIngredients } from '@/lib/normalizeIngredients';
import { isPremiumSession } from '@/lib/premium';

interface APIRecipe extends Recipe {
  source: string;
}

function isUrl(str: string): boolean {
  return /^https?:\/\//i.test(str.trim()) || /^www\./i.test(str.trim());
}

export function useRecipeSearch() {
  const [apiRecipes, setApiRecipes] = useState<APIRecipe[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const { toast } = useToast();
  const { likeRecipe } = useStore();

  const search = useCallback(async (query: string) => {
    if (!query.trim()) return;
    setLoading(true);
    setSearched(true);

    try {
      // If the query is a URL, use the import-recipe function instead
      if (isUrl(query.trim())) {
        const { data: sessionData } = await supabase.auth.getSession();
        if (!isPremiumSession(sessionData.session)) {
          toast({
            title: 'Premium required',
            description: 'AI URL imports are only available on Premium.',
            variant: 'destructive',
          });
          setApiRecipes([]);
          setLoading(false);
          return;
        }

        const { data, error } = await supabase.functions.invoke('import-recipe', {
          body: { url: query.trim() },
        });

        if (error || !data?.success) {
          toast({
            title: 'Could not import recipe',
            description: data?.error || error?.message || 'Failed to extract recipe from URL',
            variant: 'destructive',
          });
          setApiRecipes([]);
          setLoading(false);
          return;
        }

        const recipe = data.recipe;
        const id = `imported-${Date.now()}`;
        const recipeData: APIRecipe = {
          id,
          name: recipe.name,
          ingredients: normalizeIngredients(recipe.ingredients, recipe.raw_api_payload),
          instructions: recipe.instructions || [],
          cook_time: recipe.cook_time || '30 min',
          difficulty: recipe.difficulty || 'Intermediate',
          tags: recipe.tags || [],
          image: recipe.image || '/placeholder.svg',
          source: 'Imported',
        };

        setApiRecipes([recipeData]);
        toast({ title: `Found "${recipe.name}" from URL!` });
        setLoading(false);
        return;
      }

      // Normal keyword search
      const { data, error } = await supabase.functions.invoke('search-recipes', {
        body: { query },
      });
      if (error) throw error;
      const recipes: APIRecipe[] = (data?.recipes || [])
        .map((recipe: APIRecipe) => ({
          ...recipe,
          ingredients: normalizeIngredients((recipe as any).ingredients, (recipe as any).raw_api_payload),
        }))
        .filter((r: APIRecipe) => r.name && r.ingredients.length > 0 && r.instructions.length > 0);
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
  }, [toast, likeRecipe]);

  return { apiRecipes, loading, searched, search };
}
