import { forwardRef, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import type { Recipe } from '@/data/recipes';
import type { MatchResult } from '@/lib/matchLogic';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Clock, BarChart3, Check, ShoppingCart, MapPin, ChefHat, Users, Heart, Play, Sparkles, ExternalLink, FileText, Share2, Maximize2, Minimize2 } from 'lucide-react';
import MatchBadge from '@/components/MatchBadge';
import RecipeTweakDialog from '@/components/RecipeTweakDialog';
import NutritionCard from '@/components/NutritionCard';
import { getRecipeChefName, getRecipeSourceBadge, getResolvedRecipeSourceUrl, isImportedCommunityRecipe, isMunchAuthoredRecipe, shouldShowChefAttribution } from '@/lib/recipeAttribution';
import RecipeAttributionIcon from '@/components/RecipeAttributionIcon';
import { useStore } from '@/lib/store';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { composeIngredientLine, parseIngredientLine, scaleIngredientQuantity } from '@/lib/ingredientText';
import { applyRecipeImageFallback, getRecipeImageSrc } from '@/lib/recipeImage';
import { MUNCH_CHEF_NAME, MUNCH_OFFICIAL_USER_ID } from '@/lib/munchIdentity';

interface Props {
  recipe: Recipe | null;
  match: MatchResult | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  chefName?: string | null;
  chefId?: string | null;
  mode?: 'default' | 'explore';
  onSave?: (recipe: Recipe) => void;
  isSaved?: boolean;
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
  'allrecipes.com',
  'epicurious.com',
  'tastesbetterfromscratch.com',
  'recipetineats.com',
];
const runtimeBlockedEmbedHosts = new Set<string>();

function normalizeEmbedHost(host: string): string {
  return String(host || '').trim().toLowerCase().replace(/^www\./, '');
}

function getSourceUrlObject(url: string): URL | null {
  const trimmed = String(url || '').trim();
  if (!trimmed) return null;

  const candidate = /^[a-z][a-z0-9+.-]*:\/\//i.test(trimmed)
    ? trimmed
    : `https://${trimmed.replace(/^\/+/, '')}`;

  try {
    return new URL(candidate);
  } catch {
    return null;
  }
}

function normalizeSourceUrlForNavigation(url: string): string {
  return getSourceUrlObject(url)?.toString() ?? String(url || '').trim();
}

function getBlockedEmbedHost(host: string): string | null {
  const normalizedHost = normalizeEmbedHost(host);
  if (!normalizedHost) return null;

  const staticBlockedHost = EMBED_BLOCKED_DOMAINS.find(
    (domain) => normalizedHost === domain || normalizedHost.endsWith(`.${domain}`),
  );
  if (staticBlockedHost) return staticBlockedHost;

  const runtimeBlockedHost = Array.from(runtimeBlockedEmbedHosts).find(
    (domain) => normalizedHost === domain || normalizedHost.endsWith(`.${domain}`),
  );
  return runtimeBlockedHost ?? null;
}

function getEmbedBlockReason(url: string): string | null {
  const parsedUrl = getSourceUrlObject(url);
  if (!parsedUrl) return 'invalid-url';

  const blockedDomain = getBlockedEmbedHost(parsedUrl.hostname);
  return blockedDomain ? `blocked-domain:${blockedDomain}` : null;
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
    sourceUrl:
      typeof payload.source_url === 'string' ? payload.source_url
      : typeof payload.original_source_url === 'string' ? payload.original_source_url
      : '',
    rawPayloadKeys: Object.keys(payload),
  };
}

function scaleIngredient(ingredient: string, factor: number) {
  if (factor === 1) return ingredient;
  const parts = parseIngredientLine(ingredient);
  if (!parts.quantity) return ingredient;
  return composeIngredientLine({
    ...parts,
    quantity: scaleIngredientQuantity(parts.quantity, factor),
  });
}

