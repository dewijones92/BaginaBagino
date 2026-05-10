// GENERATED FILE — do not edit by hand.
// Source of truth: packages/schema/src/*.ts (Zod).
// Regenerate with: pnpm --filter @bagina/schema run gen
// ignore_for_file: type=lint

enum ResourceCardKind {
  tooth,
  paw,
  snout,
  tit,
}

ResourceCardKind ResourceCardKindFromJson(String s) {
  switch (s) {
    case 'Tooth': return ResourceCardKind.tooth;
    case 'Paw': return ResourceCardKind.paw;
    case 'Snout': return ResourceCardKind.snout;
    case 'Tit': return ResourceCardKind.tit;
    default: throw StateError('Unknown ResourceCardKind: $s');
  }
}
String ResourceCardKindToJson(ResourceCardKind v) {
  switch (v) {
    case ResourceCardKind.tooth: return 'Tooth';
    case ResourceCardKind.paw: return 'Paw';
    case ResourceCardKind.snout: return 'Snout';
    case ResourceCardKind.tit: return 'Tit';
  }
}

enum SpecialCardKind {
  clever,
  brave,
  business,
}

SpecialCardKind SpecialCardKindFromJson(String s) {
  switch (s) {
    case 'Clever': return SpecialCardKind.clever;
    case 'Brave': return SpecialCardKind.brave;
    case 'Business': return SpecialCardKind.business;
    default: throw StateError('Unknown SpecialCardKind: $s');
  }
}
String SpecialCardKindToJson(SpecialCardKind v) {
  switch (v) {
    case SpecialCardKind.clever: return 'Clever';
    case SpecialCardKind.brave: return 'Brave';
    case SpecialCardKind.business: return 'Business';
  }
}

enum EventCardKind {
  rainyDay,
  marketDay,
  wind,
}

EventCardKind EventCardKindFromJson(String s) {
  switch (s) {
    case 'RainyDay': return EventCardKind.rainyDay;
    case 'MarketDay': return EventCardKind.marketDay;
    case 'Wind': return EventCardKind.wind;
    default: throw StateError('Unknown EventCardKind: $s');
  }
}
String EventCardKindToJson(EventCardKind v) {
  switch (v) {
    case EventCardKind.rainyDay: return 'RainyDay';
    case EventCardKind.marketDay: return 'MarketDay';
    case EventCardKind.wind: return 'Wind';
  }
}

enum Day {
  mon,
  tue,
  wed,
  thu,
  fri,
}

Day DayFromJson(String s) {
  switch (s) {
    case 'Mon': return Day.mon;
    case 'Tue': return Day.tue;
    case 'Wed': return Day.wed;
    case 'Thu': return Day.thu;
    case 'Fri': return Day.fri;
    default: throw StateError('Unknown Day: $s');
  }
}
String DayToJson(Day v) {
  switch (v) {
    case Day.mon: return 'Mon';
    case Day.tue: return 'Tue';
    case Day.wed: return 'Wed';
    case Day.thu: return 'Thu';
    case Day.fri: return 'Fri';
  }
}

enum PlayerColor {
  pink,
  mint,
  lavender,
  butter,
}

PlayerColor PlayerColorFromJson(String s) {
  switch (s) {
    case 'pink': return PlayerColor.pink;
    case 'mint': return PlayerColor.mint;
    case 'lavender': return PlayerColor.lavender;
    case 'butter': return PlayerColor.butter;
    default: throw StateError('Unknown PlayerColor: $s');
  }
}
String PlayerColorToJson(PlayerColor v) {
  switch (v) {
    case PlayerColor.pink: return 'pink';
    case PlayerColor.mint: return 'mint';
    case PlayerColor.lavender: return 'lavender';
    case PlayerColor.butter: return 'butter';
  }
}

enum RoomPhase {
  lobby,
  playing,
  finished,
}

RoomPhase RoomPhaseFromJson(String s) {
  switch (s) {
    case 'lobby': return RoomPhase.lobby;
    case 'playing': return RoomPhase.playing;
    case 'finished': return RoomPhase.finished;
    default: throw StateError('Unknown RoomPhase: $s');
  }
}
String RoomPhaseToJson(RoomPhase v) {
  switch (v) {
    case RoomPhase.lobby: return 'lobby';
    case RoomPhase.playing: return 'playing';
    case RoomPhase.finished: return 'finished';
  }
}

enum CompletionKind {
  bagino,
  bagina,
}

CompletionKind CompletionKindFromJson(String s) {
  switch (s) {
    case 'bagino': return CompletionKind.bagino;
    case 'bagina': return CompletionKind.bagina;
    default: throw StateError('Unknown CompletionKind: $s');
  }
}
String CompletionKindToJson(CompletionKind v) {
  switch (v) {
    case CompletionKind.bagino: return 'bagino';
    case CompletionKind.bagina: return 'bagina';
  }
}

enum PartialKind {
  brood,
  latch,
}

