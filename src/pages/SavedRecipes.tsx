import { useState, useMemo } from 'react';
import BottomNav from '@/components/BottomNav';
import { useNavigate } from 'react-router-dom';
import { useStore } from '@/lib/store';
import { useDbRecipes } from '@/hooks/useDbRecipes';
import { calculateMatch } from '@/lib/matchLogic';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Clock, BarChart3, Check, ShoppingCart, ChevronDown, ChevronUp, Play, Plus } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';

import CreateRecipeForm from '@/components/CreateRecipeForm';
import ImportRecipeDialog from '@/components/ImportRecipeDialog';
import NutritionCard from '@/components/NutritionCard';
import { toast } from 'sonner';

export default function SavedRecipes() {
  const navigate = useNavigate();
  const { likedRecipes, pantryList, unlikeRecipe, savedApiRecipes, groceryRecipes, addToGrocery, removeFromGrocery } = useStore();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const { data: dbRecipes = [] } = useDbRecipes();

  const pantryNames = useMemo(() => pantryList.map(p => p.name), [pantryList]);

  const saved = useMemo(() => {
    return likedRecipes
      .map((id) => {
        const recipe = dbRecipes.find((r) => r.id === id) || savedApiRecipes[id];
        if (!recipe) return null;
        return { recipe, match: calculateMatch(pantryNames, recipe.ingredients), source: (recipe as any).source };
      })
      .filter(Boolean) as { recipe: (typeof dbRecipes)[0]; match: ReturnType<typeof calculateMatch>; source?: string }[];
  }, [likedRecipes, pantryNames, savedApiRecipes, dbRecipes]);

  const grocerySet = useMemo(() => new Set(groceryRecipes), [groceryRecipes]);

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="px-6 pt-8 pb-4 max-w-md mx-auto w-full">
        <div className="flex items-center gap-3 mb-6">
          <Button variant="ghost" size="icon" onClick={() => navigate('/swipe')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="font-display text-2xl font-bold text-foreground" data-tutorial="saved-header">
            My Recipes
          </h1>
          <div className="ml-auto flex items-center gap-2" data-tutorial="saved-actions">
            <ImportRecipeDialog />
            <Dialog open={createOpen} onOpenChange={setCreateOpen}>
              <DialogTrigger asChild>
                <Button size="sm">
                  <Plus className="h-4 w-4 mr-1" /> Create
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md max-h-[90vh]">
                <DialogHeader>
                  <DialogTitle>Create Recipe</DialogTitle>
                </DialogHeader>
                <div className="max-h-[70vh] overflow-y-auto pr-2 pl-1 pb-2">
                  <CreateRecipeForm onClose={() => setCreateOpen(false)} />
                </div>
              </DialogContent>
            </Dialog>
            <Button variant="outline" size="sm" onClick={() => navigate('/grocery')}>
              <ShoppingCart className="h-4 w-4 mr-1" /> Grocery
            </Button>
            <span className="text-sm text-muted-foreground">{saved.length}</span>
          </div>
        </div>
      </div>

      <div className="px-6 max-w-md mx-auto w-full space-y-4 pb-8">
        {saved.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-muted-foreground mb-4">No saved recipes yet. Start swiping!</p>
            <Button onClick={() => navigate('/swipe')}>Go to Browse</Button>
          </div>
        ) : (
          saved.map(({ recipe, match, source }) => {
            const expanded = expandedId === recipe.id;
            const isInGrocery = grocerySet.has(recipe.id);
            const borderColor =
              match.status === 'perfect' ? 'border-success' :
              match.status === 'almost' ? 'border-warning' : 'border-border';

            return (
              <motion.div
                key={recipe.id}
                layout
                className={`rounded-xl border-2 ${borderColor} bg-card overflow-hidden shadow-sm`}
              >
                <button
                  onClick={() => setExpandedId(expanded ? null : recipe.id)}
                  className="w-full flex items-center gap-3 p-3 text-left"
                >
                  <img
                    src={recipe.image}
                    alt={recipe.name}
                    className="h-16 w-16 rounded-lg object-cover flex-shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <h3 className="font-display font-bold text-card-foreground truncate">
                      {recipe.name}
                    </h3>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                      <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{recipe.cook_time}</span>
                      <span className="flex items-center gap-1"><BarChart3 className="h-3 w-3" />{recipe.difficulty}</span>
                      <span className="font-semibold text-primary">{match.percentage}%</span>
                      
                    </div>
                  </div>
                  {expanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                </button>

                <AnimatePresence>
                  {expanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden"
                    >
                      <div className="px-4 pb-4 space-y-4">
                        {/* Ingredients */}
                        <div>
                          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Ingredients</p>
                          <div className="flex flex-wrap gap-1.5">
                            {match.matched.map((ing) => (
                              <span key={ing} className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-success/10 text-success font-medium">
                                <Check className="h-3 w-3" />{ing}
                              </span>
                            ))}
                            {match.missing.map((ing) => (
                              <span key={ing} className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-destructive/10 text-destructive font-medium">
                                <ShoppingCart className="h-3 w-3" />{ing}
                              </span>
                            ))}
                          </div>
                        </div>

                        {/* Instructions */}
                        <div>
                          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Instructions</p>
                          <ol className="space-y-2">
                            {recipe.instructions.map((step, i) => (
                              <li key={i} className="flex gap-2 text-sm text-card-foreground">
                                <span className="flex-shrink-0 h-5 w-5 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center font-bold">
                                  {i + 1}
                                </span>
                                {step}
                              </li>
                            ))}
                          </ol>
                        </div>

                        {/* Nutrition */}
                        <NutritionCard
                          recipeId={recipe.id}
                          recipeName={recipe.name}
                          ingredients={recipe.ingredients}
                          servings={1}
                        />

                        <div className="flex flex-wrap gap-2">
                          <Button
                            size="sm"
                            onClick={() => navigate(`/cook/${recipe.id}`)}
                          >
                            <Play className="h-4 w-4 mr-1" /> Cook
                          </Button>

                          {/* Add/Remove from grocery */}
                          {match.missing.length > 0 && (
                            isInGrocery ? (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  removeFromGrocery(recipe.id);
                                  toast.success('Removed from grocery list');
                                }}
                              >
                                <Check className="h-4 w-4 mr-1" /> In Grocery List
                              </Button>
                            ) : (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  addToGrocery(recipe.id);
                                  toast.success(`Added ${match.missing.length} missing items to grocery list`);
                                }}
                              >
                                <ShoppingCart className="h-4 w-4 mr-1" /> Add {match.missing.length} to Grocery
                              </Button>
                            )
                          )}

                          <Button
                            variant="outline"
                            size="sm"
                            className="text-destructive border-destructive/30 hover:bg-destructive hover:text-destructive-foreground"
                            onClick={() => unlikeRecipe(recipe.id)}
                          >
                            Remove
                          </Button>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })
        )}
      </div>
      <BottomNav />
    </div>
  );
}
