import { forwardRef, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import type { Recipe } from '@/data/recipes';
import type { MatchResult } from '@/lib/matchLogic';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Clock, BarChart3, Check, ShoppingCart, MapPin, ChefHat, Users, Heart, Play, Sparkles, ExternalLink, FileText, Share2, Maximize2, Minimize2, Loader2 } from 'lucide-react';
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

/**
 * Domains that block iframe embedding via X-Frame-Options / frame-ancestors CSP.
 * These are blocked statically so we never attempt to embed them — no broken flash.
 * Keep in sync with IFRAME_BLOCKED_DOMAINS in importVisibilityPolicy.ts.
 */
const EMBED_BLOCKED_DOMAINS: string[] = [];

/** Runtime set: domains that failed to embed this session */
const runtimeBlockedEmbedHosts = new Set<string>();

/** How long (ms) to wait for an iframe before assuming it's blocked */
const EMBED_FALLBACK_TIMEOUT_MS = 3500;

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
  const staticMatch = EMBED_BLOCKED_DOMAINS.find(
    (domain) => normalizedHost === domain || normalizedHost.endsWith(`.${domain}`),
  );
  if (staticMatch) return staticMatch;
  const runtimeMatch = Array.from(runtimeBlockedEmbedHosts).find(
    (domain) => normalizedHost === domain || normalizedHost.endsWith(`.${domain}`),
  );
  return runtimeMatch ?? null;
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

interface MissingIngredientSelection {
  id: string;
  name: string;
  quantity: string;
  selected: boolean;
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
  const [missingIngredientsOpen, setMissingIngredientsOpen] = useState(false);
  const [missingIngredientSelections, setMissingIngredientSelections] = useState<MissingIngredientSelection[]>([]);
  const [importedView, setImportedView] = useState<'web' | 'app'>('app');
  const [expanded, setExpanded] = useState(false);
  const [embedUnavailable, setEmbedUnavailable] = useState(false);
  /** True while we're waiting to find out if the iframe will load successfully */
  const [iframeLoading, setIframeLoading] = useState(false);
  const [iframeReady, setIframeReady] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const embedFallbackTimeoutRef = useRef<number | null>(null);
  const { activeKitchenId, activeKitchenName } = useStore();

  const fallbackMatch: MatchResult = useMemo(() => ({
    percentage: 0,
    matched: [],
    missing: recipe?.ingredients ?? [],
    status: 'needs-shopping',
  }), [recipe]);

