export interface InstacartLineItem {
  name: string;
  display_text?: string;
  quantity?: number;
  unit?: string;
}

interface GroceryExportItem {
  name: string;
  qty?: string;
}

const FRACTIONS: Record<string, number> = {
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

const UNIT_ALIASES: Record<string, string> = {
  c: 'cup',
  cup: 'cup',
  cups: 'cups',
  tablespoon: 'tablespoon',
  tablespoons: 'tablespoons',
  tb: 'tablespoon',
  tbs: 'tablespoon',
  tbsp: 'tablespoon',
  teaspoon: 'teaspoon',
  teaspoons: 'teaspoons',
  ts: 'teaspoon',
  tsp: 'teaspoon',
  tspn: 'teaspoon',
  'fl oz can': 'fl oz can',
  'fl oz container': 'fl oz container',
  'fl oz jar': 'fl oz jar',
  'fl oz pouch': 'fl oz pouch',
  'fl oz ounce': 'fl oz ounce',
  gallon: 'gallon',
  gallons: 'gallons',
  gal: 'gallon',
  gals: 'gallons',
  milliliter: 'milliliter',
  millilitre: 'milliliter',
  milliliters: 'milliliters',
  millilitres: 'milliliters',
  ml: 'milliliter',
  mls: 'milliliters',
  liter: 'liter',
  litre: 'liter',
  liters: 'liters',
  litres: 'liters',
  l: 'liter',
  pint: 'pint',
  pints: 'pints',
  pt: 'pint',
  pts: 'pints',
  quart: 'quart',
  quarts: 'quarts',
  qt: 'quart',
  qts: 'quarts',
  gram: 'gram',
  grams: 'grams',
  g: 'gram',
  gs: 'grams',
  kilogram: 'kilogram',
  kilograms: 'kilograms',
  kg: 'kilogram',
  kgs: 'kilograms',
  'lb bag': 'lb bag',
  lb: 'lb',
  lbs: 'lbs',
  'lb can': 'lb can',
  'lb container': 'lb container',
  'per lb': 'per lb',
  ounce: 'ounce',
  ounces: 'ounces',
  oz: 'ounce',
  'oz bag': 'oz bag',
  'ounces bag': 'ounces bag',
  'oz can': 'oz can',
  'ounces can': 'ounces can',
  'oz container': 'oz container',
  'ounces container': 'ounces container',
  pound: 'pound',
  pounds: 'pounds',
  bunch: 'bunch',
  bunches: 'bunches',
  can: 'can',
  cans: 'cans',
  each: 'each',
  ear: 'ears',
  ears: 'ears',
  head: 'head',
  heads: 'heads',
  large: 'large',
  lrg: 'large',
  lge: 'large',
  lg: 'large',
  medium: 'medium',
  med: 'medium',
  md: 'medium',
  package: 'package',
  packages: 'packages',
  packet: 'packet',
  small: 'small',
  sm: 'small',
  unit: 'each',
  units: 'each',
  piece: 'each',
  pieces: 'each',
  pc: 'each',
  pcs: 'each',
  bag: 'package',
  bags: 'packages',
  box: 'package',
  boxes: 'packages',
  carton: 'package',
  cartons: 'packages',
  bottle: 'package',
  bottles: 'packages',
  jar: 'jar',
  jars: 'jars',
  loaf: 'each',
  loaves: 'each',
  clove: 'each',
  cloves: 'each',
  stick: 'each',
  sticks: 'each',
};

function parseNumericToken(token: string): number | null {
  const trimmed = token.trim();
  if (!trimmed) return null;
  if (FRACTIONS[trimmed] !== undefined) return FRACTIONS[trimmed];

  if (trimmed.includes('/')) {
    const [numerator, denominator] = trimmed.split('/').map(Number);
    if (!Number.isNaN(numerator) && !Number.isNaN(denominator) && denominator !== 0) {
      return numerator / denominator;
    }
    return null;
  }

  const asNumber = Number(trimmed);
  return Number.isNaN(asNumber) ? null : asNumber;
}

function parseInstacartMeasurement(quantityText: string): { quantity: number; unit: string } | null {
  const normalized = quantityText.trim().toLowerCase().replace(/\s+/g, ' ');
  if (!normalized) return null;

  const match = normalized.match(/^((?:\d+(?:\.\d+)?|\d+\/\d+|[¼½¾⅓⅔⅛⅜⅝⅞]|a|an)(?:\s+\d+\/\d+)?)\s*(.*)$/i);
  if (!match) return null;

  const rawQuantity = match[1].trim().toLowerCase();
  const rawUnit = match[2].trim().replace(/[().,]/g, '');

  const quantity =
    rawQuantity === 'a' || rawQuantity === 'an'
      ? 1
      : rawQuantity.split(/\s+/).reduce<number | null>((sum, token) => {
          const value = parseNumericToken(token);
          if (value === null) return null;
          return (sum ?? 0) + value;
        }, 0);

  if (!quantity || quantity <= 0) return null;

  if (!rawUnit) {
    return { quantity, unit: 'each' };
  }

  const direct = UNIT_ALIASES[rawUnit];
  if (direct) return { quantity, unit: direct };

  return null;
}

export function buildInstacartLineItems(items: GroceryExportItem[]): InstacartLineItem[] {
  return items
    .map((item) => {
      const name = String(item.name || '').trim();
      const qty = String(item.qty || '').trim();
      if (!name) return null;

      const parsedMeasurement = qty ? parseInstacartMeasurement(qty) : null;
      const lineItem: InstacartLineItem = {
        name,
      };

      if (qty) {
        lineItem.display_text = `${name} (${qty})`;
      }

      if (parsedMeasurement) {
        lineItem.quantity = parsedMeasurement.quantity;
        lineItem.unit = parsedMeasurement.unit;
      }

      return lineItem;
    })
    .filter((item): item is InstacartLineItem => Boolean(item));
}
