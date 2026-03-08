import type { Recipe } from '@/data/recipes';
import { getTimeBoost } from '@/lib/mealTimeUtils';

/**
 * Recommendation engine: scores recipes based on similarity to liked recipes.
 * Uses tag overlap, ingredient overlap, cuisine match, and difficulty match.
 * No AI — pure heuristic scoring.
 */

interface UserTasteProfile {
  tagFrequency: Record<string, number>;
  ingredientFrequency: Record<string, number>;
  cuisineFrequency: Record<string, number>;
  difficultyFrequency: Record<string, number>;
  totalLiked: number;
}

function normalize(s: string): string {
  return s.toLowerCase().trim();
}

/** Build a taste profile from liked recipes */
export function buildTasteProfile(likedRecipes: Recipe[]): UserTasteProfile {
  const tagFreq: Record<string, number> = {};
  const ingFreq: Record<string, number> = {};
  const cuisineFreq: Record<string, number> = {};
  const diffFreq: Record<string, number> = {};

  for (const r of likedRecipes) {
    for (const tag of (r.tags || [])) {
      const t = normalize(tag);
      tagFreq[t] = (tagFreq[t] || 0) + 1;
    }
    for (const ing of (r.ingredients || [])) {
      const i = normalize(ing);
      ingFreq[i] = (ingFreq[i] || 0) + 1;
    }
    if (r.cuisine) {
      const c = normalize(r.cuisine);
      cuisineFreq[c] = (cuisineFreq[c] || 0) + 1;
    }
    if (r.difficulty) {
      const d = normalize(r.difficulty);
      diffFreq[d] = (diffFreq[d] || 0) + 1;
    }
  }

  return {
    tagFrequency: tagFreq,
    ingredientFrequency: ingFreq,
    cuisineFrequency: cuisineFreq,
    difficultyFrequency: diffFreq,
    totalLiked: likedRecipes.length,
  };
}

/** Score a single recipe against the taste profile (0-100) */
export function scoreRecipe(recipe: Recipe, profile: UserTasteProfile): number {
  if (profile.totalLiked === 0) return 50; // neutral score if no likes

  let score = 0;
  let maxScore = 0;

  // Tag similarity (weight: 35)
  const recipeTags = (recipe.tags || []).map(normalize);
  if (recipeTags.length > 0) {
    let tagScore = 0;
    for (const tag of recipeTags) {
      tagScore += (profile.tagFrequency[tag] || 0);
    }
    // Normalize by max possible (totalLiked * tags count)
    const tagMax = profile.totalLiked * recipeTags.length;
    score += (tagScore / Math.max(tagMax, 1)) * 35;
  }
  maxScore += 35;

  // Ingredient overlap (weight: 30)
  const recipeIngs = (recipe.ingredients || []).map(normalize);
  if (recipeIngs.length > 0) {
    let ingScore = 0;
    for (const ing of recipeIngs) {
      // Check for partial matches too
      const directMatch = profile.ingredientFrequency[ing] || 0;
      if (directMatch > 0) {
        ingScore += directMatch;
      } else {
        // Partial match: check if any profile ingredient contains this or vice versa
        for (const [profIng, freq] of Object.entries(profile.ingredientFrequency)) {
          if (profIng.includes(ing) || ing.includes(profIng)) {
            ingScore += freq * 0.5;
            break;
          }
        }
      }
    }
    const ingMax = profile.totalLiked * recipeIngs.length;
    score += (ingScore / Math.max(ingMax, 1)) * 30;
  }
  maxScore += 30;

  // Cuisine match (weight: 20)
  if (recipe.cuisine) {
    const c = normalize(recipe.cuisine);
    const cuisineHits = profile.cuisineFrequency[c] || 0;
    score += (cuisineHits / Math.max(profile.totalLiked, 1)) * 20;
  }
  maxScore += 20;

  // Difficulty match (weight: 15)
  if (recipe.difficulty) {
    const d = normalize(recipe.difficulty);
    const diffHits = profile.difficultyFrequency[d] || 0;
    score += (diffHits / Math.max(profile.totalLiked, 1)) * 15;
  }
  maxScore += 15;

  // Clamp to 0-100
  return Math.min(100, Math.round((score / maxScore) * 100));
}

/** Rank recipes by recommendation score, with randomness for discovery */
export function rankByRecommendation(
  recipes: Recipe[],
  likedRecipes: Recipe[],
  likedIds: Set<string>,
): { recipe: Recipe; recScore: number }[] {
  const profile = buildTasteProfile(likedRecipes);

  return recipes
    .filter(r => !likedIds.has(r.id)) // exclude already-liked
    .map(r => ({
      recipe: r,
      recScore: scoreRecipe(r, profile),
    }))
    // Add a small random factor for discovery (±10 points)
    .map(item => ({
      ...item,
      recScore: item.recScore + (Math.random() * 20 - 10),
    }))
    .sort((a, b) => b.recScore - a.recScore);
}
