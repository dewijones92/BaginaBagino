import { describe, it, expect } from 'vitest';
import balance from '@bagina/schema/data/balance.json' with { type: 'json' };
import { emptyLobby, addPlayer, setReady } from '../../src/engine/reducer.js';

const NEVER_IN_STARTING_HAND = ['Wind', 'RainyDay', 'MarketDay', 'Business'] as const;

function startGame(seed: number, players = 2) {
  let s = emptyLobby('SET1', seed);
  for (let i = 0; i < players; i++) {
    s = addPlayer(s, `P${i + 1}`, `P${i + 1}`).state;
  }
  for (let i = 0; i < players; i++) {
    s = setReady(s, `P${i + 1}`, true).state;
  }
  return s;
}

describe('game setup', () => {
  // Regression: events and Business used to leak into starting hands and stay
  // there forever — they auto-resolve on draw, so they have no business in a
  // hand. Sweep many seeds to be confident.
  it.each([1, 2, 3, 7, 11, 17, 42, 99, 123, 999, 31337])(
    'seed %i: no event or Business cards in any starting hand (2 players)',
    (seed) => {
      const s = startGame(seed, 2);
      for (const p of s.players) {
        for (const card of p.hand) {
          expect(NEVER_IN_STARTING_HAND).not.toContain(card.kind);
        }
      }
    },
  );

  it.each([1, 2, 3, 4, 5, 11, 42])(
    'seed %i: no event or Business cards in any starting hand (4 players)',
    (seed) => {
      const s = startGame(seed, 4);
      for (const p of s.players) {
        for (const card of p.hand) {
          expect(NEVER_IN_STARTING_HAND).not.toContain(card.kind);
        }
      }
    },
  );

  it('every player gets exactly the configured starting hand size', () => {
    const s = startGame(7, 4);
    for (const p of s.players) {
      expect(p.hand.length).toBe(balance.startingHandSize);
    }
  });

  it('every player gets the configured starting poo', () => {
    const s = startGame(7, 4);
    for (const p of s.players) {
      expect(p.poo).toBe(balance.startingPoo);
    }
  });

  it('starting poo is at least the draw cost — players can act on turn 1', () => {
    expect(balance.startingPoo).toBeGreaterThanOrEqual(balance.drawCostPoo);
  });

  it('phase is "playing" once everyone is ready', () => {
    const s = startGame(7, 2);
    expect(s.phase).toBe('playing');
  });

  it('does not lose cards when filtering events out of starting hands', () => {
    // Total deck cards should still equal composition sum after setup.
    const s = startGame(7, 2);
    const handTotal = s.players.reduce((a, p) => a + p.hand.length, 0);
    const composition = (require('@bagina/schema/data/deck.json') as { composition: Record<string, number> }).composition;
    const totalCards = Object.values(composition).reduce((a: number, b: number) => a + b, 0);
    expect(s.deck.length + handTotal).toBe(totalCards);
  });
});
