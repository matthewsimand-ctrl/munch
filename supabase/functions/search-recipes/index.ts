import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// --- Inlined from src/lib/spoonacular.ts (edge functions can't import from src/) ---
function normalizeInstructionLines(lines: string[]): string[] {
  const normalized: string[] = [];
  for (const rawLine of lines) {
    const line = String(rawLine || '').replace(/\s+/g, ' ').trim();
    if (!line) continue;
    if (/^step\s*\d+[:.-]?$/i.test(line)) continue;
    const cleaned = line
      .replace(/^step\s*\d+\s*[:.)-]?\s*/i, '')
      .replace(/^\d+\s*[:.)-]\s*/, '')
      .trim();
    if (!/^step$/i.test(cleaned) && !/^step\s*\d+$/i.test(cleaned) && cleaned.length > 3) {
      normalized.push(cleaned);
    }
  }
  return normalized;
}

function decodeHtmlEntities(value: string): string {
  return value
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>');
}

function htmlToText(value: string): string {
  return decodeHtmlEntities(
    value
      .replace(/<\s*br\s*\/?>/gi, '\n')
      .replace(/<\s*\/(?:p|div|section|article|li|ul|ol|h\d)\s*>/gi, '\n')
      .replace(/<\s*li[^>]*>/gi, '\n')
      .replace(/<[^>]+>/g, ' ')
  );
}

function splitInstructionText(text: string): string[] {
  const normalized = text
    .replace(/\r/g, '\n')
    .replace(/\u2022/g, '\n• ')
    .replace(/\s+(?=(?:step\s*)?\d+\s*[).:-])/gi, '\n');
  const rawLines = normalized.split(/\n+/).map((line) => line.trim()).filter(Boolean);
  const splitByMarkers = rawLines.flatMap((line) => {
    const segments = line.split(/(?=(?:step\s*)?\d+\s*[).:-]\s+)/gi).map((s) => s.trim()).filter(Boolean);
    return segments.length > 0 ? segments : [line];
  });
  return normalizeInstructionLines(splitByMarkers);
}

function extractSpoonacularInstructions(recipe: Record<string, unknown>): string[] {
  const analyzedSteps = Array.isArray(recipe.analyzedInstructions)
    ? recipe.analyzedInstructions.flatMap((block: any) => {
      const steps = Array.isArray(block?.steps) ? block.steps : [];
      return steps
        .slice()
        .sort((a: any, b: any) => (a.number || 0) - (b.number || 0))
        .map((step: any) => String(step.step || '').trim())
        .filter(Boolean);
    })
    : [];
  if (analyzedSteps.length > 0) return normalizeInstructionLines(analyzedSteps);
  const htmlInstructions = String(recipe.instructions || '').trim();
  if (!htmlInstructions) return [];
  return splitInstructionText(htmlToText(htmlInstructions));
}

function cleanIngredientPart(value: unknown): string {
  return String(value ?? '')
    .replace(/\s+/g, ' ')
    .trim();
}

function joinIngredient(prefix: string, ingredient: unknown): string {
  const cleanPrefix = cleanIngredientPart(prefix);
  const cleanIngredient = cleanIngredientPart(ingredient);
  if (!cleanIngredient) return '';
  return cleanPrefix ? `${cleanPrefix} ${cleanIngredient}`.trim() : cleanIngredient;
}
// --- End inlined code ---

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
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
  chef?: string | null;
  created_by?: string | null;
}

const EXTERNAL_CACHE_TTL_DAYS = 14;

function getSupabaseClient(useServiceRole = false) {
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const key = useServiceRole
    ? Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    : Deno.env.get('SUPABASE_ANON_KEY');

  if (!supabaseUrl || !key) return null;
  return createClient(supabaseUrl, key);
}

async function fetchPublicRecipes(query?: string): Promise<NormalizedRecipe[]> {
  const supabase = getSupabaseClient(false);
  if (!supabase) return [];

  try {
    const request = supabase
      .from('recipes')
      .select('id, name, image, cook_time, difficulty, ingredients, tags, instructions, source, source_url, raw_api_payload, cuisine, chef, created_by')
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
      chef: recipe.chef ? String(recipe.chef) : null,
      created_by: recipe.created_by ? String(recipe.created_by) : null,
    }));

    if (!query) return normalized;

    const loweredQuery = query.toLowerCase().trim();
    return normalized.filter((recipe) =>
      recipe.name.toLowerCase().includes(loweredQuery) ||
      recipe.ingredients.some((ingredient: string) => ingredient.toLowerCase().includes(loweredQuery)) ||
      recipe.tags.some((tag: string) => tag.toLowerCase().includes(loweredQuery)) ||
      (recipe.cuisine || '').toLowerCase().includes(loweredQuery)
    );
  } catch (error) {
    console.error('Public recipe fetch failure:', error);
    return [];
  }
}

