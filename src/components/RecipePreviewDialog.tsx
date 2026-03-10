import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import type { Recipe } from '@/data/recipes';
import type { MatchResult } from '@/lib/matchLogic';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Clock, BarChart3, Check, ShoppingCart, MapPin, ChefHat, Users, Heart, Play, Sparkles } from 'lucide-react';
import MatchBadge from '@/components/MatchBadge';
import RecipeTweakDialog from '@/components/RecipeTweakDialog';
import NutritionCard from '@/components/NutritionCard';

interface Props {
  recipe: Recipe | null;
  match: MatchResult | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  chefName?: string | null;
  chefId?: string | null;
  mode?: 'default' | 'explore';
  onSave?: (recipe: Recipe) => void;
  onAddMissingToGrocery?: (recipe: Recipe, missingIngredients: string[]) => void;
}

const SCALE_OPTIONS = [
  { label: '1/2x', factor: 0.5 },
  { label: '1x', factor: 1 },
  { label: '2x', factor: 2 },
] as const;

function scaleIngredient(ingredient: string, factor: number) {
  if (factor === 1) return ingredient;
  const match = ingredient.match(/^(\d+(?:\.\d+)?)(.*)$/);
  if (!match) return ingredient;
  const scaled = (Number(match[1]) * factor).toFixed(2).replace(/\.00$/, '').replace(/(\.\d)0$/, '$1');
  return `${scaled}${match[2]}`;
}

