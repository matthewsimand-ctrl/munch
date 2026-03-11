import { useState, useMemo } from "react";
import {
  ArrowLeft, Search, CheckCircle2, Circle,
  Trash2, Plus, Camera, Upload, Lock, ChevronDown, X
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useStore } from "@/lib/store";
import { toast } from "sonner";
import { detectCategories } from "@/lib/categorizeItem";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { getPremiumOverride } from "@/lib/premium";

const CATEGORIES = ["All", "Produce", "Dairy", "Meat & Fish", "Dry Goods", "Pasta / Noodles", "Condiments", "Bakery", "Frozen", "Other"];
const CATEGORY_ICONS: Record<string, string> = {
  Produce: "🥦", Dairy: "🧀", "Meat & Fish": "🥩", "Dry Goods": "🌾",
  "Pasta / Noodles": "🍝", Condiments: "🫙", Bakery: "🍞", Frozen: "🧊", Other: "📦", All: "🛒",
};

function normalizeCategory(cat?: string) {
  if (cat === "Meat") return "Meat & Fish";
  if (!cat) return "Other";
  if (!CATEGORIES.includes(cat) && cat !== "All") return "Other";
  return cat;
}

interface PantryItem {
  key: string;
  id: string;
  name: string;
  category?: string;
  quantity?: string;
  addedAt?: number;
}

function PantryItemRow({
  item,
  onRemove,
  onEdit,
}: {
  item: PantryItem;
  onRemove: () => void;
  onEdit: (field: "quantity", value: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [qty, setQty] = useState(item.quantity ?? "");

  const cat = normalizeCategory(item.category);
  const catIcon = CATEGORY_ICONS[cat] ?? "📦";

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: -4 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: 16 }}
      className="flex items-center gap-3 px-4 py-3 rounded-xl group hover:bg-orange-50/50 transition-colors"
    >
      <span className="text-xl w-8 text-center">{catIcon}</span>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-stone-800 truncate">{item.name}</p>
        {editing ? (
          <input
            autoFocus
            value={qty}
            onChange={(e) => setQty(e.target.value)}
            onBlur={() => { setEditing(false); onEdit("quantity", qty); }}
            onKeyDown={(e) => { if (e.key === "Enter") { setEditing(false); onEdit("quantity", qty); } }}
            className="text-xs text-stone-500 outline-none border-b border-orange-300 bg-transparent w-20 mt-0.5"
            placeholder="qty"
          />
        ) : (
          <button
            onClick={() => setEditing(true)}
            className="text-xs text-stone-400 hover:text-orange-500 transition-colors mt-0.5 text-left"
          >
            {item.quantity || "tap to add quantity"}
          </button>
        )}
      </div>
      <span
        className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
        style={{ background: "rgba(249,115,22,0.08)", color: "#C2410C" }}
      >
        {cat}
      </span>
      <button
        onClick={onRemove}
        className="w-7 h-7 rounded-lg flex items-center justify-center text-stone-200 hover:text-red-400 hover:bg-red-50 transition-colors opacity-0 group-hover:opacity-100"
      >
        <Trash2 size={13} />
      </button>
    </motion.div>
  );
}

