import { useState } from "react";
import { Package, Plus, Search, AlertTriangle, CheckCircle, X, Trash2, ChevronDown } from "lucide-react";

// ── Types & mock data ─────────────────────────────────────────────────────────
type Status = "good" | "low" | "expired";

interface PantryItem {
  id: number;
  name: string;
  quantity: string;
  category: string;
  status: Status;
  expiry?: string;
}

const INITIAL_ITEMS: PantryItem[] = [
  { id: 1, name: "Olive Oil", quantity: "750ml", category: "Oils & Condiments", status: "good", expiry: "Dec 2025" },
  { id: 2, name: "Arborio Rice", quantity: "200g", category: "Grains & Pasta", status: "low", expiry: "Mar 2026" },
  { id: 3, name: "Canned Tomatoes", quantity: "3 cans", category: "Canned Goods", status: "good" },
  { id: 4, name: "Garlic", quantity: "1 bulb", category: "Fresh Produce", status: "low" },
  { id: 5, name: "Cumin", quantity: "Full", category: "Spices", status: "good", expiry: "Jan 2026" },
  { id: 6, name: "Coconut Milk", quantity: "400ml", category: "Canned Goods", status: "good" },
  { id: 7, name: "Pasta", quantity: "500g", category: "Grains & Pasta", status: "good" },
  { id: 8, name: "Chicken Stock", quantity: "Expired", category: "Canned Goods", status: "expired", expiry: "Nov 2024" },
  { id: 9, name: "Soy Sauce", quantity: "Nearly empty", category: "Oils & Condiments", status: "low" },
  { id: 10, name: "Paprika", quantity: "Full", category: "Spices", status: "good" },
  { id: 11, name: "Lentils", quantity: "400g", category: "Grains & Pasta", status: "good" },
  { id: 12, name: "Honey", quantity: "250g", category: "Oils & Condiments", status: "good" },
];

const CATEGORIES = ["All", "Grains & Pasta", "Canned Goods", "Oils & Condiments", "Spices", "Fresh Produce"];

const STATUS_CONFIG: Record<Status, { label: string; bg: string; text: string; icon: typeof CheckCircle }> = {
  good: { label: "In stock", bg: "bg-green-50", text: "text-green-600", icon: CheckCircle },
  low: { label: "Running low", bg: "bg-amber-50", text: "text-amber-600", icon: AlertTriangle },
  expired: { label: "Expired", bg: "bg-red-50", text: "text-red-500", icon: X },
};

