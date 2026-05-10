import 'dart:async';
import 'dart:math' as math;
import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../state/game_state.dart';
import '../theme/tokens.dart';
import '../widgets/bouncy_button.dart';
import '../widgets/cute_motion.dart';
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

    return ResultsView(
      ended: ended,
      homework: homework,
      players: state.players,
      onAnotherGo: () {
        ref.read(gameStateProvider.notifier).leaveRoom();
        context.go('/');
      },
    );
  }
}

/// Pure presentation widget — testable in isolation with fake data.
///
/// The reveal is staged so the moment lands:
///   1. Hush (0.0-1.2s)  — just the page title fades in
///   2. Homework (1.2-2.6s)  — sealed envelope flips open
///   3. Scores (2.6-3.4s)  — score tiles slide in, count up
///   4. Winner banner (3.4s+)  — name with crown, confetti starts
class ResultsView extends StatefulWidget {
  const ResultsView({
    super.key,
    required this.ended,
    required this.homework,
    required this.players,
    required this.onAnotherGo,
  });
  final GameEndedEvent ended;
  final HomeworkRevealedEvent? homework;
  final List<PublicPlayer> players;
  final VoidCallback onAnotherGo;

  @override
  State<ResultsView> createState() => _ResultsViewState();
}

class _ResultsViewState extends State<ResultsView> {
  int _stage = 0;
  bool _confetti = false;
  final List<Timer> _timers = [];

  @override
  void initState() {
    super.initState();
    // Advance through the dramatic stages on a fixed clock so the moment
    // feels paced. Cancellable Timers (not Future.delayed) so the test
    // framework doesn't fail on pending timers when the widget disposes.
    _schedule(const Duration(milliseconds: 1200), () => _stage = 1);
    _schedule(const Duration(milliseconds: 2600), () => _stage = 2);
    _schedule(const Duration(milliseconds: 3400), () {
      _stage = 3;
      _confetti = true;
    });
  }

  void _schedule(Duration d, VoidCallback set) {
    _timers.add(Timer(d, () {
      if (!mounted) return;
      setState(set);
    }));
  }

  @override
  void dispose() {
    for (final t in _timers) {
      t.cancel();
    }
    _timers.clear();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final winnerNames = widget.ended.winnerIds
        .map((id) => widget.players
            .firstWhere((p) => p.id == id, orElse: () => _unknownPlayer(id))
            .nickname)
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
                      'That was the week.',
                      textAlign: TextAlign.center,
                      style: BaginaTypeScale.title.copyWith(color: BaginaPalette.ink.withValues(alpha: 0.65)),
                    ).animate().fadeIn(duration: BaginaDurations.medium),

                    const SizedBox(height: 14),

                    // Stage 1: homework reveal (sealed envelope → opens)
                    if (_stage >= 1)
                      _HomeworkReveal(homework: widget.homework, key: const ValueKey('homework')),

                    // Stage 2: score tiles
                    if (_stage >= 2) ...[
                      const SizedBox(height: 24),
                      Text('Final scores', style: BaginaTypeScale.title),
                      const SizedBox(height: 8),
                      for (var i = 0; i < widget.ended.scores.length; i++)
                        _ScoreTile(
                          key: ValueKey('score-${widget.ended.scores[i].playerId}'),
                          score: widget.ended.scores[i],
                          player: widget.players.firstWhere(
                            (p) => p.id == widget.ended.scores[i].playerId,
                            orElse: () => _unknownPlayer(widget.ended.scores[i].playerId),
                          ),
                          isWinner: widget.ended.winnerIds.contains(widget.ended.scores[i].playerId),
                          rowIndex: i,
                        ),
                    ],

