import { describe, it, expect } from 'vitest';
import balance from '@bagina/schema/data/balance.json' with { type: 'json' };
import { pickRecipeCards } from './_recipes.js';
import {
  emptyLobby,
  addPlayer,
  setReady,
  applyAction,
  projectPublic,
} from '../../src/engine/reducer.js';
import { legalActionsFor } from '../../src/engine/actions.js';
import { computeScores, pickWinners } from '../../src/engine/scoring.js';
import type { GameStateInternal } from '../../src/engine/state.js';
import type { GameAction, ServerEvent } from '@bagina/schema';

// ─── policies (deliberately distinct play-styles) ──────────────────────────

const greedyDraw = (s: GameStateInternal): GameAction => {
  const me = s.players[s.activePlayerIndex]!;
  const legal = new Set(legalActionsFor(s, me.id));
  if (legal.has('MoveToken')) return { kind: 'MoveToken' };
  if (legal.has('DrawCard')) return { kind: 'DrawCard' };
  return { kind: 'EndTurn' };
};

const baginoSeeker = (s: GameStateInternal): GameAction => {
  const me = s.players[s.activePlayerIndex]!;
  const legal = new Set(legalActionsFor(s, me.id));
  if (legal.has('MoveToken')) return { kind: 'MoveToken' };
  if (legal.has('DeclareCompletion')) {
    const ids = pickRecipeCards(me.hand, 'bagino');
    if (ids !== null) {
      return { kind: 'DeclareCompletion', what: 'bagino', cardIds: ids };
    }
  }
  if (legal.has('DrawCard')) return { kind: 'DrawCard' };
  return { kind: 'EndTurn' };
};

const baginaSeeker = (s: GameStateInternal): GameAction => {
  const me = s.players[s.activePlayerIndex]!;
  const legal = new Set(legalActionsFor(s, me.id));
  if (legal.has('MoveToken')) return { kind: 'MoveToken' };
  if (legal.has('DeclareCompletion')) {
    const ids = pickRecipeCards(me.hand, 'bagina');
    if (ids !== null) {
      return { kind: 'DeclareCompletion', what: 'bagina', cardIds: ids };
    }
  }
  if (legal.has('DrawCard')) return { kind: 'DrawCard' };
  return { kind: 'EndTurn' };
};

const specialist = (s: GameStateInternal): GameAction => {
  const me = s.players[s.activePlayerIndex]!;
  const legal = new Set(legalActionsFor(s, me.id));
  if (legal.has('MoveToken')) return { kind: 'MoveToken' };
  if (legal.has('PlayCard')) {
    const special = me.hand.find((c) => c.kind === 'Clever' || c.kind === 'Brave');
    if (special) return { kind: 'PlayCard', cardId: special.id };
  }
  if (legal.has('DrawCard')) return { kind: 'DrawCard' };
  return { kind: 'EndTurn' };
};

type PolicyName = 'greedy' | 'bagino' | 'bagina' | 'specialist';
const POLICIES: Record<PolicyName, (s: GameStateInternal) => GameAction> = {
  greedy: greedyDraw,
  bagino: baginoSeeker,
  bagina: baginaSeeker,
  specialist,
};

// ─── runner ────────────────────────────────────────────────────────────────

type RunResult = {
  finalState: GameStateInternal;
  gameStartedCount: number;
  gameEndedCount: number;
  homeworkRevealedCount: number;
  protocolErrors: number;
  ticks: number;
  gameEnded: Extract<ServerEvent, { kind: 'GameEnded' }>;
};

function bootstrap(code: string, seed: number, n: number): { state: GameStateInternal; events: ServerEvent[] } {
  let s = emptyLobby(code as any, seed);
  const events: ServerEvent[] = [];
  for (let i = 0; i < n; i++) {
    const r = addPlayer(s, `P${i + 1}`, `P${i + 1}`);
    s = r.state;
    events.push(...r.events);
  }
  for (let i = 0; i < n; i++) {
    const r = setReady(s, `P${i + 1}`, true);
    s = r.state;
    events.push(...r.events);
  }
  return { state: s, events };
}

/**
 * Run a game where each player uses their own assigned policy (by index).
 * Returns aggregated event counts + the final state — so end-state assertions
 * can interrogate everything that happened.
 */
