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

    const { imageBase64, source } = await req.json();
    if (!imageBase64) {
      return new Response(
        JSON.stringify({ error: "imageBase64 is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content: `You extract grocery items from pantry photos, grocery photos, handwritten lists, and grocery receipts. Return ONLY a JSON array where each item is an object with "name" and optional "quantity". Use lowercase common food names. Exclude non-food items and store metadata. If quantity is visible, include it as a short string like "2", "1 lb", or "12 oz". If no food items are identifiable, return [].`,
          },
          {
            role: "user",
            content: [
              {
                type: "text",
                text: source === "receipt"
                  ? "Extract grocery items from this receipt or shopping list image. Return only a JSON array of objects with name and optional quantity."
                  : "Identify all food ingredients visible in this image. Return only a JSON array of objects with name and optional quantity.",
              },
              {
                type: "image_url",
                image_url: {
                  url: imageBase64.startsWith("data:")
                    ? imageBase64
                    : `data:image/jpeg;base64,${imageBase64}`,
                },
              },
            ],
          },
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI credits exhausted. Please add funds to your workspace." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const text = await response.text();
      console.error("AI gateway error:", response.status, text);
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "[]";

    // Extract JSON array from response (handle markdown code blocks)
    let items: Array<{ name: string; quantity?: string }> = [];
    try {
      const jsonMatch = content.match(/\[[\s\S]*?\]/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        if (Array.isArray(parsed)) {
          items = parsed
            .map((entry) => {
              if (typeof entry === "string") {
                return { name: entry.toLowerCase().trim() };
              }
              if (!entry || typeof entry !== "object") return null;
              const record = entry as { name?: unknown; quantity?: unknown };
              const name = typeof record.name === "string" ? record.name.toLowerCase().trim() : "";
              const quantity = typeof record.quantity === "string" ? record.quantity.trim() : undefined;
              return name ? { name, quantity } : null;
            })
            .filter((entry): entry is { name: string; quantity?: string } => Boolean(entry));
        }
      }
    } catch {
      console.error("Failed to parse items from:", content);
      items = [];
    }

    return new Response(
      JSON.stringify({ items, ingredients: items.map((item) => item.name) }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("scan-fridge error:", e);
    const message = e instanceof Error ? e.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