async function fetchCachedExternalRecipes(query?: string): Promise<NormalizedRecipe[]> {
  const supabase = getSupabaseClient(false);
  if (!supabase) return [];

  try {
    const { data, error } = await supabase
      .from('recipe_api_cache')
      .select('name, image, cook_time, difficulty, ingredients, tags, instructions, source, source_url, raw_api_payload, cuisine, external_id')
      .gt('expires_at', new Date().toISOString())
      .order('updated_at', { ascending: false })
      .limit(query ? 400 : 250);

    if (error) {
      console.error('External cache read error:', error);
      return [];
    }

    const normalized = (data || []).map((recipe: any) => ({
      id: `${String(recipe.source || 'external').toLowerCase()}-${String(recipe.external_id || recipe.name || '').trim()}`,
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
      source: String(recipe.source || 'external'),
      source_url: recipe.source_url ? String(recipe.source_url) : undefined,
      raw_api_payload: recipe.raw_api_payload ?? undefined,
      cuisine: recipe.cuisine ? String(recipe.cuisine) : undefined,
      chef: recipe.chef ? String(recipe.chef) : null,
    }));

    if (!query) return normalized;

    const loweredQuery = query.toLowerCase().trim();
    return normalized.filter((recipe) =>
      recipe.name.toLowerCase().includes(loweredQuery) ||
      recipe.ingredients.some((ingredient: string) => ingredient.toLowerCase().includes(loweredQuery)) ||
      recipe.tags.some((tag: string) => tag.toLowerCase().includes(loweredQuery)) ||
      (recipe.cuisine || '').toLowerCase().includes(loweredQuery)
    );
  } catch (error) {
    console.error('External cache read failure:', error);
    return [];
  }
}

function getExternalRecipeId(recipe: NormalizedRecipe): string {
  const originalId = String(recipe.id || '').trim();
  const splitId = originalId.includes('-') ? originalId.split('-').slice(1).join('-') : originalId;
  return splitId || recipe.source_url || recipe.name.toLowerCase().trim();
}

async function cacheExternalRecipes(recipes: NormalizedRecipe[]): Promise<void> {
  const supabase = getSupabaseClient(true);
  if (!supabase || recipes.length === 0) return;

  const ttlMs = EXTERNAL_CACHE_TTL_DAYS * 24 * 60 * 60 * 1000;
  const expiresAt = new Date(Date.now() + ttlMs).toISOString();

  const upsertPayload = recipes
    .filter((recipe) => recipe.source !== 'community')
    .map((recipe) => {
      const externalId = getExternalRecipeId(recipe);
      return {
        cache_key: `${recipe.source.toLowerCase()}::${externalId}`,
        external_id: externalId,
        name: recipe.name,
        image: recipe.image,
        cook_time: recipe.cook_time,
        difficulty: recipe.difficulty,
        ingredients: recipe.ingredients,
        tags: recipe.tags,
        instructions: recipe.instructions,
        source: recipe.source,
        source_url: recipe.source_url || null,
        raw_api_payload: recipe.raw_api_payload ?? null,
        cuisine: recipe.cuisine || null,
        expires_at: expiresAt,
      };
    });

  if (upsertPayload.length === 0) return;

  const { error } = await supabase
    .from('recipe_api_cache')
    .upsert(upsertPayload, { onConflict: 'cache_key' });

  if (error) {
    console.error('External cache upsert error:', error);
  }
}