function runMixed(seed: number, perPlayerPolicy: PolicyName[]): RunResult {
  const boot = bootstrap('EGM1', seed, perPlayerPolicy.length);
  let s = boot.state;
  let gameStartedCount = 0;
  let gameEndedCount = 0;
  let homeworkRevealedCount = 0;
  let protocolErrors = 0;
  let gameEnded: Extract<ServerEvent, { kind: 'GameEnded' }> | undefined;
  let safety = 5000;
  let ticks = 0;
  // Count lifecycle events emitted during setup too (GameStarted fires when
  // the last player toggles ready inside setReady).
  for (const e of boot.events) {
    if (e.kind === 'GameStarted') gameStartedCount++;
  }

  while (s.phase === 'playing' && safety-- > 0) {
    const idx = s.activePlayerIndex;
    const policy = POLICIES[perPlayerPolicy[idx]!];
    const action = policy(s);
    const before = s.metadata.actionsApplied;
    const r = applyAction(s, s.players[idx]!.id, action);
    s = r.state;
    ticks++;
    for (const e of r.events) {
      if (e.kind === 'GameStarted') gameStartedCount++;
      if (e.kind === 'GameEnded') {
        gameEndedCount++;
        gameEnded = e;
      }
      if (e.kind === 'HomeworkRevealed') homeworkRevealedCount++;
      if (e.kind === 'ProtocolError') protocolErrors++;
    }
    // Avoid spin on policies that propose illegal actions (e.g. Declare
    // when not ready): if the engine refused, force EndTurn.
    if (s.metadata.actionsApplied === before) {
      const legal = legalActionsFor(s, s.players[s.activePlayerIndex]!.id);
      if (legal.includes('EndTurn')) {
        s = applyAction(s, s.players[s.activePlayerIndex]!.id, { kind: 'EndTurn' }).state;
      } else {
        break;
      }
    }
  }

  if (!gameEnded) throw new Error(`game did not finish in ${ticks} ticks (seed=${seed})`);
  return {
    finalState: s,
    gameStartedCount,
    gameEndedCount,
    homeworkRevealedCount,
    protocolErrors,
    ticks,
    gameEnded,
  };
}

function assertEndStateHealthy(r: RunResult, playerCount: number, seed: number): void {
  const s = r.finalState;
  const label = `seed=${seed}/${playerCount}p`;

  // Phase + lifecycle events
  expect(s.phase, `${label}: should be finished`).toBe('finished');
  expect(r.gameStartedCount, `${label}: GameStarted should fire exactly once`).toBe(1);
  expect(r.gameEndedCount, `${label}: GameEnded should fire exactly once`).toBe(1);
  expect(r.homeworkRevealedCount, `${label}: HomeworkRevealed should fire exactly once`).toBe(1);

  // No moves remaining when game ends naturally
  const movesLeft = s.players.reduce((a, p) => a + p.movesRemaining, 0);
  expect(movesLeft, `${label}: all moves should be spent`).toBe(0);

  // Total move count consumed equals the configured cap
  // (each player gets exactly balance.movesPerPlayer; sum is bounded above
  //  by N × cap, and since all moves end up spent this is an equality).
  // Actually, internal players[].movesRemaining starts at movesPerPlayer
  // and decrements per MoveToken. At end, all 0 ⇒ all moves consumed.

  // Scores
  expect(r.gameEnded.scores.length, `${label}: one score per player`).toBe(playerCount);
  for (const sc of r.gameEnded.scores) {
    expect(sc.total, `${label}: ${sc.playerId} total >= 0`).toBeGreaterThanOrEqual(0);
    expect(sc.baginos, `${label}: ${sc.playerId} baginos >= 0`).toBeGreaterThanOrEqual(0);
    expect(sc.baginas, `${label}: ${sc.playerId} baginas >= 0`).toBeGreaterThanOrEqual(0);
    expect(sc.broods, `${label}: ${sc.playerId} broods >= 0`).toBeGreaterThanOrEqual(0);
    expect(sc.latches, `${label}: ${sc.playerId} latches >= 0`).toBeGreaterThanOrEqual(0);
    expect(sc.homeworkBonus, `${label}: ${sc.playerId} hw bonus >= 0`).toBeGreaterThanOrEqual(0);
    // Total respects the linear scoring formula
    const expected =
      (sc.baginos + sc.baginas) * balance.completionPoints +
      (sc.broods + sc.latches) * balance.partialPoints +
      sc.homeworkBonus;
    expect(sc.total, `${label}: ${sc.playerId} total matches formula`).toBe(expected);
  }

  // Winners
  expect(r.gameEnded.winnerIds.length, `${label}: at least one winner`).toBeGreaterThan(0);
  const winningTotal = r.gameEnded.scores
    .find((s) => s.playerId === r.gameEnded.winnerIds[0])!.total;
  // All winners share the same total (it's a strict tie or unique top)
  for (const id of r.gameEnded.winnerIds) {
    const sc = r.gameEnded.scores.find((s) => s.playerId === id)!;
    expect(sc.total, `${label}: winner ${id} share top score`).toBe(winningTotal);
  }
  // No non-winner has a strictly higher total than the winning total
  for (const sc of r.gameEnded.scores) {
    if (!r.gameEnded.winnerIds.includes(sc.playerId)) {
      expect(sc.total, `${label}: non-winner ${sc.playerId} can't beat winner`).toBeLessThanOrEqual(winningTotal);
    }
  }

  // The protocol error log should be minimal across a healthy game. Policies
  // that propose Declare-when-not-ready will emit some — but a sane upper
  // bound proves we're not error-flooding.
  expect(r.protocolErrors, `${label}: protocol errors should be bounded`).toBeLessThan(50);

  // Public projection at end-of-game is internally consistent.
  const pub = projectPublic(s);
  expect(pub.phase).toBe('finished');
  expect(pub.activePlayerId).toBeNull();
  expect(pub.turnsRemaining).toBe(0);
}

