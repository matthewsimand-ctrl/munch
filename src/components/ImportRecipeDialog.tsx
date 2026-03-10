import { useEffect, useRef, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { Link2, FileText, Loader2, Import, ClipboardPaste, X, Plus, Globe, Lock, Camera, Upload, Brain } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useStore } from '@/lib/store';
import { composeIngredientLine, parseIngredientLine } from '@/lib/ingredientText';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

interface ImportRecipeDialogProps {
  children?: React.ReactNode;
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
  tags: string[];
  image: string;
  servings: string;
}

interface WebsitePreviewData {
  name: string;
  ingredients: string[];
  instructions: string[];
  cook_time: string;
  difficulty: string;
  cuisine: string;
  tags: string[];
  image: string;
  servings: string;
  source_url?: string;
  raw_api_payload?: Record<string, unknown>;
}

const DIFFICULTY_OPTIONS = ['Beginner', 'Intermediate', 'Advanced'];
const CUISINE_OPTIONS = ['Italian', 'Asian', 'Mexican', 'Mediterranean', 'American', 'French', 'Indian', 'Other'];

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

export default function ImportRecipeDialog({ children }: ImportRecipeDialogProps) {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<ImportTab>('url');
  const [showManualPaste, setShowManualPaste] = useState(false);
  const [manualText, setManualText] = useState('');
  const [lastImportError, setLastImportError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const recipePhotoInputRef = useRef<HTMLInputElement>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const { likeRecipe } = useStore();

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

  const MAGIC_MESSAGES = [
    'Summoning recipe magic... ✨',
    'Whisking through the webpage... 🥣',
    'Sifting out ads and navigation crumbs... 🧹',
    'Decoding ingredients and steps... 🧠',
    'Plating your recipe card... 🍽️',
  ];

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
      cook_time: String(recipe.cook_time || '30 min'),
      difficulty: String(recipe.difficulty || 'Intermediate'),
      cuisine: recipe.cuisine ? String(recipe.cuisine) : null,
      tags: Array.isArray(recipe.tags) ? recipe.tags.map((tag: unknown) => String(tag).trim()).filter(Boolean) : [],
      image: String(recipe.image || '/placeholder.svg'),
      source: 'imported',
      source_url: recipe.source_url ? String(recipe.source_url).trim() : undefined,
      raw_api_payload: recipe.raw_api_payload ?? undefined,
      servings: parseInt(String(recipe.servings || 4), 10) || 4,
    };
  };

  const persistRecipe = async (payload: Record<string, any>) => {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user && isDiscoverable) {
      const insertData = {
        id: payload.id,
        name: payload.name,
        image: payload.image || '',
        cook_time: payload.cook_time || '30 min',
        difficulty: payload.difficulty || 'Intermediate',
        ingredients: payload.ingredients || [],
        instructions: payload.instructions || [],
        tags: payload.tags || [],
        cuisine: payload.cuisine || null,
        source: payload.source || 'imported',
        source_url: payload.source_url || null,
        raw_api_payload: payload.raw_api_payload || null,
        servings: payload.servings || 4,
        created_by: user.id,
        is_public: true,
      };
      const { error } = await supabase.from('recipes').insert(insertData);

      if (error) throw error;
    }

    likeRecipe(payload.id, payload);
  };

  const saveWebsitePreview = async () => {
    if (!websitePreview) return;

    const id = crypto.randomUUID();
    const payload = buildImportedPayload(id, websitePreview);

    setSaving(true);
    try {
      await persistRecipe(payload);
      setMagicProgress(100);
      toast.success(`Imported "${payload.name}"!`);
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
    setActiveTab('url');
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
    setLoading(true);
    setLastImportError('');

    try {
      const normalizedPayload = payload.url
        ? {
            ...payload,
            url: /^https?:\/\//i.test(payload.url.trim()) ? payload.url.trim() : `https://${payload.url.trim()}`,
          }
        : payload;

      const { data, error } = await supabase.functions.invoke('import-recipe', {
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
        setWebsitePreview({
          name: String(recipe.name || 'Imported Recipe').trim(),
          ingredients: Array.isArray(recipe.ingredients) ? recipe.ingredients.map((item: unknown) => String(item).trim()).filter(Boolean) : [],
          instructions: normalizeList(recipe.instructions),
          cook_time: String(recipe.cook_time || '30 min'),
          difficulty: String(recipe.difficulty || 'Intermediate'),
          cuisine: recipe.cuisine ? String(recipe.cuisine) : '',
          tags: normalizeList(recipe.tags),
          image: String(recipe.image || '/placeholder.svg'),
          servings: String(recipe.servings || 4),
          source_url: recipe.source_url ? String(recipe.source_url) : undefined,
          raw_api_payload: recipe.raw_api_payload && typeof recipe.raw_api_payload === 'object'
            ? recipe.raw_api_payload as Record<string, unknown>
            : undefined,
        });
        toast.success('Recipe preview ready. Review the cleaned page and save it if it looks right.');
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
        tags: normalizeList(recipe.tags),
        image: recipe.image || '/placeholder.svg',
        servings: String(recipe.servings || 4),
      });
      setIsDiscoverable(true);
      setReviewMode(true);
      toast.success('Recipe extracted! Review and edit before saving.');
    } catch (err) {
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
      if (isDiscoverable) {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
          toast.info('Not logged in — saved privately. Log in to make it discoverable.');
        } else {
          const { error } = await supabase.from('recipes').insert({
            id,
            name: reviewData.name,
            ingredients: reviewData.ingredients.map(composeIngredientLine),
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
          });

          if (error) {
            console.error('Failed to save to database:', error);
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
        ingredients: reviewData.ingredients.map(composeIngredientLine),
        instructions: reviewData.instructions,
        cook_time: reviewData.cook_time,
        difficulty: reviewData.difficulty,
        cuisine: reviewData.cuisine || null,
        tags: reviewData.tags,
        image: reviewData.image,
        source: 'imported',
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

    const toBase64 = (input: File) =>
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

    try {
      const imageBase64 = await toBase64(file);
      handleExtract({ imageBase64, imageMimeType: file.type || 'image/jpeg' });
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

  const addInstruction = () => {
    if (!newInstruction.trim() || !reviewData) return;
    setReviewData({ ...reviewData, instructions: [...reviewData.instructions, newInstruction.trim()] });
    setNewInstruction('');
  };

  const removeInstruction = (idx: number) => {
    if (!reviewData) return;
    setReviewData({ ...reviewData, instructions: reviewData.instructions.filter((_, i) => i !== idx) });
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
      <DialogTrigger asChild>
        {children || (
          <Button size="sm" variant="outline">
            <Import className="h-4 w-4 mr-1" /> Import
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-hidden flex flex-col p-0">
        <DialogHeader className="px-6 pt-6 pb-2">
          <DialogTitle className="flex items-center gap-2">
            {websitePreview
              ? 'Website Recipe Preview'
              : reviewMode
                ? 'Review & Edit Recipe'
                : <><Brain className="h-4 w-4 text-violet-500" /> Import Recipe (AI)</>}
          </DialogTitle>
        </DialogHeader>

        {websitePreview ? (
          <ScrollArea className="flex-1 min-h-0 h-full px-6 pb-6">
            <div className="space-y-5 pr-2">
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
              </div>

              {websitePreview.tags.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {websitePreview.tags.map((tag) => (
                    <Badge key={tag} variant="outline">{tag}</Badge>
                  ))}
                </div>
              )}

              <div>
                <p className="text-sm font-medium text-foreground">Ingredients</p>
                <div className="mt-2 space-y-2">
                  {websitePreview.ingredients.map((ingredient, idx) => (
                    <div key={idx} className="rounded-md border border-border bg-muted/30 px-3 py-2 text-sm text-foreground">
                      {ingredient}
                    </div>
                  ))}
                </div>
              </div>

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
                      {isDiscoverable ? 'Others can find this cleaned recipe preview' : 'Only you can see this imported recipe'}
                    </p>
                  </div>
                </div>
                <Switch
                  id="discoverable-web"
                  checked={isDiscoverable}
                  onCheckedChange={setIsDiscoverable}
                />
              </div>

              <div className="flex gap-2 pt-1">
                <Button variant="outline" className="flex-1" onClick={() => setWebsitePreview(null)} disabled={saving}>
                  Back
                </Button>
                <Button variant="outline" className="flex-1" onClick={openReviewForWebsitePreview} disabled={saving}>
                  Review & Edit
                </Button>
                <Button className="flex-1" onClick={saveWebsitePreview} disabled={saving}>
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
          </ScrollArea>
        ) : reviewMode && reviewData ? (
          <ScrollArea className="flex-1 min-h-0 h-full px-6 pb-6">
            <div className="space-y-4 pr-2">
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
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {reviewData.ingredients.map((ing, idx) => (
                    <Badge key={idx} variant="secondary" className="gap-1">
                      {ing.quantity ? `${ing.quantity} ${ing.name}` : ing.name}
                      <button onClick={() => removeIngredient(idx)} className="ml-1 hover:text-destructive">
                        <X size={12} />
                      </button>
                    </Badge>
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
                      <span className="text-xs font-semibold text-muted-foreground pt-0.5">{idx + 1}.</span>
                      <span className="flex-1 text-foreground">{step}</span>
                      <button onClick={() => removeInstruction(idx)} className="text-muted-foreground hover:text-destructive">
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
          </ScrollArea>
        ) : (
          // Import Mode (URL/PDF/Paste)
          <div className="px-6 pb-6">
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
                  🧠 Paste a recipe page URL and AI will extract the details. If it fails, paste text directly or upload a PDF.
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
                      'Import Recipe'
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
                            '🧠 Import Pasted Text'
                          )}
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="pdf" className="space-y-4 pt-4">
                <p className="text-sm text-muted-foreground">
                  🧠 Upload a PDF with a recipe and AI will extract the details.
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
                  onClick={() => fileInputRef.current?.click()}
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
                      <span className="text-sm text-muted-foreground">Click to upload PDF (max 20MB)</span>
                    </>
                  )}
                </Button>
              </TabsContent>

              <TabsContent value="photo" className="space-y-4 pt-4">
                <p className="text-sm text-muted-foreground">
                  🧠 Upload a photo of a recipe card, cookbook page, or screenshot. AI will read the image and map it to recipe fields.
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
                  onClick={() => recipePhotoInputRef.current?.click()}
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
                      <span className="text-sm text-muted-foreground">Click to upload recipe photo (max 10MB)</span>
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
