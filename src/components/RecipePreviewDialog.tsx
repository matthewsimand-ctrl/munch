import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import type { Recipe } from '@/data/recipes';
import type { MatchResult } from '@/lib/matchLogic';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Clock, BarChart3, Check, ShoppingCart, MapPin, ChefHat, Users, Heart, Play, Sparkles, ExternalLink } from 'lucide-react';
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
    status: 'needs-shopping',
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
        <DialogContent
          className="max-w-md h-[90vh] p-0 overflow-hidden flex flex-col"
          onOpenAutoFocus={(event) => event.preventDefault()}
          data-tutorial="recipe-dialog-content"
        >
          <div className="relative h-48 overflow-hidden">
            <img src={recipe.image} alt={recipe.name} className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-background/90 to-transparent" />
            <div className="absolute bottom-3 left-4 right-4">
              <DialogHeader data-tutorial="recipe-dialog-header">
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

              {/* ── Recipe Content ── */}
              {recipe.source_url ? (
                <div className="space-y-4">
                  <div className="relative w-full aspect-[4/5] rounded-xl overflow-hidden border bg-muted group">
                    <iframe
                      src={recipe.source_url}
                      className="w-full h-full border-0"
                      title={recipe.name}
                      sandbox="allow-same-origin allow-scripts allow-popups allow-forms"
                    />

                    {/* Fallback overlay for CSP blocked frames - shown on hover or if frame fails (partial UI) */}
                    <div className="absolute inset-0 flex flex-col items-center justify-center p-6 bg-stone-50/95 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none group-focus-within:opacity-100 dark:bg-stone-900/95">
                      <ExternalLink className="h-8 w-8 text-orange-400 mb-2" />
                      <p className="text-sm font-medium text-stone-700 dark:text-stone-300 text-center px-4">
                        If the website doesn't load here, it may be blocking embedding.
                      </p>
                      <a
                        href={recipe.source_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-4 px-4 py-2 bg-orange-500 text-white rounded-full text-xs font-bold hover:bg-orange-600 transition-colors pointer-events-auto shadow-sm shadow-orange-200"
                      >
                        Open Website Directly
                      </a>
                    </div>
                  </div>

                  <a
                    href={recipe.source_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-between p-3.5 rounded-xl border border-orange-100 bg-orange-50/20 hover:bg-orange-50 transition-colors group"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-white shadow-sm flex items-center justify-center overflow-hidden border border-orange-50">
                        <img
                          src={`https://www.google.com/s2/favicons?domain=${new URL(recipe.source_url).hostname}&sz=32`}
                          alt=""
                          className="h-5 w-5"
                          onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                        />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-stone-800">Source: {new URL(recipe.source_url).hostname}</p>
                        <p className="text-[10px] text-stone-500">View original formatting and photos</p>
                      </div>
                    </div>
                    <ExternalLink size={14} className="text-orange-400 group-hover:text-orange-600 transition-colors" />
                  </a>
                </div>
              ) : (
                <div className="space-y-6">
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
                      data-tutorial="add-missing-button"
                      whileTap={{ scale: 0.98 }}
                      animate={addedToGrocery ? { scale: [1, 1.02, 1] } : { scale: 1 }}
                      transition={{ duration: 0.3 }}
                      className={`w-full px-3 py-2 rounded-lg border text-sm font-semibold inline-flex items-center justify-center gap-1.5 transition-colors ${addedToGrocery
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
                      {addedToGrocery ? 'Added to grocery list' : `Add ${displayMatch.missing.length} missing ingredients to Grocery List`}
                    </motion.button>
                  )}

                  <div>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Nutrition Dashboard</p>
                    <NutritionCard
                      recipeId={recipe.id}
                      recipeName={recipe.name}
                      ingredients={recipe.ingredients}
                      servings={recipe.servings ?? 1}
                    />
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>

          <div className="px-4 pb-4 pt-2 border-t grid grid-cols-2 gap-2">
            {mode === 'default' ? (
              <button onClick={() => setTweakOpen(true)} className="col-span-2 px-3 py-2 rounded-lg border text-sm font-medium inline-flex items-center justify-center gap-1.5">
                <Sparkles className="h-4 w-4" /> Remix Recipe
              </button>
            ) : (
              <button
                onClick={() => onSave?.(recipe)}
                data-tutorial="like-button"
                className="col-span-2 px-3 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold inline-flex items-center justify-center gap-1.5"
              >
                <Heart className="h-4 w-4" /> Save Recipe
              </button>
            )}
            {mode === 'default' && (
              <button
                onClick={() => navigate(`/cook/${recipe.id}`)}
                data-tutorial="start-cooking-button"
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
