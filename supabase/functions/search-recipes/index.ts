import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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
  source_url?: string;
  raw_api_payload?: unknown;
  cuisine?: string;
}

async function fetchPublicRecipes(query?: string): Promise<NormalizedRecipe[]> {
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');
  if (!supabaseUrl || !supabaseAnonKey) return [];

  try {
    const supabase = createClient(supabaseUrl, supabaseAnonKey);
    const request = supabase
      .from('recipes')
      .select('id, name, image, cook_time, difficulty, ingredients, tags, instructions, source, source_url, raw_api_payload, cuisine')
      .eq('is_public', true)
      .order('created_at', { ascending: false })
      .limit(query ? 200 : 100);

    const { data, error } = await request;
    if (error) {
      console.error('Public recipe fetch error:', error);
      return [];
    }

    const normalized = (data || []).map((recipe: any) => ({
      id: String(recipe.id),
      name: String(recipe.name || '').trim(),
      image: String(recipe.image || ''),
      cook_time: String(recipe.cook_time || '30 min'),
      difficulty: String(recipe.difficulty || 'Intermediate') as NormalizedRecipe['difficulty'],
      ingredients: Array.isArray(recipe.ingredients)
        ? recipe.ingredients.map((item: unknown) => String(item).trim()).filter(Boolean)
        : [],
      tags: Array.isArray(recipe.tags)
        ? recipe.tags.map((tag: unknown) => String(tag).trim().toLowerCase()).filter(Boolean)
        : [],
      instructions: Array.isArray(recipe.instructions)
        ? recipe.instructions.map((step: unknown) => String(step).trim()).filter(Boolean)
        : [],
      source: String(recipe.source || 'community'),
      source_url: recipe.source_url ? String(recipe.source_url) : undefined,
      raw_api_payload: recipe.raw_api_payload ?? undefined,
      cuisine: recipe.cuisine ? String(recipe.cuisine) : undefined,
    }));

    if (!query) return normalized;

    const loweredQuery = query.toLowerCase().trim();
    return normalized.filter((recipe) =>
      recipe.name.toLowerCase().includes(loweredQuery) ||
      recipe.ingredients.some((ingredient) => ingredient.toLowerCase().includes(loweredQuery)) ||
      recipe.tags.some((tag) => tag.toLowerCase().includes(loweredQuery)) ||
      (recipe.cuisine || '').toLowerCase().includes(loweredQuery)
    );
  } catch (error) {
    console.error('Public recipe fetch failure:', error);
    return [];
  }
}

function normalizeInstructionLines(lines: string[]): string[] {
  const normalized: string[] = [];
  for (const rawLine of lines) {
    const line = String(rawLine || '').replace(/\s+/g, ' ').trim();
    if (!line) continue;

    // Some APIs split "Step 1" and the actual sentence into separate lines.
    if (/^step\s*\d+[:.-]?$/i.test(line)) {
      continue;
    }

    // Strip leading numbering/"Step X" prefixes while keeping full text.
    const cleaned = line
      .replace(/^step\s*\d+\s*[:.)-]?\s*/i, '')
      .replace(/^\d+\s*[:.)-]\s*/, '')
      .replace(/^step\s*\d+\s*[:.)-]?\s*/i, '')
      .trim();

    if (!/^step\s*\d+$/i.test(cleaned) && cleaned.length > 3) normalized.push(cleaned);
  }
  return normalized;
}

function cleanIngredientPart(value: unknown): string {
  return String(value || '').trim().replace(/\s+/g, ' ');
}

function normalizeMeasurePart(value: unknown): string {
  const rawMeasure = String(value ?? '');
  if (rawMeasure === ' ') return '';

  const measure = cleanIngredientPart(rawMeasure);
  if (!measure) return '';

  // TheMealDB sometimes provides compact values like "500g" or "1kg".
  // Add spacing so downstream quantity parsing/scaling works consistently.
  return measure
    .replace(/(\d)([a-zA-Z])/g, '$1 $2')
    .replace(/([a-zA-Z])(\d)/g, '$1 $2')
    .trim();
}

function joinIngredient(measure: unknown, ingredient: unknown): string | null {
  const measureText = normalizeMeasurePart(measure);
  const ingredientText = cleanIngredientPart(ingredient);
  if (!ingredientText) return null;
  return measureText ? `${measureText} ${ingredientText}`.trim() : ingredientText;
}

