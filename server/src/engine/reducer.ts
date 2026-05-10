import balance from '@bagina/schema/data/balance.json' with { type: 'json' };
import type {
  GameCard,
  CardKind,
  CompletionKind,
  GameAction,
  PlayerColor,
  PlayerId,
  RoomCode,
  ServerEvent,
  TradeOffer,
} from '@bagina/schema';
import { isPooSlot, dayOf, TOTAL_SLOTS } from './board.js';
import { buildDeck } from './deck.js';
import { TEMPLATES, rollHomework } from './homework.js';
import { makeRng, type Rng } from './rng.js';
import { computeScores, pickWinners } from './scoring.js';
import {
  type GameStateInternal,
  type Reduction,
  type PlayerInternal,
  projectPrivate,
  projectPublic,
} from './state.js';

const PLAYER_COLORS: PlayerColor[] = ['pink', 'mint', 'lavender', 'butter'];
const STARTING_HAND_SIZE = balance.startingHandSize;
const STARTING_POO = balance.startingPoo;
const POO_PER_SLOT = balance.pooPerSlot;
const DRAW_COST = balance.drawCostPoo;
const BUSINESS_POO = balance.businessCardPoo;
const MOVES_PER_PLAYER = balance.movesPerPlayer;

// ---------------------------------------------------------------------------
// Setup

export function emptyLobby(code: RoomCode, seed: number): GameStateInternal {
  return {
    code,
    phase: 'lobby',
    players: [],
    activePlayerIndex: 0,
    deck: [],
    discard: [],
    homework: TEMPLATES[0]!,
    pendingTrades: [],
    lastEventId: 0,
    rngSeed: seed,
    metadata: {
      successfulTradesByPlayer: {},
      drewOnMondayByPlayer: {},
      actionsApplied: 0,
      awaitingPostMoveAction: false,
    },
  };
}

export function addPlayer(
  state: GameStateInternal,
  playerId: PlayerId,
  nickname: string,
): Reduction {
  if (state.phase !== 'lobby') {
    return { state, events: [emitError(state, 'cannot join: game in progress')] };
  }
  if (state.players.length >= 4) {
    return { state, events: [emitError(state, 'room full')] };
  }
  if (state.players.some((p) => p.nickname === nickname)) {
    return { state, events: [emitError(state, 'nickname taken')] };
  }
  const color = PLAYER_COLORS[state.players.length]!;
  const player: PlayerInternal = {
    id: playerId,
    nickname,
    color,
    slot: 0,
    poo: STARTING_POO,
    hand: [],
    completed: [],
    ready: false,
    online: true,
    movesRemaining: MOVES_PER_PLAYER,
    homeworkHints: [],
  };
  const next = clone(state);
  next.players.push(player);
  next.metadata.successfulTradesByPlayer[playerId] = 0;
  next.metadata.drewOnMondayByPlayer[playerId] = false;

  const evPlayerJoined = emit(next, {
    kind: 'PlayerJoined',
    eventId: 0,
    player: {
      id: player.id,
      nickname: player.nickname,
      color: player.color,
      slot: player.slot,
      poo: player.poo,
      handCount: 0,
      completed: [],
      ready: player.ready,
      online: player.online,
    },
  });
  return { state: next, events: [evPlayerJoined] };
}

export function removePlayer(state: GameStateInternal, playerId: PlayerId): Reduction {
  const next = clone(state);
  const before = next.players.length;
  next.players = next.players.filter((p) => p.id !== playerId);
  if (next.players.length === before) return { state, events: [] };
  const ev = emit(next, { kind: 'PlayerLeft', eventId: 0, playerId });
  if (next.phase === 'playing' && next.players.length === 0) {
    next.phase = 'finished';
  }
  return { state: next, events: [ev] };
}

