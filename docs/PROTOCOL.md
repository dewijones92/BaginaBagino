# Wire protocol

The Zod schemas in `packages/schema/src/` are the source of truth. This doc is a friendly catalogue.

## Transport

- WebSocket via Socket.IO.
- Public path on the Pi: `wss://333133333.xyz/bagina/socket.io/`.
- Local dev: `ws://localhost:3001/socket.io/`.
- All inbound messages are parsed against `GameAction` (Zod). Invalid → server emits `ProtocolError` and ignores.

## Client → Server (`GameAction`)

A discriminated union keyed by `kind`.

| `kind`             | Payload (sketch)                                  | Notes |
|--------------------|---------------------------------------------------|-------|
| `CreateRoom`       | `{ nickname }`                                    | Server returns `RoomCreated` event with code |
| `JoinRoom`         | `{ code, nickname }`                              | Server emits `RoomJoined` to caller, `PlayerJoined` to room |
| `LeaveRoom`        | `{}`                                              | |
| `SetReady`         | `{ ready: bool }`                                 | All-ready → server starts game |
| `MoveToken`        | `{}`                                              | Move forward 1; server resolves slot |
| `DrawCard`         | `{}`                                              | Costs 3 poo; server validates |
| `PlayCard`         | `{ cardId, target? }`                             | Special-card effect resolved server-side |
| `OfferTrade`       | `{ to, give: {cards, poo}, request: {cards, poo}}`| Awaits acceptance |
| `RespondToTrade`   | `{ tradeId, accept }`                             | |
| `DeclareCompletion`| `{ kind: 'bagino' \| 'bagina', cardIds }`         | Server validates set |
| `EndTurn`          | `{}`                                              | |
| `Resync`           | `{ lastEventId }`                                 | Reconnect path: server replays |

## Server → Client (`ServerEvent`)

Also a discriminated union keyed by `kind`. All events carry a monotonically-increasing `eventId` per room for resync.

| `kind`               | Payload (sketch)                              |
|----------------------|-----------------------------------------------|
| `RoomCreated`        | `{ code, you }`                               |
| `RoomJoined`         | `{ code, players, you }`                      |
| `PlayerJoined`       | `{ player }`                                  |
| `PlayerLeft`         | `{ playerId }`                                |
| `GameStarted`        | `{ snapshot }`                                |
| `StateSnapshot`      | `{ public, private, legalActions }`           |
| `TurnAdvanced`       | `{ activePlayerId }`                          |
| `TokenMoved`         | `{ playerId, fromSlot, toSlot }`              |
| `PooAwarded`         | `{ playerId, amount, reason }`                |
| `CardDrawn`          | `{ playerId, cardId? }` (cardId only to owner)|
| `CardPlayed`         | `{ playerId, cardId, effect }`                |
| `TradeOffered`       | `{ tradeId, from, to, terms }`                |
| `TradeResolved`      | `{ tradeId, accepted }`                       |
| `CompletionDeclared` | `{ playerId, kind, cards }`                   |
| `EventCardTriggered` | `{ card, perPlayerEffect }`                   |
| `HomeworkRevealed`   | `{ template, satisfaction }`                  |
| `GameEnded`          | `{ scores, winnerId }`                        |
| `ProtocolError`      | `{ message, action? }`                        |

## Resync

On reconnect:

1. Client sends `Resync(lastEventId)`.
2. Server replays all events with `eventId > lastEventId`.
3. If the room's snapshot is older than the client's `lastEventId` (impossible normally, but defensive), server emits a fresh `StateSnapshot` and a `Resynced` marker.