// ── FIXED: direct string coercion matching import-recipe's extractRecipeFromMealDbPayload.
// The previous implementation used joinIngredient → normalizeMeasurePart → cleanIngredientPart
// which silently dropped measures when MealDB returned null/undefined/whitespace-only strings
// because cleanIngredientPart uses `value || ''` (coerces all falsy values) and
// normalizeMeasurePart only guarded against a single-space ' ' string.
function buildMealDbIngredients(meal: Record<string, unknown>): string[] {
  const ingredients: string[] = [];

  for (let i = 1; i <= 20; i++) {
    const name = String(meal[`strIngredient${i}`] ?? '').trim();
    if (!name) continue;
    const measure = String(meal[`strMeasure${i}`] ?? '').replace(/\s+/g, ' ').trim();
    ingredients.push(measure ? `${measure} ${name}` : name);
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
    const res = await fetch(`https://www.themealdb.com/api/json/v1/1/filter.php?c=${encodeURIComponent(category)}`);
    const data = await res.json();
    if (!data.meals) return [];
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

function inferCuisine(name: string, tags: string[], ingredients: string[]): string | undefined {
  const allText = [name.toLowerCase(), ...tags, ...ingredients].join(' ').toLowerCase();

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
      `https://api.spoonacular.com/recipes/complexSearch?query=${encodeURIComponent(query)}&number=${number}&addRecipeInformation=true&fillIngredients=true&instructionsRequired=true&apiKey=${apiKey}`
    );

    const rawBody = await searchRes.text();
    if (!searchRes.ok) {
      console.error('Spoonacular search error:', searchRes.status, rawBody);
      return [];
    }

    const data = rawBody ? JSON.parse(rawBody) : {};
    if (!data.results) return [];
    const recipes = data.results.map((r: any) => {
      const ingredients = (r.extendedIngredients || [])
        .map((i: any) => {
          const amount = i.measures?.us?.amount ?? i.amount;
          const unit = i.measures?.us?.unitShort ?? i.unit;
          return joinIngredient(amount ? `${amount}${unit ? ` ${unit}` : ''}` : '', i.name || i.originalName || i.original);
        })
        .filter(Boolean);
      const instructions = extractSpoonacularInstructions(r);
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
        source_url: r.sourceUrl || r.spoonacularSourceUrl || undefined,
        raw_api_payload: r,
        cuisine: (r.cuisines || [])[0] || undefined,
      };
    });

    console.log(`Spoonacular search("${query}") returned ${recipes.length} recipes before dedupe`);
    return recipes;
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

    const rawBody = await res.text();
    if (!res.ok) {
      console.error('Spoonacular random error:', res.status, rawBody);
      return [];
    }

    const data = rawBody ? JSON.parse(rawBody) : {};
    if (!data.recipes) return [];
    const recipes = data.recipes.map((r: any) => {
      const ingredients = (r.extendedIngredients || [])
        .map((i: any) => {
          const amount = i.measures?.us?.amount ?? i.amount;
          const unit = i.measures?.us?.unitShort ?? i.unit;
          return joinIngredient(amount ? `${amount}${unit ? ` ${unit}` : ''}` : '', i.name || i.originalName || i.original);
        })
        .filter(Boolean);
      const instructions = extractSpoonacularInstructions(r);
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
        source_url: r.sourceUrl || r.spoonacularSourceUrl || undefined,
        raw_api_payload: r,
        cuisine: (r.cuisines || [])[0] || undefined,
      };
    });

    console.log(`Spoonacular random returned ${recipes.length} recipes before dedupe`);
    return recipes;
  } catch (e) {
    console.error('Spoonacular random error:', e);
    return [];
  }
}

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
    return new Response('ok', {
      status: 200,
      headers: {
        ...corsHeaders,
        'Content-Type': 'text/plain',
      },
    });
  }

  try {
    const { query, mode } = await req.json();
    const RAPIDAPI_KEY = Deno.env.get('RAPIDAPI_KEY') || '';
    const SPOONACULAR_API_KEY = Deno.env.get('SPOONACULAR_API_KEY') || '';
    console.log('Search recipes env status', {
      mode: mode || 'search',
      hasRapidApiKey: Boolean(RAPIDAPI_KEY),
      hasSpoonacularKey: Boolean(SPOONACULAR_API_KEY),
    });

    if (mode === 'browse') {
      console.log('Browse mode: fetching large catalog...');
      const stablePromises: Promise<NormalizedRecipe[]>[] = [];
      const externalPromises: Promise<NormalizedRecipe[]>[] = [];
      stablePromises.push(fetchPublicRecipes());
      stablePromises.push(fetchCachedExternalRecipes());

      const letters = 'abcdefghijklmnopqrstuvwxyz'.split('');
      for (const letter of letters) {
        externalPromises.push(browseMealDBByLetter(letter));
      }

      const categories = ['Chicken', 'Beef', 'Seafood', 'Pasta', 'Vegetarian', 'Dessert', 'Breakfast', 'Pork', 'Lamb', 'Vegan', 'Starter', 'Side'];
      for (const cat of categories) {
        externalPromises.push(browseMealDBByCategory(cat));
      }

      if (SPOONACULAR_API_KEY) {
        externalPromises.push(browseSpoonacularRandom(SPOONACULAR_API_KEY, 50));
      }

      if (RAPIDAPI_KEY) {
        const tastyQueries = ['popular', 'easy dinner', 'quick lunch', 'healthy', 'comfort food', 'dessert', 'breakfast', 'pasta', 'chicken', 'vegetarian'];
        for (const q of tastyQueries) {
          externalPromises.push(searchTasty(q, RAPIDAPI_KEY, 10));
        }
      }

      const stableResults = await Promise.allSettled(stablePromises);
      const externalResults = await Promise.allSettled(externalPromises);

      const stableRecipes = stableResults
        .filter((r): r is PromiseFulfilledResult<NormalizedRecipe[]> => r.status === 'fulfilled')
        .flatMap(r => r.value);

      const externalRecipes = externalResults
        .filter((r): r is PromiseFulfilledResult<NormalizedRecipe[]> => r.status === 'fulfilled')
        .flatMap(r => r.value);

      const spoonacularCount = externalRecipes.filter((recipe) => recipe.source === 'Spoonacular').length;
      console.log('Browse source counts', {
        publicCount: stableRecipes.filter((recipe) => recipe.source === 'community' || recipe.source === 'community-seed').length,
        cachedExternalCount: stableRecipes.filter((recipe) => recipe.source !== 'community' && recipe.source !== 'community-seed').length,
        spoonacularCount,
        mealDbCount: externalRecipes.filter((recipe) => recipe.source === 'TheMealDB').length,
        tastyCount: externalRecipes.filter((recipe) => recipe.source === 'Tasty').length,
      });

      await cacheExternalRecipes(externalRecipes);

      const allRecipes = [...stableRecipes, ...externalRecipes];

      const unique = dedup(allRecipes);
      console.log(`Browse: fetched ${allRecipes.length} total, ${unique.length} unique`);

      return new Response(JSON.stringify({ recipes: unique }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const searchQuery = query || 'chicken';

    const stablePromises: Promise<NormalizedRecipe[]>[] = [];
    const externalPromises: Promise<NormalizedRecipe[]>[] = [];
    stablePromises.push(fetchPublicRecipes(searchQuery));
    stablePromises.push(fetchCachedExternalRecipes(searchQuery));
    externalPromises.push(searchMealDB(searchQuery));
    if (RAPIDAPI_KEY) {
      externalPromises.push(searchTasty(searchQuery, RAPIDAPI_KEY, 10));
    }
    if (SPOONACULAR_API_KEY) {
      externalPromises.push(searchSpoonacular(searchQuery, SPOONACULAR_API_KEY, 10));
    }

    const stableResults = await Promise.allSettled(stablePromises);
    const externalResults = await Promise.allSettled(externalPromises);

    const stableRecipes = stableResults
      .filter((r): r is PromiseFulfilledResult<NormalizedRecipe[]> => r.status === 'fulfilled')
      .flatMap(r => r.value);

    const externalRecipes = externalResults
      .filter((r): r is PromiseFulfilledResult<NormalizedRecipe[]> => r.status === 'fulfilled')
      .flatMap(r => r.value);

    console.log('Search source counts', {
      query: searchQuery,
      publicCount: stableRecipes.filter((recipe) => recipe.source === 'community' || recipe.source === 'community-seed').length,
      cachedExternalCount: stableRecipes.filter((recipe) => recipe.source !== 'community' && recipe.source !== 'community-seed').length,
      spoonacularCount: externalRecipes.filter((recipe) => recipe.source === 'Spoonacular').length,
      mealDbCount: externalRecipes.filter((recipe) => recipe.source === 'TheMealDB').length,
      tastyCount: externalRecipes.filter((recipe) => recipe.source === 'Tasty').length,
    });

    await cacheExternalRecipes(externalRecipes);

    const recipes = dedup(
      [...stableRecipes, ...externalRecipes]
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