export function setReady(
  state: GameStateInternal,
  playerId: PlayerId,
  ready: boolean,
): Reduction {
  if (state.phase !== 'lobby') return { state, events: [] };
  const next = clone(state);
  const me = next.players.find((p) => p.id === playerId);
  if (!me) return { state, events: [emitError(state, 'unknown player')] };
  me.ready = ready;
  const events: ServerEvent[] = [
    emit(next, { kind: 'PlayerReadyChanged', eventId: 0, playerId, ready }),
  ];

  if (next.players.length >= 2 && next.players.every((p) => p.ready)) {
    const started = startGame(next);
    return { state: started.state, events: [...events, ...started.events] };
  }
  return { state: next, events };
}

function startGame(state: GameStateInternal): Reduction {
  const next = clone(state);
  next.phase = 'playing';
  const rng = makeRng(next.rngSeed);
  next.deck = buildDeck(rng);
  next.homework = rollHomework(rng);

  // Deal starting hands — only resource/keepable cards. Events fire on draw
  // and Business auto-resolves on draw, so neither belongs in a starting hand
  // (otherwise they get stuck there forever, no way to leave). Push any
  // non-keepable cards we hit to the bottom of the deck so they're still
  // playable later in the game.
  for (const p of next.players) {
    let dealt = 0;
    let attempts = 0;
    while (dealt < STARTING_HAND_SIZE && attempts < next.deck.length * 2) {
      attempts += 1;
      const card = next.deck.shift();
      if (!card) break;
      if (
        card.kind === 'Tooth' ||
        card.kind === 'Paw' ||
        card.kind === 'Snout' ||
        card.kind === 'Tit' ||
        card.kind === 'Clever' ||
        card.kind === 'Brave'
      ) {
        p.hand.push(card);
        dealt += 1;
      } else {
        next.deck.push(card);
      }
    }
  }

  next.activePlayerIndex = 0;
  next.metadata.awaitingPostMoveAction = false;

  const events: ServerEvent[] = [
    emit(next, { kind: 'GameStarted', eventId: 0, state: projectPublic(next) }),
    emit(next, {
      kind: 'TurnAdvanced',
      eventId: 0,
      activePlayerId: next.players[0]!.id,
      turnsRemaining: totalMovesRemaining(next),
    }),
  ];
  return { state: next, events };
}

// ---------------------------------------------------------------------------
// Action dispatch

export function applyAction(
  state: GameStateInternal,
  playerId: PlayerId,
  action: GameAction,
): Reduction {
  switch (action.kind) {
    case 'CreateRoom':
    case 'JoinRoom':
    case 'LeaveRoom':
    case 'Resync':
      // These are handled at the transport layer; reducer ignores.
      return { state, events: [] };
    case 'SetReady':
      return setReady(state, playerId, action.ready);
    case 'MoveToken':
      return moveToken(state, playerId);
    case 'DrawCard':
      return drawCard(state, playerId);
    case 'PlayCard':
      return playCard(state, playerId, action.cardId);
    case 'OfferTrade':
      return offerTrade(state, playerId, action);
    case 'RespondTrade':
      return respondTrade(state, playerId, action.tradeId, action.accept);
    case 'DeclareCompletion':
      return declareCompletion(state, playerId, action.what, action.cardIds);
    case 'EndTurn':
      return endTurn(state, playerId);
  }
}

// ---------------------------------------------------------------------------
// Move

function moveToken(state: GameStateInternal, playerId: PlayerId): Reduction {
  const guard = guardActiveTurn(state, playerId);
  if (guard) return guard;
  if (state.metadata.awaitingPostMoveAction) {
    return { state, events: [emitError(state, 'already moved this turn')] };
  }
  const next = clone(state);
  const me = next.players[next.activePlayerIndex]!;
  if (me.movesRemaining <= 0) {
    return { state, events: [emitError(state, 'no moves remaining')] };
  }

  const fromSlot = me.slot;
  const toSlot = Math.min(fromSlot + 1, TOTAL_SLOTS - 1);
  me.slot = toSlot;
  me.movesRemaining -= 1;
  next.metadata.awaitingPostMoveAction = true;
  next.metadata.actionsApplied += 1;

  const events: ServerEvent[] = [
    emit(next, { kind: 'TokenMoved', eventId: 0, playerId: me.id, fromSlot, toSlot }),
  ];
  if (isPooSlot(toSlot)) {
    me.poo += POO_PER_SLOT;
    events.push(
      emit(next, { kind: 'PooAwarded', eventId: 0, playerId: me.id, amount: POO_PER_SLOT, reason: 'slot' }),
    );
  }
  return { state: next, events };
}

