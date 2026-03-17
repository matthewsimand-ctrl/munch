import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import {
  extractRecipePageImageCandidates,
  createServiceSupabaseClient,
  isRecipePhotoPublicUrl,
  resolveRecipeImage,
} from "../_shared/recipe-images.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function normalizeTagList(value: unknown) {
  return Array.isArray(value)
    ? value.map((tag) => String(tag).trim()).filter(Boolean)
    : [];
}

function isGeneratedCover(value: string) {
  return value.includes("munch-recipe-cover");
}

function needsBackfill(image: string) {
  const normalized = String(image || "").trim();
  if (!normalized || normalized === "/placeholder.svg") return true;
  if (isRecipePhotoPublicUrl(normalized)) return false;
  if (normalized.startsWith("data:image/") && isGeneratedCover(normalized)) return false;
  return true;
}

async function fetchSourceHtml(url: string) {
  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; MunchRecipeBackfill/1.0)",
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      },
    });

    if (!response.ok) return "";
    const contentType = (response.headers.get("content-type") || "").toLowerCase();
    if (contentType && !contentType.includes("text/html")) return "";
    return await response.text();
  } catch {
    return "";
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed. Use POST." }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabase = createServiceSupabaseClient();
  if (!supabase) {
    return new Response(JSON.stringify({ error: "Supabase service role is not configured." }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const rawLimit = Number(body?.limit ?? 15);
    const limit = Number.isFinite(rawLimit) ? Math.min(Math.max(rawLimit, 1), 50) : 15;
    const dryRun = Boolean(body?.dryRun);
    const requestedIds = Array.isArray(body?.recipeIds)
      ? body.recipeIds.map((id: unknown) => String(id).trim()).filter(Boolean)
      : [];

    let query = supabase
      .from("recipes")
      .select("id, name, image, cuisine, tags, source_url, raw_api_payload, updated_at")
      .order("updated_at", { ascending: true })
      .limit(requestedIds.length > 0 ? requestedIds.length : Math.max(limit * 6, 60));

    if (requestedIds.length > 0) {
      query = query.in("id", requestedIds);
    }

    const { data, error } = await query;
    if (error) throw error;

    const candidates = (data || [])
      .filter((recipe: any) => requestedIds.length > 0 || needsBackfill(String(recipe.image || "")))
      .slice(0, limit);

    const results: Array<Record<string, unknown>> = [];

    for (const recipe of candidates) {
      const sourceUrl = String(recipe.source_url || "").trim();
      const rawPayload =
        recipe.raw_api_payload && typeof recipe.raw_api_payload === "object" && !Array.isArray(recipe.raw_api_payload)
          ? (recipe.raw_api_payload as Record<string, unknown>)
          : {};
      const html = sourceUrl ? await fetchSourceHtml(sourceUrl) : "";
      const imageCandidates = html ? extractRecipePageImageCandidates(html, sourceUrl).slice(0, 8) : [];
      const resolved = await resolveRecipeImage(supabase, {
        recipeName: String(recipe.name || "Imported Recipe"),
        cuisine: recipe.cuisine ? String(recipe.cuisine) : null,
        tags: normalizeTagList(recipe.tags),
        sourceUrl: sourceUrl || undefined,
        existingImageUrl: String(recipe.image || rawPayload.original_image_url || ""),
        html,
      });

      const nextRawPayload = {
        ...rawPayload,
        original_image_url: resolved.originalImageUrl ?? rawPayload.original_image_url ?? null,
        stored_image_url: resolved.image || null,
        image_strategy: resolved.strategy,
        image_candidates: imageCandidates,
        last_image_backfill_at: new Date().toISOString(),
      };

      if (!dryRun) {
        const { error: updateError } = await supabase
          .from("recipes")
          .update({
            image: resolved.image || recipe.image || null,
            raw_api_payload: nextRawPayload,
          })
          .eq("id", recipe.id);

        if (updateError) {
          results.push({
            id: recipe.id,
            name: recipe.name,
            updated: false,
            error: updateError.message,
          });
          continue;
        }
      }

      results.push({
        id: recipe.id,
        name: recipe.name,
        updated: !dryRun,
        previousImage: recipe.image || null,
        nextImage: resolved.image || null,
        strategy: resolved.strategy,
      });
    }

    return new Response(JSON.stringify({
      success: true,
      dryRun,
      scanned: (data || []).length,
      processed: candidates.length,
      results,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("backfill-recipe-images error:", error);
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