PartialKind PartialKindFromJson(String s) {
  switch (s) {
    case 'brood': return PartialKind.brood;
    case 'latch': return PartialKind.latch;
    default: throw StateError('Unknown PartialKind: $s');
  }
}
String PartialKindToJson(PartialKind v) {
  switch (v) {
    case PartialKind.brood: return 'brood';
    case PartialKind.latch: return 'latch';
  }
}

enum LegalActionKind {
  moveToken,
  drawCard,
  playCard,
  offerTrade,
  respondTrade,
  declareCompletion,
  endTurn,
}

LegalActionKind LegalActionKindFromJson(String s) {
  switch (s) {
    case 'MoveToken': return LegalActionKind.moveToken;
    case 'DrawCard': return LegalActionKind.drawCard;
    case 'PlayCard': return LegalActionKind.playCard;
    case 'OfferTrade': return LegalActionKind.offerTrade;
    case 'RespondTrade': return LegalActionKind.respondTrade;
    case 'DeclareCompletion': return LegalActionKind.declareCompletion;
    case 'EndTurn': return LegalActionKind.endTurn;
    default: throw StateError('Unknown LegalActionKind: $s');
  }
}
String LegalActionKindToJson(LegalActionKind v) {
  switch (v) {
    case LegalActionKind.moveToken: return 'MoveToken';
    case LegalActionKind.drawCard: return 'DrawCard';
    case LegalActionKind.playCard: return 'PlayCard';
    case LegalActionKind.offerTrade: return 'OfferTrade';
    case LegalActionKind.respondTrade: return 'RespondTrade';
    case LegalActionKind.declareCompletion: return 'DeclareCompletion';
    case LegalActionKind.endTurn: return 'EndTurn';
  }
}

enum PooReason {
  slot,
  business,
  event,
}

PooReason PooReasonFromJson(String s) {
  switch (s) {
    case 'slot': return PooReason.slot;
    case 'business': return PooReason.business;
    case 'event': return PooReason.event;
    default: throw StateError('Unknown PooReason: $s');
  }
}
String PooReasonToJson(PooReason v) {
  switch (v) {
    case PooReason.slot: return 'slot';
    case PooReason.business: return 'business';
    case PooReason.event: return 'event';
  }
}

enum CardKind {
  tooth,
  paw,
  snout,
  tit,
  clever,
  brave,
  business,
  rainyDay,
  marketDay,
  wind,
}

CardKind CardKindFromJson(String s) {
  switch (s) {
    case 'Tooth': return CardKind.tooth;
    case 'Paw': return CardKind.paw;
    case 'Snout': return CardKind.snout;
    case 'Tit': return CardKind.tit;
    case 'Clever': return CardKind.clever;
    case 'Brave': return CardKind.brave;
    case 'Business': return CardKind.business;
    case 'RainyDay': return CardKind.rainyDay;
    case 'MarketDay': return CardKind.marketDay;
    case 'Wind': return CardKind.wind;
    default: throw StateError('Unknown CardKind: $s');
  }
}
String CardKindToJson(CardKind v) {
  switch (v) {
    case CardKind.tooth: return 'Tooth';
    case CardKind.paw: return 'Paw';
    case CardKind.snout: return 'Snout';
    case CardKind.tit: return 'Tit';
    case CardKind.clever: return 'Clever';
    case CardKind.brave: return 'Brave';
    case CardKind.business: return 'Business';
    case CardKind.rainyDay: return 'RainyDay';
    case CardKind.marketDay: return 'MarketDay';
    case CardKind.wind: return 'Wind';
  }
}

class Card {
  final String id;
  final CardKind kind;

  const Card({
    required this.id,
    required this.kind,
  });

  factory Card.fromJson(Map<String, dynamic> json) => Card(
    id: json['id'] as String,
    kind: CardKindFromJson(json['kind'] as String),
  );

  Map<String, dynamic> toJson() => {
    'id': this.id,
    'kind': this.kind == null ? null : CardKindToJson(this.kind!),
  };
}

class PublicPlayer {
  final String id;
  final String nickname;
  final PlayerColor color;
  final int slot;
  final int poo;
  final int handCount;
  final List<CompletionKind> completed;
  final bool ready;
  final bool online;

  const PublicPlayer({
    required this.id,
    required this.nickname,
    required this.color,
    required this.slot,
    required this.poo,
    required this.handCount,
    required this.completed,
    required this.ready,
    required this.online,
  });

  factory PublicPlayer.fromJson(Map<String, dynamic> json) => PublicPlayer(
    id: json['id'] as String,
    nickname: json['nickname'] as String,
    color: PlayerColorFromJson(json['color'] as String),
    slot: (json['slot'] as num).toInt(),
    poo: (json['poo'] as num).toInt(),
    handCount: (json['handCount'] as num).toInt(),
    completed: (json['completed'] as List).map((e) => CompletionKindFromJson(e as String)).toList(),
    ready: json['ready'] as bool,
    online: json['online'] as bool,
  );

  Map<String, dynamic> toJson() => {
    'id': this.id,
    'nickname': this.nickname,
    'color': this.color == null ? null : PlayerColorToJson(this.color!),
    'slot': this.slot,
    'poo': this.poo,
    'handCount': this.handCount,
    'completed': this.completed.map((e) => CompletionKindToJson(e)).toList(),
    'ready': this.ready,
    'online': this.online,
  };
}

