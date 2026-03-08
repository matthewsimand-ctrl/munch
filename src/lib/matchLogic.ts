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
