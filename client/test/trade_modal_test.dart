import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:bagina/theme/app_theme.dart';
import 'package:bagina/widgets/trade_modal.dart';
import 'package:bagina/wire/wire.dart';

PublicPlayer _player(String id, String name, PlayerColor color) => PublicPlayer(
      id: id,
      nickname: name,
      color: color,
      slot: 0,
      poo: 0,
      handCount: 0,
      completed: const [],
      ready: true,
      online: true,
    );

GameCard _card(String id, CardKind k) => GameCard(id: id, kind: k);

Future<void> _pumpLong(WidgetTester tester) async {
  // Animate() infrastructure keeps a ticker; pumpAndSettle never returns.
  // Pump fixed durations to let one-shot animations resolve.
  await tester.pump();
  await tester.pump(const Duration(milliseconds: 800));
}

void main() {
  testWidgets('TradeModal: partner preselected, submit disabled until something offered', (tester) async {
    bool submitted = false;
    await tester.pumpWidget(
      MaterialApp(
        theme: buildBaginaTheme(),
        home: Scaffold(
          body: TradeModal(
            you: 'P1',
            otherPlayers: [
              _player('P1', 'Me', PlayerColor.pink),
              _player('P2', 'Bee', PlayerColor.mint),
            ],
            myHand: [_card('c0-Tooth', CardKind.tooth)],
            myPoo: 3,
            onSubmit: ({required to, required giveCardIds, required givePoo, required requestPoo}) {
              submitted = true;
            },
          ),
        ),
      ),
    );
    await _pumpLong(tester);

    // Partner chip for Bee is visible
    expect(find.text('Bee'), findsOneWidget);
    // Submit visible but disabled — tap shouldn't fire
    final sendBtn = find.text('Send offer');
    expect(sendBtn, findsOneWidget);
    await tester.tap(sendBtn);
    await tester.pump(const Duration(milliseconds: 300));
    expect(submitted, isFalse);
  });

  testWidgets('TradeModal: selecting a card enables submit and emits the offer', (tester) async {
    String? toSeen;
    List<String>? giveSeen;
    int? givePooSeen;
    int? requestPooSeen;

    await tester.pumpWidget(
      MaterialApp(
        theme: buildBaginaTheme(),
        home: Scaffold(
          body: TradeModal(
            you: 'P1',
            otherPlayers: [
              _player('P1', 'Me', PlayerColor.pink),
              _player('P2', 'Bee', PlayerColor.mint),
            ],
            myHand: [_card('c0-Tooth', CardKind.tooth), _card('c1-Paw', CardKind.paw)],
            myPoo: 3,
            onSubmit: ({required to, required giveCardIds, required givePoo, required requestPoo}) {
              toSeen = to;
              giveSeen = giveCardIds;
              givePooSeen = givePoo;
              requestPooSeen = requestPoo;
            },
          ),
        ),
      ),
    );
    await _pumpLong(tester);

    // Tap the first card (Tooth) to add it to the offer
    await tester.tap(find.text('Tooth').first);
    await tester.pump(const Duration(milliseconds: 600));

    // Send
    await tester.tap(find.text('Send offer'));
    await tester.pump(const Duration(milliseconds: 600));

    expect(toSeen, equals('P2'));
    expect(giveSeen, equals(['c0-Tooth']));
    expect(givePooSeen, equals(0));
    expect(requestPooSeen, equals(0));
  });
}
