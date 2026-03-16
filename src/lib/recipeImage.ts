import type { SyntheticEvent } from 'react';

export const RECIPE_IMAGE_FALLBACK_DATA_URI =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 480">
      <defs>
        <linearGradient id="bg" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0%" stop-color="#fff7ed"/>
          <stop offset="100%" stop-color="#fde6d2"/>
        </linearGradient>
      </defs>
      <rect width="640" height="480" rx="32" fill="url(#bg)"/>
      <circle cx="320" cy="212" r="74" fill="#ffffff" fill-opacity="0.86"/>
      <path d="M286 220c0-19 15-34 34-34h34c19 0 34 15 34 34 0 9-4 18-11 24l-23 20v27c0 8-6 14-14 14s-14-6-14-14v-27l-23-20c-11-9-17-22-17-36z" fill="#f97316"/>
      <rect x="238" y="332" width="164" height="18" rx="9" fill="#fdba74"/>
      <text x="320" y="388" text-anchor="middle" font-family="Arial, sans-serif" font-size="28" font-weight="700" fill="#9a3412">Recipe image</text>
    </svg>
  `);

export function applyRecipeImageFallback(event: SyntheticEvent<HTMLImageElement>) {
  const target = event.currentTarget;
  target.onerror = null;
  target.src = RECIPE_IMAGE_FALLBACK_DATA_URI;
}