  const isMealDbRecipe = useMemo(() => String(recipe?.source || '').toLowerCase() === 'themealdb', [recipe?.source]);
  const displayMatch = match ?? fallbackMatch;
  const importedRecipe = recipe ? isImportedCommunityRecipe(recipe) : false;
  const importedPreview = useMemo(() => recipe ? getImportedPreviewData(recipe) : EMPTY_IMPORTED_PREVIEW, [recipe]);
  const resolvedSourceUrl = getResolvedRecipeSourceUrl(recipe) || importedPreview.sourceUrl;
  const normalizedSourceUrl = useMemo(
    () => isMealDbRecipe ? '' : normalizeSourceUrlForNavigation(resolvedSourceUrl || ''),
    [resolvedSourceUrl, isMealDbRecipe],
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
  const displayChefName = (recipeChefName && recipeChefName !== MUNCH_CHEF_NAME) ? recipeChefName : (chefName || (isMunchRecipe ? MUNCH_CHEF_NAME : null));
  const displayChefId = showChefAttribution ? (chefId || recipe?.created_by || (isMunchRecipe ? MUNCH_OFFICIAL_USER_ID : null)) : null;
  const sourceBadge = getRecipeSourceBadge(recipe);
  const showSourceLinkOverImage = Boolean(normalizedSourceUrl && sourceHostname && !isMealDbRecipe);
  const showSourceBadge = Boolean(sourceBadge) && !showSourceLinkOverImage;
  // Only show the embedded web view when we're in web mode AND we haven't confirmed it's unavailable
  // AND we're not mid-load (iframeLoading hides the iframe behind a spinner overlay instead)
  const showEmbeddedWebView = Boolean(normalizedSourceUrl && importedRecipe && importedView === 'web' && webViewEnabled);
  const normalizedMatchedIngredients = useMemo(
    () => new Set(displayMatch.matched.map((item) => item.toLowerCase().trim())),
    [displayMatch.matched],
  );
  const dialogSizeClass = expanded
    ? 'h-[calc(100dvh-0.75rem)] w-[calc(100vw-0.75rem)] max-w-[calc(100vw-0.75rem)] sm:h-[96vh] sm:w-[96vw] sm:max-w-[96vw]'
    : `h-[calc(100dvh-0.75rem)] max-h-[calc(100dvh-0.75rem)] w-[calc(100vw-0.75rem)] max-w-[calc(100vw-0.75rem)] sm:h-[92vh] ${showEmbeddedWebView ? 'sm:max-w-5xl' : 'sm:max-w-6xl'}`;

  useEffect(() => {
    if (!recipe || !open) return;
    setImportedView('app');
    setIframeLoading(false);
  }, [normalizedSourceUrl, open, recipe?.id]);

  useEffect(() => {
    if (!open) {
      setExpanded(false);
      setEmbedUnavailable(false);
      setIframeLoading(false);
      setIframeReady(false);
      if (embedFallbackTimeoutRef.current !== null) {
        window.clearTimeout(embedFallbackTimeoutRef.current);
        embedFallbackTimeoutRef.current = null;
      }
    }
  }, [open]);

  useEffect(() => {
    setEmbedUnavailable(false);
    setIframeLoading(false);
    setIframeReady(false);
    if (embedFallbackTimeoutRef.current !== null) {
      window.clearTimeout(embedFallbackTimeoutRef.current);
      embedFallbackTimeoutRef.current = null;
    }
  }, [normalizedSourceUrl, recipe?.id]);

  useEffect(() => {
    setAddedToGrocery(false);
  }, [recipe?.id, open]);

  useEffect(() => {
    if (!recipe || !open) {
      setMissingIngredientsOpen(false);
      setMissingIngredientSelections([]);
      return;
    }

    setMissingIngredientSelections(
      displayMatch.missing.map((ingredient, index) => {
        const parsed = parseIngredientLine(ingredient);
        return {
          id: `${recipe.id}-missing-${index}`,
          name: parsed.name || ingredient,
          quantity: parsed.quantity || '',
          selected: true,
        };
      }),
    );
  }, [displayMatch.missing, open, recipe]);

  if (!recipe) return null;

  function clearEmbedFallbackTimeout() {
    if (embedFallbackTimeoutRef.current !== null) {
      window.clearTimeout(embedFallbackTimeoutRef.current);
      embedFallbackTimeoutRef.current = null;
    }
  }

  const handleEmbedUnavailable = () => {
    clearEmbedFallbackTimeout();
    setIframeLoading(false);
    setIframeReady(false);

    if (normalizedSourceHost) {
      runtimeBlockedEmbedHosts.add(normalizedSourceHost);
    }

    setEmbedUnavailable((current) => {
      if (current) return current;
      toast.info('This source blocks embedded viewing — switching to app view.');
      return true;
    });
    setImportedView('app');
  };

  function scheduleEmbedFallback() {
    clearEmbedFallbackTimeout();
    if (!open || !normalizedSourceUrl || !webViewEnabled) return;
    embedFallbackTimeoutRef.current = window.setTimeout(() => {
      handleEmbedUnavailable();
    }, EMBED_FALLBACK_TIMEOUT_MS);
  }

  const handleIframeLoad = () => {
    const iframe = iframeRef.current;
    if (!iframe) return;

    try {
      const loadedUrl = iframe.contentWindow?.location.href;
      if (
        loadedUrl?.startsWith('chrome-error://') ||
        loadedUrl === 'about:blank' ||
        loadedUrl === '' ||
        loadedUrl === 'about:srcdoc'
      ) {
        handleEmbedUnavailable();
        return;
      }
      // Successfully loaded — clear spinner and timeout
      clearEmbedFallbackTimeout();
      setIframeLoading(false);
      setIframeReady(true);
    } catch {
      // SecurityError = cross-origin load succeeded
      clearEmbedFallbackTimeout();
      setIframeLoading(false);
      setIframeReady(true);
    }
  };

  const handleSelectWebView = () => {
    if (!webViewEnabled) return;
    setIframeLoading(true);
    setIframeReady(false);
    setImportedView('web');
    scheduleEmbedFallback();
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
      // Ignore cancelled shares
    }
  };

