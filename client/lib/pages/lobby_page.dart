import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../state/game_state.dart';
import '../theme/tokens.dart';
import '../widgets/bouncy_button.dart';
import '../wire/wire.dart';

class LobbyPage extends ConsumerStatefulWidget {
  const LobbyPage({super.key, required this.code});
  final String code;

  @override
  ConsumerState<LobbyPage> createState() => _LobbyPageState();
}

class _LobbyPageState extends ConsumerState<LobbyPage> {
  @override
  Widget build(BuildContext context) {
    ref.listen<GameStateSnapshot?>(gameStateProvider, (prev, next) {
      if (!mounted) return;
      if (next == null) {
        context.go('/');
        return;
      }
      if (next.phase == RoomPhase.playing) {
        context.go('/board');
      }
    });
    final state = ref.watch(gameStateProvider);
    if (state == null) {
      return const Scaffold(body: Center(child: CircularProgressIndicator()));
    }

    final me = state.me;
    final ready = me?.ready ?? false;

    return Scaffold(
      appBar: AppBar(
        title: const Text('Lobby'),
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_ios_rounded),
          onPressed: () {
            ref.read(gameStateProvider.notifier).leaveRoom();
            context.go('/');
          },
        ),
      ),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(24),
          child: ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: 480),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                _RoomCodeChip(code: widget.code).animate().fadeIn().scale(curve: Curves.easeOutBack),
                const SizedBox(height: 16),
                Text('Players (${state.players.length}/4)', style: BaginaTypeScale.title),
                const SizedBox(height: 8),
                ...state.players.map((p) => _PlayerTile(p: p, isMe: p.id == state.youId).animate().slideY(begin: 0.4, curve: Curves.easeOutBack)),
                const SizedBox(height: 4),
                if (state.players.length < 2)
                  Padding(
                    padding: const EdgeInsets.only(top: 8.0),
                    child: Text(
                      'Need at least one more soul to start.',
                      style: BaginaTypeScale.caption.copyWith(color: BaginaPalette.ink.withValues(alpha: 0.6)),
                    ),
                  ),
                const SizedBox(height: 24),
                Center(
                  child: BouncyButton(
                    icon: ready ? Icons.cancel_rounded : Icons.check_rounded,
                    label: ready ? 'I take it back' : "I'm ready, let's go",
                    color: ready ? BaginaPalette.uhOh : BaginaPalette.mintDeep,
                    foreground: Colors.white,
                    onPressed: state.players.length < 2 && !ready
                        ? null
                        : () => ref.read(socketProvider).send(SetReadyAction(ready: !ready)),
                  ),
                ),
                const SizedBox(height: 16),
                Center(
                  child: Text(
                    'When everyone’s ready, the week begins.',
                    style: BaginaTypeScale.caption.copyWith(color: BaginaPalette.ink.withValues(alpha: 0.5)),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class _RoomCodeChip extends StatelessWidget {
  const _RoomCodeChip({required this.code});
  final String code;

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: () {
        Clipboard.setData(ClipboardData(text: code));
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: const Text('Code copied. Send it to your accomplice.'),
            behavior: SnackBarBehavior.floating,
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(BaginaRadii.medium)),
          ),
        );
      },
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 24, horizontal: 24),
        decoration: BoxDecoration(
          color: BaginaPalette.creamWarm,
          borderRadius: BorderRadius.circular(BaginaRadii.large),
          boxShadow: [
            BoxShadow(color: BaginaPalette.pink.withValues(alpha: 0.4), blurRadius: 24, offset: const Offset(0, 6)),
          ],
        ),
        child: Column(
          children: [
            Text('Room code', style: BaginaTypeScale.caption.copyWith(color: BaginaPalette.ink.withValues(alpha: 0.6))),
            const SizedBox(height: 6),
            Text(
              code,
              style: BaginaTypeScale.display.copyWith(
                fontSize: 56,
                letterSpacing: 8,
                color: BaginaPalette.pinkDeep,
              ),
            ),
            const SizedBox(height: 6),
            Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Icon(Icons.copy_rounded, size: 14, color: BaginaPalette.ink.withValues(alpha: 0.5)),
                const SizedBox(width: 4),
                Text('Tap to copy', style: BaginaTypeScale.caption.copyWith(color: BaginaPalette.ink.withValues(alpha: 0.5))),
              ],
            ),
          ],
        ),
      ),
    );
  }
}

class _PlayerTile extends StatelessWidget {
  const _PlayerTile({required this.p, required this.isMe});
  final PublicPlayer p;
  final bool isMe;

  @override
  Widget build(BuildContext context) {
    final color = _color(p.color);
    return Container(
      margin: const EdgeInsets.only(top: 8),
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
      decoration: BoxDecoration(
        color: BaginaPalette.creamWarm,
        borderRadius: BorderRadius.circular(BaginaRadii.large),
        border: Border.all(color: isMe ? BaginaPalette.pinkDeep : Colors.transparent, width: 2),
      ),
      child: Row(
        children: [
          Container(
            width: 36,
            height: 36,
            decoration: BoxDecoration(color: color, shape: BoxShape.circle),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(p.nickname, style: BaginaTypeScale.body.copyWith(fontWeight: FontWeight.w800)),
                if (isMe)
                  Text('That’s you', style: BaginaTypeScale.caption.copyWith(color: BaginaPalette.ink.withValues(alpha: 0.5))),
              ],
            ),
          ),
          if (p.ready)
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
              decoration: BoxDecoration(
                color: BaginaPalette.mintDeep,
                borderRadius: BorderRadius.circular(BaginaRadii.pill),
              ),
              child: const Text('Ready', style: TextStyle(color: Colors.white, fontWeight: FontWeight.w800, fontSize: 12)),
            )
          else
            Text('…', style: BaginaTypeScale.title.copyWith(color: BaginaPalette.ink.withValues(alpha: 0.4))),
        ],
      ),
    );
  }

  Color _color(PlayerColor c) {
    switch (c) {
      case PlayerColor.pink: return BaginaPalette.pink;
      case PlayerColor.mint: return BaginaPalette.mint;
      case PlayerColor.lavender: return BaginaPalette.lavender;
      case PlayerColor.butter: return BaginaPalette.butter;
    }
  }
}
