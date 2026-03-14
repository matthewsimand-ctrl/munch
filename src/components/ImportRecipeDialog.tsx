import { useEffect, useRef, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { Link2, FileText, Loader2, Import, ClipboardPaste, X, Plus, Globe, Lock, Camera, Upload, Brain } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { getAiDisabledMessage, isAiAgentCallsDisabledError } from '@/lib/ai';
import { useAiAgentCallsDisabled } from '@/hooks/useAiAgentCallsDisabled';
import { invokeAppFunction } from '@/lib/functionClient';
import { useStore } from '@/lib/store';
import { composeIngredientLine, parseIngredientLine } from '@/lib/ingredientText';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { usePremiumAccess } from '@/hooks/usePremiumAccess';

interface ImportRecipeDialogProps {
  children?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  initialTab?: ImportTab;
}

type ImportTab = 'url' | 'pdf' | 'photo';

interface IngredientEntry {
  name: string;
  quantity: string;
}

interface ReviewData {
  name: string;
  ingredients: IngredientEntry[];
  instructions: string[];
  cook_time: string;
  difficulty: string;
  cuisine: string;
  chef: string;
  tags: string[];
  image: string;
  servings: string;
}

interface WebsitePreviewData {
  name: string;
  description?: string;
  ingredients: string[];
  instructions: string[];
  cook_time: string;
  difficulty: string;
  cuisine: string;
  chef: string;
  tags: string[];
  image: string;
  servings: string;
  source_url?: string;
  raw_api_payload?: Record<string, unknown>;
}

const DIFFICULTY_OPTIONS = ['Beginner', 'Intermediate', 'Advanced'];
const CUISINE_OPTIONS = ['Italian', 'Asian', 'Mexican', 'Mediterranean', 'American', 'French', 'Indian', 'Other'];
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
    const blockedDomain = EMBED_BLOCKED_DOMAINS.find((d) => host === d || host.endsWith(`.${d}`));
    return blockedDomain ? `blocked-domain:${blockedDomain}` : null;
  } catch {
    return 'invalid-url';
  }
}

function normalizeList(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.map((v) => String(v).replace(/^▢\s*/, '').trim()).filter(Boolean);
  }
  if (typeof value === 'string') {
    return value
      .split(/\r?\n/)
      .map((s) => s.replace(/^▢\s*/, '').trim())
      .filter(Boolean);
  }
  return [];
}

function normalizeSourceUrl(url: string): string {
  const trimmed = String(url || '').trim();
  if (!trimmed) return '';

  try {
    const parsed = new URL(trimmed);
    parsed.hash = '';
    const normalizedPath = parsed.pathname.replace(/\/+$/, '');
    parsed.pathname = normalizedPath || '/';
    return parsed.toString();
  } catch {
    return trimmed;
  }
}

function sourceUrlCandidates(url: string): string[] {
  const normalized = normalizeSourceUrl(url);
  if (!normalized) return [];

  const variants = new Set<string>([normalized]);
  if (normalized.endsWith('/')) {
    variants.add(normalized.slice(0, -1));
  } else {
    variants.add(`${normalized}/`);
  }
  return Array.from(variants);
}

function normalizeRecipeNameForMatch(name: string) {
  return String(name || '').toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
}

function normalizeIngredientForMatch(line: string) {
  const parsed = parseIngredientLine(String(line || ''));
  return parsed.name.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
}

function recipeFingerprint(name: string, ingredients: string[]) {
  const normalizedIngredients = ingredients
    .map(normalizeIngredientForMatch)
    .filter(Boolean)
    .sort();

  return JSON.stringify({
    name: normalizeRecipeNameForMatch(name),
    ingredients: normalizedIngredients,
  });
}

async function getCurrentSharer() {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { user: null, sharedByName: null };

  const { data: profile } = await supabase
    .from('profiles')
    .select('display_name')
    .eq('user_id', user.id)
    .maybeSingle();

  const sharedByName = profile?.display_name?.trim()
    || user.user_metadata?.display_name?.trim()
    || user.email?.split('@')[0]
    || null;

  return { user, sharedByName };
}

function withSharedMetadata(rawPayload: unknown, userId: string, sharedByName: string | null) {
  const basePayload =
    rawPayload && typeof rawPayload === 'object' && !Array.isArray(rawPayload)
      ? { ...(rawPayload as Record<string, unknown>) }
      : {};

  return {
    ...basePayload,
    shared_by_user_id: userId,
    shared_by_name: sharedByName,
    shared_at: new Date().toISOString(),
  };
}

