import { composeIngredientLine, parseIngredientLine } from '@/lib/ingredientText';

type IngredientLike = string | { name?: unknown; ingredient?: unknown; quantity?: unknown; measure?: unknown };

function toLine(item: IngredientLike): string {
  if (typeof item === 'string') return item.trim();
  const name = String(item?.name ?? item?.ingredient ?? '').trim();
  const quantity = String(item?.quantity ?? item?.measure ?? '').trim();
  return composeIngredientLine({ name, quantity });
}

function extractMealDbLines(rawPayload: any): string[] {
  if (!rawPayload || typeof rawPayload !== 'object') return [];
  const lines: string[] = [];
  for (let i = 1; i <= 20; i++) {
    const name = String(rawPayload[`strIngredient${i}`] || '').trim();
    if (!name) continue;
    const quantity = String(rawPayload[`strMeasure${i}`] || '').trim();
    lines.push(composeIngredientLine({ name, quantity }));
  }
  return lines;
}

export function normalizeIngredients(value: unknown, rawPayload?: unknown): string[] {
  const base = Array.isArray(value)
    ? value.map(toLine).map((v) => v.trim()).filter(Boolean)
    : typeof value === 'string'
      ? value.split(/\r?\n/).map((v) => v.trim()).filter(Boolean)
      : [];

  const mealDb = extractMealDbLines(rawPayload);
  if (mealDb.length === 0) return base;

  if (base.length === 0) return mealDb;

  // Upgrade existing entries that are missing quantity with quantity from MealDB payload.
  const upgraded = base.map((line, idx) => {
    const parsed = parseIngredientLine(line);
    if (parsed.quantity) return line;

    const fallback = mealDb[idx];
    if (!fallback) return line;

    const fromPayload = parseIngredientLine(fallback);
    if (!fromPayload.quantity) return line;

    return parsed.name.toLowerCase() === fromPayload.name.toLowerCase() ? fallback : line;
  });

  return upgraded;
}
