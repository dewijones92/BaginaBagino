import { describe, it, expect } from 'vitest';
import balance from '@bagina/schema/data/balance.json' with { type: 'json' };
import {
  emptyLobby,
  addPlayer,
  setReady,
  applyAction,
  projectPublic,
  projectPrivate,
} from '../../src/engine/reducer.js';
import { legalActionsFor } from '../../src/engine/actions.js';
import { computeScores, pickWinners } from '../../src/engine/scoring.js';
import { deckSize } from '../../src/engine/deck.js';
import type { GameStateInternal } from '../../src/engine/state.js';
import type {
  CardKind,
  GameAction,
  GameCard,
  ServerEvent,
} from '@bagina/schema';

// ─── helpers ────────────────────────────────────────────────────────────────

function bootstrap(seed: number, players: number): GameStateInternal {
  let s = emptyLobby('MUL1', seed);
  for (let i = 0; i < players; i++) {
    s = addPlayer(s, `P${i + 1}`, `P${i + 1}`).state;
  }
  for (let i = 0; i < players; i++) {
    s = setReady(s, `P${i + 1}`, true).state;
  }
  return s;
}

/** Put a card of `kind` at the top of the deck (used to test draw paths). */
function placeNext(s: GameStateInternal, kind: CardKind): GameStateInternal {
  const next = clone(s);
  const idx = next.deck.findIndex((c) => c.kind === kind);
  if (idx < 0) return next;
  const [card] = next.deck.splice(idx, 1);
  if (card) next.deck.unshift(card);
  return next;
}

function clone<T>(x: T): T {
  return JSON.parse(JSON.stringify(x));
}

/**
 * Total cards alive in the system. Completed-set cards live in
 * `discard` (the engine doesn't delete them), so they're already counted
 * in `s.discard.length` — don't double-count via completed.length.
 */
function accountedCards(s: GameStateInternal): number {
  const handTotal = s.players.reduce((a, p) => a + p.hand.length, 0);
  return s.deck.length + s.discard.length + handTotal;
}

/**
 * Invariant battery — runs after EVERY action. Any violation here pinpoints
 * the action that broke the rule, so failures are easy to diagnose.
 */
function expectInvariants(s: GameStateInternal, label: string): void {
  // Card conservation
  expect(accountedCards(s), `${label}: cards lost from system`).toBe(deckSize());

  // No negative state
  for (const p of s.players) {
    expect(p.poo, `${label}: ${p.id} poo negative`).toBeGreaterThanOrEqual(0);
    expect(p.slot, `${label}: ${p.id} slot negative`).toBeGreaterThanOrEqual(0);
    expect(p.movesRemaining, `${label}: ${p.id} movesRemaining negative`).toBeGreaterThanOrEqual(0);
    expect(p.hand.length, `${label}: ${p.id} hand negative`).toBeGreaterThanOrEqual(0);
  }

  // projectPublic reflects internal state faithfully
  const pub = projectPublic(s);
  expect(pub.players.length, `${label}: projection lost a player`).toBe(s.players.length);
  for (let i = 0; i < s.players.length; i++) {
    expect(pub.players[i]!.handCount, `${label}: player ${i} handCount mismatch`).toBe(s.players[i]!.hand.length);
    expect(pub.players[i]!.poo, `${label}: player ${i} poo mismatch`).toBe(s.players[i]!.poo);
    expect(pub.players[i]!.slot, `${label}: player ${i} slot mismatch`).toBe(s.players[i]!.slot);
  }

  // projectPrivate echoes the player's hand exactly
  for (const p of s.players) {
    const priv = projectPrivate(s, p.id);
    expect(priv.hand.length, `${label}: priv hand length mismatch for ${p.id}`).toBe(p.hand.length);
  }

  // Exactly one active player when phase is 'playing'
  if (s.phase === 'playing') {
    expect(s.players[s.activePlayerIndex], `${label}: active index out of range`).toBeDefined();
  }

  // Card IDs unique system-wide
  const ids = new Set<string>();
  const collect = (card: GameCard) => {
    if (ids.has(card.id)) throw new Error(`${label}: duplicate card id ${card.id}`);
    ids.add(card.id);
  };
  s.deck.forEach(collect);
  s.discard.forEach(collect);
  s.players.forEach((p) => p.hand.forEach(collect));
}

