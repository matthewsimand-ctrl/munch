export interface DictionaryEntry {
  term: string;
  definition: string;
  category: string;
}

export const cookingDictionary: DictionaryEntry[] = [
  // Heat & Liquid Techniques
  { term: "simmer", definition: "Cook liquid just below boiling point, with small bubbles gently breaking the surface. Typically around 185–205°F (85–96°C). Used for soups, sauces, and braises.", category: "Heat" },
  { term: "poach", definition: "Cook food gently in liquid held just below a simmer (160–180°F / 71–82°C). The surface should barely tremble. Ideal for eggs, fish, and delicate proteins.", category: "Heat" },
  { term: "blanch", definition: "Briefly plunge food (usually vegetables) into boiling water, then immediately transfer to ice water to stop cooking. Preserves color, texture, and nutrients.", category: "Heat" },
  { term: "boil", definition: "Heat liquid until it reaches 212°F (100°C) at sea level, with vigorous, rolling bubbles. Used for pasta, potatoes, and grains.", category: "Heat" },
  { term: "parboil", definition: "Partially cook food by boiling briefly. The food is then finished by another method like roasting or sautéing.", category: "Heat" },
  { term: "scald", definition: "Heat liquid (usually milk or cream) until just below boiling—tiny bubbles form around the edges. Used to dissolve sugar or infuse flavors.", category: "Heat" },
  { term: "reduce", definition: "Boil or simmer a liquid uncovered to evaporate water, concentrating flavor and thickening consistency. A 'reduction' is the resulting sauce.", category: "Heat" },
  { term: "deglaze", definition: "Add liquid (wine, broth, etc.) to a hot pan after searing to dissolve the browned bits (fond) stuck to the bottom. Creates a flavorful base for sauces.", category: "Heat" },
  { term: "braise", definition: "Cook food by first searing at high heat, then slowly cooking in a covered pot with a small amount of liquid. Great for tough cuts of meat.", category: "Heat" },
  { term: "stew", definition: "Similar to braising, but food is fully submerged in liquid. Cooked low and slow until everything is tender and flavors meld together.", category: "Heat" },
  { term: "steam", definition: "Cook food using the vapor from boiling water, without the food touching the water directly. Preserves nutrients and texture.", category: "Heat" },
  { term: "baste", definition: "Spoon or brush pan juices, melted fat, or marinade over food while cooking to keep it moist and add flavor.", category: "Heat" },
  { term: "temper", definition: "Gradually raise the temperature of a cold ingredient (like eggs) by slowly adding hot liquid. Prevents curdling or seizing.", category: "Heat" },
  { term: "render", definition: "Cook fatty meat slowly over low heat to melt out the fat, leaving crispy bits behind. Common with bacon and duck.", category: "Heat" },
  { term: "caramelize", definition: "Cook sugar or naturally sugary food until it turns golden brown and develops a rich, sweet, nutty flavor. Works on onions, sugar, and roasted vegetables.", category: "Heat" },
  { term: "sear", definition: "Cook food at very high heat with minimal oil to create a browned, flavorful crust. Don't move the food until a crust forms.", category: "Heat" },
  { term: "sauté", definition: "Cook food quickly in a small amount of fat over medium-high heat, tossing or stirring frequently. The pan should be hot before adding food.", category: "Heat" },
  { term: "stir-fry", definition: "Cook small, uniform pieces of food over very high heat in a wok or large pan, stirring constantly. Food should be dry to achieve a good sear.", category: "Heat" },
  { term: "flambé", definition: "Ignite alcohol in a pan to burn off the raw flavor while adding a caramelized depth. Tilt the pan toward the flame or use a long lighter.", category: "Heat" },
  { term: "deep-fry", definition: "Submerge food completely in hot oil (350–375°F / 175–190°C). Produces a crispy exterior while cooking the interior through.", category: "Heat" },
  { term: "pan-fry", definition: "Cook food in a moderate amount of oil in a flat pan over medium to medium-high heat. Oil should come about halfway up the food.", category: "Heat" },
  { term: "broil", definition: "Cook food under direct, intense heat from above (the oven's top element). Similar to grilling but heat comes from above instead of below.", category: "Heat" },
  { term: "roast", definition: "Cook food uncovered in an oven using dry heat, typically at 300–450°F. Produces browning and caramelization on the outside.", category: "Heat" },
  { term: "bake", definition: "Cook food in an oven using dry, indirect heat. Baking usually refers to breads, pastries, and casseroles rather than meats.", category: "Heat" },
  { term: "grill", definition: "Cook food on a grate over direct heat (charcoal, gas, or electric). High heat creates char marks and smoky flavor.", category: "Heat" },

  // Cutting Techniques
  { term: "fillet", definition: "Remove bones from meat or fish using a thin, flexible knife. Follow the bone structure closely to minimize waste. Also spelled 'filet'.", category: "Cutting" },
  { term: "filet", definition: "Remove bones from meat or fish using a thin, flexible knife. Follow the bone structure closely to minimize waste. Also spelled 'fillet'.", category: "Cutting" },
  { term: "dice", definition: "Cut food into uniform cubes. Small dice is ¼ inch, medium dice is ½ inch, large dice is ¾ inch. Uniformity ensures even cooking.", category: "Cutting" },
  { term: "mince", definition: "Cut food into very tiny, irregular pieces (smaller than a dice). Rock the knife back and forth over the food. Common for garlic, herbs, and shallots.", category: "Cutting" },
  { term: "julienne", definition: "Cut food into thin, uniform matchstick-shaped strips, about ⅛ inch × ⅛ inch × 2–3 inches long. Used for stir-fries and garnishes.", category: "Cutting" },
  { term: "chiffonade", definition: "Stack leaves (like basil or mint), roll them tightly into a cigar shape, then slice crosswise into thin ribbons. Beautiful as a garnish.", category: "Cutting" },
  { term: "brunoise", definition: "Cut food into very small (⅛ inch) uniform cubes. Start with a julienne cut, then cut crosswise. Used for garnishes and fine sauces.", category: "Cutting" },
  { term: "batonnet", definition: "Cut food into uniform sticks about ¼ inch × ¼ inch × 2–3 inches. Thicker than julienne. Think French fries or crudité sticks.", category: "Cutting" },
  { term: "chop", definition: "Cut food into irregular pieces. Less precise than dicing—the size depends on the recipe. A 'rough chop' means even less uniformity.", category: "Cutting" },
  { term: "score", definition: "Make shallow cuts in the surface of food (like bread dough, meat, or fish) to help it cook evenly, absorb marinades, or create decorative patterns.", category: "Cutting" },
  { term: "supreme", definition: "Cut citrus segments free of membrane and pith. Cut along each membrane to release clean, jewel-like segments. Also called 'segmenting'.", category: "Cutting" },
  { term: "butterfly", definition: "Cut meat or seafood nearly in half horizontally, then open it like a book. Creates a thinner, more uniform piece that cooks faster and more evenly.", category: "Cutting" },
  { term: "spatchcock", definition: "Remove the backbone from poultry and press it flat. Dramatically reduces roasting time and promotes even cooking with crispy skin.", category: "Cutting" },

  // Mixing & Combining
  { term: "fold", definition: "Gently combine a lighter mixture into a heavier one using a spatula. Cut down through the center, sweep across the bottom, and fold over the top. Preserves air.", category: "Mixing" },
  { term: "cream", definition: "Beat butter (or butter and sugar) vigorously until light, fluffy, and pale. Incorporates air for tender baked goods. Use room-temperature butter.", category: "Mixing" },
  { term: "whisk", definition: "Beat ingredients rapidly with a wire whisk to incorporate air, blend, or emulsify. Use a figure-eight or circular motion.", category: "Mixing" },
  { term: "knead", definition: "Work dough by pressing, folding, and turning to develop gluten structure. Push with the heel of your hand, fold, rotate, repeat. Usually 8–10 minutes by hand.", category: "Mixing" },
  { term: "emulsify", definition: "Combine two liquids that normally don't mix (like oil and vinegar) into a stable, uniform mixture. Add one liquid slowly while whisking vigorously.", category: "Mixing" },
  { term: "whip", definition: "Beat rapidly to incorporate air and increase volume. Used for cream, egg whites, and mousse. Soft peaks fold over; stiff peaks stand straight up.", category: "Mixing" },
  { term: "proof", definition: "Allow yeast dough to rise in a warm place. The yeast ferments, producing CO₂ gas that makes the dough expand. Usually takes 1–2 hours.", category: "Mixing" },
  { term: "macerate", definition: "Soak fruit in sugar, alcohol, or liquid to soften it and draw out natural juices. Similar to marinating but for fruit.", category: "Mixing" },
  { term: "marinate", definition: "Soak food in a seasoned liquid (marinade) to add flavor and sometimes tenderize. Acid-based marinades work best for short periods.", category: "Mixing" },
  { term: "brine", definition: "Soak food in salt water (and sometimes sugar, herbs, spices) to season it deeply and improve moisture retention during cooking.", category: "Mixing" },
  { term: "cure", definition: "Preserve food using salt, sugar, smoke, or acid. Draws out moisture and inhibits bacterial growth. Used for bacon, gravlax, and charcuterie.", category: "Mixing" },

  // Preparation
  { term: "mise en place", definition: "French for 'everything in its place.' Measure, wash, cut, and organize all ingredients before you start cooking. The single most important kitchen habit.", category: "Preparation" },
  { term: "zest", definition: "Remove the thin, colored outer layer of citrus peel using a zester or microplane. Contains aromatic oils. Avoid the bitter white pith underneath.", category: "Preparation" },
  { term: "dredge", definition: "Lightly coat food in a dry ingredient (usually flour, breadcrumbs, or cornmeal) before cooking. Shake off excess for an even coating.", category: "Preparation" },
  { term: "bread", definition: "Coat food in a three-step process: flour, then egg wash, then breadcrumbs. Creates a crispy crust when fried or baked.", category: "Preparation" },
  { term: "truss", definition: "Tie poultry with kitchen twine to hold its shape during roasting. Keeps legs and wings close to the body for even cooking.", category: "Preparation" },
  { term: "dock", definition: "Poke holes in pastry dough with a fork before baking to prevent it from puffing up. Essential for pie crusts baked without filling.", category: "Preparation" },
  { term: "bloom", definition: "Activate an ingredient by adding liquid or heat. Bloom gelatin in cold water before using; bloom spices in hot oil to release their essential oils.", category: "Preparation" },
  { term: "debone", definition: "Remove bones from meat, poultry, or fish. Use a sharp boning knife and follow the bone structure closely.", category: "Preparation" },
  { term: "devein", definition: "Remove the dark digestive tract from shrimp. Make a shallow cut along the back and pull or rinse out the vein.", category: "Preparation" },

  // Finishing & Plating
  { term: "al dente", definition: "Italian for 'to the tooth.' Pasta or vegetables cooked until still slightly firm when bitten—not mushy. Usually 1–2 minutes less than package directions.", category: "Finishing" },
  { term: "rest", definition: "Let cooked meat sit undisturbed after cooking so juices redistribute throughout. Usually 5–10 minutes for small cuts, 15–30 for roasts.", category: "Finishing" },
  { term: "glaze", definition: "Apply a thin, glossy coating to food. Can be sweet (sugar glaze on donuts) or savory (pan sauce reduced to a syrupy consistency brushed on meat).", category: "Finishing" },
  { term: "garnish", definition: "Add a final decorative (and often edible) element to a dish before serving. Should complement the flavors—parsley, citrus zest, microgreens, etc.", category: "Finishing" },
  { term: "mount", definition: "Finish a sauce by whisking in cold butter off the heat. Creates a rich, glossy, velvety texture. Also called 'monter au beurre'.", category: "Finishing" },
  { term: "nappe", definition: "A sauce consistency thick enough to coat the back of a spoon. Draw a line through it with your finger—if it holds, it's nappe.", category: "Finishing" },
  { term: "quenelle", definition: "Shape a soft mixture (mousse, ice cream, mashed potatoes) into an elegant oval using two spoons. A classic plating technique.", category: "Finishing" },
];

/**
 * Build a regex that matches any dictionary term (word-boundary) in a case-insensitive way.
 */
export function buildDictionaryRegex(): RegExp {
  const escaped = cookingDictionary.map(e =>
    e.term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  );
  // Sort longest first so "stir-fry" matches before "fry"
  escaped.sort((a, b) => b.length - a.length);
  return new RegExp(`\\b(${escaped.join('|')})\\b`, 'gi');
}

/**
 * Look up a term (case-insensitive).
 */
export function lookupTerm(term: string): DictionaryEntry | undefined {
  const lower = term.toLowerCase();
  return cookingDictionary.find(e => e.term.toLowerCase() === lower);
}