// ---------------------------------------------------------------------------
// Draw

function drawCard(state: GameStateInternal, playerId: PlayerId): Reduction {
  const guard = guardPostMove(state, playerId);
  if (guard) return guard;
  const next = clone(state);
  const me = next.players[next.activePlayerIndex]!;
  if (me.poo < DRAW_COST) {
    return { state, events: [emitError(state, 'not enough poo to draw')] };
  }
  if (next.deck.length === 0) {
    return { state, events: [emitError(state, 'deck empty')] };
  }
  me.poo -= DRAW_COST;
  const card = next.deck.shift()!;

  const events: ServerEvent[] = [];
  // Resource cards go straight to hand. Specials/events resolve here.
  if (card.kind === 'Business') {
    me.poo += BUSINESS_POO;
    events.push(
      emit(next, { kind: 'CardDrawn', eventId: 0, playerId: me.id, card }),
      emit(next, { kind: 'PooAwarded', eventId: 0, playerId: me.id, amount: BUSINESS_POO, reason: 'business' }),
    );
    next.discard.push(card);
  } else if (card.kind === 'RainyDay' || card.kind === 'MarketDay' || card.kind === 'Wind') {
    events.push(emit(next, { kind: 'CardDrawn', eventId: 0, playerId: me.id, card }));
    events.push(emit(next, { kind: 'EventCardTriggered', eventId: 0, card: card.kind }));
    applyEventCard(next, card.kind, events);
    next.discard.push(card);
  } else {
    me.hand.push(card);
    events.push(emit(next, { kind: 'CardDrawn', eventId: 0, playerId: me.id, card }));
  }

  if (dayOf(me.slot) === 'Mon') {
    next.metadata.drewOnMondayByPlayer[me.id] = true;
  }
  next.metadata.actionsApplied += 1;
  return { state: next, events };
}

function applyEventCard(
  state: GameStateInternal,
  kind: CardKind,
  events: ServerEvent[],
): void {
  if (kind === 'RainyDay') {
    for (const p of state.players) {
      p.poo += 1;
      events.push(
        emit(state, { kind: 'PooAwarded', eventId: 0, playerId: p.id, amount: 1, reason: 'event' }),
      );
    }
  } else if (kind === 'MarketDay') {
    // Best-effort: each player who has a card and the deck is non-empty
    // gets to discard 1 and replace with the top card. To keep the engine
    // deterministic we apply it greedily without player input — first-card
    // out, top-card in. Players can't 'choose' to skip this MVP.
    for (const p of state.players) {
      if (p.hand.length === 0 || state.deck.length === 0) continue;
      const dropped = p.hand.shift()!;
      const replacement = state.deck.shift()!;
      state.discard.push(dropped);
      p.hand.push(replacement);
      events.push(
        emit(state, { kind: 'CardDrawn', eventId: 0, playerId: p.id, card: replacement }),
      );
    }
  } else if (kind === 'Wind') {
    for (const p of state.players) {
      const lost = Math.min(1, p.poo);
      if (lost > 0) {
        p.poo -= lost;
        events.push(
          emit(state, { kind: 'PooAwarded', eventId: 0, playerId: p.id, amount: -lost, reason: 'event' }),
        );
      }
    }
  }
}

// ---------------------------------------------------------------------------
// Play special

