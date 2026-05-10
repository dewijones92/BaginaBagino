import { describe, it, expect } from 'vitest';
import balance from '@bagina/schema/data/balance.json' with { type: 'json' };

/**
 * Recipes were once duplicated between server reducer and Flutter client,
 * with a third (yield-based, dead) copy in cards.ts. The schema-data JSON
 * is now the only source. These tests pin the structural shape so a typo
 * or accidental rename breaks loudly here, not at runtime.
 */
describe('balance.json recipes', () => {
  it('defines exactly the two completion kinds', () => {
    const keys = Object.keys(balance.recipes).sort();
    expect(keys).toEqual(['bagina', 'bagino']);
  });

  it('uses only resource-card kinds as requirement keys', () => {
    const valid = new Set(['Tooth', 'Paw', 'Snout', 'Tit']);
    for (const recipe of Object.values(balance.recipes)) {
      for (const k of Object.keys(recipe)) {
        expect(valid.has(k)).toBe(true);
      }
    }
  });

  it('requires a positive integer count for every entry', () => {
    for (const recipe of Object.values(balance.recipes)) {
      for (const n of Object.values(recipe)) {
        expect(Number.isInteger(n)).toBe(true);
        expect(n).toBeGreaterThan(0);
      }
    }
  });

  it('bagino and bagina sum to equal card counts (recipes are same hand size)', () => {
    // Not a hard rule, but the Flutter client uses recipeCardCount() of
    // bagino as "expected selection size". If the two diverge we need to
    // pick a smarter strategy on the client. Pin the current invariant.
    const sum = (r: Record<string, number>) =>
      Object.values(r).reduce((a, b) => a + b, 0);
    expect(sum(balance.recipes.bagino)).toBe(sum(balance.recipes.bagina));
  });
});
