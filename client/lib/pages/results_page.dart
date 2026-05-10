import 'dart:math' as math;
import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../state/game_state.dart';
import '../theme/tokens.dart';
import '../widgets/bouncy_button.dart';
import '../wire/wire.dart';

class ResultsPage extends ConsumerWidget {
  const ResultsPage({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final notifier = ref.read(gameStateProvider.notifier);
    final state = ref.watch(gameStateProvider);
    final ended = notifier.lastEnded;
    final homework = notifier.lastHomeworkReveal;

    if (state == null || ended == null) {
      return Scaffold(
        appBar: AppBar(title: const Text('Hmm')),
        body: Center(
          child: Padding(
            padding: const EdgeInsets.all(24),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Text('No game on record. Off to the kitchen.', style: BaginaTypeScale.body),
                const SizedBox(height: 16),
                BouncyButton(label: 'Home', onPressed: () => context.go('/'), icon: Icons.home_rounded),
              ],
            ),
          ),
        ),
      );
    }

    final winnerNames = ended.winnerIds
        .map((id) => state.players.firstWhere((p) => p.id == id, orElse: () => _unknownPlayer(id)).nickname)
        .toList();

    return Scaffold(
      body: Stack(
        children: [
          SafeArea(
            child: SingleChildScrollView(
              padding: const EdgeInsets.fromLTRB(20, 24, 20, 32),
              child: ConstrainedBox(
                constraints: const BoxConstraints(maxWidth: 520),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    Text(
                      winnerNames.length == 1 ? '${winnerNames.first} is an absolute legend.' : 'Two-way reign: ${winnerNames.join(' & ')}',
                      style: BaginaTypeScale.display.copyWith(color: BaginaPalette.win, fontSize: 28, height: 1.05),
                      textAlign: TextAlign.center,
                    ).animate().fadeIn().scale(curve: Curves.easeOutBack, duration: BaginaDurations.bouncy),
                    const SizedBox(height: 6),
                    Text('That was your week.',
                        textAlign: TextAlign.center,
                        style: BaginaTypeScale.caption.copyWith(color: BaginaPalette.ink.withValues(alpha: 0.6))),
                    const SizedBox(height: 24),
                    if (homework != null) _HomeworkReveal(event: homework),
                    const SizedBox(height: 24),
                    Text('Final scores', style: BaginaTypeScale.title),
                    const SizedBox(height: 8),
                    ...ended.scores.map((s) => _ScoreTile(
                          score: s,
                          player: state.players.firstWhere((p) => p.id == s.playerId, orElse: () => _unknownPlayer(s.playerId)),
                          isWinner: ended.winnerIds.contains(s.playerId),
                        )),
                    const SizedBox(height: 24),
                    Center(
                      child: BouncyButton(
                        label: 'Have another go',
                        icon: Icons.replay_rounded,
                        onPressed: () {
                          ref.read(gameStateProvider.notifier).leaveRoom();
                          context.go('/');
                        },
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),
          IgnorePointer(child: _Confetti()),
        ],
      ),
    );
  }

  PublicPlayer _unknownPlayer(String id) => PublicPlayer(
        id: id,
        nickname: '???',
        color: PlayerColor.pink,
        slot: 0,
        poo: 0,
        handCount: 0,
        completed: const [],
        ready: false,
        online: false,
      );
}

class _HomeworkReveal extends StatelessWidget {
  const _HomeworkReveal({required this.event});
  final HomeworkRevealedEvent event;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: BaginaPalette.lavender,
        borderRadius: BorderRadius.circular(BaginaRadii.large),
        boxShadow: [BoxShadow(color: BaginaPalette.lavenderDeep.withValues(alpha: 0.3), blurRadius: 14, offset: const Offset(0, 6))],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(children: [
            const Text('✉️', style: TextStyle(fontSize: 22)),
            const SizedBox(width: 8),
            Text('Homework was…', style: BaginaTypeScale.title.copyWith(color: BaginaPalette.ink)),
          ]),
          const SizedBox(height: 8),
          Text(event.description, style: BaginaTypeScale.body.copyWith(color: BaginaPalette.ink)),
        ],
      ),
    ).animate().fadeIn(duration: BaginaDurations.medium).slideY(begin: 0.3, curve: Curves.easeOutBack);
  }
}

class _ScoreTile extends StatelessWidget {
  const _ScoreTile({required this.score, required this.player, required this.isWinner});
  final PlayerScore score;
  final PublicPlayer player;
  final bool isWinner;