function playCard(state: GameStateInternal, playerId: PlayerId, cardId: string): Reduction {
  const guard = guardPostMove(state, playerId);
  if (guard) return guard;
  const next = clone(state);
  const me = next.players[next.activePlayerIndex]!;
  const idx = me.hand.findIndex((c) => c.id === cardId);
  if (idx < 0) return { state, events: [emitError(state, 'card not in hand')] };
  const card = me.hand[idx]!;
  if (card.kind !== 'Clever' && card.kind !== 'Brave' && card.kind !== 'Business') {
    return { state, events: [emitError(state, 'not a special card')] };
  }
  me.hand.splice(idx, 1);
  next.discard.push(card);

  const events: ServerEvent[] = [
    emit(next, { kind: 'CardPlayed', eventId: 0, playerId: me.id, cardKind: card.kind }),
  ];

  if (card.kind === 'Business') {
    me.poo += BUSINESS_POO;
    events.push(
      emit(next, { kind: 'PooAwarded', eventId: 0, playerId: me.id, amount: BUSINESS_POO, reason: 'business' }),
    );
  } else if (card.kind === 'Clever') {
    // Re-roll + reveal hint of the new objective to this player.
    const rng = makeRng(next.rngSeed + next.metadata.actionsApplied + 1);
    next.homework = rollHomework(rng);
    me.homeworkHints.push({ topic: next.homework.hintTopic, text: next.homework.title });
    events.push(
      emit(next, { kind: 'HomeworkHintGained', eventId: 0, hint: { topic: next.homework.hintTopic, text: next.homework.title } }),
    );
  } else if (card.kind === 'Brave') {
    me.homeworkHints.push({ topic: next.homework.hintTopic, text: next.homework.title });
    events.push(
      emit(next, { kind: 'HomeworkHintGained', eventId: 0, hint: { topic: next.homework.hintTopic, text: next.homework.title } }),
    );
  }
  next.metadata.actionsApplied += 1;
  return { state: next, events };
}

// ---------------------------------------------------------------------------
// Trade

function offerTrade(
  state: GameStateInternal,
  playerId: PlayerId,
  action: { to: PlayerId; giveCardIds: string[]; givePoo: number; requestCardIds: string[]; requestPoo: number },
): Reduction {
  const guard = guardPostMove(state, playerId);
  if (guard) return guard;
  const me = state.players[state.activePlayerIndex]!;
  if (me.id !== playerId) return { state, events: [emitError(state, 'not your turn')] };
  if (action.to === playerId) return { state, events: [emitError(state, "can't trade with yourself")] };
  const recipient = state.players.find((p) => p.id === action.to);
  if (!recipient) return { state, events: [emitError(state, 'unknown recipient')] };
  // Validate offerer has the goods.
  if (action.givePoo < 0 || action.requestPoo < 0) {
    return { state, events: [emitError(state, 'negative amounts')] };
  }
  if (me.poo < action.givePoo) {
    return { state, events: [emitError(state, 'not enough poo to offer')] };
  }
  if (!action.giveCardIds.every((id) => me.hand.some((c) => c.id === id))) {
    return { state, events: [emitError(state, 'card not in your hand')] };
  }

  const next = clone(state);
  const offer: TradeOffer = {
    tradeId: `t${next.metadata.actionsApplied}`,
    from: playerId,
    to: action.to,
    giveCardIds: action.giveCardIds,
    givePoo: action.givePoo,
    requestCardIds: action.requestCardIds,
    requestPoo: action.requestPoo,
  };
  next.pendingTrades.push(offer);
  next.metadata.actionsApplied += 1;
  return { state: next, events: [emit(next, { kind: 'TradeOffered', eventId: 0, offer })] };
}

