import { describe, it, expect } from 'vitest';
import balance from '@bagina/schema/data/balance.json' with { type: 'json' };
import type { CardKind, CompletionKind } from '@bagina/schema';
import { computeScores, pickWinners } from '../../src/engine/scoring.js';
import type { GameStateInternal, PlayerInternal } from '../../src/engine/state.js';
import type { HomeworkTemplate } from '../../src/engine/homework.js';

// -- Builders -----------------------------------------------------------
//
// These tests deliberately bypass the reducer. We want to pin scoring's
// arithmetic against hand-built fixtures, so a "Math.min" → "Math.max"
// mutant or a "paws -= broods" → "paws += broods" mutant is visibly wrong
// in the assertions, not absorbed by a full-game replay.

type PartialPlayer = {
  id: string;
  hand?: CardKind[];
  completed?: CompletionKind[];
  poo?: number;
};

const NOOP_HOMEWORK: HomeworkTemplate = {
  id: '__noop__',
  title: 'no homework',
  description: 'never satisfied',
  hintTopic: 'none',
};

function makePlayer(p: PartialPlayer): PlayerInternal {
  const hand = (p.hand ?? []).map((kind, i) => ({ id: `${p.id}-c${i}`, kind }));
  return {
    id: p.id,
    nickname: p.id,
    color: 'pink',
    slot: 0,
    poo: p.poo ?? 0,
    hand,
    completed: p.completed ?? [],
    ready: true,
    online: true,
    movesRemaining: 0,
    homeworkHints: [],
  };
}

function makeState(opts: {
  players: PartialPlayer[];
  homework?: HomeworkTemplate;
  metadata?: Partial<GameStateInternal['metadata']>;
}): GameStateInternal {
  const players = opts.players.map(makePlayer);
  return {
    code: 'TEST',
    phase: 'finished',
    players,
    activePlayerIndex: 0,
    deck: [],
    discard: [],
    homework: opts.homework ?? NOOP_HOMEWORK,
    pendingTrades: [],
    lastEventId: 0,
    rngSeed: 0,
    metadata: {
      successfulTradesByPlayer: opts.metadata?.successfulTradesByPlayer ?? {},
      drewOnMondayByPlayer: opts.metadata?.drewOnMondayByPlayer ?? {},
      actionsApplied: opts.metadata?.actionsApplied ?? 0,
      awaitingPostMoveAction: opts.metadata?.awaitingPostMoveAction ?? false,
    },
  };
}

const COMPLETION = balance.completionPoints; // 10
const PARTIAL = balance.partialPoints; // 5
const HW = balance.homeworkBonus; // 10

// -- computeScores: empty player --------------------------------------------

describe('computeScores — empty player', () => {
  it('zeroes every field when player has no hand, no completed sets, no homework', () => {
    const s = makeState({ players: [{ id: 'P1' }] });
    const [score] = computeScores(s);
    expect(score).toEqual({
      playerId: 'P1',
      baginos: 0,
      baginas: 0,
      broods: 0,
      latches: 0,
      homeworkBonus: 0,
      total: 0,
    });
  });

  it('returns one score per player, in player order', () => {
    const s = makeState({
      players: [{ id: 'A' }, { id: 'B' }, { id: 'C' }],
    });
    const scores = computeScores(s);
    expect(scores.map((x) => x.playerId)).toEqual(['A', 'B', 'C']);
  });
});

// -- computeScores: completion arithmetic ----------------------------------

