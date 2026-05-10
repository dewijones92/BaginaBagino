import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:bagina/net/socket.dart';
import 'package:bagina/pages/home_page.dart';
import 'package:bagina/state/game_state.dart';
import 'package:bagina/theme/app_theme.dart';
import 'package:bagina/wire/wire.dart';

class _FakeSocket implements BaginaSocket {
  final _events = StreamController<ServerEvent>.broadcast();
  final _conn = StreamController<bool>.broadcast();
  final bool _connected = false;
  final String _id = 'fake-socket-id';
  final List<GameAction> sent = [];

  @override
  Stream<ServerEvent> get events => _events.stream;
  @override
  Stream<bool> get connectionChanges => _conn.stream;
  @override
  bool get isConnected => _connected;
  @override
  String? get id => _id;
  @override
  void send(GameAction action) => sent.add(action);
  @override
  Future<void> close() async {
    await _events.close();
    await _conn.close();
  }
}

void main() {
  testWidgets('Home page renders title, fields, and the two action cards', (tester) async {
    final fake = _FakeSocket();
    await tester.pumpWidget(
      ProviderScope(
        overrides: [socketProvider.overrideWithValue(fake)],
        child: MaterialApp(
          theme: buildBaginaTheme(),
          home: const HomePage(),
        ),
      ),
    );
    // Animate widgets keep a ticker alive — pumpAndSettle would never
    // return. Pump fixed durations to let one-shot fades/scales play out.
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 800));

    expect(find.text('Bagino Bagina'), findsOneWidget);
    expect(find.text('Start a new room'), findsOneWidget);
    expect(find.text('Join a friend'), findsOneWidget);
    expect(find.text('Create room'), findsOneWidget);
    expect(find.text('Join room'), findsOneWidget);
    expect(find.byType(TextField), findsNWidgets(2));
  });

  testWidgets('Tapping Create with empty nickname surfaces a snackbar', (tester) async {
    final fake = _FakeSocket();
    await tester.pumpWidget(
      ProviderScope(
        overrides: [socketProvider.overrideWithValue(fake)],
        child: MaterialApp(
          theme: buildBaginaTheme(),
          home: const HomePage(),
        ),
      ),
    );
    await tester.pump();

    await tester.tap(find.text('Create room'));
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 800));

    expect(find.text('Need a nickname, you gormless soul.'), findsOneWidget);
    expect(fake.sent, isEmpty);
  });
}
