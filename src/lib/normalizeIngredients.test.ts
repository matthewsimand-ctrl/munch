import { describe, expect, it } from 'vitest';

import { normalizeIngredients } from '@/lib/normalizeIngredients';

describe('normalizeIngredients', () => {
  it('keeps quantity when ingredient objects use amount/unit fields', () => {
    const lines = normalizeIngredients([
      { name: 'flour', amount: 2, unit: 'cups' },
      { ingredient: 'salt', quantity: '1', measure: 'tsp' },
    ]);

    expect(lines).toEqual(['2 cups flour', '1 tsp salt']);
  });

  it('upgrades plain ingredient names using MealDB payload measures', () => {
    const lines = normalizeIngredients(
      ['Chicken', 'Garlic'],
      {
        strIngredient1: 'Chicken',
        strMeasure1: '500g',
        strIngredient2: 'Garlic',
        strMeasure2: '2 cloves',
      },
    );

    expect(lines).toEqual(['500g Chicken', '2 cloves Garlic']);
  });
});
