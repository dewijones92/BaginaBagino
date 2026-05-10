import type { FastifyInstance } from 'fastify';

export function attachHttpRoutes(app: FastifyInstance): void {
  app.get('/healthz', async () => ({ ok: true, service: 'bagina-server' }));
  app.get('/version', async () => ({
    name: 'bagina-server',
    version: process.env.GIT_SHA ?? 'dev',
  }));
}
