import { useMemo, useRef, useState } from "react";
import {
  ArrowLeft, Search, CheckCircle2, Circle,
  Trash2, Plus, Camera, Upload, Lock, ChevronDown, X, Minus, Sparkles, CircleHelp
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useStore } from "@/lib/store";
import { toast } from "sonner";
import { detectCategories } from "@/lib/categorizeItem";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { getPremiumOverride } from "@/lib/premium";
import { adjustQuantityString, canDecreaseQuantity, parseIngredientLine, suggestQuantityForItem } from "@/lib/ingredientText";
import { invokeAppFunction } from "@/lib/functionClient";
import { getAiDisabledMessage, isAiAgentCallsDisabledError } from "@/lib/ai";
import { calculateMatch } from "@/lib/matchLogic";
import RecipePreviewDialog from "@/components/RecipePreviewDialog";
import type { Recipe } from "@/data/recipes";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { getPantryImage } from "@/lib/pantryImages";
import { useKitchenPantry } from "@/hooks/useKitchenPantry";
import { Input } from "@/components/ui/input";
import MobileActionButton from "@/components/MobileActionButton";
import PremiumFeatureButton from "@/components/PremiumFeatureButton";
import { usePremiumGate } from "@/hooks/usePremiumGate";
import { useIsMobile } from "@/hooks/use-mobile";

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
  onAdjustQty,
  dataTutorial,
  compact = false,
}: {
  item: PantryItem;
  onRemove: () => void;
  onEdit: (field: "quantity", value: string) => void;
  onAdjustQty: (delta: number) => void;
  dataTutorial?: string;
  compact?: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [qty, setQty] = useState(item.quantity ?? "");
  const suggestedQty = suggestQuantityForItem(item.name);
  const displayQty = item.quantity || suggestedQty;
  const showDecrease = canDecreaseQuantity(displayQty);

  const cat = normalizeCategory(item.category);
  const itemImage = getPantryImage(item.name, cat);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: -4 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: 16 }}
      data-tutorial={dataTutorial}
      className={`flex items-center gap-3 rounded-xl group hover:bg-orange-50/50 transition-colors ${compact ? "px-3 py-2.5" : "px-4 py-3"}`}
    >
      <img
        src={itemImage.src}
        alt={itemImage.alt}
        className={`${compact ? "w-9 h-9 rounded-lg" : "w-10 h-10 rounded-xl"} object-cover shrink-0 border border-stone-200 bg-white`}
      />
      <div className="flex-1 min-w-0">
        <p className={`${compact ? "text-[13px]" : "text-sm"} font-semibold text-stone-800 truncate`}>{item.name}</p>
        <div className="mt-1 flex items-center gap-1">
          {showDecrease && (
            <button
              onClick={() => onAdjustQty(-1)}
              className="w-6 h-6 rounded-full border border-stone-200 bg-white text-stone-400 hover:border-orange-300 hover:text-orange-500 transition-colors flex items-center justify-center"
              aria-label={`Decrease quantity for ${item.name}`}
            >
              <Minus size={10} />
            </button>
          )}
          {editing ? (
            <input
              autoFocus
              value={qty}
              onChange={(e) => setQty(e.target.value)}
              onBlur={() => { setEditing(false); onEdit("quantity", qty); }}
              onKeyDown={(e) => { if (e.key === "Enter") { setEditing(false); onEdit("quantity", qty); } }}
              className="text-base text-stone-500 outline-none border-b border-orange-300 bg-transparent w-24 mt-0.5"
              placeholder={suggestedQty}
            />
          ) : (
            <button
              onClick={() => setEditing(true)}
              className="text-[10px] text-stone-400 bg-stone-100/50 hover:bg-orange-100 hover:text-orange-600 px-2 py-0.5 rounded-md transition-all w-fit flex items-center font-medium"
            >
              <span>{displayQty}</span>
            </button>
          )}
          <button
            onClick={() => onAdjustQty(1)}
            className="w-6 h-6 rounded-full border border-stone-200 bg-white text-stone-400 hover:border-orange-300 hover:text-orange-500 transition-colors flex items-center justify-center"
            aria-label={`Increase quantity for ${item.name}`}
          >
            <Plus size={10} />
          </button>
        </div>
      </div>
      <span
        className={`font-semibold px-2 py-0.5 rounded-full ${compact ? "text-[9px]" : "text-[10px]"}`}
        style={{ background: "rgba(249,115,22,0.08)", color: "#C2410C" }}
      >
        {itemImage.matched ? `${cat} match` : cat}
      </span>
      <button
        onClick={onRemove}
        className="w-7 h-7 rounded-lg flex items-center justify-center text-stone-200 hover:text-red-400 hover:bg-red-50 transition-colors opacity-100 sm:opacity-0 sm:group-hover:opacity-100"
      >
        <Trash2 size={13} />
      </button>
    </motion.div>
  );
}