export default function PantryScreen() {
  const { pantryList, addPantryItem, removePantryItem, updatePantryItem } = useStore();
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState("All");
  const [newItem, setNewItem] = useState("");
  const [newCategory, setNewCategory] = useState("Other");
  const [newQty, setNewQty] = useState("");
  const [scanDialogOpen, setScanDialogOpen] = useState(false);
  const isPremium = getPremiumOverride();

  const filtered = useMemo(() => {
    let list: PantryItem[] = (pantryList ?? []).map((item, idx) => ({
      ...item,
      key: `${item.id ?? item.name}-${idx}`,
      id: item.id ?? item.name,
    }));
    if (search) list = list.filter((i) => i.name.toLowerCase().includes(search.toLowerCase()));
    if (activeCategory !== "All") list = list.filter((i) => normalizeCategory(i.category) === activeCategory);
    return list;
  }, [pantryList, search, activeCategory]);

  const groupedCounts = useMemo(() => {
    const counts: Record<string, number> = { All: pantryList?.length ?? 0 };
    (pantryList ?? []).forEach((i) => {
      const c = normalizeCategory(i.category);
      counts[c] = (counts[c] || 0) + 1;
    });
    return counts;
  }, [pantryList]);

  const handleAdd = () => {
    const itemName = newItem.trim();
    if (!itemName) return;
    const detected = detectCategories(itemName);
    let category = newCategory === "Other" ? detected.pantryCategory : newCategory;
    category = normalizeCategory(category);
    addPantryItem({ name: itemName, category, quantity: newQty.trim() || undefined });
    toast.success(`Added ${itemName} to pantry`);
    setNewItem("");
    setNewQty("");
    setNewCategory("Other");
  };

  const handleRemove = (id: string, name: string) => {
    removePantryItem(id);
    toast.success(`Removed ${name}`);
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
        <div className="relative max-w-4xl mx-auto px-6 py-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              <p className="text-[10px] font-bold text-orange-400 uppercase tracking-widest mb-1">Your kitchen</p>
              <h1 className="text-2xl font-bold text-stone-900" style={{ fontFamily: "'Fraunces', Georgia, serif" }}>
                Pantry
              </h1>
              <p className="text-xs text-stone-400 mt-1">{pantryList?.length ?? 0} items stocked</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                title="Scan fridge"
                onClick={() => {
                  if (!isPremium) {
                    toast.info("Scan Fridge is a Premium feature. Coming soon!");
                    return;
                  }
                  setScanDialogOpen(true);
                }}
                className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white border border-stone-200 text-sm font-semibold text-stone-500 hover:border-orange-300 hover:text-orange-500 transition-colors"
              >
                {!isPremium && <Lock size={12} className="text-stone-400" />}
                <Camera size={14} /> Scan Fridge
              </button>
            </div>
          </div>

          {/* Stat row */}
          <div className="flex items-center gap-4">
            {[
              { label: "In stock", value: pantryList?.length ?? 0, color: "#10B981" },
              { label: "Categories", value: Object.keys(groupedCounts).length - 1, color: "#F97316" },
            ].map(({ label, value, color }) => (
              <div key={label} className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full" style={{ background: color }} />
                <span className="text-xs font-semibold text-stone-500">{value} {label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <Dialog open={scanDialogOpen} onOpenChange={setScanDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Scan your fridge</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <button
              onClick={() => {
                const liveInput = document.createElement("input");
                liveInput.type = "file";
                liveInput.accept = "image/*";
                liveInput.setAttribute("capture", "environment");
                liveInput.click();
                setScanDialogOpen(false);
                toast.info("Fridge scanning is coming soon — live photo support is ready.");
              }}
              className="w-full flex items-center justify-center gap-2 text-sm font-semibold border border-orange-200 bg-orange-50 text-orange-600 rounded-xl py-2.5 hover:bg-orange-100"
            >
              <Camera size={14} /> Take live photo
            </button>
            <button
              onClick={() => {
                const uploadInput = document.createElement("input");
                uploadInput.type = "file";
                uploadInput.accept = "image/*";
                uploadInput.click();
                setScanDialogOpen(false);
                toast.info("Fridge scanning is coming soon — upload support is ready.");
              }}
              className="w-full flex items-center justify-center gap-2 text-sm font-semibold border border-stone-200 bg-white text-stone-700 rounded-xl py-2.5 hover:border-orange-300 hover:text-orange-600"
            >
              <Upload size={14} /> Upload photo
            </button>
          </div>
        </DialogContent>
      </Dialog>

      <div className="max-w-4xl mx-auto px-6 py-5 space-y-5">

        {/* Add form */}
        <motion.div
          className="rounded-2xl border p-5"
          style={{ background: "#fff", borderColor: "rgba(249,115,22,0.20)", boxShadow: "0 4px 20px rgba(249,115,22,0.08)" }}
        >
          <p className="text-sm font-bold text-stone-800 mb-3">Add pantry item</p>
          <div className="flex flex-col sm:flex-row gap-3">
            <input
              autoFocus
              value={newItem}
              onChange={(e) => {
                const value = e.target.value;
                setNewItem(value);
                if (value.trim()) setNewCategory(detectCategories(value).pantryCategory);
              }}
              onKeyDown={(e) => e.key === "Enter" && handleAdd()}
              placeholder="e.g. Olive oil, Garlic, Pasta…"
              className="flex-1 px-4 py-2.5 rounded-xl border text-sm text-stone-700 placeholder:text-stone-300 outline-none focus:border-orange-300 transition-colors"
              style={{ borderColor: "rgba(0,0,0,0.09)" }}
            />
            <input
              value={newQty}
              onChange={(e) => setNewQty(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAdd()}
              placeholder="Quantity (optional)"
              className="w-40 px-4 py-2.5 rounded-xl border text-sm text-stone-700 placeholder:text-stone-300 outline-none focus:border-orange-300 transition-colors"
              style={{ borderColor: "rgba(0,0,0,0.09)" }}
            />
            <div className="relative">
              <select
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value)}
                className="appearance-none pl-3 pr-8 py-2.5 rounded-xl border text-sm font-medium text-stone-600 outline-none cursor-pointer"
                style={{ background: "#fff", borderColor: "rgba(0,0,0,0.09)" }}
              >
                {CATEGORIES.filter((c) => c !== "All").map((c) => <option key={c}>{c}</option>)}
              </select>
              <ChevronDown size={12} className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 pointer-events-none" />
            </div>
            <button
              onClick={handleAdd}
              disabled={!newItem.trim()}
              className="w-10 h-10 rounded-xl text-lg font-bold text-white disabled:opacity-40 transition-all hover:opacity-90 active:scale-95"
              style={{ background: "linear-gradient(135deg,#FB923C,#F97316)", boxShadow: "0 2px 8px rgba(249,115,22,0.25)" }}
            >
              +
            </button>
          </div>
        </motion.div>

        {/* Search */}
        <div className="relative">
          <Search size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-300" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search your pantry…"
            className="w-full pl-10 pr-4 py-3 rounded-xl border text-sm text-stone-700 placeholder:text-stone-300 outline-none focus:border-orange-300 transition-colors"
            style={{ background: "#fff", borderColor: "rgba(0,0,0,0.09)" }}
          />
          {search && (
            <button onClick={() => setSearch("")} className="absolute right-4 top-1/2 -translate-y-1/2 text-stone-300 hover:text-stone-500">
              <X size={13} />
            </button>
          )}
        </div>

        {/* Category tabs */}
        <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
          {CATEGORIES.map((c) => (
            <button
              key={c}
              onClick={() => setActiveCategory(c)}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all"
              style={
                activeCategory === c
                  ? { background: "linear-gradient(135deg,#FB923C,#F97316)", color: "#fff", boxShadow: "0 2px 8px rgba(249,115,22,0.25)" }
                  : { background: "#fff", color: "#57534E", border: "1px solid rgba(0,0,0,0.08)" }
              }
            >
              <span>{CATEGORY_ICONS[c]}</span>
              {c}
              {groupedCounts[c] > 0 && (
                <span
                  className="px-1.5 py-0.5 rounded-full text-[9px] font-bold"
                  style={{ background: activeCategory === c ? "rgba(255,255,255,0.25)" : "rgba(249,115,22,0.10)", color: activeCategory === c ? "#fff" : "#EA580C" }}
                >
                  {groupedCounts[c]}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Items list */}
        <div
          className="rounded-2xl border overflow-hidden"
          style={{ background: "#fff", borderColor: "rgba(0,0,0,0.07)", boxShadow: "0 2px 12px rgba(28,25,23,0.05)" }}
        >
          {filtered.length === 0 ? (
            <div className="py-16 text-center">
              {(pantryList?.length ?? 0) === 0 ? (
                <div className="flex flex-col items-center gap-3">
                  <div className="w-16 h-16 rounded-2xl bg-orange-50 flex items-center justify-center text-3xl">📦</div>
                  <div>
                    <p className="font-bold text-stone-700" style={{ fontFamily: "'Fraunces', Georgia, serif" }}>
                      Your pantry is empty
                    </p>
                    <p className="text-xs text-stone-400 mt-1">Add items to get ingredient match suggestions</p>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-stone-400">No items match your search</p>
              )}
            </div>
          ) : (
            <div className="divide-y divide-black/5">
              <AnimatePresence>
                {filtered.map((item) => (
                  <PantryItemRow
                    key={item.key}
                    item={item}
                    onRemove={() => handleRemove(item.id, item.name)}
                    onEdit={(field, value) => updatePantryItem?.(item.id, { [field]: value })}
                  />
                ))}
              </AnimatePresence>
            </div>
          )}
        </div>

        {/* Tips */}
        {(pantryList?.length ?? 0) > 0 && (
          <div
            className="rounded-2xl border p-4 flex items-start gap-3"
            style={{ background: "linear-gradient(135deg,#FFF7ED,#FFF3E4)", borderColor: "rgba(249,115,22,0.15)" }}
          >
            <div className="w-8 h-8 rounded-xl bg-orange-100 flex items-center justify-center shrink-0">
              <CheckCircle2 size={15} className="text-orange-500" />
            </div>
            <div>
              <p className="text-xs font-bold text-orange-800 mb-0.5">Pantry tip</p>
              <p className="text-xs text-orange-700/70">
                Recipes on the Discover page now show how many ingredients you already have. Look for the green match badge!
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
