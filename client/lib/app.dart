import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import 'pages/board_page.dart';
import 'pages/home_page.dart';
import 'pages/lobby_page.dart';
import 'pages/results_page.dart';
import 'theme/app_theme.dart';

class BaginaApp extends ConsumerWidget {
  const BaginaApp({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final router = GoRouter(
      initialLocation: '/',
      routes: [
        GoRoute(path: '/', builder: (_, _) => const HomePage()),
        GoRoute(
          path: '/lobby/:code',
          builder: (_, state) => LobbyPage(code: state.pathParameters['code']!),
        ),
        GoRoute(path: '/board', builder: (_, _) => const BoardPage()),
        GoRoute(path: '/results', builder: (_, _) => const ResultsPage()),
      ],
    );

    return MaterialApp.router(
      title: 'Bagino Bagina',
      theme: buildBaginaTheme(),
      debugShowCheckedModeBanner: false,
      routerConfig: router,
    );
  }
}
