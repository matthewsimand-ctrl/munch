import { useMemo, useState } from "react";
import { Package, Search, AlertTriangle, CheckCircle, X, Trash2, Camera, ChefHat } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useStore } from "@/lib/store";
import { getCategory, getAllCategories } from "@/lib/ingredientCategories";

type Status = "good" | "low" | "expired";

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

const STATUS_CONFIG: Record<Status, { label: string; bg: string; text: string; icon: typeof CheckCircle }> = {
  good: { label: "In stock", bg: "bg-green-50", text: "text-green-600", icon: CheckCircle },
  low: { label: "Running low", bg: "bg-amber-50", text: "text-amber-600", icon: AlertTriangle },
  expired: { label: "Expired", bg: "bg-red-50", text: "text-red-500", icon: X },
};

function inferStatusFromQuantity(quantity: string): Status {
  const q = quantity.toLowerCase();
  if (q.includes("expired")) return "expired";
  if (q.includes("low") || q.includes("empty") || q.includes("last") || q === "0") return "low";
  return "good";
}

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
  const { pantryList, addPantryItem, removePantryItem } = useStore();
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState("All");
  const [newItem, setNewItem] = useState({ name: "", quantity: "", category: "Other" });
  const [isPremium] = useState(true);

  const items = useMemo(
    () => pantryList.map((item) => ({ ...item, status: inferStatusFromQuantity(item.quantity || "1") })),
    [pantryList],
  );

  const filtered = items
    .filter((i) => activeCategory === "All" || (i.category || "Other") === activeCategory)
    .filter((i) => i.name.toLowerCase().includes(search.toLowerCase()));

  const goodCount = items.filter((i) => i.status === "good").length;
  const lowCount = items.filter((i) => i.status === "low").length;
  const expiredCount = items.filter((i) => i.status === "expired").length;

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
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
            <div data-tour-id="pantry-add-form" className="bg-white rounded-2xl border border-orange-200 shadow-sm p-5">
              <h3 className="text-sm font-bold text-gray-800 mb-3">Quick add (always on)</h3>
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
                const cfg = STATUS_CONFIG[item.status];
                const Icon = cfg.icon;
                return (
                  <div key={item.name} className="flex items-center gap-4 px-5 py-3.5 hover:bg-gray-50 group">
                    <div className={`w-8 h-8 rounded-xl ${cfg.bg} flex items-center justify-center shrink-0`}><Icon size={14} className={cfg.text} /></div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold text-gray-800">{item.name}</div>
                      <div className="text-xs text-gray-400">{item.category || "Other"}</div>
                    </div>
                    <div className="text-sm text-gray-600 font-medium shrink-0 hidden sm:block">{item.quantity || "1"}</div>
                    <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${cfg.bg} ${cfg.text} shrink-0 hidden md:block`}>{cfg.label}</span>
                    <button onClick={() => removePantryItem(item.name)} className="opacity-0 group-hover:opacity-100 text-gray-300 hover:text-red-400"><Trash2 size={14} /></button>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="space-y-4">
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <h2 className="text-sm font-bold text-gray-800 mb-2">Pantry health</h2>
              <p className="text-xs text-gray-500 mb-3">Health is calculated by item status: good, low, or expired based on quantity text (e.g. "nearly empty" = low, "expired" = expired).</p>
              <div className="space-y-2">
                <div className="flex justify-between text-sm"><span>In stock</span><span className="font-bold">{goodCount}</span></div>
                <div className="flex justify-between text-sm"><span>Running low</span><span className="font-bold text-amber-600">{lowCount}</span></div>
                <div className="flex justify-between text-sm"><span>Expired</span><span className="font-bold text-red-500">{expiredCount}</span></div>
                <div className="mt-3 h-2 bg-gray-100 rounded-full overflow-hidden flex">
                  <div className="h-full bg-green-400" style={{ width: `${items.length ? (goodCount / items.length) * 100 : 0}%` }} />
                  <div className="h-full bg-amber-400" style={{ width: `${items.length ? (lowCount / items.length) * 100 : 0}%` }} />
                  <div className="h-full bg-red-400" style={{ width: `${items.length ? (expiredCount / items.length) * 100 : 0}%` }} />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
