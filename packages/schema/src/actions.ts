import { z } from 'zod';
import { CompletionKind } from './cards.js';
import { PlayerId, RoomCode } from './state.js';

/**
 * Client → Server messages. Tagged union keyed on `kind`.
 * The server validates EVERY inbound message via `GameAction.parse()`.
 */

const Base = { kind: z.string() } as const;

export const CreateRoomAction = z.object({
  kind: z.literal('CreateRoom'),
  nickname: z.string().min(1).max(20),
});

export const JoinRoomAction = z.object({
  kind: z.literal('JoinRoom'),
  code: RoomCode,
  nickname: z.string().min(1).max(20),
});

export const LeaveRoomAction = z.object({
  kind: z.literal('LeaveRoom'),
});

export const SetReadyAction = z.object({
  kind: z.literal('SetReady'),
  ready: z.boolean(),
});

export const MoveTokenAction = z.object({
  kind: z.literal('MoveToken'),
});

export const DrawCardAction = z.object({
  kind: z.literal('DrawCard'),
});

export const PlayCardAction = z.object({
  kind: z.literal('PlayCard'),
  cardId: z.string(),
  targetPlayerId: PlayerId.optional(),
});

export const OfferTradeAction = z.object({
  kind: z.literal('OfferTrade'),
  to: PlayerId,
  giveCardIds: z.array(z.string()),
  givePoo: z.number().int().nonnegative(),
  requestCardIds: z.array(z.string()),
  requestPoo: z.number().int().nonnegative(),
});

export const RespondTradeAction = z.object({
  kind: z.literal('RespondTrade'),
  tradeId: z.string(),
  accept: z.boolean(),
});

export const DeclareCompletionAction = z.object({
  kind: z.literal('DeclareCompletion'),
  what: CompletionKind,
  cardIds: z.array(z.string()),
});

export const EndTurnAction = z.object({
  kind: z.literal('EndTurn'),
});

export const ResyncAction = z.object({
  kind: z.literal('Resync'),
  lastEventId: z.number().int().nonnegative(),
});

export const GameAction = z.discriminatedUnion('kind', [
  CreateRoomAction,
  JoinRoomAction,
  LeaveRoomAction,
  SetReadyAction,
  MoveTokenAction,
  DrawCardAction,
  PlayCardAction,
  OfferTradeAction,
  RespondTradeAction,
  DeclareCompletionAction,
  EndTurnAction,
  ResyncAction,
]);
export type GameAction = z.infer<typeof GameAction>;

/**
 * The set of action `kind`s that are legal *right now* for the receiving
 * player. The server pushes this with every StateSnapshot so the client
 * can grey out buttons without re-deriving rules.
 */
export const LegalActionKind = z.enum([
  'MoveToken',
  'DrawCard',
  'PlayCard',
  'OfferTrade',
  'RespondTrade',
  'DeclareCompletion',
  'EndTurn',
]);
export type LegalActionKind = z.infer<typeof LegalActionKind>;
