import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface ScrapeRecipeResponse {
  url: string;
  title: string;
  listItems: string[];
  ogImage: string | null;
}

export default function RecipeScraperTester() {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<ScrapeRecipeResponse | null>(null);

  const handleScrape = async () => {
    const trimmedUrl = url.trim();
    if (!trimmedUrl || loading) return;

    setLoading(true);
    setError('');

    const { data, error: invokeError } = await supabase.functions.invoke('scrape-recipe', {
      body: { url: trimmedUrl },
    });

    setLoading(false);

    if (invokeError) {
      setResult(null);
      setError(invokeError.message || 'Failed to scrape URL');
      return;
    }

    if (data?.error) {
      setResult(null);
      setError(String(data.error));
      return;
    }

    setResult(data as ScrapeRecipeResponse);
  };

  return (
    <section className="space-y-4">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Recipe URL Scraper Test</h2>
      <div className="space-y-3 bg-card rounded-xl p-4 border border-border">
        <div className="flex gap-2">
          <Input
            value={url}
            onChange={(event) => setUrl(event.target.value)}
            placeholder="https://example.com/recipe"
          />
          <Button onClick={handleScrape} disabled={loading || !url.trim()}>
            {loading ? 'Scraping...' : 'Scrape'}
          </Button>
        </div>

        {error ? <p className="text-sm text-destructive">{error}</p> : null}

        {result ? (
          <div className="space-y-3 text-sm">
            <p><strong>Title:</strong> {result.title || 'Not found'}</p>
            <p><strong>OG Image:</strong> {result.ogImage || 'Not found'}</p>

            <div>
              <p className="font-semibold">List Items ({result.listItems.length})</p>
              <ul className="list-disc pl-5 space-y-1 max-h-56 overflow-y-auto">
                {result.listItems.map((item, index) => (
                  <li key={`${item}-${index}`}>{item}</li>
                ))}
              </ul>
            </div>
          </div>
        ) : null}
      </div>
    </section>
  );
}
