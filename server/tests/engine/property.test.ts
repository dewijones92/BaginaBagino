import { describe, it, expect } from 'vitest';
import {
  emptyLobby,
  addPlayer,
  setReady,
  applyAction,
} from '../../src/engine/reducer.js';
import { legalActionsFor } from '../../src/engine/actions.js';
import { computeScores } from '../../src/engine/scoring.js';
import { deckSize } from '../../src/engine/deck.js';
import type { GameStateInternal } from '../../src/engine/state.js';

function runRandomGame(seed: number, playerCount: number): GameStateInternal {
  let s = emptyLobby('PROP', seed);
  for (let i = 0; i < playerCount; i++) {
    s = addPlayer(s, `P${i + 1}`, `P${i + 1}`).state;
  }
  for (let i = 0; i < playerCount; i++) {
    s = setReady(s, `P${i + 1}`, true).state;
  }
  let cap = 5000;
  while (s.phase !== 'finished' && cap-- > 0) {
    const active = s.players[s.activePlayerIndex]!;
    const legal = legalActionsFor(s, active.id);
    if (legal.length === 0) break;
    // Prefer move > draw > end (no random in tests; we keep it deterministic).
    const pick = legal.includes('MoveToken')
      ? 'MoveToken'
      : legal.includes('DrawCard')
      ? 'DrawCard'
      : 'EndTurn';
    s = applyAction(s, active.id, { kind: pick } as any).state;
  }
  return s;
}

describe('engine properties', () => {
  it.each([1, 2, 3, 4, 5])('seed %i: 4-player game terminates in finished state', (seed) => {
    const s = runRandomGame(seed, 4);
    expect(s.phase).toBe('finished');
  });

  it.each([10, 20, 30])('seed %i: scores are non-negative', (seed) => {
    const s = runRandomGame(seed, 4);
    const scores = computeScores(s);
    for (const sc of scores) {
      expect(sc.total).toBeGreaterThanOrEqual(0);
      expect(sc.baginos).toBeGreaterThanOrEqual(0);
      expect(sc.baginas).toBeGreaterThanOrEqual(0);
      expect(sc.broods).toBeGreaterThanOrEqual(0);
      expect(sc.latches).toBeGreaterThanOrEqual(0);
      expect(sc.homeworkBonus).toBeGreaterThanOrEqual(0);
    }
  });

  it.each([100, 200])('seed %i: every card is somewhere (deck + discard + hands + consumed = deckSize)', (seed) => {
    const s = runRandomGame(seed, 4);
    const handTotal = s.players.reduce((acc, p) => acc + p.hand.length, 0);
    // Each completion consumes 6 cards (3+2+1 or 2+3+1) — they aren't in
    // hand or discard afterward.
    const consumed = s.players.reduce(
      (acc, p) => acc + p.completed.length * 6,
      0,
    );
    expect(s.deck.length + s.discard.length + handTotal + consumed).toBe(deckSize());
  });

  it.each([5, 6])('seed %i: never advances past 4 × movesPerPlayer total moves', (seed) => {
    const s = runRandomGame(seed, 4);
    // Sum of moves consumed cannot exceed configured cap.
    const consumed = 4 * 40 - s.players.reduce((acc, p) => acc + p.movesRemaining, 0);
    expect(consumed).toBeLessThanOrEqual(160);
  });
});