type Policy = (s: GameStateInternal) => GameAction;

/**
 * Drive the active player one step at a time according to `policy`. After
 * every applied action, run the invariant battery. Optionally watch score
 * monotonicity (completed-set credit never decreases mid-game).
 */
function play(
  initial: GameStateInternal,
  policy: Policy,
  opts: { maxTicks?: number; scoreMonotonic?: boolean } = {},
): GameStateInternal {
  let s = initial;
  const max = opts.maxTicks ?? 5000;
  let lastBaginos = new Map<string, number>();
  let lastBaginas = new Map<string, number>();
  let tick = 0;

  expectInvariants(s, 'initial');

  while (s.phase === 'playing' && tick++ < max) {
    const active = s.players[s.activePlayerIndex];
    if (!active) break;
    const before = s.metadata.actionsApplied;
    const action = policy(s);
    const r = applyAction(s, active.id, action);
    s = r.state;

    expectInvariants(s, `after tick=${tick} action=${action.kind}`);

    // Score monotonicity (only true during play — completed sets never drop)
    if (opts.scoreMonotonic) {
      for (const p of s.players) {
        const prevBaginos = lastBaginos.get(p.id) ?? 0;
        const prevBaginas = lastBaginas.get(p.id) ?? 0;
        const bs = p.completed.filter((c) => c === 'bagino').length;
        const bg = p.completed.filter((c) => c === 'bagina').length;
        expect(bs, `tick=${tick}: ${p.id} lost a bagino`).toBeGreaterThanOrEqual(prevBaginos);
        expect(bg, `tick=${tick}: ${p.id} lost a bagina`).toBeGreaterThanOrEqual(prevBaginas);
        lastBaginos.set(p.id, bs);
        lastBaginas.set(p.id, bg);
      }
    }

    // If actionsApplied didn't move, the engine refused the action. The
    // policy must adapt; this still consumes a tick but mustn't loop
    // forever — bail safe.
    if (s.metadata.actionsApplied === before) {
      // Force EndTurn if it's legal, else break — preserves progress on
      // tests that script ambitious policies but hit guards.
      const legal = legalActionsFor(s, active.id);
      if (legal.includes('EndTurn')) {
        s = applyAction(s, active.id, { kind: 'EndTurn' }).state;
        expectInvariants(s, `forced EndTurn after refusal tick=${tick}`);
      } else {
        break;
      }
    }
  }
  return s;
}

// ─── policies ──────────────────────────────────────────────────────────────

/** Move, draw if affordable, end. Simplest sane game-runner. */
const greedyDraw: Policy = (s) => {
  const active = s.players[s.activePlayerIndex]!;
  const legal = new Set(legalActionsFor(s, active.id));
  if (legal.has('MoveToken')) return { kind: 'MoveToken' };
  if (legal.has('DrawCard')) return { kind: 'DrawCard' };
  return { kind: 'EndTurn' };
};

/** Build a bagino: move, draw, declare the moment you can. */
const baginoSeeker: Policy = (s) => {
  const active = s.players[s.activePlayerIndex]!;
  const legal = new Set(legalActionsFor(s, active.id));
  if (legal.has('MoveToken')) return { kind: 'MoveToken' };
  if (legal.has('DeclareCompletion')) {
    const teeth = active.hand.filter((c) => c.kind === 'Tooth').slice(0, 3).map((c) => c.id);
    const paws = active.hand.filter((c) => c.kind === 'Paw').slice(0, 2).map((c) => c.id);
    const snouts = active.hand.filter((c) => c.kind === 'Snout').slice(0, 1).map((c) => c.id);
    if (teeth.length === 3 && paws.length === 2 && snouts.length === 1) {
      return { kind: 'DeclareCompletion', what: 'bagino', cardIds: [...teeth, ...paws, ...snouts] };
    }
  }
  if (legal.has('DrawCard')) return { kind: 'DrawCard' };
  if (legal.has('EndTurn')) return { kind: 'EndTurn' };
  return { kind: 'EndTurn' };
};

