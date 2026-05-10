/**
 * End-to-end playtest harness:
 *   - boots an in-process server
 *   - connects 4 socket.io clients
 *   - drives them through a full game with a deterministic auto-pilot
 *   - asserts everyone reaches GameEnded
 *
 * Used by `pnpm playtest` and as the integration gate.
 */
import { connect, startTestServer, type TestClient } from './harness.js';
import type { LegalActionKind, ServerEvent } from '@bagina/schema';

type ClientView = {
  client: TestClient;
  playerId: string;
  legalActions: LegalActionKind[];
  hand: { id: string; kind: string }[];
  poo: number;
  active: boolean;
  finished: boolean;
};

function latestSnapshot(events: ServerEvent[]): Extract<ServerEvent, { kind: 'StateSnapshot' }> | undefined {
  for (let i = events.length - 1; i >= 0; i--) {
    if (events[i]!.kind === 'StateSnapshot') return events[i] as any;
  }
  return undefined;
}

function viewFromEvents(playerId: string, events: ServerEvent[]): ClientView['legalActions'] extends infer _ ? Pick<ClientView, 'legalActions' | 'hand' | 'poo' | 'active' | 'finished'> : never {
  const snap = latestSnapshot(events);
  if (!snap) return { legalActions: [], hand: [], poo: 0, active: false, finished: false };
  const me = snap.state.players.find((p) => p.id === playerId);
  return {
    legalActions: snap.legalActions,
    hand: snap.privateView.hand,
    poo: me?.poo ?? 0,
    active: snap.state.activePlayerId === playerId,
    finished: snap.state.phase === 'finished',
  };
}

async function policy(view: ClientView): Promise<void> {
  if (!view.active) return;
  const { legalActions: legal } = view;
  if (legal.includes('MoveToken')) {
    view.client.send({ kind: 'MoveToken' });
    return;
  }
  if (legal.includes('DeclareCompletion')) {
    const teeth = view.hand.filter((c) => c.kind === 'Tooth').slice(0, 3).map((c) => c.id);
    const paws = view.hand.filter((c) => c.kind === 'Paw').slice(0, 2).map((c) => c.id);
    const snouts = view.hand.filter((c) => c.kind === 'Snout').slice(0, 1).map((c) => c.id);
    if (teeth.length === 3 && paws.length === 2 && snouts.length === 1) {
      view.client.send({
        kind: 'DeclareCompletion',
        what: 'bagino',
        cardIds: [...teeth, ...paws, ...snouts],
      });
      return;
    }
  }
  if (legal.includes('DrawCard')) {
    view.client.send({ kind: 'DrawCard' });
    return;
  }
  if (legal.includes('EndTurn')) {
    view.client.send({ kind: 'EndTurn' });
    return;
  }
}

export async function runPlaytest(): Promise<void> {
  const srv = await startTestServer();
  try {
    const clients: TestClient[] = [];
    for (let i = 0; i < 4; i++) clients.push(connect(srv.port));

    // Host creates room.
    clients[0]!.send({ kind: 'CreateRoom', nickname: 'P1' });
    await clients[0]!.waitFor((e) => e.some((x) => x.kind === 'RoomJoined'), 5000);
    const created = clients[0]!.events.find((e) => e.kind === 'RoomCreated');
    const code = (created as Extract<ServerEvent, { kind: 'RoomCreated' }>).code;

    // Others join.
    for (let i = 1; i < 4; i++) {
      clients[i]!.send({ kind: 'JoinRoom', code, nickname: `P${i + 1}` });
      await clients[i]!.waitFor((e) => e.some((x) => x.kind === 'RoomJoined'), 5000);
    }

    // Everyone ready.
    for (const c of clients) c.send({ kind: 'SetReady', ready: true });
    await clients[0]!.waitFor((e) => e.some((x) => x.kind === 'GameStarted'), 5000);

    // Player ids: socket.id is used internally as playerId.
    const ids = clients.map((c) => c.socket.id!);
    if (ids.some((id) => !id)) throw new Error('missing socket id');

    // Loop until GameEnded shows up on at least one client.
    const start = Date.now();
    let ticks = 0;
    while (Date.now() - start < 60_000) {
      const ended = clients[0]!.events.some((e) => e.kind === 'GameEnded');
      if (ended) break;

      // Find active player and let them decide.
      const snap = latestSnapshot(clients[0]!.events);
      if (snap?.state.activePlayerId) {
        const idx = ids.indexOf(snap.state.activePlayerId);
        if (idx >= 0) {
          const view: ClientView = {
            client: clients[idx]!,
            playerId: snap.state.activePlayerId,
            ...viewFromEvents(snap.state.activePlayerId, clients[idx]!.events),
          } as ClientView;
          await policy(view);
        }
      }

      // Tiny pause so events propagate.
      await new Promise((r) => setTimeout(r, 5));
      ticks++;
    }

    const final = clients[0]!.events.find((e) => e.kind === 'GameEnded');
    if (!final) {
      throw new Error(`playtest did not finish in 60s (ticks=${ticks})`);
    }
    const ended = final as Extract<ServerEvent, { kind: 'GameEnded' }>;
    console.log(`✓ playtest finished after ${ticks} ticks`);
    console.log(`  winners: ${ended.winnerIds.join(', ')}`);
    console.log('  scores:');
    for (const s of ended.scores) {
      console.log(`    ${s.playerId.slice(0, 6)} total=${s.total} bagi=${s.baginos}/${s.baginas} hw=${s.homeworkBonus}`);
    }
    for (const c of clients) c.close();
  } finally {
    await srv.stop();
  }
}

// CLI entry point.
const isMain = import.meta.url === `file://${process.argv[1]}`;
if (isMain) {
  runPlaytest().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
