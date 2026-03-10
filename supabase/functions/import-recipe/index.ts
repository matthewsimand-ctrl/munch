const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const AI_GATEWAY_URL = 'https://ai.gateway.lovable.dev/v1/chat/completions';
const R_JINA_PROXY_PREFIX = 'https://r.jina.ai/';

const BROWSER_HEADERS: Record<string, string> = {
  'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
  'Accept-Language': 'en-US,en;q=0.9',
  'Accept-Encoding': 'gzip, deflate, br',
  'Cache-Control': 'no-cache',
  Pragma: 'no-cache',
  'Sec-Ch-Ua': '"Chromium";v="124", "Google Chrome";v="124", "Not-A.Brand";v="99"',
  'Sec-Ch-Ua-Mobile': '?0',
  'Sec-Ch-Ua-Platform': '"macOS"',
  'Sec-Fetch-Dest': 'document',
  'Sec-Fetch-Mode': 'navigate',
  'Sec-Fetch-Site': 'none',
  'Sec-Fetch-User': '?1',
  'Upgrade-Insecure-Requests': '1',
};

const PROXY_FETCHERS: Array<{ label: string; buildUrl: (url: string) => string; headers?: Record<string, string> }> = [
  {
    label: 'jina-reader',
    buildUrl: (url) => `${R_JINA_PROXY_PREFIX}${url}`,
    headers: { Accept: 'text/html', 'X-Return-Format': 'html' },
  },
  {
    label: 'jina-markdown',
    buildUrl: (url) => `${R_JINA_PROXY_PREFIX}${url}`,
    headers: { Accept: 'text/markdown' },
  },
];

const NON_CONTENT_TAGS = ['script', 'style', 'noscript', 'svg', 'canvas', 'iframe'];
const NON_ESSENTIAL_SECTIONS = ['header', 'footer', 'nav', 'aside', 'form'];
const INGREDIENT_SECTION_HEADERS = ['ingredients'];
const RECIPE_SECTION_END_HEADERS = ['instructions', 'directions', 'method', 'preparation', 'steps', 'nutrition', 'notes'];

const TEXT_EXTRACT_PROMPT = `You are a recipe extraction assistant. Extract the recipe from the provided content and return ONLY a valid JSON object with these fields:
{
  "name": "Recipe name",
  "ingredients": ["ingredient line exactly as written"],
  "instructions": ["Step 1 text", "Step 2 text"],
  "cook_time": "human readable duration",
  "difficulty": "Easy" | "Intermediate" | "Advanced",
  "cuisine": "Italian" | "Mexican" | etc or null,
  "tags": ["tag1", "tag2"],
  "image": "",
  "servings": "4",
  "nutrition_summary": "optional brief nutrition summary"
}

Rules:
- Keep each ingredient exactly as written when possible
- Instructions must be individual steps in order
- Convert ISO 8601 times to human text (e.g., PT1H15M => 1 hour 15 minutes)
- Return ONLY the JSON, no markdown fences, no explanation`;

const IMAGE_EXTRACT_PROMPT = `Read the recipe from this image and return ONLY a valid JSON object with fields:
{
  "name": "Recipe name",
  "ingredients": ["ingredient line exactly as written"],
  "instructions": ["Step 1", "Step 2"],
  "cook_time": "human readable duration",
  "difficulty": "Easy" | "Intermediate" | "Advanced",
  "cuisine": null,
  "tags": [],
  "image": "",
  "servings": "4",
  "nutrition_summary": "optional brief nutrition summary"
}
If some fields are missing in the image, infer conservatively or leave as empty string / empty array.`;

const durationPart = (value: number, unit: string) => `${value} ${unit}${value === 1 ? '' : 's'}`;

