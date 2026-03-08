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
  const { toast } = useToast();
  const { pantryList, addPantryItem, addPantryItems, removePantryItem, updatePantryQuantity } = useStore();
  const [input, setInput] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [selectedCategory, setSelectedCategory] = useState<string>('auto');
  const allCategories = getAllCategories();
  const [user, setUser] = useState<any>(null);
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [sortBy, setSortBy] = useState('recent');
  const [scanning, setScanning] = useState(false);
  const [scannedItems, setScannedItems] = useState<string[] | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      setUser(session?.user ?? null);
    });
    supabase.auth.getSession().then(({ data: { session } }) => setUser(session?.user ?? null));
    return () => subscription.unsubscribe();
  }, []);

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    // Show preview
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    setScanning(true);
    setScannedItems(null);

    try {
      // Convert to base64
      const reader = new FileReader();
      const base64 = await new Promise<string>((resolve, reject) => {
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      const { data, error } = await supabase.functions.invoke('scan-fridge', {
        body: { imageBase64: base64 },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      const ingredients: string[] = data?.ingredients || [];
      if (ingredients.length === 0) {
        toast({ title: 'No ingredients found', description: 'Try a clearer photo of your fridge or pantry.' });
      } else {
        setScannedItems(ingredients);
      }
    } catch (err: any) {
      console.error('Fridge scan error:', err);
      toast({ title: 'Scan failed', description: err.message || 'Could not analyze the image.', variant: 'destructive' });
      setPreviewUrl(null);
    } finally {
      setScanning(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const acceptScannedItems = () => {
    if (scannedItems) {
      addPantryItems(scannedItems);
      toast({ title: `Added ${scannedItems.length} ingredients`, description: 'Items added to your pantry.' });
      setScannedItems(null);
      setPreviewUrl(null);
    }
  };

  const dismissScan = () => {
    setScannedItems(null);
    setPreviewUrl(null);
  };

  const categorizedItems = useMemo(() => {
    return pantryList.map((item, index) => ({
      ...item,
      category: item.category as IngredientCategory || getCategory(item.name),
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

  const autoCategory = useMemo(() => {
    const trimmed = input.trim();
    return trimmed ? getCategory(trimmed) : 'Other';
  }, [input]);

  const handleAdd = () => {
    const trimmed = input.trim();
    if (trimmed) {
      const category = selectedCategory === 'auto' ? getCategory(trimmed) : selectedCategory;
      addPantryItem(trimmed, quantity, category);
      setInput('');
      setQuantity('1');
      setSelectedCategory('auto');
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
        <div className="space-y-2 mb-4" data-tutorial="pantry-add-form">
          <div className="flex gap-2">
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
          <Select value={selectedCategory} onValueChange={setSelectedCategory}>
            <SelectTrigger className="w-full h-9 bg-card text-xs">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="auto">
                Auto-detect{input.trim() ? ` → ${autoCategory}` : ''}
              </SelectItem>
              {allCategories.map(cat => (
                <SelectItem key={cat} value={cat}>{cat}</SelectItem>
              ))}
            </SelectContent>
          </Select>
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
        {/* Quick-add suggestions */}
        <div data-tutorial="pantry-quick-add">
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

        {/* AI Fridge Scanner */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={handlePhotoUpload}
        />
        
        {scannedItems ? (
          <div className="rounded-xl border-2 border-primary/30 bg-card p-4 space-y-3">
            {previewUrl && (
              <img src={previewUrl} alt="Scanned" className="w-full h-32 object-cover rounded-lg" />
            )}
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              <span className="text-sm font-semibold text-foreground">Found {scannedItems.length} ingredients</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {scannedItems.map(item => (
                <span
                  key={item}
                  className="px-2.5 py-1 rounded-full text-xs font-medium bg-primary/10 text-primary border border-primary/20"
                >
                  {item}
                </span>
              ))}
            </div>
            <div className="flex gap-2">
              <Button onClick={acceptScannedItems} size="sm" className="flex-1">
                <Plus className="h-4 w-4 mr-1" /> Add All to Pantry
              </Button>
              <Button onClick={dismissScan} variant="outline" size="sm">
                Dismiss
              </Button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={scanning}
            className="w-full rounded-xl border-2 border-dashed border-primary/30 bg-card/50 p-6 text-center hover:border-primary/60 hover:bg-card transition-all disabled:opacity-60"
          >
            {scanning ? (
              <>
                <Loader2 className="h-10 w-10 text-primary mx-auto mb-3 animate-spin" />
                <p className="text-sm font-semibold text-foreground">Analyzing your fridge...</p>
                <p className="text-xs text-muted-foreground mt-1">AI is identifying ingredients</p>
              </>
            ) : (
              <>
                <div className="relative inline-block">
                  <Camera className="h-10 w-10 text-primary mx-auto mb-3" />
                  <Sparkles className="h-4 w-4 text-accent absolute -top-1 -right-1" />
                </div>
                <p className="text-sm font-semibold text-foreground">Scan Your Fridge</p>
                <p className="text-xs text-muted-foreground mt-1">Take a photo and AI will identify ingredients</p>
              </>
            )}
          </button>
        )}


        {/* Quick-add suggestions */}
        <div data-tutorial="pantry-quick-add">
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