/** Play any Special card the moment it's in hand. Exercises PlayCard branches. */
const specialPlayer: Policy = (s) => {
  const active = s.players[s.activePlayerIndex]!;
  const legal = new Set(legalActionsFor(s, active.id));
  if (legal.has('MoveToken')) return { kind: 'MoveToken' };
  if (legal.has('PlayCard')) {
    const special = active.hand.find((c) => c.kind === 'Clever' || c.kind === 'Brave');
    if (special) return { kind: 'PlayCard', cardId: special.id };
  }
  if (legal.has('DrawCard')) return { kind: 'DrawCard' };
  return { kind: 'EndTurn' };
};

// ─── tests ─────────────────────────────────────────────────────────────────

describe('multi-turn — invariants hold every step', () => {
  it.each([1, 2, 3, 7, 11, 13, 42, 99, 137, 999])(
    'seed %i: 4-player game with greedyDraw — invariants survive',
    (seed) => {
      const s = play(bootstrap(seed, 4), greedyDraw, { scoreMonotonic: true });
      expect(s.phase).toBe('finished');
    },
  );

  it.each([1, 2, 3, 5, 8, 13, 21, 34])(
    'seed %i: 2-player game with baginoSeeker — invariants survive',
    (seed) => {
      const s = play(bootstrap(seed, 2), baginoSeeker, { scoreMonotonic: true });
      expect(s.phase).toBe('finished');
    },
  );

  it.each([1, 7, 11, 42, 123])(
    'seed %i: 3-player game with specialPlayer — invariants survive',
    (seed) => {
      const s = play(bootstrap(seed, 3), specialPlayer, { scoreMonotonic: true });
      expect(s.phase).toBe('finished');
    },
  );
});

describe('multi-turn — termination + structural guarantees', () => {
  it('terminates in roughly bounded ticks (4p, greedy)', () => {
    // Each player gets balance.movesPerPlayer moves; bounded total per game.
    const s = bootstrap(7, 4);
    let count = 0;
    let cur = s;
    while (cur.phase === 'playing' && count < 5000) {
      cur = applyAction(cur, cur.players[cur.activePlayerIndex]!.id, greedyDraw(cur)).state;
      count++;
    }
    expect(cur.phase).toBe('finished');
    // Each move/draw/end is ~3 actions per turn × 40 turns × 4 players ≈ 480
    // plus some completions. Leave generous headroom but pin a real ceiling.
    expect(count).toBeLessThan(1500);
  });

  it('GameEnded scores match scoring.computeScores() exactly', () => {
    // Capture the GameEnded event and compare.
    let cur = bootstrap(42, 4);
    let lastEnded: Extract<ServerEvent, { kind: 'GameEnded' }> | null = null;
    let safety = 5000;
    while (cur.phase === 'playing' && safety-- > 0) {
      const active = cur.players[cur.activePlayerIndex]!;
      const r = applyAction(cur, active.id, greedyDraw(cur));
      cur = r.state;
      for (const e of r.events) if (e.kind === 'GameEnded') lastEnded = e;
    }
    expect(cur.phase).toBe('finished');
    expect(lastEnded).not.toBeNull();
    const computed = computeScores(cur);
    expect(lastEnded!.scores).toEqual(computed);
    expect(lastEnded!.winnerIds).toEqual(pickWinners(computed));
  });

  it('same seed + same policy → byte-identical final state (determinism)', () => {
    const a = play(bootstrap(2024, 4), greedyDraw);
    const b = play(bootstrap(2024, 4), greedyDraw);
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
  });
});

