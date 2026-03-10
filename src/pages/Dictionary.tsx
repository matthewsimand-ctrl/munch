import { useState, useMemo } from "react";
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
];

const CATEGORIES = ["All", ...Array.from(new Set(TERMS.map((t) => t.category))).sort()];
const DIFFICULTIES = ["All", "beginner", "intermediate", "advanced"];

const DIFF_STYLE: Record<string, { label: string; color: string; bg: string }> = {
  beginner:     { label: "Beginner",     color: "#059669", bg: "#ECFDF5" },
  intermediate: { label: "Intermediate", color: "#D97706", bg: "#FFF3C4" },
  advanced:     { label: "Advanced",     color: "#DC2626", bg: "#FEF2F2" },
};

function TermCard({ term, isOpen, onToggle }: { term: Term; isOpen: boolean; onToggle: () => void }) {
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
                      <span
                        key={t}
                        className="px-2.5 py-1 rounded-full text-xs font-semibold"
                        style={{ background: "rgba(249,115,22,0.08)", color: "#C2410C", border: "1px solid rgba(249,115,22,0.15)" }}
                      >
                        {t}
                      </span>
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

/* ── Main ───────────────────────────────────────────────────── */
export default function DictionaryScreen() {
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState("All");
  const [activeDifficulty, setActiveDifficulty] = useState("All");
  const [openTermId, setOpenTermId] = useState<string | null>(null);

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
        <div className="relative max-w-4xl mx-auto px-6 py-6">
          <p className="text-[10px] font-bold text-orange-400 uppercase tracking-widest mb-1">Reference</p>
          <h1 className="text-2xl font-bold text-stone-900 mb-1" style={{ fontFamily: "'Fraunces', Georgia, serif" }}>
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

      <div className="max-w-4xl mx-auto px-6 py-5 space-y-5">

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
                    <TermCard
                      key={term.id}
                      term={term}
                      isOpen={openTermId === term.id}
                      onToggle={() => setOpenTermId(openTermId === term.id ? null : term.id)}
                    />
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
