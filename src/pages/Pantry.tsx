import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '@/lib/store';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, X, Camera, Lock, ArrowRight, ChefHat, User, LogOut } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const QUANTITY_OPTIONS = ['1', '2', '3', '4', '5', '½', '¼', '100g', '200g', '500g', '1kg', '1L'];

export default function Pantry() {
  const navigate = useNavigate();
  const { pantryList, addPantryItem, removePantryItem, updatePantryQuantity } = useStore();
  const [input, setInput] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      setUser(session?.user ?? null);
    });
    supabase.auth.getSession().then(({ data: { session } }) => setUser(session?.user ?? null));
    return () => subscription.unsubscribe();
  }, []);

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
    <div className="min-h-screen bg-background flex flex-col">
      <div className="px-6 pt-8 pb-4 max-w-md mx-auto w-full">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <ChefHat className="h-7 w-7 text-primary" />
            <span className="font-display text-xl font-bold text-foreground">My Pantry</span>
          </div>
          <Button
            onClick={() => navigate('/swipe')}
            disabled={pantryList.length === 0}
            size="sm"
          >
            Start Cooking <ArrowRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
      </div>

      <div className="flex-1 px-6 max-w-md mx-auto w-full space-y-6">
        {/* Add ingredient with quantity */}
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

        {/* Ingredient chips */}
        <div className="flex flex-wrap gap-2 min-h-[60px]">
          <AnimatePresence>
            {pantryList.map((item) => (
              <motion.span
                key={item.name}
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0, opacity: 0 }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-secondary text-secondary-foreground text-sm font-medium"
              >
                <span className="text-xs text-muted-foreground">{item.quantity}×</span>
                {item.name}
                <button
                  onClick={() => removePantryItem(item.name)}
                  className="hover:text-destructive transition-colors"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </motion.span>
            ))}
          </AnimatePresence>
          {pantryList.length === 0 && (
            <p className="text-muted-foreground text-sm italic">
              Start adding what's in your kitchen...
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
          <Button variant="outline" size="sm" className="mt-3" disabled>
            Upload Photo
          </Button>
        </div>

        {/* Quick-add suggestions */}
        <div>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
            Common Staples
          </p>
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
    </div>
  );
}
