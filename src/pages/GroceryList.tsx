import { useState } from "react";
import {
  ShoppingCart,
  Plus,
  Check,
  Trash2,
  Package,
  ChevronDown,
  Sparkles,
  Share2,
} from "lucide-react";

// ── Types & data ──────────────────────────────────────────────────────────────
interface GroceryItem {
  id: number;
  name: string;
  quantity: string;
  category: string;
  checked: boolean;
  fromRecipe?: string;
}

const INITIAL_ITEMS: GroceryItem[] = [
  { id: 1, name: "Arborio Rice", quantity: "500g", category: "Grains & Pasta", checked: false, fromRecipe: "Mushroom Risotto" },
  { id: 2, name: "Mixed Mushrooms", quantity: "300g", category: "Fresh Produce", checked: false, fromRecipe: "Mushroom Risotto" },
  { id: 3, name: "Parmesan", quantity: "100g", category: "Dairy", checked: true, fromRecipe: "Mushroom Risotto" },
  { id: 4, name: "Green Curry Paste", quantity: "1 jar", category: "Sauces & Condiments", checked: false, fromRecipe: "Thai Green Curry" },
  { id: 5, name: "Coconut Milk", quantity: "2 cans", category: "Canned Goods", checked: false, fromRecipe: "Thai Green Curry" },
  { id: 6, name: "Salmon Fillets", quantity: "400g", category: "Meat & Fish", checked: false, fromRecipe: "Lemon Herb Salmon" },
  { id: 7, name: "Fresh Dill", quantity: "1 bunch", category: "Fresh Produce", checked: true, fromRecipe: "Lemon Herb Salmon" },
  { id: 8, name: "Eggs", quantity: "6", category: "Dairy", checked: false },
  { id: 9, name: "Lemons", quantity: "3", category: "Fresh Produce", checked: false },
];

const CATEGORIES_ORDER = [
  "Fresh Produce",
  "Meat & Fish",
  "Dairy",
  "Grains & Pasta",
  "Canned Goods",
  "Sauces & Condiments",
];

