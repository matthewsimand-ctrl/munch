import type { Recipe } from '@/data/recipes';

export type MealCategory = 'breakfast' | 'lunch' | 'dinner' | 'dessert' | 'snack' | 'all';

export const MEAL_CATEGORIES: { value: MealCategory; label: string }[] = [
  { value: 'all', label: 'All Meals' },
  { value: 'breakfast', label: 'Breakfast' },
  { value: 'lunch', label: 'Lunch' },
  { value: 'dinner', label: 'Dinner' },
  { value: 'dessert', label: 'Dessert' },
  { value: 'snack', label: 'Snack' },
];

// Keywords that signal each meal category
const CATEGORY_KEYWORDS: Record<Exclude<MealCategory, 'all'>, string[]> = {
  breakfast: [
    'breakfast', 'pancake', 'waffle', 'omelette', 'omelet', 'egg', 'cereal',
    'toast', 'muffin', 'bagel', 'porridge', 'oatmeal', 'smoothie', 'granola',
    'french toast', 'crepe', 'hash brown', 'bacon', 'sausage and egg', 'brunch',
  ],
  lunch: [
    'lunch', 'sandwich', 'wrap', 'salad', 'soup', 'burger', 'panini', 'bowl',
    'quesadilla', 'taco', 'pita', 'sub', 'club', 'blt', 'grain bowl',
  ],
  dinner: [
    'dinner', 'roast', 'stew', 'casserole', 'pasta', 'curry', 'stir fry',
    'stir-fry', 'grilled', 'baked', 'braised', 'risotto', 'lasagna', 'biryani',
    'teriyaki', 'steak', 'fillet', 'chops', 'pot roast', 'meatloaf', 'paella',
    'ramen', 'pho', 'tikka masala', 'enchilada',
  ],
  dessert: [
    'dessert', 'cake', 'cookie', 'brownie', 'pie', 'tart', 'ice cream',
    'pudding', 'mousse', 'cheesecake', 'fudge', 'cupcake', 'sorbet',
    'tiramisu', 'crème brûlée', 'cobbler', 'donut', 'doughnut', 'sweet',
  ],
  snack: [
    'snack', 'dip', 'chips', 'hummus', 'popcorn', 'trail mix', 'energy bar',
    'bruschetta', 'spring roll', 'appetizer', 'finger food', 'wings', 'nachos',
  ],
};

/** Classify a recipe into meal categories based on its name, tags, and cuisine */
export function classifyMealType(recipe: Recipe): MealCategory[] {
  const searchText = [
    recipe.name,
    ...(recipe.tags || []),
    recipe.cuisine || '',
  ].join(' ').toLowerCase();

  const matches: MealCategory[] = [];
  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    if (keywords.some(kw => searchText.includes(kw))) {
      matches.push(category as MealCategory);
    }
  }

  // Default to dinner if nothing matched
  return matches.length > 0 ? matches : ['dinner'];
}

/** Get the recommended meal category based on current time of day */
export function getTimeBasedCategory(): MealCategory {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 11) return 'breakfast';
  if (hour >= 11 && hour < 14) return 'lunch';
  if (hour >= 14 && hour < 17) return 'snack';
  if (hour >= 17 && hour < 21) return 'dinner';
  return 'dessert'; // late night
}

/** Get a time-based boost score (0-25) for a recipe */
export function getTimeBoost(recipe: Recipe): number {
  const preferred = getTimeBasedCategory();
  const categories = classifyMealType(recipe);
  if (categories.includes(preferred)) return 25;
  // Adjacent time slots get a smaller boost
  const adjacent: Record<MealCategory, MealCategory[]> = {
    breakfast: ['snack', 'lunch'],
    lunch: ['breakfast', 'dinner', 'snack'],
    dinner: ['lunch', 'dessert'],
    dessert: ['dinner', 'snack'],
    snack: ['breakfast', 'lunch', 'dessert'],
    all: [],
  };
  if (categories.some(c => adjacent[preferred]?.includes(c))) return 10;
  return 0;
}

/** Filter recipes by meal category */
export function filterByMealType(recipes: Recipe[], category: MealCategory): Recipe[] {
  if (category === 'all') return recipes;
  return recipes.filter(r => classifyMealType(r).includes(category));
}
