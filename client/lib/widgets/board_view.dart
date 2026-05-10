import 'dart:math' as math;
import 'package:flutter/material.dart';

import '../theme/player_color_ext.dart';
import '../theme/tokens.dart';
import '../wire/wire.dart';

/// Custom-painted 40-slot ring representing the week. Day labels are
/// arranged around the inside of the ring, poo slots are highlighted,
/// and player tokens are positioned along the path.
class BoardView extends StatelessWidget {
  const BoardView({super.key, required this.players, required this.activePlayerId});

  final List<PublicPlayer> players;
  final String? activePlayerId;

  @override
  Widget build(BuildContext context) {
    return AspectRatio(
      aspectRatio: 1,
      child: LayoutBuilder(
        builder: (context, constraints) {
          final size = math.min(constraints.maxWidth, constraints.maxHeight);
          return SizedBox(
            width: size,
            height: size,
            child: Stack(
              children: [
                CustomPaint(
                  size: Size(size, size),
                  painter: _BoardPainter(),
                ),
                ...players.map((p) {
                  final pos = _slotCenter(p.slot, size);
                  final isActive = p.id == activePlayerId;
                  return AnimatedPositioned(
                    duration: const Duration(milliseconds: 600),
                    curve: Curves.elasticOut,
                    left: pos.dx - 18,
                    top: pos.dy - 18,
                    child: _TokenDot(color: p.color.deep, pulsing: isActive, label: p.nickname),
                  );
                }),
              ],
            ),
          );
        },
      ),
    );
  }
}

class _TokenDot extends StatelessWidget {
  const _TokenDot({required this.color, required this.pulsing, required this.label});
  final Color color;
  final bool pulsing;
  final String label;

  @override
  Widget build(BuildContext context) {
    return AnimatedScale(
      scale: pulsing ? 1.15 : 1.0,
      duration: BaginaDurations.bouncy,
      curve: Curves.easeOutBack,
      child: Container(
        width: 36,
        height: 36,
        decoration: BoxDecoration(
          color: color,
          shape: BoxShape.circle,
          border: Border.all(color: Colors.white, width: 3),
          boxShadow: [BoxShadow(color: color.withValues(alpha: 0.4), blurRadius: 8, offset: const Offset(0, 2))],
        ),
        alignment: Alignment.center,
        child: Text(
          (label.isNotEmpty ? label[0] : '?').toUpperCase(),
          style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w900, fontSize: 14),
        ),
      ),
    );
  }
}

class _BoardPainter extends CustomPainter {
  static const _slotCount = kTotalSlots;

  @override
  void paint(Canvas canvas, Size size) {
    final radius = size.width / 2;
    final centre = Offset(size.width / 2, size.height / 2);
    final ringRadius = radius - 30;

    // Outer ring (cream warm)
    final ringPaint = Paint()
      ..color = BaginaPalette.creamWarm
      ..style = PaintingStyle.stroke
      ..strokeWidth = 50;
    canvas.drawCircle(centre, ringRadius, ringPaint);

    // Day labels and slots come from the same balance.json the server uses.
    final days = kDayOrder.map(DayToJson).toList();

    for (var i = 0; i < _slotCount; i++) {
      final p = _slotPosition(i.toDouble(), ringRadius, centre);
      final isPoo = kPooSlots.contains(i);
      final dotPaint = Paint()..color = isPoo ? BaginaPalette.poo : BaginaPalette.creamDeep;
      canvas.drawCircle(p, isPoo ? 9 : 6, dotPaint);
      if (isPoo) {
        final glow = Paint()
          ..color = BaginaPalette.pooGlow.withValues(alpha: 0.4)
          ..maskFilter = const MaskFilter.blur(BlurStyle.normal, 8);
        canvas.drawCircle(p, 13, glow);
      }
    }

    // Day labels at the centre of each day's arc
    for (var d = 0; d < days.length; d++) {
      final midSlot = d * kSlotsPerDay + kSlotsPerDay / 2 - 0.5;
      final labelPos = _slotPosition(midSlot, ringRadius - 50, centre);
      final tp = TextPainter(
        text: TextSpan(
          text: days[d],
          style: BaginaTypeScale.caption.copyWith(
            color: BaginaPalette.ink.withValues(alpha: 0.7),
            fontWeight: FontWeight.w800,
            fontSize: 13,
          ),
        ),
        textDirection: TextDirection.ltr,
      )..layout();
      tp.paint(canvas, labelPos.translate(-tp.width / 2, -tp.height / 2));
    }

    // Centre title: "the week"
    final tp = TextPainter(
      text: TextSpan(
        text: 'the week',
        style: BaginaTypeScale.caption.copyWith(
          color: BaginaPalette.ink.withValues(alpha: 0.4),
          fontWeight: FontWeight.w800,
        ),
      ),
      textDirection: TextDirection.ltr,
    )..layout();
    tp.paint(canvas, centre.translate(-tp.width / 2, -tp.height / 2));
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}

Offset _slotCenter(int slot, double size) {
  final centre = Offset(size / 2, size / 2);
  return _slotPosition(slot.toDouble(), size / 2 - 30, centre);
}

Offset _slotPosition(double slot, double radius, Offset centre) {
  // Start at 12 o'clock (-π/2), go clockwise.
  final theta = -math.pi / 2 + (slot / kTotalSlots) * math.pi * 2;
  return centre.translate(math.cos(theta) * radius, math.sin(theta) * radius);
}
