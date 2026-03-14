const LEADING_BULLET = /^▢\s*/;

const QUANTITY_PREFIX = /^\s*((?:\d+\s+\d\/\d|\d+\/\d|\d+(?:[.,]\d+)?(?:[a-zA-Z]+)?|[¼½¾⅓⅔⅛⅜⅝⅞]|a|an)\b(?:\s*-\s*(?:\d+\s+\d\/\d|\d+\/\d|\d+(?:[.,]\d+)?(?:[a-zA-Z]+)?|[¼½¾⅓⅔⅛⅜⅝⅞]))?)(.*)$/i;
const UNIT_WORDS = new Set([
  'cup', 'cups', 'tbsp', 'tablespoon', 'tablespoons', 'tsp', 'teaspoon', 'teaspoons',
  'oz', 'ounce', 'ounces', 'lb', 'lbs', 'pound', 'pounds', 'g', 'gram', 'grams',
  'kg', 'ml', 'l', 'liter', 'liters', 'clove', 'cloves', 'can', 'cans', 'jar', 'jars',
  'slice', 'slices', 'pinch', 'dash', 'sprig', 'sprigs', 'package', 'packages',
  'pkg', 'pkgs', 'pack', 'packs', 'box', 'boxes', 'piece', 'pieces', 'pc', 'pcs',
  'stick', 'sticks', 'bunch', 'bunches', 'bag', 'bags', 'bottle', 'bottles',
  'carton', 'cartons', 'tub', 'tubs', 'block', 'blocks',
]);

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

const IRREGULAR_PLURALS: Record<string, string> = {
  loaf: 'loaves',
};

const IRREGULAR_SINGULARS: Record<string, string> = {
  loaves: 'loaf',
  pieces: 'piece',
  boxes: 'box',
  packages: 'package',
  bunches: 'bunch',
  slices: 'slice',
  sticks: 'stick',
  cloves: 'clove',
  jars: 'jar',
  cans: 'can',
  cartons: 'carton',
  bottles: 'bottle',
  bags: 'bag',
  blocks: 'block',
  tubs: 'tub',
};

const INVARIANT_UNITS = new Set([
  'lb', 'lbs', 'oz', 'g', 'kg', 'ml', 'l', 'tbsp', 'tsp', 'pc', 'pcs',
]);

export interface IngredientParts {
  quantity: string;
  name: string;
}

