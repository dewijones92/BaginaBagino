import 'dart:math' as math;
import 'package:flutter/material.dart';
import 'package:flutter_svg/flutter_svg.dart';

/// DRY motion primitives. Wrap any widget in one of these to give it
/// gentle, idle life. Phase offsets desync looped instances so a row of
/// icons never bobs in unison.
///
/// Respect [MediaQuery.disableAnimations] — if reduced motion is on, the
/// child renders static.

class _PhaseHelper {
  static double phase(Object? seed) {
    if (seed == null) return 0.0;
    final h = seed.hashCode;
    return (h % 1000) / 1000.0;
  }
}

class Bobble extends StatefulWidget {
  const Bobble({
    super.key,
    required this.child,
    this.amplitude = 4,
    this.duration = const Duration(milliseconds: 2200),
    this.phaseSeed,
  });

  final Widget child;
  final double amplitude;
  final Duration duration;
  final Object? phaseSeed;

  @override
  State<Bobble> createState() => _BobbleState();
}

class _BobbleState extends State<Bobble> with SingleTickerProviderStateMixin {
  late final AnimationController _ctrl;
  late final double _phase;

  @override
  void initState() {
    super.initState();
    _phase = _PhaseHelper.phase(widget.phaseSeed);
    _ctrl = AnimationController(vsync: this, duration: widget.duration)..repeat();
  }

  @override
  void dispose() {
    _ctrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    if (MediaQuery.of(context).disableAnimations) return widget.child;
    return AnimatedBuilder(
      animation: _ctrl,
      builder: (context, child) {
        final t = (_ctrl.value + _phase) * 2 * math.pi;
        final dy = math.sin(t) * widget.amplitude;
        return Transform.translate(offset: Offset(0, dy), child: child);
      },
      child: widget.child,
    );
  }
}

class Breathe extends StatefulWidget {
  const Breathe({
    super.key,
    required this.child,
    this.amplitude = 0.03,
    this.duration = const Duration(milliseconds: 2600),
    this.phaseSeed,
  });

  final Widget child;
  final double amplitude;
  final Duration duration;
  final Object? phaseSeed;

  @override
  State<Breathe> createState() => _BreatheState();
}

class _BreatheState extends State<Breathe> with SingleTickerProviderStateMixin {
  late final AnimationController _ctrl;
  late final double _phase;

  @override
  void initState() {
    super.initState();
    _phase = _PhaseHelper.phase(widget.phaseSeed);
    _ctrl = AnimationController(vsync: this, duration: widget.duration)..repeat();
  }

  @override
  void dispose() {
    _ctrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    if (MediaQuery.of(context).disableAnimations) return widget.child;
    return AnimatedBuilder(
      animation: _ctrl,
      builder: (context, child) {
        final t = (_ctrl.value + _phase) * 2 * math.pi;
        final s = 1.0 + math.sin(t) * widget.amplitude;
        return Transform.scale(scale: s, child: child);
      },
      child: widget.child,
    );
  }
}

class Wiggle extends StatefulWidget {
  const Wiggle({
    super.key,
    required this.child,
    this.amplitudeRadians = 0.06,
    this.duration = const Duration(milliseconds: 1800),
    this.phaseSeed,
  });

  final Widget child;
  final double amplitudeRadians;
  final Duration duration;
  final Object? phaseSeed;

  @override
  State<Wiggle> createState() => _WiggleState();
}

class _WiggleState extends State<Wiggle> with SingleTickerProviderStateMixin {
  late final AnimationController _ctrl;
  late final double _phase;

  @override
  void initState() {
    super.initState();
    _phase = _PhaseHelper.phase(widget.phaseSeed);
    _ctrl = AnimationController(vsync: this, duration: widget.duration)..repeat();
  }

  @override
  void dispose() {
    _ctrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    if (MediaQuery.of(context).disableAnimations) return widget.child;
    return AnimatedBuilder(
      animation: _ctrl,
      builder: (context, child) {
        final t = (_ctrl.value + _phase) * 2 * math.pi;
        final r = math.sin(t) * widget.amplitudeRadians;
        return Transform.rotate(angle: r, child: child);
      },
      child: widget.child,
    );
  }
}

class BouncyTap extends StatefulWidget {
  const BouncyTap({
    super.key,
    required this.child,
    this.onTap,
    this.scaleDown = 0.94,
  });

  final Widget child;
  final VoidCallback? onTap;
  final double scaleDown;

  @override
  State<BouncyTap> createState() => _BouncyTapState();
}

class _BouncyTapState extends State<BouncyTap> {
  bool _pressed = false;

  @override
  Widget build(BuildContext context) {
    final disabled = widget.onTap == null;
    return GestureDetector(
      onTap: disabled ? null : widget.onTap,
      onTapDown: (_) => setState(() => _pressed = true),
      onTapCancel: () => setState(() => _pressed = false),
      onTapUp: (_) => setState(() => _pressed = false),
      behavior: HitTestBehavior.opaque,
      child: AnimatedScale(
        scale: _pressed ? widget.scaleDown : 1.0,
        duration: const Duration(milliseconds: 120),
        curve: Curves.easeOut,
        child: widget.child,
      ),
    );
  }
}

/// The motion choices we support for [CuteIcon] and friends.
enum CuteMotion { none, breathe, bobble, wiggle }

/// Loads an SVG and gives it default gentle motion. Use everywhere you'd
/// otherwise drop a static [Icon] or [SvgPicture].
class CuteIcon extends StatelessWidget {
  const CuteIcon(
    this.asset, {
    super.key,
    this.size = 56,
    this.motion = CuteMotion.breathe,
    this.phaseSeed,
    this.color,
    this.semanticLabel,
  });

  /// Asset name without the `assets/svg/` prefix or `.svg` suffix.
  /// e.g. `'piggy'` resolves to `assets/svg/piggy.svg`.
  final String asset;
  final double size;
  final CuteMotion motion;
  final Object? phaseSeed;
  final Color? color;
  final String? semanticLabel;

  @override
  Widget build(BuildContext context) {
    final svg = SvgPicture.asset(
      'assets/svg/$asset.svg',
      width: size,
      height: size,
      fit: BoxFit.contain,
      semanticsLabel: semanticLabel,
      colorFilter: color == null ? null : ColorFilter.mode(color!, BlendMode.srcIn),
    );
    final phaseKey = phaseSeed ?? asset;
    switch (motion) {
      case CuteMotion.none:
        return svg;
      case CuteMotion.breathe:
        return Breathe(phaseSeed: phaseKey, child: svg);
      case CuteMotion.bobble:
        return Bobble(phaseSeed: phaseKey, child: svg);
      case CuteMotion.wiggle:
        return Wiggle(phaseSeed: phaseKey, child: svg);
    }
  }
}
