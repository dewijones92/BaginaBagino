/**
 * 2-player playtest against the deployed Pi at 333133333.xyz/bagina/.
 * Same auto-pilot policy as playtest.ts but no in-process server — proves
 * the production deployment can take a game from start to GameEnded.
 *
 *   pnpm --filter server tsx tests/e2e/playtest-pi.ts
 */
import { io as ioClient, type Socket as ClientSocket } from 'socket.io-client';
import type { GameAction, LegalActionKind, ServerEvent } from '@bagina/schema';

const URL = 'https://333133333.xyz';
const PATH = '/bagina/socket.io';

type TestClient = {
  socket: ClientSocket;
  events: ServerEvent[];
  send: (a: GameAction) => void;
  close: () => void;
};

function connect(): TestClient {
  const socket = ioClient(URL, {
    path: PATH,
    transports: ['websocket', 'polling'],
    reconnection: false,
  });
  const events: ServerEvent[] = [];
  socket.on('event', (e: ServerEvent) => events.push(e));
  socket.on('connect_error', (err) => {
    console.error('[connect_error]', err.message);
  });
  return {
    socket,
    events,
    send: (a) => socket.emit('action', a),
    close: () => socket.close(),
  };
}

function waitFor(c: TestClient, pred: (e: ServerEvent[]) => boolean, ms = 8000): Promise<void> {
  return new Promise((resolve, reject) => {
    const start = Date.now();
    const tick = () => {
      if (pred(c.events)) return resolve();
      if (Date.now() - start > ms) return reject(new Error('waitFor timeout'));
      setTimeout(tick, 10);
    };
    tick();
  });
}

function latestSnapshot(events: ServerEvent[]) {
  for (let i = events.length - 1; i >= 0; i--) {
    if (events[i]!.kind === 'StateSnapshot') return events[i] as Extract<ServerEvent, { kind: 'StateSnapshot' }>;
  }
  return undefined;
}

async function policy(c: TestClient, playerId: string) {
  const snap = latestSnapshot(c.events);
  if (!snap) return;
  if (snap.state.activePlayerId !== playerId) return;
  const legal: LegalActionKind[] = snap.legalActions;
  if (legal.includes('MoveToken')) return c.send({ kind: 'MoveToken' });
  if (legal.includes('DeclareCompletion')) {
    const hand = snap.privateView.hand;
    const teeth = hand.filter((x) => x.kind === 'Tooth').slice(0, 3).map((x) => x.id);
    const paws = hand.filter((x) => x.kind === 'Paw').slice(0, 2).map((x) => x.id);
    const snouts = hand.filter((x) => x.kind === 'Snout').slice(0, 1).map((x) => x.id);
    if (teeth.length === 3 && paws.length === 2 && snouts.length === 1) {
      return c.send({
        kind: 'DeclareCompletion',
        what: 'bagino',
        cardIds: [...teeth, ...paws, ...snouts],
      });
    }
  }
  if (legal.includes('DrawCard')) return c.send({ kind: 'DrawCard' });
  if (legal.includes('EndTurn')) return c.send({ kind: 'EndTurn' });
}

async function main() {
  console.log(`[pi-playtest] connecting to ${URL}${PATH}`);
  const a = connect();
  const b = connect();

  // wait for both connected
  await Promise.all([
    new Promise<void>((r) => a.socket.on('connect', () => r())),
    new Promise<void>((r) => b.socket.on('connect', () => r())),
  ]);
  console.log('[pi-playtest] both connected', a.socket.id, b.socket.id);

  // Host creates room.
  a.send({ kind: 'CreateRoom', nickname: 'PiTestA' });
  await waitFor(a, (e) => e.some((x) => x.kind === 'RoomCreated'));
  const created = a.events.find((x) => x.kind === 'RoomCreated') as Extract<ServerEvent, { kind: 'RoomCreated' }>;
  const code = created.code;
  console.log(`[pi-playtest] room=${code}`);

  // Joiner joins.
  b.send({ kind: 'JoinRoom', code, nickname: 'PiTestB' });
  await waitFor(b, (e) => e.some((x) => x.kind === 'RoomJoined'));

  // Both ready.
  a.send({ kind: 'SetReady', ready: true });
  b.send({ kind: 'SetReady', ready: true });
  await waitFor(a, (e) => e.some((x) => x.kind === 'GameStarted'), 12000);
  console.log('[pi-playtest] game started');

  const ids = { a: a.socket.id!, b: b.socket.id! };
  const start = Date.now();
  let ticks = 0;
  while (Date.now() - start < 90_000) {
    if (a.events.some((e) => e.kind === 'GameEnded')) break;
    const snap = latestSnapshot(a.events);
    if (snap?.state.activePlayerId) {
      const active = snap.state.activePlayerId;
      if (active === ids.a) await policy(a, ids.a);
      else if (active === ids.b) await policy(b, ids.b);
    }
    await new Promise((r) => setTimeout(r, 30));
    ticks++;
  }

  const ended = a.events.find((e) => e.kind === 'GameEnded') as Extract<ServerEvent, { kind: 'GameEnded' }> | undefined;
  if (!ended) {
    console.error(`[pi-playtest] FAIL — no GameEnded after ${ticks} ticks`);
    process.exit(1);
  }
  console.log(`[pi-playtest] OK — finished in ${ticks} ticks`);
  console.log(`  winner(s): ${ended.winnerIds.join(', ')}`);
  for (const s of ended.scores) {
    console.log(`    ${s.playerId.slice(0, 6)} total=${s.total} bagi=${s.baginos}/${s.baginas} hw=${s.homeworkBonus}`);
  }
  a.close();
  b.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