function respondTrade(
  state: GameStateInternal,
  playerId: PlayerId,
  tradeId: string,
  accept: boolean,
): Reduction {
  const next = clone(state);
  const idx = next.pendingTrades.findIndex((t) => t.tradeId === tradeId);
  if (idx < 0) return { state, events: [emitError(state, 'no such trade')] };
  const offer = next.pendingTrades[idx]!;
  if (offer.to !== playerId) return { state, events: [emitError(state, 'not your trade')] };
  next.pendingTrades.splice(idx, 1);

  const events: ServerEvent[] = [];
  if (accept) {
    const from = next.players.find((p) => p.id === offer.from);
    const to = next.players.find((p) => p.id === offer.to);
    if (!from || !to) {
      return { state, events: [emitError(state, 'players gone')] };
    }
    // Validate both sides still have the goods.
    if (from.poo < offer.givePoo || to.poo < offer.requestPoo) {
      events.push(emit(next, { kind: 'TradeResolved', eventId: 0, tradeId, accepted: false }));
      return { state: next, events };
    }
    if (
      !offer.giveCardIds.every((id) => from.hand.some((c) => c.id === id)) ||
      !offer.requestCardIds.every((id) => to.hand.some((c) => c.id === id))
    ) {
      events.push(emit(next, { kind: 'TradeResolved', eventId: 0, tradeId, accepted: false }));
      return { state: next, events };
    }
    // Move cards/poo.
    moveCardsBetween(from, to, offer.giveCardIds);
    moveCardsBetween(to, from, offer.requestCardIds);
    from.poo -= offer.givePoo;
    to.poo += offer.givePoo;
    to.poo -= offer.requestPoo;
    from.poo += offer.requestPoo;
    next.metadata.successfulTradesByPlayer[from.id] =
      (next.metadata.successfulTradesByPlayer[from.id] ?? 0) + 1;
  }
  events.push(emit(next, { kind: 'TradeResolved', eventId: 0, tradeId, accepted: accept }));
  next.metadata.actionsApplied += 1;
  return { state: next, events };
}

function moveCardsBetween(
  from: PlayerInternal,
  to: PlayerInternal,
  cardIds: string[],
): void {
  for (const id of cardIds) {
    const idx = from.hand.findIndex((c) => c.id === id);
    if (idx < 0) continue;
    const [card] = from.hand.splice(idx, 1);
    if (card) to.hand.push(card);
  }
}

// ---------------------------------------------------------------------------
// Declare completion

function declareCompletion(
  state: GameStateInternal,
  playerId: PlayerId,
  what: CompletionKind,
  cardIds: string[],
): Reduction {
  const guard = guardPostMove(state, playerId);
  if (guard) return guard;
  const next = clone(state);
  const me = next.players[next.activePlayerIndex]!;

  // Validate: each id is in hand, and the multiset matches the recipe.
  const cards = cardIds
    .map((id) => me.hand.find((c) => c.id === id))
    .filter((c): c is GameCard => !!c);
  if (cards.length !== cardIds.length) {
    return { state, events: [emitError(state, 'card not in hand')] };
  }
  const counts: Record<string, number> = {};
  for (const c of cards) counts[c.kind] = (counts[c.kind] ?? 0) + 1;

  // Recipes live in @bagina/schema/data/balance.json so the Flutter client
  // can read the same numbers via codegen. Don't hand-edit them here.
  const requirements = balance.recipes[what] as Record<string, number>;
  for (const [k, n] of Object.entries(requirements)) {
    if ((counts[k] ?? 0) < n) {
      return { state, events: [emitError(state, `not enough ${k} for ${what}`)] };
    }
  }

  // Discard the consumed cards.
  for (const id of cardIds) {
    const idx = me.hand.findIndex((c) => c.id === id);
    if (idx >= 0) {
      const [card] = me.hand.splice(idx, 1);
      if (card) next.discard.push(card);
    }
  }
  me.completed.push(what);
  next.metadata.actionsApplied += 1;

  return {
    state: next,
    events: [emit(next, { kind: 'CompletionDeclared', eventId: 0, playerId: me.id, what })],
  };
}

// ---------------------------------------------------------------------------
// End turn

function endTurn(state: GameStateInternal, playerId: PlayerId): Reduction {
  const guard = guardActiveTurn(state, playerId);
  if (guard) return guard;
  if (!state.metadata.awaitingPostMoveAction) {
    return { state, events: [emitError(state, 'must move before ending turn')] };
  }
  const next = clone(state);
  next.metadata.awaitingPostMoveAction = false;
  next.metadata.actionsApplied += 1;

  const events: ServerEvent[] = [];

  // Has anyone got moves left?
  const anyMovesLeft = next.players.some((p) => p.movesRemaining > 0);
  if (!anyMovesLeft) {
    return finishGame(next, events);
  }

  // Advance active player to the next one with moves remaining.
  let count = 0;
  do {
    next.activePlayerIndex = (next.activePlayerIndex + 1) % next.players.length;
    count++;
  } while (next.players[next.activePlayerIndex]!.movesRemaining <= 0 && count <= next.players.length);

  events.push(
    emit(next, {
      kind: 'TurnAdvanced',
      eventId: 0,
      activePlayerId: next.players[next.activePlayerIndex]!.id,
      turnsRemaining: totalMovesRemaining(next),
    }),
  );
  return { state: next, events };
}

