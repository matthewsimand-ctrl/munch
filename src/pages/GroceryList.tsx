import { useMemo, useState } from 'react';
import BottomNav from '@/components/BottomNav';
import { useNavigate } from 'react-router-dom';
import { useStore } from '@/lib/store';
import { useDbRecipes } from '@/hooks/useDbRecipes';
import { calculateMatch } from '@/lib/matchLogic';
import { getCategory, getAisleIndex, type IngredientCategory } from '@/lib/ingredientCategories';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ShoppingCart, Check, ChevronDown, ChevronUp, Download, FileText, Share2, Plus, Minus, X, PlusCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';
import PageHeader from '@/components/PageHeader';

interface GroceryItem {
  ingredient: string;
  category: IngredientCategory;
  recipes: string[];
  quantity?: string;
  isCustom?: boolean;
}

interface AisleGroup {
  category: IngredientCategory;
  items: GroceryItem[];
}

export default function GroceryList() {
  const navigate = useNavigate();
  const { groceryRecipes, pantryList, addPantryItem, savedApiRecipes, customGroceryItems, addCustomGroceryItem, removeCustomGroceryItem, updateCustomGroceryQuantity } = useStore();
  const { data: dbRecipes = [] } = useDbRecipes();
  const [collapsedAisles, setCollapsedAisles] = useState<Set<string>>(new Set());
  const [newItemName, setNewItemName] = useState('');
  const [newItemQty, setNewItemQty] = useState('1');
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingItem, setEditingItem] = useState<string | null>(null);

  const pantryNames = useMemo(() => pantryList.map(p => p.name), [pantryList]);

  const aisleGroups = useMemo(() => {
    const itemMap = new Map<string, { recipes: string[]; quantity?: string; isCustom?: boolean }>();

    // Recipe-based items
    groceryRecipes.forEach((id) => {
      const recipe = dbRecipes.find((r) => r.id === id) || savedApiRecipes[id];
      if (!recipe) return;
      const match = calculateMatch(pantryNames, recipe.ingredients);
      match.missing.forEach((ing) => {
        const existing = itemMap.get(ing) || { recipes: [] };
        existing.recipes.push(recipe.name);
        itemMap.set(ing, existing);
      });
    });

    // Custom items
    customGroceryItems.forEach(({ name, quantity }) => {
      const existing = itemMap.get(name);
      if (existing) {
        existing.quantity = quantity;
        existing.isCustom = true;
      } else {
        itemMap.set(name, { recipes: [], quantity, isCustom: true });
      }
    });

    const items: GroceryItem[] = Array.from(itemMap.entries()).map(([ingredient, data]) => ({
      ingredient,
      category: getCategory(ingredient),
      recipes: data.recipes,
      quantity: data.quantity,
      isCustom: data.isCustom,
    }));

    const groupMap = new Map<IngredientCategory, GroceryItem[]>();
    items.forEach(item => {
      const existing = groupMap.get(item.category) || [];
      existing.push(item);
      groupMap.set(item.category, existing);
    });

    const groups: AisleGroup[] = Array.from(groupMap.entries())
      .map(([category, items]) => ({
        category,
        items: items.sort((a, b) => a.ingredient.localeCompare(b.ingredient)),
      }))
      .sort((a, b) => getAisleIndex(a.category) - getAisleIndex(b.category));

    return groups;
  }, [groceryRecipes, pantryNames, dbRecipes, savedApiRecipes, customGroceryItems]);

  const totalItems = aisleGroups.reduce((sum, g) => sum + g.items.length, 0);

  const toggleAisle = (category: string) => {
    setCollapsedAisles(prev => {
      const next = new Set(prev);
      if (next.has(category)) next.delete(category);
      else next.add(category);
      return next;
    });
  };

  const handleAddCustomItem = () => {
    const name = newItemName.trim();
    if (!name) return;
    addCustomGroceryItem(name, newItemQty || '1');
    setNewItemName('');
    setNewItemQty('1');
    setShowAddForm(false);
    toast.success(`Added ${name} to grocery list`);
  };

  const handleCheckOff = (ingredient: string, isCustom?: boolean) => {
    addPantryItem(ingredient);
    if (isCustom) removeCustomGroceryItem(ingredient);
  };

  const incrementQty = (name: string, currentQty: string) => {
    const num = parseInt(currentQty) || 1;
    updateCustomGroceryQuantity(name, String(num + 1));
  };

  const decrementQty = (name: string, currentQty: string) => {
    const num = parseInt(currentQty) || 1;
    if (num <= 1) return;
    updateCustomGroceryQuantity(name, String(num - 1));
  };

  const AISLE_EMOJI: Record<string, string> = {
    'Produce': '🥬',
    'Meat & Seafood': '🥩',
    'Dairy & Eggs': '🥛',
    'Baking': '🧁',
    'Grains & Pasta': '🌾',
    'Canned & Jarred': '🥫',
    'Oils & Condiments': '🫒',
    'Spices & Seasonings': '🧂',
    'Beverages': '🥤',
    'Other': '📦',
  };

  const buildChecklistText = () => {
    let text = '🛒 Grocery List\n\n';
    aisleGroups.forEach(({ category, items }) => {
      text += `${AISLE_EMOJI[category] || '📦'} ${category}\n`;
      items.forEach(({ ingredient, quantity }) => {
        text += `☐ ${ingredient}${quantity ? ` (×${quantity})` : ''}\n`;
      });
      text += '\n';
    });
    return text;
  };

  const exportAsAppleNote = () => {
    const text = buildChecklistText();
    if (navigator.share) {
      navigator.share({ title: 'Grocery List', text }).catch(() => {
        navigator.clipboard.writeText(text);
        toast.success('Copied to clipboard — paste into Apple Notes');
      });
    } else {
      navigator.clipboard.writeText(text);
      toast.success('Copied to clipboard — paste into Apple Notes');
    }
  };

  const exportAsGoogleDoc = () => {
    const text = buildChecklistText();
    const html = aisleGroups.map(({ category, items }) =>
      `<h3>${AISLE_EMOJI[category] || '📦'} ${category}</h3><ul style="list-style:none;padding:0;">${items.map(({ ingredient, quantity }) =>
        `<li>☐ ${ingredient}${quantity ? ` (×${quantity})` : ''}</li>`
      ).join('')}</ul>`
    ).join('');

    const blob = new Blob([html], { type: 'text/html' });
    const item = new ClipboardItem({ 'text/html': blob, 'text/plain': new Blob([text], { type: 'text/plain' }) });
    navigator.clipboard.write([item]).then(() => {
      toast.success('Copied as checklist — paste into Google Docs');
    }).catch(() => {
      navigator.clipboard.writeText(text);
      toast.success('Copied to clipboard — paste into Google Docs');
    });
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="px-6 pt-8 pb-4 max-w-md mx-auto w-full">
        <div className="flex items-center gap-3 mb-2" data-tutorial="grocery-header">
          <button onClick={() => navigate('/dashboard')} className="flex items-center gap-2">
            <ShoppingCart className="h-6 w-6 text-primary" />
            <span className="font-display text-xl font-bold text-foreground">Grocery List</span>
          </button>
          <div className="ml-auto flex items-center gap-2">
            {totalItems > 0 && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <Share2 className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={exportAsAppleNote}>
                    <FileText className="h-4 w-4 mr-2" />
                    Apple Notes
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={exportAsGoogleDoc}>
                    <Download className="h-4 w-4 mr-2" />
                    Google Docs Checklist
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => setShowAddForm(!showAddForm)}
            >
              <PlusCircle className="h-4 w-4" />
            </Button>
            <span className="text-sm text-muted-foreground">{totalItems} items</span>
            <Button variant="ghost" size="icon" onClick={() => navigate('/settings')}>
              <User className="h-5 w-5" />
            </Button>
          </div>
        </div>

        {/* Add custom item form */}
        <AnimatePresence>
          {showAddForm && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="flex items-center gap-2 py-3">
                <Input
                  placeholder="Item name..."
                  value={newItemName}
                  onChange={(e) => setNewItemName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAddCustomItem()}
                  className="flex-1 h-9 text-sm"
                  autoFocus
                />
                <Input
                  type="number"
                  min="1"
                  value={newItemQty}
                  onChange={(e) => setNewItemQty(e.target.value)}
                  className="w-16 h-9 text-sm text-center"
                  placeholder="Qty"
                />
                <Button size="sm" onClick={handleAddCustomItem} className="h-9 px-3">
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {totalItems > 0 && (
          <p className="text-xs text-muted-foreground">
            Sorted by grocery aisle • {aisleGroups.length} sections
          </p>
        )}
      </div>

      <div className="px-6 max-w-md mx-auto w-full space-y-4 pb-8">
        {totalItems === 0 ? (
          <div className="text-center py-16">
            <ShoppingCart className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground mb-2">Your grocery list is empty!</p>
            <p className="text-sm text-muted-foreground mb-4">
              Add items from recipes or tap + to add your own.
            </p>
            <div className="flex gap-2 justify-center">
              <Button onClick={() => navigate('/saved')}>View Recipes</Button>
              <Button variant="outline" onClick={() => setShowAddForm(true)}>
                <Plus className="h-4 w-4 mr-1" /> Add Item
              </Button>
            </div>
          </div>
        ) : (
          aisleGroups.map(({ category, items }) => {
            const collapsed = collapsedAisles.has(category);
            return (
              <div key={category}>
                <button
                  onClick={() => toggleAisle(category)}
                  className="w-full flex items-center gap-2 py-2 text-left group"
                >
                  <span className="text-base">{AISLE_EMOJI[category] || '📦'}</span>
                  <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground group-hover:text-foreground transition-colors">
                    {category}
                  </span>
                  <span className="text-[10px] text-muted-foreground bg-secondary px-1.5 py-0.5 rounded-full">
                    {items.length}
                  </span>
                  <div className="flex-1" />
                  {collapsed ? (
                    <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                  ) : (
                    <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" />
                  )}
                </button>
                <AnimatePresence>
                  {!collapsed && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden space-y-1.5"
                    >
                      {items.map(({ ingredient, recipes: recipeNames, quantity, isCustom }) => (
                        <motion.div
                          key={ingredient}
                          initial={{ opacity: 0, y: 6 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, x: -60 }}
                          className="flex items-center gap-3 p-3 rounded-xl bg-card border border-border"
                        >
                          <button
                            onClick={() => handleCheckOff(ingredient, isCustom)}
                            className="h-7 w-7 rounded-full border-2 border-primary/30 flex items-center justify-center hover:bg-primary hover:text-primary-foreground hover:border-primary transition-all shrink-0"
                          >
                            <Check className="h-3.5 w-3.5" />
                          </button>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-card-foreground capitalize text-sm">{ingredient}</p>
                            {recipeNames.length > 0 && (
                              <p className="text-[10px] text-muted-foreground truncate">
                                For: {recipeNames.join(', ')}
                              </p>
                            )}
                            {isCustom && recipeNames.length === 0 && (
                              <p className="text-[10px] text-muted-foreground">Manually added</p>
                            )}
                          </div>

                          {/* Quantity controls for custom items */}
                          {isCustom && (
                            <div className="flex items-center gap-1 shrink-0">
                              <button
                                onClick={() => decrementQty(ingredient, quantity || '1')}
                                className="h-6 w-6 rounded-full flex items-center justify-center text-muted-foreground hover:bg-secondary transition-colors"
                              >
                                <Minus className="h-3 w-3" />
                              </button>
                              <span className="text-xs font-medium w-6 text-center text-foreground">
                                {quantity || '1'}
                              </span>
                              <button
                                onClick={() => incrementQty(ingredient, quantity || '1')}
                                className="h-6 w-6 rounded-full flex items-center justify-center text-muted-foreground hover:bg-secondary transition-colors"
                              >
                                <Plus className="h-3 w-3" />
                              </button>
                              <button
                                onClick={() => removeCustomGroceryItem(ingredient)}
                                className="h-6 w-6 rounded-full flex items-center justify-center text-muted-foreground hover:text-destructive transition-colors ml-1"
                              >
                                <X className="h-3 w-3" />
                              </button>
                            </div>
                          )}
                        </motion.div>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })
        )}
      </div>
      <BottomNav />
    </div>
  );
}
