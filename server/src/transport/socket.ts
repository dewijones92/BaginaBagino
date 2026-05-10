import type { Server as IOServer, Socket } from 'socket.io';
import type { Logger } from 'pino';
import { GameAction, type PlayerId, type ServerEvent } from '@bagina/schema';
import {
  projectPrivate,
  projectPublic,
  type GameStateInternal,
} from '../engine/reducer.js';
import { legalActionsFor } from '../engine/actions.js';
import type { RoomManager } from '../rooms/manager.js';

type ClientCtx = {
  playerId: PlayerId;
  roomCode: string | null;
};

export function attachSocketHandlers(io: IOServer, rooms: RoomManager, log: Logger): void {
  io.on('connection', (socket) => {
    const ctx: ClientCtx = { playerId: socket.id, roomCode: null };
    log.info({ socketId: socket.id }, 'client connected');

    socket.on('action', (raw: unknown) => {
      const parsed = GameAction.safeParse(raw);
      if (!parsed.success) {
        socket.emit('event', {
          kind: 'ProtocolError',
          eventId: 0,
          message: 'Bad action payload. Schema says no.',
        } satisfies ServerEvent);
        return;
      }
      const action = parsed.data;
      handleAction(io, rooms, ctx, action, socket, log);
    });

    socket.on('disconnect', () => {
      log.info({ socketId: socket.id, room: ctx.roomCode }, 'client disconnected');
      if (ctx.roomCode) {
        const evs = rooms.leaveRoom(ctx.roomCode as any, ctx.playerId);
        broadcastTo(io, ctx.roomCode, evs);
      }
    });
  });
}

function handleAction(
  io: IOServer,
  rooms: RoomManager,
  ctx: ClientCtx,
  action: GameAction,
  socket: Socket,
  log: Logger,
): void {
  switch (action.kind) {
    case 'CreateRoom': {
      const { code, events, state } = rooms.createRoom(ctx.playerId, action.nickname);
      ctx.roomCode = code;
      socket.join(code);
      // Send RoomCreated to caller, broadcast PlayerJoined to room (just them).
      const created = events.find((e) => e.kind === 'RoomCreated');
      if (created) socket.emit('event', created);
      socket.emit('event', initialJoinedEvent(state, ctx.playerId));
      broadcastTo(io, code, events.filter((e) => e.kind !== 'RoomCreated' && e.kind !== 'RoomJoined'));
      // Snapshot for the creator so legalActions / privateView are populated.
      if (rooms.get(code as any)) emitSnapshots(io, rooms.get(code as any)!);
      return;
    }
    case 'JoinRoom': {
      const { state, events } = rooms.joinRoom(action.code, ctx.playerId, action.nickname);
      if (!state) {
        for (const ev of events) socket.emit('event', ev);
        return;
      }
      ctx.roomCode = action.code;
      socket.join(action.code);
      socket.emit('event', initialJoinedEvent(state, ctx.playerId));
      broadcastTo(io, action.code, events);
      // Refresh every player's snapshot so the host's lobby tile updates.
      const fresh = rooms.get(action.code as any);
      if (fresh) emitSnapshots(io, fresh);
      return;
    }
    case 'LeaveRoom': {
      if (!ctx.roomCode) return;
      const evs = rooms.leaveRoom(ctx.roomCode as any, ctx.playerId);
      broadcastTo(io, ctx.roomCode, evs);
      socket.leave(ctx.roomCode);
      // Refresh remaining players too.
      const fresh = rooms.get(ctx.roomCode as any);
      if (fresh) emitSnapshots(io, fresh);
      ctx.roomCode = null;
      return;
    }
    case 'Resync': {
      if (!ctx.roomCode) return;
      const replay = rooms.eventsAfter(ctx.roomCode as any, action.lastEventId);
      for (const ev of replay) socket.emit('event', ev);
      const state = rooms.get(ctx.roomCode as any);
      if (state) {
        // Always send a fresh snapshot last so the client's projection is up to date.
        socket.emit('event', snapshot(state, ctx.playerId));
      }
      return;
    }
    default: {
      if (!ctx.roomCode) {
        socket.emit('event', {
          kind: 'ProtocolError',
          eventId: 0,
          message: 'Join a room first, you eager bean.',
        } satisfies ServerEvent);
        return;
      }
      const events = rooms.apply(ctx.roomCode as any, ctx.playerId, action);
      broadcastTo(io, ctx.roomCode, events);
      // After every state change, give every player a snapshot with their
      // private view + legal actions. This is the simplest way to keep
      // clients honest without per-event projection logic.
      const state = rooms.get(ctx.roomCode as any);
      if (state) emitSnapshots(io, state);
      return;
    }
  }
}

function broadcastTo(io: IOServer, code: string, events: ServerEvent[]): void {
  for (const ev of events) {
    io.to(code).emit('event', ev);
  }
}

function snapshot(state: GameStateInternal, playerId: PlayerId): ServerEvent {
  return {
    kind: 'StateSnapshot',
    eventId: state.lastEventId,
    state: projectPublic(state),
    privateView: projectPrivate(state, playerId),
    legalActions: legalActionsFor(state, playerId),
  };
}

function initialJoinedEvent(state: GameStateInternal, playerId: PlayerId): ServerEvent {
  return {
    kind: 'RoomJoined',
    eventId: state.lastEventId,
    state: projectPublic(state),
    you: playerId,
    privateView: projectPrivate(state, playerId),
  };
}

function emitSnapshots(io: IOServer, state: GameStateInternal): void {
  // Send an individualised snapshot per player so privateView is correct.
  // We rely on the convention that socket.id === playerId.
  for (const p of state.players) {
    io.to(p.id).emit('event', snapshot(state, p.id));
  }
}