class PublicGameState {
  final String code;
  final RoomPhase phase;
  final List<PublicPlayer> players;
  final String? activePlayerId;
  final int turnsRemaining;
  final int deckRemaining;
  final int lastEventId;

  const PublicGameState({
    required this.code,
    required this.phase,
    required this.players,
    this.activePlayerId,
    required this.turnsRemaining,
    required this.deckRemaining,
    required this.lastEventId,
  });

  factory PublicGameState.fromJson(Map<String, dynamic> json) => PublicGameState(
    code: json['code'] as String,
    phase: RoomPhaseFromJson(json['phase'] as String),
    players: (json['players'] as List).map((e) => PublicPlayer.fromJson(e as Map<String, dynamic>)).toList(),
    activePlayerId: json['activePlayerId'] == null ? null : json['activePlayerId'] as String,
    turnsRemaining: (json['turnsRemaining'] as num).toInt(),
    deckRemaining: (json['deckRemaining'] as num).toInt(),
    lastEventId: (json['lastEventId'] as num).toInt(),
  );

  Map<String, dynamic> toJson() => {
    'code': this.code,
    'phase': this.phase == null ? null : RoomPhaseToJson(this.phase!),
    'players': this.players.map((e) => e.toJson()).toList(),
    'activePlayerId': this.activePlayerId,
    'turnsRemaining': this.turnsRemaining,
    'deckRemaining': this.deckRemaining,
    'lastEventId': this.lastEventId,
  };
}

class PrivatePlayerView {
  final List<Card> hand;
  final List<HomeworkHint> homeworkHints;
  final String? homeworkRevealed;

  const PrivatePlayerView({
    required this.hand,
    required this.homeworkHints,
    this.homeworkRevealed,
  });

  factory PrivatePlayerView.fromJson(Map<String, dynamic> json) => PrivatePlayerView(
    hand: (json['hand'] as List).map((e) => Card.fromJson(e as Map<String, dynamic>)).toList(),
    homeworkHints: (json['homeworkHints'] as List).map((e) => HomeworkHint.fromJson(e as Map<String, dynamic>)).toList(),
    homeworkRevealed: json['homeworkRevealed'] == null ? null : json['homeworkRevealed'] as String,
  );

  Map<String, dynamic> toJson() => {
    'hand': this.hand.map((e) => e.toJson()).toList(),
    'homeworkHints': this.homeworkHints.map((e) => e.toJson()).toList(),
    'homeworkRevealed': this.homeworkRevealed,
  };
}

class HomeworkHint {
  final String topic;
  final String text;

  const HomeworkHint({
    required this.topic,
    required this.text,
  });

  factory HomeworkHint.fromJson(Map<String, dynamic> json) => HomeworkHint(
    topic: json['topic'] as String,
    text: json['text'] as String,
  );

  Map<String, dynamic> toJson() => {
    'topic': this.topic,
    'text': this.text,
  };
}

class TradeOffer {
  final String tradeId;
  final String from;
  final String to;
  final List<String> giveCardIds;
  final int givePoo;
  final List<String> requestCardIds;
  final int requestPoo;

  const TradeOffer({
    required this.tradeId,
    required this.from,
    required this.to,
    required this.giveCardIds,
    required this.givePoo,
    required this.requestCardIds,
    required this.requestPoo,
  });

  factory TradeOffer.fromJson(Map<String, dynamic> json) => TradeOffer(
    tradeId: json['tradeId'] as String,
    from: json['from'] as String,
    to: json['to'] as String,
    giveCardIds: List<String>.from(json['giveCardIds'] as List),
    givePoo: (json['givePoo'] as num).toInt(),
    requestCardIds: List<String>.from(json['requestCardIds'] as List),
    requestPoo: (json['requestPoo'] as num).toInt(),
  );

  Map<String, dynamic> toJson() => {
    'tradeId': this.tradeId,
    'from': this.from,
    'to': this.to,
    'giveCardIds': this.giveCardIds,
    'givePoo': this.givePoo,
    'requestCardIds': this.requestCardIds,
    'requestPoo': this.requestPoo,
  };
}

class PlayerScore {
  final String playerId;
  final int baginos;
  final int baginas;
  final int broods;
  final int latches;
  final int homeworkBonus;
  final int total;

  const PlayerScore({
    required this.playerId,
    required this.baginos,
    required this.baginas,
    required this.broods,
    required this.latches,
    required this.homeworkBonus,
    required this.total,
  });

  factory PlayerScore.fromJson(Map<String, dynamic> json) => PlayerScore(
    playerId: json['playerId'] as String,
    baginos: (json['baginos'] as num).toInt(),
    baginas: (json['baginas'] as num).toInt(),
    broods: (json['broods'] as num).toInt(),
    latches: (json['latches'] as num).toInt(),
    homeworkBonus: (json['homeworkBonus'] as num).toInt(),
    total: (json['total'] as num).toInt(),
  );

