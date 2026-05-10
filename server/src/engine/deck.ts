import deckJson from '@bagina/schema/data/deck.json' with { type: 'json' };
import type { Card, CardKind } from '@bagina/schema';
import type { Rng } from './rng.js';

const COMPOSITION = deckJson.composition as Record<CardKind, number>;

export function buildDeck(rng: Rng): Card[] {
  const cards: Card[] = [];
  let n = 0;
  for (const [kind, count] of Object.entries(COMPOSITION) as [CardKind, number][]) {
    for (let i = 0; i < count; i++) {
      cards.push({ id: `c${n++}-${kind}`, kind });
    }
  }
  return rng.shuffle(cards);
}

export function deckSize(): number {
  return Object.values(COMPOSITION).reduce((a, b) => a + b, 0);
}
