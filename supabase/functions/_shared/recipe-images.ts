import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const RECIPE_PHOTO_BUCKET = "recipe-photos";
const MAX_REMOTE_IMAGE_BYTES = 8 * 1024 * 1024;
const REMOTE_IMAGE_HEADERS = {
  "User-Agent": "Mozilla/5.0 (compatible; MunchRecipeImageBot/1.0)",
  Accept: "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8",
};

const COVER_THEMES = {
  pasta: {
    label: "Pasta Night",
    start: "#fff7ed",
    end: "#fdba74",
    accent: "#ea580c",
    accentSoft: "#ffedd5",
  },
  dessert: {
    label: "Sweet Treat",
    start: "#fff1f2",
    end: "#f9a8d4",
    accent: "#be185d",
    accentSoft: "#fce7f3",
  },
  breakfast: {
    label: "Breakfast",
    start: "#fffbeb",
    end: "#fcd34d",
    accent: "#b45309",
    accentSoft: "#fef3c7",
  },
  fresh: {
    label: "Fresh Pick",
    start: "#ecfdf5",
    end: "#6ee7b7",
    accent: "#047857",
    accentSoft: "#d1fae5",
  },
  cozy: {
    label: "Cozy Bowl",
    start: "#eff6ff",
    end: "#93c5fd",
    accent: "#1d4ed8",
    accentSoft: "#dbeafe",
  },
  spicy: {
    label: "Bold Flavor",
    start: "#fff7ed",
    end: "#fb7185",
    accent: "#c2410c",
    accentSoft: "#ffedd5",
  },
  classic: {
    label: "House Recipe",
    start: "#f8fafc",
    end: "#cbd5e1",
    accent: "#334155",
    accentSoft: "#e2e8f0",
  },
} as const;

const KEYWORD_TO_THEME: Record<string, keyof typeof COVER_THEMES> = {
  pasta: "pasta",
  spaghetti: "pasta",
  lasagna: "pasta",
  noodle: "pasta",
  penne: "pasta",
  cookie: "dessert",
  brownie: "dessert",
  cake: "dessert",
  pie: "dessert",
  dessert: "dessert",
  sweet: "dessert",
  breakfast: "breakfast",
  waffle: "breakfast",
  pancake: "breakfast",
  oatmeal: "breakfast",
  egg: "breakfast",
  salad: "fresh",
  veggie: "fresh",
  vegetable: "fresh",
  bowl: "cozy",
  soup: "cozy",
  stew: "cozy",
  chili: "spicy",
  curry: "spicy",
  taco: "spicy",
  salsa: "spicy",
  jalapeno: "spicy",
};

function normalizeWords(value: string) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter(Boolean);
}

function hashString(value: string) {
  let hash = 2166136261;
  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return Math.abs(hash >>> 0);
}

function escapeXml(value: string) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function slugify(value: string) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64) || "recipe";
}

function wrapTitle(value: string) {
  const words = String(value || "Untitled Recipe")
    .replace(/\s+/g, " ")
    .trim()
    .split(" ")
    .filter(Boolean);

  const lines: string[] = [];
  let current = "";

  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (next.length <= 22 || !current) {
      current = next;
      continue;
    }
    lines.push(current);
    current = word;
    if (lines.length === 2) break;
  }

  if (current && lines.length < 3) {
    lines.push(current);
  }

  return lines.slice(0, 3);
}

function inferThemeKey(recipeName: string, cuisine?: string | null, tags: string[] = []) {
  const words = [
    ...normalizeWords(recipeName),
    ...normalizeWords(cuisine || ""),
    ...tags.flatMap((tag) => normalizeWords(tag)),
  ];

  for (const word of words) {
    const theme = KEYWORD_TO_THEME[word];
    if (theme) return theme;
  }

  const themeKeys = Object.keys(COVER_THEMES) as Array<keyof typeof COVER_THEMES>;
  return themeKeys[hashString(`${recipeName}|${cuisine}|${tags.join(",")}`) % themeKeys.length];
}