  Map<String, dynamic> toJson() => {
    'playerId': this.playerId,
    'baginos': this.baginos,
    'baginas': this.baginas,
    'broods': this.broods,
    'latches': this.latches,
    'homeworkBonus': this.homeworkBonus,
    'total': this.total,
  };
}

sealed class GameAction {
  const GameAction();
  String get kind;
  Map<String, dynamic> toJson();
  factory GameAction.fromJson(Map<String, dynamic> json) {
    final k = json['kind'] as String;
    switch (k) {
      case 'CreateRoom': return CreateRoomAction.fromJson(json);
      case 'JoinRoom': return JoinRoomAction.fromJson(json);
      case 'LeaveRoom': return LeaveRoomAction.fromJson(json);
      case 'SetReady': return SetReadyAction.fromJson(json);
      case 'MoveToken': return MoveTokenAction.fromJson(json);
      case 'DrawCard': return DrawCardAction.fromJson(json);
      case 'PlayCard': return PlayCardAction.fromJson(json);
      case 'OfferTrade': return OfferTradeAction.fromJson(json);
      case 'RespondTrade': return RespondTradeAction.fromJson(json);
      case 'DeclareCompletion': return DeclareCompletionAction.fromJson(json);
      case 'EndTurn': return EndTurnAction.fromJson(json);
      case 'Resync': return ResyncAction.fromJson(json);
      default: throw StateError('Unknown GameAction kind: $k');
    }
  }
}

final class CreateRoomAction extends GameAction {
  final String nickname;

  const CreateRoomAction({
    required this.nickname,
  });

  @override
  String get kind => 'CreateRoom';

  factory CreateRoomAction.fromJson(Map<String, dynamic> json) => CreateRoomAction(
    nickname: json['nickname'] as String,
  );

  @override
  Map<String, dynamic> toJson() => {
    'kind': 'CreateRoom',
    'nickname': this.nickname,
  };
}

final class JoinRoomAction extends GameAction {
  final String code;
  final String nickname;

  const JoinRoomAction({
    required this.code,
    required this.nickname,
  });

  @override
  String get kind => 'JoinRoom';

  factory JoinRoomAction.fromJson(Map<String, dynamic> json) => JoinRoomAction(
    code: json['code'] as String,
    nickname: json['nickname'] as String,
  );

  @override
  Map<String, dynamic> toJson() => {
    'kind': 'JoinRoom',
    'code': this.code,
    'nickname': this.nickname,
  };
}

final class LeaveRoomAction extends GameAction {

  const LeaveRoomAction({
  });

  @override
  String get kind => 'LeaveRoom';

  factory LeaveRoomAction.fromJson(Map<String, dynamic> json) => LeaveRoomAction(
  );

  @override
  Map<String, dynamic> toJson() => {
    'kind': 'LeaveRoom',
  };
}

final class SetReadyAction extends GameAction {
  final bool ready;

  const SetReadyAction({
    required this.ready,
  });

  @override
  String get kind => 'SetReady';

  factory SetReadyAction.fromJson(Map<String, dynamic> json) => SetReadyAction(
    ready: json['ready'] as bool,
  );

  @override
  Map<String, dynamic> toJson() => {
    'kind': 'SetReady',
    'ready': this.ready,
  };
}

final class MoveTokenAction extends GameAction {

  const MoveTokenAction({
  });

  @override
  String get kind => 'MoveToken';

  factory MoveTokenAction.fromJson(Map<String, dynamic> json) => MoveTokenAction(
  );

  @override
  Map<String, dynamic> toJson() => {
    'kind': 'MoveToken',
  };
}

final class DrawCardAction extends GameAction {

  const DrawCardAction({
  });

  @override
  String get kind => 'DrawCard';

  factory DrawCardAction.fromJson(Map<String, dynamic> json) => DrawCardAction(
  );

  @override
  Map<String, dynamic> toJson() => {
    'kind': 'DrawCard',
  };
}

final class PlayCardAction extends GameAction {
  final String cardId;
  final String? targetPlayerId;

  const PlayCardAction({
    required this.cardId,
    this.targetPlayerId,
  });

  @override
  String get kind => 'PlayCard';

  factory PlayCardAction.fromJson(Map<String, dynamic> json) => PlayCardAction(
    cardId: json['cardId'] as String,
    targetPlayerId: json['targetPlayerId'] == null ? null : json['targetPlayerId'] as String,
  );

  @override
  Map<String, dynamic> toJson() => {
    'kind': 'PlayCard',
    'cardId': this.cardId,
    'targetPlayerId': this.targetPlayerId,
  };
}

final class OfferTradeAction extends GameAction {
  final String to;
  final List<String> giveCardIds;
  final int givePoo;
  final List<String> requestCardIds;
  final int requestPoo;

  const OfferTradeAction({
    required this.to,
    required this.giveCardIds,
    required this.givePoo,
    required this.requestCardIds,
    required this.requestPoo,
  });

  @override
  String get kind => 'OfferTrade';

