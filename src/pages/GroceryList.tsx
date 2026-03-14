import { useState, useMemo, useEffect } from "react";
import {
  ShoppingCart, Plus, X, Check, FileText, Trash2,
  Search, ChevronDown, Sparkles, MapPin, Minus, Upload, Pencil,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { getAiDisabledMessage, isAiAgentCallsDisabledError } from "@/lib/ai";
import { useStore } from "@/lib/store";
import { invokeAppFunction } from "@/lib/functionClient";
import { toast } from "sonner";
import { detectCategories } from "@/lib/categorizeItem";
import { adjustQuantityString, canDecreaseQuantity, parseIngredientLine, suggestQuantityForItem } from "@/lib/ingredientText";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { getPantryImage } from "@/lib/pantryImages";
import { useKitchenGroceryList } from "@/hooks/useKitchenGroceryList";

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

const STORE_SECTION_ORDER = [
  "produce",
  "meat",
  "dairy",
  "bakery",
  "dry goods",
  "pasta / noodles",
  "frozen",
  "condiments",
  "other",
] as const;

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
  onAdjustQty,
  onEditItem,
}: {
  item: GroceryItem;
  onToggle: () => void;
  onRemove: () => void;
  onEditQty: (qty: string) => void;
  onAdjustQty: (delta: number) => void;
  onEditItem: (updates: { name: string; qty: string; section: string }) => void;
}) {
  const [editingQty, setEditingQty] = useState(false);
  const [editingItem, setEditingItem] = useState(false);
  const [qty, setQty] = useState(item.quantity || item.qty || "");
  const [draftName, setDraftName] = useState(item.name);
  const [draftSection, setDraftSection] = useState((item.section || item.category || "other").toLowerCase());
  const suggestedQty = suggestQuantityForItem(item.name);
  const normalizedCategory = item.category || item.section || "Other";
  const itemImage = getPantryImage(item.name, normalizedCategory);
  const displayQty = item.quantity || item.qty || (item.checked ? "" : suggestedQty);
  const showDecrease = !item.checked && canDecreaseQuantity(displayQty || suggestedQty);

  useEffect(() => {
    setQty(item.quantity || item.qty || "");
    setDraftName(item.name);
    setDraftSection((item.section || item.category || "other").toLowerCase());
  }, [item.category, item.name, item.qty, item.quantity, item.section]);

  const handleSaveItem = () => {
    const nextName = draftName.trim();
    if (!nextName) {
      setDraftName(item.name);
      setEditingItem(false);
      return;
    }

    onEditItem({
      name: nextName,
      qty: qty.trim(),
      section: draftSection,
    });
    setEditingItem(false);
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: -4 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: 20 }}
      className={`flex items-center gap-3 px-4 py-3 group transition-colors rounded-xl ${item.checked ? "opacity-50" : "hover:bg-stone-50"}`}
    >
      <img
        src={itemImage.src}
        alt={itemImage.alt}
        className="w-10 h-10 rounded-xl object-cover shrink-0 border border-stone-200 bg-white"
      />

      {/* Checkbox */}
      <button
        onClick={onToggle}
        className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-all ${item.checked
          ? "border-emerald-500 bg-emerald-500"
          : "border-stone-300 hover:border-orange-400"
          }`}
      >
        {item.checked && <Check size={10} className="text-white" strokeWidth={3} />}
      </button>

      {/* Name */}
      <div className="flex-1 min-w-0">
        {editingItem ? (
          <div className="space-y-2">
            <input
              autoFocus
              value={draftName}
              onChange={(e) => setDraftName(e.target.value)}
              className="w-full rounded-lg border border-orange-300 bg-white px-2.5 py-1.5 text-sm text-stone-700 outline-none"
              placeholder="Item name"
            />
            <div className="flex items-center gap-2">
              <div className="relative">
                <select
                  value={draftSection}
                  onChange={(e) => setDraftSection(e.target.value)}
                  className="appearance-none rounded-lg border border-orange-200 bg-white pl-2.5 pr-7 py-1.5 text-xs font-semibold text-stone-600 outline-none"
                >
                  {STORE_SECTION_ORDER.map((value) => (
                    <option key={value} value={value}>{STORE_SECTIONS[value]}</option>
                  ))}
                </select>
                <ChevronDown size={11} className="absolute right-2 top-1/2 -translate-y-1/2 text-stone-400 pointer-events-none" />
              </div>
              <button
                onClick={handleSaveItem}
                className="h-7 w-7 rounded-lg bg-orange-500 text-white flex items-center justify-center hover:bg-orange-600 transition-colors"
                aria-label={`Save changes for ${item.name}`}
              >
                <Check size={13} />
              </button>
              <button
                onClick={() => {
                  setDraftName(item.name);
                  setDraftSection((item.section || item.category || "other").toLowerCase());
                  setQty(item.quantity || item.qty || "");
                  setEditingItem(false);
                }}
                className="h-7 w-7 rounded-lg border border-stone-200 text-stone-400 flex items-center justify-center hover:text-stone-600 transition-colors"
                aria-label={`Cancel editing ${item.name}`}
              >
                <X size={13} />
              </button>
            </div>
          </div>
        ) : (
          <>
            <p
              className={`text-sm font-medium transition-all ${item.checked ? "line-through text-stone-400" : "text-stone-800"}`}
            >
              {item.name}
            </p>
            <div className="flex items-center gap-2 mt-0.5">
              <p className="text-[10px] text-stone-400">
                {STORE_SECTIONS[(item.section || item.category || "other").toLowerCase()] ?? `📦 ${item.section || item.category || "Other"}`}
              </p>
              {item.recipeSource && !item.checked && (
                <p className="text-[10px] text-stone-400">for {item.recipeSource}</p>
              )}
            </div>
          </>
        )}
      </div>

      {/* Qty */}
      <div className="flex items-center gap-1">
        {showDecrease && (
          <button
            onClick={() => onAdjustQty(-1)}
            className="w-6 h-6 rounded-full border border-stone-200 bg-white text-stone-400 hover:border-orange-300 hover:text-orange-500 transition-colors flex items-center justify-center"
            aria-label={`Decrease quantity for ${item.name}`}
          >
            <Minus size={10} />
          </button>
        )}
        {editingQty ? (
          <input
            autoFocus
            value={qty}
            onChange={(e) => setQty(e.target.value)}
            onBlur={() => { setEditingQty(false); onEditQty(qty); }}
            onKeyDown={(e) => { if (e.key === "Enter") { setEditingQty(false); onEditQty(qty); } }}
            className="w-24 text-xs text-stone-600 border border-orange-300 rounded-lg px-2 py-1 outline-none bg-white"
            placeholder={suggestedQty}
          />
        ) : (
          <button
            onClick={() => !item.checked && setEditingQty(true)}
            className="text-[11px] font-semibold text-stone-400 bg-stone-100/30 hover:bg-orange-50 hover:text-orange-500 px-2 py-0.5 rounded-lg border border-transparent hover:border-orange-100 transition-all flex items-center min-h-[20px]"
          >
            <span>{displayQty}</span>
          </button>
        )}
        {!item.checked && (
          <button
            onClick={() => onAdjustQty(1)}
            className="w-6 h-6 rounded-full border border-stone-200 bg-white text-stone-400 hover:border-orange-300 hover:text-orange-500 transition-colors flex items-center justify-center"
            aria-label={`Increase quantity for ${item.name}`}
          >
            <Plus size={10} />
          </button>
        )}
      </div>

      {/* Remove */}
      <div className="flex items-center gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
        {!item.checked && !editingItem && (
          <button
            onClick={() => setEditingItem(true)}
            className="w-7 h-7 rounded-lg flex items-center justify-center text-stone-300 hover:text-orange-500 hover:bg-orange-50 transition-colors"
            aria-label={`Edit ${item.name}`}
          >
            <Pencil size={12} />
          </button>
        )}
        <button
          onClick={onRemove}
          className="w-7 h-7 rounded-lg flex items-center justify-center text-stone-200 hover:text-red-400 hover:bg-red-50 transition-colors"
        >
          <X size={13} />
        </button>
      </div>
    </motion.div>
  );
}

export default function GroceryScreen({ embedded = false }: { embedded?: boolean }) {
  const {
    customGroceryItems,
    addCustomGroceryItem,
    removeCustomGroceryItem,
    toggleGroceryItem,
    updateGroceryItem,
    clearCheckedGroceryItems,
    userProfile,
    activeKitchenId,
    activeKitchenName,
  } = useStore();
  const kitchenGrocery = useKitchenGroceryList(activeKitchenId);
  const isKitchenMode = Boolean(activeKitchenId);

  const [newItem, setNewItem] = useState("");
  const [newQty, setNewQty] = useState("");
  const [newSection, setNewSection] = useState("other");
  const [search, setSearch] = useState("");
  const [showChecked, setShowChecked] = useState(true);
  const [estimating, setEstimating] = useState(false);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [importText, setImportText] = useState("");
  const [priceEstimate, setPriceEstimate] = useState<{ total: number; low: number; high: number; nearbyStores: string[]; currency: string; location: string; notes?: string } | null>(null);


  const localItems: GroceryItem[] = (customGroceryItems ?? []).map((item, idx) => {
    const legacy = toLegacyDetails(item.quantity);
    const section = toText(item.section ?? item.category) ?? legacy.section ?? "other";

    return {
      ...item,
      id: item.id ?? `${item.name}-${idx}`,
      section,
      qty: toText(item.qty) ?? toText(item.quantity) ?? legacy.qty,
    };
  });
  const kitchenItems: GroceryItem[] = (kitchenGrocery.items ?? []).map((item, idx) => ({
    ...item,
    id: item.id ?? `${item.name}-${idx}`,
    section: toText(item.section ?? item.category) ?? "other",
    qty: toText(item.quantity),
  }));
  const items = isKitchenMode ? kitchenItems : localItems;
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
  const orderedGroups = useMemo(() => {
    const sectionRank = new Map(STORE_SECTION_ORDER.map((section, index) => [section, index]));
    return Object.entries(grouped).sort(([left], [right]) => {
      const leftKey = left.toLowerCase();
      const rightKey = right.toLowerCase();
      const leftRank = sectionRank.get(leftKey) ?? 999;
      const rightRank = sectionRank.get(rightKey) ?? 999;
      if (leftRank !== rightRank) return leftRank - rightRank;
      return left.localeCompare(right);
    });
  }, [grouped]);

  const checkedCount = items.filter((i) => i.checked).length;
  const totalCount = items.length;

  const handleAdd = () => {
    const itemName = newItem.trim();
    if (!itemName) return;
    const detected = detectCategories(itemName);
    const section = newSection === "other" ? detected.grocerySection : newSection;
    if (isKitchenMode) {
      void kitchenGrocery.addItem({
        name: itemName,
        quantity: newQty.trim() || suggestQuantityForItem(itemName),
        category: section,
        section,
      });
    } else {
      addCustomGroceryItem(itemName, { qty: newQty.trim() || undefined, section });
    }
    setNewItem("");
    setNewQty("");
    setNewSection("other");
  };

  const importLinesToGrocery = (rawText: string) => {
    const parsedItems = rawText
      .split(/\r?\n/)
      .map((line) => line.trim())
      .map((line) => line.replace(/^[-*]\s*/, ""))
      .map((line) => line.replace(/^\[\s?[xX]?\]\s*/, ""))
      .filter(Boolean)
      .map((line) => {
        const parsed = parseIngredientLine(line);
        const name = parsed.name.toLowerCase().trim();
        if (!name) return null;
        const detected = detectCategories(name);
        return {
          name,
          qty: parsed.quantity?.trim() || undefined,
          section: detected.grocerySection,
        };
      })
      .filter((item): item is { name: string; qty: string; section: string } => Boolean(item) && typeof item.name === 'string');

    parsedItems.forEach((item) => {
      if (isKitchenMode) {
        void kitchenGrocery.addItem({
          name: item.name,
          quantity: item.qty || suggestQuantityForItem(item.name),
          category: item.section,
          section: item.section,
        });
      } else {
        addCustomGroceryItem(item.name, { qty: item.qty, section: item.section });
      }
    });
    return parsedItems.length;
  };

  const handleImportText = () => {
    const importedCount = importLinesToGrocery(importText);
    if (importedCount === 0) {
      toast.info("No grocery items were found in that note.");
      return;
    }
    setImportDialogOpen(false);
    setImportText("");
    toast.success(`Imported ${importedCount} grocery item${importedCount === 1 ? "" : "s"}.`);
  };

  const handleImportFile = async (file: File) => {
    const text = await file.text();
    setImportText(text);
    setImportDialogOpen(true);
  };

  const handleExport = async () => {
    const unchecked = items
      .filter((i) => !i.checked)
      .map((i) => `- [ ] ${i.name}${i.qty ? ` (${i.qty})` : ""}`)
      .join("\n");

    if (!unchecked) {
      toast.info("Nothing left to export.");
      return;
    }

    const checklist = `# Grocery List\n\n${unchecked}`;
    const safeDate = new Date().toISOString().slice(0, 10);
    const filename = `munch-grocery-list-${safeDate}.md`;
    const file = new File([checklist], filename, { type: "text/markdown" });

    try {
      if (navigator.canShare?.({ files: [file] }) && navigator.share) {
        await navigator.share({
          title: "Grocery List",
          text: "Open this checklist in Notes.",
          files: [file],
        });
        toast.success("Checklist file ready to send to Notes.");
        return;
      }

      const url = URL.createObjectURL(file);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = filename;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
      toast.success("Checklist file downloaded for Notes.");
    } catch {
      try {
        await navigator.clipboard?.writeText(checklist);
        toast.success("Checklist copied as a fallback.");
      } catch {
        toast.error("Could not export the checklist.");
      }
    }
  };

  const handleClearChecked = () => {
    if (isKitchenMode) {
      void kitchenGrocery.clearChecked();
    } else {
      clearCheckedGroceryItems?.();
    }
    toast.success("Cleared checked items");
  };

  const handleClearAll = () => {
    if (isKitchenMode) {
      void kitchenGrocery.clearAll();
    } else {
      items.forEach((item) => removeCustomGroceryItem?.(item.id));
    }
    toast.success("Cleared grocery list");
  };

  const handleEstimatePrice = async () => {
    const activeItems = items.filter((item) => !item.checked);
    if (!activeItems.length) {
      toast.info("Add a few grocery items first.");
      return;
    }

    setEstimating(true);
    try {
      const { data, error } = await invokeAppFunction("estimate-grocery-price", {
        body: {
          items: activeItems.map((item) => ({ name: item.name, qty: item.qty })),
          location: userProfile.groceryLocation,
          currency: userProfile.groceryCurrency,
        },
      });

      if (error) throw new Error(error.message || "Could not estimate prices");
      if (!data?.success || !data?.estimate) throw new Error(data?.error || "Could not estimate prices");

      setPriceEstimate(data.estimate);
      toast.success("Estimated grocery total ready");
    } catch (error) {
      if (isAiAgentCallsDisabledError(error)) {
        toast.info(getAiDisabledMessage("AI grocery price estimates"));
        return;
      }

      const message = error instanceof Error ? error.message : "Could not estimate prices right now";
      toast.error(message);
    } finally {
      setEstimating(false);
    }
  };

  return (
    <div className="min-h-full overflow-x-hidden" style={{ fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif", background: "#FFFAF5" }}>

      {/* Header */}
      <div
        className={`${embedded ? "hidden sm:block" : ""} border-b`}
        style={{ background: "linear-gradient(135deg,#FFF7ED 0%,#FFFAF5 100%)", borderColor: "rgba(249,115,22,0.12)" }}
      >
        <div className="max-w-3xl mx-auto px-6 py-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              <p className="text-[10px] font-bold text-orange-400 uppercase tracking-widest mb-1">Shopping</p>
              <h1 className="text-2xl font-bold text-stone-900" style={{ fontFamily: "'Fraunces', Georgia, serif" }}>
                Grocery List
              </h1>
              {isKitchenMode && (
                <p className="text-[11px] font-semibold text-orange-500 mt-1">Shared with {activeKitchenName || "Kitchen"}</p>
              )}
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
                  onClick={handleEstimatePrice}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white border border-stone-200 text-xs font-semibold text-stone-500 hover:border-orange-300 hover:text-orange-500 transition-colors"
                  disabled={estimating}
                >
                  <Sparkles size={13} /> {estimating ? "Estimating..." : "AI estimate"}
                </button>
              )}
              <button
                onClick={() => setImportDialogOpen(true)}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white border border-stone-200 text-xs font-semibold text-stone-500 hover:border-orange-300 hover:text-orange-500 transition-colors"
              >
                <Upload size={13} /> Import note
              </button>
              {totalCount > 0 && (
                <button
                  onClick={handleClearAll}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white border border-stone-200 text-xs font-semibold text-stone-500 hover:border-red-300 hover:text-red-500 transition-colors"
                >
                  <Trash2 size={13} /> Clear all
                </button>
              )}
              <button
                onClick={handleExport}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold text-white transition-all hover:opacity-90 active:scale-95"
                style={{ background: "linear-gradient(135deg,#FB923C,#F97316,#EA580C)", boxShadow: "0 4px 16px rgba(249,115,22,0.30)" }}
              >
                <FileText size={14} /> Export
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

      <div className={`max-w-3xl mx-auto ${embedded ? "px-4 pt-3" : "px-6 py-5"} space-y-5 pb-8`}>

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

        {priceEstimate && (
          <div
            className="rounded-2xl border p-4 space-y-2"
            style={{ background: "#fff", borderColor: "rgba(0,0,0,0.07)", boxShadow: "0 2px 12px rgba(28,25,23,0.04)" }}
          >
            <p className="text-xs font-bold text-stone-500 uppercase tracking-wider">AI price estimate</p>
            <p className="text-2xl font-bold text-stone-900" style={{ fontFamily: "'Fraunces', Georgia, serif" }}>
              {new Intl.NumberFormat(undefined, { style: "currency", currency: priceEstimate.currency }).format(priceEstimate.total)}
            </p>
            <p className="text-xs text-stone-500">
              Range {new Intl.NumberFormat(undefined, { style: "currency", currency: priceEstimate.currency }).format(priceEstimate.low)} - {new Intl.NumberFormat(undefined, { style: "currency", currency: priceEstimate.currency }).format(priceEstimate.high)}
            </p>
            <p className="text-xs text-stone-500 flex items-center gap-1"><MapPin size={12} /> {priceEstimate.location} · {priceEstimate.nearbyStores.join(", ")}</p>
            {priceEstimate.notes && <p className="text-[11px] text-stone-400">{priceEstimate.notes}</p>}
          </div>
        )}

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
          <div className="space-y-4" data-tutorial="grocery-list-container">
            {orderedGroups.map(([section, sectionItems]) => {
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
                          onToggle={() => {
                            if (isKitchenMode) {
                              void kitchenGrocery.updateItem(item.id, { checked: !item.checked });
                            } else {
                              toggleGroceryItem?.(item.id);
                            }
                          }}
                          onRemove={() => {
                            if (isKitchenMode) {
                              void kitchenGrocery.removeItem(item.id);
                            } else {
                              removeCustomGroceryItem?.(item.id);
                            }
                          }}
                          onEditQty={(qty) => {
                            if (isKitchenMode) {
                              void kitchenGrocery.updateItem(item.id, { quantity: qty });
                            } else {
                              updateGroceryItem?.(item.id, { qty });
                            }
                          }}
                          onEditItem={({ name, qty, section }) => {
                            if (isKitchenMode) {
                              void kitchenGrocery.updateItem(item.id, {
                                name,
                                quantity: qty || suggestQuantityForItem(name),
                                category: section,
                                section,
                              });
                            } else {
                              updateGroceryItem?.(item.id, {
                                name,
                                qty: qty || suggestQuantityForItem(name),
                                section,
                                category: section,
                              });
                            }
                          }}
                          onAdjustQty={(delta) => {
                            const nextQty = adjustQuantityString(item.quantity || item.qty || suggestQuantityForItem(item.name), delta);
                            if (isKitchenMode) {
                              void kitchenGrocery.updateItem(item.id, { quantity: nextQty });
                            } else {
                              updateGroceryItem?.(item.id, { qty: nextQty });
                            }
                          }}
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

      <Dialog open={importDialogOpen} onOpenChange={setImportDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Import grocery note</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <label className="flex items-center justify-center gap-2 text-sm font-semibold border border-stone-200 bg-white text-stone-700 rounded-xl py-2.5 hover:border-orange-300 hover:text-orange-600 cursor-pointer">
              <Upload size={14} /> Upload text file
              <input
                type="file"
                accept=".txt,.md,.csv,text/plain,text/markdown,text/csv"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) void handleImportFile(file);
                  e.currentTarget.value = "";
                }}
              />
            </label>
            <textarea
              value={importText}
              onChange={(e) => setImportText(e.target.value)}
              placeholder={"Paste a note or raw list here...\n\n- 2 avocados\n- milk\n- bread\n- [ ] eggs"}
              className="w-full min-h-[220px] rounded-xl border border-stone-200 px-4 py-3 text-sm text-stone-700 outline-none focus:border-orange-300 resize-y"
            />
            <button
              onClick={handleImportText}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-bold text-white transition-all hover:opacity-90 active:scale-95"
              style={{ background: "linear-gradient(135deg,#FB923C,#F97316,#EA580C)", boxShadow: "0 4px 16px rgba(249,115,22,0.24)" }}
            >
              <Upload size={14} /> Import into Grocery List
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