  const handleAddMissingToGrocery = () => {
    if (!onAddMissingToGrocery || displayMatch.missing.length === 0) return;
    setMissingIngredientsOpen(true);
  };

  const handleSaveMissingIngredients = () => {
    if (!onAddMissingToGrocery) return;
    const selectedIngredients = missingIngredientSelections
      .filter((item) => item.selected && item.name.trim())
      .map((item) => composeIngredientLine({ name: item.name.trim(), quantity: item.quantity.trim() }));

    if (selectedIngredients.length === 0) {
      toast.info('Select at least one ingredient to add.');
      return;
    }

    onAddMissingToGrocery(recipe, selectedIngredients);
    setAddedToGrocery(true);
    setMissingIngredientsOpen(false);
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
          className={`${dialogSizeClass} rounded-[1.5rem] p-0 overflow-hidden flex flex-col sm:rounded-2xl [&>button[data-tutorial='dialog-close']]:right-2 [&>button[data-tutorial='dialog-close']]:top-2 sm:[&>button[data-tutorial='dialog-close']]:right-2.5 sm:[&>button[data-tutorial='dialog-close']]:top-2.5 [&>button[data-tutorial='dialog-close']]:h-7 [&>button[data-tutorial='dialog-close']]:w-7 sm:[&>button[data-tutorial='dialog-close']]:h-8 sm:[&>button[data-tutorial='dialog-close']]:w-8 [&>button[data-tutorial='dialog-close']]:p-0 [&>button[data-tutorial='dialog-close']]:inline-flex [&>button[data-tutorial='dialog-close']]:items-center [&>button[data-tutorial='dialog-close']]:justify-center [&>button[data-tutorial='dialog-close']]:rounded-full [&>button[data-tutorial='dialog-close']]:bg-orange-500 [&>button[data-tutorial='dialog-close']]:text-white [&>button[data-tutorial='dialog-close']]:opacity-100 [&>button[data-tutorial='dialog-close']]:shadow-md [&>button[data-tutorial='dialog-close']]:ring-2 [&>button[data-tutorial='dialog-close']]:ring-white/70 [&>button[data-tutorial='dialog-close']]:ring-offset-0 hover:[&>button[data-tutorial='dialog-close']]:bg-orange-600 hover:[&>button[data-tutorial='dialog-close']]:text-white [&>button[data-tutorial='dialog-close']>svg]:h-3.5 [&>button[data-tutorial='dialog-close']>svg]:w-3.5`}
          data-tutorial="recipe-dialog-content"
        >
          <DialogHeader className="sr-only">
            <DialogTitle>{recipe.name}</DialogTitle>
          </DialogHeader>

          <button
            type="button"
            onClick={() => setExpanded((value) => !value)}
            className={`absolute top-2 z-20 ${importedRecipe && normalizedSourceUrl && webViewEnabled ? 'right-[5.6rem] sm:right-[6.8rem]' : 'right-11 sm:right-12'} inline-flex h-7 w-7 items-center justify-center rounded-full border border-orange-200 bg-white text-orange-600 shadow-sm transition-colors hover:bg-orange-50 sm:top-2.5 sm:h-8 sm:w-8`}
            aria-label={expanded ? 'Collapse recipe preview' : 'Expand recipe preview'}
          >
            {expanded ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
          </button>

          {/* Web / App toggle — only shown when embedding is actually available */}
          {importedRecipe && normalizedSourceUrl && webViewEnabled && (
            <div className="absolute top-2 right-[4.75rem] z-20 inline-flex items-center rounded-full border border-orange-200 bg-white p-1 shadow-sm sm:top-2.5 sm:right-[5.75rem]">
              <button
                type="button"
                onClick={handleSelectWebView}
                className={`rounded-full px-2.5 py-1 text-[10px] font-semibold transition-colors sm:px-3 sm:text-[11px] ${importedView === 'web'
                  ? 'bg-orange-500 text-white shadow-sm'
                  : 'text-stone-600'
                }`}
              >
                Web
              </button>
              <button
                type="button"
                onClick={() => { setImportedView('app'); setIframeLoading(false); }}
                className={`rounded-full px-2.5 py-1 text-[10px] font-semibold transition-colors sm:px-3 sm:text-[11px] ${importedView === 'app'
                  ? 'bg-orange-500 text-white shadow-sm'
                  : 'text-stone-600'
                }`}
              >
                App
              </button>
            </div>
          )}

          <ScrollArea className="flex-1 min-h-0 px-4 pb-0 sm:px-5">
            <div className="space-y-4 pb-6 pt-12 sm:pb-8 sm:pt-14">
              {showEmbeddedWebView ? (
                <div className="space-y-3">
                  <div className={`relative w-full ${expanded ? 'h-[60dvh] sm:h-[72vh] lg:h-[76vh]' : 'h-[52dvh] sm:h-[62vh] lg:h-[74vh]'} rounded-xl overflow-hidden border border-stone-200 bg-muted`}>
                    {/* Loading overlay — covers the iframe until it confirms a successful load */}
                    {iframeLoading && (
                      <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-stone-50 rounded-xl">
                        <Loader2 className="h-7 w-7 animate-spin text-orange-400" />
                        <p className="text-xs text-stone-400 font-medium">Loading recipe page…</p>
                      </div>
                    )}
                    <div className="absolute inset-0 overflow-hidden rounded-xl">
                      <iframe
                        ref={iframeRef}
                        src={normalizedSourceUrl}
                        className={`border-0 rounded-xl transition-opacity ${iframeReady ? 'opacity-100' : 'opacity-0'}`}
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
                      className="absolute top-2 right-2 z-20 inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-xs font-semibold bg-white/95 backdrop-blur-sm border border-stone-200 text-stone-700 shadow-sm hover:bg-orange-500 hover:text-white hover:border-orange-400 transition-colors"
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
              ) : (
                <div className="space-y-6">
                  <div className="grid gap-4 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] lg:items-start">
                    <div className="space-y-3 lg:sticky lg:top-0">
                      <div className="overflow-hidden rounded-[1.4rem] border border-orange-100 bg-white shadow-[0_18px_40px_rgba(28,25,23,0.07)]">
                        <div className="aspect-[4/3] bg-stone-100">
                          <img
                            src={getRecipeImageSrc(recipe.image)}
                            alt={recipe.name}
                            className="h-full w-full object-cover"
                            onError={applyRecipeImageFallback}
                          />
                        </div>
                      </div>
                      <div className="px-1">
                        <h2 className="text-xl font-bold leading-tight text-stone-900 sm:text-[1.6rem]" style={{ fontFamily: "'Fraunces', Georgia, serif" }}>
                          {recipe.name}
                        </h2>
                        <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-[12px] font-semibold text-stone-500">
                          <span className="inline-flex items-center gap-1.5">
                            <Clock className="h-3.5 w-3.5 text-orange-500" />
                            {recipe.cook_time}
                          </span>
                          {recipe.servings && (
                            <span className="inline-flex items-center gap-1.5">
                              <Users className="h-3.5 w-3.5 text-orange-500" />
                              {recipe.servings} serving{recipe.servings === 1 ? '' : 's'}
                            </span>
                          )}
                          {recipe.difficulty && (
                            <span className="inline-flex items-center gap-1.5">
                              <BarChart3 className="h-3.5 w-3.5 text-orange-500" />
                              {recipe.difficulty}
                            </span>
                          )}
                        </div>
                        {displayChefName && displayChefId && (
                          <button
                            type="button"
                            onClick={() => navigate(`/chef/${displayChefId}`)}
                            className="mt-3 inline-flex items-center gap-2 rounded-full border border-orange-200 bg-orange-50 px-3 py-1.5 text-xs font-semibold text-orange-700 transition-colors hover:bg-orange-100"
                          >
                            <RecipeAttributionIcon
                              recipe={{ ...recipe, chef: displayChefName, created_by: displayChefId }}
                              sizeClassName="h-4 w-4"
                              className={isMunchRecipe ? 'rounded-full bg-white p-0.5' : ''}
                            />
                            {displayChefName}
                          </button>
                        )}
                        <div className="mt-4 flex flex-wrap items-center gap-2">
                          <MatchBadge percentage={displayMatch.percentage} />
                          {recipe.cuisine && (
                            <Badge variant="outline" className="gap-1 border-orange-200 bg-orange-50 text-orange-700">
                              <MapPin className="h-3 w-3" /> {recipe.cuisine}
                            </Badge>
                          )}
                          {showSourceBadge && (
                            <Badge variant="outline" className="gap-1 border-orange-200 bg-orange-50 text-orange-700">
                              <FileText className="h-3 w-3" /> {sourceBadge}
                            </Badge>
                          )}
                        </div>
                        {showSourceLinkOverImage && (
                          <a
                            href={normalizedSourceUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-orange-600 transition-colors hover:text-orange-700"
                          >
                            <ExternalLink className="h-3.5 w-3.5" />
                            {sourceHostname.replace(/^www\./, '')}
                          </a>
                        )}
                        {!!recipe.tags?.length && (
                          <div className="mt-2.5 flex flex-wrap gap-1.5">
                            {recipe.tags.slice(0, 4).map((tag) => (
                              <span key={tag} className="rounded-full border border-stone-200 bg-white px-2.5 py-0.5 text-[10px] font-semibold text-stone-500">
                                {tag}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="space-y-4">
                      {recipe.ingredients.length > 0 && (
                        <section className="rounded-[1.4rem] border border-orange-100 bg-white p-3.5 shadow-[0_14px_34px_rgba(28,25,23,0.05)] sm:p-4">
                          <div className="mb-3 flex flex-wrap items-center justify-between gap-2.5">
                            <div className="flex items-center gap-2.5">
                              <p className="text-[10px] font-bold uppercase tracking-widest text-orange-400">Ingredients</p>
                              <span className="inline-flex items-center rounded-full bg-sky-50 px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.1em] text-sky-600">
                                Smart Pantry Sync
                              </span>
                            </div>
                            <div className="inline-flex rounded-full border border-stone-200 bg-stone-50 p-1">
                              {SCALE_OPTIONS.map((option) => (
                                <button
                                  key={option.label}
                                  onClick={() => setPortionFactor(option.factor)}
                                  className={`rounded-full px-3 py-1.5 text-[11px] font-semibold transition-colors ${portionFactor === option.factor ? 'bg-white text-orange-600 shadow-sm' : 'text-stone-500'}`}
                                >
                                  {option.label}
                                </button>
                              ))}
                            </div>
                          </div>
                          <div className="space-y-2">
                            {recipe.ingredients.map((ing) => {
                              const scaledIngredient = scaleIngredient(ing, portionFactor);
                              const hasIngredient = normalizedMatchedIngredients.has(ing.toLowerCase().trim());
                              return (
                                <div
                                  key={ing}
                                  className={`flex items-center gap-2.5 rounded-xl border px-3 py-2.5 ${hasIngredient
                                    ? 'border-emerald-200 bg-white'
                                    : 'border-stone-200 bg-white'
                                  }`}
                                >
                                  <div className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${hasIngredient ? 'bg-emerald-100 text-emerald-600' : 'bg-stone-100 text-stone-500'}`}>
                                    {hasIngredient ? <Check className="h-3 w-3" /> : <ShoppingCart className="h-3 w-3" />}
                                  </div>
                                  <div className="min-w-0">
                                    <p className="text-[11px] font-semibold leading-4 text-stone-900">{scaledIngredient}</p>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                          {displayMatch.missing.length > 0 && onAddMissingToGrocery && (
                            <motion.button
                              onClick={handleAddMissingToGrocery}
                              data-tutorial="add-missing-button"
                              whileTap={{ scale: 0.98 }}
                              animate={addedToGrocery ? { scale: [1, 1.02, 1] } : { scale: 1 }}
                              transition={{ duration: 0.3 }}
                              className={`mt-3 w-full rounded-xl border px-3 py-2.5 text-[12px] font-semibold inline-flex items-center justify-center gap-2 transition-colors ${addedToGrocery
                                ? 'border-emerald-500/60 bg-emerald-500/10 text-emerald-700'
                                : 'border-orange-200 bg-orange-50 text-orange-700 hover:bg-orange-100/70'
                              }`}
                            >
                              <motion.span
                                animate={addedToGrocery ? { rotate: [0, -12, 12, 0] } : { rotate: 0 }}
                                transition={{ duration: 0.35 }}
                              >
                                {addedToGrocery ? <Check className="h-4 w-4" /> : <ShoppingCart className="h-4 w-4" />}
                              </motion.span>
                              {addedToGrocery ? 'Added to grocery list' : `Add ${displayMatch.missing.length} missing ingredient${displayMatch.missing.length === 1 ? '' : 's'} to Grocery List`}
                            </motion.button>
                          )}
                        </section>
                      )}

                      {recipe.instructions.length > 0 && (
                        <section className="rounded-[1.4rem] border border-orange-100 bg-white p-3.5 shadow-[0_14px_34px_rgba(28,25,23,0.05)] sm:p-4">
                          <div className="mb-3">
                            <p className="text-[10px] font-bold uppercase tracking-widest text-orange-400">Instructions</p>
                          </div>
                          <ol className="space-y-4">
                            {recipe.instructions.map((step, i) => (
                              <li key={i} className="flex gap-3">
                                <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-orange-500 text-sm font-bold text-white shadow-[0_8px_18px_rgba(249,115,22,0.22)]">
                                  {i + 1}
                                </span>
                                <p className="pt-1 text-[13px] leading-6 text-stone-700">
                                  {stripInstructionPrefix(step)}
                                </p>
                              </li>
                            ))}
                          </ol>
                        </section>
                      )}

                      {recipe.ingredients.length > 0 && (
                        <NutritionCard
                          recipeId={recipe.id}
                          recipeName={recipe.name}
                          ingredients={recipe.ingredients}
                          servings={recipe.servings ?? 1}
                        />
                      )}
                    </div>
                  </div>
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
                    onClick={() => { onSave?.(recipe); onOpenChange(false); }}
                    data-tutorial="like-button"
                    className={`h-9 min-w-0 flex-1 rounded-lg px-3 text-sm font-semibold inline-flex items-center justify-center gap-1.5 basis-[10rem] ${isSaved
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

      <Dialog open={missingIngredientsOpen} onOpenChange={setMissingIngredientsOpen}>
        <DialogContent className="w-[calc(100vw-1rem)] max-w-2xl rounded-[1.5rem] bg-white p-0 overflow-hidden">
          <DialogHeader className="border-b border-stone-100 px-5 py-4">
            <DialogTitle>Select Grocery Items</DialogTitle>
          </DialogHeader>
          <div className="max-h-[70vh] overflow-y-auto bg-white px-5 py-4">
            <p className="text-sm text-stone-500">
              Choose which missing ingredients to add, and adjust quantities before saving them to your grocery cart.
            </p>
            <div className="mt-4 divide-y divide-stone-100">
              {missingIngredientSelections.map((item) => (
                <div key={item.id} className="py-3">
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => setMissingIngredientSelections((current) => current.map((entry) => entry.id === item.id ? { ...entry, selected: !entry.selected } : entry))}
                      className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition-colors ${item.selected ? 'border-orange-500 bg-orange-500 text-white' : 'border-stone-300 bg-white text-transparent'}`}
                      aria-label={item.selected ? 'Deselect ingredient' : 'Select ingredient'}
                    >
                      <Check className="h-3.5 w-3.5" />
                    </button>
                    <div className="w-20 shrink-0 sm:w-24">
                      <input
                        value={item.quantity}
                        onChange={(e) => setMissingIngredientSelections((current) => current.map((entry) => entry.id === item.id ? { ...entry, quantity: e.target.value } : entry))}
                        placeholder="Qty"
                        className="h-10 w-full rounded-lg border-0 bg-stone-50 px-3 text-sm text-stone-900 outline-none transition-colors placeholder:text-stone-400 focus:bg-orange-50 focus:ring-2 focus:ring-orange-100"
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <input
                        value={item.name}
                        onChange={(e) => setMissingIngredientSelections((current) => current.map((entry) => entry.id === item.id ? { ...entry, name: e.target.value } : entry))}
                        placeholder="Ingredient"
                        className="h-10 w-full rounded-lg border-0 bg-stone-50 px-3 text-sm text-stone-900 outline-none transition-colors placeholder:text-stone-400 focus:bg-orange-50 focus:ring-2 focus:ring-orange-100"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="border-t border-stone-100 px-5 py-4 flex gap-2">
            <button
              type="button"
              onClick={() => setMissingIngredientsOpen(false)}
              className="flex-1 rounded-xl border border-stone-200 px-4 py-2.5 text-sm font-semibold text-stone-700 transition-colors hover:border-orange-300 hover:text-orange-600"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSaveMissingIngredients}
              className="flex-1 rounded-xl bg-orange-500 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-orange-600"
            >
              Save to Cart
            </button>
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