export default function RecipePreviewDialog({
  recipe,
  match,
  open,
  onOpenChange,
  chefName,
  chefId,
  mode = 'default',
  onSave,
  onAddMissingToGrocery,
}: Props) {
  const navigate = useNavigate();
  const [portionFactor, setPortionFactor] = useState(1);
  const [tweakOpen, setTweakOpen] = useState(false);
  const [addedToGrocery, setAddedToGrocery] = useState(false);

  const fallbackMatch: MatchResult = useMemo(() => ({
    percentage: 0,
    matched: [],
    missing: recipe?.ingredients ?? [],
  }), [recipe]);

  if (!recipe) return null;
  const displayMatch = match ?? fallbackMatch;

  const handleAddMissingToGrocery = () => {
    if (!onAddMissingToGrocery || displayMatch.missing.length === 0) return;
    onAddMissingToGrocery(recipe, displayMatch.missing);
    setAddedToGrocery(true);
    window.setTimeout(() => setAddedToGrocery(false), 1400);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-md h-[90vh] p-0 overflow-hidden flex flex-col">
          <div className="relative h-48 overflow-hidden">
            <img src={recipe.image} alt={recipe.name} className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-background/90 to-transparent" />
            <div className="absolute bottom-3 left-4 right-4">
              <DialogHeader>
                <DialogTitle className="text-xl text-foreground">{recipe.name}</DialogTitle>
              </DialogHeader>
            </div>
            {chefName && chefId && (
              <button
                onClick={() => { onOpenChange(false); navigate(`/chef/${chefId}`); }}
                className="absolute top-3 left-3 inline-flex items-center gap-1 text-[11px] text-white/90 hover:text-white font-medium bg-black/30 backdrop-blur-sm px-2.5 py-1 rounded-full transition-colors"
              >
                <ChefHat className="h-3 w-3" /> by {chefName}
              </button>
            )}
          </div>

          <ScrollArea className="flex-1 min-h-0 px-4 pb-4">
            <div className="space-y-4">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="secondary" className="gap-1"><Clock className="h-3 w-3" /> {recipe.cook_time}</Badge>
                <Badge variant="secondary" className="gap-1"><BarChart3 className="h-3 w-3" /> {recipe.difficulty}</Badge>
                <MatchBadge percentage={displayMatch.percentage} />
                {recipe.cuisine && <Badge variant="outline" className="gap-1"><MapPin className="h-3 w-3" /> {recipe.cuisine}</Badge>}
                {recipe.servings && <Badge variant="secondary" className="gap-1"><Users className="h-3 w-3" /> Serves {recipe.servings}</Badge>}
              </div>

              {!!recipe.tags?.length && (
                <div className="flex flex-wrap gap-1.5">
                  {recipe.tags.slice(0, 4).map((tag) => <Badge key={tag} variant="outline" className="text-xs">{tag}</Badge>)}
                </div>
              )}

              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Portion Size</p>
                <div className="inline-flex rounded-lg border p-1 gap-1">
                  {SCALE_OPTIONS.map((option) => (
                    <button
                      key={option.label}
                      onClick={() => setPortionFactor(option.factor)}
                      className={`px-3 py-1.5 text-xs rounded-md font-semibold ${portionFactor === option.factor ? 'bg-primary text-primary-foreground' : 'text-muted-foreground'}`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Ingredients</p>
                <ul className="space-y-2">
                  {recipe.ingredients.map((ing) => {
                    const scaledIngredient = scaleIngredient(ing, portionFactor);
                    const hasIngredient = displayMatch.matched.some((m) => m.toLowerCase() === ing.toLowerCase());
                    return (
                      <li key={ing} className="text-sm flex items-start gap-2 text-foreground">
                        {hasIngredient ? <Check className="h-4 w-4 mt-0.5 text-emerald-600" /> : <ShoppingCart className="h-4 w-4 mt-0.5 text-orange-500" />}
                        <span>{scaledIngredient}</span>
                      </li>
                    );
                  })}
                </ul>
              </div>

              {recipe.instructions.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Instructions</p>
                  <ol className="space-y-2">
                    {recipe.instructions.map((step, i) => (
                      <li key={i} className="flex gap-2 text-sm text-foreground">
                        <span className="flex-shrink-0 h-5 w-5 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center font-bold">{i + 1}</span>
                        {step}
                      </li>
                    ))}
                  </ol>
                </div>
              )}

              {displayMatch.missing.length > 0 && onAddMissingToGrocery && (
                <motion.button
                  onClick={handleAddMissingToGrocery}
                  whileTap={{ scale: 0.98 }}
                  animate={addedToGrocery ? { scale: [1, 1.02, 1] } : { scale: 1 }}
                  transition={{ duration: 0.3 }}
                  className={`w-full px-3 py-2 rounded-lg border text-sm font-semibold inline-flex items-center justify-center gap-1.5 transition-colors ${
                    addedToGrocery
                      ? 'border-emerald-500/60 bg-emerald-500/10 text-emerald-700'
                      : 'border-border'
                  }`}
                >
                  <motion.span
                    animate={addedToGrocery ? { rotate: [0, -12, 12, 0] } : { rotate: 0 }}
                    transition={{ duration: 0.35 }}
                  >
                    {addedToGrocery ? <Check className="h-4 w-4" /> : <ShoppingCart className="h-4 w-4" />}
                  </motion.span>
                  {addedToGrocery ? 'Added to grocery list' : `Add ${displayMatch.missing.length} missing items`}
                </motion.button>
              )}

              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">AI Nutrition Dashboard</p>
                <NutritionCard
                  recipeId={recipe.id}
                  recipeName={recipe.name}
                  ingredients={recipe.ingredients}
                  servings={recipe.servings ?? 1}
                />
              </div>
            </div>
          </ScrollArea>

          <div className="px-4 pb-4 pt-2 border-t grid grid-cols-2 gap-2">
            {mode === 'default' ? (
              <button onClick={() => setTweakOpen(true)} className="col-span-2 px-3 py-2 rounded-lg border text-sm font-medium inline-flex items-center justify-center gap-1.5">
                <Sparkles className="h-4 w-4" /> AI Tools
              </button>
            ) : (
              <button onClick={() => onSave?.(recipe)} className="col-span-2 px-3 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold inline-flex items-center justify-center gap-1.5">
                <Heart className="h-4 w-4" /> Save Recipe
              </button>
            )}
            {mode === 'default' && (
              <button
                onClick={() => navigate(`/cook/${recipe.id}`)}
                className="col-span-2 px-3 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold inline-flex items-center justify-center gap-1.5"
              >
                <Play className="h-4 w-4" /> Start Cooking
              </button>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {mode === 'default' && (
        <RecipeTweakDialog recipe={recipe} open={tweakOpen} onOpenChange={setTweakOpen} />
      )}
    </>
  );
}
