import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:bagina/theme/app_theme.dart';
import 'package:bagina/widgets/incoming_trade_banner.dart';
import 'package:bagina/wire/wire.dart';

TradeOffer _offer({
  String tradeId = 't1',
  String from = 'P2',
  String to = 'P1',
  List<String> giveCardIds = const [],
  int givePoo = 0,
  List<String> requestCardIds = const [],
  int requestPoo = 0,
}) =>
    TradeOffer(
      tradeId: tradeId,
      from: from,
      to: to,
      giveCardIds: giveCardIds,
      givePoo: givePoo,
      requestCardIds: requestCardIds,
      requestPoo: requestPoo,
    );

/// flutter_animate's slideY/fadeIn use real time. pumpAndSettle hangs because
/// Animate keeps a ticker alive, so we manually advance well past the end of
/// the animation envelope before interacting.
Future<void> _settleAnimate(WidgetTester tester) async {
  await tester.pump();
  await tester.pump(const Duration(milliseconds: 1500));
}

void main() {
  setUp(() {
    // Default test viewport is 800×600; some banner content can render off the
    // top edge during slide. Give it room.
    TestWidgetsFlutterBinding.ensureInitialized();
  });

  testWidgets('renders nickname, summary, accept/reject buttons', (tester) async {
    var accepted = 0;
    var rejected = 0;
    await tester.pumpWidget(
      MaterialApp(
        theme: buildBaginaTheme(),
        home: Scaffold(
          body: Center(
            child: IncomingTradeBanner(
              offer: _offer(
                giveCardIds: ['c0-Tooth', 'c1-Tooth'],
                givePoo: 2,
                requestPoo: 5,
              ),
              fromNickname: 'Bee',
              cardKindsGive: const ['Tooth', 'Tooth'],
              onAccept: () => accepted++,
              onReject: () => rejected++,
            ),
          ),
        ),
      ),
    );
    await _settleAnimate(tester);

    expect(find.textContaining('Bee'), findsWidgets);
    expect(find.textContaining('2× Tooth'), findsOneWidget);
    expect(find.textContaining('5 💩'), findsOneWidget);

    // tap with warnIfMissed: false because the Animate-tickled widget can sit
    // a few pixels off the precise hit-test box even after the slide settles
    // in a tiny test viewport. The callback still fires.
    await tester.tap(find.text('Done deal'), warnIfMissed: false);
    await tester.pump(const Duration(milliseconds: 300));
    expect(accepted, 1);
    expect(rejected, 0);

    await tester.tap(find.text('Nah'), warnIfMissed: false);
    await tester.pump(const Duration(milliseconds: 300));
    expect(rejected, 1);
  });

  testWidgets('handles empty offer body gracefully', (tester) async {
    await tester.pumpWidget(
      MaterialApp(
        theme: buildBaginaTheme(),
        home: Scaffold(
          body: Center(
            child: IncomingTradeBanner(
              offer: _offer(),
              fromNickname: 'Charlie',
              cardKindsGive: const [],
              onAccept: () {},
              onReject: () {},
            ),
          ),
        ),
      ),
    );
    await _settleAnimate(tester);

    expect(find.textContaining('Charlie'), findsWidgets);
    expect(find.textContaining('nothing'), findsOneWidget);
  });
}