  factory OfferTradeAction.fromJson(Map<String, dynamic> json) => OfferTradeAction(
    to: json['to'] as String,
    giveCardIds: List<String>.from(json['giveCardIds'] as List),
    givePoo: (json['givePoo'] as num).toInt(),
    requestCardIds: List<String>.from(json['requestCardIds'] as List),
    requestPoo: (json['requestPoo'] as num).toInt(),
  );

  @override
  Map<String, dynamic> toJson() => {
    'kind': 'OfferTrade',
    'to': this.to,
    'giveCardIds': this.giveCardIds,
    'givePoo': this.givePoo,
    'requestCardIds': this.requestCardIds,
    'requestPoo': this.requestPoo,
  };
}

final class RespondTradeAction extends GameAction {
  final String tradeId;
  final bool accept;

  const RespondTradeAction({
    required this.tradeId,
    required this.accept,
  });

  @override
  String get kind => 'RespondTrade';

  factory RespondTradeAction.fromJson(Map<String, dynamic> json) => RespondTradeAction(
    tradeId: json['tradeId'] as String,
    accept: json['accept'] as bool,
  );

  @override
  Map<String, dynamic> toJson() => {
    'kind': 'RespondTrade',
    'tradeId': this.tradeId,
    'accept': this.accept,
  };
}

final class DeclareCompletionAction extends GameAction {
  final CompletionKind what;
  final List<String> cardIds;

  const DeclareCompletionAction({
    required this.what,
    required this.cardIds,
  });

  @override
  String get kind => 'DeclareCompletion';

  factory DeclareCompletionAction.fromJson(Map<String, dynamic> json) => DeclareCompletionAction(
    what: CompletionKindFromJson(json['what'] as String),
    cardIds: List<String>.from(json['cardIds'] as List),
  );

  @override
  Map<String, dynamic> toJson() => {
    'kind': 'DeclareCompletion',
    'what': this.what == null ? null : CompletionKindToJson(this.what!),
    'cardIds': this.cardIds,
  };
}

final class EndTurnAction extends GameAction {

  const EndTurnAction({
  });

  @override
  String get kind => 'EndTurn';

  factory EndTurnAction.fromJson(Map<String, dynamic> json) => EndTurnAction(
  );

  @override
  Map<String, dynamic> toJson() => {
    'kind': 'EndTurn',
  };
}

final class ResyncAction extends GameAction {
  final int lastEventId;

  const ResyncAction({
    required this.lastEventId,
  });

  @override
  String get kind => 'Resync';

  factory ResyncAction.fromJson(Map<String, dynamic> json) => ResyncAction(
    lastEventId: (json['lastEventId'] as num).toInt(),
  );

  @override
  Map<String, dynamic> toJson() => {
    'kind': 'Resync',
    'lastEventId': this.lastEventId,
  };
}

sealed class ServerEvent {
  const ServerEvent();
  String get kind;
  Map<String, dynamic> toJson();
  factory ServerEvent.fromJson(Map<String, dynamic> json) {
    final k = json['kind'] as String;
    switch (k) {
      case 'RoomCreated': return RoomCreatedEvent.fromJson(json);
      case 'RoomJoined': return RoomJoinedEvent.fromJson(json);
      case 'PlayerJoined': return PlayerJoinedEvent.fromJson(json);
      case 'PlayerLeft': return PlayerLeftEvent.fromJson(json);
      case 'PlayerReadyChanged': return PlayerReadyChangedEvent.fromJson(json);
      case 'GameStarted': return GameStartedEvent.fromJson(json);
      case 'StateSnapshot': return StateSnapshotEvent.fromJson(json);
      case 'TurnAdvanced': return TurnAdvancedEvent.fromJson(json);
      case 'TokenMoved': return TokenMovedEvent.fromJson(json);
      case 'PooAwarded': return PooAwardedEvent.fromJson(json);
      case 'CardDrawn': return CardDrawnEvent.fromJson(json);
      case 'CardPlayed': return CardPlayedEvent.fromJson(json);
      case 'TradeOffered': return TradeOfferedEvent.fromJson(json);
      case 'TradeResolved': return TradeResolvedEvent.fromJson(json);
      case 'CompletionDeclared': return CompletionDeclaredEvent.fromJson(json);
      case 'EventCardTriggered': return EventCardTriggeredEvent.fromJson(json);
      case 'HomeworkHintGained': return HomeworkHintGainedEvent.fromJson(json);
      case 'HomeworkRevealed': return HomeworkRevealedEvent.fromJson(json);
      case 'GameEnded': return GameEndedEvent.fromJson(json);
      case 'ProtocolError': return ProtocolErrorEvent.fromJson(json);
      default: throw StateError('Unknown ServerEvent kind: $k');
    }
  }
}

final class RoomCreatedEvent extends ServerEvent {
  final int eventId;
  final String code;
  final String you;

  const RoomCreatedEvent({
    required this.eventId,
    required this.code,
    required this.you,
  });

  @override
  String get kind => 'RoomCreated';

  factory RoomCreatedEvent.fromJson(Map<String, dynamic> json) => RoomCreatedEvent(
    eventId: (json['eventId'] as num).toInt(),
    code: json['code'] as String,
    you: json['you'] as String,
  );

