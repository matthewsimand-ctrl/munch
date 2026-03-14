import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import type { Recipe } from '@/data/recipes';
import type { MatchResult } from '@/lib/matchLogic';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Clock, BarChart3, Check, ShoppingCart, MapPin, ChefHat, Users, Heart, Play, Sparkles, ExternalLink, FileText, Share2 } from 'lucide-react';
import MatchBadge from '@/components/MatchBadge';
import RecipeTweakDialog from '@/components/RecipeTweakDialog';
import NutritionCard from '@/components/NutritionCard';
import { getRecipeSourceBadge, isImportedCommunityRecipe } from '@/lib/recipeAttribution';
import { useStore } from '@/lib/store';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

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
  onRegenerate?: () => void;
}

const SCALE_OPTIONS = [
  { label: '1/2x', factor: 0.5 },
  { label: '1x', factor: 1 },
  { label: '2x', factor: 2 },
] as const;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/** Domains that block iframe embedding via frame-ancestors CSP (e.g. Food Network) */
const EMBED_BLOCKED_DOMAINS = [
  'foodnetwork.com',
  'www.foodnetwork.com',
  'allrecipes.com',
  'www.allrecipes.com',
  'epicurious.com',
  'www.epicurious.com',
];

function getEmbedBlockReason(url: string): string | null {
  try {
    const host = new URL(url).hostname.toLowerCase();
    const blockedDomain = EMBED_BLOCKED_DOMAINS.find((d) => host === d || host.endsWith('.' + d));
    return blockedDomain ? `blocked-domain:${blockedDomain}` : null;
  } catch {
    return null;
  }
}

/** Only imported recipes (from URL) show the source site; API recipes (MealDB, etc.) use ingredients/instructions */
function isImportedRecipe(recipe: Recipe): boolean {
  return recipe.source?.toLowerCase() === 'imported';
}

function hasStructuredRecipeContent(recipe: Recipe): boolean {
  return recipe.ingredients.length > 0 || recipe.instructions.length > 0;
}

const EMPTY_IMPORTED_PREVIEW = {
  sourceUrl: '',
  rawPayloadKeys: [] as string[],
};

