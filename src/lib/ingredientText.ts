const LEADING_BULLET = /^▢\s*/;

const QUANTITY_PREFIX = /^\s*([\d\s./¼½¾⅓⅔⅛⅜⅝⅞-]+\s*(?:to\s+[\d\s./¼½¾⅓⅔⅛⅜⅝⅞-]+)?\s*(?:x\s*)?)(.*)$/i;

const DECIMAL_FRACTIONS: Record<string, number> = {
  '¼': 0.25,
  '½': 0.5,
  '¾': 0.75,
  '⅓': 1 / 3,
  '⅔': 2 / 3,
  '⅛': 0.125,
  '⅜': 0.375,
  '⅝': 0.625,
  '⅞': 0.875,
};

export interface IngredientParts {
  quantity: string;
  name: string;
}

export function parseIngredientLine(line: string): IngredientParts {
  const cleaned = String(line || '').replace(LEADING_BULLET, '').trim();
  if (!cleaned) return { quantity: '', name: '' };

  const match = cleaned.match(QUANTITY_PREFIX);
  if (!match) return { quantity: '', name: cleaned };

  const quantity = match[1]?.trim() || '';
  const name = match[2]?.trim() || cleaned;

  if (!quantity || name.length === cleaned.length) {
    return { quantity: '', name: cleaned };
  }

  return { quantity, name };
}

export function composeIngredientLine(parts: IngredientParts): string {
  const name = parts.name.trim();
  const quantity = parts.quantity.trim();
  return quantity ? `${quantity} ${name}`.trim() : name;
}

export function ingredientNameOnly(line: string): string {
  return parseIngredientLine(line).name;
}

function parseNumericToken(token: string): number | null {
  const trimmed = token.trim();
  if (!trimmed) return null;
  if (DECIMAL_FRACTIONS[trimmed] !== undefined) return DECIMAL_FRACTIONS[trimmed];

  if (trimmed.includes('/')) {
    const [n, d] = trimmed.split('/').map(Number);
    if (!Number.isNaN(n) && !Number.isNaN(d) && d !== 0) return n / d;
    return null;
  }

  const asNum = Number(trimmed);
  return Number.isNaN(asNum) ? null : asNum;
}

function parseQuantityValue(quantity: string): number | null {
  const tokenMatch = quantity.match(/[\d./¼½¾⅓⅔⅛⅜⅝⅞]+(?:\s+[\d./¼½¾⅓⅔⅛⅜⅝⅞]+)?/);
  if (!tokenMatch) return null;

  const token = tokenMatch[0].trim();
  const parts = token.split(/\s+/);
  const values = parts.map(parseNumericToken);
  if (values.some((v) => v === null)) return null;

  return values.reduce((sum, v) => sum + (v || 0), 0);
}

export function scaleIngredientQuantity(quantity: string, multiplier: number): string {
  const numeric = parseQuantityValue(quantity);
  if (numeric === null) return quantity;

  const scaled = Math.round(numeric * multiplier * 100) / 100;
  return quantity.replace(/[\d./¼½¾⅓⅔⅛⅜⅝⅞]+(?:\s+[\d./¼½¾⅓⅔⅛⅜⅝⅞]+)?/, `${scaled}`);
}
