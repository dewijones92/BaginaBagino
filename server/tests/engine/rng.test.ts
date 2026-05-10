import { describe, it, expect } from 'vitest';
import { makeRng } from '../../src/engine/rng.js';

describe('rng', () => {
  it('is deterministic for a given seed', () => {
    const a = makeRng(123);
    const b = makeRng(123);
    expect([a.next(), a.next(), a.next()]).toEqual([b.next(), b.next(), b.next()]);
  });

  it('shuffle is a permutation', () => {
    const rng = makeRng(7);
    const arr = Array.from({ length: 50 }, (_, i) => i);
    const out = rng.shuffle(arr);
    expect(out.slice().sort((x, y) => x - y)).toEqual(arr);
    // Different from original with overwhelming probability.
    expect(out).not.toEqual(arr);
  });

  it('int returns within [0, max)', () => {
    const rng = makeRng(99);
    for (let i = 0; i < 1000; i++) {
      const n = rng.int(7);
      expect(n).toBeGreaterThanOrEqual(0);
      expect(n).toBeLessThan(7);
    }
  });
});
