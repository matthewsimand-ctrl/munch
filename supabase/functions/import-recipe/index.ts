const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const AI_GATEWAY_URL = 'https://ai.gateway.lovable.dev/v1/chat/completions';

const EXTRACT_PROMPT = `You are a recipe extraction assistant. Extract the recipe from the provided content and return ONLY a valid JSON object with these fields:
{
  "name": "Recipe name",
  "ingredients": ["ingredient 1", "ingredient 2"],
  "instructions": ["Step 1 text", "Step 2 text"],
  "cook_time": "30 min",
  "difficulty": "Easy" | "Intermediate" | "Advanced",
  "cuisine": "Italian" | "Mexican" | etc or null,
  "tags": ["tag1", "tag2"],
  "image": ""
}

Rules:
- Ingredients should be simple names without quantities (e.g. "chicken breast" not "2 lbs chicken breast")
- Instructions should be clear individual steps
- cook_time should be a human-readable string like "30 min" or "1 hr 15 min"
- Return ONLY the JSON, no markdown fences, no explanation`;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { url, textContent } = await req.json();

    if (!url && !textContent) {
      return new Response(
        JSON.stringify({ success: false, error: 'Provide a URL or text content' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      return new Response(
        JSON.stringify({ success: false, error: 'AI service not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let content = textContent || '';

    // Fetch URL content if provided
    if (url) {
      console.log('Fetching URL:', url);
      const pageRes = await fetch(url, {
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; RecipeBot/1.0)' },
      });
      if (!pageRes.ok) {
        return new Response(
          JSON.stringify({ success: false, error: `Failed to fetch URL (${pageRes.status})` }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      const html = await pageRes.text();
      // Strip HTML tags for a rough text extraction, limit to 15k chars
      content = html.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
        .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
        .replace(/<[^>]+>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, 15000);
    }

    if (!content || content.length < 20) {
      return new Response(
        JSON.stringify({ success: false, error: 'Could not extract meaningful content' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Extracting recipe with AI, content length:', content.length);

    const aiRes = await fetch(AI_GATEWAY_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: EXTRACT_PROMPT },
          { role: 'user', content: `Extract the recipe from this content:\n\n${content}` },
        ],
        temperature: 0.1,
      }),
    });

    if (!aiRes.ok) {
      const errText = await aiRes.text();
      console.error('AI gateway error:', aiRes.status, errText);
      return new Response(
        JSON.stringify({ success: false, error: 'AI extraction failed' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const aiData = await aiRes.json();
    const rawResponse = aiData.choices?.[0]?.message?.content || '';

    // Parse JSON from response (strip markdown fences if present)
    const jsonStr = rawResponse.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const recipe = JSON.parse(jsonStr);

    // Validate required fields
    if (!recipe.name || !Array.isArray(recipe.ingredients) || recipe.ingredients.length === 0) {
      return new Response(
        JSON.stringify({ success: false, error: 'Could not extract a valid recipe from this content' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Extracted recipe:', recipe.name);

    return new Response(
      JSON.stringify({ success: true, recipe }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Import error:', error);
    const msg = error instanceof Error ? error.message : 'Import failed';
    return new Response(
      JSON.stringify({ success: false, error: msg }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
