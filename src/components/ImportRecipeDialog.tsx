import { useState, useRef } from 'react';
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
import { Link2, FileText, Loader2, Import, ClipboardPaste, X, Plus, Globe, Lock } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useStore } from '@/lib/store';
import { toast } from 'sonner';

interface ImportRecipeDialogProps {
  children?: React.ReactNode;
}

type ImportTab = 'url' | 'pdf';

interface ReviewData {
  name: string;
  ingredients: string[];
  instructions: string[];
  cook_time: string;
  difficulty: string;
  cuisine: string;
  tags: string[];
  image: string;
}

const DIFFICULTY_OPTIONS = ['Beginner', 'Intermediate', 'Advanced'];
const CUISINE_OPTIONS = ['Italian', 'Asian', 'Mexican', 'Mediterranean', 'American', 'French', 'Indian', 'Other'];

export default function ImportRecipeDialog({ children }: ImportRecipeDialogProps) {
  const [open, setOpen] = useState(false);
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<ImportTab>('url');
  const [showManualPaste, setShowManualPaste] = useState(false);
  const [manualText, setManualText] = useState('');
  const [lastImportError, setLastImportError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { likeRecipe } = useStore();

  // Review mode state
  const [reviewMode, setReviewMode] = useState(false);
  const [reviewData, setReviewData] = useState<ReviewData | null>(null);
  // Discoverable should be ON by default (user can toggle off)
  const [isDiscoverable, setIsDiscoverable] = useState(true);
  const [newIngredient, setNewIngredient] = useState('');
  const [newInstruction, setNewInstruction] = useState('');
  const [newTag, setNewTag] = useState('');
  const [saving, setSaving] = useState(false);

  const resetState = () => {
    setUrl('');
    setLoading(false);
    setActiveTab('url');
    setShowManualPaste(false);
    setManualText('');
    setLastImportError('');
    setReviewMode(false);
    setReviewData(null);
    setIsDiscoverable(true);
    setNewIngredient('');
    setNewInstruction('');
    setNewTag('');
    setSaving(false);
  };

  const handleExtract = async (payload: { url?: string; textContent?: string }) => {
    setLoading(true);
    setLastImportError('');

    try {
      const { data, error } = await supabase.functions.invoke('import-recipe', {
        body: payload,
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

      const normalizeList = (value: unknown): string[] => {
        if (Array.isArray(value)) {
          return value.map((v) => String(v).trim()).filter(Boolean);
        }
        if (typeof value === 'string') {
          return value
            .split(/\r?\n/)
            .map((s) => s.trim())
            .filter(Boolean);
        }
        return [];
      };

      // Enter review mode with extracted data (discoverable ON by default)
      setReviewData({
        name: String(recipe.name || ''),
        ingredients: normalizeList(recipe.ingredients),
        instructions: normalizeList(recipe.instructions),
        cook_time: recipe.cook_time || '30 min',
        difficulty: recipe.difficulty || 'Intermediate',
        cuisine: recipe.cuisine || '',
        tags: normalizeList(recipe.tags),
        image: recipe.image || '/placeholder.svg',
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
        // Save to Supabase for public discovery
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
          toast.info('Not logged in — saved privately. Log in to make it discoverable.');
        } else {
          const { error } = await supabase.from('recipes').insert({
            id,
            name: reviewData.name,
            ingredients: reviewData.ingredients,
            instructions: reviewData.instructions,
            cook_time: reviewData.cook_time,
            difficulty: reviewData.difficulty,
            cuisine: reviewData.cuisine || null,
            tags: reviewData.tags,
            image: reviewData.image,
            source: 'imported',
            created_by: user.id,
            is_public: true,
            servings: 4,
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
        ingredients: reviewData.ingredients,
        instructions: reviewData.instructions,
        cook_time: reviewData.cook_time,
        difficulty: reviewData.difficulty,
        cuisine: reviewData.cuisine || null,
        tags: reviewData.tags,
        image: reviewData.image,
        source: 'imported',
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

    const isValidHttpUrl = /^https?:\/\//i.test(trimmedUrl);
    if (!isValidHttpUrl) {
      setLastImportError('Please use a full URL starting with http:// or https://');
      setShowManualPaste(true);
      toast.error('Invalid URL format. You can paste recipe text instead.');
      return;
    }

    handleExtract({ url: trimmedUrl });
  };

  const handleManualImport = () => {
    if (!manualText.trim()) return;
    handleExtract({ textContent: manualText.trim() });
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

  // Review mode helpers
  const addIngredient = () => {
    if (!newIngredient.trim() || !reviewData) return;
    setReviewData({ ...reviewData, ingredients: [...reviewData.ingredients, newIngredient.trim()] });
    setNewIngredient('');
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
      <DialogContent className="max-w-lg max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>{reviewMode ? 'Review & Edit Recipe' : 'Import Recipe'}</DialogTitle>
        </DialogHeader>

        {reviewMode && reviewData ? (
          // Review/Edit Mode
          <ScrollArea className="flex-1 -mx-6 px-6">
            <div className="space-y-4 pb-4">
              {/* Recipe Name */}
              <div className="space-y-2">
                <Label htmlFor="recipe-name">Recipe Name *</Label>
                <Input
                  id="recipe-name"
                  value={reviewData.name}
                  onChange={(e) => setReviewData({ ...reviewData, name: e.target.value })}
                  placeholder="Enter recipe name"
                />
              </div>

              {/* Image URL */}
              <div className="space-y-2">
                <Label htmlFor="recipe-image">Image URL</Label>
                <Input
                  id="recipe-image"
                  value={reviewData.image}
                  onChange={(e) => setReviewData({ ...reviewData, image: e.target.value })}
                  placeholder="https://..."
                />
              </div>

              {/* Cook time, Difficulty, Cuisine row */}
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-2">
                  <Label>Cook Time</Label>
                  <Input
                    value={reviewData.cook_time}
                    onChange={(e) => setReviewData({ ...reviewData, cook_time: e.target.value })}
                    placeholder="30 min"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Difficulty</Label>
                  <Select
                    value={reviewData.difficulty}
                    onValueChange={(v) => setReviewData({ ...reviewData, difficulty: v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {DIFFICULTY_OPTIONS.map((d) => (
                        <SelectItem key={d} value={d}>{d}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Cuisine</Label>
                  <Select
                    value={reviewData.cuisine || 'Other'}
                    onValueChange={(v) => setReviewData({ ...reviewData, cuisine: v === 'Other' ? '' : v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CUISINE_OPTIONS.map((c) => (
                        <SelectItem key={c} value={c}>{c}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Tags */}
              <div className="space-y-2">
                <Label>Tags</Label>
                <div className="flex flex-wrap gap-2 mb-2">
                  {reviewData.tags.map((tag) => (
                    <Badge key={tag} variant="secondary" className="flex items-center gap-1">
                      {tag}
                      <button onClick={() => removeTag(tag)} className="ml-1 hover:text-destructive">
                        <X size={12} />
                      </button>
                    </Badge>
                  ))}
                </div>
                <div className="flex gap-2">
                  <Input
                    value={newTag}
                    onChange={(e) => setNewTag(e.target.value)}
                    placeholder="Add tag..."
                    onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
                  />
                  <Button type="button" size="sm" variant="outline" onClick={addTag}>
                    <Plus size={14} />
                  </Button>
                </div>
              </div>

              {/* Ingredients */}
              <div className="space-y-2">
                <Label>Ingredients *</Label>
                <div className="space-y-1 max-h-40 overflow-y-auto">
                  {reviewData.ingredients.map((ing, idx) => (
                    <div key={idx} className="flex items-center gap-2 text-sm bg-muted/50 rounded px-2 py-1">
                      <span className="flex-1">{ing}</span>
                      <button onClick={() => removeIngredient(idx)} className="text-muted-foreground hover:text-destructive">
                        <X size={14} />
                      </button>
                    </div>
                  ))}
                </div>
                <div className="flex gap-2">
                  <Input
                    value={newIngredient}
                    onChange={(e) => setNewIngredient(e.target.value)}
                    placeholder="Add ingredient..."
                    onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addIngredient())}
                  />
                  <Button type="button" size="sm" variant="outline" onClick={addIngredient}>
                    <Plus size={14} />
                  </Button>
                </div>
              </div>

              {/* Instructions */}
              <div className="space-y-2">
                <Label>Instructions</Label>
                <div className="space-y-1 max-h-40 overflow-y-auto">
                  {reviewData.instructions.map((step, idx) => (
                    <div key={idx} className="flex items-start gap-2 text-sm bg-muted/50 rounded px-2 py-1">
                      <span className="font-medium text-primary">{idx + 1}.</span>
                      <span className="flex-1">{step}</span>
                      <button onClick={() => removeInstruction(idx)} className="text-muted-foreground hover:text-destructive">
                        <X size={14} />
                      </button>
                    </div>
                  ))}
                </div>
                <div className="flex gap-2">
                  <Input
                    value={newInstruction}
                    onChange={(e) => setNewInstruction(e.target.value)}
                    placeholder="Add instruction step..."
                    onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addInstruction())}
                  />
                  <Button type="button" size="sm" variant="outline" onClick={addInstruction}>
                    <Plus size={14} />
                  </Button>
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
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as ImportTab)} className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="url" className="flex items-center gap-1.5">
                <Link2 className="h-3.5 w-3.5" /> From URL
              </TabsTrigger>
              <TabsTrigger value="pdf" className="flex items-center gap-1.5">
                <FileText className="h-3.5 w-3.5" /> From PDF
              </TabsTrigger>
            </TabsList>

            <TabsContent value="url" className="space-y-4 pt-4">
              <p className="text-sm text-muted-foreground">
                Paste a recipe page URL. If it fails, you can paste recipe text directly or upload a PDF.
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
                          'Import Pasted Text'
                        )}
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </TabsContent>

            <TabsContent value="pdf" className="space-y-4 pt-4">
              <p className="text-sm text-muted-foreground">
                Upload a PDF with a recipe and we'll extract the details.
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
          </Tabs>
        )}
      </DialogContent>
    </Dialog>
  );
}