describe('multi-turn — trade flow', () => {
  function setup2(): GameStateInternal {
    return bootstrap(11, 2);
  }

  it('accepted trade moves the right cards and poo, marks successfulTrades', () => {
    let s = setup2();
    // P1 takes their move so they can offer
    s = applyAction(s, 'P1', { kind: 'MoveToken' }).state;
    const p1Before = clone(s.players[0]!);
    const p2Before = clone(s.players[1]!);
    // P1 offers P2 the first card in their hand for nothing back
    const giveCard = p1Before.hand[0];
    if (!giveCard) return; // shouldn't happen with starting hand size 3
    const offerRes = applyAction(s, 'P1', {
      kind: 'OfferTrade',
      to: 'P2',
      giveCardIds: [giveCard.id],
      givePoo: 0,
      requestCardIds: [],
      requestPoo: 0,
    });
    s = offerRes.state;
    expect(s.pendingTrades.length).toBe(1);
    const tradeId = s.pendingTrades[0]!.tradeId;
    // P2 accepts
    s = applyAction(s, 'P2', { kind: 'RespondTrade', tradeId, accept: true }).state;
    expect(s.pendingTrades.length).toBe(0);
    // The card moved from P1's hand to P2's
    expect(s.players[0]!.hand.find((c) => c.id === giveCard.id)).toBeUndefined();
    expect(s.players[1]!.hand.find((c) => c.id === giveCard.id)).toBeDefined();
    // Hand-size totals conserved (P1 -1, P2 +1)
    expect(s.players[0]!.hand.length).toBe(p1Before.hand.length - 1);
    expect(s.players[1]!.hand.length).toBe(p2Before.hand.length + 1);
    // Trade counter incremented for the OFFERER (used by 'generous' homework)
    expect(s.metadata.successfulTradesByPlayer['P1']).toBe(1);
    expectInvariants(s, 'after accepted trade');
  });

  it('rejected trade leaves state unchanged apart from clearing the pending offer', () => {
    let s = setup2();
    s = applyAction(s, 'P1', { kind: 'MoveToken' }).state;
    const handP1Before = s.players[0]!.hand.length;
    const handP2Before = s.players[1]!.hand.length;
    const giveCard = s.players[0]!.hand[0]!;
    s = applyAction(s, 'P1', {
      kind: 'OfferTrade',
      to: 'P2',
      giveCardIds: [giveCard.id],
      givePoo: 0,
      requestCardIds: [],
      requestPoo: 0,
    }).state;
    const tradeId = s.pendingTrades[0]!.tradeId;
    s = applyAction(s, 'P2', { kind: 'RespondTrade', tradeId, accept: false }).state;
    expect(s.pendingTrades.length).toBe(0);
    expect(s.players[0]!.hand.length).toBe(handP1Before);
    expect(s.players[1]!.hand.length).toBe(handP2Before);
    expect(s.metadata.successfulTradesByPlayer['P1']).toBe(0);
    expectInvariants(s, 'after rejected trade');
  });

  it('rejects self-trade, negative-poo, and cards-not-in-hand offers', () => {
    let s = setup2();
    s = applyAction(s, 'P1', { kind: 'MoveToken' }).state;
    // Self
    let r = applyAction(s, 'P1', {
      kind: 'OfferTrade', to: 'P1',
      giveCardIds: [], givePoo: 0, requestCardIds: [], requestPoo: 0,
    });
    expect(r.events.find((e) => e.kind === 'TradeOffered')).toBeUndefined();
    expect(r.events.find((e) => e.kind === 'ProtocolError')).toBeDefined();
    // Negative poo
    r = applyAction(s, 'P1', {
      kind: 'OfferTrade', to: 'P2',
      giveCardIds: [], givePoo: -1, requestCardIds: [], requestPoo: 0,
    });
    expect(r.events.find((e) => e.kind === 'TradeOffered')).toBeUndefined();
    // Card not in hand
    r = applyAction(s, 'P1', {
      kind: 'OfferTrade', to: 'P2',
      giveCardIds: ['bogus-card-id'], givePoo: 0, requestCardIds: [], requestPoo: 0,
    });
    expect(r.events.find((e) => e.kind === 'TradeOffered')).toBeUndefined();
    expectInvariants(s, 'after rejected trade attempts');
  });

  it('accepted trade where requester no longer has the cards/poo resolves as rejected', () => {
    let s = setup2();
    s = applyAction(s, 'P1', { kind: 'MoveToken' }).state;
    const giveCard = s.players[0]!.hand[0]!;
    s = applyAction(s, 'P1', {
      kind: 'OfferTrade', to: 'P2',
      giveCardIds: [giveCard.id], givePoo: 0,
      requestCardIds: [], requestPoo: 99, // P2 doesn't have 99 poo
    }).state;
    const tradeId = s.pendingTrades[0]!.tradeId;
    const r = applyAction(s, 'P2', { kind: 'RespondTrade', tradeId, accept: true });
    const resolved = r.events.find((e) => e.kind === 'TradeResolved');
    expect(resolved).toBeDefined();
    expect((resolved as Extract<ServerEvent, { kind: 'TradeResolved' }>).accepted).toBe(false);
    // No cards moved
    expect(r.state.players[1]!.hand.find((c) => c.id === giveCard.id)).toBeUndefined();
    expectInvariants(r.state, 'after stale trade');
  });
});

