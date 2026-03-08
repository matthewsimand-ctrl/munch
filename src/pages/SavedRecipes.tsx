import { useState, useMemo } from 'react';
import BottomNav from '@/components/BottomNav';
import { useNavigate } from 'react-router-dom';
import { useStore } from '@/lib/store';
import { recipes } from '@/data/recipes';
import { calculateMatch } from '@/lib/matchLogic';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Clock, BarChart3, Check, ShoppingCart, ChevronDown, ChevronUp } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useMemo as useMemoAlias } from 'react';

export default function SavedRecipes() {
  const navigate = useNavigate();
  const { likedRecipes, pantryList, unlikeRecipe } = useStore();
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const pantryNames = useMemoAlias(() => pantryList.map(p => p.name), [pantryList]);

  const saved = useMemo(() => {
    return likedRecipes
      .map((id) => {
        const recipe = recipes.find((r) => r.id === id);
        if (!recipe) return null;
        return { recipe, match: calculateMatch(pantryNames, recipe.ingredients) };
      })
      .filter(Boolean) as { recipe: (typeof recipes)[0]; match: ReturnType<typeof calculateMatch> }[];
  }, [likedRecipes, pantryNames]);

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="px-6 pt-8 pb-4 max-w-md mx-auto w-full">
        <div className="flex items-center gap-3 mb-6">
          <Button variant="ghost" size="icon" onClick={() => navigate('/swipe')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="font-display text-2xl font-bold text-foreground">
            Saved Recipes
          </h1>
          <div className="ml-auto flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => navigate('/grocery')}>
              <ShoppingCart className="h-4 w-4 mr-1" /> Grocery List
            </Button>
            <span className="text-sm text-muted-foreground">{saved.length}</span>
          </div>
        </div>
      </div>

      <div className="px-6 max-w-md mx-auto w-full space-y-4 pb-8">
        {saved.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-muted-foreground mb-4">No saved recipes yet. Start swiping!</p>
            <Button onClick={() => navigate('/swipe')}>Go to Swipe</Button>
          </div>
        ) : (
          saved.map(({ recipe, match }) => {
            const expanded = expandedId === recipe.id;
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
                      <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{recipe.cookTime}</span>
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

                        <Button
                          variant="outline"
                          size="sm"
                          className="text-destructive border-destructive/30 hover:bg-destructive hover:text-destructive-foreground"
                          onClick={() => unlikeRecipe(recipe.id)}
                        >
                          Remove
                        </Button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })
        )}
      </div>
    </div>
  );
}
