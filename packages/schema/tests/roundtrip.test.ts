import { describe, it, expect } from 'vitest';
import {
  GameAction,
  ServerEvent,
  PublicGameState,
  PrivatePlayerView,
  RECIPES,
} from '../src/index.js';

describe('schema roundtrips', () => {
  it('GameAction: DrawCard parses and serialises', () => {
    const a = { kind: 'DrawCard' as const };
    const parsed = GameAction.parse(a);
    expect(parsed).toEqual(a);
    expect(GameAction.parse(JSON.parse(JSON.stringify(parsed)))).toEqual(a);
  });

  it('GameAction: OfferTrade rejects negative poo', () => {
    const bad = {
      kind: 'OfferTrade' as const,
      to: 'P1',
      giveCardIds: [],
      givePoo: -1,
      requestCardIds: [],
      requestPoo: 0,
    };
    expect(() => GameAction.parse(bad)).toThrow();
  });

  it('ServerEvent: StateSnapshot round trips', () => {
    const ev = {
      kind: 'StateSnapshot' as const,
      eventId: 5,
      state: {
        code: 'AB23',
        phase: 'playing',
        players: [
          {
            id: 'P1',
            nickname: 'Foo',
            color: 'pink',
            slot: 12,
            poo: 6,
            handCount: 3,
            completed: [],
            ready: true,
            online: true,
          },
        ],
        activePlayerId: 'P1',
        turnsRemaining: 39,
        deckRemaining: 60,
        lastEventId: 5,
      },
      privateView: { hand: [], homeworkHints: [], homeworkRevealed: null },
      legalActions: ['MoveToken', 'DrawCard'],
    };
    const parsed = ServerEvent.parse(ev);
    expect(parsed.kind).toBe('StateSnapshot');
    expect(JSON.parse(JSON.stringify(parsed))).toEqual(ev);
  });

  it('Room code regex enforces 4 chars in safe alphabet', () => {
    expect(() => PublicGameState.parse({ code: 'AB1', phase: 'lobby', players: [], activePlayerId: null, turnsRemaining: 0, deckRemaining: 0, lastEventId: 0 })).toThrow();
    expect(() => PublicGameState.parse({ code: 'ABCO', phase: 'lobby', players: [], activePlayerId: null, turnsRemaining: 0, deckRemaining: 0, lastEventId: 0 })).toThrow(); // O not allowed
    PublicGameState.parse({ code: 'AB23', phase: 'lobby', players: [], activePlayerId: null, turnsRemaining: 0, deckRemaining: 0, lastEventId: 0 });
  });

  it('private view tolerates an empty hand', () => {
    PrivatePlayerView.parse({ hand: [], homeworkHints: [], homeworkRevealed: null });
  });

  it('recipe arithmetic matches docs', () => {
    expect(RECIPES.bagino).toEqual({ teeth: 15, paws: 6, snouts: 1, tits: 0 });
    expect(RECIPES.bagina).toEqual({ teeth: 10, paws: 9, snouts: 0, tits: 6 });
  });
});
