import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const { pantryItems } = await req.json();
    const normalizedPantryItems = Array.isArray(pantryItems)
      ? pantryItems.map((item) => String(item || "").trim().toLowerCase()).filter(Boolean)
      : [];

    if (normalizedPantryItems.length < 2) {
      return new Response(
        JSON.stringify({ error: "At least two pantry items are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const systemPrompt = `You are a helpful home cook assistant. Create exactly one practical recipe from pantry ingredients. Prefer using the provided pantry items as the main ingredients. You may add a small number of common staples only when necessary, such as oil, butter, salt, pepper, or water. Keep the recipe realistic, concise, and easy to cook. Return the recipe only via the generate_pantry_recipe tool.`;

    const userPrompt = `Pantry ingredients:\n${normalizedPantryItems.map((item: string) => `- ${item}`).join("\n")}\n\nGenerate one recipe that uses these ingredients. Make sure the ingredients list clearly reflects the pantry items being used.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "generate_pantry_recipe",
              description: "Return one structured recipe generated from pantry ingredients.",
              parameters: {
                type: "object",
                properties: {
                  recipe: {
                    type: "object",
                    properties: {
                      name: { type: "string" },
                      image: { type: "string", description: "Use /placeholder.svg when no image exists." },
                      cook_time: { type: "string" },
                      difficulty: { type: "string", enum: ["Beginner", "Intermediate", "Advanced"] },
                      ingredients: {
                        type: "array",
                        items: { type: "string" },
                        minItems: 3,
                      },
                      tags: {
                        type: "array",
                        items: { type: "string" },
                      },
                      instructions: {
                        type: "array",
                        items: { type: "string" },
                        minItems: 2,
                      },
                      cuisine: { type: "string" },
                      chef: { type: "string" },
                      source: { type: "string" },
                      servings: { type: "integer" },
                    },
                    required: ["name", "cook_time", "difficulty", "ingredients", "instructions"],
                    additionalProperties: false,
                  },
                },
                required: ["recipe"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "generate_pantry_recipe" } },
      }),
    });

    if (!response.ok) {
      const status = response.status;
      const text = await response.text();
      console.error("generate-pantry-recipe AI gateway error:", status, text);

      if (status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      if (status === 402) {
        return new Response(
          JSON.stringify({ error: "AI credits exhausted. Please add credits to continue." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      return new Response(
        JSON.stringify({ error: "Failed to generate pantry recipe" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const result = await response.json();
    const toolCall = result.choices?.[0]?.message?.tool_calls?.[0];

    if (!toolCall?.function?.arguments) {
      return new Response(
        JSON.stringify({ error: "No recipe generated" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const parsed = JSON.parse(toolCall.function.arguments);
    const recipe = parsed?.recipe;

    if (!recipe || typeof recipe !== "object") {
      return new Response(
        JSON.stringify({ error: "No recipe generated" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    return new Response(
      JSON.stringify({
        recipe: {
          ...recipe,
          image: typeof recipe.image === "string" && recipe.image.trim() ? recipe.image : "/placeholder.svg",
          source: typeof recipe.source === "string" && recipe.source.trim() ? recipe.source : "Fridge Cleanup AI",
          chef: typeof recipe.chef === "string" && recipe.chef.trim() ? recipe.chef : "Munch AI",
        },
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error("generate-pantry-recipe error:", e);
    const message = e instanceof Error ? e.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