export function buildGeneratedRecipeCoverSvg({
  name,
  cuisine,
  tags = [],
}: {
  name: string;
  cuisine?: string | null;
  tags?: string[];
}) {
  const themeKey = inferThemeKey(name, cuisine, tags);
  const theme = COVER_THEMES[themeKey];
  const titleLines = wrapTitle(name);
  const badge = cuisine?.trim() || theme.label;
  const accentX = 520 + (hashString(name) % 48);
  const accentY = 86 + (hashString(`${name}|accent`) % 36);

  return `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 720 540" role="img" aria-labelledby="title desc" data-cover-kind="munch-recipe-cover">
      <title id="title">${escapeXml(name || "Recipe Cover")}</title>
      <desc id="desc">Generated recipe cover for ${escapeXml(name || "a recipe")}</desc>
      <defs>
        <linearGradient id="bg" x1="0%" x2="100%" y1="0%" y2="100%">
          <stop offset="0%" stop-color="${theme.start}"/>
          <stop offset="100%" stop-color="${theme.end}"/>
        </linearGradient>
      </defs>
      <rect width="720" height="540" rx="36" fill="url(#bg)"/>
      <circle cx="620" cy="112" r="96" fill="${theme.accentSoft}" opacity="0.9"/>
      <circle cx="${accentX}" cy="${accentY}" r="24" fill="${theme.accent}" opacity="0.16"/>
      <circle cx="102" cy="462" r="88" fill="#ffffff" opacity="0.44"/>
      <rect x="54" y="54" width="168" height="36" rx="18" fill="#ffffff" opacity="0.88"/>
      <text x="138" y="77" text-anchor="middle" font-family="Arial, sans-serif" font-size="14" font-weight="700" fill="${theme.accent}">${escapeXml(badge)}</text>
      <g transform="translate(515 70)">
        <circle cx="66" cy="66" r="54" fill="#ffffff" opacity="0.82"/>
        <circle cx="66" cy="66" r="32" fill="none" stroke="${theme.accent}" stroke-width="12"/>
        <path d="M32 104c16-14 52-18 80 0" fill="none" stroke="${theme.accent}" stroke-width="10" stroke-linecap="round"/>
        <circle cx="66" cy="66" r="8" fill="${theme.accent}"/>
      </g>
      <text x="56" y="238" font-family="Georgia, serif" font-size="42" font-weight="700" fill="#1f2937">${escapeXml(titleLines[0] || "Untitled")}</text>
      ${titleLines[1] ? `<text x="56" y="290" font-family="Georgia, serif" font-size="42" font-weight="700" fill="#1f2937">${escapeXml(titleLines[1])}</text>` : ""}
      ${titleLines[2] ? `<text x="56" y="342" font-family="Georgia, serif" font-size="42" font-weight="700" fill="#1f2937">${escapeXml(titleLines[2])}</text>` : ""}
      <rect x="56" y="392" width="248" height="4" rx="2" fill="${theme.accent}" opacity="0.26"/>
      <text x="56" y="432" font-family="Arial, sans-serif" font-size="20" font-weight="600" fill="${theme.accent}">Created in Munch</text>
      <text x="56" y="464" font-family="Arial, sans-serif" font-size="16" fill="#475569">Upload a real photo any time or keep this cover.</text>
    </svg>
  `.trim();
}

export function buildGeneratedRecipeCoverDataUri({
  name,
  cuisine,
  tags = [],
}: {
  name: string;
  cuisine?: string | null;
  tags?: string[];
}) {
  return `data:image/svg+xml;utf8,${encodeURIComponent(buildGeneratedRecipeCoverSvg({ name, cuisine, tags }))}`;
}

function normalizeImageCandidate(value: string, baseUrl?: string) {
  const trimmed = String(value || "").trim();
  if (!trimmed || trimmed.startsWith("data:") || trimmed.startsWith("blob:")) return "";

  try {
    if (trimmed.startsWith("//")) {
      return new URL(`https:${trimmed}`).toString();
    }
    return baseUrl ? new URL(trimmed, baseUrl).toString() : new URL(trimmed).toString();
  } catch {
    return "";
  }
}

function dedupeUrls(values: string[]) {
  const seen = new Set<string>();
  const result: string[] = [];

  for (const value of values) {
    const normalized = String(value || "").trim();
    if (!normalized || seen.has(normalized)) continue;
    seen.add(normalized);
    result.push(normalized);
  }

  return result;
}

