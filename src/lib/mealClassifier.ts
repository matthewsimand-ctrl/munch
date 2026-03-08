// Auto-classify recipes into meal types based on name, tags, ingredients, and cook time

type MealTag = 'breakfast' | 'lunch' | 'dinner' | 'snack';

const BREAKFAST_KEYWORDS = [
  'pancake', 'waffle', 'omelette', 'omelet', 'scramble', 'eggs', 'toast', 'cereal',
  'granola', 'muffin', 'bagel', 'smoothie', 'breakfast', 'brunch', 'french toast',
  'bacon', 'sausage', 'hash brown', 'yogurt', 'oatmeal', 'porridge', 'crepe',
  'croissant', 'acai', 'frittata', 'quiche',
];

const SNACK_KEYWORDS = [
  'snack', 'dip', 'hummus', 'guacamole', 'trail mix', 'popcorn', 'chips', 'nachos',
  'bruschetta', 'crostini', 'energy ball', 'protein bar', 'cookie', 'brownie',
  'muffin', 'fruit', 'nuts', 'crackers', 'appetizer', 'bite', 'finger food',
  'salsa', 'edamame',
];

const LUNCH_KEYWORDS = [
  'salad', 'sandwich', 'wrap', 'bowl', 'soup', 'panini', 'quesadilla', 'burrito',
  'pita', 'flatbread', 'lunch', 'light', 'grain bowl',
];

const DINNER_KEYWORDS = [
  'steak', 'roast', 'casserole', 'lasagna', 'stew', 'curry', 'risotto', 'pasta',
  'dinner', 'entrée', 'entree', 'grill', 'bbq', 'brisket', 'pot roast', 'prime rib',
  'lobster', 'salmon fillet', 'chicken breast', 'pork chop', 'beef', 'lamb',
  'tikka masala', 'pad thai', 'ramen', 'pho', 'biryani', 'paella', 'tagine',
];

function matchKeywords(text: string, keywords: string[]): number {
  const lower = text.toLowerCase();
  return keywords.reduce((score, kw) => score + (lower.includes(kw) ? 1 : 0), 0);
}

export function classifyMealType(recipe: {
  name: string;
  tags?: string[];
  ingredients?: string[];
  cook_time?: string;
}): MealTag {
  const searchText = [
    recipe.name,
    ...(recipe.tags || []),
    ...(recipe.ingredients || []),
  ].join(' ');

  const scores: Record<MealTag, number> = {
    breakfast: matchKeywords(searchText, BREAKFAST_KEYWORDS),
    snack: matchKeywords(searchText, SNACK_KEYWORDS),
    lunch: matchKeywords(searchText, LUNCH_KEYWORDS),
    dinner: matchKeywords(searchText, DINNER_KEYWORDS),
  };

  // Cook time heuristic: short cook times lean snack/breakfast, long lean dinner
  const timeMatch = recipe.cook_time?.match(/(\d+)/);
  if (timeMatch) {
    const mins = parseInt(timeMatch[1]);
    if (mins <= 10) { scores.snack += 1; scores.breakfast += 0.5; }
    else if (mins <= 20) { scores.lunch += 0.5; scores.breakfast += 0.3; }
    else if (mins >= 45) { scores.dinner += 1; }
  }

  // Pick highest score, default to dinner
  const sorted = Object.entries(scores).sort((a, b) => b[1] - a[1]);
  if (sorted[0][1] === 0) return 'dinner'; // no signals → default dinner
  return sorted[0][0] as MealTag;
}
