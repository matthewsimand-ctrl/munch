import { useMemo } from 'react';
import BottomNav from '@/components/BottomNav';
import { useNavigate } from 'react-router-dom';
import { useStore } from '@/lib/store';
import { recipes } from '@/data/recipes';
import { calculateMatch } from '@/lib/matchLogic';
import { Button } from '@/components/ui/button';
import { ArrowLeft, ShoppingCart, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function GroceryList() {
  const navigate = useNavigate();
  const { likedRecipes, pantryList, addPantryItem } = useStore();

  const pantryNames = useMemo(() => pantryList.map(p => p.name), [pantryList]);

  const groceryItems = useMemo(() => {
    const itemMap = new Map<string, string[]>();
    likedRecipes.forEach((id) => {
      const recipe = recipes.find((r) => r.id === id);
      if (!recipe) return;
      const match = calculateMatch(pantryNames, recipe.ingredients);
      match.missing.forEach((ing) => {
        const existing = itemMap.get(ing) || [];
        existing.push(recipe.name);
        itemMap.set(ing, existing);
      });
    });
    return Array.from(itemMap.entries()).map(([ingredient, recipeNames]) => ({
      ingredient,
      recipes: recipeNames,
    }));
  }, [likedRecipes, pantryNames]);

  const handleMarkOwned = (ingredient: string) => {
    addPantryItem(ingredient);
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="px-6 pt-8 pb-4 max-w-md mx-auto w-full">
        <div className="flex items-center gap-3 mb-6">
          <Button variant="ghost" size="icon" onClick={() => navigate('/saved')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-2">
            <ShoppingCart className="h-6 w-6 text-primary" />
            <h1 className="font-display text-2xl font-bold text-foreground">Grocery List</h1>
          </div>
          <span className="ml-auto text-sm text-muted-foreground">{groceryItems.length} items</span>
        </div>
      </div>

      <div className="px-6 max-w-md mx-auto w-full space-y-3 pb-8">
        {groceryItems.length === 0 ? (
          <div className="text-center py-16">
            <ShoppingCart className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground mb-2">Your grocery list is empty!</p>
            <p className="text-sm text-muted-foreground mb-4">Save some recipes and missing ingredients will appear here.</p>
            <Button onClick={() => navigate('/swipe')}>Find Recipes</Button>
          </div>
        ) : (
          <AnimatePresence>
            {groceryItems.map(({ ingredient, recipes: recipeNames }) => (
              <motion.div
                key={ingredient}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: -100 }}
                className="flex items-center gap-3 p-3 rounded-xl bg-card border border-border"
              >
                <button
                  onClick={() => handleMarkOwned(ingredient)}
                  className="h-8 w-8 rounded-full border-2 border-primary/30 flex items-center justify-center hover:bg-primary hover:text-primary-foreground hover:border-primary transition-all shrink-0"
                >
                  <Check className="h-4 w-4" />
                </button>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-card-foreground capitalize">{ingredient}</p>
                  <p className="text-xs text-muted-foreground truncate">
                    For: {recipeNames.join(', ')}
                  </p>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        )}
      </div>
      <BottomNav />
    </div>
  );
}