describe('computeScores — completed sets', () => {
  it('1 bagino → baginos=1, total = completionPoints', () => {
    const s = makeState({ players: [{ id: 'P1', completed: ['bagino'] }] });
    const [score] = computeScores(s);
    expect(score.baginos).toBe(1);
    expect(score.baginas).toBe(0);
    expect(score.total).toBe(COMPLETION);
  });

  it('1 bagina → baginas=1, total = completionPoints', () => {
    const s = makeState({ players: [{ id: 'P1', completed: ['bagina'] }] });
    const [score] = computeScores(s);
    expect(score.baginos).toBe(0);
    expect(score.baginas).toBe(1);
    expect(score.total).toBe(COMPLETION);
  });

  it('2 baginos sum: total = 2 × completionPoints (kills + → - mutant)', () => {
    const s = makeState({ players: [{ id: 'P1', completed: ['bagino', 'bagino'] }] });
    const [score] = computeScores(s);
    expect(score.baginos).toBe(2);
    expect(score.total).toBe(2 * COMPLETION);
  });

  it('1 bagino + 1 bagina → total = 2 × completionPoints', () => {
    const s = makeState({ players: [{ id: 'P1', completed: ['bagino', 'bagina'] }] });
    const [score] = computeScores(s);
    expect(score.baginos).toBe(1);
    expect(score.baginas).toBe(1);
    expect(score.total).toBe(2 * COMPLETION);
  });

  it('counts only "bagino" entries in baginos (kills equality-flip mutant)', () => {
    const s = makeState({
      players: [{ id: 'P1', completed: ['bagino', 'bagina', 'bagina', 'bagino', 'bagino'] }],
    });
    const [score] = computeScores(s);
    expect(score.baginos).toBe(3);
    expect(score.baginas).toBe(2);
  });
});

// -- computeScores: broods and latches -------------------------------------
//
// The greedy algorithm: broods = min(tooth, paw); paws -= broods;
// latches = min(remaining paws, tit). These tests pin both the operator
// and the order of operations — flipping `-=` to `+=` or `min` to `max`
// produces a visibly wrong number.

describe('computeScores — broods and latches', () => {
  it('1 brood from 1 tooth + 1 paw, no leftover paw for a latch', () => {
    const s = makeState({ players: [{ id: 'P1', hand: ['Tooth', 'Paw'] }] });
    const [score] = computeScores(s);
    expect(score.broods).toBe(1);
    expect(score.latches).toBe(0);
    expect(score.total).toBe(PARTIAL);
  });

  it('2 broods from 2 tooth + 2 paw', () => {
    const s = makeState({ players: [{ id: 'P1', hand: ['Tooth', 'Tooth', 'Paw', 'Paw'] }] });
    const [score] = computeScores(s);
    expect(score.broods).toBe(2);
    expect(score.latches).toBe(0);
    expect(score.total).toBe(2 * PARTIAL);
  });

  it('1 latch from 1 paw + 1 tit (no broods, paws stays unchanged)', () => {
    const s = makeState({ players: [{ id: 'P1', hand: ['Paw', 'Tit'] }] });
    const [score] = computeScores(s);
    expect(score.broods).toBe(0);
    expect(score.latches).toBe(1);
    expect(score.total).toBe(PARTIAL);
  });

  it('broods consume paws — kills paws -= broods → paws += broods mutant', () => {
    // 2 tooth, 2 paw, 5 tit:
    //   broods = min(2,2) = 2; paws -= 2 = 0; latches = min(0,5) = 0.
    // If `paws += broods` instead: paws = 4; latches = min(4,5) = 4.
    const s = makeState({
      players: [
        {
          id: 'P1',
          hand: ['Tooth', 'Tooth', 'Paw', 'Paw', 'Tit', 'Tit', 'Tit', 'Tit', 'Tit'],
        },
      ],
    });
    const [score] = computeScores(s);
    expect(score.broods).toBe(2);
    expect(score.latches).toBe(0);
    expect(score.total).toBe(2 * PARTIAL);
  });

  it('asymmetric paws vs tits — kills Math.min(paws,tits) → Math.max mutant', () => {
    // 0 tooth, 1 paw, 5 tit: broods=0; latches = min(1,5) = 1 ≠ max(1,5)=5.
    const s = makeState({
      players: [{ id: 'P1', hand: ['Paw', 'Tit', 'Tit', 'Tit', 'Tit', 'Tit'] }],
    });
    const [score] = computeScores(s);
    expect(score.broods).toBe(0);
    expect(score.latches).toBe(1);
  });

  it('paws > tits — kills "tits = filter(c => true)" / "kind !== Tit" mutants', () => {
    // 5 paw, 1 tit: broods=0, paws=5, latches = min(5, 1) = 1.
    // If the Tit filter is mutated to (c) => true, tits would be 6 and
    // latches would jump to 5. If mutated to (c) => false or (c.kind !== 'Tit'),
    // tits would be 0 or 5 respectively — different latch count either way.
    const s = makeState({
      players: [{ id: 'P1', hand: ['Paw', 'Paw', 'Paw', 'Paw', 'Paw', 'Tit'] }],
    });
    const [score] = computeScores(s);
    expect(score.broods).toBe(0);
    expect(score.latches).toBe(1);
    expect(score.total).toBe(PARTIAL);
  });

  it('asymmetric tooth vs paw — kills Math.min(teeth,paws) → Math.max mutant', () => {
    // 5 tooth, 1 paw, 0 tit: broods = min(5,1) = 1 ≠ max(5,1) = 5.
    const s = makeState({
      players: [{ id: 'P1', hand: ['Tooth', 'Tooth', 'Tooth', 'Tooth', 'Tooth', 'Paw'] }],
    });
    const [score] = computeScores(s);
    expect(score.broods).toBe(1);
    expect(score.latches).toBe(0);
  });

  it('broods consume paws before latches form (1 tooth + 2 paw + 3 tit)', () => {
    // broods = min(1,2) = 1; paws -= 1 → 1; latches = min(1,3) = 1.
    // Mutated paws += broods: paws = 3; latches = min(3,3) = 3.
    const s = makeState({
      players: [{ id: 'P1', hand: ['Tooth', 'Paw', 'Paw', 'Tit', 'Tit', 'Tit'] }],
    });
    const [score] = computeScores(s);
    expect(score.broods).toBe(1);
    expect(score.latches).toBe(1);
    expect(score.total).toBe(2 * PARTIAL);
  });

  it('snouts in hand do not contribute to broods or latches', () => {
    const s = makeState({
      players: [{ id: 'P1', hand: ['Snout', 'Snout', 'Snout', 'Snout'] }],
    });
    const [score] = computeScores(s);
    expect(score.broods).toBe(0);
    expect(score.latches).toBe(0);
    expect(score.total).toBe(0);
  });

  it('only Tooth+Paw cards qualify as broods (kind string equality matters)', () => {
    // 2 paw + 2 tit should not form broods — kills any "kind !== 'Tooth'"
    // negation mutant.
    const s = makeState({
      players: [{ id: 'P1', hand: ['Paw', 'Paw', 'Tit', 'Tit'] }],
    });
    const [score] = computeScores(s);
    expect(score.broods).toBe(0);
    expect(score.latches).toBe(2);
  });
});

