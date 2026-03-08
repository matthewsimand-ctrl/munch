import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { savedRecipes, days, mealsPerDay } = await req.json();

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const recipeList = savedRecipes
      .map((r: any, i: number) => `${i + 1}. "${r.name}" (id: ${r.id})`)
      .join("\n");

    const mealTypes = mealsPerDay || ["breakfast", "lunch", "dinner"];

    const systemPrompt = `You are a meal planning assistant. Generate a meal plan using ONLY the recipes provided. Distribute them across the requested days and meals for variety. Each recipe can be used multiple times but try to vary.`;

    const userPrompt = `Here are my saved recipes:\n${recipeList}\n\nGenerate a ${days}-day meal plan with these meals per day: ${mealTypes.join(", ")}.\n\nReturn the plan using the suggest_meal_plan tool.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "suggest_meal_plan",
              description: "Return a structured meal plan",
              parameters: {
                type: "object",
                properties: {
                  plan: {
                    type: "array",
                    description: "Array of meal assignments",
                    items: {
                      type: "object",
                      properties: {
                        day: { type: "integer", description: "Day index, 0=Mon, 1=Tue, etc." },
                        meal_type: { type: "string", enum: ["breakfast", "lunch", "dinner", "snack"] },
                        recipe_id: { type: "string", description: "The recipe id from the provided list" },
                        recipe_name: { type: "string" },
                      },
                      required: ["day", "meal_type", "recipe_id", "recipe_name"],
                      additionalProperties: false,
                    },
                  },
                },
                required: ["plan"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "suggest_meal_plan" } },
      }),
    });

    if (!response.ok) {
      const status = response.status;
      const text = await response.text();
      console.error("AI gateway error:", status, text);

      if (status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please add credits to continue." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({ error: "Failed to generate meal plan" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const result = await response.json();
    const toolCall = result.choices?.[0]?.message?.tool_calls?.[0];

    if (!toolCall?.function?.arguments) {
      return new Response(JSON.stringify({ error: "No plan generated" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const parsed = JSON.parse(toolCall.function.arguments);

    return new Response(JSON.stringify(parsed), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-meal-plan error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
