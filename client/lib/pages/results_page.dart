import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../state/game_state.dart';
import '../theme/tokens.dart';

/// Phase 6 placeholder. Filled in shortly.
class ResultsPage extends ConsumerWidget {
  const ResultsPage({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final state = ref.watch(gameStateProvider);
    return Scaffold(
      appBar: AppBar(title: const Text('That was the week')),
      body: Center(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: state == null
              ? const Text('No game ran. Go again.')
              : Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Text('Phase: ${state.phase.name}', style: BaginaTypeScale.title),
                    const SizedBox(height: 12),
                    Text('Homework: ${state.homeworkRevealed ?? "(hidden)"}'),
                    const SizedBox(height: 24),
                    FilledButton(
                      onPressed: () => context.go('/'),
                      child: const Text('Another round'),
                    ),
                  ],
                ),
        ),
      ),
    );
  }
}
