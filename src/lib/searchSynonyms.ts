// Semantic ingredient synonyms for improved browse filtering
// When a user searches for a broad term, we expand it to match specific ingredients

const SYNONYM_MAP: Record<string, string[]> = {
  meat: ['beef', 'chicken', 'pork', 'lamb', 'turkey', 'veal', 'venison', 'bison', 'duck', 'goose', 'rabbit', 'steak', 'ground beef', 'ground turkey', 'ground pork', 'bacon', 'ham', 'sausage', 'salami', 'prosciutto', 'chorizo', 'pepperoni', 'meatball', 'ribs', 'roast', 'tenderloin', 'sirloin', 'filet', 'brisket', 'flank'],
  poultry: ['chicken', 'turkey', 'duck', 'goose', 'cornish hen', 'quail', 'pheasant'],
  seafood: ['fish', 'shrimp', 'salmon', 'tuna', 'cod', 'tilapia', 'halibut', 'mahi', 'swordfish', 'trout', 'bass', 'catfish', 'crab', 'lobster', 'scallop', 'clam', 'mussel', 'oyster', 'squid', 'calamari', 'octopus', 'anchovy', 'sardine', 'prawn'],
  fish: ['salmon', 'tuna', 'cod', 'tilapia', 'halibut', 'mahi', 'swordfish', 'trout', 'bass', 'catfish', 'anchovy', 'sardine', 'snapper'],
  vegetable: ['broccoli', 'carrot', 'spinach', 'kale', 'lettuce', 'tomato', 'pepper', 'onion', 'garlic', 'celery', 'cucumber', 'zucchini', 'squash', 'eggplant', 'asparagus', 'green bean', 'pea', 'corn', 'potato', 'sweet potato', 'mushroom', 'cabbage', 'cauliflower', 'artichoke', 'beet', 'radish', 'turnip', 'leek'],
  vegetables: ['broccoli', 'carrot', 'spinach', 'kale', 'lettuce', 'tomato', 'pepper', 'onion', 'garlic', 'celery', 'cucumber', 'zucchini', 'squash', 'eggplant', 'asparagus', 'green bean', 'pea', 'corn', 'potato', 'sweet potato', 'mushroom', 'cabbage', 'cauliflower'],
  fruit: ['apple', 'banana', 'orange', 'lemon', 'lime', 'strawberry', 'blueberry', 'raspberry', 'blackberry', 'grape', 'mango', 'pineapple', 'peach', 'pear', 'plum', 'cherry', 'watermelon', 'cantaloupe', 'kiwi', 'papaya', 'coconut', 'avocado', 'pomegranate', 'fig', 'date'],
  dairy: ['milk', 'cheese', 'butter', 'cream', 'yogurt', 'sour cream', 'cream cheese', 'mozzarella', 'parmesan', 'cheddar', 'ricotta', 'feta', 'brie', 'gouda', 'swiss', 'goat cheese', 'mascarpone', 'whipped cream', 'half and half', 'ghee'],
  cheese: ['mozzarella', 'parmesan', 'cheddar', 'ricotta', 'feta', 'brie', 'gouda', 'swiss', 'goat cheese', 'mascarpone', 'cream cheese', 'blue cheese', 'provolone', 'gruyere', 'monterey jack', 'pepper jack', 'colby'],
  grain: ['rice', 'pasta', 'bread', 'flour', 'oats', 'quinoa', 'couscous', 'barley', 'bulgur', 'farro', 'polenta', 'cornmeal', 'noodle', 'tortilla', 'pita', 'naan', 'bagel', 'cracker'],
  pasta: ['spaghetti', 'penne', 'rigatoni', 'fettuccine', 'linguine', 'macaroni', 'farfalle', 'orzo', 'lasagna', 'ravioli', 'gnocchi', 'tortellini', 'angel hair', 'fusilli', 'tagliatelle', 'bucatini', 'noodle'],
  nut: ['almond', 'walnut', 'pecan', 'cashew', 'pistachio', 'peanut', 'macadamia', 'hazelnut', 'pine nut', 'brazil nut', 'chestnut'],
  spice: ['cumin', 'paprika', 'turmeric', 'cinnamon', 'oregano', 'basil', 'thyme', 'rosemary', 'parsley', 'cilantro', 'dill', 'sage', 'bay leaf', 'nutmeg', 'clove', 'cardamom', 'coriander', 'chili powder', 'cayenne', 'ginger', 'garlic powder', 'onion powder', 'black pepper', 'white pepper', 'saffron', 'fennel'],
  herb: ['basil', 'parsley', 'cilantro', 'dill', 'thyme', 'rosemary', 'oregano', 'sage', 'mint', 'chive', 'tarragon', 'bay leaf', 'lemongrass'],
  bean: ['black bean', 'kidney bean', 'pinto bean', 'navy bean', 'cannellini', 'chickpea', 'garbanzo', 'lentil', 'lima bean', 'edamame', 'white bean', 'fava bean'],
  legume: ['black bean', 'kidney bean', 'pinto bean', 'chickpea', 'lentil', 'lima bean', 'edamame', 'pea', 'peanut', 'soybean'],
  sauce: ['tomato sauce', 'soy sauce', 'hot sauce', 'bbq sauce', 'teriyaki', 'worcestershire', 'fish sauce', 'oyster sauce', 'hoisin', 'sriracha', 'salsa', 'pesto', 'marinara', 'alfredo', 'chimichurri', 'tahini', 'ranch', 'mayo', 'ketchup', 'mustard'],
  oil: ['olive oil', 'vegetable oil', 'coconut oil', 'sesame oil', 'avocado oil', 'canola oil', 'peanut oil', 'sunflower oil', 'grapeseed oil'],
};

/**
 * Expand search terms with synonyms for broader matching.
 * e.g., "meat" → ["meat", "beef", "chicken", "pork", ...]
 */
export function expandSearchTerms(terms: string[]): string[] {
  const expanded = new Set<string>();
  for (const term of terms) {
    expanded.add(term);
    const synonyms = SYNONYM_MAP[term];
    if (synonyms) {
      for (const s of synonyms) expanded.add(s);
    }
  }
  return [...expanded];
}
