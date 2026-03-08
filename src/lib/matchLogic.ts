// Base-form mapping: maps specific variants to their generic base ingredient
const BASE_FORMS: Record<string, string> = {
  'chicken drumstick': 'chicken',
  'chicken drumsticks': 'chicken',
  'chicken thigh': 'chicken',
  'chicken thighs': 'chicken',
  'chicken breast': 'chicken',
  'chicken breasts': 'chicken',
  'chicken wing': 'chicken',
  'chicken wings': 'chicken',
  'chicken leg': 'chicken',
  'chicken legs': 'chicken',
  'ground beef': 'beef',
  'beef steak': 'beef',
  'beef chuck': 'beef',
  'pork chop': 'pork',
  'pork chops': 'pork',
  'pork loin': 'pork',
  'salmon fillet': 'salmon',
  'salmon fillets': 'salmon',
  'shrimp': 'shrimp',
  'red onion': 'onion',
  'yellow onion': 'onion',
  'white onion': 'onion',
  'green onions': 'onion',
  'cherry tomatoes': 'tomato',
  'roma tomatoes': 'tomato',
  'bell pepper': 'pepper',
  'red bell pepper': 'pepper',
  'green bell pepper': 'pepper',
};

function getBaseForms(str: string): string[] {
  const lower = str.toLowerCase().trim();
  const bases = [lower];
  if (BASE_FORMS[lower]) bases.push(BASE_FORMS[lower]);
  return bases;
}

function normalize(str: string): string {
  return str
    .toLowerCase()
    .trim()
    .replace(/s$/, '')       // strip trailing 's'
    .replace(/es$/, '')      // strip trailing 'es'
    .replace(/ies$/, 'y');   // berries -> berry
}

function tokenize(str: string): string[] {
  return normalize(str).split(/\s+/);
}

function fuzzyMatch(pantryItem: string, recipeIngredient: string): boolean {
  const pNorm = normalize(pantryItem);
  const rNorm = normalize(recipeIngredient);

  // Direct substring match
  if (rNorm.includes(pNorm) || pNorm.includes(rNorm)) return true;

  // Base-form match: e.g. "chicken drumstick" in pantry matches "chicken" in recipe and vice versa
  const pBases = getBaseForms(pantryItem);
  const rBases = getBaseForms(recipeIngredient);
  for (const pb of pBases) {
    for (const rb of rBases) {
      const pbN = normalize(pb);
      const rbN = normalize(rb);
      if (pbN.includes(rbN) || rbN.includes(pbN)) return true;
    }
  }

  // Token-level: every token in pantry item appears in recipe ingredient
  const pTokens = tokenize(pantryItem);
  const rTokens = tokenize(recipeIngredient);
  return pTokens.every(pt => rTokens.some(rt => rt.includes(pt) || pt.includes(rt)));
}

export interface MatchResult {
  percentage: number;
  matched: string[];
  missing: string[];
  status: 'perfect' | 'almost' | 'needs-shopping';
}

export function calculateMatch(pantry: string[], recipeIngredients: string[]): MatchResult {
  const matched: string[] = [];
  const missing: string[] = [];

  for (const ingredient of recipeIngredients) {
    const found = pantry.some(item => fuzzyMatch(item, ingredient));
    if (found) {
      matched.push(ingredient);
    } else {
      missing.push(ingredient);
    }
  }

  const percentage = recipeIngredients.length > 0
    ? Math.round((matched.length / recipeIngredients.length) * 100)
    : 0;

  const status: MatchResult['status'] =
    missing.length === 0 ? 'perfect' :
    missing.length <= 2 ? 'almost' : 'needs-shopping';

  return { percentage, matched, missing, status };
}
