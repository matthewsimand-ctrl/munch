export function normalizeUsername(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, "")
    .slice(0, 24);
}

export function suggestUsername(displayName: string) {
  const normalized = normalizeUsername(displayName.replace(/\s+/g, "_"));
  return normalized || "chef";
}

export function isValidUsername(value: string) {
  return /^[a-z0-9_]{3,24}$/.test(value);
}