describe('multi-turn — every event card path', () => {
  function startedAndMoved(seed: number): GameStateInternal {
    let s = bootstrap(seed, 2);
    s = applyAction(s, 'P1', { kind: 'MoveToken' }).state;
    return s;
  }

  it('Wind: every player loses up to 1 poo, none go negative', () => {
    let s = startedAndMoved(13);
    s = placeNext(s, 'Wind');
    const before = s.players.map((p) => p.poo);
    const r = applyAction(s, 'P1', { kind: 'DrawCard' });
    expect(r.events.find((e) => e.kind === 'EventCardTriggered')).toBeDefined();
    for (let i = 0; i < r.state.players.length; i++) {
      const wasActive = i === 0;
      const expected = wasActive
        ? Math.max(0, before[i]! - balance.drawCostPoo - 1)
        : Math.max(0, before[i]! - 1);
      expect(r.state.players[i]!.poo).toBe(expected);
    }
    expectInvariants(r.state, 'after Wind');
  });

  it('RainyDay: every player gains exactly 1 poo', () => {
    let s = startedAndMoved(13);
    s = placeNext(s, 'RainyDay');
    const before = s.players.map((p) => p.poo);
    const r = applyAction(s, 'P1', { kind: 'DrawCard' });
    for (let i = 0; i < r.state.players.length; i++) {
      const wasActive = i === 0;
      const expected = wasActive
        ? before[i]! - balance.drawCostPoo + 1
        : before[i]! + 1;
      expect(r.state.players[i]!.poo).toBe(expected);
    }
    expectInvariants(r.state, 'after RainyDay');
  });

  it('MarketDay: each non-empty hand drops 1 + gains 1 from the deck top', () => {
    let s = startedAndMoved(13);
    s = placeNext(s, 'MarketDay');
    const handsBefore = s.players.map((p) => p.hand.length);
    const r = applyAction(s, 'P1', { kind: 'DrawCard' });
    // For every player with a non-empty hand and deck non-empty, hand size
    // is preserved (one in, one out). For empty hands, unchanged.
    for (let i = 0; i < r.state.players.length; i++) {
      if (handsBefore[i]! > 0) {
        expect(r.state.players[i]!.hand.length).toBe(handsBefore[i]!);
      }
    }
    expect(r.events.find((e) => e.kind === 'EventCardTriggered')).toBeDefined();
    expectInvariants(r.state, 'after MarketDay');
  });
});

describe('multi-turn — soft-lock check', () => {
  // Property: in every reachable in-game state the active player has at
  // least one legal action. If this ever fires, the engine has bricked
  // itself.
  it.each([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 50, 100, 500, 1000])(
    'seed %i: every active player has >= 1 legal action until GameEnded',
    (seed) => {
      let s = bootstrap(seed, 4);
      let safety = 3000;
      while (s.phase === 'playing' && safety-- > 0) {
        const active = s.players[s.activePlayerIndex]!;
        const legal = legalActionsFor(s, active.id);
        expect(legal.length, `seed ${seed}: soft-lock at tick ${3000 - safety} for ${active.id}`).toBeGreaterThan(0);
        s = applyAction(s, active.id, greedyDraw(s)).state;
      }
    },
  );
});
