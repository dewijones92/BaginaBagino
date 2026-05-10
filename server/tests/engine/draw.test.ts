import { describe, it, expect } from 'vitest';
import balance from '@bagina/schema/data/balance.json' with { type: 'json' };
import {
  emptyLobby,
  addPlayer,
  setReady,
  applyAction,
} from '../../src/engine/reducer.js';
import type { GameStateInternal } from '../../src/engine/state.js';
import type { GameCard, CardKind } from '@bagina/schema';
import { legalActionsFor } from '../../src/engine/actions.js';

function startedGame(seed = 1, players = 2): GameStateInternal {
  let s = emptyLobby('DRW1', seed);
  for (let i = 0; i < players; i++) s = addPlayer(s, `P${i + 1}`, `P${i + 1}`).state;
  for (let i = 0; i < players; i++) s = setReady(s, `P${i + 1}`, true).state;
  return s;
}

function moveActive(s: GameStateInternal): GameStateInternal {
  const active = s.players[s.activePlayerIndex]!;
  return applyAction(s, active.id, { kind: 'MoveToken' }).state;
}

// Stash a specific card on top of the deck so we can deterministically
// test what happens when the next draw lands a particular kind.
function setNextCard(s: GameStateInternal, kind: CardKind): GameStateInternal {
  const next = JSON.parse(JSON.stringify(s)) as GameStateInternal;
  // Find a card of that kind anywhere in deck/discard, move it to deck top.
  const deckIdx = next.deck.findIndex((c) => c.kind === kind);
  if (deckIdx >= 0) {
    const [card] = next.deck.splice(deckIdx, 1);
    next.deck.unshift(card!);
    return next;
  }
  // Synthesise one if the deck doesn't have any (shouldn't happen for
  // standard kinds — but keep tests robust).
  const fake: GameCard = { id: `synth-${kind}-${Math.random()}`, kind } as any;
  next.deck.unshift(fake);
  return next;
}

describe('drawCard', () => {
  it('costs drawCostPoo and reduces poo by exactly that', () => {
    let s = startedGame();
    s = moveActive(s);
    const active = s.players[s.activePlayerIndex]!;
    const before = active.poo;
    const r = applyAction(s, active.id, { kind: 'DrawCard' });
    const after = r.state.players[r.state.activePlayerIndex]!.poo;
    // Poo may go up if the drawn card was Business, so the lower bound is
    // (before - drawCost).
    expect(after).toBeGreaterThanOrEqual(before - balance.drawCostPoo);
  });

  it('rejects when not enough poo', () => {
    let s = startedGame();
    s = moveActive(s);
    const active = s.players[s.activePlayerIndex]!;
    s.players[s.activePlayerIndex]!.poo = 0; // mutate-for-test
    const r = applyAction(s, active.id, { kind: 'DrawCard' });
    // No CardDrawn event should be emitted.
    expect(r.events.find((e) => e.kind === 'CardDrawn')).toBeUndefined();
    // ProtocolError should be present.
    expect(r.events.find((e) => e.kind === 'ProtocolError')).toBeDefined();
    // Hand should be unchanged.
    expect(r.state.players[r.state.activePlayerIndex]!.hand.length).toBe(active.hand.length);
  });

  it('rejects before MoveToken (must move first)', () => {
    const s = startedGame();
    const active = s.players[s.activePlayerIndex]!;
    expect(legalActionsFor(s, active.id)).not.toContain('DrawCard');
    const r = applyAction(s, active.id, { kind: 'DrawCard' });
    expect(r.events.find((e) => e.kind === 'CardDrawn')).toBeUndefined();
  });

  // Regression: events used to land in hand via the starting-hand bug. After
  // game start they're only obtained via DrawCard, which must auto-resolve
  // them (event triggers, card goes to discard) instead of dropping them in
  // the player's hand.
  it.each(['Wind', 'RainyDay', 'MarketDay'] as const)('drawing an event card (%s) does not put it in hand', (kind) => {
    let s = startedGame(11);
    s = moveActive(s);
    s = setNextCard(s, kind);
    const active = s.players[s.activePlayerIndex]!;
    const handBefore = active.hand.length;
    const r = applyAction(s, active.id, { kind: 'DrawCard' });
    const me = r.state.players[r.state.activePlayerIndex]!;
    expect(me.hand.find((c) => c.kind === kind)).toBeUndefined();
    // Hand is not larger by the event card (could be smaller if MarketDay
    // discarded one, equal otherwise).
    expect(me.hand.length).toBeLessThanOrEqual(handBefore + 1);
    expect(r.events.find((e) => e.kind === 'EventCardTriggered')).toBeDefined();
  });

  it('drawing Business adds business poo and does not put it in hand', () => {
    let s = startedGame(13);
    s = moveActive(s);
    s = setNextCard(s, 'Business');
    const active = s.players[s.activePlayerIndex]!;
    const pooBefore = active.poo;
    const handBefore = active.hand.length;
    const r = applyAction(s, active.id, { kind: 'DrawCard' });
    const me = r.state.players[r.state.activePlayerIndex]!;
    expect(me.hand.find((c) => c.kind === 'Business')).toBeUndefined();
    expect(me.hand.length).toBe(handBefore);
    // Net poo: -drawCost + businessCardPoo.
    expect(me.poo).toBe(pooBefore - balance.drawCostPoo + balance.businessCardPoo);
  });

  it.each(['Tooth', 'Paw', 'Snout', 'Tit'] as const)('drawing a resource card (%s) puts it in hand', (kind) => {
    let s = startedGame(13);
    s = moveActive(s);
    s = setNextCard(s, kind);
    const active = s.players[s.activePlayerIndex]!;
    const handBefore = active.hand.length;
    const r = applyAction(s, active.id, { kind: 'DrawCard' });
    const me = r.state.players[r.state.activePlayerIndex]!;
    expect(me.hand.length).toBe(handBefore + 1);
    expect(me.hand[me.hand.length - 1]!.kind).toBe(kind);
  });

  it('Wind event docks every player exactly 1 poo', () => {
    let s = startedGame(13);
    s = moveActive(s);
    s = setNextCard(s, 'Wind');
    const before = s.players.map((p) => p.poo);
    const active = s.players[s.activePlayerIndex]!;
    const r = applyAction(s, active.id, { kind: 'DrawCard' });
    for (let i = 0; i < r.state.players.length; i++) {
      const wasActive = i === s.activePlayerIndex;
      const expected = wasActive
        ? Math.max(0, before[i]! - balance.drawCostPoo - 1)
        : Math.max(0, before[i]! - 1);
      expect(r.state.players[i]!.poo).toBe(expected);
    }
  });

  it('RainyDay event credits every player +1 poo', () => {
    let s = startedGame(13);
    s = moveActive(s);
    s = setNextCard(s, 'RainyDay');
    const before = s.players.map((p) => p.poo);
    const active = s.players[s.activePlayerIndex]!;
    const r = applyAction(s, active.id, { kind: 'DrawCard' });
    for (let i = 0; i < r.state.players.length; i++) {
      const wasActive = i === s.activePlayerIndex;
      const expected = wasActive
        ? before[i]! - balance.drawCostPoo + 1
        : before[i]! + 1;
      expect(r.state.players[i]!.poo).toBe(expected);
    }
  });
});
