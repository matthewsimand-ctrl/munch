import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Recipe } from '@/data/recipes';

async function fetchRecipes(): Promise<Recipe[]> {
  const { data, error } = await supabase
    .from('recipes')
    .select('*')
    .eq('is_public', true)
    .order('created_at', { ascending: false });

  if (error) throw error;

  return (data || []).map((r: any) => ({
    id: r.id,
    name: r.name,
    image: r.image,
    cook_time: r.cook_time,
    difficulty: r.difficulty,
    ingredients: r.ingredients || [],
    tags: r.tags || [],
    instructions: r.instructions || [],
    cuisine: r.cuisine || null,
    source: r.source || 'community',
    source_url: r.source_url || undefined,
    raw_api_payload: r.raw_api_payload ?? undefined,
    created_by: r.created_by,
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