function buildMealDbIngredients(meal: Record<string, unknown>): string[] {
  const ingredients: string[] = [];

  for (let i = 1; i <= 20; i++) {
    const ingredient = meal[`strIngredient${i}`];
    const measure = meal[`strMeasure${i}`];
    const line = joinIngredient(measure, ingredient);
    if (line) ingredients.push(line);
  }

  return ingredients;
}

// --- TheMealDB ---
async function searchMealDB(query: string): Promise<NormalizedRecipe[]> {
  try {
    const res = await fetch(`https://www.themealdb.com/api/json/v1/1/search.php?s=${encodeURIComponent(query)}`);
    const data = await res.json();
    if (!data.meals) return [];
    return data.meals.map((m: any) => {
      const ingredients = buildMealDbIngredients(m);
      const instructions = m.strInstructions
        ? normalizeInstructionLines(m.strInstructions.split(/\r?\n/))
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
        source_url: m.strSource || m.strYoutube || undefined,
        raw_api_payload: m,
        cuisine: m.strArea || undefined,
      };
    });
  } catch (e) {
    console.error('MealDB error:', e);
    return [];
  }
}

async function browseMealDBByLetter(letter: string): Promise<NormalizedRecipe[]> {
  try {
    const res = await fetch(`https://www.themealdb.com/api/json/v1/1/search.php?f=${letter}`);
    const data = await res.json();
    if (!data.meals) return [];
    return data.meals.map((m: any) => {
      const ingredients = buildMealDbIngredients(m);
      const instructions = m.strInstructions
        ? normalizeInstructionLines(m.strInstructions.split(/\r?\n/))
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
        source_url: m.strSource || m.strYoutube || undefined,
        raw_api_payload: m,
        cuisine: m.strArea || undefined,
      };
    });
  } catch (e) {
    console.error('MealDB browse error:', e);
    return [];
  }
}

async function browseMealDBByCategory(category: string): Promise<NormalizedRecipe[]> {
  try {
    // This endpoint returns limited data, just id/name/thumb
    const res = await fetch(`https://www.themealdb.com/api/json/v1/1/filter.php?c=${encodeURIComponent(category)}`);
    const data = await res.json();
    if (!data.meals) return [];
    // Fetch full details for each (limited to 8 per category to stay fast)
    const meals = data.meals.slice(0, 8);
    const detailed = await Promise.allSettled(
      meals.map(async (m: any) => {
        const detailRes = await fetch(`https://www.themealdb.com/api/json/v1/1/lookup.php?i=${m.idMeal}`);
        const detailData = await detailRes.json();
        return detailData.meals?.[0];
      })
    );
    return detailed
      .filter((r): r is PromiseFulfilledResult<any> => r.status === 'fulfilled' && r.value)
      .map(r => {
        const m = r.value;
        const ingredients = buildMealDbIngredients(m);
        const instructions = m.strInstructions
          ? normalizeInstructionLines(m.strInstructions.split(/\r?\n/))
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
          source_url: m.strSource || m.strYoutube || undefined,
          raw_api_payload: m,
          cuisine: m.strArea || undefined,
        };
      });
  } catch (e) {
    console.error('MealDB category error:', e);
    return [];
  }
}

// Infer cuisine from recipe metadata
function inferCuisine(name: string, tags: string[], ingredients: string[]): string | undefined {
  const lowerName = name.toLowerCase();
  const allText = [lowerName, ...tags, ...ingredients].join(' ').toLowerCase();
  
  // Cuisine patterns
  if (/(thai|pad thai|green curry|tom yum)/i.test(allText)) return 'Thai';
  if (/(italian|pasta|pizza|risotto|carbonara|pesto)/i.test(allText)) return 'Italian';
  if (/(mexican|taco|burrito|enchilada|quesadilla|salsa)/i.test(allText)) return 'Mexican';
  if (/(chinese|stir[- ]?fry|kung pao|szechuan|wonton)/i.test(allText)) return 'Chinese';
  if (/(japanese|sushi|ramen|teriyaki|miso)/i.test(allText)) return 'Japanese';
  if (/(indian|curry|tikka|masala|naan|tandoori)/i.test(allText)) return 'Indian';
  if (/(mediterranean|greek|hummus|falafel|kebab)/i.test(allText)) return 'Mediterranean';
  if (/(french|crepe|croissant|coq au vin|bouillabaisse)/i.test(allText)) return 'French';
  if (/(american|burger|bbq|southern|cajun)/i.test(allText)) return 'American';
  if (/(korean|kimchi|bibimbap|bulgogi)/i.test(allText)) return 'Korean';
  if (/(vietnamese|pho|banh mi)/i.test(allText)) return 'Vietnamese';
  if (/(spanish|paella|tapas)/i.test(allText)) return 'Spanish';
  
  return undefined;
}

