import { useState, useMemo } from "react";
import {
  ShoppingCart, Plus, X, Check, Share2, Trash2,
  Search, ChevronDown,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useStore } from "@/lib/store";
import { toast } from "sonner";
import { detectCategories } from "@/lib/categorizeItem";

const STORE_SECTIONS: Record<string, string> = {
  produce: "🥦 Produce",
  dairy: "🧀 Dairy",
  meat: "🥩 Meat & Fish",
  "dry goods": "🌾 Dry Goods",
  "pasta / noodles": "🍝 Pasta / Noodles",
  condiments: "🫙 Condiments",
  bakery: "🍞 Bakery",
  frozen: "🧊 Frozen",
  other: "📦 Other",
};

interface GroceryItem {
  id: string;
  name: string;
  section?: string;
  category?: string;
  quantity?: string;
  checked?: boolean;
  qty?: string;
  recipeSource?: string;
}

const toText = (value: unknown): string | undefined => {
  if (typeof value === "string") return value;
  if (typeof value === "number") return String(value);
  return undefined;
};

const toLegacyDetails = (value: unknown): { qty?: string; section?: string } => {
  if (!value || typeof value !== "object") return {};
  const details = value as { qty?: unknown; section?: unknown; category?: unknown };
  return {
    qty: toText(details.qty),
    section: toText(details.section ?? details.category),
  };
};

