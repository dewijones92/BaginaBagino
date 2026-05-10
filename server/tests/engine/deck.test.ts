import { describe, it, expect } from 'vitest';
import { buildDeck, deckSize } from '../../src/engine/deck.js';
import { makeRng } from '../../src/engine/rng.js';
import deck from '@bagina/schema/data/deck.json' with { type: 'json' };

describe('deck', () => {
  it('matches advertised composition', () => {
    const rng = makeRng(1);
    const cards = buildDeck(rng);
    expect(cards).toHaveLength(deckSize());
    const counts: Record<string, number> = {};
    for (const c of cards) counts[c.kind] = (counts[c.kind] ?? 0) + 1;
    for (const [kind, count] of Object.entries(deck.composition)) {
      expect(counts[kind]).toBe(count);
    }
  });

  it('deterministic for a seed', () => {
    const a = buildDeck(makeRng(42)).map((c) => c.kind).join(',');
    const b = buildDeck(makeRng(42)).map((c) => c.kind).join(',');
    expect(a).toBe(b);
  });

  it('every card has a unique id', () => {
    const cards = buildDeck(makeRng(123));
    const ids = new Set(cards.map((c) => c.id));
    expect(ids.size).toBe(cards.length);
  });
});
