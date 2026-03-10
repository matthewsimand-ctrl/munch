const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const AI_GATEWAY_URL = 'https://ai.gateway.lovable.dev/v1/chat/completions';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { recipeName, ingredients, servings } = await req.json();

    if (!recipeName || !ingredients || !Array.isArray(ingredients)) {
      return new Response(
        JSON.stringify({ success: false, error: 'Recipe name and ingredients are required' }),
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

    const response = await fetch(AI_GATEWAY_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-3-flash-preview',
        messages: [
          {
            role: 'system',
            content: `You are a nutritionist AI. Estimate nutritional facts for recipes. Be realistic and use standard USDA-based estimates. Always return per-serving values.`,
          },
          {
            role: 'user',
            content: `Estimate the nutritional facts per serving for this recipe.

Recipe: ${recipeName}
Provided servings (may represent total yield, not a typical portion): ${servings ?? 'unknown'}
Ingredients: ${ingredients.join(', ')}

Determine a realistic regular serving size for this dish (what one person would typically eat), then return nutrition per that serving. Do not blindly use the provided servings value if it seems non-standard. Return the analysis.`,
          },
        ],
        tools: [
          {
            type: 'function',
            function: {
              name: 'return_nutrition',
              description: 'Return estimated nutritional facts per serving for a recipe',
              parameters: {
                type: 'object',
                properties: {
                  calories: { type: 'number', description: 'Calories per serving (kcal)' },
                  protein: { type: 'number', description: 'Protein per serving in grams' },
                  carbs: { type: 'number', description: 'Total carbohydrates per serving in grams' },
                  fat: { type: 'number', description: 'Total fat per serving in grams' },
                  fiber: { type: 'number', description: 'Dietary fiber per serving in grams' },
                  sugar: { type: 'number', description: 'Sugar per serving in grams' },
                  sodium: { type: 'number', description: 'Sodium per serving in milligrams' },
                  saturated_fat: { type: 'number', description: 'Saturated fat per serving in grams' },
                  cholesterol: { type: 'number', description: 'Cholesterol per serving in milligrams' },
                  servings: { type: 'number', description: 'Number of servings' },
                  serving_size: { type: 'string', description: 'Approximate serving size description' },
                  health_score: { type: 'number', description: 'Health score from 1-10, 10 being healthiest' },
                  notes: { type: 'string', description: 'Brief note about the nutritional profile' },
                },
                required: ['calories', 'protein', 'carbs', 'fat', 'fiber', 'sugar', 'sodium', 'servings', 'serving_size', 'health_score', 'notes'],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: 'function', function: { name: 'return_nutrition' } },
        temperature: 0.2,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ success: false, error: 'Rate limit exceeded. Please try again shortly.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ success: false, error: 'AI credits exhausted. Please add funds in workspace settings.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      const errText = await response.text();
      console.error('AI gateway error:', response.status, errText);
      return new Response(
        JSON.stringify({ success: false, error: 'AI analysis failed' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const aiData = await response.json();
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];

    if (!toolCall?.function?.arguments) {
      console.error('No tool call in response:', JSON.stringify(aiData));
      return new Response(
        JSON.stringify({ success: false, error: 'Could not analyze nutrition' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const nutrition = JSON.parse(toolCall.function.arguments);
    console.log('Nutrition analyzed for:', recipeName, '→', nutrition.calories, 'kcal');

    return new Response(
      JSON.stringify({ success: true, nutrition }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Nutrition analysis error:', error);
    const msg = error instanceof Error ? error.message : 'Analysis failed';
    return new Response(
      JSON.stringify({ success: false, error: msg }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
