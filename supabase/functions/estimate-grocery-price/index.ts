const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const AI_GATEWAY_URL = 'https://ai.gateway.lovable.dev/v1/chat/completions';

type GroceryInput = { name?: string; qty?: string };

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { items, location, currency } = await req.json();

    if (!Array.isArray(items) || items.length === 0) {
      return new Response(
        JSON.stringify({ success: false, error: 'At least one grocery item is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      return new Response(
        JSON.stringify({ success: false, error: 'AI service not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const cleanItems = (items as GroceryInput[])
      .map((item) => ({ name: String(item?.name || '').trim(), qty: String(item?.qty || '').trim() }))
      .filter((item) => item.name)
      .slice(0, 80);

    if (cleanItems.length === 0) {
      return new Response(
        JSON.stringify({ success: false, error: 'No valid grocery items found' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const outputCurrency = typeof currency === 'string' && currency.trim() ? currency.trim().toUpperCase() : 'USD';
    const outputLocation = typeof location === 'string' && location.trim() ? location.trim() : 'your area';

    const response = await fetch(AI_GATEWAY_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-3-flash-preview',
        temperature: 0.2,
        messages: [
          {
            role: 'system',
            content: 'You estimate grocery basket totals. Use realistic current prices for mainstream nearby grocery stores and return conservative estimates.',
          },
          {
            role: 'user',
            content: `Estimate the total grocery cost for these items near ${outputLocation}. Return currency ${outputCurrency}.\n\nItems:\n${cleanItems.map((item) => `- ${item.name}${item.qty ? ` (${item.qty})` : ''}`).join('\n')}`,
          },
        ],
        tools: [
          {
            type: 'function',
            function: {
              name: 'return_grocery_estimate',
              description: 'Return estimated grocery list total from nearby stores',
              parameters: {
                type: 'object',
                properties: {
                  total: { type: 'number' },
                  low: { type: 'number' },
                  high: { type: 'number' },
                  currency: { type: 'string' },
                  location: { type: 'string' },
                  nearbyStores: {
                    type: 'array',
                    items: { type: 'string' },
                  },
                  notes: { type: 'string' },
                },
                required: ['total', 'low', 'high', 'currency', 'location', 'nearbyStores'],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: 'function', function: { name: 'return_grocery_estimate' } },
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error('AI gateway error:', response.status, errText);
      return new Response(
        JSON.stringify({ success: false, error: 'AI estimation failed' }),
        { status: response.status === 429 ? 429 : 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const aiData = await response.json();
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall?.function?.arguments) {
      return new Response(
        JSON.stringify({ success: false, error: 'Could not parse AI estimate' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const parsed = JSON.parse(toolCall.function.arguments);
    const estimate = {
      total: Number(parsed.total) || 0,
      low: Number(parsed.low) || 0,
      high: Number(parsed.high) || 0,
      currency: String(parsed.currency || outputCurrency),
      location: String(parsed.location || outputLocation),
      nearbyStores: Array.isArray(parsed.nearbyStores) ? parsed.nearbyStores.map((s: unknown) => String(s)).slice(0, 5) : [],
      notes: typeof parsed.notes === 'string' ? parsed.notes : undefined,
    };

    return new Response(
      JSON.stringify({ success: true, estimate }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Estimation failed';
    console.error('estimate-grocery-price error:', msg);
    return new Response(
      JSON.stringify({ success: false, error: msg }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});
