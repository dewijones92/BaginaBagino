import Fastify from 'fastify';
import cors from '@fastify/cors';
import { Server as IOServer } from 'socket.io';
import pino from 'pino';
import { loadConfig } from './config.js';
import { Persistence } from './rooms/persistence.js';
import { RoomManager } from './rooms/manager.js';
import { attachSocketHandlers } from './transport/socket.js';
import { attachHttpRoutes } from './transport/http.js';

const cfg = loadConfig();
const log = pino({ level: cfg.logLevel, transport: { target: 'pino-pretty' } });

async function main(): Promise<void> {
  const persistence = new Persistence(`${cfg.dataDir}/rooms.sqlite`);
  const rooms = new RoomManager(persistence);

  const app = Fastify({
    logger: {
      level: cfg.logLevel,
      transport: { target: 'pino-pretty' },
    },
  });
  await app.register(cors, { origin: true });
  attachHttpRoutes(app);

  const io = new IOServer(app.server, {
    cors: { origin: true, credentials: true },
    // Server is mount-point agnostic. nginx strips any /bagina/ prefix
    // before proxying, so socket.io always lives at /socket.io/ here.
    path: '/socket.io/',
  });
  attachSocketHandlers(io, rooms, log);

  app.addHook('onClose', async () => {
    io.close();
    persistence.close();
  });

  await app.listen({ port: cfg.port, host: '0.0.0.0' });
  log.info(`bagina-server listening on :${cfg.port} basePath=${cfg.basePath}`);
}

main().catch((err) => {
  log.fatal({ err }, 'fatal');
  process.exit(1);
});
