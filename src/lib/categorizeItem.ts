const RULES: Array<{ keywords: string[]; pantry: string; grocery: string }> = [
  { keywords: ['apple', 'banana', 'lettuce', 'spinach', 'tomato', 'onion', 'garlic', 'lemon', 'lime', 'pepper', 'carrot', 'potato', 'avocado', 'broccoli'], pantry: 'Produce', grocery: 'produce' },
  { keywords: ['milk', 'cheese', 'yogurt', 'butter', 'cream', 'egg'], pantry: 'Dairy', grocery: 'dairy' },
  { keywords: ['chicken', 'beef', 'pork', 'salmon', 'fish', 'turkey', 'shrimp', 'bacon'], pantry: 'Meat', grocery: 'meat' },
  { keywords: ['rice', 'pasta', 'flour', 'sugar', 'beans', 'lentils', 'oats', 'bread'], pantry: 'Dry Goods', grocery: 'dry goods' },
  { keywords: ['ketchup', 'mustard', 'soy sauce', 'vinegar', 'oil', 'mayo', 'hot sauce'], pantry: 'Condiments', grocery: 'condiments' },
  { keywords: ['ice cream', 'frozen', 'peas frozen'], pantry: 'Other', grocery: 'frozen' },
  { keywords: ['bagel', 'muffin', 'croissant'], pantry: 'Other', grocery: 'bakery' },
];

export function detectCategories(name: string) {
  const normalized = name.toLowerCase().trim();
  const found = RULES.find((rule) => rule.keywords.some((kw) => normalized.includes(kw)));
  return {
    pantryCategory: found?.pantry ?? 'Other',
    grocerySection: found?.grocery ?? 'other',
  };
}