export default function PantryScreen({ embedded = false }: { embedded?: boolean }) {
  const isMobile = useIsMobile();
  const {
    pantryList,
    addPantryItem,
    removePantryItem,
    updatePantryItem,
    likeRecipe,
    addCustomGroceryItem,
    activeKitchenId,
    activeKitchenName,
  } = useStore();
  const kitchenPantry = useKitchenPantry(activeKitchenId);
  const isKitchenMode = Boolean(activeKitchenId);
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState("All");
  const [sortMode, setSortMode] = useState<"recent" | "category">("recent");
  const [newItem, setNewItem] = useState("");
  const [newCategory, setNewCategory] = useState("Other");
  const [newQty, setNewQty] = useState("");
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [importingReceipt, setImportingReceipt] = useState(false);
  const [generatingRecipe, setGeneratingRecipe] = useState(false);
  const [generatedRecipe, setGeneratedRecipe] = useState<Recipe | null>(null);
  const [generatedRecipeOpen, setGeneratedRecipeOpen] = useState(false);
  const [cleanupPromptOpen, setCleanupPromptOpen] = useState(false);
  const [cleanupMealType, setCleanupMealType] = useState("");
  const [cleanupCuisine, setCleanupCuisine] = useState("");
  const [cleanupPrompt, setCleanupPrompt] = useState("");
  const isPremium = getPremiumOverride();
  const { openPremiumPage } = usePremiumGate();
  const receiptInputRef = useRef<HTMLInputElement>(null);
  const fridgeImageInputRef = useRef<HTMLInputElement>(null);
  const pantryItems = isKitchenMode
    ? kitchenPantry.items.map((item) => ({ ...item, category: item.category ?? undefined }))
    : pantryList;

  const filtered = useMemo(() => {
    let list: PantryItem[] = (pantryItems ?? []).map((item, idx) => ({
      ...item,
      key: `${item.id ?? item.name}-${idx}`,
      id: item.id ?? item.name,
    }));
    if (search) list = list.filter((i) => i.name.toLowerCase().includes(search.toLowerCase()));
    if (activeCategory !== "All") list = list.filter((i) => normalizeCategory(i.category) === activeCategory);
    if (sortMode === "category") {
      list = [...list].sort((a, b) => {
        const categoryCompare = normalizeCategory(a.category).localeCompare(normalizeCategory(b.category));
        if (categoryCompare !== 0) return categoryCompare;
        return a.name.localeCompare(b.name);
      });
    } else {
      list = [...list].sort((a, b) => (b.addedAt ?? 0) - (a.addedAt ?? 0));
    }
    return list;
  }, [pantryItems, search, activeCategory, sortMode]);

  const groupedCounts = useMemo(() => {
    const counts: Record<string, number> = { All: pantryItems?.length ?? 0 };
    (pantryItems ?? []).forEach((i) => {
      const c = normalizeCategory(i.category);
      counts[c] = (counts[c] || 0) + 1;
    });
    return counts;
  }, [pantryItems]);

  const handleAdd = () => {
    const itemName = newItem.trim();
    if (!itemName) return;
    const detected = detectCategories(itemName);
    let category = newCategory === "Other" ? detected.pantryCategory : newCategory;
    category = normalizeCategory(category);
    if (isKitchenMode) {
      void kitchenPantry.addItem({
        name: itemName,
        category,
        quantity: newQty.trim() || suggestQuantityForItem(itemName),
      });
    } else {
      addPantryItem({ name: itemName, category, quantity: newQty.trim() || undefined });
    }
    toast.success(`Added ${itemName} to pantry`);
    setNewItem("");
    setNewQty("");
    setNewCategory("Other");
  };

  const handleRemove = (id: string, name: string) => {
    if (isKitchenMode) {
      void kitchenPantry.removeItem(id);
    } else {
      removePantryItem(id);
    }
    toast.success(`Removed ${name}`);
  };

  const renderActionHelp = (
    copy: string,
    {
      align = "center",
    }: {
      align?: "start" | "center" | "end";
    } = {},
  ) => (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <span
            className="inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full border border-orange-200 bg-orange-50/95 text-orange-500"
            onClick={(event) => event.stopPropagation()}
          >
            <CircleHelp size={10} />
          </span>
        </TooltipTrigger>
        <TooltipContent side="bottom" sideOffset={8} align={align} className="z-[80] max-w-[220px]">
          <p className="text-xs">{copy}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );

  const handleClearAll = () => {
    if ((pantryItems?.length ?? 0) === 0) return;
    if (isKitchenMode) {
      void kitchenPantry.clearAll();
    } else {
      (pantryItems ?? []).forEach((item) => removePantryItem(item.id));
    }
    toast.success("Cleared pantry");
  };

  const normalizeGeneratedRecipe = (raw: any): Recipe | null => {
    const name = String(raw?.name || "").trim();
    const ingredients = Array.isArray(raw?.ingredients)
      ? raw.ingredients.map((item: unknown) => String(item).trim()).filter(Boolean)
      : [];
    const instructions = Array.isArray(raw?.instructions)
      ? raw.instructions.map((item: unknown) => String(item).trim()).filter(Boolean)
      : [];

    if (!name || ingredients.length === 0 || instructions.length === 0) return null;

    return {
      id: String(raw?.id || `pantry-${name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`),
      name,
      image: String(raw?.image || "/placeholder.svg"),
      cook_time: String(raw?.cook_time || "30 min"),
      difficulty: String(raw?.difficulty || "Intermediate"),
      ingredients,
      instructions,
      tags: Array.isArray(raw?.tags) ? raw.tags.map((item: unknown) => String(item)) : [],
      cuisine: raw?.cuisine ? String(raw.cuisine) : undefined,
      chef: raw?.chef ? String(raw.chef) : undefined,
      source: String(raw?.source || "AI Pantry"),
      source_url: raw?.source_url ? String(raw.source_url) : undefined,
      raw_api_payload: raw?.raw_api_payload,
      servings: raw?.servings ? Number(raw.servings) : undefined,
      calories: raw?.calories ? Number(raw.calories) : undefined,
      protein: raw?.protein ? Number(raw.protein) : undefined,
      carbs: raw?.carbs ? Number(raw.carbs) : undefined,
      fat: raw?.fat ? Number(raw.fat) : undefined,
      is_public: Boolean(raw?.is_public),
    };
  };

  const handleGenerateRecipe = async () => {
    if (!isPremium) {
      toast.info("AI pantry recipes are a Premium feature.");
      return;
    }

    if ((pantryItems?.length ?? 0) < 2) {
      toast.info("Add a few pantry items first so we have something to cook with.");
      return;
    }

    setGeneratingRecipe(true);
    try {
      const pantryNames = pantryItems.map((item) => item.name);
      const { data, error } = await invokeAppFunction<{ recipe?: unknown; error?: string }>("generate-pantry-recipe", {
        body: {
          pantryItems: pantryNames,
          mealType: cleanupMealType,
          cuisine: cleanupCuisine,
          prompt: cleanupPrompt,
        },
      });

      if (error) throw new Error(error.message || "Could not generate a recipe");

      const bestRecipe = normalizeGeneratedRecipe(data?.recipe);
      if (!bestRecipe) {
        toast.info("I couldn't find a pantry-based recipe right now. Try adding a few more ingredients.");
        return;
      }

      setGeneratedRecipe(bestRecipe);
      setGeneratedRecipeOpen(true);
      setCleanupPromptOpen(false);
      toast.success(`Found a recipe using your pantry: ${bestRecipe.name}`);
    } catch (error) {
      if (isAiAgentCallsDisabledError(error)) {
        toast.info(getAiDisabledMessage("AI pantry recipes"));
        return;
      }

      const message = error instanceof Error ? error.message : "Could not generate a recipe";
      toast.error(message);
    } finally {
      setGeneratingRecipe(false);
    }
  };

  const parseTextImport = (text: string) => {
    return text
      .split(/\r?\n/)
      .map((line) => line.trim())
      .map((line) => line.replace(/^[-*[\]0-9).\s]+/, ""))
      .map((line) => line.replace(/\s+\$?\d+[.,]?\d{0,2}\s*$/, ""))
      .filter((line) => line.length >= 2)
      .filter((line) => !/^(subtotal|total|tax|change|cash|visa|mastercard|debit|credit|thank you|balance|receipt|store|cashier)$/i.test(line))
      .filter((line) => /[a-zA-Z]/.test(line))
      .map((line) => {
        const parsed = parseIngredientLine(line);
        return {
          name: parsed.name.toLowerCase().trim(),
          quantity: parsed.quantity?.trim() || undefined,
        };
      })
      .filter((item) => item.name.length > 1);
  };

  const applyImportedItems = (items: Array<{ name: string; quantity?: string }>) => {
    const uniqueItems = items.filter((item, index, arr) =>
      item.name && arr.findIndex((candidate) => candidate.name === item.name) === index
    );

    uniqueItems.forEach((item) => {
      const detected = detectCategories(item.name);
      if (isKitchenMode) {
        void kitchenPantry.addItem({
          name: item.name,
          quantity: item.quantity || "1",
          category: normalizeCategory(detected.pantryCategory),
        });
      } else {
        addPantryItem({
          name: item.name,
          quantity: item.quantity || "1",
          category: normalizeCategory(detected.pantryCategory),
        });
      }
    });

    return uniqueItems.length;
  };

  const readFileAsText = async (file: File) => file.text();

  const readFileAsDataUrl = (file: File) =>
    new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ""));
      reader.onerror = () => reject(new Error("Could not read file"));
      reader.readAsDataURL(file);
    });

  const handleImportedFile = async (file: File, source: "receipt" | "fridge") => {
    setImportingReceipt(true);
    try {
      const isTextFile = file.type.startsWith("text/") || /\.(txt|csv|md)$/i.test(file.name);
      let importedCount = 0;

      if (isTextFile) {
        const text = await readFileAsText(file);
        importedCount = applyImportedItems(parseTextImport(text));
      } else if (file.type.startsWith("image/")) {
        const imageBase64 = await readFileAsDataUrl(file);
        const { data, error } = await invokeAppFunction<{
          items?: Array<{ name?: string; quantity?: string }>;
          ingredients?: string[];
          error?: string;
        }>("scan-fridge", {
          body: { imageBase64, source },
        });

        if (error) throw new Error(error.message || "Could not read this image");

        const structuredItems = (data?.items || [])
          .map((item) => ({
            name: (item.name || "").toLowerCase().trim(),
            quantity: item.quantity?.trim() || undefined,
          }))
          .filter((item) => item.name);

        const fallbackItems = (data?.ingredients || []).map((name) => ({
          name: name.toLowerCase().trim(),
          quantity: undefined,
        }));

        importedCount = applyImportedItems(structuredItems.length > 0 ? structuredItems : fallbackItems);
      } else {
        toast.info("Please upload an image, text file, or CSV list.");
        return;
      }

      if (importedCount === 0) {
        toast.info("No grocery items were found to add to your pantry.");
        return;
      }

      toast.success(`Added ${importedCount} pantry item${importedCount === 1 ? "" : "s"}.`);
      setUploadDialogOpen(false);
    } catch (error) {
      if (isAiAgentCallsDisabledError(error)) {
        toast.info(getAiDisabledMessage("receipt and pantry scanning"));
        return;
      }

      const message = error instanceof Error ? error.message : "Could not import this file";
      toast.error(message);
    } finally {
      setImportingReceipt(false);
      if (receiptInputRef.current) receiptInputRef.current.value = "";
      if (fridgeImageInputRef.current) fridgeImageInputRef.current.value = "";
    }
  };

  return (
    <div className="min-h-full overflow-x-hidden md:pb-0" style={{ fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif", background: "#FFFAF5" }}>

      {/* Header */}
      <div
        className={`relative border-b overflow-hidden ${embedded ? "hidden sm:block" : ""}`}
        style={{ background: "linear-gradient(135deg,#FFF7ED 0%,#FFFAF5 100%)", borderColor: "rgba(249,115,22,0.12)" }}
      >
        <div
          className="absolute inset-0 opacity-20"
          style={{ backgroundImage: "radial-gradient(circle, #FDA97440 1px, transparent 1px)", backgroundSize: "20px 20px" }}
        />
        <div className="relative max-w-6xl mx-auto px-4 sm:px-6 py-4 sm:py-6">
          <div className="mb-3 flex flex-col gap-3 sm:mb-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <p className="text-[10px] font-bold text-orange-400 uppercase tracking-widest mb-1">Your kitchen</p>
              <h1 className="text-xl font-bold text-stone-900 sm:text-2xl" style={{ fontFamily: "'Fraunces', Georgia, serif" }}>
                Pantry
              </h1>
              <p className="text-xs text-stone-400 mt-1">
                {pantryItems?.length ?? 0} items stocked
                {isKitchenMode && <span className="ml-2 font-semibold text-orange-500">Shared with {activeKitchenName || "Kitchen"}</span>}
              </p>
            </div>
            <div className={`flex gap-2 ${isMobile ? "-mx-1 overflow-x-auto px-1 pb-1 scrollbar-hide" : "flex-wrap items-center sm:justify-end"}`}>
              <div className="min-w-0">
                {isPremium ? (
                  <button
                    title="Upload"
                    onClick={() => setUploadDialogOpen(true)}
                    className="flex min-w-0 items-center justify-center gap-2 rounded-xl border border-stone-200 bg-white px-3 py-2 text-xs font-semibold text-stone-500 transition-colors hover:border-orange-300 hover:text-orange-500"
                    disabled={importingReceipt}
                  >
                    <Upload size={13} /> {importingReceipt ? "Importing..." : "Upload"}
                    {renderActionHelp("Upload lets you take a picture of a receipt or fridge, or upload a saved file.", { align: "start" })}
                  </button>
                ) : (
                <PremiumFeatureButton
                  label="Upload"
                  onClick={() => openPremiumPage("Pantry Upload")}
                  disabled={importingReceipt}
                  variant="soft"
                  className="h-9 w-auto shrink-0 rounded-xl px-3 text-[11px]"
                  trailing={renderActionHelp("Upload lets you take a picture of a receipt or fridge, or upload a saved file.", { align: "start" })}
                />
                )}
              </div>

              {isPremium ? (
                <button
                  title="Fridge Cleanup"
                  onClick={() => setCleanupPromptOpen(true)}
                  className="flex min-w-0 items-center justify-center gap-2 rounded-xl border border-stone-200 bg-white px-3 py-2 text-xs font-semibold text-stone-500 transition-colors hover:border-orange-300 hover:text-orange-500"
                  disabled={generatingRecipe}
                >
                  <Sparkles size={13} /> {generatingRecipe ? "Generating..." : "Fridge Cleanup"}
                  {renderActionHelp("Fridge Cleanup uses AI to suggest a recipe based on what is already in your pantry.", { align: "end" })}
                </button>
              ) : (
                <PremiumFeatureButton
                  label="Fridge Cleanup"
                  onClick={() => openPremiumPage("Fridge Cleanup")}
                  variant="soft"
                  className="h-9 w-auto shrink-0 rounded-xl px-3 text-[11px]"
                  disabled={generatingRecipe}
                  trailing={renderActionHelp("Fridge Cleanup uses AI to suggest a recipe based on what is already in your pantry.", { align: "end" })}
                />
              )}
            </div>
          </div>

          {/* Stat row */}
          <div className={`flex items-center gap-4 ${isMobile ? "overflow-x-auto pb-1 scrollbar-hide" : ""}`}>
            {[
              { label: "In stock", value: pantryItems?.length ?? 0, color: "#10B981" },
              { label: "Categories", value: Object.keys(groupedCounts).length - 1, color: "#F97316" },
            ].map(({ label, value, color }) => (
              <div key={label} className="flex items-center gap-2 shrink-0">
                <div className="w-2 h-2 rounded-full" style={{ background: color }} />
                <span className="text-xs font-semibold text-stone-500">{value} {label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <input
        ref={receiptInputRef}
        type="file"
        accept="image/*,.txt,.csv,.md,text/plain,text/csv,text/markdown"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void handleImportedFile(file, "receipt");
        }}
      />

      <input
        ref={fridgeImageInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        capture="environment"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void handleImportedFile(file, "fridge");
        }}
      />

      <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
        <DialogContent className="w-[calc(100vw-1rem)] max-w-sm max-h-[calc(100dvh-1rem)] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Upload to Pantry</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-stone-500">
              Choose whether you want to take a live photo or upload a file from your device.
            </p>
            <button
              onClick={() => {
                fridgeImageInputRef.current?.click();
              }}
              disabled={importingReceipt}
              className="w-full flex items-center justify-center gap-2 text-sm font-semibold border border-orange-200 bg-orange-50 text-orange-600 rounded-xl py-2.5 hover:bg-orange-100 disabled:opacity-60"
            >
              <Camera size={14} /> {importingReceipt ? "Scanning..." : "Take live picture"}
            </button>
            <button
              onClick={() => {
                receiptInputRef.current?.click();
              }}
              disabled={importingReceipt}
              className="w-full flex items-center justify-center gap-2 text-sm font-semibold border border-stone-200 bg-white text-stone-700 rounded-xl py-2.5 hover:border-orange-300 hover:text-orange-600 disabled:opacity-60"
            >
              <Upload size={14} /> Upload a file
            </button>
          </div>
        </DialogContent>
      </Dialog>

      <RecipePreviewDialog
        recipe={generatedRecipe}
        match={generatedRecipe ? calculateMatch((pantryItems ?? []).map((item) => item.name), generatedRecipe.ingredients || []) : null}
        open={generatedRecipeOpen}
        onOpenChange={setGeneratedRecipeOpen}
        mode="explore"
        onSave={(recipe) => {
          likeRecipe(recipe.id, recipe);
          toast.success(`Saved ${recipe.name}`);
        }}
        onRegenerate={() => {
          setGeneratedRecipeOpen(false);
          void handleGenerateRecipe();
        }}
        onAddMissingToGrocery={(recipe, missingIngredients) => {
          missingIngredients.forEach((ingredient) => addCustomGroceryItem(ingredient));
          toast.success(`Added ${missingIngredients.length} missing items from ${recipe.name}`);
        }}
      />

      <Dialog open={cleanupPromptOpen} onOpenChange={setCleanupPromptOpen}>
        <DialogContent className="w-[calc(100vw-1rem)] max-w-sm max-h-[calc(100dvh-1rem)] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Fridge Cleanup</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-stone-500">Meal Type</p>
              <div className="flex flex-wrap gap-2">
                {["Breakfast", "Lunch", "Dinner", "Snack"].map((option) => (
                  <button
                    key={option}
                    type="button"
                    onClick={() => setCleanupMealType(cleanupMealType === option ? "" : option)}
                    className={`rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${cleanupMealType === option ? "bg-orange-500 text-white" : "border border-stone-200 bg-white text-stone-500"
                      }`}
                  >
                    {option}
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-stone-700">Cuisine</label>
              <Input value={cleanupCuisine} onChange={(e) => setCleanupCuisine(e.target.value)} placeholder="Italian, French, Mexican..." />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-stone-700">Recipe filter</label>
              <Input
                value={cleanupPrompt}
                onChange={(e) => setCleanupPrompt(e.target.value)}
                placeholder="Search across title, ingredients, instructions, tags... e.g. high protein, one-pan, kid-friendly"
              />
              <p className="text-xs text-stone-400">
                We&apos;ll use this like a recipe search query across the recipe title, ingredients, instructions, tags, and style.
              </p>
            </div>
            <button
              type="button"
              onClick={() => void handleGenerateRecipe()}
              disabled={generatingRecipe}
              className="w-full rounded-xl bg-orange-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-orange-600 transition-colors"
            >
              {generatingRecipe ? "Generating..." : "Generate Recipe"}
            </button>
          </div>
        </DialogContent>
      </Dialog>

      <div className={`max-w-6xl mx-auto px-4 sm:px-6 ${embedded ? "pt-3" : "py-4 sm:py-5"} space-y-4 sm:space-y-5 pb-6 sm:pb-8`}>

        {/* Add form */}
        {!embedded && (
          <motion.div
            className="rounded-2xl border p-5"
            data-tutorial="pantry-add-form"
            style={{ background: "#fff", borderColor: "rgba(249,115,22,0.20)", boxShadow: "0 4px 20px rgba(249,115,22,0.08)" }}
          >
            <p className="text-sm font-bold text-stone-800 mb-3">Add pantry item</p>
            <div className="flex flex-col sm:flex-row gap-3">
              <input
                data-tutorial="pantry-input"
                value={newItem}
                onChange={(e) => {
                  const value = e.target.value;
                  setNewItem(value);
                  if (value.trim()) setNewCategory(detectCategories(value).pantryCategory);
                }}
                onKeyDown={(e) => e.key === "Enter" && handleAdd()}
                placeholder="e.g. Olive oil, Garlic, Pasta…"
                className="flex-1 px-4 py-2.5 rounded-xl border text-base text-stone-700 placeholder:text-stone-300 outline-none focus:border-orange-300 transition-colors"
                style={{ borderColor: "rgba(0,0,0,0.09)" }}
              />
              <input
                value={newQty}
                onChange={(e) => setNewQty(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAdd()}
                placeholder="Quantity (optional)"
                className="w-full px-4 py-2.5 rounded-xl border text-base text-stone-700 placeholder:text-stone-300 outline-none focus:border-orange-300 transition-colors sm:w-40"
                style={{ borderColor: "rgba(0,0,0,0.09)" }}
              />
              <div className="relative w-full sm:w-auto">
                <select
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                  className="w-full appearance-none pl-3 pr-8 py-2.5 rounded-xl border text-base font-medium text-stone-600 outline-none cursor-pointer"
                  style={{ background: "#fff", borderColor: "rgba(0,0,0,0.09)" }}
                >
                  {CATEGORIES.filter((c) => c !== "All").map((c) => <option key={c}>{c}</option>)}
                </select>
                <ChevronDown size={12} className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 pointer-events-none" />
              </div>
              <button
                onClick={handleAdd}
                data-tutorial="pantry-add-btn"
                disabled={!newItem.trim()}
                className="h-11 w-full rounded-xl text-lg font-bold text-white disabled:opacity-40 transition-all hover:opacity-90 active:scale-95 sm:h-10 sm:w-10"
                style={{ background: "linear-gradient(135deg,#FB923C,#F97316)", boxShadow: "0 2px 8px rgba(249,115,22,0.25)" }}
              >
                +
              </button>
            </div>
          </motion.div>
        )}

        {/* Search */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-300" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search your pantry…"
              className={`w-full pl-10 pr-4 ${isMobile ? "py-2.5" : "py-3"} rounded-xl border text-base text-stone-700 placeholder:text-stone-300 outline-none focus:border-orange-300 transition-colors`}
              style={{ background: "#fff", borderColor: "rgba(0,0,0,0.09)" }}
            />
            {search && (
              <button onClick={() => setSearch("")} className="absolute right-4 top-1/2 -translate-y-1/2 text-stone-300 hover:text-stone-500">
                <X size={13} />
              </button>
            )}
          </div>
          <div className={`${isMobile ? "grid grid-cols-2 gap-3" : "relative sm:w-52"}`}>
            {isMobile ? (
              <>
                <button
                  onClick={() => setAddDialogOpen(true)}
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-orange-200 bg-white px-3 py-2.5 text-sm font-semibold text-orange-700"
                >
                  <Plus size={14} /> Add item
                </button>
                <select
                  value={sortMode}
                  onChange={(e) => setSortMode(e.target.value as "recent" | "category")}
                  className="appearance-none w-full rounded-xl border px-3 py-2.5 text-sm font-semibold text-stone-600 outline-none"
                  style={{ background: "#fff", borderColor: "rgba(0,0,0,0.09)" }}
                >
                  <option value="recent">Recent</option>
                  <option value="category">Category</option>
                </select>
              </>
            ) : (
            <div className="relative sm:w-52">
            <select
              value={sortMode}
              onChange={(e) => setSortMode(e.target.value as "recent" | "category")}
              className="appearance-none w-full pl-3 pr-8 py-2.5 rounded-xl border text-xs font-semibold text-stone-600 outline-none cursor-pointer"
              style={{ background: "#fff", borderColor: "rgba(0,0,0,0.09)" }}
            >
              <option value="recent">Recent</option>
              <option value="category">Category</option>
            </select>
            <ChevronDown size={12} className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 pointer-events-none" />
            </div>
            )}
          </div>
        </div>

        {(pantryItems?.length ?? 0) > 0 && (
          <div className="flex justify-end">
            <button
              onClick={handleClearAll}
              className="inline-flex items-center gap-1.5 rounded-xl border border-stone-200 bg-white px-3.5 py-2 text-xs font-semibold text-stone-500 transition-colors hover:border-red-300 hover:text-red-500"
            >
              <Trash2 size={13} /> Clear all
            </button>
          </div>
        )}

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
              {(pantryItems?.length ?? 0) === 0 ? (
                <div className="flex flex-col items-center gap-3">
                  <div className="w-16 h-16 rounded-2xl bg-orange-50 flex items-center justify-center text-3xl">📦</div>
                  <div>
                    <p className="font-bold text-stone-700" style={{ fontFamily: "'Fraunces', Georgia, serif" }}>
                      {isKitchenMode ? "This shared pantry is empty" : "Your pantry is empty"}
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
                {filtered.map((item, index) => (
                  <PantryItemRow
                    key={item.key}
                    item={item}
                    dataTutorial={index === 0 ? "pantry-item-0" : undefined}
                    onRemove={() => handleRemove(item.id, item.name)}
                    onEdit={(field, value) => {
                      if (isKitchenMode) {
                        void kitchenPantry.updateItem(item.id, { [field]: value });
                      } else {
                        updatePantryItem?.(item.id, { [field]: value });
                      }
                    }}
                    onAdjustQty={(delta) => {
                      const quantity = adjustQuantityString(item.quantity || suggestQuantityForItem(item.name), delta);
                      if (isKitchenMode) {
                        void kitchenPantry.updateItem(item.id, { quantity });
                      } else {
                        updatePantryItem?.(item.id, { quantity });
                      }
                    }}
                    compact={isMobile}
                  />
                ))}
              </AnimatePresence>
            </div>
          )}
        </div>

        {/* Tips */}
        {(pantryItems?.length ?? 0) > 0 && (
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

      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent className="w-[calc(100vw-1rem)] max-w-sm max-h-[calc(100dvh-1rem)] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add pantry item</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Input
              value={newItem}
              onChange={(e) => {
                const value = e.target.value;
                setNewItem(value);
                if (value.trim()) setNewCategory(detectCategories(value).pantryCategory);
              }}
              onKeyDown={(e) => e.key === "Enter" && handleAdd()}
              placeholder="Olive oil, Garlic, Pasta..."
              className="text-base"
            />
            <Input
              value={newQty}
              onChange={(e) => setNewQty(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAdd()}
              placeholder="Quantity"
              className="text-base"
            />
            <div className="relative">
              <select
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value)}
                className="appearance-none w-full rounded-xl border border-stone-200 bg-white pl-3 pr-8 py-3 text-base font-medium text-stone-600 outline-none"
              >
                {CATEGORIES.filter((c) => c !== "All").map((c) => <option key={c}>{c}</option>)}
              </select>
              <ChevronDown size={12} className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 pointer-events-none" />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => receiptInputRef.current?.click()}
                className="flex items-center justify-center gap-2 rounded-xl border border-stone-200 bg-white px-4 py-3 text-sm font-semibold text-stone-600"
              >
                <Upload size={14} /> Import
              </button>
              <button
                onClick={() => {
                  const hasItem = newItem.trim().length > 0;
                  handleAdd();
                  if (hasItem) setAddDialogOpen(false);
                }}
                disabled={!newItem.trim()}
                className="rounded-xl bg-orange-500 px-4 py-3 text-sm font-semibold text-white disabled:opacity-40"
              >
                Add Item
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {embedded && <MobileActionButton label="Add Item" compact onClick={() => setAddDialogOpen(true)} />}
    </div>
  );
}
