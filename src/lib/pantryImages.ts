function svgToDataUri(svg: string) {
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

function buildEmojiTile(emoji: string, background: string, border: string) {
  return svgToDataUri(`
    <svg xmlns="http://www.w3.org/2000/svg" width="96" height="96" viewBox="0 0 96 96">
      <rect x="6" y="6" width="84" height="84" rx="24" fill="${background}" stroke="${border}" stroke-width="3" />
      <text x="48" y="58" text-anchor="middle" font-size="38">${emoji}</text>
    </svg>
  `);
}

function normalizeItemName(name: string) {
  return String(name || "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\b([a-z]+?)ies\b/g, "$1y")
    .replace(/\b([a-z]+?)(es|s)\b/g, "$1");
}

function matchesKeyword(name: string, keyword: string) {
  const normalizedName = ` ${normalizeItemName(name).replace(/\s+/g, " ").trim()} `;
  const normalizedKeyword = ` ${normalizeItemName(keyword).replace(/\s+/g, " ").trim()} `;
  return normalizedName.includes(normalizedKeyword);
}

const CATEGORY_IMAGE_MAP: Record<string, { emoji: string; background: string; border: string }> = {
  Produce: { emoji: "🥦", background: "#ECFDF5", border: "#86EFAC" },
  Dairy: { emoji: "🧀", background: "#EFF6FF", border: "#93C5FD" },
  "Meat & Fish": { emoji: "🥩", background: "#FEF2F2", border: "#FCA5A5" },
  "Dry Goods": { emoji: "🌾", background: "#FEF3C7", border: "#FCD34D" },
  "Pasta / Noodles": { emoji: "🍝", background: "#FFF7ED", border: "#FDBA74" },
  Condiments: { emoji: "🫙", background: "#F5F3FF", border: "#C4B5FD" },
  Bakery: { emoji: "🍞", background: "#FFF1F2", border: "#FDA4AF" },
  Frozen: { emoji: "🧊", background: "#ECFEFF", border: "#67E8F9" },
  Other: { emoji: "📦", background: "#F5F5F4", border: "#D6D3D1" },
};

const ITEM_IMAGE_RULES: Array<{ keywords: string[]; emoji: string; background: string; border: string }> = [
  { keywords: ["banana"], emoji: "🍌", background: "#FEF9C3", border: "#FDE047" },
  { keywords: ["apple"], emoji: "🍎", background: "#FEF2F2", border: "#FCA5A5" },
  { keywords: ["orange", "mandarin", "clementine"], emoji: "🍊", background: "#FFF7ED", border: "#FDBA74" },
  { keywords: ["lemon", "lime"], emoji: "🍋", background: "#FEF9C3", border: "#FACC15" },
  { keywords: ["avocado"], emoji: "🥑", background: "#ECFDF5", border: "#86EFAC" },
  { keywords: ["broccoli"], emoji: "🥦", background: "#ECFDF5", border: "#86EFAC" },
  { keywords: ["carrot"], emoji: "🥕", background: "#FFF7ED", border: "#FDBA74" },
  { keywords: ["pepper", "chili"], emoji: "🫑", background: "#F0FDF4", border: "#86EFAC" },
  { keywords: ["onion", "garlic"], emoji: "🧅", background: "#F5F3FF", border: "#C4B5FD" },
  { keywords: ["potato"], emoji: "🥔", background: "#FEF3C7", border: "#FCD34D" },
  { keywords: ["mushroom"], emoji: "🍄", background: "#F5F5F4", border: "#D6D3D1" },
  { keywords: ["tomato"], emoji: "🍅", background: "#FEF2F2", border: "#FCA5A5" },
  { keywords: ["egg"], emoji: "🥚", background: "#F8FAFC", border: "#CBD5E1" },
  { keywords: ["milk"], emoji: "🥛", background: "#EFF6FF", border: "#93C5FD" },
  { keywords: ["cheese"], emoji: "🧀", background: "#FEF3C7", border: "#FDE68A" },
  { keywords: ["butter"], emoji: "🧈", background: "#FEF9C3", border: "#FDE047" },
  { keywords: ["yogurt"], emoji: "🥣", background: "#EFF6FF", border: "#BFDBFE" },
  { keywords: ["chicken"], emoji: "🍗", background: "#FEF2F2", border: "#FECACA" },
  { keywords: ["beef", "steak", "minced meat", "ground beef"], emoji: "🥩", background: "#FEF2F2", border: "#FCA5A5" },
  { keywords: ["pork", "bacon", "sausage"], emoji: "🥓", background: "#FFF1F2", border: "#FDA4AF" },
  { keywords: ["fish", "salmon", "tuna"], emoji: "🐟", background: "#ECFEFF", border: "#67E8F9" },
  { keywords: ["shrimp"], emoji: "🦐", background: "#FFF7ED", border: "#FDBA74" },
  { keywords: ["pasta", "spaghetti", "penne", "macaroni"], emoji: "🍝", background: "#FFF7ED", border: "#FDBA74" },
  { keywords: ["ramen", "noodle"], emoji: "🍜", background: "#FFF7ED", border: "#FDBA74" },
  { keywords: ["rice"], emoji: "🍚", background: "#F8FAFC", border: "#CBD5E1" },
  { keywords: ["bread", "bagel", "bun"], emoji: "🍞", background: "#FFF1F2", border: "#FDA4AF" },
  { keywords: ["flour"], emoji: "🌾", background: "#FEF3C7", border: "#FDE68A" },
  { keywords: ["beans"], emoji: "🫘", background: "#FEF2F2", border: "#FCA5A5" },
  { keywords: ["oil"], emoji: "🫒", background: "#ECFDF5", border: "#86EFAC" },
  { keywords: ["sauce", "ketchup", "mustard"], emoji: "🫙", background: "#F5F3FF", border: "#C4B5FD" },
  { keywords: ["ice cream"], emoji: "🍨", background: "#EFF6FF", border: "#93C5FD" },
];

export function getPantryImage(name: string, category?: string) {
  const matchedItem = ITEM_IMAGE_RULES.find((rule) =>
    rule.keywords.some((keyword) => matchesKeyword(name, keyword))
  );

  if (matchedItem) {
    return {
      src: buildEmojiTile(matchedItem.emoji, matchedItem.background, matchedItem.border),
      alt: name,
      matched: true,
    };
  }

  const fallback = CATEGORY_IMAGE_MAP[category || "Other"] || CATEGORY_IMAGE_MAP.Other;
  return {
    src: buildEmojiTile(fallback.emoji, fallback.background, fallback.border),
    alt: category || "Other",
    matched: false,
  };
}
