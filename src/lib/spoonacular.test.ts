import { describe, expect, it } from 'vitest';

import { extractSpoonacularInstructions } from '@/lib/spoonacular';

describe('extractSpoonacularInstructions', () => {
  it('falls back to HTML instructions when analyzed steps are missing', () => {
    const instructions = extractSpoonacularInstructions({
      analyzedInstructions: [],
      instructions: '<ol><li>Whisk the eggs.</li><li>Bake for 20 minutes.</li></ol>',
    });

    expect(instructions).toEqual([
      'Whisk the eggs.',
      'Bake for 20 minutes.',
    ]);
  });

  it('splits plain-text step markers from Spoonacular HTML content', () => {
    const instructions = extractSpoonacularInstructions({
      instructions: '<p>Step 1: Heat oil. Step 2: Add garlic. 3) Serve warm.</p>',
    });

    expect(instructions).toEqual([
      'Heat oil.',
      'Add garlic.',
      'Serve warm.',
    ]);
  });
});