export default function GroceryList() {
  const [items, setItems] = useState<GroceryItem[]>(INITIAL_ITEMS);
  const [newName, setNewName] = useState("");
  const [newQty, setNewQty] = useState("");
  const [newCat, setNewCat] = useState("Fresh Produce");
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  const toggle = (id: number) =>
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, checked: !i.checked } : i)));

  const remove = (id: number) => setItems((prev) => prev.filter((i) => i.id !== id));

  const clearChecked = () => setItems((prev) => prev.filter((i) => !i.checked));

  const handleAdd = () => {
    if (!newName.trim()) return;
    const item: GroceryItem = {
      id: Date.now(),
      name: newName,
      quantity: newQty || "1",
      category: newCat,
      checked: false,
    };
    setItems((prev) => [...prev, item]);
    setNewName("");
    setNewQty("");
  };

  const displayItems = activeCategory
    ? items.filter((i) => i.category === activeCategory)
    : items;

  const uncheckedCount = items.filter((i) => !i.checked).length;
  const checkedCount = items.filter((i) => i.checked).length;

  const groupedItems = CATEGORIES_ORDER.reduce<Record<string, GroceryItem[]>>((acc, cat) => {
    const catItems = displayItems.filter((i) => i.category === cat);
    if (catItems.length > 0) acc[cat] = catItems;
    return acc;
  }, {});

  return (
    <div className="min-h-full bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 px-6 py-5">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-orange-500">Grocery List</h1>
            <p className="text-sm text-gray-500 mt-0.5">
              {uncheckedCount} to get · {checkedCount} done
            </p>
          </div>
          <div className="flex items-center gap-2">
            {checkedCount > 0 && (
              <button
                onClick={clearChecked}
                className="text-sm font-semibold text-gray-500 hover:text-red-500 transition-colors px-3 py-2 rounded-xl hover:bg-red-50"
              >
                Clear done
              </button>
            )}
            <button className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition-colors shadow-sm">
              <Sparkles size={14} /> Auto-fill from Meal Plan
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* LEFT: list (2/3) */}
          <div className="lg:col-span-2 space-y-4">

            {/* Add item */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
              <div className="flex gap-3">
                <input
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleAdd()}
                  placeholder="Add an item…"
                  className="flex-1 px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:border-orange-300 transition-colors"
                />
                <input
                  value={newQty}
                  onChange={(e) => setNewQty(e.target.value)}
                  placeholder="Qty"
                  className="w-20 px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:border-orange-300 transition-colors"
                />
                <div className="relative hidden sm:block">
                  <select
                    value={newCat}
                    onChange={(e) => setNewCat(e.target.value)}
                    className="appearance-none h-full pl-3 pr-7 text-sm border border-gray-200 rounded-xl focus:outline-none focus:border-orange-300 transition-colors text-gray-700"
                  >
                    {CATEGORIES_ORDER.map((c) => <option key={c}>{c}</option>)}
                  </select>
                  <ChevronDown size={12} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                </div>
                <button
                  onClick={handleAdd}
                  className="px-4 py-2.5 bg-orange-500 hover:bg-orange-600 text-white rounded-xl transition-colors shrink-0"
                >
                  <Plus size={18} />
                </button>
              </div>
            </div>

            {/* Grouped items */}
            {Object.entries(groupedItems).map(([category, catItems]) => (
              <div key={category} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between bg-gray-50">
                  <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wide">{category}</h3>
                  <span className="text-xs text-gray-400">{catItems.filter((i) => !i.checked).length} left</span>
                </div>

                <div className="divide-y divide-gray-100">
                  {catItems.map((item) => (
                    <div
                      key={item.id}
                      className={`flex items-center gap-3 px-5 py-3.5 transition-colors group ${
                        item.checked ? "bg-gray-50" : "hover:bg-gray-50"
                      }`}
                    >
                      {/* Checkbox */}
                      <button
                        onClick={() => toggle(item.id)}
                        className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-all ${
                          item.checked
                            ? "bg-green-500 border-green-500"
                            : "border-gray-300 hover:border-orange-400"
                        }`}
                      >
                        {item.checked && <Check size={11} className="text-white" strokeWidth={3} />}
                      </button>

                      {/* Name */}
                      <div className="flex-1 min-w-0">
                        <span className={`text-sm font-medium transition-colors ${item.checked ? "text-gray-400 line-through" : "text-gray-800"}`}>
                          {item.name}
                        </span>
                        {item.fromRecipe && (
                          <div className="text-xs text-gray-400 mt-0.5">For: {item.fromRecipe}</div>
                        )}
                      </div>

                      {/* Quantity */}
                      <span className={`text-sm shrink-0 ${item.checked ? "text-gray-400" : "text-gray-600 font-medium"}`}>
                        {item.quantity}
                      </span>

                      {/* Remove */}
                      <button
                        onClick={() => remove(item.id)}
                        className="opacity-0 group-hover:opacity-100 transition-opacity text-gray-300 hover:text-red-400 shrink-0"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            ))}

            {displayItems.length === 0 && (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm py-20 text-center">
                <ShoppingCart size={32} className="mx-auto text-gray-300 mb-3" />
                <p className="text-sm text-gray-500">Your grocery list is empty</p>
              </div>
            )}
          </div>

          {/* RIGHT: sidebar (1/3) */}
          <div className="space-y-4">

            {/* Progress */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <h2 className="text-sm font-bold text-gray-800 mb-3">Shopping progress</h2>
              <div className="flex items-end gap-2 mb-2">
                <span className="text-3xl font-bold text-gray-900">{checkedCount}</span>
                <span className="text-gray-400 text-sm pb-1">/ {items.length} items</span>
              </div>
              <div className="h-2 bg-gray-100 rounded-full overflow-hidden mb-3">
                <div
                  className="h-full bg-green-400 rounded-full transition-all duration-500"
                  style={{ width: `${items.length > 0 ? (checkedCount / items.length) * 100 : 0}%` }}
                />
              </div>
              {checkedCount === items.length && items.length > 0 ? (
                <p className="text-xs text-green-600 font-semibold">🎉 All done! Great shopping.</p>
              ) : (
                <p className="text-xs text-gray-400">{uncheckedCount} items remaining</p>
              )}
            </div>

            {/* Category filter */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <h2 className="text-sm font-bold text-gray-800 mb-3">Filter by aisle</h2>
              <div className="space-y-1">
                <button
                  onClick={() => setActiveCategory(null)}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-sm transition-colors ${
                    activeCategory === null ? "bg-orange-50 text-orange-600 font-semibold" : "hover:bg-gray-50 text-gray-700"
                  }`}
                >
                  <span>All categories</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${activeCategory === null ? "bg-orange-100 text-orange-600" : "bg-gray-100 text-gray-500"}`}>
                    {items.length}
                  </span>
                </button>
                {CATEGORIES_ORDER.map((cat) => {
                  const count = items.filter((i) => i.category === cat).length;
                  if (count === 0) return null;
                  return (
                    <button
                      key={cat}
                      onClick={() => setActiveCategory(cat === activeCategory ? null : cat)}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-sm transition-colors ${
                        activeCategory === cat ? "bg-orange-50 text-orange-600 font-semibold" : "hover:bg-gray-50 text-gray-700"
                      }`}
                    >
                      <span>{cat}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${activeCategory === cat ? "bg-orange-100 text-orange-600" : "bg-gray-100 text-gray-500"}`}>
                        {count}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Recipes sourced from */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <h2 className="text-sm font-bold text-gray-800 mb-3">From your meal plan</h2>
              <div className="space-y-2">
                {Array.from(new Set(items.map((i) => i.fromRecipe).filter(Boolean))).map((recipe) => (
                  <div key={recipe} className="flex items-center gap-2.5 text-sm text-gray-600 px-2 py-1.5 rounded-xl bg-gray-50">
                    <Package size={12} className="text-gray-400 shrink-0" />
                    <span className="truncate">{recipe}</span>
                  </div>
                ))}
              </div>
              <button className="w-full mt-3 text-xs font-semibold text-orange-500 hover:text-orange-600 py-2 border border-orange-200 rounded-xl hover:bg-orange-50 transition-colors flex items-center justify-center gap-1.5">
                <Share2 size={12} /> Share list
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
