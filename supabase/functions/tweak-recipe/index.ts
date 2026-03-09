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
    const { recipeName, ingredients, instructions, tweakType, dietaryRestrictions, pantryItems, customPrompt } =
      await req.json();

    if (!recipeName || !ingredients?.length) {
      return new Response(JSON.stringify({ error: "Recipe name and ingredients are required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "AI not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let tweakInstruction = "";
    switch (tweakType) {
      case "dietary":
        tweakInstruction = `Modify this recipe to be compatible with these dietary restrictions: ${(dietaryRestrictions || []).join(", ")}. Swap out any incompatible ingredients with suitable alternatives.`;
        break;
      case "pantry":
        tweakInstruction = `The user has these items in their pantry: ${(pantryItems || []).join(", ")}. Modify the recipe to use as many pantry items as possible, swapping ingredients where reasonable while keeping the dish delicious.`;
        break;
      case "healthier":
        tweakInstruction = `Make this recipe healthier by reducing calories, fat, and sugar where possible. Use whole grains, lean proteins, and more vegetables. Keep it tasty.`;
        break;
      case "simpler":
        tweakInstruction = `Simplify this recipe to use fewer ingredients and simpler techniques, suitable for a beginner cook. Keep the core flavor.`;
        break;
      case "custom":
        tweakInstruction = customPrompt || "Suggest improvements to this recipe.";
        break;
      default:
        tweakInstruction = "Suggest improvements to this recipe.";
    }

    const systemPrompt = `You are a professional chef and recipe developer. You modify recipes based on user requests.
Return ONLY valid JSON with this exact structure (no markdown, no explanation):
{
  "name": "Modified Recipe Name",
  "ingredients": ["ingredient 1", "ingredient 2"],
  "instructions": ["step 1", "step 2"],
  "changes_summary": "Brief summary of what was changed and why"
}`;

    const userPrompt = `Original Recipe: ${recipeName}

Original Ingredients:
${ingredients.map((i: string, idx: number) => `${idx + 1}. ${i}`).join("\n")}

Original Instructions:
${(instructions || []).map((s: string, idx: number) => `${idx + 1}. ${s}`).join("\n")}

Request: ${tweakInstruction}`;

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
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded, please try again shortly." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI error:", response.status, t);
      throw new Error("AI gateway error");
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "";

    // Extract JSON from response
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("Could not parse AI response");
    }

    const tweaked = JSON.parse(jsonMatch[0]);

    return new Response(JSON.stringify({ success: true, tweaked }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("tweak-recipe error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