  @override
  Map<String, dynamic> toJson() => {
    'kind': 'RoomCreated',
    'eventId': this.eventId,
    'code': this.code,
    'you': this.you,
  };
}

final class RoomJoinedEvent extends ServerEvent {
  final int eventId;
  final PublicGameState state;
  final String you;
  final PrivatePlayerView privateView;

  const RoomJoinedEvent({
    required this.eventId,
    required this.state,
    required this.you,
    required this.privateView,
  });

  @override
  String get kind => 'RoomJoined';

  factory RoomJoinedEvent.fromJson(Map<String, dynamic> json) => RoomJoinedEvent(
    eventId: (json['eventId'] as num).toInt(),
    state: PublicGameState.fromJson(json['state'] as Map<String, dynamic>),
    you: json['you'] as String,
    privateView: PrivatePlayerView.fromJson(json['privateView'] as Map<String, dynamic>),
  );

  @override
  Map<String, dynamic> toJson() => {
    'kind': 'RoomJoined',
    'eventId': this.eventId,
    'state': this.state.toJson(),
    'you': this.you,
    'privateView': this.privateView.toJson(),
  };
}

final class PlayerJoinedEvent extends ServerEvent {
  final int eventId;
  final PublicPlayer player;

  const PlayerJoinedEvent({
    required this.eventId,
    required this.player,
  });

  @override
  String get kind => 'PlayerJoined';

  factory PlayerJoinedEvent.fromJson(Map<String, dynamic> json) => PlayerJoinedEvent(
    eventId: (json['eventId'] as num).toInt(),
    player: PublicPlayer.fromJson(json['player'] as Map<String, dynamic>),
  );

  @override
  Map<String, dynamic> toJson() => {
    'kind': 'PlayerJoined',
    'eventId': this.eventId,
    'player': this.player.toJson(),
  };
}

final class PlayerLeftEvent extends ServerEvent {
  final int eventId;
  final String playerId;

  const PlayerLeftEvent({
    required this.eventId,
    required this.playerId,
  });

  @override
  String get kind => 'PlayerLeft';

  factory PlayerLeftEvent.fromJson(Map<String, dynamic> json) => PlayerLeftEvent(
    eventId: (json['eventId'] as num).toInt(),
    playerId: json['playerId'] as String,
  );

  @override
  Map<String, dynamic> toJson() => {
    'kind': 'PlayerLeft',
    'eventId': this.eventId,
    'playerId': this.playerId,
  };
}

final class PlayerReadyChangedEvent extends ServerEvent {
  final int eventId;
  final String playerId;
  final bool ready;

  const PlayerReadyChangedEvent({
    required this.eventId,
    required this.playerId,
    required this.ready,
  });

  @override
  String get kind => 'PlayerReadyChanged';

  factory PlayerReadyChangedEvent.fromJson(Map<String, dynamic> json) => PlayerReadyChangedEvent(
    eventId: (json['eventId'] as num).toInt(),
    playerId: json['playerId'] as String,
    ready: json['ready'] as bool,
  );

  @override
  Map<String, dynamic> toJson() => {
    'kind': 'PlayerReadyChanged',
    'eventId': this.eventId,
    'playerId': this.playerId,
    'ready': this.ready,
  };
}

final class GameStartedEvent extends ServerEvent {
  final int eventId;
  final PublicGameState state;

  const GameStartedEvent({
    required this.eventId,
    required this.state,
  });

  @override
  String get kind => 'GameStarted';

  factory GameStartedEvent.fromJson(Map<String, dynamic> json) => GameStartedEvent(
    eventId: (json['eventId'] as num).toInt(),
    state: PublicGameState.fromJson(json['state'] as Map<String, dynamic>),
  );

  @override
  Map<String, dynamic> toJson() => {
    'kind': 'GameStarted',
    'eventId': this.eventId,
    'state': this.state.toJson(),
  };
}

final class StateSnapshotEvent extends ServerEvent {
  final int eventId;
  final PublicGameState state;
  final PrivatePlayerView privateView;
  final List<LegalActionKind> legalActions;

  const StateSnapshotEvent({
    required this.eventId,
    required this.state,
    required this.privateView,
    required this.legalActions,
  });

  @override
  String get kind => 'StateSnapshot';

  factory StateSnapshotEvent.fromJson(Map<String, dynamic> json) => StateSnapshotEvent(
    eventId: (json['eventId'] as num).toInt(),
    state: PublicGameState.fromJson(json['state'] as Map<String, dynamic>),
    privateView: PrivatePlayerView.fromJson(json['privateView'] as Map<String, dynamic>),
    legalActions: (json['legalActions'] as List).map((e) => LegalActionKindFromJson(e as String)).toList(),
  );

  @override
  Map<String, dynamic> toJson() => {
    'kind': 'StateSnapshot',
    'eventId': this.eventId,
    'state': this.state.toJson(),
    'privateView': this.privateView.toJson(),
    'legalActions': this.legalActions.map((e) => LegalActionKindToJson(e)).toList(),
  };
}

final class TurnAdvancedEvent extends ServerEvent {
  final int eventId;
  final String activePlayerId;
  final int turnsRemaining;

