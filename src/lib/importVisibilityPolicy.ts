function hasNonEmptySourceUrl(sourceUrl: string | null | undefined) {
  return Boolean(String(sourceUrl || '').trim());
}

export function isImportedUrlRecipe(source: string | null | undefined, sourceUrl: string | null | undefined) {
  return String(source || '').trim().toLowerCase() === 'imported' && hasNonEmptySourceUrl(sourceUrl);
}

export function canPubliclyShareImportedUrlRecipe(sourceUrl: string | null | undefined) {
  if (!hasNonEmptySourceUrl(sourceUrl)) {
    return {
      allowed: true,
      reason: null as string | null,
    };
  }

  // Legal-safe default: URL-imported recipes remain private unless we later add
  // an explicit approved-domain allowlist backed by legal review.
  return {
    allowed: false,
    reason: 'Imported URL recipes are saved privately unless the source is explicitly approved for public embedding.',
  };
}