// -- computeScores: homework arithmetic ------------------------------------
//
// The risky line is `Math.round(satisfaction * HOMEWORK_BONUS)`. Tests use
// fractional satisfaction so removing Math.round or flipping `*` to `/`
// yields a non-integer or off-by-orders-of-magnitude number.

describe('computeScores — homework bonus', () => {
  const TOOTH_HOARDER: HomeworkTemplate = {
    id: 'tooth-hoarder',
    title: 't',
    description: 't',
    hintTopic: 't',
  };

  it('full satisfaction (4 teeth) → full bonus = HOMEWORK_BONUS', () => {
    const s = makeState({
      players: [{ id: 'P1', hand: ['Tooth', 'Tooth', 'Tooth', 'Tooth'] }],
      homework: TOOTH_HOARDER,
    });
    const [score] = computeScores(s);
    expect(score.homeworkBonus).toBe(HW);
    expect(score.total).toBe(HW);
  });

  it('half satisfaction (2 teeth) → half bonus — kills * → / mutant', () => {
    // 2 teeth ⇒ satisfaction = 0.5 ⇒ round(0.5 × 10) = 5.
    // Mutated to /: round(0.5 / 10) = 0. Mutated to remove Math.round: 5.
    const s = makeState({
      players: [{ id: 'P1', hand: ['Tooth', 'Tooth'] }],
      homework: TOOTH_HOARDER,
    });
    const [score] = computeScores(s);
    expect(score.homeworkBonus).toBe(5);
  });

  it('fractional satisfaction (1 tooth) → rounded bonus — kills "remove Math.round" mutant', () => {
    // 1 tooth ⇒ satisfaction = 0.25 ⇒ round(0.25 × 10) = round(2.5) = 3.
    // Without Math.round, 2.5 leaks through and total becomes 2.5 — not 3.
    const s = makeState({
      players: [{ id: 'P1', hand: ['Tooth'] }],
      homework: TOOTH_HOARDER,
    });
    const [score] = computeScores(s);
    expect(score.homeworkBonus).toBe(3);
    expect(Number.isInteger(score.homeworkBonus)).toBe(true);
    expect(score.total).toBe(3);
  });

  it('zero satisfaction (no teeth) → zero bonus', () => {
    const s = makeState({
      players: [{ id: 'P1', hand: ['Paw'] }],
      homework: TOOTH_HOARDER,
    });
    const [score] = computeScores(s);
    expect(score.homeworkBonus).toBe(0);
  });

  it('homework bonus stacks with completion points in total', () => {
    const s = makeState({
      players: [
        { id: 'P1', completed: ['bagino'], hand: ['Tooth', 'Tooth', 'Tooth', 'Tooth'] },
      ],
      homework: TOOTH_HOARDER,
    });
    const [score] = computeScores(s);
    expect(score.baginos).toBe(1);
    expect(score.homeworkBonus).toBe(HW);
    // The 4 teeth in hand do not form broods (no Paw), so the only partial
    // term is 0. Total = COMPLETION + HW.
    expect(score.broods).toBe(0);
    expect(score.total).toBe(COMPLETION + HW);
  });

  it('homework bonus stacks with partial-set points in total', () => {
    // 1 tooth + 1 paw = 1 brood. Then 3 extra teeth satisfy the homework
    // (4 teeth total ⇒ full bonus).
    const s = makeState({
      players: [{ id: 'P1', hand: ['Tooth', 'Tooth', 'Tooth', 'Tooth', 'Paw'] }],
      homework: TOOTH_HOARDER,
    });
    const [score] = computeScores(s);
    expect(score.broods).toBe(1);
    expect(score.homeworkBonus).toBe(HW);
    expect(score.total).toBe(PARTIAL + HW);
  });
});