                    // Stage 3: winner banner + replay button
                    if (_stage >= 3) ...[
                      const SizedBox(height: 28),
                      _WinnerBanner(
                        winnerNames: winnerNames,
                        key: const ValueKey('winner-banner'),
                      ),
                      const SizedBox(height: 20),
                      Center(
                        child: BouncyButton(
                          label: 'Have another go',
                          icon: Icons.replay_rounded,
                          onPressed: widget.onAnotherGo,
                        ),
                      ),
                    ],
                  ],
                ),
              ),
            ),
          ),
          if (_confetti) const IgnorePointer(child: _Confetti(key: ValueKey('confetti'))),
        ],
      ),
    );
  }

  static PublicPlayer _unknownPlayer(String id) => PublicPlayer(
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

// ─── homework reveal (sealed envelope → opens) ─────────────────────────────

class _HomeworkReveal extends StatefulWidget {
  const _HomeworkReveal({super.key, required this.homework});
  final HomeworkRevealedEvent? homework;

  @override
  State<_HomeworkReveal> createState() => _HomeworkRevealState();
}

class _HomeworkRevealState extends State<_HomeworkReveal> {
  bool _opened = false;
  Timer? _openTimer;

  @override
  void initState() {
    super.initState();
    _openTimer = Timer(const Duration(milliseconds: 700), () {
      if (mounted) setState(() => _opened = true);
    });
  }

  @override
  void dispose() {
    _openTimer?.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: BaginaPalette.lavender,
        borderRadius: BorderRadius.circular(BaginaRadii.large),
        boxShadow: [BoxShadow(color: BaginaPalette.lavenderDeep.withValues(alpha: 0.3), blurRadius: 14, offset: const Offset(0, 6))],
      ),
      child: AnimatedSwitcher(
        duration: BaginaDurations.medium,
        switchInCurve: Curves.easeOutBack,
        child: _opened
            ? _OpenedEnvelope(homework: widget.homework, key: const ValueKey('opened'))
            : _SealedEnvelope(key: const ValueKey('sealed')),
      ),
    );
  }
}

class _SealedEnvelope extends StatelessWidget {
  const _SealedEnvelope({super.key});
  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        CuteIcon('sparkle', size: 30, motion: CuteMotion.bobble),
        const SizedBox(width: 10),
        Text(
          'Homework was…',
          style: BaginaTypeScale.title.copyWith(color: BaginaPalette.ink),
        ),
      ],
    );
  }
}

class _OpenedEnvelope extends StatelessWidget {
  const _OpenedEnvelope({super.key, required this.homework});
  final HomeworkRevealedEvent? homework;

  @override
  Widget build(BuildContext context) {
    return Column(
      key: const ValueKey('opened'),
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(children: [
          const Text('✉️', style: TextStyle(fontSize: 22)),
          const SizedBox(width: 8),
          Text('Homework was…', style: BaginaTypeScale.title.copyWith(color: BaginaPalette.ink)),
        ]),
        const SizedBox(height: 8),
        Text(
          homework?.description ?? '(no homework — odd round)',
          style: BaginaTypeScale.body.copyWith(color: BaginaPalette.ink),
        ),
      ],
    );
  }
}

// ─── per-player score tile ─────────────────────────────────────────────────

class _ScoreTile extends StatelessWidget {
  const _ScoreTile({
    super.key,
    required this.score,
    required this.player,
    required this.isWinner,
    required this.rowIndex,
  });
  final PlayerScore score;
  final PublicPlayer player;
  final bool isWinner;
  final int rowIndex;

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
        boxShadow: isWinner
            ? [BoxShadow(color: BaginaPalette.win.withValues(alpha: 0.3), blurRadius: 12, offset: const Offset(0, 4))]
            : null,
      ),
      child: Row(
        children: [
          Stack(
            clipBehavior: Clip.none,
            children: [
              Container(width: 36, height: 36, decoration: BoxDecoration(color: accent, shape: BoxShape.circle)),
              if (isWinner)
                const Positioned(
                  top: -14,
                  left: -2,
                  child: Text('👑', style: TextStyle(fontSize: 24)),
                ),
            ],
          ),
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
          _CountUp(value: score.total),
        ],
      ),
    ).animate(delay: Duration(milliseconds: 120 * rowIndex))
        .fadeIn(duration: BaginaDurations.medium)
        .slideX(begin: 0.2, curve: Curves.easeOutBack, duration: BaginaDurations.bouncy);
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

// ─── winner banner ─────────────────────────────────────────────────────────

class _WinnerBanner extends StatelessWidget {
  const _WinnerBanner({super.key, required this.winnerNames});
  final List<String> winnerNames;

  @override
  Widget build(BuildContext context) {
    final headline = winnerNames.length == 1
        ? '${winnerNames.first} is an absolute legend.'
        : 'Two-way reign: ${winnerNames.join(' & ')}';
    return Column(
      children: [
        const Text('👑', style: TextStyle(fontSize: 56)),
        const SizedBox(height: 4),
        Text(
          headline,
          textAlign: TextAlign.center,
          style: BaginaTypeScale.display.copyWith(color: BaginaPalette.win, fontSize: 28, height: 1.05),
        ),
      ],
    ).animate().fadeIn().scale(curve: Curves.easeOutBack, duration: BaginaDurations.bouncy);
  }
}

// ─── springy count-up ──────────────────────────────────────────────────────

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

// ─── falling confetti ──────────────────────────────────────────────────────

class _Confetti extends StatefulWidget {
  const _Confetti({super.key});
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
