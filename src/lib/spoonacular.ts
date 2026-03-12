function normalizeInstructionLines(lines: string[]): string[] {
  const normalized: string[] = [];

  for (const rawLine of lines) {
    const line = String(rawLine || '').replace(/\s+/g, ' ').trim();
    if (!line) continue;

    if (/^step\s*\d+[:.-]?$/i.test(line)) {
      continue;
    }

    const cleaned = line
      .replace(/^step\s*\d+\s*[:.)-]?\s*/i, '')
      .replace(/^\d+\s*[:.)-]\s*/, '')
      .trim();

    if (!/^step$/i.test(cleaned) && !/^step\s*\d+$/i.test(cleaned) && cleaned.length > 3) {
      normalized.push(cleaned);
    }
  }

  return normalized;
}

function decodeHtmlEntities(value: string): string {
  return value
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>');
}

function htmlToText(value: string): string {
  return decodeHtmlEntities(
    value
      .replace(/<\s*br\s*\/?>/gi, '\n')
      .replace(/<\s*\/(?:p|div|section|article|li|ul|ol|h\d)\s*>/gi, '\n')
      .replace(/<\s*li[^>]*>/gi, '\n')
      .replace(/<[^>]+>/g, ' ')
  );
}

function splitInstructionText(text: string): string[] {
  const normalized = text
    .replace(/\r/g, '\n')
    .replace(/\u2022/g, '\n• ')
    .replace(/\s+(?=(?:step\s*)?\d+\s*[).:-])/gi, '\n');

  const rawLines = normalized
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean);

  const splitByMarkers = rawLines.flatMap((line) => {
    const segments = line
      .split(/(?=(?:step\s*)?\d+\s*[).:-]\s+)/gi)
      .map((segment) => segment.trim())
      .filter(Boolean);

    return segments.length > 0 ? segments : [line];
  });

  return normalizeInstructionLines(splitByMarkers);
}

export function extractSpoonacularInstructions(recipe: Record<string, unknown>): string[] {
  const analyzedSteps = Array.isArray(recipe.analyzedInstructions)
    ? recipe.analyzedInstructions.flatMap((block) => {
      const steps = Array.isArray((block as { steps?: unknown[] })?.steps)
        ? (block as { steps: Array<{ number?: number; step?: string }> }).steps
        : [];

      return steps
        .slice()
        .sort((a, b) => (a.number || 0) - (b.number || 0))
        .map((step) => String(step.step || '').trim())
        .filter(Boolean);
    })
    : [];

  if (analyzedSteps.length > 0) {
    return normalizeInstructionLines(analyzedSteps);
  }

  const htmlInstructions = String(recipe.instructions || '').trim();
  if (!htmlInstructions) return [];

  return splitInstructionText(htmlToText(htmlInstructions));
}