function isoDurationToText(value?: string): string {
  if (!value || typeof value !== 'string') return '';
  const iso = value.trim();
  const m = iso.match(/^P(?:([0-9]+)D)?(?:T(?:([0-9]+)H)?(?:([0-9]+)M)?(?:([0-9]+)S)?)?$/i);
  if (!m) return value;

  const days = parseInt(m[1] || '0', 10);
  const hours = parseInt(m[2] || '0', 10);
  const minutes = parseInt(m[3] || '0', 10);
  const seconds = parseInt(m[4] || '0', 10);
  const parts: string[] = [];

  if (days) parts.push(durationPart(days, 'day'));
  if (hours) parts.push(durationPart(hours, 'hour'));
  if (minutes) parts.push(durationPart(minutes, 'minute'));
  if (seconds && parts.length === 0) parts.push(durationPart(seconds, 'second'));

  return parts.length ? parts.join(' ') : value;
}

function normalizeYield(recipeYield: unknown): string {
  if (Array.isArray(recipeYield)) {
    const first = recipeYield.find((item) => typeof item === 'string' && item.trim());
    return normalizeYield(first ?? '');
  }
  const raw = String(recipeYield ?? '').trim();
  if (!raw) return '';
  const numberMatch = raw.match(/\d+(?:[.,]\d+)?/);
  return numberMatch ? numberMatch[0].replace(',', '.') : raw;
}

function extractInstructionTexts(input: unknown): string[] {
  const out: string[] = [];
  const walk = (value: unknown) => {
    if (!value) return;
    if (typeof value === 'string') {
      const v = value.trim();
      if (v) out.push(v);
      return;
    }
    if (Array.isArray(value)) {
      value.forEach(walk);
      return;
    }
    if (typeof value === 'object') {
      const obj = value as Record<string, unknown>;
      if (typeof obj.text === 'string' && obj.text.trim()) {
        out.push(obj.text.trim());
      }
      if (obj.itemListElement) walk(obj.itemListElement);
      return;
    }
  };

  walk(input);
  return out;
}

function parseJsonObjectFromText(raw: string): Record<string, unknown> {
  const cleaned = raw.replace(/```json\n?/gi, '').replace(/```\n?/g, '').trim();
  try {
    return JSON.parse(cleaned);
  } catch {
    const start = cleaned.indexOf('{');
    const end = cleaned.lastIndexOf('}');
    if (start !== -1 && end > start) {
      return JSON.parse(cleaned.slice(start, end + 1));
    }
    throw new Error('AI returned invalid JSON');
  }
}

function normalizeInputUrl(rawUrl: string): string {
  const trimmed = rawUrl.trim();
  if (!trimmed) return '';
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  if (/^www\./i.test(trimmed)) return `https://${trimmed}`;
  return trimmed.includes('.') ? `https://${trimmed}` : trimmed;
}

function ingredientFromObject(value: Record<string, unknown>): string {
  const quantity = String(value.quantity ?? value.amount ?? value.qty ?? '').trim();
  const unit = String(value.unit ?? value.measure ?? '').trim();
  const name = String(value.name ?? value.ingredient ?? value.item ?? value.text ?? '').trim();

  if (!name) return '';
  const prefix = [quantity, unit].filter(Boolean).join(' ').trim();
  return prefix ? `${prefix} ${name}`.trim() : name;
}

function normalizeIngredients(input: unknown): string[] {
  if (!Array.isArray(input)) return [];

  return input
    .map((item) => {
      if (typeof item === 'string') return item.trim();
      if (item && typeof item === 'object') return ingredientFromObject(item as Record<string, unknown>);
      return '';
    })
    .map((line) => line.replace(/^[-•*]\s*/, '').replace(/\s+/g, ' ').trim())
    .filter(Boolean);
}

function decodeHtmlEntities(text: string): string {
  return text
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>');
}