export default function Pantry() {
  const [items, setItems] = useState<PantryItem[]>(INITIAL_ITEMS);
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState("All");
  const [showAddForm, setShowAddForm] = useState(false);
  const [newItem, setNewItem] = useState({ name: "", quantity: "", category: "Grains & Pasta" });

  const filtered = items
    .filter((i) => activeCategory === "All" || i.category === activeCategory)
    .filter((i) => i.name.toLowerCase().includes(search.toLowerCase()));

  const goodCount = items.filter((i) => i.status === "good").length;
  const lowCount = items.filter((i) => i.status === "low").length;
  const expiredCount = items.filter((i) => i.status === "expired").length;

  const handleAdd = () => {
    if (!newItem.name.trim()) return;
    const item: PantryItem = {
      id: Date.now(),
      name: newItem.name,
      quantity: newItem.quantity || "—",
      category: newItem.category,
      status: "good",
    };
    setItems((prev) => [item, ...prev]);
    setNewItem({ name: "", quantity: "", category: "Grains & Pasta" });
    setShowAddForm(false);
  };

  const handleRemove = (id: number) => {
    setItems((prev) => prev.filter((i) => i.id !== id));
  };

  return (
    <div className="min-h-full bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 px-6 py-5">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Pantry</h1>
            <p className="text-sm text-gray-500 mt-0.5">{items.length} items tracked</p>
          </div>
          <button
            onClick={() => setShowAddForm((v) => !v)}
            className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition-colors shadow-sm"
          >
            <Plus size={16} /> Add Item
          </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-6">
        {/* ── Two-column layout on desktop ─────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* LEFT: item list (2/3) */}
          <div className="lg:col-span-2 space-y-4">

            {/* Add item form */}
            {showAddForm && (
              <div className="bg-white rounded-2xl border border-orange-200 shadow-sm p-5">
                <h3 className="text-sm font-bold text-gray-800 mb-3 flex items-center gap-2">
                  <Plus size={15} className="text-orange-500" /> Add new item
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <input
                    value={newItem.name}
                    onChange={(e) => setNewItem((p) => ({ ...p, name: e.target.value }))}
                    placeholder="Item name"
                    className="col-span-1 px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:border-orange-300 transition-colors"
                  />
                  <input
                    value={newItem.quantity}
                    onChange={(e) => setNewItem((p) => ({ ...p, quantity: e.target.value }))}
                    placeholder="Quantity (e.g. 500g)"
                    className="col-span-1 px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:border-orange-300 transition-colors"
                  />
                  <div className="relative">
                    <select
                      value={newItem.category}
                      onChange={(e) => setNewItem((p) => ({ ...p, category: e.target.value }))}
                      className="w-full appearance-none px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:border-orange-300 transition-colors pr-8"
                    >
                      {CATEGORIES.filter((c) => c !== "All").map((c) => (
                        <option key={c}>{c}</option>
                      ))}
                    </select>
                    <ChevronDown size={13} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                  </div>
                </div>
                <div className="flex gap-2 mt-3">
                  <button
                    onClick={handleAdd}
                    className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white text-sm font-semibold rounded-xl transition-colors"
                  >
                    Add to Pantry
                  </button>
                  <button
                    onClick={() => setShowAddForm(false)}
                    className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-600 text-sm font-semibold rounded-xl transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {/* Search */}
            <div className="relative">
              <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search pantry…"
                className="w-full pl-10 pr-4 py-3 text-sm bg-white border border-gray-100 rounded-xl shadow-sm focus:outline-none focus:border-orange-300 transition-all"
              />
            </div>

            {/* Category tabs */}
            <div className="flex gap-2 overflow-x-auto scrollbar-hide">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  className={`shrink-0 text-xs font-semibold px-3.5 py-1.5 rounded-full border transition-all ${
                    activeCategory === cat
                      ? "bg-orange-500 text-white border-orange-500"
                      : "bg-white text-gray-600 border-gray-200 hover:border-gray-300"
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            {/* Items list */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm divide-y divide-gray-100 overflow-hidden">
              {filtered.length === 0 ? (
                <div className="py-16 text-center">
                  <Package size={32} className="mx-auto text-gray-300 mb-3" />
                  <p className="text-sm text-gray-500">No items found</p>
                </div>
              ) : (
                filtered.map((item) => {
                  const cfg = STATUS_CONFIG[item.status];
                  const Icon = cfg.icon;
                  return (
                    <div key={item.id} className="flex items-center gap-4 px-5 py-3.5 hover:bg-gray-50 transition-colors group">
                      {/* Status indicator */}
                      <div className={`w-8 h-8 rounded-xl ${cfg.bg} flex items-center justify-center shrink-0`}>
                        <Icon size={14} className={cfg.text} />
                      </div>

                      {/* Name + category */}
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-semibold text-gray-800">{item.name}</div>
                        <div className="text-xs text-gray-400">{item.category}</div>
                      </div>

                      {/* Quantity */}
                      <div className="text-sm text-gray-600 font-medium shrink-0 hidden sm:block">
                        {item.quantity}
                      </div>

                      {/* Status badge */}
                      <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${cfg.bg} ${cfg.text} shrink-0 hidden md:block`}>
                        {cfg.label}
                      </span>

                      {/* Expiry */}
                      {item.expiry && (
                        <span className="text-xs text-gray-400 shrink-0 hidden lg:block">
                          {item.expiry}
                        </span>
                      )}

                      {/* Remove */}
                      <button
                        onClick={() => handleRemove(item.id)}
                        className="opacity-0 group-hover:opacity-100 transition-opacity text-gray-300 hover:text-red-400 shrink-0"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* RIGHT: summary panel (1/3) */}
          <div className="space-y-4">

            {/* Status summary */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <h2 className="text-sm font-bold text-gray-800 mb-4">Pantry health</h2>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-green-400" />
                    <span className="text-sm text-gray-600">In stock</span>
                  </div>
                  <span className="text-sm font-bold text-gray-800">{goodCount}</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-amber-400" />
                    <span className="text-sm text-gray-600">Running low</span>
                  </div>
                  <span className="text-sm font-bold text-amber-600">{lowCount}</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-red-400" />
                    <span className="text-sm text-gray-600">Expired</span>
                  </div>
                  <span className="text-sm font-bold text-red-500">{expiredCount}</span>
                </div>

                {/* Bar */}
                <div className="mt-3 h-2 bg-gray-100 rounded-full overflow-hidden flex">
                  <div className="h-full bg-green-400 transition-all" style={{ width: `${(goodCount / items.length) * 100}%` }} />
                  <div className="h-full bg-amber-400 transition-all" style={{ width: `${(lowCount / items.length) * 100}%` }} />
                  <div className="h-full bg-red-400 transition-all" style={{ width: `${(expiredCount / items.length) * 100}%` }} />
                </div>
              </div>
            </div>

            {/* Needs attention */}
            {(lowCount > 0 || expiredCount > 0) && (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                <h2 className="text-sm font-bold text-gray-800 mb-3">Needs attention</h2>
                <div className="space-y-2">
                  {items
                    .filter((i) => i.status === "expired" || i.status === "low")
                    .map((item) => {
                      const cfg = STATUS_CONFIG[item.status];
                      const Icon = cfg.icon;
                      return (
                        <div key={item.id} className={`flex items-center gap-2.5 px-3 py-2 rounded-xl ${cfg.bg}`}>
                          <Icon size={13} className={cfg.text} />
                          <div className="min-w-0 flex-1">
                            <div className="text-xs font-semibold text-gray-800 truncate">{item.name}</div>
                            <div className={`text-xs ${cfg.text}`}>{cfg.label}</div>
                          </div>
                        </div>
                      );
                    })}
                </div>
                <button className="w-full mt-3 text-xs font-semibold text-orange-500 hover:text-orange-600 py-2 border border-orange-200 rounded-xl hover:bg-orange-50 transition-colors">
                  Add all to grocery list →
                </button>
              </div>
            )}

            {/* Categories breakdown */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <h2 className="text-sm font-bold text-gray-800 mb-3">By category</h2>
              <div className="space-y-2">
                {CATEGORIES.filter((c) => c !== "All").map((cat) => {
                  const count = items.filter((i) => i.category === cat).length;
                  if (count === 0) return null;
                  return (
                    <button
                      key={cat}
                      onClick={() => setActiveCategory(cat)}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-sm transition-colors ${
                        activeCategory === cat ? "bg-orange-50 text-orange-600" : "hover:bg-gray-50 text-gray-700"
                      }`}
                    >
                      <span className="font-medium">{cat}</span>
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${activeCategory === cat ? "bg-orange-100 text-orange-600" : "bg-gray-100 text-gray-500"}`}>
                        {count}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
