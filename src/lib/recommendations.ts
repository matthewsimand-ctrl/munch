import type { Recipe } from '@/data/recipes';
import type { UserProfile } from '@/lib/store';
import { getTimeBoost } from '@/lib/mealTimeUtils';

/**
 * Recommendation engine: scores recipes based on similarity to liked recipes
 * AND onboarding preferences (cuisine, skill level, flavor, dietary).
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

// Dietary restriction keywords that signal incompatibility
const DIETARY_INGREDIENT_MAP: Record<string, string[]> = {
  'vegetarian': ['chicken', 'beef', 'pork', 'lamb', 'fish', 'salmon', 'tuna', 'shrimp', 'bacon', 'sausage', 'turkey', 'duck', 'veal', 'steak', 'mince', 'ground beef', 'ground turkey', 'anchovy', 'prawn'],
  'vegan': ['chicken', 'beef', 'pork', 'lamb', 'fish', 'salmon', 'tuna', 'shrimp', 'bacon', 'sausage', 'turkey', 'duck', 'veal', 'steak', 'mince', 'egg', 'milk', 'cream', 'butter', 'cheese', 'yogurt', 'honey', 'whey', 'gelatin', 'prawn', 'anchovy'],
  'gluten-free': ['flour', 'bread', 'pasta', 'noodles', 'wheat', 'breadcrumbs', 'soy sauce', 'couscous', 'barley', 'rye', 'semolina', 'tortilla'],
  'dairy-free': ['milk', 'cream', 'butter', 'cheese', 'yogurt', 'whey', 'ghee', 'sour cream', 'cream cheese', 'parmesan', 'mozzarella', 'cheddar', 'ricotta'],
  'nut-free': ['almond', 'walnut', 'cashew', 'pecan', 'pistachio', 'peanut', 'hazelnut', 'macadamia', 'pine nut', 'nut butter', 'peanut butter'],
};

/** Check how compatible a recipe is with dietary restrictions (0 = incompatible, 1 = fully compatible) */
function dietaryCompatibility(recipe: Recipe, dietaryRestrictions: string[]): number {
  if (dietaryRestrictions.length === 0 || dietaryRestrictions.includes('None')) return 1;

  const recipeIngs = (recipe.ingredients || []).map(normalize);
  const recipeTags = (recipe.tags || []).map(normalize);

  for (const restriction of dietaryRestrictions) {
    const key = normalize(restriction);

    // Check if recipe tags already indicate compatibility
    if (recipeTags.includes(key)) continue;

    const badIngredients = DIETARY_INGREDIENT_MAP[key] || [];
    if (badIngredients.length === 0) continue;

    const hasConflict = recipeIngs.some(ing =>
      badIngredients.some(bad => ing.includes(bad))
    );

    if (hasConflict) return 0.1; // Heavy penalty but don't fully exclude
  }

  return 1;
}

