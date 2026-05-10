import { z } from 'zod';
import { GameCard, CompletionKind, EventCardKind, PartialKind, SpecialCardKind } from './cards.js';
import { LegalActionKind } from './actions.js';
import {
  HomeworkHint,
  PlayerColor,
  PlayerId,
  PrivatePlayerView,
  PublicGameState,
  PublicPlayer,
  RoomCode,
  SlotIndex,
  TradeOffer,
} from './state.js';

/**
 * Server → Client messages. Every event has a monotonic `eventId` per room
 * so clients can request a resync from a known point.
 */

const Eventy = z.object({
  eventId: z.number().int().nonnegative(),
});

export const RoomCreatedEvent = Eventy.extend({
  kind: z.literal('RoomCreated'),
  code: RoomCode,
  you: PlayerId,
});

export const RoomJoinedEvent = Eventy.extend({
  kind: z.literal('RoomJoined'),
  state: PublicGameState,
  you: PlayerId,
  privateView: PrivatePlayerView,
});

export const PlayerJoinedEvent = Eventy.extend({
  kind: z.literal('PlayerJoined'),
  player: PublicPlayer,
});

export const PlayerLeftEvent = Eventy.extend({
  kind: z.literal('PlayerLeft'),
  playerId: PlayerId,
});

export const PlayerReadyChangedEvent = Eventy.extend({
  kind: z.literal('PlayerReadyChanged'),
  playerId: PlayerId,
  ready: z.boolean(),
});

export const GameStartedEvent = Eventy.extend({
  kind: z.literal('GameStarted'),
  state: PublicGameState,
});

export const StateSnapshotEvent = Eventy.extend({
  kind: z.literal('StateSnapshot'),
  state: PublicGameState,
  privateView: PrivatePlayerView,
  legalActions: z.array(LegalActionKind),
});

export const TurnAdvancedEvent = Eventy.extend({
  kind: z.literal('TurnAdvanced'),
  activePlayerId: PlayerId,
  turnsRemaining: z.number().int().nonnegative(),
});

export const TokenMovedEvent = Eventy.extend({
  kind: z.literal('TokenMoved'),
  playerId: PlayerId,
  fromSlot: SlotIndex,
  toSlot: SlotIndex,
});

export const PooAwardedEvent = Eventy.extend({
  kind: z.literal('PooAwarded'),
  playerId: PlayerId,
  amount: z.number().int(),
  reason: z.enum(['slot', 'business', 'event']),
});

export const CardDrawnEvent = Eventy.extend({
  kind: z.literal('CardDrawn'),
  playerId: PlayerId,
  // Public to all; only the owner gets `card`.
  card: GameCard.nullable(),
});

export const CardPlayedEvent = Eventy.extend({
  kind: z.literal('CardPlayed'),
  playerId: PlayerId,
  cardKind: SpecialCardKind,
});

export const TradeOfferedEvent = Eventy.extend({
  kind: z.literal('TradeOffered'),
  offer: TradeOffer,
});

export const TradeResolvedEvent = Eventy.extend({
  kind: z.literal('TradeResolved'),
  tradeId: z.string(),
  accepted: z.boolean(),
});

export const CompletionDeclaredEvent = Eventy.extend({
  kind: z.literal('CompletionDeclared'),
  playerId: PlayerId,
  what: CompletionKind,
});

export const EventCardTriggeredEvent = Eventy.extend({
  kind: z.literal('EventCardTriggered'),
  card: EventCardKind,
});

export const HomeworkHintGainedEvent = Eventy.extend({
  kind: z.literal('HomeworkHintGained'),
  hint: HomeworkHint,
});

export const HomeworkRevealedEvent = Eventy.extend({
  kind: z.literal('HomeworkRevealed'),
  templateId: z.string(),
  description: z.string(),
});

export const PlayerScore = z.object({
  playerId: PlayerId,
  baginos: z.number().int().nonnegative(),
  baginas: z.number().int().nonnegative(),
  broods: z.number().int().nonnegative(),
  latches: z.number().int().nonnegative(),
  homeworkBonus: z.number().int().nonnegative(),
  total: z.number().int().nonnegative(),
});
export type PlayerScore = z.infer<typeof PlayerScore>;

export const GameEndedEvent = Eventy.extend({
  kind: z.literal('GameEnded'),
  scores: z.array(PlayerScore),
  winnerIds: z.array(PlayerId),
});

export const ProtocolErrorEvent = Eventy.extend({
  kind: z.literal('ProtocolError'),
  message: z.string(),
});

export const ServerEvent = z.discriminatedUnion('kind', [
  RoomCreatedEvent,
  RoomJoinedEvent,
  PlayerJoinedEvent,
  PlayerLeftEvent,
  PlayerReadyChangedEvent,
  GameStartedEvent,
  StateSnapshotEvent,
  TurnAdvancedEvent,
  TokenMovedEvent,
  PooAwardedEvent,
  CardDrawnEvent,
  CardPlayedEvent,
  TradeOfferedEvent,
  TradeResolvedEvent,
  CompletionDeclaredEvent,
  EventCardTriggeredEvent,
  HomeworkHintGainedEvent,
  HomeworkRevealedEvent,
  GameEndedEvent,
  ProtocolErrorEvent,
]);
export type ServerEvent = z.infer<typeof ServerEvent>;
