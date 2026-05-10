import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';

import '../theme/tokens.dart';
import '../wire/wire.dart';
import 'cute_motion.dart';

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
    final colors = _colorsFor(card.kind);
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
              colors: [colors.$1, colors.$2],
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
                color: colors.$2.withValues(alpha: 0.4),
                blurRadius: selected ? 18 : 10,
                offset: const Offset(0, 4),
              ),
            ],
          ),
          alignment: Alignment.center,
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              _cardArt(card.kind, card.id),
              const SizedBox(height: 4),
              Text(
                _labelFor(card.kind),
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

  (Color, Color) _colorsFor(CardKind k) {
    switch (k) {
      case CardKind.tooth: return (BaginaPalette.cream, BaginaPalette.creamDeep);
      case CardKind.paw: return (BaginaPalette.mint, BaginaPalette.mintDeep);
      case CardKind.snout: return (BaginaPalette.pink, BaginaPalette.pinkDeep);
      case CardKind.tit: return (BaginaPalette.butter, BaginaPalette.butterDeep);
      case CardKind.clever: return (BaginaPalette.lavender, BaginaPalette.lavenderDeep);
      case CardKind.brave: return (BaginaPalette.pinkDeep, BaginaPalette.win);
      case CardKind.business: return (BaginaPalette.pooGlow, BaginaPalette.poo);
      case CardKind.rainyDay: return (BaginaPalette.lavender, BaginaPalette.mintDeep);
      case CardKind.marketDay: return (BaginaPalette.butter, BaginaPalette.pinkDeep);
      case CardKind.wind: return (BaginaPalette.cream, BaginaPalette.lavenderDeep);
    }
  }

  // Each card kind maps to a custom SVG with its own gentle breathing motion.
  Widget _cardArt(CardKind k, String phaseSeed) {
    final svg = switch (k) {
      CardKind.tooth => 'card_tooth',
      CardKind.paw => 'card_paw',
      CardKind.snout => 'card_snout',
      CardKind.tit => 'card_tit',
      CardKind.clever => 'card_clever',
      CardKind.brave => 'card_brave',
      CardKind.business => 'card_business',
      CardKind.rainyDay => 'card_rainyday',
      CardKind.marketDay => 'card_marketday',
      CardKind.wind => 'card_wind',
    };
    return CuteIcon(svg, size: 42, motion: CuteMotion.breathe, phaseSeed: phaseSeed);
  }

  String _labelFor(CardKind k) {
    switch (k) {
      case CardKind.tooth: return 'Tooth';
      case CardKind.paw: return 'Paw';
      case CardKind.snout: return 'Snout';
      case CardKind.tit: return 'Tit';
      case CardKind.clever: return 'Clever';
      case CardKind.brave: return 'Brave';
      case CardKind.business: return 'Business';
      case CardKind.rainyDay: return 'Rainy Day';
      case CardKind.marketDay: return 'Market';
      case CardKind.wind: return 'Wind';
    }
  }
}
