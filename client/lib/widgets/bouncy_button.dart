import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import '../theme/tokens.dart';

class BouncyButton extends StatefulWidget {
  const BouncyButton({
    super.key,
    required this.label,
    required this.onPressed,
    this.icon,
    this.color,
    this.foreground,
  });

  final String label;
  final VoidCallback? onPressed;
  final IconData? icon;
  final Color? color;
  final Color? foreground;

  @override
  State<BouncyButton> createState() => _BouncyButtonState();
}

class _BouncyButtonState extends State<BouncyButton> {
  bool _pressed = false;

  @override
  Widget build(BuildContext context) {
    final disabled = widget.onPressed == null;
    final bg = widget.color ?? BaginaPalette.pinkDeep;
    return AnimatedScale(
      scale: _pressed ? 0.96 : 1.0,
      duration: BaginaDurations.fast,
      curve: Curves.easeOut,
      child: Material(
        color: disabled ? bg.withValues(alpha: 0.4) : bg,
        elevation: disabled ? 0 : BaginaElevation.card,
        shadowColor: bg.withValues(alpha: 0.5),
        borderRadius: BorderRadius.circular(BaginaRadii.pill),
        child: InkWell(
          onTap: disabled ? null : widget.onPressed,
          onTapDown: (_) => setState(() => _pressed = true),
          onTapCancel: () => setState(() => _pressed = false),
          onTapUp: (_) => setState(() => _pressed = false),
          borderRadius: BorderRadius.circular(BaginaRadii.pill),
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 14),
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                if (widget.icon != null) ...[
                  Icon(widget.icon, color: widget.foreground ?? Colors.white, size: 22),
                  const SizedBox(width: 10),
                ],
                Text(
                  widget.label,
                  style: BaginaTypeScale.body.copyWith(
                    color: widget.foreground ?? Colors.white,
                    fontWeight: FontWeight.w800,
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    ).animate(target: disabled ? 0 : 1).shimmer(duration: BaginaDurations.slow, color: Colors.white24);
  }
}
