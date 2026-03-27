import { useEffect, useMemo, useRef, useState } from "react";
import { Search, BookOpen, ChevronDown, ChevronRight, Star, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

/* ── Data ───────────────────────────────────────────────────── */
interface Term {
  id: string;
  term: string;
  category: string;
  difficulty: "beginner" | "intermediate" | "advanced";
  definition: string;
  example?: string;
  tip?: string;
  relatedTerms?: string[];
}

const TERMS: Term[] = [
  { id: "1", term: "Blanch", category: "Techniques", difficulty: "beginner",
    definition: "Briefly cook food in boiling water, then immediately plunge it into ice water to stop the cooking process.",
    example: "Blanch green beans for 2 minutes, then shock in ice water to preserve their bright colour.",
    tip: "This technique locks in colour, nutrients, and texture — great for vegetables you'll serve cold.",
    relatedTerms: ["Shock", "Par-cook"] },
  { id: "2", term: "Brunoise", category: "Knife Skills", difficulty: "intermediate",
    definition: "A fine dice cut where food is cut into very small cubes, typically 3mm × 3mm × 3mm.",
    example: "A brunoise of carrots and celery adds texture to a refined consommé.",
    tip: "First cut into julienne strips, then rotate and dice across.",
    relatedTerms: ["Julienne", "Mirepoix"] },
  { id: "3", term: "Deglaze", category: "Techniques", difficulty: "beginner",
    definition: "Add liquid to a hot pan to lift the caramelised bits stuck to the bottom (fond), creating the base for a sauce.",
    example: "After searing chicken, deglaze with white wine and scrape up all the fond for a pan sauce.",
    tip: "Use wine, stock, or even water. The sizzle is the fond releasing — that's flavour.",
    relatedTerms: ["Fond", "Reduction", "Pan sauce"] },
  { id: "4", term: "Emulsify", category: "Techniques", difficulty: "intermediate",
    definition: "Combine two liquids that normally don't mix (like oil and water) into a stable, creamy mixture.",
    example: "Slowly whisk olive oil into egg yolk and mustard to emulsify a classic mayonnaise.",
    tip: "Add oil drop by drop at first — patience is the key to a stable emulsion.",
    relatedTerms: ["Vinaigrette", "Mayonnaise", "Hollandaise"] },
  { id: "5", term: "Fond", category: "Terms", difficulty: "beginner",
    definition: "The browned bits that stick to the bottom of the pan after searing meat or vegetables. Packed with flavour.",
    example: "After browning beef, there was a rich dark fond that made the braise extraordinary.",
    tip: "Never throw this away — deglaze it and build a sauce.",
    relatedTerms: ["Deglaze", "Maillard reaction"] },
  { id: "6", term: "Julienne", category: "Knife Skills", difficulty: "beginner",
    definition: "Cut food into thin, uniform matchstick strips, typically 3mm wide and 5–7cm long.",
    example: "Julienne the carrots and cucumber for a fresh spring roll filling.",
    tip: "Square off rounded vegetables first for cleaner, more consistent cuts.",
    relatedTerms: ["Brunoise", "Chiffonade"] },
  { id: "7", term: "Maillard Reaction", category: "Food Science", difficulty: "intermediate",
    definition: "A chemical reaction between amino acids and reducing sugars that gives browned food its distinctive flavour and colour.",
    example: "The deep, savoury crust on a perfectly seared steak is the Maillard reaction at work.",
    tip: "Dry the surface of meat before searing — water prevents browning.",
    relatedTerms: ["Fond", "Caramelisation", "Sear"] },
  { id: "8", term: "Mise en Place", category: "Fundamentals", difficulty: "beginner",
    definition: "French for 'everything in its place.' Having all ingredients prepped and ready before you start cooking.",
    example: "Chop all vegetables, measure spices, and set them out before heating the pan.",
    tip: "This is the single most important habit a home cook can develop — it eliminates stress.",
    relatedTerms: [] },
  { id: "9", term: "Beurre Blanc", category: "Sauces", difficulty: "advanced",
    definition: "A classic French butter sauce made by reducing white wine and shallots, then whisking in cold butter to create a rich, creamy emulsion.",
    example: "Serve pan-seared fish over a pool of lemon beurre blanc.",
    tip: "Keep the heat low when adding butter — too hot and the emulsion breaks.",
    relatedTerms: ["Emulsify", "Reduction", "Hollandaise"] },
  { id: "10", term: "Chiffonade", category: "Knife Skills", difficulty: "beginner",
    definition: "A slicing technique for leafy herbs or vegetables — stack, roll, then cut into thin ribbons.",
    example: "A chiffonade of basil makes a beautiful, aromatic garnish for bruschetta.",
    tip: "Roll the leaves tightly for cleaner, more elegant ribbons.",
    relatedTerms: ["Julienne"] },
  { id: "11", term: "Confit", category: "Techniques", difficulty: "advanced",
    definition: "Cook food slowly submerged in its own fat or oil at a low temperature. Originally a preservation method.",
    example: "Duck leg confit, cooked for hours in rendered duck fat, becomes impossibly tender.",
    tip: "The fat never gets absorbed — the slow cook draws moisture out and pulls flavour in.",
    relatedTerms: ["Braise", "Render"] },
  { id: "12", term: "Reduction", category: "Techniques", difficulty: "beginner",
    definition: "Simmer a liquid until some of it evaporates, concentrating flavours and thickening the texture.",
    example: "Reduce the red wine to half its volume before adding stock for an intense braising liquid.",
    tip: "Watch carefully towards the end — reductions can go from perfect to burnt quickly.",
    relatedTerms: ["Deglaze", "Pan sauce", "Glaze"] },
  { id: "13", term: "Render", category: "Techniques", difficulty: "beginner",
    definition: "Cook fatty meat (like bacon or duck skin) over low heat until the fat melts out.",
    example: "Render pancetta in a dry pan until crispy — use the released fat to cook onions.",
    tip: "Start with a cold pan and low heat for the best render.",
    relatedTerms: ["Confit", "Lardons"] },
  { id: "14", term: "Temper", category: "Techniques", difficulty: "intermediate",
    definition: "Gradually raise the temperature of a cold ingredient by mixing in small amounts of hot liquid, preventing curdling or seizing.",
    example: "Temper the eggs for pastry cream by slowly whisking in hot milk before adding to the pot.",
    tip: "Go slowly — whisk constantly and add the hot liquid in a thin stream.",
    relatedTerms: ["Emulsify"] },
  { id: "15", term: "Umami", category: "Food Science", difficulty: "beginner",
    definition: "The fifth basic taste, described as savory or meaty. Found naturally in aged cheeses, soy sauce, mushrooms, tomatoes, and cured meats.",
    example: "Adding a parmesan rind to tomato sauce boosts umami depth without adding saltiness.",
    tip: "Layer umami ingredients (anchovies + tomato paste + parmesan) for restaurant-level depth.",
    relatedTerms: ["Glutamates"] },
  { id: "16", term: "Braise", category: "Techniques", difficulty: "intermediate",
    definition: "Cook food by searing first, then simmering slowly in a covered pot with a small amount of liquid until tender.",
    example: "Braise short ribs with onions, red wine, and stock for a rich, fork-tender result.",
    tip: "Keep the heat low and steady so collagen breaks down gradually without drying the meat.",
    relatedTerms: ["Sear", "Reduction", "Fond"] },
  { id: "17", term: "Al Dente", category: "Fundamentals", difficulty: "beginner",
    definition: "Italian for 'to the tooth' — pasta that is cooked through but still slightly firm in the center.",
    example: "Pull pasta a minute early and finish it in the sauce to keep the texture al dente.",
    tip: "Taste frequently near the end of cooking rather than relying only on the package time.",
    relatedTerms: ["Reduction", "Temper"] },
  { id: "18", term: "Macerate", category: "Techniques", difficulty: "beginner",
    definition: "Soak fruit with sugar, citrus, or alcohol to soften it and draw out juices for sauces and desserts.",
    example: "Macerate strawberries with sugar and lemon zest, then spoon over shortcake.",
    tip: "A short rest (15–30 minutes) is often enough; too long can make fruit mushy.",
    relatedTerms: ["Reduction", "Confit"] },
  { id: "19", term: "Spatchcock", category: "Techniques", difficulty: "intermediate",
    definition: "Remove a bird's backbone and flatten it before roasting or grilling so it cooks faster and more evenly.",
    example: "Spatchcocking a chicken helps the breast and thighs finish at nearly the same time.",
    tip: "Use kitchen shears and press firmly on the breastbone to flatten after removing the backbone.",
    relatedTerms: ["Render", "Maillard Reaction"] },
  { id: "20", term: "Degrease", category: "Fundamentals", difficulty: "beginner",
    definition: "Remove excess fat from the surface of stocks, stews, or sauces for a cleaner texture and flavor.",
    example: "After chilling the stock overnight, lift off the solid fat cap to degrease it.",
    tip: "For hot liquids, skim with a ladle or drag a paper towel lightly across the surface.",
    relatedTerms: ["Reduction", "Braise"] },
  { id: "21", term: "Sauté", category: "Techniques", difficulty: "beginner",
    definition: "Cook food quickly in a small amount of fat over medium-high heat, moving it often for even browning.",
    example: "Sauté onions in olive oil until softened and lightly golden.",
    tip: "Do not overcrowd the pan or the food will steam instead of brown.",
    relatedTerms: ["Pan-fry", "Stir-fry", "Sear"] },
  { id: "22", term: "Simmer", category: "Techniques", difficulty: "beginner",
    definition: "Cook liquid just below a boil so small bubbles gently rise to the surface.",
    example: "Simmer the tomato sauce for 20 minutes to deepen the flavor.",
    tip: "A simmer keeps delicate ingredients tender without breaking them apart.",
    relatedTerms: ["Boil", "Reduce", "Poach"] },
  { id: "23", term: "Boil", category: "Techniques", difficulty: "beginner",
    definition: "Heat liquid until it reaches a full rolling bubble at high temperature.",
    example: "Bring the pasta water to a boil before adding the noodles.",
    tip: "Boiling is stronger than simmering, so use it when you want fast, vigorous cooking.",
    relatedTerms: ["Simmer", "Blanch", "Poach"] },
  { id: "24", term: "Poach", category: "Techniques", difficulty: "beginner",
    definition: "Cook food gently in liquid kept below a simmer.",
    example: "Poach eggs in barely bubbling water for a tender white and runny yolk.",
    tip: "Poaching is ideal for delicate foods like fish, eggs, and fruit.",
    relatedTerms: ["Simmer", "Steam"] },
  { id: "25", term: "Steam", category: "Techniques", difficulty: "beginner",
    definition: "Cook food using the hot vapor from boiling water rather than direct contact with the water.",
    example: "Steam broccoli until bright green and just tender.",
    tip: "Steaming preserves texture and nutrients better than many wetter cooking methods.",
    relatedTerms: ["Blanch", "Poach"] },
  { id: "26", term: "Roast", category: "Techniques", difficulty: "beginner",
    definition: "Cook food uncovered in dry oven heat so the outside browns while the inside cooks through.",
    example: "Roast carrots at high heat until caramelized at the edges.",
    tip: "Spread ingredients out so hot air can circulate and promote browning.",
    relatedTerms: ["Bake", "Broil", "Caramelize"] },
  { id: "27", term: "Bake", category: "Techniques", difficulty: "beginner",
    definition: "Cook food in an oven using dry heat, often for breads, pastries, casseroles, and desserts.",
    example: "Bake the muffins until the tops spring back lightly when touched.",
    tip: "Avoid opening the oven repeatedly or you may lose heat and disrupt the bake.",
    relatedTerms: ["Roast", "Proof"] },
  { id: "28", term: "Grill", category: "Techniques", difficulty: "beginner",
    definition: "Cook food over direct heat on a grate, often adding char and smoky flavor.",
    example: "Grill chicken thighs until marked and cooked through.",
    tip: "Oil the grates and preheat well to help prevent sticking.",
    relatedTerms: ["Broil", "Sear"] },
  { id: "29", term: "Broil", category: "Techniques", difficulty: "beginner",
    definition: "Cook food with intense direct heat from above, usually in the oven.",
    example: "Broil the salmon for a few minutes to finish with a crisp top.",
    tip: "Broiling happens fast, so stay close and watch carefully.",
    relatedTerms: ["Grill", "Roast"] },
  { id: "30", term: "Fry", category: "Techniques", difficulty: "beginner",
    definition: "Cook food in hot fat or oil to create browning and crispness.",
    example: "Fry the onions until deeply golden and crisp.",
    tip: "Maintain the right oil temperature to avoid greasy results.",
    relatedTerms: ["Deep-fry", "Pan-fry", "Stir-fry"] },
  { id: "31", term: "Deep-fry", category: "Techniques", difficulty: "intermediate",
    definition: "Cook food fully submerged in hot oil until crisp and browned.",
    example: "Deep-fry the fritters until the outside is crunchy and golden.",
    tip: "Use a thermometer when possible to keep the oil in the proper range.",
    relatedTerms: ["Fry", "Pan-fry"] },
  { id: "32", term: "Pan-fry", category: "Techniques", difficulty: "beginner",
    definition: "Cook food in a shallow layer of hot oil or fat in a skillet.",
    example: "Pan-fry the cutlets until crisp on both sides.",
    tip: "Turn only when the crust has set so the coating stays intact.",
    relatedTerms: ["Fry", "Sauté", "Deep-fry"] },
  { id: "33", term: "Stir-fry", category: "Techniques", difficulty: "intermediate",
    definition: "Cook small pieces of food quickly over very high heat while stirring constantly.",
    example: "Stir-fry the vegetables for just a few minutes so they stay crisp-tender.",
    tip: "Prep everything before starting because stir-frying moves quickly.",
    relatedTerms: ["Sauté", "Pan-fry"] },
  { id: "34", term: "Sear", category: "Techniques", difficulty: "beginner",
    definition: "Cook the surface of food over high heat to develop a deeply browned crust.",
    example: "Sear the steak in a very hot pan before finishing it in the oven.",
    tip: "Dry the surface first so it browns instead of steaming.",
    relatedTerms: ["Maillard Reaction", "Deglaze", "Sauté"] },
  { id: "35", term: "Caramelize", category: "Techniques", difficulty: "intermediate",
    definition: "Cook sugars until they brown and develop a deeper, sweeter, more complex flavor.",
    example: "Caramelize onions slowly until they become soft, dark, and jammy.",
    tip: "Low heat and patience produce better caramelization than rushing with high heat.",
    relatedTerms: ["Roast", "Maillard Reaction"] },
  { id: "36", term: "Reduce", category: "Techniques", difficulty: "beginner",
    definition: "Cook a liquid down so water evaporates and the flavor becomes more concentrated.",
    example: "Reduce the sauce until it lightly coats the back of a spoon.",
    tip: "A reduction becomes stronger and saltier as it cooks, so season carefully.",
    relatedTerms: ["Simmer", "Glaze", "Deglaze"] },
  { id: "37", term: "Marinate", category: "Preparation", difficulty: "beginner",
    definition: "Soak food in a seasoned mixture to add flavor and sometimes tenderize it before cooking.",
    example: "Marinate the chicken in yogurt, garlic, and spices before grilling.",
    tip: "Acidic marinades can change texture quickly, so do not leave delicate proteins too long.",
    relatedTerms: ["Brine", "Infuse"] },
  { id: "38", term: "Brine", category: "Preparation", difficulty: "intermediate",
    definition: "Soak food in salted liquid so it seasons more deeply and retains moisture during cooking.",
    example: "Brine the turkey overnight for juicier meat.",
    tip: "Rinse or pat dry after brining if the recipe needs a clean exterior for browning.",
    relatedTerms: ["Marinate"] },
  { id: "39", term: "Glaze", category: "Techniques", difficulty: "intermediate",
    definition: "Coat food with a shiny finish or reduce a sauce until it becomes glossy and clingy.",
    example: "Glaze the carrots with butter and stock until they shine.",
    tip: "A good glaze should lightly coat rather than drown the food.",
    relatedTerms: ["Reduce", "Caramelize"] },
  { id: "40", term: "Whisk", category: "Preparation", difficulty: "beginner",
    definition: "Beat ingredients rapidly with a whisk to combine, aerate, or smooth them out.",
    example: "Whisk the vinaigrette until the oil and vinegar come together.",
    tip: "Use a larger whisking motion when you want more air in the mixture.",
    relatedTerms: ["Emulsify", "Fold"] },
  { id: "41", term: "Fold", category: "Preparation", difficulty: "intermediate",
    definition: "Gently combine a light mixture into a heavier one without knocking out too much air.",
    example: "Fold the whipped cream into the mousse base until just combined.",
    tip: "Use a spatula and slow sweeping motions to preserve volume.",
    relatedTerms: ["Whisk", "Cream"] },
  { id: "42", term: "Cream", category: "Preparation", difficulty: "beginner",
    definition: "Beat butter and sugar together until the mixture becomes pale and fluffy.",
    example: "Cream the butter and sugar before adding the eggs for the cake batter.",
    tip: "Room-temperature butter creams more evenly than cold butter.",
    relatedTerms: ["Fold", "Whisk"] },
  { id: "43", term: "Knead", category: "Baking", difficulty: "intermediate",
    definition: "Work dough by pushing, folding, and turning it to develop gluten structure.",
    example: "Knead the bread dough until it feels smooth and elastic.",
    tip: "Stop once the dough becomes supple; too much kneading can make it tough.",
    relatedTerms: ["Proof", "Bake"] },
  { id: "44", term: "Proof", category: "Baking", difficulty: "intermediate",
    definition: "Let yeast dough rest and rise so it becomes lighter before baking.",
    example: "Proof the dough in a warm spot until doubled in size.",
    tip: "A warm, draft-free place helps yeast work more steadily.",
    relatedTerms: ["Knead", "Bake"] },
  { id: "45", term: "Zest", category: "Preparation", difficulty: "beginner",
    definition: "Remove the thin colored outer layer of citrus peel for bright aromatic flavor.",
    example: "Add lemon zest to the batter for a fresh citrus note.",
    tip: "Avoid scraping into the bitter white pith underneath.",
    relatedTerms: ["Infuse"] },
  { id: "46", term: "Dice", category: "Knife Skills", difficulty: "beginner",
    definition: "Cut food into small, fairly even cubes.",
    example: "Dice the onion evenly so it cooks at the same speed throughout.",
    tip: "Consistent size matters more than perfect geometry.",
    relatedTerms: ["Chop", "Mince", "Julienne"] },
  { id: "47", term: "Mince", category: "Knife Skills", difficulty: "beginner",
    definition: "Cut food into very small pieces, smaller than a dice.",
    example: "Mince the garlic finely so it melts into the sauce.",
    tip: "A rocking knife motion works well for herbs and garlic.",
    relatedTerms: ["Chop", "Dice"] },
  { id: "48", term: "Chop", category: "Knife Skills", difficulty: "beginner",
    definition: "Cut food into pieces that are usually less uniform than a dice.",
    example: "Roughly chop the parsley to finish the dish.",
    tip: "Recipes often use 'rough chop' when exact size is not critical.",
    relatedTerms: ["Dice", "Mince", "Slice"] },
  { id: "49", term: "Slice", category: "Knife Skills", difficulty: "beginner",
    definition: "Cut food into broad, flat pieces.",
    example: "Thinly slice the mushrooms so they cook quickly in the pan.",
    tip: "Use steady pressure and keep thickness as even as possible.",
    relatedTerms: ["Chop", "Shred"] },
  { id: "50", term: "Shred", category: "Knife Skills", difficulty: "beginner",
    definition: "Cut or tear food into thin narrow strips.",
    example: "Shred the cabbage for slaw.",
    tip: "A sharp knife or box grater both work depending on the ingredient.",
    relatedTerms: ["Slice", "Grate"] },
  { id: "51", term: "Grate", category: "Preparation", difficulty: "beginner",
    definition: "Rub food against a grater to create fine or coarse pieces.",
    example: "Grate parmesan over the pasta just before serving.",
    tip: "Freeze softer cheeses briefly first if you want cleaner shreds.",
    relatedTerms: ["Shred", "Zest"] },
  { id: "52", term: "Score", category: "Knife Skills", difficulty: "intermediate",
    definition: "Make shallow cuts in the surface of food to guide cooking, seasoning, or expansion.",
    example: "Score the duck skin so the fat renders more evenly.",
    tip: "Cut only the surface layer unless the recipe specifically says otherwise.",
    relatedTerms: ["Render", "Slice"] },
  { id: "53", term: "Skim", category: "Techniques", difficulty: "beginner",
    definition: "Lift foam, fat, or impurities from the surface of a liquid while it cooks.",
    example: "Skim the stock as it simmers for a cleaner final broth.",
    tip: "A shallow spoon or ladle gives you better control than stirring.",
    relatedTerms: ["Clarify", "Degrease"] },
  { id: "54", term: "Infuse", category: "Preparation", difficulty: "intermediate",
    definition: "Steep one ingredient into another so flavor gently transfers over time.",
    example: "Infuse cream with vanilla before making the custard.",
    tip: "Keep the heat low so delicate aromatics do not turn bitter.",
    relatedTerms: ["Bloom", "Marinate", "Zest"] },
  { id: "55", term: "Toast", category: "Techniques", difficulty: "beginner",
    definition: "Cook an ingredient until lightly browned and more aromatic.",
    example: "Toast the cumin seeds before grinding them for extra flavor.",
    tip: "Dry toasting spices only takes a short time, so stir and watch closely.",
    relatedTerms: ["Bloom", "Caramelize"] },
  { id: "56", term: "Bloom", category: "Preparation", difficulty: "intermediate",
    definition: "Activate flavor or texture by exposing an ingredient to liquid or heat.",
    example: "Bloom the spices in oil at the start of the curry to release their aroma.",
    tip: "Blooming spices in fat makes them taste fuller and more rounded.",
    relatedTerms: ["Toast", "Infuse"] },
  { id: "57", term: "Clarify", category: "Techniques", difficulty: "advanced",
    definition: "Remove solids or impurities from a liquid or fat so it becomes cleaner and more transparent.",
    example: "Clarify the butter before using it for a delicate sauce.",
    tip: "Clarifying often improves flavor stability and raises the smoke point of butter.",
    relatedTerms: ["Skim", "Emulsify"] },
];

const CATEGORIES = ["All", ...Array.from(new Set(TERMS.map((t) => t.category))).sort()];
const DIFFICULTIES = ["All", "beginner", "intermediate", "advanced"];

const DIFF_STYLE: Record<string, { label: string; color: string; bg: string }> = {
  beginner:     { label: "Beginner",     color: "#059669", bg: "#ECFDF5" },
  intermediate: { label: "Intermediate", color: "#D97706", bg: "#FFF3C4" },
  advanced:     { label: "Advanced",     color: "#DC2626", bg: "#FEF2F2" },
};

function TermCard({
  term,
  isOpen,
  onToggle,
  onRelatedTermClick,
}: {
  term: Term;
  isOpen: boolean;
  onToggle: () => void;
  onRelatedTermClick: (relatedTerm: string) => void;
}) {
  const diff = DIFF_STYLE[term.difficulty];
  return (
    <motion.div
      layout
      className="rounded-2xl border overflow-hidden transition-shadow hover:shadow-md"
      style={{ background: "#fff", borderColor: "rgba(0,0,0,0.07)", boxShadow: "0 1px 4px rgba(28,25,23,0.04)" }}
    >
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-4 px-5 py-4 text-left hover:bg-stone-50/60 transition-colors"
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5 flex-wrap">
            <h3 className="text-base font-bold text-stone-900" style={{ fontFamily: "'Fraunces', Georgia, serif" }}>
              {term.term}
            </h3>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold" style={{ background: diff.bg, color: diff.color }}>
              {diff.label}
            </span>
          </div>
          {!isOpen && (
            <p className="text-xs text-stone-400 truncate">{term.definition}</p>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span
            className="px-2.5 py-1 rounded-full text-[10px] font-semibold"
            style={{ background: "rgba(249,115,22,0.08)", color: "#C2410C" }}
          >
            {term.category}
          </span>
          <ChevronDown
            size={16}
            className="text-stone-300 transition-transform"
            style={{ transform: isOpen ? "rotate(180deg)" : "none" }}
          />
        </div>
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-5 pb-5 space-y-4 border-t" style={{ borderColor: "rgba(0,0,0,0.05)" }}>
              {/* Definition */}
              <div className="pt-4">
                <p className="text-[10px] font-bold text-stone-400 uppercase tracking-widest mb-1.5">Definition</p>
                <p className="text-sm text-stone-700 leading-relaxed">{term.definition}</p>
              </div>

              {/* Example */}
              {term.example && (
                <div
                  className="rounded-xl px-4 py-3 border-l-4"
                  style={{ background: "#FFF7ED", borderColor: "#F97316" }}
                >
                  <p className="text-[10px] font-bold text-orange-500 uppercase tracking-widest mb-1">Example</p>
                  <p className="text-xs text-stone-600 italic leading-relaxed">"{term.example}"</p>
                </div>
              )}

              {/* Tip */}
              {term.tip && (
                <div
                  className="rounded-xl px-4 py-3 flex items-start gap-3"
                  style={{ background: "#F0FDF4" }}
                >
                  <Star size={13} className="text-emerald-500 mt-0.5 shrink-0 fill-emerald-500" />
                  <div>
                    <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest mb-1">Pro tip</p>
                    <p className="text-xs text-emerald-800 leading-relaxed">{term.tip}</p>
                  </div>
                </div>
              )}

              {/* Related terms */}
              {term.relatedTerms && term.relatedTerms.length > 0 && (
                <div>
                  <p className="text-[10px] font-bold text-stone-400 uppercase tracking-widest mb-2">Related terms</p>
                  <div className="flex flex-wrap gap-1.5">
                    {term.relatedTerms.map((t) => (
                      <button
                        type="button"
                        key={t}
                        onClick={() => onRelatedTermClick(t)}
                        className="px-2.5 py-1 rounded-full text-xs font-semibold"
                        style={{ background: "rgba(249,115,22,0.08)", color: "#C2410C", border: "1px solid rgba(249,115,22,0.15)" }}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function normalizeTerm(value: string) {
  return value.trim().toLowerCase();
}

/* ── Main ───────────────────────────────────────────────────── */
export default function DictionaryScreen() {
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState("All");
  const [activeDifficulty, setActiveDifficulty] = useState("All");
  const [openTermId, setOpenTermId] = useState<string | null>(null);
  const [pendingScrollTerm, setPendingScrollTerm] = useState<string | null>(null);
  const termRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const termByName = useMemo(() => {
    const entries = TERMS.map((term) => [normalizeTerm(term.term), term] as const);
    return new Map(entries);
  }, []);

  const filtered = useMemo(() => {
    return TERMS.filter((t) => {
      if (search && !t.term.toLowerCase().includes(search.toLowerCase()) && !t.definition.toLowerCase().includes(search.toLowerCase())) return false;
      if (activeCategory !== "All" && t.category !== activeCategory) return false;
      if (activeDifficulty !== "All" && t.difficulty !== activeDifficulty) return false;
      return true;
    });
  }, [search, activeCategory, activeDifficulty]);

  const letterGroups = useMemo(() => {
    const groups: Record<string, Term[]> = {};
    [...filtered].sort((a, b) => a.term.localeCompare(b.term)).forEach((t) => {
      const letter = t.term[0].toUpperCase();
      if (!groups[letter]) groups[letter] = [];
      groups[letter].push(t);
    });
    return groups;
  }, [filtered]);

  useEffect(() => {
    if (!pendingScrollTerm) return;

    const targetTerm = termByName.get(normalizeTerm(pendingScrollTerm));
    if (!targetTerm) {
      setPendingScrollTerm(null);
      return;
    }

    const targetNode = termRefs.current[targetTerm.id];
    if (!targetNode) return;

    targetNode.scrollIntoView({ behavior: "smooth", block: "start" });
    setOpenTermId(targetTerm.id);
    setPendingScrollTerm(null);
  }, [filtered, pendingScrollTerm, termByName]);

  const handleRelatedTermClick = (relatedTerm: string) => {
    const targetTerm = termByName.get(normalizeTerm(relatedTerm));
    if (!targetTerm) return;

    setSearch("");
    setActiveCategory("All");
    setActiveDifficulty("All");
    setOpenTermId(targetTerm.id);
    setPendingScrollTerm(relatedTerm);
  };

  return (
    <div className="min-h-full" style={{ fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif", background: "#FFFAF5" }}>

      {/* Header */}
      <div
        className="relative border-b overflow-hidden"
        style={{ background: "linear-gradient(135deg,#FFF7ED 0%,#FFFAF5 100%)", borderColor: "rgba(249,115,22,0.12)" }}
      >
        <div
          className="absolute inset-0 opacity-20"
          style={{ backgroundImage: "radial-gradient(circle, #FDA97440 1px, transparent 1px)", backgroundSize: "20px 20px" }}
        />
        <div className="relative max-w-6xl mx-auto px-4 py-4 sm:px-6 sm:py-6">
          <p className="text-[10px] font-bold text-orange-400 uppercase tracking-widest mb-1">Reference</p>
          <h1 className="mb-1 text-xl font-bold text-stone-900 sm:text-2xl" style={{ fontFamily: "'Fraunces', Georgia, serif" }}>
            Cooking Dictionary
          </h1>
          <p className="text-xs text-stone-400">{TERMS.length} terms across {CATEGORIES.length - 1} categories</p>

          {/* Search */}
          <div className="relative mt-5">
            <Search size={15} className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-300" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search terms and definitions…"
              className="w-full pl-11 pr-4 py-3 rounded-xl border text-sm text-stone-700 placeholder:text-stone-300 outline-none focus:border-orange-300 transition-colors"
              style={{ background: "#fff", borderColor: "rgba(0,0,0,0.09)" }}
            />
            {search && (
              <button onClick={() => setSearch("")} className="absolute right-4 top-1/2 -translate-y-1/2 text-stone-300 hover:text-stone-500">
                <X size={14} />
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto space-y-5 px-4 py-4 sm:px-6 sm:py-5">

        {/* Filters */}
        <div className="space-y-3">
          {/* Categories */}
          <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-0.5">
            {CATEGORIES.map((c) => (
              <button
                key={c}
                onClick={() => setActiveCategory(c)}
                className="px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all"
                style={
                  activeCategory === c
                    ? { background: "linear-gradient(135deg,#FB923C,#F97316)", color: "#fff", boxShadow: "0 2px 8px rgba(249,115,22,0.25)" }
                    : { background: "#fff", color: "#57534E", border: "1px solid rgba(0,0,0,0.08)" }
                }
              >
                {c}
              </button>
            ))}
          </div>

          {/* Difficulty */}
          <div className="flex gap-2">
            {DIFFICULTIES.map((d) => {
              const style = d !== "All" ? DIFF_STYLE[d] : null;
              return (
                <button
                  key={d}
                  onClick={() => setActiveDifficulty(d)}
                  className="px-3 py-1 rounded-full text-[11px] font-bold transition-all"
                  style={
                    activeDifficulty === d
                      ? { background: style ? style.bg : "#1C1917", color: style ? style.color : "#fff", border: `1px solid ${style ? style.color + "40" : "#1C1917"}` }
                      : { background: "#fff", color: "#78716C", border: "1px solid rgba(0,0,0,0.08)" }
                  }
                >
                  {d === "All" ? "All levels" : DIFF_STYLE[d].label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Results count */}
        {(search || activeCategory !== "All" || activeDifficulty !== "All") && (
          <p className="text-xs text-stone-400 font-medium">{filtered.length} result{filtered.length !== 1 ? "s" : ""}</p>
        )}

        {/* Terms */}
        {filtered.length === 0 ? (
          <div className="py-16 text-center">
            <div className="w-16 h-16 rounded-2xl bg-orange-50 flex items-center justify-center text-3xl mx-auto mb-4">📖</div>
            <p className="font-bold text-stone-600" style={{ fontFamily: "'Fraunces', Georgia, serif" }}>Nothing found</p>
            <p className="text-sm text-stone-400 mt-1">Try a different search or filter</p>
          </div>
        ) : (
          <div className="space-y-6">
            {Object.entries(letterGroups).map(([letter, terms]) => (
              <div key={letter}>
                <div className="flex items-center gap-3 mb-3">
                  <span
                    className="text-2xl font-black"
                    style={{ fontFamily: "'Fraunces', Georgia, serif", color: "#F97316" }}
                  >
                    {letter}
                  </span>
                  <div className="flex-1 h-px" style={{ background: "rgba(249,115,22,0.15)" }} />
                </div>
                <div className="space-y-2">
                  {terms.map((term) => (
                    <div
                      key={term.id}
                      ref={(node) => {
                        termRefs.current[term.id] = node;
                      }}
                    >
                      <TermCard
                        term={term}
                        isOpen={openTermId === term.id}
                        onToggle={() => setOpenTermId(openTermId === term.id ? null : term.id)}
                        onRelatedTermClick={handleRelatedTermClick}
                      />
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Footer note */}
        <div
          className="rounded-2xl border p-5 flex items-start gap-4"
          style={{ background: "linear-gradient(135deg,#FFF7ED,#FFF3E4)", borderColor: "rgba(249,115,22,0.15)" }}
        >
          <div className="w-10 h-10 rounded-xl bg-orange-100 flex items-center justify-center text-xl shrink-0">📚</div>
          <div>
            <p className="text-sm font-bold text-stone-800" style={{ fontFamily: "'Fraunces', Georgia, serif" }}>More terms coming soon</p>
            <p className="text-xs text-stone-500 mt-0.5 leading-relaxed">
              We're building out a comprehensive culinary glossary. If there's a term you'd love to see explained, let us know!
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
