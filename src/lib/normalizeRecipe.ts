import type { Recipe } from '@/data/recipes';
import { normalizeIngredients } from '@/lib/normalizeIngredients';

function splitInstructionBlock(text: string): string[] {
  const normalized = text
    .replace(/\r/g, '\n')
    .replace(/\u2022/g, '\n• ')
    .replace(/\s+(?=(?:step\s*)?\d+\s*[).:-])/gi, '\n');

  const rawLines = normalized
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean);

  const splitByMarkers = rawLines.flatMap((line) => {
    const segments = line
      .split(/(?=(?:step\s*)?\d+\s*[).:-]\s+)/gi)
      .map((segment) => segment.trim())
      .filter(Boolean);
    return segments.length ? segments : [line];
  });

  return splitByMarkers
    .map((line) => line.replace(/^(?:step\s*)?\d+\s*[).:-]\s*/i, '').trim())
    .filter((line) => Boolean(line) && !/^step$/i.test(line));
}

export function normalizeImage(value: unknown): string {
  if (!value) return '/placeholder.svg';

  if (Array.isArray(value)) {
    const first = value.find(v => typeof v === 'string' || (v && typeof v === 'object' && ('url' in v || 'src' in v)));
    if (!first) return '/placeholder.svg';
    if (typeof first === 'object' && first !== null) {
      if ('url' in first) return String((first as any).url).trim() || '/placeholder.svg';
      if ('src' in first) return String((first as any).src).trim() || '/placeholder.svg';
    }
    return String(first).trim() || '/placeholder.svg';
  }

  if (typeof value === 'object' && value !== null) {
    if ('url' in value) return String((value as any).url).trim() || '/placeholder.svg';
    if ('src' in value) return String((value as any).src).trim() || '/placeholder.svg';
  }

  if (typeof value === 'string') {
    let clean = value.trim();
    if (clean.startsWith('"') && clean.endsWith('"')) clean = clean.slice(1, -1);
    if (clean.startsWith("'") && clean.endsWith("'")) clean = clean.slice(1, -1);

    if (clean.startsWith('{') || clean.startsWith('[')) {
      try {
        const parsed = JSON.parse(clean);
        return normalizeImage(parsed);
      } catch {
        // fallback
      }
    }
    return clean || '/placeholder.svg';
  }

  return '/placeholder.svg';
}

export function normalizeStringArray(value: unknown): string[] {
  if (Array.isArray(value)) return value.map((v) => String(v).trim()).filter(Boolean);
  if (typeof value === 'string') {
    return splitInstructionBlock(value);
  }
  return [];
}

export function normalizeRecipe(recipe: any, idFallback?: string): Recipe {
  return {
    ...recipe,
    id: String(recipe?.id || idFallback || ''),
    name: String(recipe?.name || 'Untitled Recipe'),
    image: normalizeImage(recipe?.image),
    cook_time: String(recipe?.cook_time || '30 min'),
    difficulty: String(recipe?.difficulty || 'Intermediate'),
    ingredients: normalizeIngredients(recipe?.ingredients, recipe?.raw_api_payload),
    instructions: normalizeStringArray(recipe?.instructions),
    tags: normalizeStringArray(recipe?.tags),
    cuisine: recipe?.cuisine || null,
    source: recipe?.source ? String(recipe.source) : undefined,
    source_url: recipe?.source_url ? String(recipe.source_url) : undefined,
    raw_api_payload: recipe?.raw_api_payload ?? undefined,
    created_by: recipe?.created_by ?? null,
    chef: recipe?.chef ? String(recipe.chef) : null,
    is_public: typeof recipe?.is_public === 'boolean' ? recipe.is_public : undefined,
    servings: Number(recipe?.servings || 4),
  };
}