function stripInstructionPrefix(step: string) {
  return String(step || '')
    .replace(/^step\s*\d+\s*[:.)-]?\s*/i, '')
    .replace(/^\d+\s*[:.)-]\s*/, '')
    .trim();
}

function buildRecipeShareText(recipe: Recipe, portionFactor: number) {
  const details = [recipe.cook_time, recipe.difficulty, recipe.cuisine, recipe.servings ? `Serves ${recipe.servings}` : null]
    .filter(Boolean)
    .join(' • ');
  const ingredients = recipe.ingredients.map((ingredient) => `• ${scaleIngredient(ingredient, portionFactor)}`);
  const instructions = recipe.instructions
    .map(stripInstructionPrefix)
    .filter(Boolean)
    .map((step, index) => `${index + 1}. ${step}`);

  return [
    recipe.name,
    details,
    '',
    'Ingredients',
    ...ingredients,
    '',
    'Instructions',
    ...instructions,
    recipe.source_url ? '' : null,
    recipe.source_url ? `Source: ${recipe.source_url}` : null,
    '',
    'Shared from Munch',
  ]
    .filter((line): line is string => line !== null)
    .join('\n');
}

const RecipePreviewDialog = forwardRef<HTMLDivElement, Props>(function RecipePreviewDialog({
  recipe,
  match,
  open,
  onOpenChange,
  chefName,
  chefId,
  mode = 'default',
  onSave,
  isSaved = false,
  onAddMissingToGrocery,
  onRegenerate,
}: Props, _ref) {
  const navigate = useNavigate();
  const [portionFactor, setPortionFactor] = useState(1);
  const [tweakOpen, setTweakOpen] = useState(false);
  const [addedToGrocery, setAddedToGrocery] = useState(false);
  const [importedView, setImportedView] = useState<'web' | 'app'>('app');
  const [expanded, setExpanded] = useState(false);
  const [embedUnavailable, setEmbedUnavailable] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const { activeKitchenId, activeKitchenName } = useStore();

  const fallbackMatch: MatchResult = useMemo(() => ({
    percentage: 0,
    matched: [],
    missing: recipe?.ingredients ?? [],
    status: 'needs-shopping',
  }), [recipe]);

  const displayMatch = match ?? fallbackMatch;
  const importedRecipe = recipe ? isImportedCommunityRecipe(recipe) : false;
  const importedPreview = useMemo(() => recipe ? getImportedPreviewData(recipe) : EMPTY_IMPORTED_PREVIEW, [recipe]);
  const resolvedSourceUrl = getResolvedRecipeSourceUrl(recipe) || importedPreview.sourceUrl;
  const normalizedSourceUrl = useMemo(
    () => normalizeSourceUrlForNavigation(resolvedSourceUrl || ''),
    [resolvedSourceUrl],
  );
  const embedBlockReason = normalizedSourceUrl ? getEmbedBlockReason(normalizedSourceUrl) : null;
  const canEmbedSource = Boolean(normalizedSourceUrl) && !embedBlockReason;
  const webViewEnabled = canEmbedSource && !embedUnavailable;
  const showStructuredFallback = recipe ? importedRecipe && hasStructuredRecipeContent(recipe) : false;
  const sourceHostname = useMemo(() => {
    const parsedUrl = getSourceUrlObject(normalizedSourceUrl);

    return parsedUrl?.hostname || '';
  }, [normalizedSourceUrl]);
  const normalizedSourceHost = useMemo(() => normalizeEmbedHost(sourceHostname), [sourceHostname]);
  const isMunchRecipe = isMunchAuthoredRecipe(recipe);
  const recipeChefName = getRecipeChefName(recipe);
  const showChefAttribution = Boolean(chefName) || shouldShowChefAttribution(recipe);
  const displayChefName = chefName || recipeChefName || (isMunchRecipe ? MUNCH_CHEF_NAME : null);
  const displayChefId = showChefAttribution ? (chefId || recipe?.created_by || (isMunchRecipe ? MUNCH_OFFICIAL_USER_ID : null)) : null;
  const sourceBadge = getRecipeSourceBadge(recipe);
  const isMealDbRecipe = String(recipe?.source || '').toLowerCase() === 'themealdb';
  const showSourceLinkOverImage = Boolean(normalizedSourceUrl && sourceHostname && !isMealDbRecipe);
  const showSourceBadge = Boolean(sourceBadge) && !showSourceLinkOverImage;
  const showEmbeddedWebView = Boolean(normalizedSourceUrl && importedRecipe && importedView === 'web' && webViewEnabled);
  const dialogSizeClass = expanded
    ? 'h-[calc(100dvh-0.75rem)] w-[calc(100vw-0.75rem)] max-w-[calc(100vw-0.75rem)] sm:h-[96vh] sm:w-[96vw] sm:max-w-[96vw]'
    : `h-[calc(100dvh-0.75rem)] max-h-[calc(100dvh-0.75rem)] w-[calc(100vw-0.75rem)] max-w-[calc(100vw-0.75rem)] sm:h-[92vh] ${
        showEmbeddedWebView ? 'sm:max-w-5xl' : 'sm:max-w-lg'
      }`;

  useEffect(() => {
    if (!recipe || !open) return;
    setImportedView('app');
  }, [normalizedSourceUrl, open, recipe?.id]);

  useEffect(() => {
    if (!open) {
      setExpanded(false);
      setEmbedUnavailable(false);
    }
  }, [open]);

  useEffect(() => {
    setEmbedUnavailable(false);
  }, [normalizedSourceUrl, recipe?.id]);

  if (!recipe) return null;

  const handleEmbedUnavailable = () => {
    if (normalizedSourceHost) {
      runtimeBlockedEmbedHosts.add(normalizedSourceHost);
    }

    setEmbedUnavailable((current) => {
      if (current) return current;
      toast.info('This source blocks embedded viewing, so Munch switched to the app view.');
      return true;
    });
    setImportedView('app');
  };

  const handleIframeLoad = () => {
    const iframe = iframeRef.current;
    if (!iframe) return;

    try {
      const loadedUrl = iframe.contentWindow?.location.href;
      if (loadedUrl?.startsWith('chrome-error://')) {
        handleEmbedUnavailable();
      }
    } catch {
      // Cross-origin access errors are expected for successful embeds.
    }
  };

  const handleShareRecipe = async () => {
    const shareText = buildRecipeShareText(recipe, portionFactor);
    const shareUrl = normalizedSourceUrl || undefined;
    const sharePayload = {
      title: recipe.name,
      text: shareText,
      ...(shareUrl ? { url: shareUrl } : {}),
    };

    try {
      if (navigator.share) {
        await navigator.share(sharePayload);
        toast.success('Recipe ready to send.');
      } else {
        await navigator.clipboard.writeText(shareText);
        toast.success('Recipe copied in a text-friendly format.');
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
          className={`${dialogSizeClass} rounded-[1.5rem] p-0 overflow-hidden flex flex-col sm:rounded-2xl [&>button[data-tutorial='dialog-close']]:right-2.5 [&>button[data-tutorial='dialog-close']]:top-2.5 sm:[&>button[data-tutorial='dialog-close']]:right-3 sm:[&>button[data-tutorial='dialog-close']]:top-3 [&>button[data-tutorial='dialog-close']]:h-8 [&>button[data-tutorial='dialog-close']]:w-8 sm:[&>button[data-tutorial='dialog-close']]:h-9 sm:[&>button[data-tutorial='dialog-close']]:w-9 [&>button[data-tutorial='dialog-close']]:p-0 [&>button[data-tutorial='dialog-close']]:inline-flex [&>button[data-tutorial='dialog-close']]:items-center [&>button[data-tutorial='dialog-close']]:justify-center [&>button[data-tutorial='dialog-close']]:rounded-full [&>button[data-tutorial='dialog-close']]:bg-orange-500 [&>button[data-tutorial='dialog-close']]:text-white [&>button[data-tutorial='dialog-close']]:opacity-100 [&>button[data-tutorial='dialog-close']]:shadow-md [&>button[data-tutorial='dialog-close']]:ring-2 [&>button[data-tutorial='dialog-close']]:ring-white/70 [&>button[data-tutorial='dialog-close']]:ring-offset-0 hover:[&>button[data-tutorial='dialog-close']]:bg-orange-600 hover:[&>button[data-tutorial='dialog-close']]:text-white [&>button[data-tutorial='dialog-close']>svg]:h-4 [&>button[data-tutorial='dialog-close']>svg]:w-4`}
          onOpenAutoFocus={(event) => event.preventDefault()}
          data-tutorial="recipe-dialog-content"
        >
          <div className={`relative overflow-hidden ${expanded ? 'h-32 sm:h-40 md:h-48' : showEmbeddedWebView ? 'h-28 sm:h-32 md:h-36' : 'h-36 sm:h-40 md:h-48'}`}>
            <img src={getRecipeImageSrc(recipe.image)} alt={recipe.name} className="w-full h-full object-cover" onError={applyRecipeImageFallback} />
            <div className="absolute inset-0 bg-gradient-to-t from-background/90 to-transparent" />
            <div className="absolute bottom-3 left-4 right-16 sm:right-4">
              <DialogHeader data-tutorial="recipe-dialog-header">
                <DialogTitle className="text-xl text-foreground">{recipe.name}</DialogTitle>
              </DialogHeader>
            </div>
            {showSourceLinkOverImage ? (
              <a
                href={normalizedSourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="absolute top-3 left-3 inline-flex items-center gap-1.5 text-[11px] text-white/90 hover:text-white font-medium bg-black/30 backdrop-blur-sm px-2.5 py-1 rounded-full transition-colors"
              >
                <img
                  src={`https://www.google.com/s2/favicons?domain=${sourceHostname}&sz=32`}
                  alt=""
                  className="h-4 w-4 shrink-0 rounded-sm bg-white/90 p-0.5"
                  onError={(event) => {
                    (event.currentTarget as HTMLImageElement).style.display = 'none';
                  }}
                />
                <span>{sourceHostname.replace(/^www\./, '')}</span>
              </a>
            ) : null}
            {displayChefName && displayChefId ? (
              <button
                onClick={() => { onOpenChange(false); navigate(`/chef/${displayChefId}`); }}
                className={`absolute inline-flex items-center gap-1.5 text-[11px] text-white/90 hover:text-white font-medium bg-black/30 backdrop-blur-sm px-2.5 py-1 rounded-full transition-colors ${showSourceLinkOverImage ? 'top-14 left-3' : 'top-3 left-3'}`}
              >
                <RecipeAttributionIcon recipe={recipe} sizeClassName="h-4 w-4" className="rounded-full bg-white/90 p-0.5" />
                <span>{displayChefName}</span>
              </button>
            ) : null}
            <button
              type="button"
              onClick={() => setExpanded((value) => !value)}
              className={`absolute top-2.5 ${importedRecipe && normalizedSourceUrl && webViewEnabled ? 'right-[6.25rem] sm:right-[7.25rem]' : 'right-11 sm:right-14'} inline-flex h-8 w-8 items-center justify-center rounded-full border border-white/30 bg-black/35 text-white shadow-sm backdrop-blur-sm transition-colors hover:bg-black/50 sm:h-9 sm:w-9`}
              aria-label={expanded ? 'Collapse recipe preview' : 'Expand recipe preview'}
            >
              {expanded ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
            </button>
            {importedRecipe && normalizedSourceUrl && webViewEnabled && (
              <div className="absolute top-2.5 right-11 inline-flex items-center rounded-full border border-white/30 bg-black/35 p-1 backdrop-blur-sm sm:top-3 sm:right-14">
                <button
                  type="button"
                  onClick={() => setImportedView('web')}
                  disabled={!webViewEnabled}
                  className={`rounded-full px-2.5 py-1 text-[10px] font-semibold transition-colors sm:px-3 sm:text-[11px] ${
                    importedView === 'web'
                      ? 'bg-white text-stone-900 shadow-sm'
                      : 'text-white/85'
                  } ${!webViewEnabled ? 'cursor-not-allowed opacity-50' : ''}`}
                >
                  Web
                </button>
                <button
                  type="button"
                  onClick={() => setImportedView('app')}
                  className={`rounded-full px-2.5 py-1 text-[10px] font-semibold transition-colors sm:px-3 sm:text-[11px] ${
                    importedView === 'app'
                      ? 'bg-white text-stone-900 shadow-sm'
                      : 'text-white/85'
                  }`}
                >
                  App
                </button>
              </div>
            )}
          </div>

          <ScrollArea className="flex-1 min-h-0 px-4 pb-3 sm:px-5 sm:pb-4">
            <div className="space-y-4">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="secondary" className="gap-1"><Clock className="h-3 w-3" /> {recipe.cook_time}</Badge>
                <Badge variant="secondary" className="gap-1"><BarChart3 className="h-3 w-3" /> {recipe.difficulty}</Badge>
                <MatchBadge percentage={displayMatch.percentage} />
                {showSourceBadge && (
                  <Badge variant="outline" className="gap-1 text-orange-700 border-orange-200 bg-orange-50">
                    <FileText className="h-3 w-3" /> {sourceBadge}
                  </Badge>
                )}
                {recipe.cuisine && <Badge variant="outline" className="gap-1"><MapPin className="h-3 w-3" /> {recipe.cuisine}</Badge>}
                {recipe.servings && <Badge variant="secondary" className="gap-1"><Users className="h-3 w-3" /> Serves {recipe.servings}</Badge>}
                {normalizedSourceUrl && importedRecipe && !showEmbeddedWebView && (
                  <a
                    href={normalizedSourceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-orange-700 transition-colors hover:text-orange-800"
                  >
                    <ExternalLink className="h-3.5 w-3.5" /> Open in Browser
                  </a>
                )}
              </div>

              {!!recipe.tags?.length && (
                <div className="flex flex-wrap gap-1.5">
                  {recipe.tags.slice(0, 4).map((tag) => <Badge key={tag} variant="outline" className="text-xs">{tag}</Badge>)}
                </div>
              )}

              {/* ── Recipe Content ── */}
              {normalizedSourceUrl && importedRecipe && importedView === 'web' && webViewEnabled ? (
                <div className="space-y-3">
                  <div className={`relative w-full ${expanded ? 'h-[60dvh] sm:h-[72vh] lg:h-[76vh]' : 'h-[52dvh] sm:h-[62vh] lg:h-[74vh]'} rounded-xl overflow-hidden border border-stone-200 bg-muted`}>
                    <div className="absolute inset-0 overflow-hidden rounded-xl">
                      <iframe
                        ref={iframeRef}
                        src={normalizedSourceUrl}
                        className="border-0 rounded-xl"
                        title={recipe.name}
                        sandbox="allow-same-origin allow-scripts allow-popups allow-forms"
                        onError={handleEmbedUnavailable}
                        onLoad={handleIframeLoad}
                        style={{
                          width: '128%',
                          height: '128%',
                          transform: 'scale(0.78)',
                          transformOrigin: 'top left',
                        }}
                      />
                    </div>
                    <a
                      href={normalizedSourceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="absolute top-2 right-2 inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-xs font-semibold bg-white/95 backdrop-blur-sm border border-stone-200 text-stone-700 shadow-sm hover:bg-orange-500 hover:text-white hover:border-orange-400 transition-colors"
                    >
                      <ExternalLink size={12} /> Open in Browser
                    </a>
                  </div>
                  {displayMatch.missing.length > 0 && onAddMissingToGrocery && (
                    <motion.button
                      onClick={handleAddMissingToGrocery}
                      data-tutorial="add-missing-button"
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
                      {addedToGrocery ? 'Added to grocery list' : `Add ${displayMatch.missing.length} missing ingredients to Grocery List`}
                    </motion.button>
                  )}
                  {recipe.ingredients.length > 0 && (
                    <div>
                      <NutritionCard
                        recipeId={recipe.id}
                        recipeName={recipe.name}
                        ingredients={recipe.ingredients}
                        servings={recipe.servings ?? 1}
                      />
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-6">
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

          <div className="border-t bg-background/96 px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-2 backdrop-blur-sm sm:px-4 sm:pb-3">
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={handleShareRecipe}
                className="h-9 w-9 shrink-0 rounded-lg border text-muted-foreground inline-flex items-center justify-center hover:text-foreground transition-colors"
                aria-label="Share recipe"
                title="Share recipe"
              >
                <Share2 className="h-4 w-4" />
              </button>
              {activeKitchenId && (
                <button
                  onClick={() => void handleShareToKitchen()}
                  className="h-9 w-9 shrink-0 rounded-lg border text-muted-foreground inline-flex items-center justify-center hover:text-foreground transition-colors"
                  aria-label={`Share to ${activeKitchenName || 'Kitchen'}`}
                  title={`Share to ${activeKitchenName || 'Kitchen'}`}
                >
                  <Users className="h-4 w-4" />
                </button>
              )}
              {mode === 'default' ? (
                <>
                  <button
                    onClick={() => setTweakOpen(true)}
                    className="h-9 px-3 shrink-0 rounded-lg border text-sm font-medium inline-flex items-center justify-center gap-1.5"
                  >
                    <Sparkles className="h-4 w-4" /> Remix
                  </button>
                  <button
                    onClick={() => navigate(`/cook/${recipe.id}`, { state: { portionFactor } })}
                    data-tutorial="start-cooking-button"
                    className="h-9 min-w-0 flex-1 rounded-lg bg-primary px-3 text-sm font-semibold text-primary-foreground inline-flex items-center justify-center gap-1.5 basis-[12rem]"
                  >
                    <Play className="h-4 w-4" /> Start Cooking
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={() => {
                      onSave?.(recipe);
                      onOpenChange(false);
                    }}
                    data-tutorial="like-button"
                    className={`h-9 min-w-0 flex-1 rounded-lg px-3 text-sm font-semibold inline-flex items-center justify-center gap-1.5 basis-[10rem] ${
                      isSaved
                        ? 'border border-emerald-200 bg-emerald-50 text-emerald-700'
                        : 'bg-primary text-primary-foreground'
                    }`}
                  >
                    <Heart className="h-4 w-4" fill={isSaved ? 'currentColor' : 'none'} /> {isSaved ? 'Saved' : 'Save'}
                  </button>
                  {onRegenerate && (
                    <button
                      onClick={onRegenerate}
                      className="h-9 px-3 shrink-0 rounded-lg border text-sm font-semibold inline-flex items-center justify-center gap-1.5"
                    >
                      <Sparkles className="h-4 w-4" /> Again
                    </button>
                  )}
                  <button
                    onClick={() => onOpenChange(false)}
                    className="h-9 px-3 shrink-0 rounded-lg border text-sm font-medium inline-flex items-center justify-center"
                  >
                    Close
                  </button>
                </>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {mode === 'default' && (
        <RecipeTweakDialog recipe={recipe} open={tweakOpen} onOpenChange={setTweakOpen} />
      )}
    </>
  );
});

export default RecipePreviewDialog;