function getImportedPreviewData(recipe: Recipe) {
  if (!recipe.raw_api_payload || typeof recipe.raw_api_payload !== 'object' || Array.isArray(recipe.raw_api_payload)) {
    return EMPTY_IMPORTED_PREVIEW;
  }

  const payload = recipe.raw_api_payload as Record<string, unknown>;

  return {
    sourceUrl: typeof payload.source_url === 'string' ? payload.source_url : '',
    rawPayloadKeys: Object.keys(payload),
  };
}

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
  onRegenerate,
}: Props) {
  const navigate = useNavigate();
  const [portionFactor, setPortionFactor] = useState(1);
  const [tweakOpen, setTweakOpen] = useState(false);
  const [addedToGrocery, setAddedToGrocery] = useState(false);
  const { activeKitchenId, activeKitchenName } = useStore();

  const fallbackMatch: MatchResult = useMemo(() => ({
    percentage: 0,
    matched: [],
    missing: recipe?.ingredients ?? [],
    status: 'needs-shopping',
  }), [recipe]);

  const displayMatch = match ?? fallbackMatch;
  const importedRecipe = recipe ? isImportedRecipe(recipe) : false;
  const embedBlockReason = recipe?.source_url ? getEmbedBlockReason(recipe.source_url) : null;
  const importedPreview = useMemo(() => recipe ? getImportedPreviewData(recipe) : EMPTY_IMPORTED_PREVIEW, [recipe]);
  const canEmbedSource = Boolean(recipe?.source_url) && !embedBlockReason;
  const showStructuredFallback = recipe ? importedRecipe && hasStructuredRecipeContent(recipe) : false;
  const sourceHostname = useMemo(() => {
    const url = recipe?.source_url || importedPreview.sourceUrl;

    if (!url) return '';

    try {
      return new URL(url).hostname;
    } catch {
      return '';
    }
  }, [importedPreview.sourceUrl, recipe?.source_url]);

  useEffect(() => {
    if (!open || !recipe || !importedRecipe || !recipe.source_url || !embedBlockReason) return;

    console.info('[RecipePreviewDialog] Source embed disabled', {
      recipeId: recipe.id,
      recipeName: recipe.name,
      sourceUrl: recipe.source_url,
      reason: embedBlockReason,
      hasStructuredFallback: showStructuredFallback,
      rawPayloadKeys: importedPreview.rawPayloadKeys,
    });
  }, [embedBlockReason, importedPreview.rawPayloadKeys, importedRecipe, open, recipe?.id, recipe?.name, recipe?.source_url, showStructuredFallback]);

  if (!recipe) return null;

  const handleShareRecipe = async () => {
    const shareUrl = recipe.source_url || window.location.origin;
    const sharePayload = {
      title: recipe.name,
      text: `Check out this recipe on Munch: ${recipe.name}`,
      url: shareUrl,
    };

    try {
      if (navigator.share) {
        await navigator.share(sharePayload);
      } else {
        await navigator.clipboard.writeText(`${sharePayload.text}\n${sharePayload.url}`);
      }
    } catch {
      // Ignore cancelled shares; clipboard fallback only runs when share API is unavailable.
    }
  };

  const handleAddMissingToGrocery = () => {
    if (!onAddMissingToGrocery || displayMatch.missing.length === 0) return;
    onAddMissingToGrocery(recipe, displayMatch.missing);
    setAddedToGrocery(true);
    window.setTimeout(() => setAddedToGrocery(false), 1400);
  };

  const handleShareToKitchen = async () => {
    if (!activeKitchenId) {
      toast.info('Pick an active kitchen first.');
      return;
    }

    if (!UUID_PATTERN.test(recipe.id)) {
      toast.info('Save or import this recipe into Munch before sharing it to a kitchen.');
      return;
    }

    try {
      const { data: existing, error: existingError } = await supabase
        .from('kitchen_recipe_shares')
        .select('id')
        .eq('kitchen_id', activeKitchenId)
        .eq('recipe_id', recipe.id)
        .maybeSingle();

      if (existingError) throw existingError;
      if (existing) {
        toast.info(`Already shared to ${activeKitchenName || 'this kitchen'}.`);
        return;
      }

      const { data: authData } = await supabase.auth.getUser();
      const user = authData.user;
      if (!user) {
        toast.error('Please sign in to share recipes to a kitchen.');
        return;
      }

      const { error } = await supabase
        .from('kitchen_recipe_shares')
        .insert({
          kitchen_id: activeKitchenId,
          recipe_id: recipe.id,
          shared_by_user_id: user.id,
        });

      if (error) throw error;
      toast.success(`Shared to ${activeKitchenName || 'your kitchen'}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Could not share recipe to kitchen';
      toast.error(message);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent
          className={`h-[90vh] p-0 overflow-hidden flex flex-col ${recipe.source_url && importedRecipe ? 'max-w-2xl' : 'max-w-md'}`}
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
                {isImportedCommunityRecipe(recipe) && (
                  <Badge variant="outline" className="gap-1 text-orange-700 border-orange-200 bg-orange-50">
                    <FileText className="h-3 w-3" /> {getRecipeSourceBadge(recipe)}
                  </Badge>
                )}
                {recipe.cuisine && <Badge variant="outline" className="gap-1"><MapPin className="h-3 w-3" /> {recipe.cuisine}</Badge>}
                {recipe.servings && <Badge variant="secondary" className="gap-1"><Users className="h-3 w-3" /> Serves {recipe.servings}</Badge>}
              </div>

              {!!recipe.tags?.length && (
                <div className="flex flex-wrap gap-1.5">
                  {recipe.tags.slice(0, 4).map((tag) => <Badge key={tag} variant="outline" className="text-xs">{tag}</Badge>)}
                </div>
              )}

              {recipe.source_url && importedRecipe && (
                <a
                  href={recipe.source_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2.5 p-3 rounded-xl border border-stone-200 bg-stone-50/70 hover:bg-stone-100 transition-colors"
                >
                  {sourceHostname && (
                    <img
                      src={`https://www.google.com/s2/favicons?domain=${sourceHostname}&sz=32`}
                      alt=""
                      className="h-5 w-5 shrink-0"
                      onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                    />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold uppercase tracking-wide text-stone-400">Open Source</p>
                    <p className="text-sm font-medium text-stone-700 truncate">
                      {sourceHostname || recipe.source_url}
                    </p>
                  </div>
                  <ExternalLink size={14} className="text-stone-400 shrink-0" />
                </a>
              )}

              {/* ── Recipe Content ── */}
              {recipe.source_url && importedRecipe && canEmbedSource ? (
                <div className="space-y-3">
                  <div className="relative w-full aspect-[4/5] rounded-xl overflow-auto border border-stone-200 bg-muted">
                    <iframe
                      src={recipe.source_url}
                      className="w-full min-w-full h-full min-h-full border-0 rounded-xl"
                      title={recipe.name}
                      sandbox="allow-same-origin allow-scripts allow-popups allow-forms"
                    />
                    <a
                      href={recipe.source_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="absolute top-2 right-2 inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-xs font-semibold bg-white/95 backdrop-blur-sm border border-stone-200 text-stone-700 shadow-sm hover:bg-orange-500 hover:text-white hover:border-orange-400 transition-colors"
                    >
                      <ExternalLink size={12} /> Open in Browser
                    </a>
                  </div>
                </div>
              ) : (
                <div className="space-y-6">
                  {recipe.source_url && importedRecipe && (
                    <div
                      className="relative rounded-xl overflow-hidden border border-stone-200 bg-stone-100 p-4"
                      style={{ minHeight: 120 }}
                    >
                      <div className="absolute inset-0">
                        {recipe.image && recipe.image !== '/placeholder.svg' ? (
                          <img src={recipe.image} alt="" className="w-full h-full object-cover opacity-20" />
                        ) : null}
                        <div className="absolute inset-0 bg-gradient-to-t from-stone-900/10 to-white/80" />
                      </div>
                      <div className="relative z-10 flex flex-wrap items-center gap-3 justify-between">
                        <div className="space-y-1">
                          <p className="text-sm font-medium text-stone-800">
                            {canEmbedSource
                              ? 'Showing imported recipe details below the site preview'
                              : 'This site doesn&apos;t allow direct embedding'}
                          </p>
                          <p className="text-xs text-stone-500">
                            {showStructuredFallback
                              ? 'You can still use the imported ingredients and instructions for the Let Me Cook flow.'
                              : 'Open the original page in your browser to view it.'}
                          </p>
                        </div>
                        <a
                          href={recipe.source_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full text-sm font-semibold bg-orange-500 text-white hover:bg-orange-600 transition-colors shadow-lg"
                        >
                          <ExternalLink size={16} /> Open in Browser
                        </a>
                      </div>
                    </div>
                  )}

                  {recipe.ingredients.length > 0 && (
                    <>
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
                    </>
                  )}

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

                  {recipe.ingredients.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Nutrition Dashboard</p>
                      <NutritionCard
                        recipeId={recipe.id}
                        recipeName={recipe.name}
                        ingredients={recipe.ingredients}
                        servings={recipe.servings ?? 1}
                      />
                    </div>
                  )}
                </div>
              )}
            </div>
          </ScrollArea>

          <div className="px-4 pb-4 pt-2 border-t grid grid-cols-2 gap-2">
            <button
              onClick={handleShareRecipe}
              className="col-span-2 px-3 py-2 rounded-lg border text-sm font-medium inline-flex items-center justify-center gap-1.5"
            >
              <Share2 className="h-4 w-4" /> Share Recipe
            </button>
            {activeKitchenId && (
              <button
                onClick={() => void handleShareToKitchen()}
                className="col-span-2 px-3 py-2 rounded-lg border text-sm font-medium inline-flex items-center justify-center gap-1.5"
              >
                <Users className="h-4 w-4" /> Share to {activeKitchenName || 'Kitchen'}
              </button>
            )}
            {mode === 'default' ? (
              <button onClick={() => setTweakOpen(true)} className="col-span-2 px-3 py-2 rounded-lg border text-sm font-medium inline-flex items-center justify-center gap-1.5">
                <Sparkles className="h-4 w-4" /> Remix Recipe
              </button>
            ) : (
              <button
                onClick={() => {
                  onSave?.(recipe);
                  onOpenChange(false);
                }}
                data-tutorial="like-button"
                className={`${onRegenerate ? 'col-span-1' : 'col-span-2'} px-3 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold inline-flex items-center justify-center gap-1.5`}
              >
                <Heart className="h-4 w-4" /> Save Recipe
              </button>
            )}
            {mode === 'explore' && onRegenerate && (
              <button
                onClick={onRegenerate}
                className="col-span-1 px-3 py-2 rounded-lg border text-sm font-semibold inline-flex items-center justify-center gap-1.5"
              >
                <Sparkles className="h-4 w-4" /> Generate Again
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
            {mode === 'explore' && (
              <button
                onClick={() => onOpenChange(false)}
                className="col-span-2 px-3 py-2 rounded-lg border text-sm font-medium inline-flex items-center justify-center gap-1.5"
              >
                Close
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
