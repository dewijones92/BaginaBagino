import { GameAction, type PlayerId, type RoomCode, type ServerEvent } from '@bagina/schema';
import {
  applyAction,
  emptyLobby,
  addPlayer,
  removePlayer,
  type GameStateInternal,
} from '../engine/reducer.js';
import { generateRoomCode } from './codes.js';
import { Persistence } from './persistence.js';

export type RoomEvent = { code: string; event: ServerEvent };

/**
 * Owns the in-memory cache of room states + event-log persistence.
 * Pure orchestration — no socket logic here.
 */
export class RoomManager {
  private rooms = new Map<string, GameStateInternal>();

  constructor(private readonly persistence: Persistence) {
    // Restore any rooms found on disk into memory at startup.
    for (const code of persistence.allRoomCodes()) {
      const s = persistence.loadSnapshot(code);
      if (s) this.rooms.set(code, s);
    }
  }

  get(code: RoomCode): GameStateInternal | null {
    return this.rooms.get(code) ?? null;
  }

  createRoom(playerId: PlayerId, nickname: string, seed?: number): { state: GameStateInternal; events: ServerEvent[]; code: string } {
    const code = generateRoomCode((c) => this.rooms.has(c));
    const initial = emptyLobby(code as RoomCode, seed ?? Math.floor(Math.random() * 0x7fffffff));
    const { state, events } = addPlayer(initial, playerId, nickname);
    this.commit(state, events);
    return { state, events: [{ kind: 'RoomCreated', eventId: state.lastEventId + 1, code, you: playerId } as ServerEvent, ...events], code };
  }

  joinRoom(code: RoomCode, playerId: PlayerId, nickname: string): { state: GameStateInternal | null; events: ServerEvent[] } {
    const room = this.rooms.get(code);
    if (!room) {
      return {
        state: null,
        events: [
          { kind: 'ProtocolError', eventId: 0, message: 'No such room. Sure that code is right?' } as ServerEvent,
        ],
      };
    }
    const { state, events } = addPlayer(room, playerId, nickname);
    this.commit(state, events);
    return { state, events };
  }

  leaveRoom(code: RoomCode, playerId: PlayerId): ServerEvent[] {
    const room = this.rooms.get(code);
    if (!room) return [];
    const { state, events } = removePlayer(room, playerId);
    this.commit(state, events);
    if (state.players.length === 0 && state.phase !== 'playing') {
      this.rooms.delete(code);
      this.persistence.deleteRoomData(code);
    }
    return events;
  }

  apply(code: RoomCode, playerId: PlayerId, action: GameAction): ServerEvent[] {
    const room = this.rooms.get(code);
    if (!room) {
      return [
        { kind: 'ProtocolError', eventId: 0, message: 'No such room.' } as ServerEvent,
      ];
    }
    const { state, events } = applyAction(room, playerId, action);
    this.commit(state, events);
    return events;
  }

  /**
   * For reconnect/resync: replay everything after `lastEventId`.
   */
  eventsAfter(code: RoomCode, lastEventId: number): ServerEvent[] {
    return this.persistence.eventsAfter(code, lastEventId) as ServerEvent[];
  }

  private commit(state: GameStateInternal, events: ServerEvent[]): void {
    this.rooms.set(state.code, state);
    this.persistence.saveSnapshot(state);
    for (const ev of events) {
      if (ev.kind === 'ProtocolError') continue; // transient, don't persist
      this.persistence.appendEvent(state.code, ev.eventId, ev);
    }
  }
}
