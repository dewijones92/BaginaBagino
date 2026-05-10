import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { connect, startTestServer, type TestServer } from './harness.js';
import type { ServerEvent } from '@bagina/schema';

describe('socket.io transport (multi-client)', () => {
  let srv: TestServer;
  beforeAll(async () => { srv = await startTestServer(); });
  afterAll(async () => { await srv.stop(); });

  it('CreateRoom yields RoomCreated + RoomJoined to the host', async () => {
    const a = connect(srv.port);
    a.send({ kind: 'CreateRoom', nickname: 'Alice' });
    const evs = await a.waitFor((e) => e.some((x) => x.kind === 'RoomJoined'));
    const created = evs.find((e) => e.kind === 'RoomCreated');
    const joined = evs.find((e) => e.kind === 'RoomJoined');
    expect(created).toBeDefined();
    expect(joined).toBeDefined();
    if (created?.kind === 'RoomCreated') {
      expect(created.code).toMatch(/^[ABCDEFGHJKMNPQRSTUVWXYZ23456789]{4}$/);
    }
    a.close();
  });

  it('JoinRoom delivers RoomJoined to joiner and PlayerJoined to existing players', async () => {
    const a = connect(srv.port);
    const b = connect(srv.port);

    a.send({ kind: 'CreateRoom', nickname: 'Alice' });
    const aEvs = await a.waitFor((e) => e.some((x) => x.kind === 'RoomJoined'));
    const code = (aEvs.find((e) => e.kind === 'RoomCreated') as Extract<ServerEvent, { kind: 'RoomCreated' }>).code;

    b.send({ kind: 'JoinRoom', code, nickname: 'Bob' });
    await b.waitFor((e) => e.some((x) => x.kind === 'RoomJoined'));
    await a.waitFor((e) => e.some((x) => x.kind === 'PlayerJoined'));

    a.close();
    b.close();
  });

  it('Two ready players triggers GameStarted', async () => {
    const a = connect(srv.port);
    const b = connect(srv.port);
    a.send({ kind: 'CreateRoom', nickname: 'A' });
    const aEvs = await a.waitFor((e) => e.some((x) => x.kind === 'RoomJoined'));
    const code = (aEvs.find((e) => e.kind === 'RoomCreated') as Extract<ServerEvent, { kind: 'RoomCreated' }>).code;
    b.send({ kind: 'JoinRoom', code, nickname: 'B' });
    await b.waitFor((e) => e.some((x) => x.kind === 'RoomJoined'));

    a.send({ kind: 'SetReady', ready: true });
    b.send({ kind: 'SetReady', ready: true });
    await b.waitFor((e) => e.some((x) => x.kind === 'GameStarted'));
    await a.waitFor((e) => e.some((x) => x.kind === 'GameStarted'));

    a.close();
    b.close();
  });

  it('Bad action yields ProtocolError, not crash', async () => {
    const c = connect(srv.port);
    c.send({ kind: 'GarbageAction' } as any);
    const evs = await c.waitFor((e) => e.some((x) => x.kind === 'ProtocolError'));
    expect(evs.find((e) => e.kind === 'ProtocolError')).toBeTruthy();
    c.close();
  });

  it('healthz responds 200', async () => {
    const r = await fetch(`http://127.0.0.1:${srv.port}/healthz`);
    expect(r.status).toBe(200);
    const body = await r.json();
    expect(body.ok).toBe(true);
  });
});