// --- Tasty (RapidAPI) ---
async function searchTasty(query: string, apiKey: string, size = 5): Promise<NormalizedRecipe[]> {
  try {
    const res = await fetch(
      `https://tasty.p.rapidapi.com/recipes/list?from=0&size=${size}&q=${encodeURIComponent(query)}`,
      {
        headers: {
          'X-RapidAPI-Key': apiKey,
          'X-RapidAPI-Host': 'tasty.p.rapidapi.com',
        },
      }
    );
    const data = await res.json();
    if (!data.results) return [];
    return data.results.map((r: any) => {
      const ingredients = (r.sections || [])
        .flatMap((section: any) => section?.components || [])
        .map((c: any) => {
          const measurement = (c?.measurements || []).find((m: any) => cleanIngredientPart(m?.quantity)) || c?.measurements?.[0];
          const quantity = cleanIngredientPart(measurement?.quantity || '');
          const unit = cleanIngredientPart(measurement?.unit?.abbreviation || measurement?.unit?.display_singular || measurement?.unit?.display_plural || '');
          return joinIngredient(`${quantity} ${unit}`.trim(), c.ingredient?.name);
        })
        .filter(Boolean);
      const instructions = normalizeInstructionLines((r.instructions || [])
        .sort((a: any, b: any) => a.position - b.position)
        .map((i: any) => i.display_text)
        .filter(Boolean));
      const totalTime = r.total_time_minutes || r.cook_time_minutes || r.prep_time_minutes;
      const tags = (r.tags || []).slice(0, 5).map((t: any) => t.display_name?.toLowerCase()).filter(Boolean);
      return {
        id: `tasty-${r.id}`,
        name: r.name,
        image: r.thumbnail_url || '',
        cook_time: totalTime ? `${totalTime} min` : '30 min',
        difficulty: (r.total_time_minutes && r.total_time_minutes > 45) ? 'Advanced' as const : 'Intermediate' as const,
        ingredients,
        tags,
        instructions: instructions.slice(0, 10),
        source: 'Tasty',
        source_url: r.original_video_url || r.video_url || undefined,
        raw_api_payload: r,
        cuisine: inferCuisine(r.name, tags, ingredients),
      };
    });
  } catch (e) {
    console.error('Tasty error:', e);
    return [];
  }
}

// --- Spoonacular ---
async function searchSpoonacular(query: string, apiKey: string, number = 5): Promise<NormalizedRecipe[]> {
  try {
    const searchRes = await fetch(
      `https://api.spoonacular.com/recipes/complexSearch?query=${encodeURIComponent(query)}&number=${number}&addRecipeInformation=true&fillIngredients=true&apiKey=${apiKey}`
    );
    const data = await searchRes.json();
    if (!data.results) return [];
    return data.results.map((r: any) => {
      const ingredients = (r.extendedIngredients || [])
        .map((i: any) => {
          const amount = i.measures?.us?.amount ?? i.amount;
          const unit = i.measures?.us?.unitShort ?? i.unit;
          return joinIngredient(amount ? `${amount}${unit ? ` ${unit}` : ''}` : '', i.name || i.originalName || i.original);
        })
        .filter(Boolean);
      const instructions = normalizeInstructionLines((r.analyzedInstructions?.[0]?.steps
        ?.sort((a: any, b: any) => a.number - b.number)
        .map((s: any) => s.step)
        .filter(Boolean) || []);
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
        source_url: r.sourceUrl || undefined,
        raw_api_payload: r,
        cuisine: (r.cuisines || [])[0] || undefined,
      };
    });
  } catch (e) {
    console.error('Spoonacular error:', e);
    return [];
  }
}

