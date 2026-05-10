import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../net/socket.dart';
import '../wire/wire.dart';

/// Long-lived socket — created once at app start.
final socketProvider = Provider<BaginaSocket>((ref) {
  final s = BaginaSocket.connect();
  ref.onDispose(s.close);
  return s;
});

/// Live connection status (true while connected to the server).
final connectionStatusProvider = StreamProvider<bool>((ref) {
  final socket = ref.watch(socketProvider);
  return socket.connectionChanges;
});

/// Latest in-room state. Resets to null when the player isn't in a room.
class GameStateSnapshot {
  final String code;
  final RoomPhase phase;
  final List<PublicPlayer> players;
  final String? activePlayerId;
  final int turnsRemaining;
  final int deckRemaining;
  final List<GameCard> hand;
  final List<HomeworkHint> homeworkHints;
  final String? homeworkRevealed;
  final List<LegalActionKind> legalActions;
  final String youId;

  const GameStateSnapshot({
    required this.code,
    required this.phase,
    required this.players,
    required this.activePlayerId,
    required this.turnsRemaining,
    required this.deckRemaining,
    required this.hand,
    required this.homeworkHints,
    required this.homeworkRevealed,
    required this.legalActions,
    required this.youId,
  });

  PublicPlayer? get me {
    for (final p in players) {
      if (p.id == youId) return p;
    }
    return null;
  }

  bool get isMyTurn => activePlayerId == youId;
}

class GameStateNotifier extends StateNotifier<GameStateSnapshot?> {
  GameStateNotifier(this.socket) : super(null) {
    _sub = socket.events.listen(_onEvent);
  }

  final BaginaSocket socket;
  late final dynamic _sub;
  String? _youId;
  GameEndedEvent? _lastEnded;
  HomeworkRevealedEvent? _lastHomeworkReveal;

  String? get currentRoomCode => state?.code;
  String? get youId => _youId;
  GameEndedEvent? get lastEnded => _lastEnded;
  HomeworkRevealedEvent? get lastHomeworkReveal => _lastHomeworkReveal;

  void _onEvent(ServerEvent event) {
    switch (event) {
      case RoomCreatedEvent():
        _youId = event.you;
        break;
      case RoomJoinedEvent():
        _youId = event.you;
        state = _stateFrom(event.state, event.privateView, const []);
        break;
      case StateSnapshotEvent():
        state = _stateFrom(event.state, event.privateView, event.legalActions);
        break;
      case GameStartedEvent():
        if (state != null) {
          state = state!._withPublic(event.state);
        }
        break;
      case GameEndedEvent():
        _lastEnded = event;
        break;
      case HomeworkRevealedEvent():
        _lastHomeworkReveal = event;
        break;
      case PlayerLeftEvent() when state?.activePlayerId == event.playerId:
        // Nothing to do — server will send a fresh snapshot.
        break;
      default:
        break;
    }
  }

  GameStateSnapshot _stateFrom(PublicGameState g, PrivatePlayerView priv, List<LegalActionKind> legal) {
    return GameStateSnapshot(
      code: g.code,
      phase: g.phase,
      players: g.players,
      activePlayerId: g.activePlayerId,
      turnsRemaining: g.turnsRemaining,
      deckRemaining: g.deckRemaining,
      hand: priv.hand,
      homeworkHints: priv.homeworkHints,
      homeworkRevealed: priv.homeworkRevealed,
      legalActions: legal,
      youId: _youId ?? '',
    );
  }

  void leaveRoom() {
    socket.send(const LeaveRoomAction());
    state = null;
  }

  @override
  void dispose() {
    _sub.cancel();
    super.dispose();
  }
}

extension on GameStateSnapshot {
  GameStateSnapshot _withPublic(PublicGameState g) {
    return GameStateSnapshot(
      code: g.code,
      phase: g.phase,
      players: g.players,
      activePlayerId: g.activePlayerId,
      turnsRemaining: g.turnsRemaining,
      deckRemaining: g.deckRemaining,
      hand: hand,
      homeworkHints: homeworkHints,
      homeworkRevealed: homeworkRevealed,
      legalActions: legalActions,
      youId: youId,
    );
  }
}

final gameStateProvider = StateNotifierProvider<GameStateNotifier, GameStateSnapshot?>((ref) {
  final socket = ref.watch(socketProvider);
  return GameStateNotifier(socket);
});
