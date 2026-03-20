function hasNonEmptySourceUrl(sourceUrl: string | null | undefined) {
  return Boolean(String(sourceUrl || '').trim());
}

/**
 * Domains that block iframe embedding via X-Frame-Options / frame-ancestors CSP.
 * Recipes from these domains can't be previewed in-app, so they're kept private.
 * Keep this in sync with EMBED_BLOCKED_DOMAINS in RecipePreviewDialog.tsx.
 */
const IFRAME_BLOCKED_DOMAINS = [
  'foodnetwork.com',
  'allrecipes.com',
  'epicurious.com',
  'tastesbetterfromscratch.com',
  'recipetineats.com',
  'nytimes.com',
  'cooking.nytimes.com',
  'bonappetit.com',
  'food.com',
  'delish.com',
  'simplyrecipes.com',
  'seriouseats.com',
];

function isDomainIframeBlocked(sourceUrl: string | null | undefined): boolean {
  const trimmed = String(sourceUrl || '').trim();
  if (!trimmed) return false;
  try {
    const candidate = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
    const host = new URL(candidate).hostname.replace(/^www\./, '').toLowerCase();
    return IFRAME_BLOCKED_DOMAINS.some((d) => host === d || host.endsWith(`.${d}`));
  } catch {
    return false;
  }
}

export function isImportedUrlRecipe(source: string | null | undefined, sourceUrl: string | null | undefined) {
  return String(source || '').trim().toLowerCase() === 'imported' && hasNonEmptySourceUrl(sourceUrl);
}

export function canPubliclyShareImportedUrlRecipe(sourceUrl: string | null | undefined) {
  if (!hasNonEmptySourceUrl(sourceUrl)) {
    // No source URL = manually entered or PDF/photo import → always shareable
    return {
      allowed: true,
      reason: null as string | null,
    };
  }

  if (isDomainIframeBlocked(sourceUrl)) {
    // Site blocks iframe embedding → can't show in-app preview → keep private
    return {
      allowed: false,
      reason: "This recipe source blocks in-app previews, so it's saved privately to your library.",
    };
  }

  // Domain allows embedding → users see the original site in-app → sharing is safe
  return {
    allowed: true,
    reason: null as string | null,
  };
}
