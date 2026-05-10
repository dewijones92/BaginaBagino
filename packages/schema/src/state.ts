import { z } from 'zod';
import { Card, CompletionKind } from './cards.js';

export const PlayerId = z.string();
export type PlayerId = z.infer<typeof PlayerId>;

// Alphabet excludes I, O, L, 0, 1 to avoid legibility confusion.
export const RoomCode = z
  .string()
  .regex(/^[ABCDEFGHJKMNPQRSTUVWXYZ23456789]{4}$/, 'expected 4-char room code');
export type RoomCode = z.infer<typeof RoomCode>;

export const Day = z.enum(['Mon', 'Tue', 'Wed', 'Thu', 'Fri']);
export type Day = z.infer<typeof Day>;

export const SlotIndex = z.number().int().min(0).max(39);
export type SlotIndex = z.infer<typeof SlotIndex>;

export const PlayerColor = z.enum(['pink', 'mint', 'lavender', 'butter']);
export type PlayerColor = z.infer<typeof PlayerColor>;

export const PublicPlayer = z.object({
  id: PlayerId,
  nickname: z.string().min(1).max(20),
  color: PlayerColor,
  slot: SlotIndex,
  poo: z.number().int().nonnegative(),
  handCount: z.number().int().nonnegative(),
  completed: z.array(CompletionKind),
  ready: z.boolean(),
  online: z.boolean(),
});
export type PublicPlayer = z.infer<typeof PublicPlayer>;

export const RoomPhase = z.enum(['lobby', 'playing', 'finished']);
export type RoomPhase = z.infer<typeof RoomPhase>;

export const PublicGameState = z.object({
  code: RoomCode,
  phase: RoomPhase,
  players: z.array(PublicPlayer),
  activePlayerId: PlayerId.nullable(),
  turnsRemaining: z.number().int().nonnegative(),
  deckRemaining: z.number().int().nonnegative(),
  lastEventId: z.number().int().nonnegative(),
});
export type PublicGameState = z.infer<typeof PublicGameState>;

export const HomeworkHint = z.object({
  topic: z.string(),
  text: z.string(),
});
export type HomeworkHint = z.infer<typeof HomeworkHint>;

export const PrivatePlayerView = z.object({
  hand: z.array(Card),
  homeworkHints: z.array(HomeworkHint),
  homeworkRevealed: z.string().nullable(),
});
export type PrivatePlayerView = z.infer<typeof PrivatePlayerView>;

export const TradeOffer = z.object({
  tradeId: z.string(),
  from: PlayerId,
  to: PlayerId,
  giveCardIds: z.array(z.string()),
  givePoo: z.number().int().nonnegative(),
  requestCardIds: z.array(z.string()),
  requestPoo: z.number().int().nonnegative(),
});
export type TradeOffer = z.infer<typeof TradeOffer>;
