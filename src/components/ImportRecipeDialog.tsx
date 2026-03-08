import { useState, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Link2, FileText, Loader2, Import } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useStore } from '@/lib/store';
import { toast } from 'sonner';
import { v4 as uuidV4 } from 'crypto';

interface ImportRecipeDialogProps {
  children?: React.ReactNode;
}

export default function ImportRecipeDialog({ children }: ImportRecipeDialogProps) {
  const [open, setOpen] = useState(false);
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { likeRecipe } = useStore();

  const handleImport = async (payload: { url?: string; textContent?: string }) => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('import-recipe', {
        body: payload,
      });

      if (error || !data?.success) {
        toast.error(data?.error || error?.message || 'Failed to import recipe');
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
        source: payload.url ? 'imported' : 'pdf',
      };

      likeRecipe(id, recipeData);
      toast.success(`Imported "${recipe.name}"!`);
      setOpen(false);
      setUrl('');
    } catch (err) {
      console.error('Import error:', err);
      toast.error('Something went wrong importing the recipe');
    } finally {
      setLoading(false);
    }
  };

  const handleUrlSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim()) return;
    handleImport({ url: url.trim() });
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type !== 'application/pdf' && !file.name.endsWith('.pdf')) {
      toast.error('Please upload a PDF file');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast.error('File too large (max 10MB)');
      return;
    }

    // Read PDF as text - we'll send raw text content
    // For better PDF parsing we extract text client-side
    const text = await extractPdfText(file);
    if (!text || text.length < 20) {
      toast.error('Could not read text from this PDF. Try a different file.');
      return;
    }
    handleImport({ textContent: text });
  };

  const extractPdfText = async (file: File): Promise<string> => {
    // Use FileReader to get array buffer, then basic text extraction
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => {
        const buffer = reader.result as ArrayBuffer;
        const bytes = new Uint8Array(buffer);
        // Simple text extraction from PDF binary - extract readable strings
        let text = '';
        let current = '';
        for (let i = 0; i < bytes.length; i++) {
          const c = bytes[i];
          if (c >= 32 && c <= 126) {
            current += String.fromCharCode(c);
          } else {
            if (current.length > 3) {
              text += current + ' ';
            }
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
    <Dialog open={open} onOpenChange={setOpen}>
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
        <Tabs defaultValue="url" className="w-full">
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
              Paste a link to any recipe page and we'll extract the recipe automatically.
            </p>
            <form onSubmit={handleUrlSubmit} className="space-y-3">
              <Input
                type="url"
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
          </TabsContent>

          <TabsContent value="pdf" className="space-y-4 pt-4">
            <p className="text-sm text-muted-foreground">
              Upload a PDF with a recipe and we'll extract the details using AI.
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
                  <span className="text-sm text-muted-foreground">Click to upload PDF (max 10MB)</span>
                </>
              )}
            </Button>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