export function parseIngredientLine(line: string): IngredientParts {
  const cleaned = String(line || '').replace(LEADING_BULLET, '').trim();
  if (!cleaned) return { quantity: '', name: '' };

  const match = cleaned.match(QUANTITY_PREFIX);
  if (!match) return { quantity: '', name: cleaned };

  let quantity = match[1]?.trim() || '';
  let remainder = match[2]?.trim() || '';

  if (remainder.startsWith('(')) {
    const end = remainder.indexOf(')');
    if (end > 0) {
      quantity = `${quantity} ${remainder.slice(0, end + 1).trim()}`.trim();
      remainder = remainder.slice(end + 1).trim();
    }
  }

  const tokens = remainder.split(/\s+/).filter(Boolean);
  const quantityTokens: string[] = [];
  while (tokens.length > 0) {
    const token = tokens[0].toLowerCase().replace(/[.,]/g, '');
    if (!UNIT_WORDS.has(token)) break;
    quantityTokens.push(tokens.shift() as string);
  }

  if (quantityTokens.length > 0) {
    quantity = `${quantity} ${quantityTokens.join(' ')}`.trim();
    remainder = tokens.join(' ').trim();
  }

  const name = remainder || cleaned;

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

export function suggestQuantityForItem(name: string): string {
  const normalized = String(name || "").toLowerCase().trim();
  if (!normalized) return "1";

  if (/(beef|steak|meat|ground beef|ground turkey|minced|chicken|pork|sausage|fish|salmon|shrimp)/.test(normalized)) {
    return "1 lb";
  }
  if (/(pasta|spaghetti|penne|macaroni|ramen|noodle)/.test(normalized)) {
    return "1 box";
  }
  if (/(rice|flour|sugar|oats|beans|lentils)/.test(normalized)) {
    return "1 bag";
  }
  if (/(bread|bagel|bun|roll|tortilla|wrap)/.test(normalized)) {
    return "1 package";
  }
  if (/(milk|juice|broth|stock|cream)/.test(normalized)) {
    return "1 carton";
  }
  if (/(egg|apple|banana|lemon|lime|orange|avocado|potato|onion|tomato|pepper|carrot|garlic)/.test(normalized)) {
    return "1 piece";
  }
  if (/(cheese|butter)/.test(normalized)) {
    return "1 package";
  }
  if (/(sauce|oil|vinegar|dressing)/.test(normalized)) {
    return "1 bottle";
  }
  if (/(yogurt|ice cream)/.test(normalized)) {
    return "1 tub";
  }
  return "1";
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

function greatestCommonDivisor(a: number, b: number): number {
  let x = Math.abs(a);
  let y = Math.abs(b);
  while (y !== 0) {
    const temp = y;
    y = x % y;
    x = temp;
  }
  return x || 1;
}

function formatFractionalValue(value: number): string {
  const rounded = Math.round(value * 1000) / 1000;
  const whole = Math.floor(rounded);
  const fraction = rounded - whole;

  if (fraction < 0.01) return `${whole}`;

  const denominators = [2, 3, 4, 8, 16];
  let bestNumerator = 0;
  let bestDenominator = 1;
  let bestError = Number.POSITIVE_INFINITY;

  for (const denominator of denominators) {
    const numerator = Math.round(fraction * denominator);
    if (numerator === 0) continue;
    const approximation = numerator / denominator;
    const error = Math.abs(fraction - approximation);
    if (error < bestError) {
      bestError = error;
      bestNumerator = numerator;
      bestDenominator = denominator;
    }
  }

  if (!bestNumerator || bestError > 0.03) {
    return `${Math.round(rounded * 100) / 100}`.replace(/\.00$/, '').replace(/(\.\d)0$/, '$1');
  }

  const gcd = greatestCommonDivisor(bestNumerator, bestDenominator);
  let numerator = bestNumerator / gcd;
  let denominator = bestDenominator / gcd;
  let nextWhole = whole;

  if (numerator === denominator) {
    nextWhole += 1;
    numerator = 0;
    denominator = 1;
  }

  if (numerator === 0) return `${nextWhole}`;
  if (nextWhole > 0) return `${nextWhole} ${numerator}/${denominator}`;
  return `${numerator}/${denominator}`;
}

function pluralizeUnit(unit: string, amount: number): string {
  const normalized = unit.toLowerCase();
  if (amount <= 1) {
    if (IRREGULAR_SINGULARS[normalized]) return IRREGULAR_SINGULARS[normalized];
    if (normalized.endsWith('ies')) return `${normalized.slice(0, -3)}y`;
    if (normalized.endsWith('ves')) return normalized.slice(0, -3) + 'f';
    if (normalized.endsWith('s') && !normalized.endsWith('ss') && !normalized.endsWith('lbs') && !normalized.endsWith('pcs')) {
      return normalized.slice(0, -1);
    }
    return normalized;
  }

  if (INVARIANT_UNITS.has(normalized)) return normalized;
  if (IRREGULAR_PLURALS[normalized]) return IRREGULAR_PLURALS[normalized];
  if (normalized.endsWith('s')) return normalized;
  if (normalized.endsWith('y') && !/[aeiou]y$/.test(normalized)) return `${normalized.slice(0, -1)}ies`;
  if (/(s|x|z|ch|sh)$/.test(normalized)) return `${normalized}es`;
  if (normalized.endsWith('f')) return `${normalized.slice(0, -1)}ves`;
  if (normalized.endsWith('fe')) return `${normalized.slice(0, -2)}ves`;
  return `${normalized}s`;
}

function formatQuantityUnits(quantity: string, amount: number): string {
  return quantity.replace(/\b([a-zA-Z]+)\b/g, (token) => {
    if (!UNIT_WORDS.has(token.toLowerCase())) return token;
    return pluralizeUnit(token, amount);
  });
}

export function canDecreaseQuantity(quantity: string | undefined): boolean {
  const current = String(quantity ?? '').trim();
  if (!current) return false;

  const numeric = parseQuantityValue(current);
  if (numeric === null) return false;

  return numeric > 1;
}

export function scaleIngredientQuantity(quantity: string, multiplier: number): string {
  const numeric = parseQuantityValue(quantity);
  if (numeric === null) return quantity;

  const scaled = Math.round(numeric * multiplier * 1000) / 1000;
  const formatted = formatFractionalValue(scaled);
  return formatQuantityUnits(
    quantity.replace(/[\d./¼½¾⅓⅔⅛⅜⅝⅞]+(?:\s+[\d./¼½¾⅓⅔⅛⅜⅝⅞]+)?/, formatted),
    scaled
  );
}

export function adjustQuantityString(quantity: string | undefined, delta: number): string {
  const current = String(quantity ?? '').trim();
  if (!current) {
    return delta > 0 ? String(delta) : '';
  }

  const tokenMatch = current.match(/[\d./¼½¾⅓⅔⅛⅜⅝⅞]+(?:\s+[\d./¼½¾⅓⅔⅛⅜⅝⅞]+)?/);
  const numeric = parseQuantityValue(current);
  if (!tokenMatch || numeric === null) return current;

  const nextValue = Math.max(0, Math.round((numeric + delta) * 100) / 100);
  if (nextValue === 0) return '';

  return formatQuantityUnits(current.replace(tokenMatch[0], `${nextValue}`), nextValue);
}