  const TurnAdvancedEvent({
    required this.eventId,
    required this.activePlayerId,
    required this.turnsRemaining,
  });

  @override
  String get kind => 'TurnAdvanced';

  factory TurnAdvancedEvent.fromJson(Map<String, dynamic> json) => TurnAdvancedEvent(
    eventId: (json['eventId'] as num).toInt(),
    activePlayerId: json['activePlayerId'] as String,
    turnsRemaining: (json['turnsRemaining'] as num).toInt(),
  );

  @override
  Map<String, dynamic> toJson() => {
    'kind': 'TurnAdvanced',
    'eventId': this.eventId,
    'activePlayerId': this.activePlayerId,
    'turnsRemaining': this.turnsRemaining,
  };
}

final class TokenMovedEvent extends ServerEvent {
  final int eventId;
  final String playerId;
  final int fromSlot;
  final int toSlot;

  const TokenMovedEvent({
    required this.eventId,
    required this.playerId,
    required this.fromSlot,
    required this.toSlot,
  });

  @override
  String get kind => 'TokenMoved';

  factory TokenMovedEvent.fromJson(Map<String, dynamic> json) => TokenMovedEvent(
    eventId: (json['eventId'] as num).toInt(),
    playerId: json['playerId'] as String,
    fromSlot: (json['fromSlot'] as num).toInt(),
    toSlot: (json['toSlot'] as num).toInt(),
  );

  @override
  Map<String, dynamic> toJson() => {
    'kind': 'TokenMoved',
    'eventId': this.eventId,
    'playerId': this.playerId,
    'fromSlot': this.fromSlot,
    'toSlot': this.toSlot,
  };
}

final class PooAwardedEvent extends ServerEvent {
  final int eventId;
  final String playerId;
  final int amount;
  final PooReason reason;

  const PooAwardedEvent({
    required this.eventId,
    required this.playerId,
    required this.amount,
    required this.reason,
  });

  @override
  String get kind => 'PooAwarded';

  factory PooAwardedEvent.fromJson(Map<String, dynamic> json) => PooAwardedEvent(
    eventId: (json['eventId'] as num).toInt(),
    playerId: json['playerId'] as String,
    amount: (json['amount'] as num).toInt(),
    reason: PooReasonFromJson(json['reason'] as String),
  );

  @override
  Map<String, dynamic> toJson() => {
    'kind': 'PooAwarded',
    'eventId': this.eventId,
    'playerId': this.playerId,
    'amount': this.amount,
    'reason': this.reason == null ? null : PooReasonToJson(this.reason!),
  };
}

final class CardDrawnEvent extends ServerEvent {
  final int eventId;
  final String playerId;
  final Card? card;

  const CardDrawnEvent({
    required this.eventId,
    required this.playerId,
    this.card,
  });

  @override
  String get kind => 'CardDrawn';

  factory CardDrawnEvent.fromJson(Map<String, dynamic> json) => CardDrawnEvent(
    eventId: (json['eventId'] as num).toInt(),
    playerId: json['playerId'] as String,
    card: json['card'] == null ? null : Card.fromJson(json['card'] as Map<String, dynamic>),
  );

  @override
  Map<String, dynamic> toJson() => {
    'kind': 'CardDrawn',
    'eventId': this.eventId,
    'playerId': this.playerId,
    'card': this.card?.toJson(),
  };
}

final class CardPlayedEvent extends ServerEvent {
  final int eventId;
  final String playerId;
  final SpecialCardKind cardKind;

  const CardPlayedEvent({
    required this.eventId,
    required this.playerId,
    required this.cardKind,
  });

  @override
  String get kind => 'CardPlayed';

  factory CardPlayedEvent.fromJson(Map<String, dynamic> json) => CardPlayedEvent(
    eventId: (json['eventId'] as num).toInt(),
    playerId: json['playerId'] as String,
    cardKind: SpecialCardKindFromJson(json['cardKind'] as String),
  );

  @override
  Map<String, dynamic> toJson() => {
    'kind': 'CardPlayed',
    'eventId': this.eventId,
    'playerId': this.playerId,
    'cardKind': this.cardKind == null ? null : SpecialCardKindToJson(this.cardKind!),
  };
}

final class TradeOfferedEvent extends ServerEvent {
  final int eventId;
  final TradeOffer offer;

  const TradeOfferedEvent({
    required this.eventId,
    required this.offer,
  });

  @override
  String get kind => 'TradeOffered';

  factory TradeOfferedEvent.fromJson(Map<String, dynamic> json) => TradeOfferedEvent(
    eventId: (json['eventId'] as num).toInt(),
    offer: TradeOffer.fromJson(json['offer'] as Map<String, dynamic>),
  );

  @override
  Map<String, dynamic> toJson() => {
    'kind': 'TradeOffered',
    'eventId': this.eventId,
    'offer': this.offer.toJson(),
  };
}

final class TradeResolvedEvent extends ServerEvent {
  final int eventId;
  final String tradeId;
  final bool accepted;

