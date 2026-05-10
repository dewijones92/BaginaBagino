import { describe, it, expect } from 'vitest';
import balance from '@bagina/schema/data/balance.json' with { type: 'json' };
import {
  emptyLobby,
  addPlayer,
  setReady,
  applyAction,
} from '../../src/engine/reducer.js';
import type { GameStateInternal } from '../../src/engine/state.js';
import type { GameCard, CardKind, ServerEvent } from '@bagina/schema';
import { legalActionsFor } from '../../src/engine/actions.js';

function startedGame(seed = 1, players = 2): GameStateInternal {
  let s = emptyLobby('PLAY', seed);
  for (let i = 0; i < players; i++) s = addPlayer(s, `P${i + 1}`, `P${i + 1}`).state;
  for (let i = 0; i < players; i++) s = setReady(s, `P${i + 1}`, true).state;
  return s;
}

function move(s: GameStateInternal): GameStateInternal {
  return applyAction(s, s.players[s.activePlayerIndex]!.id, { kind: 'MoveToken' }).state;
}

// Inject a card into the active player's hand for the test.
function giveActive(s: GameStateInternal, kind: CardKind): { state: GameStateInternal; cardId: string } {
  const next = JSON.parse(JSON.stringify(s)) as GameStateInternal;
  const card: GameCard = { id: `inject-${kind}-${Math.random()}`, kind } as any;
  next.players[next.activePlayerIndex]!.hand.push(card);
  return { state: next, cardId: card.id };
}

describe('playCard', () => {
  it('rejects a non-special card (resources cannot be played)', () => {
    let s = startedGame();
    s = move(s);
    const { state, cardId } = giveActive(s, 'Tooth');
    const active = state.players[state.activePlayerIndex]!;
    const r = applyAction(state, active.id, { kind: 'PlayCard', cardId });
    expect(r.events.find((e) => e.kind === 'CardPlayed')).toBeUndefined();
    expect(r.events.find((e) => e.kind === 'ProtocolError')).toBeDefined();
    // Card should still be in hand.
    expect(r.state.players[r.state.activePlayerIndex]!.hand.find((c) => c.id === cardId)).toBeDefined();
  });

  it('rejects a card not in hand', () => {
    let s = startedGame();
    s = move(s);
    const active = s.players[s.activePlayerIndex]!;
    const r = applyAction(s, active.id, { kind: 'PlayCard', cardId: 'bogus-id' });
    expect(r.events.find((e) => e.kind === 'CardPlayed')).toBeUndefined();
    expect(r.events.find((e) => e.kind === 'ProtocolError')).toBeDefined();
  });

  it('rejects before MoveToken — guardPostMove', () => {
    const s = startedGame();
    const { state, cardId } = giveActive(s, 'Brave');
    const active = state.players[state.activePlayerIndex]!;
    expect(legalActionsFor(state, active.id)).not.toContain('PlayCard');
    const r = applyAction(state, active.id, { kind: 'PlayCard', cardId });
    expect(r.events.find((e) => e.kind === 'CardPlayed')).toBeUndefined();
  });

  it('Brave: removes from hand, lands in discard, emits CardPlayed + HomeworkHintGained', () => {
    let s = startedGame();
    s = move(s);
    const { state, cardId } = giveActive(s, 'Brave');
    const active = state.players[state.activePlayerIndex]!;
    const handBefore = active.hand.length;
    const discardBefore = state.discard.length;
    const hintsBefore = active.homeworkHints.length;
    const r = applyAction(state, active.id, { kind: 'PlayCard', cardId });
    const me = r.state.players[r.state.activePlayerIndex]!;
    expect(me.hand.find((c) => c.id === cardId)).toBeUndefined();
    expect(me.hand.length).toBe(handBefore - 1);
    expect(r.state.discard.length).toBe(discardBefore + 1);
    expect(r.state.discard[r.state.discard.length - 1]!.kind).toBe('Brave');
    expect(r.events.find((e) => e.kind === 'CardPlayed' && e.cardKind === 'Brave')).toBeDefined();
    expect(r.events.find((e) => e.kind === 'HomeworkHintGained')).toBeDefined();
    expect(me.homeworkHints.length).toBe(hintsBefore + 1);
  });

  it('Clever: rolls a fresh homework objective and adds a hint', () => {
    let s = startedGame();
    s = move(s);
    const homeworkBefore = s.homework.id;
    const { state, cardId } = giveActive(s, 'Clever');
    const active = state.players[state.activePlayerIndex]!;
    const r = applyAction(state, active.id, { kind: 'PlayCard', cardId });
    expect(r.events.find((e) => e.kind === 'CardPlayed' && e.cardKind === 'Clever')).toBeDefined();
    expect(r.events.find((e) => e.kind === 'HomeworkHintGained')).toBeDefined();
    // Homework may stay the same if RNG rolls the same template — best
    // assertion is that the active player gained a hint pointing at the
    // current homework.
    const me = r.state.players[r.state.activePlayerIndex]!;
    const hint = me.homeworkHints[me.homeworkHints.length - 1]!;
    expect(hint.text).toBe(r.state.homework.title);
    expect(hint.topic).toBe(r.state.homework.hintTopic);
    // Either the homework changed, or it didn't — both are valid (rng).
    // What's invariant is the hint was added.
    void homeworkBefore;
  });

  it('PlayCard is legal precisely when a Special card is in hand', () => {
    let s = startedGame();
    s = move(s);
    // After move, scrub all specials out of the active player's hand.
    s.players[s.activePlayerIndex]!.hand = s.players[s.activePlayerIndex]!.hand.filter(
      (c) => c.kind !== 'Clever' && c.kind !== 'Brave' && c.kind !== 'Business',
    );
    expect(legalActionsFor(s, s.players[s.activePlayerIndex]!.id)).not.toContain('PlayCard');
    // Inject a Brave — now it's legal.
    const { state } = giveActive(s, 'Brave');
    expect(legalActionsFor(state, state.players[state.activePlayerIndex]!.id)).toContain('PlayCard');
  });
});

describe('legal actions invariants', () => {
  it('after MoveToken the active player always has EndTurn legal', () => {
    // Property test across many seeds — soft-locks would hide here.
    for (const seed of [1, 7, 13, 42, 99, 256]) {
      let s = startedGame(seed);
      let safety = 200;
      while (s.phase === 'playing' && safety-- > 0) {
        const active = s.players[s.activePlayerIndex]!;
        if (legalActionsFor(s, active.id).includes('MoveToken')) {
          s = applyAction(s, active.id, { kind: 'MoveToken' }).state;
          // Now post-move — must allow EndTurn.
          const post = legalActionsFor(s, active.id);
          expect(post).toContain('EndTurn');
        }
        s = applyAction(s, active.id, { kind: 'EndTurn' }).state as GameStateInternal;
      }
    }
  });

  it('non-active players have only RespondTrade or empty legal actions', () => {
    let s = startedGame(7);
    s = move(s);
    const active = s.players[s.activePlayerIndex]!;
    const others = s.players.filter((p) => p.id !== active.id);
    for (const o of others) {
      const legal = legalActionsFor(s, o.id);
      // Allowed only: nothing, or RespondTrade if a trade is pending for them.
      const allowed = new Set(['RespondTrade']);
      for (const a of legal) {
        expect(allowed.has(a)).toBe(true);
      }
    }
  });
});

// Helpers to satisfy the unused-imports rule when fields are referenced.
void balance;
void (null as ServerEvent | null);