function collectJsonNodes(node: unknown): Record<string, unknown>[] {
  if (!node) return [];
  if (Array.isArray(node)) return node.flatMap(collectJsonNodes);
  if (typeof node === "object") {
    const record = node as Record<string, unknown>;
    if (record["@graph"]) return collectJsonNodes(record["@graph"]);
    return [record];
  }
  return [];
}

function readImageValues(value: unknown, baseUrl?: string): string[] {
  if (!value) return [];
  if (typeof value === "string") {
    const normalized = normalizeImageCandidate(value, baseUrl);
    return normalized ? [normalized] : [];
  }
  if (Array.isArray(value)) {
    return value.flatMap((entry) => readImageValues(entry, baseUrl));
  }
  if (typeof value === "object") {
    const record = value as Record<string, unknown>;
    return [
      ...readImageValues(record.url, baseUrl),
      ...readImageValues(record.contentUrl, baseUrl),
      ...readImageValues(record.image, baseUrl),
    ];
  }
  return [];
}

export function extractJsonLdImageCandidates(html: string, baseUrl?: string) {
  const scripts = [...html.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)]
    .map((match) => match[1]?.trim())
    .filter(Boolean) as string[];

  const candidates: string[] = [];

  for (const script of scripts) {
    try {
      const parsed = JSON.parse(script);
      const nodes = collectJsonNodes(parsed);
      for (const node of nodes) {
        const typeValue = node["@type"];
        const isRecipe = Array.isArray(typeValue)
          ? typeValue.some((entry) => String(entry).toLowerCase() === "recipe")
          : String(typeValue || "").toLowerCase() === "recipe";

        if (!isRecipe) continue;
        candidates.push(...readImageValues(node.image, baseUrl));
      }
    } catch {
      // Ignore malformed JSON-LD and keep scanning.
    }
  }

  return dedupeUrls(candidates);
}