// -- pickWinners ------------------------------------------------------------

describe('pickWinners', () => {
  it('empty score array → empty winners (kills "if (scores.length === 0)" mutant)', () => {
    expect(pickWinners([])).toEqual([]);
  });

  it('single player → that player wins', () => {
    expect(
      pickWinners([
        { playerId: 'P1', baginos: 0, baginas: 0, broods: 0, latches: 0, homeworkBonus: 0, total: 7 },
      ]),
    ).toEqual(['P1']);
  });

  it('returns the highest-total player when no tie', () => {
    const scores = [
      { playerId: 'A', baginos: 0, baginas: 0, broods: 0, latches: 0, homeworkBonus: 0, total: 5 },
      { playerId: 'B', baginos: 0, baginas: 0, broods: 0, latches: 0, homeworkBonus: 0, total: 12 },
      { playerId: 'C', baginos: 0, baginas: 0, broods: 0, latches: 0, homeworkBonus: 0, total: 9 },
    ];
    expect(pickWinners(scores)).toEqual(['B']);
  });

  it('two-way tie → both top scores in player-order', () => {
    const scores = [
      { playerId: 'A', baginos: 0, baginas: 0, broods: 0, latches: 0, homeworkBonus: 0, total: 10 },
      { playerId: 'B', baginos: 0, baginas: 0, broods: 0, latches: 0, homeworkBonus: 0, total: 7 },
      { playerId: 'C', baginos: 0, baginas: 0, broods: 0, latches: 0, homeworkBonus: 0, total: 10 },
    ];
    expect(pickWinners(scores)).toEqual(['A', 'C']);
  });

  it('three-way tie at zero → all three players win', () => {
    const scores = [
      { playerId: 'A', baginos: 0, baginas: 0, broods: 0, latches: 0, homeworkBonus: 0, total: 0 },
      { playerId: 'B', baginos: 0, baginas: 0, broods: 0, latches: 0, homeworkBonus: 0, total: 0 },
      { playerId: 'C', baginos: 0, baginas: 0, broods: 0, latches: 0, homeworkBonus: 0, total: 0 },
    ];
    expect(pickWinners(scores)).toEqual(['A', 'B', 'C']);
  });

  it('excludes non-top totals — kills "s.total === max" → "s.total !== max" mutant', () => {
    const scores = [
      { playerId: 'A', baginos: 0, baginas: 0, broods: 0, latches: 0, homeworkBonus: 0, total: 10 },
      { playerId: 'B', baginos: 0, baginas: 0, broods: 0, latches: 0, homeworkBonus: 0, total: 5 },
    ];
    const winners = pickWinners(scores);
    expect(winners).toContain('A');
    expect(winners).not.toContain('B');
    expect(winners).toHaveLength(1);
  });
});
