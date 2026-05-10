import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../state/game_state.dart';
import '../theme/tokens.dart';

/// Phase 5 placeholder. Filled in shortly.
class BoardPage extends ConsumerWidget {
  const BoardPage({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final state = ref.watch(gameStateProvider);

    return Scaffold(
      appBar: AppBar(
        title: Text(state == null ? 'Game' : 'Room ${state.code}'),
      ),
      body: Center(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: state == null
              ? const Text('Lost the plot. Go home.')
              : Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Text('You are: ${state.me?.nickname ?? "?"}', style: BaginaTypeScale.title),
                    const SizedBox(height: 12),
                    Text('Active: ${state.activePlayerId ?? "no one"}'),
                    const SizedBox(height: 12),
                    Text('Slot: ${state.me?.slot ?? "-"}  Poo: ${state.me?.poo ?? 0}'),
                    const SizedBox(height: 12),
                    Text('Hand size: ${state.hand.length}'),
                    const SizedBox(height: 12),
                    Text('Legal actions: ${state.legalActions.map((a) => a.name).join(", ")}'),
                    const SizedBox(height: 24),
                    FilledButton(
                      onPressed: () => context.go('/'),
                      child: const Text('Bail to home'),
                    ),
                  ],
                ),
        ),
      ),
    );
  }
}