export function extractMetaImageCandidates(html: string, baseUrl?: string) {
  const matches = [...html.matchAll(/<meta[^>]+(?:property|name|itemprop)=["'](?:og:image|twitter:image|image)["'][^>]+content=["']([^"']+)["'][^>]*>/gi)];
  return dedupeUrls(
    matches
      .map((match) => normalizeImageCandidate(match[1] || "", baseUrl))
      .filter(Boolean),
  );
}

export function extractRecipePageImageCandidates(html: string, baseUrl?: string) {
  return dedupeUrls([
    ...extractMetaImageCandidates(html, baseUrl),
    ...extractJsonLdImageCandidates(html, baseUrl),
  ]);
}

function guessImageExtension(contentType: string, sourceUrl: string) {
  if (contentType.includes("image/png")) return "png";
  if (contentType.includes("image/webp")) return "webp";
  if (contentType.includes("image/gif")) return "gif";
  if (contentType.includes("image/avif")) return "avif";
  if (contentType.includes("image/svg")) return "svg";
  if (contentType.includes("image/jpeg")) return "jpg";

  try {
    const pathname = new URL(sourceUrl).pathname.toLowerCase();
    const fromPath = pathname.match(/\.([a-z0-9]+)$/)?.[1];
    return fromPath || "jpg";
  } catch {
    return "jpg";
  }
}

export function createServiceSupabaseClient() {
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceRoleKey) {
    return null;
  }
  return createClient(supabaseUrl, serviceRoleKey);
}

export function isRecipePhotoPublicUrl(url: string) {
  return String(url || "").includes("/storage/v1/object/public/recipe-photos/");
}

async function uploadRecipeAsset(
  supabase: ReturnType<typeof createServiceSupabaseClient>,
  path: string,
  body: Uint8Array,
  contentType: string,
) {
  if (!supabase) return null;

  const { error } = await supabase.storage
    .from(RECIPE_PHOTO_BUCKET)
    .upload(path, body, {
      contentType,
      upsert: true,
      cacheControl: "3600",
    });

  if (error) {
    console.error("Recipe asset upload failed:", error);
    return null;
  }

  return supabase.storage.from(RECIPE_PHOTO_BUCKET).getPublicUrl(path).data.publicUrl;
}

export async function storeGeneratedRecipeCover(
  supabase: ReturnType<typeof createServiceSupabaseClient>,
  {
    recipeName,
    cuisine,
    tags = [],
    sourceUrl,
  }: {
    recipeName: string;
    cuisine?: string | null;
    tags?: string[];
    sourceUrl?: string;
  },
) {
  if (!supabase) return null;

  const svg = buildGeneratedRecipeCoverSvg({ name: recipeName, cuisine, tags });
  const hostSegment = sourceUrl
    ? (() => {
        try {
          return new URL(sourceUrl).hostname.replace(/^www\./, "");
        } catch {
          return "generated";
        }
      })()
    : "generated";
  const baseId = `${recipeName}|${cuisine}|${tags.join(",")}|${sourceUrl || ""}`;
  const path = `generated/${hostSegment}/${hashString(baseId).toString(36)}-${slugify(recipeName)}.svg`;

  return uploadRecipeAsset(supabase, path, new TextEncoder().encode(svg), "image/svg+xml");
}

export async function copyRemoteImageToStorage(
  supabase: ReturnType<typeof createServiceSupabaseClient>,
  {
    imageUrl,
    recipeName,
    sourceUrl,
  }: {
    imageUrl: string;
    recipeName: string;
    sourceUrl?: string;
  },
) {
  if (!supabase) return null;
  if (!imageUrl) return null;
  if (isRecipePhotoPublicUrl(imageUrl)) return imageUrl;

  const normalizedImageUrl = normalizeImageCandidate(imageUrl, sourceUrl);
  if (!normalizedImageUrl) return null;

  try {
    const response = await fetch(normalizedImageUrl, { headers: REMOTE_IMAGE_HEADERS });
    if (!response.ok) {
      return null;
    }

    const contentType = (response.headers.get("content-type") || "").toLowerCase();
    if (contentType && !contentType.startsWith("image/")) {
      return null;
    }

    const headerSize = parseInt(response.headers.get("content-length") || "0", 10);
    if (headerSize > MAX_REMOTE_IMAGE_BYTES) {
      return null;
    }

    const bytes = new Uint8Array(await response.arrayBuffer());
    if (bytes.length === 0 || bytes.length > MAX_REMOTE_IMAGE_BYTES) {
      return null;
    }

    const hostSegment = sourceUrl
      ? (() => {
          try {
            return new URL(sourceUrl).hostname.replace(/^www\./, "");
          } catch {
            return "imported";
          }
        })()
      : new URL(normalizedImageUrl).hostname.replace(/^www\./, "");
    const baseId = `${recipeName}|${sourceUrl || ""}|${normalizedImageUrl}`;
    const extension = guessImageExtension(contentType, normalizedImageUrl);
    const path = `imported/${hostSegment}/${hashString(baseId).toString(36)}-${slugify(recipeName)}.${extension}`;

    return uploadRecipeAsset(supabase, path, bytes, contentType || "image/jpeg");
  } catch (error) {
    console.error("Remote image copy failed:", error);
    return null;
  }
}

export async function resolveRecipeImage(
  supabase: ReturnType<typeof createServiceSupabaseClient>,
  {
    recipeName,
    cuisine,
    tags = [],
    sourceUrl,
    existingImageUrl,
    html,
  }: {
    recipeName: string;
    cuisine?: string | null;
    tags?: string[];
    sourceUrl?: string;
    existingImageUrl?: string;
    html?: string;
  },
) {
  const candidates = dedupeUrls([
    normalizeImageCandidate(existingImageUrl || "", sourceUrl),
    ...(html ? extractRecipePageImageCandidates(html, sourceUrl) : []),
  ]);

  for (const candidate of candidates) {
    const storedImage = await copyRemoteImageToStorage(supabase, {
      imageUrl: candidate,
      recipeName,
      sourceUrl,
    });
    if (storedImage) {
      return {
        image: storedImage,
        originalImageUrl: candidate,
        strategy: "copied" as const,
      };
    }
  }

  const generatedImage = await storeGeneratedRecipeCover(supabase, {
    recipeName,
    cuisine,
    tags,
    sourceUrl,
  });

  if (generatedImage) {
    return {
      image: generatedImage,
      originalImageUrl: candidates[0] || null,
      strategy: "generated" as const,
    };
  }

  return {
    image: buildGeneratedRecipeCoverDataUri({ name: recipeName, cuisine, tags }),
    originalImageUrl: candidates[0] || null,
    strategy: "generated" as const,
  };
}
