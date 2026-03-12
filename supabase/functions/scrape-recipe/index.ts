import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { DOMParser } from "https://deno.land/x/deno_dom@v0.1.48/deno-dom-wasm.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

function normalizeUrl(rawUrl: string): string {
  const trimmed = rawUrl.trim();
  if (!trimmed) return '';
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

function inferTitleFromUrl(url: string): string {
  try {
    const parsed = new URL(url);
    const slug = parsed.pathname
      .split('/')
      .filter(Boolean)
      .pop()
      ?.replace(/[-_]+/g, ' ')
      ?.trim();

    if (slug) {
      return slug.replace(/\b\w/g, (char) => char.toUpperCase());
    }

    return parsed.hostname.replace(/^www\./, '');
  } catch {
    return 'Imported Recipe';
  }
}

function extractTitleFromReaderText(text: string, normalizedUrl: string): string {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.replace(/^#+\s*/, '').trim())
    .filter(Boolean);

  return lines[0] || inferTitleFromUrl(normalizedUrl);
}

function extractListItemsFromReaderText(text: string): string[] {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => /^([-*•]|\d+\.)\s+/.test(line))
    .map((line) => line.replace(/^([-*•]|\d+\.)\s+/, '').trim())
    .filter(Boolean)
    .slice(0, 100);
}

async function fetchWithReaderFallback(normalizedUrl: string) {
  const response = await fetch(`https://r.jina.ai/${normalizedUrl}`);

  if (!response.ok) {
    return null;
  }

  const text = await response.text();

  return {
    title: extractTitleFromReaderText(text, normalizedUrl),
    listItems: extractListItemsFromReaderText(text),
    ogImage: null,
  };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed. Use POST.' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  let normalizedUrl = '';

  try {
    const body = await req.json();
    normalizedUrl = normalizeUrl(String(body?.url || ''));

    if (!normalizedUrl) {
      return new Response(JSON.stringify({ error: 'A valid url is required.' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const response = await fetch(normalizedUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; MunchRecipeScraper/1.0)',
      },
    });

    if (!response.ok) {
      console.warn(`scrape-recipe direct fetch failed for ${normalizedUrl}: ${response.status}. Trying reader fallback.`);

      const fallback = await fetchWithReaderFallback(normalizedUrl);
      if (fallback) {
        return new Response(JSON.stringify({
          url: normalizedUrl,
          title: fallback.title,
          listItems: fallback.listItems,
          ogImage: fallback.ogImage,
        }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      return new Response(JSON.stringify({ error: `Failed to fetch URL (${response.status}).` }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const html = await response.text();
    const document = new DOMParser().parseFromString(html, 'text/html');

    if (!document) {
      return new Response(JSON.stringify({ error: 'Unable to parse HTML.' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const pageTitle = document.querySelector('title')?.textContent?.trim()
      || document.querySelector('h1')?.textContent?.trim()
      || '';

    const listItems = Array.from(document.querySelectorAll('li'))
      .map((item) => item.textContent?.replace(/\s+/g, ' ').trim() || '')
      .filter(Boolean);

    const ogImage = document
      .querySelector('meta[property="og:image"]')
      ?.getAttribute('content')
      ?.trim() || null;

    return new Response(JSON.stringify({
      url: normalizedUrl,
      title: pageTitle,
      listItems,
      ogImage,
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('scrape-recipe error:', error);

    try {
      if (normalizedUrl) {
        const fallback = await fetchWithReaderFallback(normalizedUrl);
        if (fallback) {
          return new Response(JSON.stringify({
            url: normalizedUrl,
            title: fallback.title,
            listItems: fallback.listItems,
            ogImage: fallback.ogImage,
          }), {
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
      }
    } catch (fallbackError) {
      console.error('scrape-recipe reader fallback error:', fallbackError);
    }

    return new Response(JSON.stringify({ error: 'Unexpected error while scraping recipe URL.' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
