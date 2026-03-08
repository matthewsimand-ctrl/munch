// Ingredient → category mapping and aisle ordering for grocery lists

export type IngredientCategory =
  | 'Produce'
  | 'Meat & Seafood'
  | 'Dairy & Eggs'
  | 'Grains & Pasta'
  | 'Canned & Jarred'
  | 'Oils & Condiments'
  | 'Spices & Seasonings'
  | 'Baking'
  | 'Beverages'
  | 'Other';

// Maps ingredient keywords to categories
const CATEGORY_MAP: Record<string, IngredientCategory> = {
  // Produce
  garlic: 'Produce',
  onion: 'Produce',
  'red onion': 'Produce',
  'green onions': 'Produce',
  spinach: 'Produce',
  'bell pepper': 'Produce',
  cucumber: 'Produce',
  'cherry tomatoes': 'Produce',
  carrots: 'Produce',
  lemon: 'Produce',
  mango: 'Produce',
  'thai basil': 'Produce',
  ginger: 'Produce',
  lettuce: 'Produce',
  tomato: 'Produce',
  avocado: 'Produce',
  lime: 'Produce',
  jalapeño: 'Produce',
  cilantro: 'Produce',
  mushrooms: 'Produce',
  potatoes: 'Produce',
  broccoli: 'Produce',
  celery: 'Produce',

  // Meat & Seafood
  'chicken thighs': 'Meat & Seafood',
  'chicken breast': 'Meat & Seafood',
  'salmon fillets': 'Meat & Seafood',
  'ground beef': 'Meat & Seafood',
  shrimp: 'Meat & Seafood',
  bacon: 'Meat & Seafood',
  sausage: 'Meat & Seafood',

  // Dairy & Eggs
  eggs: 'Dairy & Eggs',
  butter: 'Dairy & Eggs',
  'heavy cream': 'Dairy & Eggs',
  'feta cheese': 'Dairy & Eggs',
  parmesan: 'Dairy & Eggs',
  'coconut milk': 'Dairy & Eggs',
  milk: 'Dairy & Eggs',
  cheese: 'Dairy & Eggs',
  yogurt: 'Dairy & Eggs',
  'cream cheese': 'Dairy & Eggs',

  // Grains & Pasta
  rice: 'Grains & Pasta',
  quinoa: 'Grains & Pasta',
  pasta: 'Grains & Pasta',
  bread: 'Grains & Pasta',
  tortillas: 'Grains & Pasta',
  noodles: 'Grains & Pasta',

  // Canned & Jarred
  chickpeas: 'Canned & Jarred',
  'sun-dried tomatoes': 'Canned & Jarred',
  'firm tofu': 'Canned & Jarred',
  gochujang: 'Canned & Jarred',
  'tomato paste': 'Canned & Jarred',
  beans: 'Canned & Jarred',

  // Oils & Condiments
  'olive oil': 'Oils & Condiments',
  'vegetable oil': 'Oils & Condiments',
  'sesame oil': 'Oils & Condiments',
  'soy sauce': 'Oils & Condiments',
  sriracha: 'Oils & Condiments',
  honey: 'Oils & Condiments',
  vinegar: 'Oils & Condiments',
  'fish sauce': 'Oils & Condiments',
  ketchup: 'Oils & Condiments',
  mustard: 'Oils & Condiments',

  // Spices & Seasonings
  salt: 'Spices & Seasonings',
  pepper: 'Spices & Seasonings',
  'chili flakes': 'Spices & Seasonings',
  'sesame seeds': 'Spices & Seasonings',
  cumin: 'Spices & Seasonings',
  paprika: 'Spices & Seasonings',
  oregano: 'Spices & Seasonings',
  cinnamon: 'Spices & Seasonings',
  'vanilla extract': 'Spices & Seasonings',

  // Baking
  flour: 'Baking',
  sugar: 'Baking',
  'dark chocolate': 'Baking',
  'chia seeds': 'Baking',
  'baking powder': 'Baking',
  'baking soda': 'Baking',
  cocoa: 'Baking',
};

// Aisle order for grocery store layout
const AISLE_ORDER: IngredientCategory[] = [
  'Produce',
  'Meat & Seafood',
  'Dairy & Eggs',
  'Baking',
  'Grains & Pasta',
  'Canned & Jarred',
  'Oils & Condiments',
  'Spices & Seasonings',
  'Beverages',
  'Other',
];

export function getCategory(ingredient: string): IngredientCategory {
  const lower = ingredient.toLowerCase().trim();
  if (CATEGORY_MAP[lower]) return CATEGORY_MAP[lower];
  // Partial match fallback
  for (const [key, cat] of Object.entries(CATEGORY_MAP)) {
    if (lower.includes(key) || key.includes(lower)) return cat;
  }
  return 'Other';
}

export function getAisleIndex(category: IngredientCategory): number {
  const idx = AISLE_ORDER.indexOf(category);
  return idx === -1 ? AISLE_ORDER.length : idx;
}

export function getAllCategories(): IngredientCategory[] {
  return [...AISLE_ORDER];
}
