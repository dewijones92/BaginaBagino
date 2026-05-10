import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';

import '../theme/tokens.dart';
import '../wire/wire.dart';
import 'cute_motion.dart';

/// Per-card visual metadata. One place to add an entry when a new CardKind
/// is added to the Zod schema: the SVG filename, the gradient pair, and
/// the user-facing label.
class _CardArt {
  const _CardArt({required this.svg, required this.label, required this.light, required this.deep});
  final String svg;
  final String label;
  final Color light;
  final Color deep;
}

const Map<CardKind, _CardArt> _kCardArt = {
  CardKind.tooth: _CardArt(svg: 'card_tooth', label: 'Tooth', light: BaginaPalette.cream, deep: BaginaPalette.creamDeep),
  CardKind.paw: _CardArt(svg: 'card_paw', label: 'Paw', light: BaginaPalette.mint, deep: BaginaPalette.mintDeep),
  CardKind.snout: _CardArt(svg: 'card_snout', label: 'Snout', light: BaginaPalette.pink, deep: BaginaPalette.pinkDeep),
  CardKind.tit: _CardArt(svg: 'card_tit', label: 'Tit', light: BaginaPalette.butter, deep: BaginaPalette.butterDeep),
  CardKind.clever: _CardArt(svg: 'card_clever', label: 'Clever', light: BaginaPalette.lavender, deep: BaginaPalette.lavenderDeep),
  CardKind.brave: _CardArt(svg: 'card_brave', label: 'Brave', light: BaginaPalette.pinkDeep, deep: BaginaPalette.win),
  CardKind.business: _CardArt(svg: 'card_business', label: 'Business', light: BaginaPalette.pooGlow, deep: BaginaPalette.poo),
  CardKind.rainyDay: _CardArt(svg: 'card_rainyday', label: 'Rainy Day', light: BaginaPalette.lavender, deep: BaginaPalette.mintDeep),
  CardKind.marketDay: _CardArt(svg: 'card_marketday', label: 'Market', light: BaginaPalette.butter, deep: BaginaPalette.pinkDeep),
  CardKind.wind: _CardArt(svg: 'card_wind', label: 'Wind', light: BaginaPalette.cream, deep: BaginaPalette.lavenderDeep),
};

/// A single playing card. Tappable for selection.
class CardView extends StatelessWidget {
  const CardView({
    super.key,
    required this.card,
    this.selected = false,
    this.onTap,
  });

  final GameCard card;
  final bool selected;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    final art = _kCardArt[card.kind]!;
    return AnimatedScale(
      scale: selected ? 1.04 : 1.0,
      duration: BaginaDurations.fast,
      curve: Curves.easeOutBack,
      child: GestureDetector(
        onTap: onTap,
        child: Container(
          width: 84,
          height: 116,
          decoration: BoxDecoration(
            gradient: LinearGradient(
              colors: [art.light, art.deep],
              begin: Alignment.topLeft,
              end: Alignment.bottomRight,
            ),
            borderRadius: BorderRadius.circular(BaginaRadii.medium),
            border: Border.all(
              color: selected ? BaginaPalette.pinkDeep : Colors.white,
              width: 3,
            ),
            boxShadow: [
              BoxShadow(
                color: art.deep.withValues(alpha: 0.4),
                blurRadius: selected ? 18 : 10,
                offset: const Offset(0, 4),
              ),
            ],
          ),
          alignment: Alignment.center,
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              CuteIcon(art.svg, size: 42, motion: CuteMotion.breathe, phaseSeed: card.id),
              const SizedBox(height: 4),
              Text(
                art.label,
                style: BaginaTypeScale.caption.copyWith(
                  color: Colors.white,
                  fontWeight: FontWeight.w900,
                  fontSize: 11,
                ),
              ),
            ],
          ),
        ),
      ),
    ).animate().fadeIn(duration: BaginaDurations.fast).scale(curve: Curves.easeOutBack, duration: BaginaDurations.bouncy);
  }
}
