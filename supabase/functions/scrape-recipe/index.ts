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

  try {
    const body = await req.json();
    const normalizedUrl = normalizeUrl(String(body?.url || ''));

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
    return new Response(JSON.stringify({ error: 'Unexpected error while scraping recipe URL.' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
