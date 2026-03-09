const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const AI_GATEWAY_URL = 'https://ai.gateway.lovable.dev/v1/chat/completions';
const R_JINA_PROXY_PREFIX = 'https://r.jina.ai/';

const PROXY_FETCHERS: Array<{ label: string; buildUrl: (url: string) => string }> = [
  { label: 'r.jina.ai direct', buildUrl: (url) => `${R_JINA_PROXY_PREFIX}${url}` },
  { label: 'r.jina.ai encoded', buildUrl: (url) => `${R_JINA_PROXY_PREFIX}http://${encodeURIComponent(url)}` },
];

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

function normalizeRecipePayload(recipe: Record<string, unknown>): Record<string, unknown> {
  return {
    ...recipe,
    ingredients: normalizeIngredients(recipe.ingredients),
  };
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
      model: 'google/gemini-2.5-flash',
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

    if (!url && !textContent && !imageBase64) {
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

    if (url) {
      let html = '';
      const attemptedStatuses: string[] = [];
      const pageRes = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36',
          Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.9',
        },
      });

      attemptedStatuses.push(`direct:${pageRes.status}`);

      if (pageRes.ok) {
        html = await pageRes.text();
      } else {
        console.warn(`Direct fetch failed (${pageRes.status}) for ${url}, trying proxy fallback`);

        for (const proxy of PROXY_FETCHERS) {
          const proxyRes = await fetch(proxy.buildUrl(url));
          attemptedStatuses.push(`${proxy.label}:${proxyRes.status}`);
          if (proxyRes.ok) {
            html = await proxyRes.text();
            break;
          }
        }

        if (!html) {
          return new Response(
            JSON.stringify({
              success: false,
              error: `Unable to fetch this URL (often blocked by site protections). Attempts: ${attemptedStatuses.join(', ')}`,
            }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
          );
        }
      }

      recipe = extractRecipeFromJsonLd(html);

      if (!recipe) {
        content = html
          .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
          .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
          .replace(/<[^>]+>/g, ' ')
          .replace(/\s+/g, ' ')
          .trim()
          .slice(0, 20000);
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