// ─── tests ─────────────────────────────────────────────────────────────────

const SEEDS = [1, 2, 7, 13, 42, 99, 137, 256, 1024, 31337] as const;

describe('end-game — mixed-policy 2-player games', () => {
  it.each(SEEDS)('seed %i: greedy vs bagino-seeker reaches a clean end', (seed) => {
    const r = runMixed(seed, ['greedy', 'bagino']);
    assertEndStateHealthy(r, 2, seed);
  });

  it.each(SEEDS)('seed %i: bagina-seeker vs specialist reaches a clean end', (seed) => {
    const r = runMixed(seed, ['bagina', 'specialist']);
    assertEndStateHealthy(r, 2, seed);
  });

  it.each(SEEDS)('seed %i: bagino-seeker vs bagina-seeker reaches a clean end', (seed) => {
    const r = runMixed(seed, ['bagino', 'bagina']);
    assertEndStateHealthy(r, 2, seed);
  });
});

describe('end-game — mixed-policy 3-player games', () => {
  it.each(SEEDS)('seed %i: greedy + bagino + specialist reaches a clean end', (seed) => {
    const r = runMixed(seed, ['greedy', 'bagino', 'specialist']);
    assertEndStateHealthy(r, 3, seed);
  });

  it.each(SEEDS)('seed %i: bagino + bagina + specialist reaches a clean end', (seed) => {
    const r = runMixed(seed, ['bagino', 'bagina', 'specialist']);
    assertEndStateHealthy(r, 3, seed);
  });
});

describe('end-game — mixed-policy 4-player games (the canonical lobby)', () => {
  it.each(SEEDS)('seed %i: greedy + bagino + bagina + specialist reaches a clean end', (seed) => {
    const r = runMixed(seed, ['greedy', 'bagino', 'bagina', 'specialist']);
    assertEndStateHealthy(r, 4, seed);
  });

  it.each(SEEDS)('seed %i: 4 baginoSeekers — competing for the same recipe', (seed) => {
    const r = runMixed(seed, ['bagino', 'bagino', 'bagino', 'bagino']);
    assertEndStateHealthy(r, 4, seed);
  });

  it.each(SEEDS)('seed %i: 4 baginaSeekers — different recipe pressure', (seed) => {
    const r = runMixed(seed, ['bagina', 'bagina', 'bagina', 'bagina']);
    assertEndStateHealthy(r, 4, seed);
  });

  it.each(SEEDS)('seed %i: 4 specialists — Clever/Brave cards exhaustively played', (seed) => {
    const r = runMixed(seed, ['specialist', 'specialist', 'specialist', 'specialist']);
    assertEndStateHealthy(r, 4, seed);
  });
});

describe('end-game — invariants tied to the canonical max-moves rule', () => {
  it('every healthy game ends with sum(movesRemaining) === 0', () => {
    for (const seed of SEEDS) {
      const r = runMixed(seed, ['greedy', 'bagino', 'bagina', 'specialist']);
      const movesLeft = r.finalState.players.reduce((a, p) => a + p.movesRemaining, 0);
      expect(movesLeft, `seed ${seed}`).toBe(0);
    }
  });

  it('GameEnded scores match computeScores() / pickWinners() byte-for-byte', () => {
    for (const seed of SEEDS) {
      const r = runMixed(seed, ['greedy', 'bagino', 'bagina', 'specialist']);
      expect(r.gameEnded.scores).toEqual(computeScores(r.finalState));
      expect(r.gameEnded.winnerIds).toEqual(pickWinners(computeScores(r.finalState)));
    }
  });

  it('determinism: same seed + same per-player policy → byte-identical final state', () => {
    for (const seed of [42, 1024]) {
      const a = runMixed(seed, ['greedy', 'bagino', 'bagina', 'specialist']);
      const b = runMixed(seed, ['greedy', 'bagino', 'bagina', 'specialist']);
      expect(JSON.stringify(a.finalState)).toBe(JSON.stringify(b.finalState));
      // Re-deriving scores from the final state should also be deterministic.
      expect(a.gameEnded.scores).toEqual(b.gameEnded.scores);
    }
  });
});