function cleanIngredientCandidate(line: string): string {
  return decodeHtmlEntities(String(line || ''))
    .replace(/^[-•*▢]\s*/, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function ingredientNameForMatch(line: string): string {
  return cleanIngredientCandidate(line)
    .replace(/^(?:\d+\s+\d\/\d|\d+\/\d|\d+(?:[.,]\d+)?(?:\s*-\s*\d+(?:[.,]\d+)?)?|[¼½¾⅓⅔⅛⅜⅝⅞]|a|an)\s*/i, '')
    .replace(/^(?:cup|cups|tbsp|tablespoon|tablespoons|tsp|teaspoon|teaspoons|oz|ounce|ounces|lb|lbs|pound|pounds|g|gram|grams|kg|ml|l|liter|liters|clove|cloves|can|cans|jar|jars|slice|slices|pinch|dash|sprig|sprigs|package|packages|stick|sticks|bunch|bunches)\b\s*/i, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

function hasIngredientQuantity(line: string): boolean {
  return /^(?:[-•*▢]\s*)?(?:\d+\s+\d\/\d|\d+\/\d|\d+(?:[.,]\d+)?(?:\s*-\s*\d+(?:[.,]\d+)?)?|[¼½¾⅓⅔⅛⅜⅝⅞]|a|an)\b/i.test(cleanIngredientCandidate(line));
}

function looksLikeIngredientLine(line: string): boolean {
  const cleaned = cleanIngredientCandidate(line);
  if (!cleaned) return false;
  if (cleaned.length < 2 || cleaned.length > 160) return false;
  if (/^(yield|serves|prep time|cook time|total time)$/i.test(cleaned)) return false;
  return hasIngredientQuantity(cleaned) || /^[-•*▢]/.test(line) || cleaned.split(/\s+/).length <= 8;
}

function extractStructuredText(html: string): string {
  let cleaned = html;

  for (const tag of NON_CONTENT_TAGS) {
    cleaned = cleaned.replace(new RegExp(`<${tag}[^>]*>[\\s\\S]*?<\\/${tag}>`, 'gi'), '\n');
  }

  for (const tag of NON_ESSENTIAL_SECTIONS) {
    cleaned = cleaned.replace(new RegExp(`<${tag}[^>]*>[\\s\\S]*?<\\/${tag}>`, 'gi'), '\n');
  }

  cleaned = cleaned
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|section|article|li|ul|ol|h1|h2|h3|h4|h5|h6)>/gi, '\n')
    .replace(/<(li|p|div|section|article|h1|h2|h3|h4|h5|h6)[^>]*>/gi, '\n')
    .replace(/<!--([\s\S]*?)-->/g, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\r/g, '\n');

  return decodeHtmlEntities(cleaned)
    .split('\n')
    .map((line) => line.replace(/\s+/g, ' ').trim())
    .filter(Boolean)
    .join('\n');
}

function extractIngredientSectionLines(text: string): string[] {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  const startIndex = lines.findIndex((line) =>
    INGREDIENT_SECTION_HEADERS.some((header) => line.toLowerCase() === header || line.toLowerCase().startsWith(`${header}:`))
  );

  if (startIndex === -1) return [];

  const extracted: string[] = [];
  for (let i = startIndex + 1; i < lines.length; i++) {
    const line = lines[i];
    const lowered = line.toLowerCase();

    if (RECIPE_SECTION_END_HEADERS.some((header) => lowered === header || lowered.startsWith(`${header}:`))) {
      break;
    }

    if (!looksLikeIngredientLine(line)) {
      if (extracted.length > 0) break;
      continue;
    }

    extracted.push(cleanIngredientCandidate(line));
  }

  return extracted.filter(Boolean);
}

function upgradeIngredientLines(recipe: Record<string, unknown>, fallbackLines: string[]): Record<string, unknown> {
  const currentIngredients = normalizeIngredients(recipe.ingredients);
  if (currentIngredients.length === 0 || fallbackLines.length === 0) return recipe;

  const upgraded = currentIngredients.map((line, index) => {
    if (hasIngredientQuantity(line)) return line;

    const currentName = ingredientNameForMatch(line);
    const byName = fallbackLines.find((candidate) => ingredientNameForMatch(candidate) === currentName && hasIngredientQuantity(candidate));
    if (byName) return byName;

    const byIndex = fallbackLines[index];
    if (byIndex && hasIngredientQuantity(byIndex) && ingredientNameForMatch(byIndex) === currentName) {
      return byIndex;
    }

    return line;
  });

  return {
    ...recipe,
    ingredients: upgraded,
  };
}

function normalizeRecipePayload(recipe: Record<string, unknown>): Record<string, unknown> {
  return {
    ...recipe,
    ingredients: normalizeIngredients(recipe.ingredients),
  };
}


function extractRecipeFromMealDbPayload(payload: unknown): Record<string, unknown> | null {
  if (!payload || typeof payload !== 'object') return null;
  const data = payload as Record<string, unknown>;
  const meals = Array.isArray(data.meals) ? data.meals : [];
  const first = meals[0];
  if (!first || typeof first !== 'object') return null;

  const meal = first as Record<string, unknown>;
  if (!meal.idMeal && !meal.strMeal) return null;

  const ingredients: string[] = [];
  for (let i = 1; i <= 20; i++) {
    const name = String(meal[`strIngredient${i}`] ?? '').trim();
    if (!name) continue;
    const measure = String(meal[`strMeasure${i}`] ?? '').trim();
    ingredients.push(measure ? `${measure} ${name}`.replace(/\s+/g, ' ').trim() : name);
  }

  const instructions = String(meal.strInstructions ?? '')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  return {
    name: String(meal.strMeal || '').trim(),
    ingredients,
    instructions,
    cook_time: '30 min',
    difficulty: 'Intermediate',
    cuisine: meal.strArea ? String(meal.strArea) : null,
    tags: meal.strTags
      ? String(meal.strTags).split(',').map((t) => t.trim()).filter(Boolean)
      : [],
    image: String(meal.strMealThumb || ''),
    servings: '4',
  };
}

function extractRecipeFromJsonPayload(payload: unknown): Record<string, unknown> | null {
  if (!payload || typeof payload !== 'object') return null;

  const mealDb = extractRecipeFromMealDbPayload(payload);
  if (mealDb) return mealDb;

  const data = payload as Record<string, unknown>;
  const ingredients = normalizeIngredients(data.ingredients ?? data.recipeIngredient);
  const instructions = extractInstructionTexts(data.instructions ?? data.recipeInstructions);
  const name = String(data.name ?? data.title ?? '').trim();

  if (!name || ingredients.length === 0) return null;

  return {
    name,
    ingredients,
    instructions,
    cook_time: String(data.cook_time ?? data.totalTime ?? data.cookTime ?? '30 min'),
    difficulty: String(data.difficulty ?? 'Intermediate'),
    cuisine: data.cuisine ? String(data.cuisine) : null,
    tags: Array.isArray(data.tags)
      ? data.tags.map((t) => String(t).trim()).filter(Boolean)
      : [],
    image: String(data.image ?? ''),
    servings: String(data.servings ?? data.recipeYield ?? '4'),
  };
}

function extractRecipeWindow(text: string): string {
  const normalized = text.replace(/\s+/g, ' ').trim();
  if (!normalized) return '';

  const recipeSignals = [
    'ingredients',
    'instructions',
    'directions',
    'method',
    'prep time',
    'cook time',
    'servings',
    'nutrition',
  ];

  const lower = normalized.toLowerCase();
  const firstHit = recipeSignals
    .map((signal) => lower.indexOf(signal))
    .filter((idx) => idx >= 0)
    .sort((a, b) => a - b)[0];

  if (typeof firstHit !== 'number') return normalized.slice(0, 20000);

  const start = Math.max(0, firstHit - 1800);
  const end = Math.min(normalized.length, firstHit + 15000);
  return normalized.slice(start, end);
}
function cleanHtmlForAi(html: string): string {
  let cleaned = html;

  for (const tag of NON_CONTENT_TAGS) {
    cleaned = cleaned.replace(new RegExp(`<${tag}[^>]*>[\\s\\S]*?<\\/${tag}>`, 'gi'), ' ');
  }

  for (const tag of NON_ESSENTIAL_SECTIONS) {
    cleaned = cleaned.replace(new RegExp(`<${tag}[^>]*>[\\s\\S]*?<\\/${tag}>`, 'gi'), ' ');
  }

  cleaned = cleaned
    .replace(/<!--([\s\S]*?)-->/g, ' ')
    .replace(/<(?:button|input|select|option|label)[^>]*>[\s\S]*?<\/(?:button|select|option|label)>/gi, ' ')
    .replace(/<(?:button|input|select|option|label)[^>]*\/?>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  return extractRecipeWindow(cleaned);
}

function extractRecipeFromJsonLd(html: string): Record<string, unknown> | null {
  const scripts = [...html.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)]
    .map((m) => m[1]?.trim())
    .filter(Boolean) as string[];

  const collectCandidates = (node: unknown): Record<string, unknown>[] => {
    if (!node) return [];
    if (Array.isArray(node)) return node.flatMap(collectCandidates);
    if (typeof node === 'object') {
      const obj = node as Record<string, unknown>;
      if (obj['@graph']) return collectCandidates(obj['@graph']);
      return [obj];
    }
    return [];
  };

  const isRecipeType = (typeValue: unknown): boolean => {
    if (!typeValue) return false;
    if (Array.isArray(typeValue)) return typeValue.some((t) => String(t).toLowerCase() === 'recipe');
    return String(typeValue).toLowerCase() === 'recipe';
  };

  for (const script of scripts) {
    try {
      const parsed = JSON.parse(script);
      const candidates = collectCandidates(parsed);
      const recipe = candidates.find((item) => isRecipeType(item['@type']));
      if (!recipe) continue;

      const ingredients = Array.isArray(recipe.recipeIngredient)
        ? recipe.recipeIngredient.map((item) => String(item).trim()).filter(Boolean)
        : [];
      const instructions = extractInstructionTexts(recipe.recipeInstructions);
      const servings = normalizeYield(recipe.recipeYield);
      const totalTime = isoDurationToText(String(recipe.totalTime || ''));
      const cookTime = isoDurationToText(String(recipe.cookTime || ''));
      const prepTime = isoDurationToText(String(recipe.prepTime || ''));
      const timeText = totalTime || [prepTime, cookTime].filter(Boolean).join(' + ') || '';

      const nutrition = recipe.nutrition && typeof recipe.nutrition === 'object'
        ? (recipe.nutrition as Record<string, unknown>)
        : null;

      const nutritionParts = nutrition
        ? [
            nutrition.calories ? `Calories: ${nutrition.calories}` : '',
            nutrition.proteinContent ? `Protein: ${nutrition.proteinContent}` : '',
            nutrition.carbohydrateContent ? `Carbs: ${nutrition.carbohydrateContent}` : '',
            nutrition.fatContent ? `Fat: ${nutrition.fatContent}` : '',
          ].filter(Boolean)
        : [];

      return {
        name: String(recipe.name || '').trim(),
        ingredients,
        instructions,
        cook_time: timeText || '30 min',
        difficulty: 'Intermediate',
        cuisine: recipe.recipeCuisine ? String(recipe.recipeCuisine) : null,
        tags: Array.isArray(recipe.keywords)
          ? recipe.keywords.map((k) => String(k).trim()).filter(Boolean)
          : typeof recipe.keywords === 'string'
            ? recipe.keywords.split(',').map((k) => k.trim()).filter(Boolean)
            : [],
        image: typeof recipe.image === 'string'
          ? recipe.image
          : Array.isArray(recipe.image) && recipe.image.length
            ? String(recipe.image[0])
            : '',
        servings: servings || '4',
        nutrition_summary: nutritionParts.join(', '),
      };
    } catch {
      // Continue trying next JSON-LD blob
    }
  }

  return null;
}

async function callAiExtraction(params: {
  apiKey: string;
  textContent?: string;
  imageBase64?: string;
  imageMimeType?: string;
}): Promise<Record<string, unknown>> {
  const messages = params.imageBase64
    ? [
        { role: 'system', content: IMAGE_EXTRACT_PROMPT },
        {
          role: 'user',
          content: [
            { type: 'text', text: 'Extract the recipe from this image.' },
            {
              type: 'image_url',
              image_url: {
                url: `data:${params.imageMimeType || 'image/jpeg'};base64,${params.imageBase64}`,
              },
            },
          ],
        },
      ]
    : [
        { role: 'system', content: TEXT_EXTRACT_PROMPT },
        { role: 'user', content: `Extract the recipe from this content:\n\n${params.textContent || ''}` },
      ];

  const aiRes = await fetch(AI_GATEWAY_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${params.apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'google/gemini-1.5-flash',
      messages,
      temperature: 0.1,
    }),
  });

  if (!aiRes.ok) {
    const errText = await aiRes.text();
    console.error('AI gateway error:', aiRes.status, errText);
    throw new Error('AI extraction failed');
  }

  const aiData = await aiRes.json();
  const rawResponse = aiData.choices?.[0]?.message?.content || '';
  return parseJsonObjectFromText(String(rawResponse));
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { url, textContent, imageBase64, imageMimeType } = await req.json();
    const normalizedUrl = typeof url === 'string' ? normalizeInputUrl(url) : '';

    if (!normalizedUrl && !textContent && !imageBase64) {
      return new Response(
        JSON.stringify({ success: false, error: 'Provide a URL, text content, or image' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      return new Response(
        JSON.stringify({ success: false, error: 'AI service not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    let content = textContent || '';
    let recipe: Record<string, unknown> | null = null;
    let previewText = '';
    let structuredText = '';
    let extractedIngredientLines: string[] = [];

    if (normalizedUrl) {
      let html = '';
      const attemptedStatuses: string[] = [];
      try {
        const pageRes = await fetch(normalizedUrl, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36',
            Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.9',
          },
        });

        attemptedStatuses.push(`direct:${pageRes.status}`);

        if (pageRes.ok) {
          const contentType = (pageRes.headers.get('content-type') || '').toLowerCase();

          if (contentType.includes('application/json')) {
            const jsonPayload = await pageRes.json();
            recipe = extractRecipeFromJsonPayload(jsonPayload);
          } else {
            html = await pageRes.text();
          }
        }
      } catch (fetchError) {
        console.warn(`Direct fetch failed for ${normalizedUrl}:`, fetchError);
        attemptedStatuses.push('direct:network_error');
      }

      if (!recipe && !html) {
        for (const proxy of PROXY_FETCHERS) {
          try {
            const proxyRes = await fetch(proxy.buildUrl(normalizedUrl));
            attemptedStatuses.push(`${proxy.label}:${proxyRes.status}`);
            if (proxyRes.ok) {
              html = await proxyRes.text();
              break;
            }
          } catch {
            attemptedStatuses.push(`${proxy.label}:network_error`);
          }
        }
      }

      if (!recipe && !html) {
        return new Response(
          JSON.stringify({
            success: false,
            error: `Unable to fetch this URL. Attempts: ${attemptedStatuses.join(', ')}`,
          }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        );
      }

      if (!recipe && html) {
        recipe = extractRecipeFromJsonLd(html);
      }

      if (html) {
        structuredText = extractStructuredText(html);
        extractedIngredientLines = extractIngredientSectionLines(structuredText);
        previewText = cleanHtmlForAi(html);
      }

      if (!recipe && previewText) {
        content = previewText;
      }
    }

    if (!recipe) {
      if (!imageBase64 && (!content || content.length < 20)) {
        return new Response(
          JSON.stringify({ success: false, error: 'Could not extract meaningful content' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        );
      }

      recipe = await callAiExtraction({
        apiKey: LOVABLE_API_KEY,
        textContent: content,
        imageBase64,
        imageMimeType,
      });
    }

    recipe = normalizeRecipePayload(recipe);
    recipe = upgradeIngredientLines(recipe, extractedIngredientLines);

    if (normalizedUrl) {
      recipe = {
        ...recipe,
        source_url: normalizedUrl,
        raw_api_payload: {
          import_type: 'website',
          source_url: normalizedUrl,
          preview_text: previewText || content || '',
          structured_text: structuredText,
          extracted_ingredient_lines: extractedIngredientLines,
        },
      };
    }

    if (!recipe?.name || !Array.isArray(recipe.ingredients) || recipe.ingredients.length === 0) {
      return new Response(
        JSON.stringify({ success: false, error: 'Could not extract a valid recipe from this content' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    return new Response(JSON.stringify({ success: true, recipe }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Import error:', error);
    const msg = error instanceof Error ? error.message : 'Import failed';
    return new Response(JSON.stringify({ success: false, error: msg }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
