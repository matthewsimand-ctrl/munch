import { useState, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Link2, FileText, Loader2, Import, ClipboardPaste } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useStore } from '@/lib/store';
import { toast } from 'sonner';

interface ImportRecipeDialogProps {
  children?: React.ReactNode;
}

type ImportTab = 'url' | 'pdf';

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

  const resetState = () => {
    setUrl('');
    setLoading(false);
    setActiveTab('url');
    setShowManualPaste(false);
    setManualText('');
    setLastImportError('');
  };

  const handleImport = async (payload: { url?: string; textContent?: string }) => {
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
      const id = crypto.randomUUID();
      const recipeData = {
        id,
        name: recipe.name,
        ingredients: recipe.ingredients || [],
        instructions: recipe.instructions || [],
        cook_time: recipe.cook_time || '30 min',
        difficulty: recipe.difficulty || 'Intermediate',
        cuisine: recipe.cuisine || null,
        tags: recipe.tags || [],
        image: recipe.image || '/placeholder.svg',
        source: payload.url ? 'imported' : 'pasted',
      };

      likeRecipe(id, recipeData);
      toast.success(`Imported "${recipe.name}"!`);
      setOpen(false);
      resetState();
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

    handleImport({ url: trimmedUrl });
  };

  const handleManualImport = () => {
    if (!manualText.trim()) return;
    handleImport({ textContent: manualText.trim() });
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
    handleImport({ textContent: text });
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
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Import Recipe</DialogTitle>
        </DialogHeader>

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
                  URL import didn’t work. You can paste the recipe text below or switch to PDF upload.
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
      </DialogContent>
    </Dialog>
  );
}
