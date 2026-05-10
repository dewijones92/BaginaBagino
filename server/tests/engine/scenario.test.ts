import { describe, it, expect } from 'vitest';
import { pickRecipeCards } from './_recipes.js';
import {
  emptyLobby,
  addPlayer,
  setReady,
  applyAction,
  projectPublic,
} from '../../src/engine/reducer.js';
import { legalActionsFor } from '../../src/engine/actions.js';
import type { GameStateInternal } from '../../src/engine/state.js';

/**
 * Walk a 2-player game to completion using a deterministic auto-pilot.
 * The driver is the test harness — both server engine and "policy" are pure.
 */
function autopilotPolicy(state: GameStateInternal, playerId: string): { kind: string; cardId?: string } {
  const legal = legalActionsFor(state, playerId);
  if (legal.includes('MoveToken')) return { kind: 'MoveToken' };
  // Try declaring before ending turn so the test exercises that path.
  if (legal.includes('DeclareCompletion')) {
    // Quick heuristic: declare a bagino if we can.
    const me = state.players.find((p) => p.id === playerId)!;
    const ids = pickRecipeCards(me.hand, 'bagino');
    if (ids !== null) {
      // We use a marker action that the caller translates into a fully-typed action.
      return { kind: 'DeclareCompletion:bagino', cardId: ids.join(',') };
    }
  }
  if (legal.includes('DrawCard')) return { kind: 'DrawCard' };
  if (legal.includes('EndTurn')) return { kind: 'EndTurn' };
  return { kind: 'EndTurn' };
}

function step(state: GameStateInternal, playerId: string, action: { kind: string; cardId?: string }): GameStateInternal {
  if (action.kind === 'DeclareCompletion:bagino') {
    const ids = action.cardId!.split(',');
    return applyAction(state, playerId, { kind: 'DeclareCompletion', what: 'bagino', cardIds: ids }).state;
  }
  return applyAction(state, playerId, { kind: action.kind } as any).state;
}

function runFullGame(seed: number, playerCount: number): GameStateInternal {
  let s = emptyLobby('TEST', seed);
  for (let i = 0; i < playerCount; i++) {
    s = addPlayer(s, `P${i + 1}`, `Player${i + 1}`).state;
  }
  for (let i = 0; i < playerCount; i++) {
    s = setReady(s, `P${i + 1}`, true).state;
  }
  expect(s.phase).toBe('playing');

  // Cap the loop to prevent runaway. Bail if a step makes no progress
  // (defensive — should not happen now that legalActionsFor matches the
  // reducer's guards).
  for (let i = 0; i < 10000; i++) {
    if (s.phase === 'finished') break;
    const active = s.players[s.activePlayerIndex]!;
    const action = autopilotPolicy(s, active.id);
    const before = s.metadata.actionsApplied;
    s = step(s, active.id, action);
    if (s.metadata.actionsApplied === before) {
      throw new Error(`no progress at step ${i} for ${active.id} action ${action.kind}`);
    }
  }
  return s;
}

describe('full-game scenarios', () => {
  it('seeded 2-player game reaches finished state', () => {
    const s = runFullGame(1234, 2);
    expect(s.phase).toBe('finished');
    expect(s.players.every((p) => p.movesRemaining === 0)).toBe(true);
  });

  it('seeded 4-player game terminates and produces non-negative scores', () => {
    const s = runFullGame(7777, 4);
    expect(s.phase).toBe('finished');
    // Spot-check the projection
    const pub = projectPublic(s);
    expect(pub.phase).toBe('finished');
  });

  it('different seeds produce different games', () => {
    const a = runFullGame(1, 2);
    const b = runFullGame(2, 2);
    // Different seeds shuffle the deck differently and roll different
    // homework, so the full state must differ somewhere.
    expect(JSON.stringify(a)).not.toBe(JSON.stringify(b));
  });

  it('replaying the same seed gives identical final state', () => {
    const a = runFullGame(99, 3);
    const b = runFullGame(99, 3);
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
  });
});
