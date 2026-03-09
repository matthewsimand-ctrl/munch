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
  Loader2,
  Pencil,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useStore } from "@/lib/store";
import { toast } from "sonner";
import { getCategory } from "@/lib/ingredientCategories";

// ── Types & data ──────────────────────────────────────────────────────────────
interface GroceryItem {
  id: number;
  name: string;
  quantity: string;
  category: string;
  checked: boolean;
  fromRecipe?: string;
}

const CATEGORIES_ORDER = [
  "Fresh Produce",
  "Meat & Fish",
  "Dairy",
  "Grains & Pasta",
  "Canned Goods",
  "Sauces & Condiments",
  "Other",
];

export default function GroceryList() {
  const { customGroceryItems } = useStore();

  // Merge store custom items into local state on first render
  const [items, setItems] = useState<GroceryItem[]>(() => {
    const storeItems: GroceryItem[] = customGroceryItems.map((item, i) => ({
      id: Date.now() + i + 1000,
      name: item.name,
      quantity: item.quantity || "1",
      category: getCategory(item.name) || "Other",
      checked: false,
    }));
    return storeItems;
  });

  const [newName, setNewName] = useState("");
  const [newQty, setNewQty] = useState("");
  const [newCat, setNewCat] = useState("Fresh Produce");
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [fillingFromPlan, setFillingFromPlan] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editingName, setEditingName] = useState('');
  const [editingQty, setEditingQty] = useState('');

  const startEdit = (item: GroceryItem) => {
    setEditingId(item.id);
    setEditingName(item.name);
    setEditingQty(item.quantity);
  };

  const saveEdit = () => {
    if (editingId === null || !editingName.trim()) return;
    setItems((prev) => prev.map((item) => item.id === editingId ? { ...item, name: editingName.trim(), quantity: editingQty.trim() || '1', category: getCategory(editingName.trim()) || item.category } : item));
    setEditingId(null);
  };

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

  const handleAutoFill = async () => {
    setFillingFromPlan(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error("Please sign in to use this feature");
        return;
      }

      // Get the current week's meal plan
      const today = new Date();
      const dayOfWeek = today.getDay();
      const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
      const monday = new Date(today);
      monday.setDate(today.getDate() + mondayOffset);
      const weekStart = monday.toISOString().split("T")[0];

      const { data: plans } = await supabase
        .from("meal_plans")
        .select("id")
        .eq("user_id", session.user.id)
        .eq("week_start", weekStart)
        .limit(1);

      if (!plans || plans.length === 0) {
        toast.info("No meal plan found for this week. Create one in Meal Prep first!");
        return;
      }

      const { data: planItems } = await supabase
        .from("meal_plan_items")
        .select("recipe_data, recipe_id")
        .eq("meal_plan_id", plans[0].id);

      if (!planItems || planItems.length === 0) {
        toast.info("Your meal plan has no recipes yet.");
        return;
      }

      const existingNames = new Set(items.map(i => i.name.toLowerCase()));
      let addedCount = 0;
      const newItems: GroceryItem[] = [];

      for (const item of planItems) {
        const recipeData = item.recipe_data as any;
        if (!recipeData) continue;

        const recipeName = recipeData.name || "Meal Plan Recipe";
        const ingredients: string[] = Array.isArray(recipeData.ingredients)
          ? recipeData.ingredients
          : [];

        for (const ing of ingredients) {
          const ingName = ing.trim().toLowerCase();
          if (!ingName || existingNames.has(ingName)) continue;
          existingNames.add(ingName);

          newItems.push({
            id: Date.now() + addedCount + Math.random() * 10000,
            name: ing.trim(),
            quantity: "1",
            category: getCategory(ing) || "Other",
            checked: false,
            fromRecipe: recipeName,
          });
          addedCount++;
        }
      }

      if (addedCount === 0) {
        toast.info("All meal plan ingredients are already in your list!");
      } else {
        setItems(prev => [...prev, ...newItems]);
        toast.success(`Added ${addedCount} ingredients from your meal plan`);
      }
    } catch (e: any) {
      console.error("Auto-fill error:", e);
      toast.error("Failed to load meal plan");
    } finally {
      setFillingFromPlan(false);
    }
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

  // Also group uncategorized items
  const uncategorized = displayItems.filter(i => !CATEGORIES_ORDER.includes(i.category));
  if (uncategorized.length > 0) {
    groupedItems["Other"] = [...(groupedItems["Other"] || []), ...uncategorized];
  }

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
            <button
              onClick={handleAutoFill}
              disabled={fillingFromPlan}
              className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition-colors shadow-sm disabled:opacity-50"
            >
              {fillingFromPlan ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
              Auto-fill from Meal Plan
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

                      <div className="flex-1 min-w-0">
                        {editingId === item.id ? (
                          <div className="flex gap-2">
                            <input value={editingName} onChange={(e) => setEditingName(e.target.value)} className="flex-1 px-2 py-1 text-sm border border-gray-200 rounded" />
                            <input value={editingQty} onChange={(e) => setEditingQty(e.target.value)} className="w-16 px-2 py-1 text-sm border border-gray-200 rounded" />
                          </div>
                        ) : (
                          <span className={`text-sm font-medium transition-colors ${item.checked ? "text-gray-400 line-through" : "text-gray-800"}`}>
                            {item.name}
                          </span>
                        )}
                        {item.fromRecipe && (
                          <div className="text-xs text-gray-400 mt-0.5">For: {item.fromRecipe}</div>
                        )}
                      </div>

                      {editingId !== item.id && (
                        <span className={`text-sm shrink-0 ${item.checked ? "text-gray-400" : "text-gray-600 font-medium"}`}>
                          {item.quantity}
                        </span>
                      )}

                      {editingId === item.id ? (
                        <button
                          onClick={saveEdit}
                          className="text-green-600 hover:text-green-700 shrink-0"
                        >
                          <Check size={14} />
                        </button>
                      ) : (
                        <button
                          onClick={() => startEdit(item)}
                          className="opacity-0 group-hover:opacity-100 transition-opacity text-gray-300 hover:text-orange-500 shrink-0"
                        >
                          <Pencil size={14} />
                        </button>
                      )}

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
                <p className="text-xs text-gray-400 mt-1">Add items manually or auto-fill from your meal plan</p>
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
            {items.some(i => i.fromRecipe) && (
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
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