function GroceryRow({
  item,
  onToggle,
  onRemove,
  onEditQty,
}: {
  item: GroceryItem;
  onToggle: () => void;
  onRemove: () => void;
  onEditQty: (qty: string) => void;
}) {
  const [editingQty, setEditingQty] = useState(false);
  const [qty, setQty] = useState(item.qty ?? "");

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: -4 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: 20 }}
      className={`flex items-center gap-3 px-4 py-3 group transition-colors rounded-xl ${item.checked ? "opacity-50" : "hover:bg-stone-50"}`}
    >
      {/* Checkbox */}
      <button
        onClick={onToggle}
        className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-all ${
          item.checked
            ? "border-emerald-500 bg-emerald-500"
            : "border-stone-300 hover:border-orange-400"
        }`}
      >
        {item.checked && <Check size={10} className="text-white" strokeWidth={3} />}
      </button>

      {/* Name */}
      <div className="flex-1 min-w-0">
        <p
          className={`text-sm font-medium transition-all ${item.checked ? "line-through text-stone-400" : "text-stone-800"}`}
        >
          {item.name}
        </p>
        {item.recipeSource && !item.checked && (
          <p className="text-[10px] text-stone-400 mt-0.5">for {item.recipeSource}</p>
        )}
      </div>

      {/* Qty */}
      {editingQty ? (
        <input
          autoFocus
          value={qty}
          onChange={(e) => setQty(e.target.value)}
          onBlur={() => { setEditingQty(false); onEditQty(qty); }}
          onKeyDown={(e) => { if (e.key === "Enter") { setEditingQty(false); onEditQty(qty); } }}
          className="w-20 text-xs text-stone-600 border border-orange-300 rounded-lg px-2 py-1 outline-none bg-white"
          placeholder="qty"
        />
      ) : (
        <button
          onClick={() => !item.checked && setEditingQty(true)}
          className="text-xs text-stone-400 hover:text-orange-500 transition-colors min-w-[40px] text-right"
        >
          {item.qty || (item.checked ? "" : "qty")}
        </button>
      )}

      {/* Remove */}
      <button
        onClick={onRemove}
        className="w-7 h-7 rounded-lg flex items-center justify-center text-stone-200 hover:text-red-400 hover:bg-red-50 transition-colors opacity-0 group-hover:opacity-100"
      >
        <X size={13} />
      </button>
    </motion.div>
  );
}

export default function GroceryScreen() {
  const {
    customGroceryItems,
    addCustomGroceryItem,
    removeCustomGroceryItem,
    toggleGroceryItem,
    updateGroceryItem,
    clearCheckedGroceryItems,
  } = useStore();

  const [newItem, setNewItem] = useState("");
  const [newQty, setNewQty] = useState("");
  const [newSection, setNewSection] = useState("other");
  const [search, setSearch] = useState("");
  const [showChecked, setShowChecked] = useState(true);

  const items: GroceryItem[] = (customGroceryItems ?? []).map((item, idx) => {
    const legacy = toLegacyDetails(item.quantity);
    const section = toText(item.section ?? item.category) ?? legacy.section ?? "other";

    return {
      ...item,
      id: item.id ?? `${item.name}-${idx}`,
      section,
      qty: toText(item.qty) ?? toText(item.quantity) ?? legacy.qty,
    };
  });
  const filteredItems = useMemo(() => {
    let list = items;
    if (search) list = list.filter((i) => i.name.toLowerCase().includes(search.toLowerCase()));
    return list;
  }, [items, search]);

  const grouped = useMemo(() => {
    const result: Record<string, GroceryItem[]> = {};
    filteredItems.forEach((item) => {
      const s = toText(item.section ?? item.category) ?? "other";
      if (!result[s]) result[s] = [];
      result[s].push(item);
    });
    return result;
  }, [filteredItems]);

  const checkedCount = items.filter((i) => i.checked).length;
  const totalCount = items.length;

  const handleAdd = () => {
    const itemName = newItem.trim();
    if (!itemName) return;
    const detected = detectCategories(itemName);
    const section = newSection === "other" ? detected.grocerySection : newSection;
    addCustomGroceryItem(itemName, { qty: newQty.trim() || undefined, section });
    setNewItem("");
    setNewQty("");
    setNewSection("other");
  };

  const handleShare = () => {
    const unchecked = items.filter((i) => !i.checked).map((i) => `• ${i.name}${i.qty ? ` (${i.qty})` : ""}`).join("\n");
    if (!unchecked) { toast.info("Nothing left to share!"); return; }
    navigator.clipboard?.writeText(`🛒 Grocery List\n\n${unchecked}`);
    toast.success("Copied to clipboard!");
  };

  const handleClearChecked = () => {
    clearCheckedGroceryItems?.();
    toast.success("Cleared checked items");
  };

  const handleClearAll = () => {
    items.forEach((item) => removeCustomGroceryItem?.(item.id));
    toast.success("Cleared grocery list");
  };

  return (
    <div className="min-h-full" style={{ fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif", background: "#FFFAF5" }}>

      {/* Header */}
      <div
        className="border-b"
        style={{ background: "linear-gradient(135deg,#FFF7ED 0%,#FFFAF5 100%)", borderColor: "rgba(249,115,22,0.12)" }}
      >
        <div className="max-w-3xl mx-auto px-6 py-6" data-tutorial="grocery-header">
          <div className="flex items-start justify-between mb-4">
            <div>
              <p className="text-[10px] font-bold text-orange-400 uppercase tracking-widest mb-1">Shopping</p>
              <h1 className="text-2xl font-bold text-stone-900" style={{ fontFamily: "'Fraunces', Georgia, serif" }}>
                Grocery List
              </h1>
              {totalCount > 0 && (
                <p className="text-xs text-stone-400 mt-1">
                  {checkedCount}/{totalCount} items checked off
                </p>
              )}
            </div>
            <div className="flex items-center gap-2">
              {checkedCount > 0 && (
                <button
                  onClick={handleClearChecked}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white border border-stone-200 text-xs font-semibold text-stone-500 hover:border-red-300 hover:text-red-500 transition-colors"
                >
                  <Trash2 size={13} /> Clear done
                </button>
              )}
              {totalCount > 0 && (
                <button
                  onClick={handleClearAll}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white border border-stone-200 text-xs font-semibold text-stone-500 hover:border-red-300 hover:text-red-500 transition-colors"
                >
                  <Trash2 size={13} /> Clear all
                </button>
              )}
              <button
                onClick={handleShare}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold text-white transition-all hover:opacity-90 active:scale-95"
                style={{ background: "linear-gradient(135deg,#FB923C,#F97316,#EA580C)", boxShadow: "0 4px 16px rgba(249,115,22,0.30)" }}
              >
                <Share2 size={14} /> Share
              </button>
            </div>
          </div>

          {/* Progress bar */}
          {totalCount > 0 && (
            <div>
              <div className="relative h-2 bg-orange-100 rounded-full overflow-hidden">
                <motion.div
                  className="absolute inset-y-0 left-0 rounded-full"
                  style={{ background: "linear-gradient(90deg,#34D399,#10B981)" }}
                  animate={{ width: `${(checkedCount / totalCount) * 100}%` }}
                  transition={{ type: "spring", stiffness: 60 }}
                />
              </div>
              <p className="text-[10px] text-stone-400 mt-1.5 font-medium">
                {totalCount - checkedCount} item{totalCount - checkedCount !== 1 ? "s" : ""} remaining
              </p>
            </div>
          )}
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-6 py-5 space-y-5">

        {/* Add item form */}
        <div
          className="rounded-2xl border p-4"
          style={{ background: "#fff", borderColor: "rgba(0,0,0,0.07)", boxShadow: "0 2px 12px rgba(28,25,23,0.04)" }}
        >
          <p className="text-xs font-bold text-stone-500 uppercase tracking-wider mb-3">Add item</p>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <ShoppingCart size={13} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-300" />
              <input
                value={newItem}
                onChange={(e) => {
                  const value = e.target.value;
                  setNewItem(value);
                  if (value.trim()) setNewSection(detectCategories(value).grocerySection);
                }}
                onKeyDown={(e) => e.key === "Enter" && handleAdd()}
                placeholder="e.g. Chicken breast, Lemons…"
                className="w-full pl-9 pr-4 py-2.5 rounded-xl border text-sm text-stone-700 placeholder:text-stone-300 outline-none focus:border-orange-300 transition-colors"
                style={{ borderColor: "rgba(0,0,0,0.09)" }}
              />
            </div>
            <input
              value={newQty}
              onChange={(e) => setNewQty(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAdd()}
              placeholder="Qty"
              className="w-20 px-3 py-2.5 rounded-xl border text-sm text-stone-700 placeholder:text-stone-300 outline-none focus:border-orange-300 transition-colors"
              style={{ borderColor: "rgba(0,0,0,0.09)" }}
            />
            <div className="relative">
              <select
                value={newSection}
                onChange={(e) => setNewSection(e.target.value)}
                className="appearance-none pl-3 pr-8 py-2.5 rounded-xl border text-xs font-medium text-stone-600 outline-none cursor-pointer h-full"
                style={{ background: "#fff", borderColor: "rgba(0,0,0,0.09)" }}
              >
                {Object.entries(STORE_SECTIONS).map(([val, label]) => (
                  <option key={val} value={val}>{label}</option>
                ))}
              </select>
              <ChevronDown size={11} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-stone-400 pointer-events-none" />
            </div>
            <button
              onClick={handleAdd}
              disabled={!newItem.trim()}
              className="px-4 py-2.5 rounded-xl text-sm font-bold text-white disabled:opacity-40 transition-all hover:opacity-90 active:scale-95"
              style={{ background: "linear-gradient(135deg,#FB923C,#F97316)", boxShadow: "0 2px 8px rgba(249,115,22,0.25)" }}
            >
              <Plus size={16} />
            </button>
          </div>
        </div>

        {/* Search */}
        {items.length > 5 && (
          <div className="relative">
            <Search size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-300" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Filter list…"
              className="w-full pl-10 pr-4 py-3 rounded-xl border text-sm text-stone-700 placeholder:text-stone-300 outline-none focus:border-orange-300 transition-colors"
              style={{ background: "#fff", borderColor: "rgba(0,0,0,0.09)" }}
            />
            {search && (
              <button onClick={() => setSearch("")} className="absolute right-4 top-1/2 -translate-y-1/2 text-stone-300 hover:text-stone-500">
                <X size={13} />
              </button>
            )}
          </div>
        )}

        {/* Items */}
        {items.length === 0 ? (
          <div
            className="rounded-2xl border p-12 text-center"
            style={{ background: "#fff", borderColor: "rgba(0,0,0,0.07)" }}
          >
            <div className="w-16 h-16 rounded-2xl bg-orange-50 flex items-center justify-center text-3xl mx-auto mb-4">🛒</div>
            <p className="font-bold text-stone-700" style={{ fontFamily: "'Fraunces', Georgia, serif" }}>
              List is empty
            </p>
            <p className="text-sm text-stone-400 mt-1">
              Add items above, or generate a list from your meal plan
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {Object.entries(grouped).map(([section, sectionItems]) => {
              const unchecked = sectionItems.filter((i) => !i.checked);
              const checked = sectionItems.filter((i) => i.checked);
              const toShow = showChecked ? sectionItems : unchecked;
              if (toShow.length === 0) return null;

              return (
                <div
                  key={section}
                  className="rounded-2xl border overflow-hidden"
                  style={{ background: "#fff", borderColor: "rgba(0,0,0,0.07)", boxShadow: "0 2px 8px rgba(28,25,23,0.04)" }}
                >
                  {/* Section header */}
                  <div
                    className="px-4 py-2.5 flex items-center justify-between"
                    style={{ background: "rgba(0,0,0,0.02)", borderBottom: "1px solid rgba(0,0,0,0.05)" }}
                  >
                    <p className="text-xs font-bold text-stone-600">
                      {STORE_SECTIONS[section] ?? `📦 ${section}`}
                    </p>
                    <span className="text-[10px] text-stone-400 font-semibold">
                      {unchecked.length}/{sectionItems.length}
                    </span>
                  </div>

                  <div className="py-1">
                    <AnimatePresence>
                      {toShow.map((item) => (
                        <GroceryRow
                          key={item.id}
                          item={item}
                          onToggle={() => toggleGroceryItem?.(item.id)}
                          onRemove={() => removeCustomGroceryItem?.(item.id)}
                          onEditQty={(qty) => updateGroceryItem?.(item.id, { qty })}
                        />
                      ))}
                    </AnimatePresence>
                  </div>
                </div>
              );
            })}

            {/* Toggle checked */}
            {checkedCount > 0 && (
              <button
                onClick={() => setShowChecked((v) => !v)}
                className="w-full py-3 text-xs font-semibold text-stone-400 hover:text-stone-600 transition-colors flex items-center justify-center gap-1.5"
              >
                {showChecked ? <><X size={11} /> Hide</> : <><Check size={11} /> Show</>} {checkedCount} checked item{checkedCount !== 1 ? "s" : ""}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
