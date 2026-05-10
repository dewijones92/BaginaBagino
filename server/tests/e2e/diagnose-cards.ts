/**
 * Two-player diagnostic: play several turns against localhost:3001 and
 * dump exactly what the server is advertising and what it accepts.
 *
 * Run: pnpm --filter server exec tsx tests/e2e/diagnose-cards.ts
 */
import { io as ioClient, type Socket as ClientSocket } from 'socket.io-client';
import type { GameAction, ServerEvent } from '@bagina/schema';

const URL = 'http://localhost:3001';

type C = { socket: ClientSocket; events: ServerEvent[]; name: string };

function connect(name: string): C {
  const socket = ioClient(URL, { transports: ['websocket'], reconnection: false });
  const events: ServerEvent[] = [];
  socket.on('event', (e: ServerEvent) => events.push(e));
  socket.on('connect_error', (err) => console.error(`[${name}] connect_error`, err.message));
  return { socket, events, name };
}

function snap(c: C) {
  for (let i = c.events.length - 1; i >= 0; i--) {
    if (c.events[i]!.kind === 'StateSnapshot') return c.events[i] as Extract<ServerEvent, { kind: 'StateSnapshot' }>;
  }
  return undefined;
}

const send = (c: C, a: GameAction) => c.socket.emit('action', a);

async function waitFor<T>(c: C, pred: (e: ServerEvent[]) => boolean, ms = 4000) {
  const start = Date.now();
  while (Date.now() - start < ms) {
    if (pred(c.events)) return;
    await new Promise((r) => setTimeout(r, 30));
  }
  throw new Error(`[${c.name}] waitFor timeout`);
}

function summarise(c: C) {
  const s = snap(c);
  if (!s) return '(no snapshot)';
  const me = s.state.players.find((p) => p.id === c.socket.id);
  const handBy = s.privateView.hand.reduce<Record<string, number>>((m, x) => {
    m[x.kind] = (m[x.kind] ?? 0) + 1;
    return m;
  }, {});
  return [
    `slot=${me?.slot}`,
    `poo=${me?.poo}`,
    `moves=${me?.movesRemaining ?? '?'}`,
    `hand=${JSON.stringify(handBy)}`,
    `legal=[${s.legalActions.join(',')}]`,
    `active=${s.state.activePlayerId === c.socket.id ? 'YOU' : 'opp'}`,
    `awaitingPost=${s.state.metadata?.awaitingPostMoveAction ?? '?'}`,
  ].join(' | ');
}

async function main() {
  const a = connect('A');
  const b = connect('B');
  await Promise.all([
    new Promise<void>((r) => a.socket.on('connect', () => r())),
    new Promise<void>((r) => b.socket.on('connect', () => r())),
  ]);
  console.log(`connected: A=${a.socket.id} B=${b.socket.id}`);

  send(a, { kind: 'CreateRoom', nickname: 'Aly' });
  await waitFor(a, (e) => e.some((x) => x.kind === 'RoomCreated'));
  const code = (a.events.find((x) => x.kind === 'RoomCreated') as Extract<ServerEvent, { kind: 'RoomCreated' }>).code;
  console.log(`room=${code}`);

  send(b, { kind: 'JoinRoom', code, nickname: 'Bee' });
  await waitFor(b, (e) => e.some((x) => x.kind === 'RoomJoined'));

  send(a, { kind: 'SetReady', ready: true });
  send(b, { kind: 'SetReady', ready: true });
  await waitFor(a, (e) => e.some((x) => x.kind === 'GameStarted'));
  console.log('game started');
  await new Promise((r) => setTimeout(r, 100));

  // Turn-driving loop: each iteration, the active player tries:
  //   1. MoveToken (if legal)
  //   2. DrawCard if it's legal AND we have under N cards
  //   3. PlayCard if a Special is in hand
  //   4. EndTurn
  // We log what the server says is legal and what it accepts, so we can see
  // exactly where things go off the rails.
  for (let turn = 1; turn <= 20; turn++) {
    const s = snap(a);
    if (!s) {
      console.log(`turn ${turn}: no snapshot yet`);
      await new Promise((r) => setTimeout(r, 50));
      continue;
    }
    if (s.state.phase === 'finished') {
      console.log(`game finished at turn ${turn}`);
      break;
    }
    const activeId = s.state.activePlayerId;
    const me: C = activeId === a.socket.id ? a : b;
    const them: C = me === a ? b : a;
    console.log(`\n— turn ${turn} (${me.name}'s turn) —`);
    console.log(`  ${me.name}: ${summarise(me)}`);
    console.log(`  ${them.name}: ${summarise(them)}`);

    const legal = snap(me)!.legalActions;

    if (legal.includes('MoveToken')) {
      console.log(`  -> MoveToken`);
      send(me, { kind: 'MoveToken' });
      await new Promise((r) => setTimeout(r, 80));
      console.log(`  after MoveToken: ${summarise(me)}`);
    }

    // Re-read legal after move.
    const legalPost = snap(me)!.legalActions;
    if (legalPost.includes('DrawCard')) {
      console.log(`  -> DrawCard`);
      send(me, { kind: 'DrawCard' });
      await new Promise((r) => setTimeout(r, 80));
      console.log(`  after DrawCard:  ${summarise(me)}`);
    } else {
      console.log(`  (DrawCard not legal: poo=${snap(me)!.state.players.find((p) => p.id === me.socket.id)?.poo})`);
    }

    const legalPost2 = snap(me)!.legalActions;
    if (legalPost2.includes('PlayCard')) {
      const hand = snap(me)!.privateView.hand;
      const special = hand.find((x) => x.kind === 'Clever' || x.kind === 'Brave' || x.kind === 'Business');
      if (special) {
        console.log(`  -> PlayCard ${special.kind} (id=${special.id})`);
        send(me, { kind: 'PlayCard', cardId: special.id });
        await new Promise((r) => setTimeout(r, 80));
        console.log(`  after PlayCard:  ${summarise(me)}`);
      }
    }

    // End turn.
    const legalEnd = snap(me)!.legalActions;
    if (legalEnd.includes('EndTurn')) {
      console.log(`  -> EndTurn`);
      send(me, { kind: 'EndTurn' });
      await new Promise((r) => setTimeout(r, 80));
    } else {
      console.log(`  STUCK: no EndTurn legal — aborting. legal=${legalEnd.join(',')}`);
      break;
    }
  }

  a.socket.close();
  b.socket.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
