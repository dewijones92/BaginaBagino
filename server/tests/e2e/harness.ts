import Fastify, { type FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import { Server as IOServer } from 'socket.io';
import { io as ioClient, type Socket as ClientSocket } from 'socket.io-client';
import pino from 'pino';
import { tmpdir } from 'node:os';
import { mkdtempSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import type { GameAction, ServerEvent } from '@bagina/schema';

import { Persistence } from '../../src/rooms/persistence.js';
import { RoomManager } from '../../src/rooms/manager.js';
import { attachSocketHandlers } from '../../src/transport/socket.js';
import { attachHttpRoutes } from '../../src/transport/http.js';

export type TestServer = {
  app: FastifyInstance;
  io: IOServer;
  rooms: RoomManager;
  persistence: Persistence;
  port: number;
  dataDir: string;
  stop: () => Promise<void>;
};

export async function startTestServer(): Promise<TestServer> {
  const dataDir = mkdtempSync(join(tmpdir(), 'bagina-e2e-'));
  const persistence = new Persistence(join(dataDir, 'rooms.sqlite'));
  const rooms = new RoomManager(persistence);

  const log = pino({ level: 'silent' });
  const app = Fastify({ logger: false });
  await app.register(cors, { origin: true });
  attachHttpRoutes(app);

  const io = new IOServer(app.server, { cors: { origin: true } });
  attachSocketHandlers(io, rooms, log);
  await app.listen({ port: 0, host: '127.0.0.1' });

  const addr = app.server.address();
  if (!addr || typeof addr === 'string') throw new Error('no port');
  const port = addr.port;

  return {
    app,
    io,
    rooms,
    persistence,
    port,
    dataDir,
    async stop() {
      io.close();
      await app.close();
      persistence.close();
      rmSync(dataDir, { recursive: true, force: true });
    },
  };
}

export type TestClient = {
  socket: ClientSocket;
  events: ServerEvent[];
  // Wait until predicate returns truthy on the latest snapshot of events.
  waitFor: (pred: (events: ServerEvent[]) => boolean, timeoutMs?: number) => Promise<ServerEvent[]>;
  send: (action: GameAction) => void;
  close: () => void;
};

export function connect(port: number): TestClient {
  const socket = ioClient(`http://127.0.0.1:${port}`, { transports: ['websocket'], reconnection: false });
  const events: ServerEvent[] = [];
  socket.on('event', (e: ServerEvent) => events.push(e));

  const waitFor = (pred: (events: ServerEvent[]) => boolean, timeoutMs = 2500) =>
    new Promise<ServerEvent[]>((resolve, reject) => {
      const start = Date.now();
      const tick = () => {
        if (pred(events)) return resolve(events.slice());
        if (Date.now() - start > timeoutMs) return reject(new Error('waitFor timeout'));
        setTimeout(tick, 5);
      };
      tick();
    });

  return {
    socket,
    events,
    waitFor,
    send: (action) => socket.emit('action', action),
    close: () => socket.close(),
  };
}
