function normalizeItemName(name: string) {
  return String(name || '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\b([a-z]+?)ies\b/g, '$1y')
    .replace(/\b([a-z]+?)(es|s)\b/g, '$1')
    .replace(/\s+/g, ' ')
    .trim();
}

function matchesKeyword(name: string, keyword: string) {
  const normalizedName = ` ${normalizeItemName(name)} `;
  const normalizedKeyword = ` ${normalizeItemName(keyword)} `;
  return normalizedName.includes(normalizedKeyword);
}

const RULES: Array<{ keywords: string[]; pantry: string; grocery: string }> = [
  { keywords: ['apple', 'banana', 'lettuce', 'spinach', 'tomato', 'onion', 'garlic', 'lemon', 'lime', 'pepper', 'carrot', 'potato', 'avocado', 'broccoli', 'mushroom'], pantry: 'Produce', grocery: 'produce' },
  { keywords: ['milk', 'cheese', 'yogurt', 'butter', 'cream', 'egg'], pantry: 'Dairy', grocery: 'dairy' },
  { keywords: ['chicken', 'beef', 'steak', 'pork', 'salmon', 'fish', 'turkey', 'shrimp', 'bacon', 'sausage', 'ground beef', 'minced meat'], pantry: 'Meat', grocery: 'meat' },
  { keywords: ['pasta', 'noodle', 'spaghetti', 'penne', 'fettuccine', 'ramen', 'udon', 'macaroni'], pantry: 'Pasta / Noodles', grocery: 'pasta / noodles' },
  { keywords: ['rice', 'flour', 'sugar', 'beans', 'lentils', 'oats', 'bread'], pantry: 'Dry Goods', grocery: 'dry goods' },
  { keywords: ['ketchup', 'mustard', 'soy sauce', 'vinegar', 'oil', 'mayo', 'hot sauce'], pantry: 'Condiments', grocery: 'condiments' },
  { keywords: ['ice cream', 'frozen', 'frozen pea'], pantry: 'Other', grocery: 'frozen' },
  { keywords: ['bagel', 'muffin', 'croissant'], pantry: 'Other', grocery: 'bakery' },
];

export function detectCategories(name: string) {
  const found = RULES.find((rule) => rule.keywords.some((kw) => matchesKeyword(name, kw)));
  return {
    pantryCategory: found?.pantry ?? 'Other',
    grocerySection: found?.grocery ?? 'other',
  };
}