export default function ImportRecipeDialog({
  children,
  open: controlledOpen,
  onOpenChange,
  initialTab = 'url',
}: ImportRecipeDialogProps) {
  const navigate = useNavigate();
  const [internalOpen, setInternalOpen] = useState(false);
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<ImportTab>(initialTab);
  const [showManualPaste, setShowManualPaste] = useState(false);
  const [manualText, setManualText] = useState('');
  const [lastImportError, setLastImportError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const recipePhotoInputRef = useRef<HTMLInputElement>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const { likeRecipe } = useStore();
  const { isPremium } = usePremiumAccess();

  const promptPremiumUpgrade = () => {
    toast.info('This is a Premium feature. Upgrade to unlock AI imports.', {
      action: {
        label: 'Open Settings',
        onClick: () => navigate('/settings'),
      },
    });
  };

  // Review mode state
  const [reviewMode, setReviewMode] = useState(false);
  const [reviewData, setReviewData] = useState<ReviewData | null>(null);
  const [websitePreview, setWebsitePreview] = useState<WebsitePreviewData | null>(null);
  const [isDiscoverable, setIsDiscoverable] = useState(true);
  const [newIngredient, setNewIngredient] = useState('');
  const [newIngredientQty, setNewIngredientQty] = useState('');
  const [newInstruction, setNewInstruction] = useState('');
  const [newTag, setNewTag] = useState('');
  const [saving, setSaving] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [fetchingPhoto, setFetchingPhoto] = useState(false);
  const [magicProgress, setMagicProgress] = useState(0);
  const [magicMessage, setMagicMessage] = useState('Summoning recipe magic...');
  const aiAgentCallsDisabled = useAiAgentCallsDisabled();

  const MAGIC_MESSAGES = [
    'Summoning recipe magic... ✨',
    'Whisking through the webpage... 🥣',
    'Parsing the recipe page... 🌐',
    'Decoding ingredients and steps... 🧠',
    'Plating your recipe card... 🍽️',
  ];

  const open = controlledOpen ?? internalOpen;
  const setOpen = (nextOpen: boolean) => {
    if (controlledOpen === undefined) {
      setInternalOpen(nextOpen);
    }
    onOpenChange?.(nextOpen);
  };

  useEffect(() => {
    if (open) {
      setActiveTab(initialTab);
    }
  }, [initialTab, open]);

  useEffect(() => {
    if (!loading) {
      setMagicProgress(0);
      setMagicMessage(MAGIC_MESSAGES[0]);
      return;
    }

    setMagicProgress(8);
    let ticks = 0;
    const timer = window.setInterval(() => {
      ticks += 1;
      setMagicProgress((prev) => Math.min(prev + (prev < 70 ? 11 : 4), 92));
      setMagicMessage(MAGIC_MESSAGES[Math.min(ticks, MAGIC_MESSAGES.length - 1)]);
    }, 850);

    return () => window.clearInterval(timer);
  }, [loading]);

  /** Convert ISO-8601 duration (e.g. PT45M, P0Y0M0DT0H45M0.000S) to human-readable */
  const parseCookTime = (raw: unknown): string => {
    const str = String(raw || '').trim();
    if (!str || str === '—') return '30 min';

    // Match ISO 8601 duration: PnYnMnDTnHnMnS  (any part may be absent)
    const iso = str.match(/^P(?:(\d+)Y)?(?:(\d+)M)?(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+(?:\.\d+)?)S)?)?$/i);
    if (iso) {
      const hours = parseInt(iso[4] || '0', 10);
      const minutes = parseInt(iso[5] || '0', 10);
      const seconds = parseFloat(iso[6] || '0');

      const parts: string[] = [];
      if (hours > 0) parts.push(`${hours} hr`);
      if (minutes > 0) parts.push(`${minutes} min`);
      if (parts.length === 0 && seconds > 0) parts.push(`${Math.round(seconds)} sec`);
      return parts.length > 0 ? parts.join(' ') : '30 min';
    }

    // Already human-readable (e.g. "45 min", "1 hour")
    return str;
  };

  const buildImportedPayload = (id: string, recipe: Record<string, any>) => {
    const normalizedIngredients = Array.isArray(recipe.ingredients)
      ? recipe.ingredients.map((item: unknown) => String(item).trim()).filter(Boolean)
      : [];
    const normalizedInstructions = Array.isArray(recipe.instructions)
      ? recipe.instructions.map((item: unknown) => String(item).trim()).filter(Boolean)
      : [];


    return {
      id,
      name: String(recipe.name || 'Imported Recipe').trim(),
      ingredients: normalizedIngredients,
      instructions: normalizedInstructions,
      cook_time: parseCookTime(recipe.cook_time),
      difficulty: String(recipe.difficulty || 'Intermediate'),
      cuisine: recipe.cuisine ? String(recipe.cuisine) : null,
      tags: Array.isArray(recipe.tags) ? recipe.tags.map((tag: unknown) => String(tag).trim()).filter(Boolean) : [],
      image: String(recipe.image || '/placeholder.svg').trim() || '/placeholder.svg',
      source: 'imported',
      source_url: recipe.source_url ? String(recipe.source_url).trim() : null,
      raw_api_payload: recipe.raw_api_payload ?? null,
      servings: parseInt(String(recipe.servings || 4), 10) || 4,
    };
  };

  const findExistingRecipeByUrl = async (sourceUrl?: string) => {
    const candidates = sourceUrl ? sourceUrlCandidates(sourceUrl) : [];
    if (candidates.length === 0) return null;

    const { data, error } = await supabase
      .from('recipes')
      .select('*')
      .in('source_url', candidates)
      .limit(1)
      .maybeSingle();

    if (error) throw error;
    return data;
  };

  const findExistingRecipeByFingerprint = async (name: string, ingredients: string[]) => {
    const normalizedName = normalizeRecipeNameForMatch(name);
    if (!normalizedName || ingredients.length === 0) return null;

    const {
      data: { user },
    } = await supabase.auth.getUser();

    let query = supabase
      .from('recipes')
      .select('*')
      .ilike('name', name.trim())
      .limit(25);

    if (user) {
      query = query.or(`is_public.eq.true,created_by.eq.${user.id}`);
    } else {
      query = query.eq('is_public', true);
    }

    const { data, error } = await query;
    if (error) throw error;

    const targetFingerprint = recipeFingerprint(name, ingredients);
    return (data || []).find((candidate: any) =>
      recipeFingerprint(String(candidate.name || ''), Array.isArray(candidate.ingredients) ? candidate.ingredients : []) === targetFingerprint
    ) || null;
  };

  const mapDbRecipeToImportedPayload = (recipe: Record<string, any>) => buildImportedPayload(String(recipe.id), {
    ...recipe,
    source: recipe.source || 'community',
  });

  const persistRecipe = async (payload: Record<string, any>, options?: { forceDiscoverable?: boolean }) => {
    const existingRecipe = await findExistingRecipeByUrl(payload.source_url);
    if (existingRecipe) {
      const existingPayload = mapDbRecipeToImportedPayload(existingRecipe);
      likeRecipe(existingPayload.id, existingPayload);
      return { reusedExisting: true, payload: existingPayload };
    }

    const existingByFingerprint = await findExistingRecipeByFingerprint(
      String(payload.name || ''),
      Array.isArray(payload.ingredients) ? payload.ingredients : [],
    );
    if (existingByFingerprint) {
      const existingPayload = mapDbRecipeToImportedPayload(existingByFingerprint);
      likeRecipe(existingPayload.id, existingPayload);
      return { reusedExisting: true, payload: existingPayload };
    }

    const shouldDiscover = options?.forceDiscoverable ?? isDiscoverable;
    const { user, sharedByName } = await getCurrentSharer();
    const payloadWithShareMetadata = user && shouldDiscover
      ? {
        ...payload,
        raw_api_payload: withSharedMetadata(payload.raw_api_payload, user.id, sharedByName),
      }
      : payload;

    if (user && shouldDiscover) {
      // Safely serialize raw_api_payload — some AI responses contain non-serializable objects
      let safeRawPayload: any = null;
      if (payloadWithShareMetadata.raw_api_payload && typeof payloadWithShareMetadata.raw_api_payload === 'object') {
        try {
          safeRawPayload = JSON.parse(JSON.stringify(payloadWithShareMetadata.raw_api_payload));
        } catch {
          safeRawPayload = null;
        }
      }

      const insertData = {
        id: payload.id,
        name: String(payload.name || 'Imported Recipe').trim(),
        image: String(payload.image || '/placeholder.svg').trim() || '/placeholder.svg',
        cook_time: String(payload.cook_time || '30 min'),
        difficulty: String(payload.difficulty || 'Intermediate'),
        ingredients: Array.isArray(payload.ingredients) ? payload.ingredients : [],
        instructions: Array.isArray(payload.instructions) ? payload.instructions : [],
        tags: Array.isArray(payload.tags) ? payload.tags : [],
        cuisine: payload.cuisine ? String(payload.cuisine) : null,
        source: String(payload.source || 'imported'),
        source_url: payload.source_url ? String(payload.source_url) : null,
        servings: parseInt(String(payload.servings || 4), 10) || 4,
        created_by: user.id,
        is_public: true,
      };

      // Primary insert: try core fields + raw_api_payload
      const { error } = await supabase.from('recipes').insert({
        ...insertData,
        raw_api_payload: safeRawPayload,
      });

      if (error) {
        console.warn(`[Import] Primary insert for "${insertData.name}" failed: ${error.message}${error.details ? ` (${error.details})` : ''}`);

        // Fallback: try without raw_api_payload
        const { error: fallbackError } = await supabase.from('recipes').insert(insertData);
        if (fallbackError) {
          console.error(`[Import] Fallback insert failed: ${fallbackError.message}`);
          toast.error('Could not share recipe publicly, but saved to your library.');
        } else {
          console.info(`[Import] Successfully saved "${insertData.name}" without raw_api_payload.`);
        }
      } else {
        console.info(`[Import] Successfully saved "${insertData.name}" to database.`);
      }
    }

    likeRecipe(payloadWithShareMetadata.id, payloadWithShareMetadata);
    return { reusedExisting: false, payload: payloadWithShareMetadata };
  };

  const saveWebsitePreview = async () => {
    if (!websitePreview) return;

    const id = crypto.randomUUID();
    const payload = buildImportedPayload(id, websitePreview);

    setSaving(true);
    try {
      const result = await persistRecipe(payload);
      setMagicProgress(100);
      toast.success(result.reusedExisting
        ? `Loaded existing recipe "${result.payload.name}" from your library.`
        : `Imported "${payload.name}"!`);
      setOpen(false);
      resetState();
      navigate(`/saved`);
    } catch (err: any) {
      console.error('Website import save error:', err);
      toast.error(err.message || 'Failed to save imported recipe');
    } finally {
      setSaving(false);
    }
  };

  const resetState = () => {
    setUrl('');
    setLoading(false);
    setActiveTab(initialTab);
    setShowManualPaste(false);
    setManualText('');
    setLastImportError('');
    setReviewMode(false);
    setReviewData(null);
    setWebsitePreview(null);
    setIsDiscoverable(true);
    setNewIngredient('');
    setNewIngredientQty('');
    setNewInstruction('');
    setNewTag('');
    setSaving(false);
    setUploadingPhoto(false);
    setFetchingPhoto(false);
  };

  const handleExtract = async (payload: { url?: string; textContent?: string; imageBase64?: string; imageMimeType?: string }) => {
    if (aiAgentCallsDisabled) {
      if (payload.url) {
        await handleNonPremiumUrlImport(payload.url);
      } else {
        toast.info(getAiDisabledMessage('AI recipe extraction'));
      }
      return;
    }

    if (!isPremium && !payload.url) {
      promptPremiumUpgrade();
      return;
    }

    setLoading(true);
    setLastImportError('');

    try {
      const normalizedPayload = payload.url
        ? {
          ...payload,
          url: /^https?:\/\//i.test(payload.url.trim()) ? payload.url.trim() : `https://${payload.url.trim()}`,
        }
        : payload;

      const { data, error } = await invokeAppFunction('import-recipe', {
        body: normalizedPayload,
      });

      if (error || !data?.success) {
        const message = data?.error || error?.message || 'Failed to import recipe';
        setLastImportError(message);

        if (payload.url) {
          setShowManualPaste(true);
          toast.error('Could not import from that URL. You can paste recipe text or upload a PDF.');
        } else {
          toast.error(message);
        }
        return;
      }

      const recipe = data.recipe;

      if (payload.url) {
        const importedSourceUrl = normalizeSourceUrl(String(recipe.source_url || payload.url));

        const existingRecipe = await findExistingRecipeByUrl(recipe.source_url ? String(recipe.source_url) : undefined);

        if (existingRecipe) {
          // Recipe already exists — just add to library
          const existingPayload = mapDbRecipeToImportedPayload(existingRecipe);
          likeRecipe(existingPayload.id, existingPayload);
          toast.success(`"${existingPayload.name}" is already in your library!`);
          setOpen(false);
          resetState();
          navigate('/saved');
          return;
        }

        // Auto-save immediately — no editable preview
        const id = crypto.randomUUID();
      const autoPayload = buildImportedPayload(id, {
          ...recipe,
          source_url: importedSourceUrl,
        });

        try {
          await persistRecipe(autoPayload, { forceDiscoverable: true });
          toast.success(`Imported "${autoPayload.name}".`);
          setOpen(false);
          resetState();
          navigate('/saved');
        } catch (saveErr: any) {
          console.error('Auto-save error:', saveErr);
          toast.error(saveErr.message || 'Failed to save recipe');
        }
        return;
      }

      const normalizeIngredients = (value: unknown): IngredientEntry[] =>
        normalizeList(value).map((line) => {
          const parsed = parseIngredientLine(line);
          return { name: parsed.name, quantity: parsed.quantity };
        });

      setReviewData({
        name: String(recipe.name || ''),
        ingredients: normalizeIngredients(recipe.ingredients),
        instructions: normalizeList(recipe.instructions),
        cook_time: recipe.cook_time || '30 min',
        difficulty: recipe.difficulty || 'Intermediate',
        cuisine: recipe.cuisine || '',
        chef: recipe.chef || '',
        tags: normalizeList(recipe.tags),
        image: recipe.image || '/placeholder.svg',
        servings: String(recipe.servings || 4),
      });
      setIsDiscoverable(true);
      setReviewMode(true);
      toast.success('Recipe extracted! Review and edit before saving.');
    } catch (err) {
      if (isAiAgentCallsDisabledError(err)) {
        toast.info(getAiDisabledMessage('AI recipe extraction'));
        return;
      }

      console.error('Import error:', err);
      const message = 'Something went wrong importing the recipe';
      setLastImportError(message);
      if (payload.url) {
        setShowManualPaste(true);
        toast.error('URL import failed. Paste recipe text instead or upload a PDF.');
      } else {
        toast.error(message);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSaveRecipe = async () => {
    if (!reviewData || !reviewData.name.trim()) {
      toast.error('Recipe name is required');
      return;
    }

    if (reviewData.ingredients.length === 0) {
      toast.error('At least one ingredient is required');
      return;
    }

    setSaving(true);
    const id = crypto.randomUUID();

    try {
      const ingredientLines = reviewData.ingredients.map(composeIngredientLine);
      const existingRecipe = await findExistingRecipeByFingerprint(reviewData.name, ingredientLines);
      if (existingRecipe) {
        const existingPayload = mapDbRecipeToImportedPayload(existingRecipe);
        likeRecipe(existingPayload.id, existingPayload);
        toast.success(`"${existingPayload.name}" is already in Munch, so we saved the existing recipe to your library.`);
        setOpen(false);
        resetState();
        return;
      }

      const { user, sharedByName } = await getCurrentSharer();
      const sharedMetadata = user && isDiscoverable
        ? withSharedMetadata(null, user.id, sharedByName)
        : null;

      if (isDiscoverable) {
        if (!user) {
          toast.info('Not logged in — saved privately. Log in to make it discoverable.');
        } else {
          // Standard manual import save flow
          const coreInsertData = {
            id,
            name: reviewData.name,
            ingredients: ingredientLines,
            instructions: reviewData.instructions,
            cook_time: reviewData.cook_time,
            difficulty: reviewData.difficulty,
            cuisine: reviewData.cuisine || null,
            tags: reviewData.tags,
            image: reviewData.image,
            source: 'imported',
            created_by: user.id,
            is_public: true,
            servings: parseInt(reviewData.servings) || 4,
            raw_api_payload: sharedMetadata,
          };

          const { error } = await supabase.from('recipes').insert(coreInsertData);

          if (error) {
            console.error('[Import] Manual save failed:', error.message);
            toast.error('Failed to make recipe discoverable. Saved locally instead.');
          } else {
            toast.success(`"${reviewData.name}" is now discoverable by others!`);
          }
        }
      }

      // Always save locally too
      const recipeData = {
        id,
        name: reviewData.name,
        ingredients: ingredientLines,
        instructions: reviewData.instructions,
        cook_time: reviewData.cook_time,
        difficulty: reviewData.difficulty,
        cuisine: reviewData.cuisine || null,
        chef: reviewData.chef || null,
        tags: reviewData.tags,
        image: reviewData.image,
        source: 'imported',
        raw_api_payload: sharedMetadata,
        servings: parseInt(reviewData.servings) || 4,
      };

      likeRecipe(id, recipeData);

      if (!isDiscoverable) {
        toast.success(`Imported "${reviewData.name}"!`);
      }

      setOpen(false);
      resetState();
    } catch (err) {
      console.error('Save error:', err);
      toast.error('Failed to save recipe');
    } finally {
      setSaving(false);
    }
  };


  const handleNonPremiumUrlImport = async (normalizedUrl: string) => {
    setLoading(true);
    setLastImportError('');

    try {
      const existingRecipe = await findExistingRecipeByUrl(normalizedUrl);
      if (existingRecipe) {
        const existingPayload = mapDbRecipeToImportedPayload(existingRecipe);
        likeRecipe(existingPayload.id, existingPayload);
        toast.success(`"${existingPayload.name}" is already in your library!`);
        setOpen(false);
        resetState();
        navigate('/saved');
        return;
      }

      toast.error('URL imports are only supported right now for recipe pages we can display in-app.');
    } catch (err: any) {
      console.error('Non-premium URL import error:', err);
      setLastImportError(err?.message || 'Could not load recipe from that URL');
      toast.error('Could not load this URL right now.');
    } finally {
      setLoading(false);
    }
  };

  const handleUrlSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedUrl = url.trim();
    if (!trimmedUrl) return;

    const normalizedUrl = /^https?:\/\//i.test(trimmedUrl)
      ? trimmedUrl
      : `https://${trimmedUrl}`;

    try {
      // Quick sanity check to avoid sending clearly invalid values to the edge function.
      // Relative/host-only inputs are allowed as long as they parse as a URL.
      new URL(normalizedUrl);
    } catch {
      setLastImportError('Please enter a valid recipe URL.');
      setShowManualPaste(true);
      toast.error('Invalid URL format. You can paste recipe text instead.');
      return;
    }

    if (aiAgentCallsDisabled || !isPremium) {
      void handleNonPremiumUrlImport(normalizedUrl);
      return;
    }

    handleExtract({ url: normalizedUrl });
  };

  const handleManualImport = () => {
    if (!manualText.trim()) return;
    handleExtract({ textContent: manualText.trim() });
  };

  const handleRecipePhotoImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Please upload an image file');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast.error('Image too large (max 10MB)');
      return;
    }

    const MAX_IMAGE_SIDE = 1600;
    const JPEG_QUALITY = 0.82;

    const toBase64 = (input: Blob) =>
      new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const result = String(reader.result || '');
          const base64 = result.split(',')[1];
          if (!base64) {
            reject(new Error('Failed to read image'));
            return;
          }
          resolve(base64);
        };
        reader.onerror = () => reject(reader.error || new Error('Failed to read image'));
        reader.readAsDataURL(input);
      });

    const optimizeImageForExtraction = (input: File) =>
      new Promise<Blob>((resolve) => {
        const imageUrl = URL.createObjectURL(input);
        const img = new Image();

        img.onload = () => {
          const width = img.naturalWidth || img.width;
          const height = img.naturalHeight || img.height;
          const longestSide = Math.max(width, height) || 1;
          const scale = Math.min(1, MAX_IMAGE_SIDE / longestSide);
          const targetWidth = Math.max(1, Math.round(width * scale));
          const targetHeight = Math.max(1, Math.round(height * scale));

          const canvas = document.createElement('canvas');
          canvas.width = targetWidth;
          canvas.height = targetHeight;

          const context = canvas.getContext('2d');
          if (!context) {
            URL.revokeObjectURL(imageUrl);
            resolve(input);
            return;
          }

          context.drawImage(img, 0, 0, targetWidth, targetHeight);
          canvas.toBlob(
            (blob) => {
              URL.revokeObjectURL(imageUrl);
              resolve(blob || input);
            },
            'image/jpeg',
            JPEG_QUALITY,
          );
        };

        img.onerror = () => {
          URL.revokeObjectURL(imageUrl);
          resolve(input);
        };

        img.src = imageUrl;
      });

    try {
      const optimizedImage = await optimizeImageForExtraction(file);
      const imageBase64 = await toBase64(optimizedImage);
      handleExtract({ imageBase64, imageMimeType: 'image/jpeg' });
    } catch {
      toast.error('Could not read image. Try a different file.');
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type !== 'application/pdf' && !file.name.endsWith('.pdf')) {
      toast.error('Please upload a PDF file');
      return;
    }

    if (file.size > 20 * 1024 * 1024) {
      toast.error('File too large (max 20MB)');
      return;
    }

    const text = await extractPdfText(file);
    if (!text || text.length < 20) {
      toast.error('Could not read text from this PDF. Try copy/pasting the recipe text instead.');
      return;
    }
    handleExtract({ textContent: text });
  };

  const extractPdfText = async (file: File): Promise<string> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => {
        const buffer = reader.result as ArrayBuffer;
        const bytes = new Uint8Array(buffer);
        let text = '';
        let current = '';

        for (let i = 0; i < bytes.length; i++) {
          const c = bytes[i];
          if (c >= 32 && c <= 126) {
            current += String.fromCharCode(c);
          } else {
            if (current.length > 3) text += `${current} `;
            current = '';
          }
        }

        if (current.length > 3) text += current;
        resolve(text.slice(0, 15000));
      };
      reader.onerror = () => resolve('');
      reader.readAsArrayBuffer(file);
    });
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !reviewData) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image too large (max 5MB)');
      return;
    }

    setUploadingPhoto(true);
    try {
      const session = (await supabase.auth.getSession()).data.session;
      const userId = session?.user?.id || 'anonymous';
      const ext = file.name.split('.').pop() || 'jpg';
      const filePath = `${userId}/${Date.now()}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from('recipe-photos')
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('recipe-photos')
        .getPublicUrl(filePath);

      setReviewData({ ...reviewData, image: publicUrl });
      toast.success('Photo uploaded!');
    } catch (err: any) {
      console.error('Photo upload error:', err);
      toast.error('Upload failed: ' + (err.message || 'Unknown error'));
    } finally {
      setUploadingPhoto(false);
    }
  };

  const fetchRandomPhoto = async () => {
    if (!reviewData) return;
    setFetchingPhoto(true);
    try {
      const res = await fetch('https://foodish-api.com/api/');
      if (res.ok) {
        const data = await res.json();
        if (data?.image) {
          setReviewData({ ...reviewData, image: data.image });
        }
      }
    } catch {
      toast.error('Could not fetch photo');
    } finally {
      setFetchingPhoto(false);
    }
  };

  const openReviewForWebsitePreview = () => {
    if (!websitePreview) return;

    setReviewData({
      name: websitePreview.name,
      ingredients: websitePreview.ingredients.map((line) => {
        const parsed = parseIngredientLine(line);
        return { name: parsed.name, quantity: parsed.quantity };
      }),
      instructions: websitePreview.instructions,
      cook_time: websitePreview.cook_time,
      difficulty: websitePreview.difficulty,
      cuisine: websitePreview.cuisine,
      chef: websitePreview.chef,
      tags: websitePreview.tags,
      image: websitePreview.image,
      servings: websitePreview.servings,
    });
    setReviewMode(true);
    setWebsitePreview(null);
    toast.success('You can now edit the imported recipe before saving.');
  };

  // Review mode helpers
  const addIngredient = () => {
    if (!newIngredient.trim() || !reviewData) return;
    setReviewData({
      ...reviewData,
      ingredients: [...reviewData.ingredients, { name: newIngredient.trim(), quantity: newIngredientQty.trim() }],
    });
    setNewIngredient('');
    setNewIngredientQty('');
  };

  const removeIngredient = (idx: number) => {
    if (!reviewData) return;
    setReviewData({ ...reviewData, ingredients: reviewData.ingredients.filter((_, i) => i !== idx) });
  };

  const updateIngredient = (idx: number, field: keyof IngredientEntry, value: string) => {
    if (!reviewData) return;
    setReviewData({
      ...reviewData,
      ingredients: reviewData.ingredients.map((ingredient, i) => (i === idx ? { ...ingredient, [field]: value } : ingredient)),
    });
  };

  const addInstruction = () => {
    if (!newInstruction.trim() || !reviewData) return;
    setReviewData({ ...reviewData, instructions: [...reviewData.instructions, newInstruction.trim()] });
    setNewInstruction('');
  };

  const removeInstruction = (idx: number) => {
    if (!reviewData) return;
    setReviewData({ ...reviewData, instructions: reviewData.instructions.filter((_, i) => i !== idx) });
  };

  const updateInstruction = (idx: number, value: string) => {
    if (!reviewData) return;
    setReviewData({
      ...reviewData,
      instructions: reviewData.instructions.map((instruction, i) => (i === idx ? value : instruction)),
    });
  };

  const addTag = () => {
    if (!newTag.trim() || !reviewData) return;
    if (!reviewData.tags.includes(newTag.trim())) {
      setReviewData({ ...reviewData, tags: [...reviewData.tags, newTag.trim()] });
    }
    setNewTag('');
  };

  const removeTag = (tag: string) => {
    if (!reviewData) return;
    setReviewData({ ...reviewData, tags: reviewData.tags.filter((t) => t !== tag) });
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) resetState();
      }}
    >
      {children ? (
        <DialogTrigger asChild>{children}</DialogTrigger>
      ) : null}
      <DialogContent className="max-w-lg max-h-[85vh] overflow-hidden flex flex-col p-0">
        <DialogHeader className="px-6 pt-6 pb-2">
          <DialogTitle className="flex items-center gap-2">
            {websitePreview
              ? 'Website Recipe Preview'
              : reviewMode
                ? 'Review & Edit Recipe'
                : <><Brain className="h-4 w-4 text-violet-500" /> Import Recipe (AI) {!isPremium && <Badge variant="secondary" className="ml-1">Premium</Badge>}</>}
          </DialogTitle>
        </DialogHeader>

        {websitePreview ? (
          <div className="flex-1 min-h-0 overflow-y-auto px-6 pb-6">
            <div className="space-y-5">
              {websitePreview.image && websitePreview.image !== '/placeholder.svg' && (
                <img src={websitePreview.image} alt={websitePreview.name} className="h-44 w-full rounded-xl object-cover" />
              )}

              <div className="space-y-2">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-xl font-semibold text-foreground">{websitePreview.name}</h3>
                    <p className="text-sm text-muted-foreground">
                      {websitePreview.cook_time} · {websitePreview.difficulty} · {websitePreview.servings} servings
                    </p>
                    {websitePreview.description && (
                      <p className="mt-2 text-sm text-muted-foreground">{websitePreview.description}</p>
                    )}
                  </div>
                  {websitePreview.source_url && (
                    <Button type="button" variant="outline" size="sm" asChild>
                      <a href={websitePreview.source_url} target="_blank" rel="noreferrer">
                        <Globe className="h-4 w-4 mr-1.5" /> Open source
                      </a>
                    </Button>
                  )}
                </div>
                {websitePreview.cuisine && (
                  <p className="text-sm text-muted-foreground">{websitePreview.cuisine}</p>
                )}
                {websitePreview.chef && (
                  <p className="text-sm text-muted-foreground">Chef: {websitePreview.chef}</p>
                )}
              </div>

              {websitePreview.tags.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {websitePreview.tags.map((tag) => (
                    <Badge key={tag} variant="outline">{tag}</Badge>
                  ))}
                </div>
              )}

              {websitePreview.ingredients.length > 0 && (
                <div>
                  <p className="text-sm font-medium text-foreground">Ingredients</p>
                  <div className="mt-2 space-y-2">
                    {websitePreview.ingredients.map((ingredient, idx) => (
                      <div key={idx} className="flex items-center justify-between rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm">
                        <span className="font-medium text-gray-900">{composeIngredientLine(parseIngredientLine(ingredient))}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {websitePreview.instructions.length > 0 && (
                <div>
                  <p className="text-sm font-medium text-foreground">Instructions</p>
                  <ol className="mt-2 space-y-2">
                    {websitePreview.instructions.map((step, idx) => (
                      <li key={idx} className="flex gap-3 rounded-md border border-border bg-muted/30 px-3 py-2 text-sm text-foreground">
                        <span className="text-xs font-semibold text-muted-foreground pt-0.5">{idx + 1}.</span>
                        <span>{step}</span>
                      </li>
                    ))}
                  </ol>
                </div>
              )}

              {typeof websitePreview.raw_api_payload?.preview_text === 'string' && websitePreview.raw_api_payload.preview_text.trim() && (
                <div>
                  <p className="text-sm font-medium text-foreground">Cleaned Page Preview</p>
                  <div className="mt-2 rounded-lg border border-border bg-muted/20 p-3 text-sm text-muted-foreground whitespace-pre-wrap max-h-56 overflow-y-auto">
                    {websitePreview.raw_api_payload.preview_text.trim()}
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between p-3 rounded-lg border bg-muted/30">
                <div className="flex items-center gap-2">
                  {isDiscoverable ? <Globe size={18} className="text-primary" /> : <Lock size={18} className="text-muted-foreground" />}
                  <div>
                    <Label htmlFor="discoverable-web" className="cursor-pointer">Make Discoverable</Label>
                    <p className="text-xs text-muted-foreground">
                      {isDiscoverable ? 'Others can find this imported recipe' : 'Only you can see this imported recipe'}
                    </p>
                  </div>
                </div>
                <Switch
                  id="discoverable-web"
                  checked={isDiscoverable}
                  onCheckedChange={setIsDiscoverable}
                />
              </div>

              <div className="rounded-lg border border-violet-200/70 bg-violet-50/60 p-3 text-sm text-violet-900 dark:border-violet-800 dark:bg-violet-950/20 dark:text-violet-200">
                Imported recipes can be edited before saving. Use <span className="font-medium">Review &amp; Edit</span> to adjust ingredients, steps, or details.
              </div>

              <div className="flex flex-col gap-2 pt-1 sm:flex-row">
                <Button variant="outline" className="flex-1" onClick={() => setWebsitePreview(null)} disabled={saving}>
                  Back
                </Button>
                <Button className="flex-1" onClick={openReviewForWebsitePreview} disabled={saving}>
                  Review & Edit Before Saving
                </Button>
                <Button variant="outline" className="flex-1" onClick={saveWebsitePreview} disabled={saving}>
                  {saving ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Saving...
                    </>
                  ) : (
                    'Quick Save'
                  )}
                </Button>
              </div>
            </div>
          </div>
        ) : reviewMode && reviewData ? (
          <div className="flex-1 min-h-0 overflow-y-auto px-6 pb-6">
            <div className="space-y-4">
              {/* Recipe Name */}
              <div>
                <label className="text-sm font-medium text-foreground">Recipe Name *</label>
                <Input
                  value={reviewData.name}
                  onChange={(e) => setReviewData({ ...reviewData, name: e.target.value })}
                  placeholder="Enter recipe name"
                />
              </div>

              {/* Photo */}
              <div>
                <label className="text-sm font-medium text-foreground">Photo</label>
                <div className="flex gap-2 mt-1">
                  <Input
                    value={reviewData.image === '/placeholder.svg' ? '' : reviewData.image}
                    onChange={(e) => setReviewData({ ...reviewData, image: e.target.value || '/placeholder.svg' })}
                    placeholder="Image URL (optional)"
                    className="flex-1"
                  />
                  <input
                    ref={photoInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handlePhotoUpload}
                    className="hidden"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => photoInputRef.current?.click()}
                    disabled={uploadingPhoto}
                    title="Upload photo"
                  >
                    {uploadingPhoto ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={fetchRandomPhoto}
                    disabled={fetchingPhoto}
                    title="Use random photo"
                  >
                    {fetchingPhoto ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
                  </Button>
                </div>
                {reviewData.image && reviewData.image !== '/placeholder.svg' && (
                  <img src={reviewData.image} alt="Preview" className="mt-2 h-24 w-full object-cover rounded-lg" />
                )}
              </div>

              {/* Cook time, Servings, Difficulty, Cuisine row */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium text-foreground">Cook Time</label>
                  <Input
                    value={reviewData.cook_time}
                    onChange={(e) => setReviewData({ ...reviewData, cook_time: e.target.value })}
                    placeholder="30 min"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-foreground">Servings</label>
                  <Select
                    value={reviewData.servings}
                    onValueChange={(v) => setReviewData({ ...reviewData, servings: v })}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {[1, 2, 3, 4, 5, 6, 8, 10, 12].map(n => (
                        <SelectItem key={n} value={String(n)}>{n} {n === 1 ? 'serving' : 'servings'}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium text-foreground">Difficulty</label>
                  <Select
                    value={reviewData.difficulty}
                    onValueChange={(v) => setReviewData({ ...reviewData, difficulty: v })}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {DIFFICULTY_OPTIONS.map((d) => (
                        <SelectItem key={d} value={d}>{d}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium text-foreground">Cuisine</label>
                  <Input
                    value={reviewData.cuisine}
                    onChange={(e) => setReviewData({ ...reviewData, cuisine: e.target.value })}
                    placeholder="Italian"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-foreground">Chef (optional)</label>
                  <Input
                    value={reviewData.chef}
                    onChange={(e) => setReviewData({ ...reviewData, chef: e.target.value })}
                    placeholder="Chef name"
                  />
                </div>
              </div>

              {/* Ingredients */}
              <div>
                <label className="text-sm font-medium text-foreground">Ingredients *</label>
                <div className="flex gap-2 mt-1">
                  <Input
                    value={newIngredientQty}
                    onChange={(e) => setNewIngredientQty(e.target.value)}
                    placeholder="Qty"
                    className="w-24"
                    onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addIngredient())}
                  />
                  <Input
                    value={newIngredient}
                    onChange={(e) => setNewIngredient(e.target.value)}
                    placeholder="Add ingredient..."
                    onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addIngredient())}
                  />
                  <Button type="button" variant="outline" size="icon" onClick={addIngredient}>
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                <div className="space-y-1.5 mt-2">
                  {reviewData.ingredients.map((ing, idx) => (
                    <div key={`ingredient-${idx}`} className="flex items-center gap-2 rounded-md border border-border bg-background/70 p-1.5">
                      <Input
                        value={ing.quantity}
                        onChange={(e) => updateIngredient(idx, 'quantity', e.target.value)}
                        placeholder="Qty"
                        className="h-8 w-24"
                      />
                      <Input
                        value={ing.name}
                        onChange={(e) => updateIngredient(idx, 'name', e.target.value)}
                        placeholder="Ingredient"
                        className="h-8 flex-1"
                      />
                      <button type="button" onClick={() => removeIngredient(idx)} className="text-muted-foreground hover:text-destructive">
                        <X size={12} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Tags */}
              <div>
                <label className="text-sm font-medium text-foreground">Tags</label>
                <div className="flex gap-2 mt-1">
                  <Input
                    value={newTag}
                    onChange={(e) => setNewTag(e.target.value)}
                    placeholder="e.g. spicy, vegan"
                    onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
                  />
                  <Button type="button" variant="outline" size="icon" onClick={addTag}>
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {reviewData.tags.map((tag) => (
                    <Badge key={tag} variant="outline" className="gap-1">
                      {tag}
                      <button onClick={() => removeTag(tag)} className="ml-1 hover:text-destructive">
                        <X size={12} />
                      </button>
                    </Badge>
                  ))}
                </div>
              </div>

              {/* Instructions */}
              <div>
                <label className="text-sm font-medium text-foreground">Steps / Instructions</label>
                <div className="flex gap-2 mt-1">
                  <Input
                    value={newInstruction}
                    onChange={(e) => setNewInstruction(e.target.value)}
                    placeholder="Add a cooking step..."
                    onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addInstruction())}
                  />
                  <Button type="button" variant="outline" size="icon" onClick={addInstruction}>
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                <div className="space-y-1.5 mt-2">
                  {reviewData.instructions.map((step, idx) => (
                    <div key={idx} className="flex items-start gap-2 rounded-md border border-border bg-muted/40 px-2 py-1.5 text-sm">
                      <span className="text-xs font-semibold text-muted-foreground pt-2">{idx + 1}.</span>
                      <Input
                        value={step}
                        onChange={(e) => updateInstruction(idx, e.target.value)}
                        className="h-8 flex-1"
                      />
                      <button type="button" onClick={() => removeInstruction(idx)} className="text-muted-foreground hover:text-destructive pt-1">
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Make Discoverable toggle */}
              <div className="flex items-center justify-between p-3 rounded-lg border bg-muted/30">
                <div className="flex items-center gap-2">
                  {isDiscoverable ? <Globe size={18} className="text-primary" /> : <Lock size={18} className="text-muted-foreground" />}
                  <div>
                    <Label htmlFor="discoverable" className="cursor-pointer">Make Discoverable</Label>
                    <p className="text-xs text-muted-foreground">
                      {isDiscoverable ? 'Others can find this in the Recipes tab' : 'Only you can see this recipe'}
                    </p>
                  </div>
                </div>
                <Switch
                  id="discoverable"
                  checked={isDiscoverable}
                  onCheckedChange={setIsDiscoverable}
                />
              </div>

              {/* Action buttons */}
              <div className="flex gap-2 pt-2">
                <Button variant="outline" className="flex-1" onClick={() => setReviewMode(false)} disabled={saving}>
                  Back
                </Button>
                <Button className="flex-1" onClick={handleSaveRecipe} disabled={saving}>
                  {saving ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Saving...
                    </>
                  ) : (
                    'Save Recipe'
                  )}
                </Button>
              </div>
            </div>
          </div>
        ) : (
          // Import Mode (URL/PDF/Paste)
          <div className="flex-1 min-h-0 overflow-y-auto px-6 pb-6">
            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as ImportTab)} className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="url" className="flex items-center gap-1.5">
                  <Link2 className="h-3.5 w-3.5" /> From URL
                </TabsTrigger>
                <TabsTrigger value="pdf" className="flex items-center gap-1.5">
                  <FileText className="h-3.5 w-3.5" /> From PDF
                </TabsTrigger>
                <TabsTrigger value="photo" className="flex items-center gap-1.5">
                  <Camera className="h-3.5 w-3.5" /> From Photo
                </TabsTrigger>
              </TabsList>

              <TabsContent value="url" className="space-y-4 pt-4">
                <p className="text-sm text-muted-foreground">
                  🧠 Paste a recipe page URL and we'll import it only when the original page can be displayed in-app.
                </p>

                <form onSubmit={handleUrlSubmit} noValidate className="space-y-3">
                  <Input
                    type="text"
                    placeholder="https://example.com/recipe/..."
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    disabled={loading}
                  />
                  <Button type="submit" className="w-full" disabled={loading || !url.trim()}>
                    {loading ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Extracting...
                      </>
                    ) : (
                      isPremium ? 'Import Recipe' : 'Check Existing Import'
                    )}
                  </Button>
                </form>

                {loading && (
                  <div className="rounded-lg border bg-primary/5 p-3 space-y-2">
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>{magicMessage}</span>
                      <span>{magicProgress}%</span>
                    </div>
                    <Progress value={magicProgress} className="h-2" />
                  </div>
                )}

                {(lastImportError || showManualPaste) && (
                  <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 space-y-3">
                    <p className="text-xs text-destructive font-medium">
                      URL import didn't work. You can paste the recipe text below or switch to PDF upload.
                    </p>
                    {lastImportError && (
                      <p className="text-xs text-muted-foreground break-words">{lastImportError}</p>
                    )}
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="flex-1"
                        onClick={() => setShowManualPaste((prev) => !prev)}
                      >
                        <ClipboardPaste className="h-3.5 w-3.5 mr-1" />
                        {showManualPaste ? 'Hide Paste Box' : 'Paste Text Instead'}
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="flex-1"
                        onClick={() => setActiveTab('pdf')}
                      >
                        <FileText className="h-3.5 w-3.5 mr-1" /> Upload PDF
                      </Button>
                    </div>

                    {showManualPaste && (
                      <div className="space-y-2">
                        <Textarea
                          rows={6}
                          value={manualText}
                          onChange={(e) => setManualText(e.target.value)}
                          placeholder="Copy and paste the recipe title, ingredients, and instructions here..."
                          disabled={loading}
                        />
                        <Button
                          type="button"
                          onClick={handleManualImport}
                          className="w-full"
                          disabled={loading || !manualText.trim()}
                        >
                          {loading ? (
                            <>
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Importing...
                            </>
                          ) : (
                            isPremium ? '🧠 Import Pasted Text' : 'Upgrade for AI Import'
                          )}
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="pdf" className="space-y-4 pt-4">
                <p className="text-sm text-muted-foreground">
                  🧠 Upload a PDF with a recipe and AI will extract the details. {!isPremium && <span className="font-semibold">Premium required.</span>}
                </p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf"
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <Button
                  variant="outline"
                  className="w-full h-24 border-dashed border-2 flex flex-col gap-2"
                  onClick={() => {
                    if (!isPremium) {
                      promptPremiumUpgrade();
                      return;
                    }
                    fileInputRef.current?.click();
                  }}
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-6 w-6 animate-spin" />
                      <span className="text-sm">Extracting recipe...</span>
                    </>
                  ) : (
                    <>
                      <FileText className="h-6 w-6 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">{isPremium ? 'Click to upload PDF (max 20MB)' : 'Upgrade for AI PDF import'}</span>
                    </>
                  )}
                </Button>
              </TabsContent>

              <TabsContent value="photo" className="space-y-4 pt-4">
                <p className="text-sm text-muted-foreground">
                  🧠 Upload a photo of a recipe card, cookbook page, or screenshot. AI will read the image and map it to recipe fields. {!isPremium && <span className="font-semibold">Premium required.</span>}
                </p>
                <input
                  ref={recipePhotoInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleRecipePhotoImport}
                  className="hidden"
                />
                <Button
                  variant="outline"
                  className="w-full h-24 border-dashed border-2 flex flex-col gap-2"
                  onClick={() => {
                    if (!isPremium) {
                      promptPremiumUpgrade();
                      return;
                    }
                    recipePhotoInputRef.current?.click();
                  }}
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-6 w-6 animate-spin" />
                      <span className="text-sm">Reading photo...</span>
                    </>
                  ) : (
                    <>
                      <Camera className="h-6 w-6 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">{isPremium ? 'Click to upload recipe photo (max 10MB)' : 'Upgrade for AI photo import'}</span>
                    </>
                  )}
                </Button>
              </TabsContent>
            </Tabs>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