/** Score a single recipe against taste profile + onboarding preferences + pantry (0-100) */
export function scoreRecipe(recipe: Recipe, profile: UserTasteProfile, userPrefs?: UserProfile, pantryItems?: string[]): number {
  const hasLikes = profile.totalLiked > 0;
  let score = 0;
  let maxScore = 0;

  // === Liked-recipe-based scoring (50 points when likes exist) ===
  if (hasLikes) {
    // Tag similarity (weight: 15)
    const recipeTags = (recipe.tags || []).map(normalize);
    if (recipeTags.length > 0) {
      let tagScore = 0;
      for (const tag of recipeTags) {
        tagScore += (profile.tagFrequency[tag] || 0);
      }
      const tagMax = profile.totalLiked * recipeTags.length;
      score += (tagScore / Math.max(tagMax, 1)) * 15;
    }
    maxScore += 15;

    // Ingredient overlap (weight: 15)
    const recipeIngs = (recipe.ingredients || []).map(normalize);
    if (recipeIngs.length > 0) {
      let ingScore = 0;
      for (const ing of recipeIngs) {
        const directMatch = profile.ingredientFrequency[ing] || 0;
        if (directMatch > 0) {
          ingScore += directMatch;
        } else {
          for (const [profIng, freq] of Object.entries(profile.ingredientFrequency)) {
            if (profIng.includes(ing) || ing.includes(profIng)) {
              ingScore += freq * 0.5;
              break;
            }
          }
        }
      }
      const ingMax = profile.totalLiked * recipeIngs.length;
      score += (ingScore / Math.max(ingMax, 1)) * 15;
    }
    maxScore += 15;

    // Cuisine match from likes (weight: 10)
    if (recipe.cuisine) {
      const c = normalize(recipe.cuisine);
      const cuisineHits = profile.cuisineFrequency[c] || 0;
      score += (cuisineHits / Math.max(profile.totalLiked, 1)) * 10;
    }
    maxScore += 10;

    // Difficulty match from likes (weight: 10)
    if (recipe.difficulty) {
      const d = normalize(recipe.difficulty);
      const diffHits = profile.difficultyFrequency[d] || 0;
      score += (diffHits / Math.max(profile.totalLiked, 1)) * 10;
    }
    maxScore += 10;
  }

  // === Pantry match scoring (15 points, or 20 if no likes) ===
  const pantryWeight = hasLikes ? 15 : 20;
  if (pantryItems && pantryItems.length > 0) {
    const recipeIngs = (recipe.ingredients || []).map(normalize);
    if (recipeIngs.length > 0) {
      const pantryNorm = pantryItems.map(normalize);
      let matched = 0;
      for (const ing of recipeIngs) {
        if (pantryNorm.some(p => p.includes(ing) || ing.includes(p))) {
          matched++;
        }
      }
      score += (matched / recipeIngs.length) * pantryWeight;
    }
    maxScore += pantryWeight;
  } else {
    maxScore += pantryWeight;
    score += pantryWeight * 0.3; // neutral score when no pantry
  }

  // === Onboarding preference scoring (35 points, or 80 if no likes) ===
  const prefWeight = hasLikes ? 35 : 80;
  const prefScale = prefWeight / 40;

  if (userPrefs) {
    // Cuisine preference match (weight: 15 * scale)
    if (userPrefs.cuisinePreferences.length > 0 && recipe.cuisine) {
      const recipeCuisine = normalize(recipe.cuisine);
      const match = userPrefs.cuisinePreferences.some(c => normalize(c) === recipeCuisine);
      if (match) score += 15 * prefScale;
    }
    maxScore += 15 * prefScale;

    // Skill level match (weight: 10 * scale)
    if (userPrefs.skillLevel && recipe.difficulty) {
      const recipeDiff = normalize(recipe.difficulty);
      const userSkill = normalize(userPrefs.skillLevel);
      if (recipeDiff === userSkill) {
        score += 10 * prefScale;
      } else {
        const levels = ['beginner', 'intermediate', 'advanced'];
        const ri = levels.indexOf(recipeDiff);
        const ui = levels.indexOf(userSkill);
        if (ri >= 0 && ui >= 0 && Math.abs(ri - ui) === 1) {
          score += 5 * prefScale;
        }
      }
    }
    maxScore += 10 * prefScale;

    // Flavor profile match (weight: 10 * scale)
    if (userPrefs.flavorProfiles.length > 0) {
      const recipeTags = (recipe.tags || []).map(normalize);
      const recipeIngs = (recipe.ingredients || []).map(normalize);
      const allText = [...recipeTags, ...recipeIngs].join(' ');

      const flavorKeywords: Record<string, string[]> = {
        'spicy': ['spicy', 'chili', 'chilli', 'jalapeño', 'habanero', 'cayenne', 'hot sauce', 'sriracha', 'pepper flakes'],
        'sweet': ['sweet', 'sugar', 'honey', 'maple', 'caramel', 'chocolate', 'vanilla', 'dessert', 'cake'],
        'savory': ['savory', 'savoury', 'umami', 'soy sauce', 'mushroom', 'garlic', 'onion', 'roasted'],
        'umami': ['umami', 'soy sauce', 'miso', 'mushroom', 'parmesan', 'fish sauce', 'tomato paste', 'anchovy'],
        'fresh/citrusy': ['fresh', 'citrus', 'lemon', 'lime', 'orange', 'mint', 'basil', 'cilantro', 'herb'],
      };

      let flavorMatches = 0;
      for (const pref of userPrefs.flavorProfiles) {
        const keywords = flavorKeywords[normalize(pref)] || [];
        if (keywords.some(kw => allText.includes(kw))) {
          flavorMatches++;
        }
      }
      score += (flavorMatches / Math.max(userPrefs.flavorProfiles.length, 1)) * 10 * prefScale;
    }
    maxScore += 10 * prefScale;

    // Dietary compatibility (weight: 5 * scale)
    const compat = dietaryCompatibility(recipe, userPrefs.dietaryRestrictions);
    score += compat * 5 * prefScale;
    maxScore += 5 * prefScale;
  } else {
    maxScore += prefWeight;
    score += prefWeight * 0.5;
  }

  // Apply dietary penalty as a multiplier on total score
  if (userPrefs && userPrefs.dietaryRestrictions.length > 0 && !userPrefs.dietaryRestrictions.includes('None')) {
    const compat = dietaryCompatibility(recipe, userPrefs.dietaryRestrictions);
    if (compat < 1) {
      score *= compat;
    }
  }

  // Clamp to 0-100
  return Math.min(100, Math.max(0, Math.round((score / Math.max(maxScore, 1)) * 100)));
}

/** Rank recipes by recommendation score, with randomness for discovery */
export function rankByRecommendation(
  recipes: Recipe[],
  likedRecipes: Recipe[],
  likedIds: Set<string>,
  userPrefs?: UserProfile,
): { recipe: Recipe; recScore: number }[] {
  const profile = buildTasteProfile(likedRecipes);

  return recipes
    .filter(r => !likedIds.has(r.id)) // exclude already-liked
    .map(r => ({
      recipe: r,
      recScore: scoreRecipe(r, profile, userPrefs),
    }))
    // Add time-of-day boost + small random factor for discovery
    .map(item => ({
      ...item,
      recScore: item.recScore + getTimeBoost(item.recipe) + (Math.random() * 15 - 7),
    }))
    .sort((a, b) => b.recScore - a.recScore);
}