  const TradeResolvedEvent({
    required this.eventId,
    required this.tradeId,
    required this.accepted,
  });

  @override
  String get kind => 'TradeResolved';

  factory TradeResolvedEvent.fromJson(Map<String, dynamic> json) => TradeResolvedEvent(
    eventId: (json['eventId'] as num).toInt(),
    tradeId: json['tradeId'] as String,
    accepted: json['accepted'] as bool,
  );

  @override
  Map<String, dynamic> toJson() => {
    'kind': 'TradeResolved',
    'eventId': this.eventId,
    'tradeId': this.tradeId,
    'accepted': this.accepted,
  };
}

final class CompletionDeclaredEvent extends ServerEvent {
  final int eventId;
  final String playerId;
  final CompletionKind what;

  const CompletionDeclaredEvent({
    required this.eventId,
    required this.playerId,
    required this.what,
  });

  @override
  String get kind => 'CompletionDeclared';

  factory CompletionDeclaredEvent.fromJson(Map<String, dynamic> json) => CompletionDeclaredEvent(
    eventId: (json['eventId'] as num).toInt(),
    playerId: json['playerId'] as String,
    what: CompletionKindFromJson(json['what'] as String),
  );

  @override
  Map<String, dynamic> toJson() => {
    'kind': 'CompletionDeclared',
    'eventId': this.eventId,
    'playerId': this.playerId,
    'what': this.what == null ? null : CompletionKindToJson(this.what!),
  };
}

final class EventCardTriggeredEvent extends ServerEvent {
  final int eventId;
  final EventCardKind card;

  const EventCardTriggeredEvent({
    required this.eventId,
    required this.card,
  });

  @override
  String get kind => 'EventCardTriggered';

  factory EventCardTriggeredEvent.fromJson(Map<String, dynamic> json) => EventCardTriggeredEvent(
    eventId: (json['eventId'] as num).toInt(),
    card: EventCardKindFromJson(json['card'] as String),
  );

  @override
  Map<String, dynamic> toJson() => {
    'kind': 'EventCardTriggered',
    'eventId': this.eventId,
    'card': this.card == null ? null : EventCardKindToJson(this.card!),
  };
}

final class HomeworkHintGainedEvent extends ServerEvent {
  final int eventId;
  final HomeworkHint hint;

  const HomeworkHintGainedEvent({
    required this.eventId,
    required this.hint,
  });

  @override
  String get kind => 'HomeworkHintGained';

  factory HomeworkHintGainedEvent.fromJson(Map<String, dynamic> json) => HomeworkHintGainedEvent(
    eventId: (json['eventId'] as num).toInt(),
    hint: HomeworkHint.fromJson(json['hint'] as Map<String, dynamic>),
  );

  @override
  Map<String, dynamic> toJson() => {
    'kind': 'HomeworkHintGained',
    'eventId': this.eventId,
    'hint': this.hint.toJson(),
  };
}

final class HomeworkRevealedEvent extends ServerEvent {
  final int eventId;
  final String templateId;
  final String description;

  const HomeworkRevealedEvent({
    required this.eventId,
    required this.templateId,
    required this.description,
  });

  @override
  String get kind => 'HomeworkRevealed';

  factory HomeworkRevealedEvent.fromJson(Map<String, dynamic> json) => HomeworkRevealedEvent(
    eventId: (json['eventId'] as num).toInt(),
    templateId: json['templateId'] as String,
    description: json['description'] as String,
  );

  @override
  Map<String, dynamic> toJson() => {
    'kind': 'HomeworkRevealed',
    'eventId': this.eventId,
    'templateId': this.templateId,
    'description': this.description,
  };
}

final class GameEndedEvent extends ServerEvent {
  final int eventId;
  final List<PlayerScore> scores;
  final List<String> winnerIds;

  const GameEndedEvent({
    required this.eventId,
    required this.scores,
    required this.winnerIds,
  });

  @override
  String get kind => 'GameEnded';

  factory GameEndedEvent.fromJson(Map<String, dynamic> json) => GameEndedEvent(
    eventId: (json['eventId'] as num).toInt(),
    scores: (json['scores'] as List).map((e) => PlayerScore.fromJson(e as Map<String, dynamic>)).toList(),
    winnerIds: List<String>.from(json['winnerIds'] as List),
  );

  @override
  Map<String, dynamic> toJson() => {
    'kind': 'GameEnded',
    'eventId': this.eventId,
    'scores': this.scores.map((e) => e.toJson()).toList(),
    'winnerIds': this.winnerIds,
  };
}

final class ProtocolErrorEvent extends ServerEvent {
  final int eventId;
  final String message;

  const ProtocolErrorEvent({
    required this.eventId,
    required this.message,
  });

  @override
  String get kind => 'ProtocolError';

  factory ProtocolErrorEvent.fromJson(Map<String, dynamic> json) => ProtocolErrorEvent(
    eventId: (json['eventId'] as num).toInt(),
    message: json['message'] as String,
  );

  @override
  Map<String, dynamic> toJson() => {
    'kind': 'ProtocolError',
    'eventId': this.eventId,
    'message': this.message,
  };
}