async function browseSpoonacularRandom(apiKey: string, number = 20): Promise<NormalizedRecipe[]> {
  try {
    const res = await fetch(
      `https://api.spoonacular.com/recipes/random?number=${number}&apiKey=${apiKey}`
    );
    const data = await res.json();
    if (!data.recipes) return [];
    return data.recipes.map((r: any) => {
      const ingredients = (r.extendedIngredients || [])
        .map((i: any) => {
          const amount = i.measures?.us?.amount ?? i.amount;
          const unit = i.measures?.us?.unitShort ?? i.unit;
          return joinIngredient(amount ? `${amount}${unit ? ` ${unit}` : ''}` : '', i.name || i.originalName || i.original);
        })
        .filter(Boolean);
      const instructions = normalizeInstructionLines((r.analyzedInstructions?.[0]?.steps
        ?.sort((a: any, b: any) => a.number - b.number)
        .map((s: any) => s.step)
        .filter(Boolean) || []);
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
        source_url: r.sourceUrl || undefined,
        raw_api_payload: r,
        cuisine: (r.cuisines || [])[0] || undefined,
      };
    });
  } catch (e) {
    console.error('Spoonacular random error:', e);
    return [];
  }
}

// Dedup by name (case insensitive)
function dedup(recipes: NormalizedRecipe[]): NormalizedRecipe[] {
  const seen = new Set<string>();
  return recipes.filter(r => {
    const key = r.name.toLowerCase().trim();
    if (seen.has(key)) return false;
    seen.add(key);
    return r.ingredients.length > 0 && r.instructions.length > 0;
  });
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { query, mode } = await req.json();
    const RAPIDAPI_KEY = Deno.env.get('RAPIDAPI_KEY') || '';
    const SPOONACULAR_API_KEY = Deno.env.get('SPOONACULAR_API_KEY') || '';

    // "browse" mode: bulk-fetch large catalog
    if (mode === 'browse') {
      console.log('Browse mode: fetching large catalog...');
      const promises: Promise<NormalizedRecipe[]>[] = [];
      promises.push(fetchPublicRecipes());

      // MealDB: fetch by first letter (a-z) to get ~200+ recipes
      const letters = 'abcdefghijklmnopqrstuvwxyz'.split('');
      for (const letter of letters) {
        promises.push(browseMealDBByLetter(letter));
      }

      // MealDB categories for more coverage
      const categories = ['Chicken', 'Beef', 'Seafood', 'Pasta', 'Vegetarian', 'Dessert', 'Breakfast', 'Pork', 'Lamb', 'Vegan', 'Starter', 'Side'];
      for (const cat of categories) {
        promises.push(browseMealDBByCategory(cat));
      }

      // Spoonacular random batches
      if (SPOONACULAR_API_KEY) {
        promises.push(browseSpoonacularRandom(SPOONACULAR_API_KEY, 50));
      }

      // Tasty popular queries
      if (RAPIDAPI_KEY) {
        const tastyQueries = ['popular', 'easy dinner', 'quick lunch', 'healthy', 'comfort food', 'dessert', 'breakfast', 'pasta', 'chicken', 'vegetarian'];
        for (const q of tastyQueries) {
          promises.push(searchTasty(q, RAPIDAPI_KEY, 10));
        }
      }

      const results = await Promise.allSettled(promises);
      const allRecipes = results
        .filter((r): r is PromiseFulfilledResult<NormalizedRecipe[]> => r.status === 'fulfilled')
        .flatMap(r => r.value);

      const unique = dedup(allRecipes);
      console.log(`Browse: fetched ${allRecipes.length} total, ${unique.length} unique`);

      return new Response(JSON.stringify({ recipes: unique }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Regular search mode
    const searchQuery = query || 'chicken';

    const promises: Promise<NormalizedRecipe[]>[] = [];
    promises.push(fetchPublicRecipes(searchQuery));
    promises.push(searchMealDB(searchQuery));
    if (RAPIDAPI_KEY) {
      promises.push(searchTasty(searchQuery, RAPIDAPI_KEY, 10));
    }
    if (SPOONACULAR_API_KEY) {
      promises.push(searchSpoonacular(searchQuery, SPOONACULAR_API_KEY, 10));
    }

    const results = await Promise.allSettled(promises);
    const recipes = dedup(
      results
        .filter((r): r is PromiseFulfilledResult<NormalizedRecipe[]> => r.status === 'fulfilled')
        .flatMap(r => r.value)
    );

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
