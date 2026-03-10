import { describe, expect, it } from 'vitest';

import { normalizeStringArray } from '@/lib/normalizeRecipe';

describe('normalizeStringArray', () => {
  it('splits numbered instructions from a single jumbled string', () => {
    const result = normalizeStringArray('Step 1: Preheat oven. Step 2: Mix flour and eggs. 3) Bake for 20 min.');

    expect(result).toEqual([
      'Preheat oven.',
      'Mix flour and eggs.',
      'Bake for 20 min.',
    ]);
  });

  it('preserves non-numbered instruction lines', () => {
    const result = normalizeStringArray('Chop onions\nSaute until golden');

    expect(result).toEqual(['Chop onions', 'Saute until golden']);
  });
});