  @override
  Widget build(BuildContext context) {
    final accent = _color(player.color);
    return Container(
      margin: const EdgeInsets.only(top: 10),
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
      decoration: BoxDecoration(
        color: BaginaPalette.creamWarm,
        borderRadius: BorderRadius.circular(BaginaRadii.large),
        border: Border.all(color: isWinner ? BaginaPalette.win : Colors.transparent, width: 2),
      ),
      child: Row(
        children: [
          Container(width: 36, height: 36, decoration: BoxDecoration(color: accent, shape: BoxShape.circle)),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(player.nickname, style: BaginaTypeScale.body.copyWith(fontWeight: FontWeight.w900)),
                Text(
                  'bagino × ${score.baginos} · bagina × ${score.baginas} · brood × ${score.broods} · latch × ${score.latches} · ✏️ ${score.homeworkBonus}',
                  style: BaginaTypeScale.caption.copyWith(color: BaginaPalette.ink.withValues(alpha: 0.7)),
                ),
              ],
            ),
          ),
          _CountUp(value: score.total).animate().scale(curve: Curves.easeOutBack, duration: BaginaDurations.bouncy),
        ],
      ),
    ).animate().fadeIn().slideX(begin: 0.2, curve: Curves.easeOutBack, duration: BaginaDurations.bouncy);
  }

  Color _color(PlayerColor c) {
    switch (c) {
      case PlayerColor.pink: return BaginaPalette.pinkDeep;
      case PlayerColor.mint: return BaginaPalette.mintDeep;
      case PlayerColor.lavender: return BaginaPalette.lavenderDeep;
      case PlayerColor.butter: return BaginaPalette.butterDeep;
    }
  }
}

class _CountUp extends StatefulWidget {
  const _CountUp({required this.value});
  final int value;
  @override
  State<_CountUp> createState() => _CountUpState();
}

class _CountUpState extends State<_CountUp> with SingleTickerProviderStateMixin {
  late AnimationController _ctrl;
  @override
  void initState() {
    super.initState();
    _ctrl = AnimationController(vsync: this, duration: BaginaDurations.bouncy)..forward();
  }

  @override
  void dispose() {
    _ctrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return AnimatedBuilder(
      animation: _ctrl,
      builder: (context, _) {
        final shown = (widget.value * Curves.easeOutBack.transform(_ctrl.value)).round().clamp(0, widget.value);
        return Container(
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
          decoration: BoxDecoration(
            color: BaginaPalette.win,
            borderRadius: BorderRadius.circular(BaginaRadii.pill),
          ),
          child: Text('$shown', style: BaginaTypeScale.body.copyWith(color: Colors.white, fontWeight: FontWeight.w900)),
        );
      },
    );
  }
}

class _Confetti extends StatefulWidget {
  @override
  State<_Confetti> createState() => _ConfettiState();
}

class _ConfettiState extends State<_Confetti> with SingleTickerProviderStateMixin {
  late AnimationController _ctrl;
  final _rng = math.Random();
  late final List<_ConfettiBit> _bits = List.generate(60, (_) => _ConfettiBit.random(_rng));

  @override
  void initState() {
    super.initState();
    _ctrl = AnimationController(vsync: this, duration: const Duration(seconds: 4))..forward();
  }

  @override
  void dispose() {
    _ctrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return AnimatedBuilder(
      animation: _ctrl,
      builder: (context, _) => CustomPaint(
        size: Size.infinite,
        painter: _ConfettiPainter(bits: _bits, t: _ctrl.value),
      ),
    );
  }
}

class _ConfettiBit {
  final double x;
  final double startY;
  final double endY;
  final double swayPhase;
  final double swayAmp;
  final Color color;
  final double size;

  _ConfettiBit({
    required this.x,
    required this.startY,
    required this.endY,
    required this.swayPhase,
    required this.swayAmp,
    required this.color,
    required this.size,
  });

  factory _ConfettiBit.random(math.Random r) {
    final palette = [BaginaPalette.pink, BaginaPalette.mint, BaginaPalette.lavender, BaginaPalette.butter, BaginaPalette.pinkDeep, BaginaPalette.win];
    return _ConfettiBit(
      x: r.nextDouble(),
      startY: -0.1 - r.nextDouble() * 0.3,
      endY: 1.05 + r.nextDouble() * 0.2,
      swayPhase: r.nextDouble() * math.pi * 2,
      swayAmp: 0.04 + r.nextDouble() * 0.06,
      color: palette[r.nextInt(palette.length)],
      size: 6 + r.nextDouble() * 8,
    );
  }
}

class _ConfettiPainter extends CustomPainter {
  _ConfettiPainter({required this.bits, required this.t});
  final List<_ConfettiBit> bits;
  final double t;

  @override
  void paint(Canvas canvas, Size size) {
    for (final b in bits) {
      final progress = (t * 1.4 - b.startY).clamp(0.0, 1.0);
      if (progress == 0) continue;
      final y = b.startY + progress * (b.endY - b.startY);
      final sway = math.sin(t * 6 + b.swayPhase) * b.swayAmp;
      final px = (b.x + sway).clamp(0.0, 1.0) * size.width;
      final py = y * size.height;
      final paint = Paint()..color = b.color;
      canvas.drawRRect(RRect.fromRectAndRadius(Rect.fromCenter(center: Offset(px, py), width: b.size, height: b.size * 0.6), const Radius.circular(2)), paint);
    }
  }

  @override
  bool shouldRepaint(covariant _ConfettiPainter old) => true;
}
