import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:bagina/pages/results_page.dart';
import 'package:bagina/theme/app_theme.dart';
import 'package:bagina/wire/wire.dart';

PublicPlayer _player(String id, String name, PlayerColor color) => PublicPlayer(
      id: id,
      nickname: name,
      color: color,
      slot: 39,
      poo: 2,
      handCount: 0,
      completed: const [],
      ready: true,
      online: true,
    );

PlayerScore _score(String id, {int baginos = 0, int baginas = 0, int broods = 0, int latches = 0, int hw = 0, int total = 0}) =>
    PlayerScore(
      playerId: id,
      baginos: baginos,
      baginas: baginas,
      broods: broods,
      latches: latches,
      homeworkBonus: hw,
      total: total,
    );

GameEndedEvent _endedSingleWinner() => GameEndedEvent(
      eventId: 100,
      scores: [
        _score('P1', baginos: 1, hw: 10, total: 20),
        _score('P2', broods: 2, total: 10),
      ],
      winnerIds: ['P1'],
    );

GameEndedEvent _endedTie() => GameEndedEvent(
      eventId: 100,
      scores: [
        _score('P1', baginos: 1, total: 10),
        _score('P2', baginas: 1, total: 10),
      ],
      winnerIds: ['P1', 'P2'],
    );

HomeworkRevealedEvent _hw() => HomeworkRevealedEvent(
      eventId: 99,
      templateId: 'tooth-hoarder',
      description: 'Finish with at least 4 unused Tooth cards in your hand.',
    );

Widget _wrap(Widget child) => MaterialApp(theme: buildBaginaTheme(), home: child);

List<PublicPlayer> _twoPlayers() => [
      _player('P1', 'Sir Ruffles', PlayerColor.pink),
      _player('P2', 'Lady Buns', PlayerColor.mint),
    ];

/// Step the test clock forward in small chunks so each newly-revealed
/// flutter_animate widget has time to fire its internal Timer.run and let
/// the Animate cycle complete before we assert.
Future<void> _advance(WidgetTester tester, Duration total, {Duration step = const Duration(milliseconds: 100)}) async {
  var elapsed = Duration.zero;
  await tester.pump();
  while (elapsed < total) {
    final dt = (total - elapsed) < step ? (total - elapsed) : step;
    await tester.pump(dt);
    elapsed += dt;
  }
}

void main() {
  testWidgets('Initial stage shows only the page title (1.2s hush)', (tester) async {
    var anotherGoTaps = 0;
    await tester.pumpWidget(_wrap(ResultsView(
      ended: _endedSingleWinner(),
      homework: _hw(),
      players: _twoPlayers(),
      onAnotherGo: () => anotherGoTaps++,
    )));
    await _advance(tester, const Duration(milliseconds: 400));
    expect(find.text('That was the week.'), findsOneWidget);
    expect(find.byKey(const ValueKey('homework')), findsNothing);
    expect(find.byKey(const ValueKey('score-P1')), findsNothing);
    expect(find.byKey(const ValueKey('winner-banner')), findsNothing);
    expect(anotherGoTaps, 0);
    // Pump well past all staged timers so the test framework doesn't see
    // pending stage-Timer / Animate-internal Timer.run callbacks at teardown.
    await _advance(tester, const Duration(seconds: 5));
  });

  testWidgets('Stage 1 reveals the homework block (sealed then opened)', (tester) async {
    await tester.pumpWidget(_wrap(ResultsView(
      ended: _endedSingleWinner(),
      homework: _hw(),
      players: _twoPlayers(),
      onAnotherGo: () {},
    )));
    // Past stage 1 trigger (1200ms) but before stage 2 (2600ms)
    await _advance(tester, const Duration(milliseconds: 1500));
    expect(find.byKey(const ValueKey('homework')), findsOneWidget);
    expect(find.text('Homework was…'), findsOneWidget);
    // Past the envelope open delay (1500 + 700 = 2200 from t=0; we already are)
    await _advance(tester, const Duration(milliseconds: 800));
    expect(find.textContaining('4 unused Tooth cards'), findsOneWidget);
    await _advance(tester, const Duration(seconds: 5));
  });

  testWidgets('Stage 2 reveals score tiles + ✏️ homework bonus copy', (tester) async {
    await tester.pumpWidget(_wrap(ResultsView(
      ended: _endedSingleWinner(),
      homework: _hw(),
      players: _twoPlayers(),
      onAnotherGo: () {},
    )));
    // Past stage 2 trigger (2600ms) but before stage 3 (3400ms)
    await _advance(tester, const Duration(milliseconds: 3000));
    expect(find.byKey(const ValueKey('score-P1')), findsOneWidget);
    expect(find.byKey(const ValueKey('score-P2')), findsOneWidget);
    expect(find.text('Sir Ruffles'), findsOneWidget);
    expect(find.text('Lady Buns'), findsOneWidget);
    expect(find.textContaining('✏️ 10'), findsOneWidget);
    expect(find.text('👑'), findsOneWidget);
    await _advance(tester, const Duration(seconds: 4));
  });

  testWidgets('Stage 3 reveals winner banner + replay button (single winner)', (tester) async {
    var anotherGoTaps = 0;
    await tester.pumpWidget(_wrap(ResultsView(
      ended: _endedSingleWinner(),
      homework: _hw(),
      players: _twoPlayers(),
      onAnotherGo: () => anotherGoTaps++,
    )));
    await _advance(tester, const Duration(milliseconds: 4000));
    expect(find.byKey(const ValueKey('winner-banner')), findsOneWidget);
    expect(find.textContaining('Sir Ruffles is an absolute legend.'), findsOneWidget);
    // Two crowns: winner tile + banner
    expect(find.text('👑'), findsNWidgets(2));
    expect(find.byKey(const ValueKey('confetti')), findsOneWidget);
    // Replay wires up. Scroll it into view first — at 800×600 default
    // viewport the page overflows past the fold.
    await tester.ensureVisible(find.text('Have another go'));
    await _advance(tester, const Duration(milliseconds: 200));
    await tester.tap(find.text('Have another go'), warnIfMissed: false);
    await _advance(tester, const Duration(milliseconds: 400));
    expect(anotherGoTaps, 1);
    await _advance(tester, const Duration(seconds: 2));
  });

  testWidgets('Two-way tie uses tie copy', (tester) async {
    await tester.pumpWidget(_wrap(ResultsView(
      ended: _endedTie(),
      homework: _hw(),
      players: _twoPlayers(),
      onAnotherGo: () {},
    )));
    await _advance(tester, const Duration(milliseconds: 4000));
    expect(find.textContaining('Two-way reign'), findsOneWidget);
    expect(find.textContaining('Sir Ruffles'), findsWidgets);
    expect(find.textContaining('Lady Buns'), findsWidgets);
    await _advance(tester, const Duration(seconds: 2));
  });
}
