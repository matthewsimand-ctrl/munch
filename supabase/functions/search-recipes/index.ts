import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

interface NormalizedRecipe {
  id: string;
  name: string;
  image: string;
  cook_time: string;
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced';
  ingredients: string[];
  tags: string[];
  instructions: string[];
  source: string;
}

// --- TheMealDB ---
async function searchMealDB(query: string): Promise<NormalizedRecipe[]> {
  try {
    const res = await fetch(`https://www.themealdb.com/api/json/v1/1/search.php?s=${encodeURIComponent(query)}`);
    const data = await res.json();
    if (!data.meals) return [];
    return data.meals.slice(0, 5).map((m: any) => {
      const ingredients: string[] = [];
      for (let i = 1; i <= 20; i++) {
        const ing = m[`strIngredient${i}`];
        if (ing && ing.trim()) ingredients.push(ing.trim().toLowerCase());
      }
      const instructions = m.strInstructions
        ? m.strInstructions.split(/\r?\n/).filter((s: string) => s.trim().length > 5)
        : [];
      return {
        id: `mealdb-${m.idMeal}`,
        name: m.strMeal,
        image: m.strMealThumb,
        cook_time: '30 min',
        difficulty: 'Intermediate' as const,
        ingredients,
        tags: m.strTags ? m.strTags.split(',').map((t: string) => t.trim().toLowerCase()) : [],
        instructions: instructions.slice(0, 10),
        source: 'TheMealDB',
      };
    });
  } catch (e) {
    console.error('MealDB error:', e);
    return [];
  }
}

// --- Tasty (RapidAPI) ---
async function searchTasty(query: string, apiKey: string): Promise<NormalizedRecipe[]> {
  try {
    const res = await fetch(
      `https://tasty.p.rapidapi.com/recipes/list?from=0&size=5&q=${encodeURIComponent(query)}`,
      {
        headers: {
          'X-RapidAPI-Key': apiKey,
          'X-RapidAPI-Host': 'tasty.p.rapidapi.com',
        },
      }
    );
    const data = await res.json();
    if (!data.results) return [];
    return data.results.slice(0, 5).map((r: any) => {
      const ingredients = (r.sections?.[0]?.components || [])
        .map((c: any) => c.ingredient?.name?.toLowerCase())
        .filter(Boolean);
      const instructions = (r.instructions || [])
        .sort((a: any, b: any) => a.position - b.position)
        .map((i: any) => i.display_text)
        .filter(Boolean);
      const totalTime = r.total_time_minutes || r.cook_time_minutes || r.prep_time_minutes;
      return {
        id: `tasty-${r.id}`,
        name: r.name,
        image: r.thumbnail_url || '',
        cook_time: totalTime ? `${totalTime} min` : '30 min',
        difficulty: (r.total_time_minutes && r.total_time_minutes > 45) ? 'Advanced' as const : 'Intermediate' as const,
        ingredients,
        tags: (r.tags || []).slice(0, 5).map((t: any) => t.display_name?.toLowerCase()).filter(Boolean),
        instructions: instructions.slice(0, 10),
        source: 'Tasty',
      };
    });
  } catch (e) {
    console.error('Tasty error:', e);
    return [];
  }
}

// --- Spoonacular ---
async function searchSpoonacular(query: string, apiKey: string): Promise<NormalizedRecipe[]> {
  try {
    const searchRes = await fetch(
      `https://api.spoonacular.com/recipes/complexSearch?query=${encodeURIComponent(query)}&number=5&addRecipeInformation=true&fillIngredients=true&apiKey=${apiKey}`
    );
    const data = await searchRes.json();
    if (!data.results) return [];
    return data.results.slice(0, 5).map((r: any) => {
      const ingredients = (r.extendedIngredients || [])
        .map((i: any) => i.name?.toLowerCase())
        .filter(Boolean);
      const instructions = r.analyzedInstructions?.[0]?.steps
        ?.sort((a: any, b: any) => a.number - b.number)
        .map((s: any) => s.step)
        .filter(Boolean) || [];
      const difficulty = r.readyInMinutes > 60 ? 'Advanced' as const
        : r.readyInMinutes > 30 ? 'Intermediate' as const : 'Beginner' as const;
      return {
        id: `spoon-${r.id}`,
        name: r.title,
        image: r.image || '',
        cook_time: r.readyInMinutes ? `${r.readyInMinutes} min` : '30 min',
        difficulty,
        ingredients,
        tags: (r.dishTypes || []).slice(0, 5).map((t: string) => t.toLowerCase()),
        instructions: instructions.slice(0, 10),
        source: 'Spoonacular',
      };
    });
  } catch (e) {
    console.error('Spoonacular error:', e);
    return [];
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { query, sources } = await req.json();
    const searchQuery = query || 'chicken';
    const activeSources: string[] = sources || ['mealdb', 'tasty', 'spoonacular'];

    const RAPIDAPI_KEY = Deno.env.get('RAPIDAPI_KEY') || '';
    const SPOONACULAR_API_KEY = Deno.env.get('SPOONACULAR_API_KEY') || '';

    const promises: Promise<NormalizedRecipe[]>[] = [];

    if (activeSources.includes('mealdb')) {
      promises.push(searchMealDB(searchQuery));
    }
    if (activeSources.includes('tasty') && RAPIDAPI_KEY) {
      promises.push(searchTasty(searchQuery, RAPIDAPI_KEY));
    }
    if (activeSources.includes('spoonacular') && SPOONACULAR_API_KEY) {
      promises.push(searchSpoonacular(searchQuery, SPOONACULAR_API_KEY));
    }

    const results = await Promise.allSettled(promises);
    const recipes = results
      .filter((r): r is PromiseFulfilledResult<NormalizedRecipe[]> => r.status === 'fulfilled')
      .flatMap(r => r.value);

    return new Response(JSON.stringify({ recipes }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error:', error);
    return new Response(JSON.stringify({ error: 'Failed to search recipes', recipes: [] }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
