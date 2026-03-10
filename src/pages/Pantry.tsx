import { useMemo, useState } from "react";
import { Package, Search, Trash2, Camera, ChefHat, ShoppingCart } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useStore } from "@/lib/store";
import { getCategory, getAllCategories } from "@/lib/ingredientCategories";

const PANTRY_CATEGORIES = ["All", ...getAllCategories()];

const DEFAULT_QUANTITY_BY_CATEGORY: Record<string, string> = {
  Produce: "1 piece",
  "Meat & Seafood": "500g",
  "Dairy & Eggs": "1 pack",
  "Grains & Pasta": "500g",
  "Canned & Jarred": "1 can",
  "Oils & Condiments": "250ml",
  "Spices & Seasonings": "1 jar",
  Baking: "500g",
  Beverages: "1 bottle",
  Other: "1",
};

const KEYWORD_QUANTITY_HINTS: { keywords: string[]; quantity: string }[] = [
  { keywords: ["milk", "stock", "broth", "juice", "sauce", "oil", "vinegar"], quantity: "500ml" },
  { keywords: ["rice", "pasta", "lentil", "flour", "sugar", "quinoa", "oats"], quantity: "500g" },
  { keywords: ["egg"], quantity: "12" },
  { keywords: ["garlic", "onion", "lemon", "lime", "apple", "tomato", "potato"], quantity: "1 piece" },
  { keywords: ["salt", "pepper", "paprika", "cumin", "oregano", "cinnamon"], quantity: "1 jar" },
  { keywords: ["bean", "chickpea", "tomato paste", "coconut milk"], quantity: "1 can" },
];

function detectMetaFromName(name: string) {
  const lower = name.toLowerCase().trim();
  const category = getCategory(lower);
  const quantity =
    KEYWORD_QUANTITY_HINTS.find((hint) => hint.keywords.some((keyword) => lower.includes(keyword)))?.quantity ||
    DEFAULT_QUANTITY_BY_CATEGORY[category] ||
    "1";
  return { category, quantity };
}

export default function Pantry() {
  const navigate = useNavigate();
  const { pantryList, addPantryItem, removePantryItem, addCustomGroceryItem } = useStore();
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState("All");
  const [newItem, setNewItem] = useState({ name: "", quantity: "", category: "Other" });
  const [isPremium] = useState(true);

  const items = useMemo(() => pantryList, [pantryList]);

  const filtered = items
    .filter((i) => activeCategory === "All" || (i.category || "Other") === activeCategory)
    .filter((i) => i.name.toLowerCase().includes(search.toLowerCase()));

  const handleNameChange = (name: string) => {
    const detected = detectMetaFromName(name);
    setNewItem((prev) => ({
      ...prev,
      name,
      category: detected.category,
      quantity: prev.quantity.trim() ? prev.quantity : detected.quantity,
    }));
  };

  const handleAdd = () => {
    const name = newItem.name.trim();
    if (!name) return;
    const detected = detectMetaFromName(name);
    addPantryItem(name, newItem.quantity.trim() || detected.quantity, newItem.category || detected.category);
    setNewItem({ name: "", quantity: "", category: "Other" });
  };

  const handleAddToGrocery = (name: string, quantity?: string) => {
    addCustomGroceryItem(name, quantity || "1");
  };

  return (
    <div className="min-h-full bg-gray-50">
      <div className="bg-white border-b border-gray-100 px-6 py-5">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate('/dashboard')} className="flex items-center gap-2 shrink-0">
              <div className="w-7 h-7 bg-orange-500 rounded-lg flex items-center justify-center">
                <ChefHat className="text-white" size={14} />
              </div>
            </button>
            <div>
              <h1 className="text-2xl font-bold text-orange-500">Pantry</h1>
              <p className="text-sm text-gray-500 mt-0.5">{items.length} items tracked</p>
            </div>
          </div>
          {isPremium && (
            <button
              onClick={() => {/* TODO */}}
              className="flex items-center gap-2 bg-white hover:bg-gray-50 text-gray-700 text-sm font-semibold px-4 py-2.5 rounded-xl transition-colors shadow-sm border border-gray-200"
            >
              <Camera size={16} /> Scan Fridge
            </button>
          )}
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-6">
        <div className="space-y-4">
          <div className="space-y-4">
            <div data-tour-id="pantry-add-form" className="bg-white rounded-2xl border border-orange-200 shadow-sm p-5">
              <h3 className="text-sm font-bold text-gray-800 mb-3">Add items to your pantry</h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                <input
                  value={newItem.name}
                  onChange={(e) => handleNameChange(e.target.value)}
                  placeholder="e.g. coconut milk"
                  className="sm:col-span-1 px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:border-orange-300"
                />
                <input
                  value={newItem.quantity}
                  onChange={(e) => setNewItem((p) => ({ ...p, quantity: e.target.value }))}
                  placeholder="Auto-detected"
                  className="sm:col-span-1 px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:border-orange-300"
                />
                <select
                  value={newItem.category}
                  onChange={(e) => setNewItem((p) => ({ ...p, category: e.target.value }))}
                  className="sm:col-span-1 px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:border-orange-300"
                >
                  {PANTRY_CATEGORIES.filter((c) => c !== "All").map((c) => <option key={c}>{c}</option>)}
                </select>
              </div>
              <div className="flex items-center justify-between mt-3">
                <p className="text-xs text-gray-500">Food type, category, and quantity are auto-detected as you type.</p>
                <button onClick={handleAdd} className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white text-sm font-semibold rounded-xl">Add to Pantry</button>
              </div>
            </div>

            <div className="relative">
              <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search pantry…" className="w-full pl-10 pr-4 py-3 text-sm bg-white border border-gray-100 rounded-xl shadow-sm" />
            </div>

            <div className="flex gap-2 overflow-x-auto scrollbar-hide">
              {PANTRY_CATEGORIES.map((cat) => (
                <button key={cat} onClick={() => setActiveCategory(cat)} className={`shrink-0 text-xs font-semibold px-3.5 py-1.5 rounded-full border ${activeCategory === cat ? "bg-orange-500 text-white border-orange-500" : "bg-white text-gray-600 border-gray-200"}`}>{cat}</button>
              ))}
            </div>

            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm divide-y divide-gray-100 overflow-hidden">
              {filtered.length === 0 ? <div className="py-16 text-center"><Package size={32} className="mx-auto text-gray-300 mb-3" /><p className="text-sm text-gray-500">No items found</p></div> : filtered.map((item) => {
                return (
                  <div key={item.name} className="flex items-center gap-4 px-5 py-3.5 hover:bg-gray-50 group">
                    <div className="w-8 h-8 rounded-xl bg-orange-50 flex items-center justify-center shrink-0"><Package size={14} className="text-orange-500" /></div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold text-gray-800">{item.name}</div>
                      <div className="text-xs text-gray-400">{item.category || "Other"}</div>
                    </div>
                    <div className="text-sm text-gray-600 font-medium shrink-0 hidden sm:block">{item.quantity || "1"}</div>
                    <button
                      onClick={() => handleAddToGrocery(item.name, item.quantity)}
                      className="text-xs font-semibold px-2.5 py-1 rounded-full border border-orange-200 text-orange-600 hover:bg-orange-50 transition-colors shrink-0 hidden md:flex items-center gap-1"
                    >
                      <ShoppingCart size={12} /> Add to Grocery
                    </button>
                    <button onClick={() => removePantryItem(item.name)} className="opacity-0 group-hover:opacity-100 text-gray-300 hover:text-red-400"><Trash2 size={14} /></button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
