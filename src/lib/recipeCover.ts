const GENERATED_RECIPE_COVER_MARKER = 'munch-recipe-cover';

const COVER_THEMES = {
  pasta: {
    label: 'Pasta Night',
    start: '#fff7ed',
    end: '#fdba74',
    accent: '#ea580c',
    accentSoft: '#ffedd5',
  },
  dessert: {
    label: 'Sweet Treat',
    start: '#fff1f2',
    end: '#f9a8d4',
    accent: '#be185d',
    accentSoft: '#fce7f3',
  },
  breakfast: {
    label: 'Breakfast',
    start: '#fffbeb',
    end: '#fcd34d',
    accent: '#b45309',
    accentSoft: '#fef3c7',
  },
  fresh: {
    label: 'Fresh Pick',
    start: '#ecfdf5',
    end: '#6ee7b7',
    accent: '#047857',
    accentSoft: '#d1fae5',
  },
  cozy: {
    label: 'Cozy Bowl',
    start: '#eff6ff',
    end: '#93c5fd',
    accent: '#1d4ed8',
    accentSoft: '#dbeafe',
  },
  spicy: {
    label: 'Bold Flavor',
    start: '#fff7ed',
    end: '#fb7185',
    accent: '#c2410c',
    accentSoft: '#ffedd5',
  },
  classic: {
    label: 'House Recipe',
    start: '#f8fafc',
    end: '#cbd5e1',
    accent: '#334155',
    accentSoft: '#e2e8f0',
  },
} as const;

const KEYWORD_TO_THEME: Record<string, keyof typeof COVER_THEMES> = {
  pasta: 'pasta',
  spaghetti: 'pasta',
  lasagna: 'pasta',
  noodle: 'pasta',
  penne: 'pasta',
  pizza: 'classic',
  burger: 'classic',
  sandwich: 'classic',
  cookie: 'dessert',
  brownie: 'dessert',
  cake: 'dessert',
  pie: 'dessert',
  dessert: 'dessert',
  sweet: 'dessert',
  breakfast: 'breakfast',
  waffle: 'breakfast',
  pancake: 'breakfast',
  oatmeal: 'breakfast',
  egg: 'breakfast',
  salad: 'fresh',
  veggie: 'fresh',
  vegetable: 'fresh',
  bowl: 'cozy',
  soup: 'cozy',
  stew: 'cozy',
  chili: 'spicy',
  curry: 'spicy',
  taco: 'spicy',
  salsa: 'spicy',
  jalapeno: 'spicy',
};

function escapeXml(value: string) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function normalizeWords(value: string) {
  return String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
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

function inferThemeKey(recipeName: string, cuisine?: string | null, tags: string[] = []) {
  const words = [
    ...normalizeWords(recipeName),
    ...normalizeWords(cuisine || ''),
    ...tags.flatMap((tag) => normalizeWords(tag)),
  ];

  for (const word of words) {
    const mapped = KEYWORD_TO_THEME[word];
    if (mapped) return mapped;
  }

  const themeKeys = Object.keys(COVER_THEMES) as Array<keyof typeof COVER_THEMES>;
  return themeKeys[hashString(`${recipeName}|${cuisine}|${tags.join(',')}`) % themeKeys.length];
}

function wrapTitle(value: string) {
  const words = String(value || 'Untitled Recipe')
    .replace(/\s+/g, ' ')
    .trim()
    .split(' ')
    .filter(Boolean);

  const lines: string[] = [];
  let current = '';

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

export function isGeneratedRecipeCoverDataUri(value: string | null | undefined) {
  return String(value || '').includes(GENERATED_RECIPE_COVER_MARKER);
}

export function getGeneratedRecipeCoverDataUri({
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

  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 720 540" role="img" aria-labelledby="title desc" data-cover-kind="${GENERATED_RECIPE_COVER_MARKER}">
      <title id="title">${escapeXml(name || 'Recipe Cover')}</title>
      <desc id="desc">Generated recipe cover for ${escapeXml(name || 'a recipe')}</desc>
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
      <text x="56" y="238" font-family="Georgia, serif" font-size="42" font-weight="700" fill="#1f2937">${escapeXml(titleLines[0] || 'Untitled')}</text>
      ${titleLines[1] ? `<text x="56" y="290" font-family="Georgia, serif" font-size="42" font-weight="700" fill="#1f2937">${escapeXml(titleLines[1])}</text>` : ''}
      ${titleLines[2] ? `<text x="56" y="342" font-family="Georgia, serif" font-size="42" font-weight="700" fill="#1f2937">${escapeXml(titleLines[2])}</text>` : ''}
      <rect x="56" y="392" width="248" height="4" rx="2" fill="${theme.accent}" opacity="0.26"/>
      <text x="56" y="432" font-family="Arial, sans-serif" font-size="20" font-weight="600" fill="${theme.accent}">Created in Munch</text>
      <text x="56" y="464" font-family="Arial, sans-serif" font-size="16" fill="#475569">Upload a photo any time or keep this cover.</text>
    </svg>
  `;

  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}
