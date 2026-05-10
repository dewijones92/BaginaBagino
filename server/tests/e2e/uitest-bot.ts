/**
 * Programmatic bot used by scripts/uitest-endgame.sh.
 * Joins the room from $ROOM_CODE on the live Pi, marks ready, and
 * auto-pilots its own turns. The bagina1 emulator is the second player
 * and is driven by adb taps elsewhere.
 */
import { io as ioClient, type Socket as ClientSocket } from 'socket.io-client';
import { pickRecipeCards } from '../engine/_recipes.js';
import type { GameAction, ServerEvent } from '@bagina/schema';

const URL = 'https://333133333.xyz';
const PATH = '/bagina/socket.io';
const code = process.env.ROOM_CODE;
if (!code) {
  console.error('Set ROOM_CODE');
  process.exit(2);
}

const events: ServerEvent[] = [];
const socket: ClientSocket = ioClient(URL, {
  path: PATH,
  transports: ['websocket', 'polling'],
  reconnection: false,
});
socket.on('event', (e: ServerEvent) => events.push(e));
socket.on('connect_error', (err) => console.error('[bot] connect_error', err.message));

function send(a: GameAction) {
  socket.emit('action', a);
}
function latestSnap() {
  for (let i = events.length - 1; i >= 0; i--) {
    if (events[i]!.kind === 'StateSnapshot') return events[i] as Extract<ServerEvent, { kind: 'StateSnapshot' }>;
  }
  return undefined;
}

async function main() {
  await new Promise<void>((r) => socket.on('connect', () => r()));
  console.log('[bot] connected', socket.id);
  send({ kind: 'JoinRoom', code: code as any, nickname: 'Botty' });

  // Wait for join then ready up.
  for (let t = 0; t < 200; t++) {
    if (events.some((e) => e.kind === 'RoomJoined')) break;
    await new Promise((r) => setTimeout(r, 50));
  }
  send({ kind: 'SetReady', ready: true });
  console.log('[bot] readied');

  // Wait for game start.
  for (let t = 0; t < 300; t++) {
    if (events.some((e) => e.kind === 'GameStarted')) break;
    await new Promise((r) => setTimeout(r, 100));
  }
  console.log('[bot] game started');

  const myId = socket.id!;
  const start = Date.now();
  while (Date.now() - start < 240_000) {
    if (events.some((e) => e.kind === 'GameEnded')) break;
    const snap = latestSnap();
    if (snap && snap.state.activePlayerId === myId) {
      const legal = snap.legalActions;
      if (legal.includes('MoveToken')) send({ kind: 'MoveToken' });
      else if (legal.includes('DeclareCompletion')) {
        const cardIds = pickRecipeCards(snap.privateView.hand, 'bagino');
        if (cardIds !== null) {
          send({ kind: 'DeclareCompletion', what: 'bagino', cardIds });
        } else if (legal.includes('DrawCard')) send({ kind: 'DrawCard' });
        else if (legal.includes('EndTurn')) send({ kind: 'EndTurn' });
      } else if (legal.includes('DrawCard')) send({ kind: 'DrawCard' });
      else if (legal.includes('EndTurn')) send({ kind: 'EndTurn' });
    }
    await new Promise((r) => setTimeout(r, 200));
  }

  const ended = events.find((e) => e.kind === 'GameEnded') as Extract<ServerEvent, { kind: 'GameEnded' }> | undefined;
  if (ended) {
    console.log('[bot] OK GameEnded', ended.winnerIds, ended.scores.map((s) => `${s.playerId.slice(0, 6)}=${s.total}`));
    process.exit(0);
  } else {
    console.log('[bot] FAIL — no GameEnded');
    process.exit(1);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
