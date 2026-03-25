import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Recipe } from '@/data/recipes';
import { normalizeIngredients } from '@/lib/normalizeIngredients';

async function fetchRecipes(): Promise<Recipe[]> {
  const { data, error } = await supabase
    .from('recipes')
    .select('id, name, image, cook_time, difficulty, ingredients, instructions, tags, source, source_url, cuisine, chef, created_by, servings')
    .eq('is_public', true)
    .order('created_at', { ascending: false })
    .limit(200);

  if (error) throw error;

  return (data || []).map((r: any) => ({
    id: r.id,
    name: r.name,
    image: r.image,
    cook_time: r.cook_time,
    difficulty: r.difficulty,
    ingredients: normalizeIngredients(r.ingredients, r.raw_api_payload),
    tags: r.tags || [],
    instructions: r.instructions || [],
    cuisine: r.cuisine || null,
    source: r.source || 'community',
    source_url: r.source_url || undefined,
    created_by: r.created_by,
    chef: r.chef || null,
    is_public: r.is_public,
    servings: r.servings ?? 4,
  }));
}

export function useDbRecipes() {
  return useQuery<Recipe[]>({
    queryKey: ['recipes'],
    queryFn: fetchRecipes,
    staleTime: 1000 * 60 * 5,
  });
}