function finishGame(state: GameStateInternal, events: ServerEvent[]): Reduction {
  state.phase = 'finished';
  events.push(
    emit(state, {
      kind: 'HomeworkRevealed',
      eventId: 0,
      templateId: state.homework.id,
      description: state.homework.description,
    }),
  );
  const scores = computeScores(state);
  events.push(
    emit(state, {
      kind: 'GameEnded',
      eventId: 0,
      scores,
      winnerIds: pickWinners(scores),
    }),
  );
  return { state, events };
}

// ---------------------------------------------------------------------------
// Helpers

function clone<T>(x: T): T {
  return JSON.parse(JSON.stringify(x));
}

function totalMovesRemaining(s: GameStateInternal): number {
  return s.players.reduce((acc, p) => acc + p.movesRemaining, 0);
}

function guardActiveTurn(state: GameStateInternal, playerId: PlayerId): Reduction | undefined {
  if (state.phase !== 'playing') {
    return { state, events: [emitError(state, 'not playing')] };
  }
  const active = state.players[state.activePlayerIndex];
  if (!active || active.id !== playerId) {
    return { state, events: [emitError(state, 'not your turn')] };
  }
  return undefined;
}

function guardPostMove(state: GameStateInternal, playerId: PlayerId): Reduction | undefined {
  const guard = guardActiveTurn(state, playerId);
  if (guard) return guard;
  if (!state.metadata.awaitingPostMoveAction) {
    return { state, events: [emitError(state, 'move before acting')] };
  }
  return undefined;
}

function emit(state: GameStateInternal, evtNoId: ServerEvent): ServerEvent {
  state.lastEventId += 1;
  return { ...evtNoId, eventId: state.lastEventId } as ServerEvent;
}

// Goofy error catalogue. Keep these short, daft, UK-flavoured.
// Engine code references the canonical key; we render the daft text here.
const ERROR_TEXT: Record<string, string> = {
  'cannot join: game in progress': "Can't join now — bake's already in the oven.",
  'room full': 'Room’s rammed. Sling your hook.',
  'nickname taken': 'Someone nicked that nickname already.',
  'unknown player': 'Who even are you?',
  'already moved this turn': 'Oi, you already had your wander.',
  'no moves remaining': 'Your week’s over, mate.',
  'not enough poo to draw': 'Skint! Need more poo.',
  'deck empty': 'Deck’s done. Cosmic emptiness.',
  'card not in hand': 'You don’t have that card. Cheeky.',
  'not a special card': 'That’s no special card. Try again.',
  "can't trade with yourself": 'No trading with yourself, weirdo.',
  'unknown recipient': 'They’re not here.',
  'negative amounts': 'Nice try with the negatives.',
  'not enough poo to offer': 'Promising poo you don’t have, are we?',
  'no such trade': 'That trade has vanished into the ether.',
  'not your trade': 'Mind your business, that one isn’t for you.',
  'players gone': 'Mate left the chat.',
  'not playing': 'Game’s not on. Have a sit.',
  'not your turn': 'Patience! Not your shout yet.',
  'move before acting': 'Take your step first, you maniac.',
  'must move before ending turn': 'Move first, end later. That’s the order.',
};

function emitError(state: GameStateInternal, key: string): ServerEvent {
  const message = ERROR_TEXT[key] ?? key;
  // Errors do NOT advance lastEventId — they're per-client transient.
  return { kind: 'ProtocolError', eventId: state.lastEventId, message };
}

// Re-export for external callers
export { projectPublic, projectPrivate, computeScores, pickWinners };
export type { GameStateInternal, Reduction };
export { TEMPLATES, rollHomework };
