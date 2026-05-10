import type {
  Card,
  CompletionKind,
  PlayerColor,
  PlayerId,
  PlayerScore,
  PrivatePlayerView,
  PublicGameState,
  PublicPlayer,
  RoomCode,
  RoomPhase,
  ServerEvent,
  TradeOffer,
} from '@bagina/schema';
import type { HomeworkTemplate } from './homework.js';

/**
 * Internal authoritative state. PrivatePlayerView and PublicGameState are
 * the *projection* of this for clients — they never see this raw.
 */
export type PlayerInternal = {
  id: PlayerId;
  nickname: string;
  color: PlayerColor;
  slot: number;
  poo: number;
  hand: Card[];
  completed: CompletionKind[];
  ready: boolean;
  online: boolean;
  movesRemaining: number;
  homeworkHints: { topic: string; text: string }[];
};

export type GameStateInternal = {
  code: RoomCode;
  phase: RoomPhase;
  players: PlayerInternal[];
  activePlayerIndex: number;
  deck: Card[];
  discard: Card[];
  homework: HomeworkTemplate;
  pendingTrades: TradeOffer[];
  lastEventId: number;
  rngSeed: number;
  metadata: {
    successfulTradesByPlayer: Record<PlayerId, number>;
    drewOnMondayByPlayer: Record<PlayerId, boolean>;
    actionsApplied: number;
    awaitingPostMoveAction: boolean;
  };
};

export function projectPublic(s: GameStateInternal): PublicGameState {
  const totalMovesRemaining = s.players.reduce((acc, p) => acc + p.movesRemaining, 0);
  return {
    code: s.code,
    phase: s.phase,
    players: s.players.map(projectPlayer),
    activePlayerId:
      s.phase === 'playing' ? s.players[s.activePlayerIndex]!.id : null,
    turnsRemaining: totalMovesRemaining,
    deckRemaining: s.deck.length,
    lastEventId: s.lastEventId,
  };
}

export function projectPlayer(p: PlayerInternal): PublicPlayer {
  return {
    id: p.id,
    nickname: p.nickname,
    color: p.color,
    slot: p.slot,
    poo: p.poo,
    handCount: p.hand.length,
    completed: p.completed,
    ready: p.ready,
    online: p.online,
  };
}

export function projectPrivate(
  s: GameStateInternal,
  playerId: PlayerId,
): PrivatePlayerView {
  const player = s.players.find((p) => p.id === playerId);
  return {
    hand: player?.hand ?? [],
    homeworkHints: player?.homeworkHints ?? [],
    homeworkRevealed: s.phase === 'finished' ? s.homework.description : null,
  };
}

/**
 * One result of applying an action: the new state plus any events to emit
 * to the room. Reducers are PURE — no IO, no Date.now(), no random outside
 * of the seeded Rng held in metadata.
 */
export type Reduction = {
  state: GameStateInternal;
  events: ServerEvent[];
};

export type Score = PlayerScore;
