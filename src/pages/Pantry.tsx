import { useState, useEffect, useMemo, useRef } from 'react';
import BottomNav from '@/components/BottomNav';
import { useNavigate } from 'react-router-dom';
import { useStore } from '@/lib/store';
import { supabase } from '@/integrations/supabase/client';
import { getCategory, getAllCategories, type IngredientCategory } from '@/lib/ingredientCategories';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, X, Camera, ArrowRight, ChefHat, User, LogOut, SlidersHorizontal, Loader2, Sparkles, ImagePlus } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useToast } from '@/hooks/use-toast';

const QUANTITY_OPTIONS = ['1', '2', '3', '4', '5', '½', '¼', '100g', '200g', '500g', '1kg', '1L'];
const SORT_OPTIONS = [
  { value: 'name', label: 'Name' },
  { value: 'category', label: 'Category' },
  { value: 'recent', label: 'Recently Added' },
];

export default function Pantry() {
  const navigate = useNavigate();
  const { pantryList, addPantryItem, removePantryItem, updatePantryQuantity } = useStore();
  const [input, setInput] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [user, setUser] = useState<any>(null);
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [sortBy, setSortBy] = useState('recent');

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      setUser(session?.user ?? null);
    });
    supabase.auth.getSession().then(({ data: { session } }) => setUser(session?.user ?? null));
    return () => subscription.unsubscribe();
  }, []);

  const categorizedItems = useMemo(() => {
    return pantryList.map((item, index) => ({
      ...item,
      category: getCategory(item.name),
      index,
    }));
  }, [pantryList]);

  const filteredAndSorted = useMemo(() => {
    let items = [...categorizedItems];
    if (filterCategory !== 'all') {
      items = items.filter(i => i.category === filterCategory);
    }
    if (sortBy === 'name') {
      items.sort((a, b) => a.name.localeCompare(b.name));
    } else if (sortBy === 'category') {
      items.sort((a, b) => a.category.localeCompare(b.category) || a.name.localeCompare(b.name));
    }
    // 'recent' keeps original order (reversed = newest first)
    if (sortBy === 'recent') items.reverse();
    return items;
  }, [categorizedItems, filterCategory, sortBy]);

  const activeCategories = useMemo(() => {
    const cats = new Set(categorizedItems.map(i => i.category));
    return getAllCategories().filter(c => cats.has(c));
  }, [categorizedItems]);

  const handleAdd = () => {
    const trimmed = input.trim();
    if (trimmed) {
      addPantryItem(trimmed, quantity);
      setInput('');
      setQuantity('1');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleAdd();
  };

  return (
    <div className="min-h-screen bg-background flex flex-col pb-20">
      <div className="px-6 pt-8 pb-4 max-w-md mx-auto w-full">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <ChefHat className="h-7 w-7 text-primary" />
            <span className="font-display text-xl font-bold text-foreground">My Pantry</span>
          </div>
          <div className="flex items-center gap-1">
            {user ? (
              <Button variant="ghost" size="icon" onClick={() => supabase.auth.signOut()}>
                <LogOut className="h-5 w-5" />
              </Button>
            ) : (
              <Button variant="ghost" size="icon" onClick={() => navigate('/auth')}>
                <User className="h-5 w-5" />
              </Button>
            )}
            <Button onClick={() => navigate('/swipe')} disabled={pantryList.length === 0} size="sm">
              Start Cooking <ArrowRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        </div>

        {/* Add ingredient */}
        <div className="flex gap-2 mb-4">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Add an ingredient..."
            className="flex-1 h-12 bg-card"
          />
          <Select value={quantity} onValueChange={setQuantity}>
            <SelectTrigger className="w-20 h-12 bg-card">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {QUANTITY_OPTIONS.map(q => (
                <SelectItem key={q} value={q}>{q}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button onClick={handleAdd} size="icon" className="h-12 w-12 shrink-0">
            <Plus className="h-5 w-5" />
          </Button>
        </div>

        {/* Filter & Sort bar */}
        {pantryList.length > 0 && (
          <div className="flex gap-2 mb-4">
            <Select value={filterCategory} onValueChange={setFilterCategory}>
              <SelectTrigger className="flex-1 h-9 bg-card text-xs">
                <SlidersHorizontal className="h-3.5 w-3.5 mr-1.5 text-muted-foreground" />
                <SelectValue placeholder="All Categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {activeCategories.map(cat => (
                  <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-32 h-9 bg-card text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SORT_OPTIONS.map(opt => (
                  <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      <div className="flex-1 px-6 max-w-md mx-auto w-full space-y-6 overflow-y-auto">
        {/* Ingredient list */}
        <div className="space-y-1.5">
          <AnimatePresence>
            {filteredAndSorted.map((item) => (
              <motion.div
                key={item.name}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: -60 }}
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-card border border-border"
              >
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-card-foreground capitalize text-sm">{item.name}</p>
                  <p className="text-[10px] text-muted-foreground">{item.category}</p>
                </div>
                <Select
                  value={item.quantity}
                  onValueChange={(val) => updatePantryQuantity(item.name, val)}
                >
                  <SelectTrigger className="w-16 h-7 text-xs bg-secondary border-0">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {QUANTITY_OPTIONS.map(q => (
                      <SelectItem key={q} value={q}>{q}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <button
                  onClick={() => removePantryItem(item.name)}
                  className="text-muted-foreground hover:text-destructive transition-colors shrink-0"
                >
                  <X className="h-4 w-4" />
                </button>
              </motion.div>
            ))}
          </AnimatePresence>
          {pantryList.length === 0 && (
            <p className="text-muted-foreground text-sm italic text-center py-8">
              Start adding what's in your kitchen...
            </p>
          )}
          {pantryList.length > 0 && filteredAndSorted.length === 0 && (
            <p className="text-muted-foreground text-sm italic text-center py-8">
              No ingredients in this category.
            </p>
          )}
        </div>

        {/* Premium photo upload mock */}
        <div className="relative rounded-xl border-2 border-dashed border-border bg-card/50 p-6 text-center overflow-hidden">
          <div className="absolute inset-0 bg-background/60 backdrop-blur-sm z-10 flex flex-col items-center justify-center">
            <Lock className="h-6 w-6 text-muted-foreground mb-2" />
            <span className="text-sm font-semibold text-foreground">Premium Feature</span>
            <span className="text-xs text-muted-foreground mt-1">Snap your fridge, we'll list the ingredients</span>
          </div>
          <Camera className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">Upload a photo of your fridge</p>
          <Button variant="outline" size="sm" className="mt-3" disabled>Upload Photo</Button>
        </div>

        {/* Quick-add suggestions */}
        <div>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Common Staples</p>
          <div className="flex flex-wrap gap-2">
            {['salt', 'pepper', 'olive oil', 'garlic', 'onion', 'butter', 'eggs', 'rice', 'flour', 'sugar'].map((item) => (
              <button
                key={item}
                onClick={() => addPantryItem(item)}
                disabled={pantryList.some(p => p.name === item)}
                className="px-3 py-1 rounded-full text-xs font-medium border border-border bg-card text-foreground hover:border-primary/50 disabled:opacity-40 disabled:cursor-default transition-all"
              >
                + {item}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="p-6 max-w-md mx-auto w-full">
        <p className="text-center text-xs text-muted-foreground">
          {pantryList.length} ingredient{pantryList.length !== 1 ? 's' : ''} in your pantry
        </p>
      </div>
      <BottomNav />
    </div>
  );
}
