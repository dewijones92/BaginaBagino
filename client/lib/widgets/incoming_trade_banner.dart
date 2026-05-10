import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';

import '../theme/tokens.dart';
import '../wire/wire.dart';

/// Banner that surfaces when someone else has offered you a trade.
/// Pure presentation — `onAccept` / `onReject` push the action to the server.
class IncomingTradeBanner extends StatelessWidget {
  const IncomingTradeBanner({
    super.key,
    required this.offer,
    required this.fromNickname,
    required this.cardKindsGive,
    required this.onAccept,
    required this.onReject,
  });

  final TradeOffer offer;
  final String fromNickname;
  /// The card *kinds* (not ids) the partner is offering, so we can show
  /// "2 Tooth + 1 Paw" rather than scary uuids.
  final List<String> cardKindsGive;
  final VoidCallback onAccept;
  final VoidCallback onReject;

  String _summarise() {
    final parts = <String>[];
    if (cardKindsGive.isNotEmpty) {
      // Group by kind into a tally.
      final tally = <String, int>{};
      for (final k in cardKindsGive) {
        tally[k] = (tally[k] ?? 0) + 1;
      }
      parts.addAll(tally.entries.map((e) => '${e.value}× ${e.key}'));
    }
    if (offer.givePoo > 0) parts.add('${offer.givePoo} 💩');
    if (parts.isEmpty) parts.add('nothing 🤔');
    final ask = offer.requestPoo > 0 ? ' for ${offer.requestPoo} 💩' : ' for nothing';
    return '${parts.join(' + ')}$ask';
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.fromLTRB(16, 8, 16, 8),
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: BaginaPalette.butter,
        borderRadius: BorderRadius.circular(BaginaRadii.large),
        border: Border.all(color: BaginaPalette.butterDeep, width: 2),
        boxShadow: [
          BoxShadow(color: BaginaPalette.butterDeep.withValues(alpha: 0.35), blurRadius: 12, offset: const Offset(0, 4)),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              const Text('🤝', style: TextStyle(fontSize: 22)),
              const SizedBox(width: 8),
              Expanded(
                child: Text(
                  '$fromNickname offers you a trade',
                  style: BaginaTypeScale.body.copyWith(fontWeight: FontWeight.w800),
                  overflow: TextOverflow.ellipsis,
                ),
              ),
            ],
          ),
          const SizedBox(height: 4),
          Text(_summarise(), style: BaginaTypeScale.caption),
          const SizedBox(height: 8),
          Row(
            mainAxisAlignment: MainAxisAlignment.end,
            children: [
              TextButton.icon(
                onPressed: onReject,
                icon: const Icon(Icons.close_rounded, size: 18),
                label: const Text('Nah'),
              ),
              const SizedBox(width: 6),
              FilledButton.icon(
                onPressed: onAccept,
                icon: const Icon(Icons.check_rounded, size: 18),
                label: const Text('Done deal'),
                style: FilledButton.styleFrom(
                  backgroundColor: BaginaPalette.mintDeep,
                  foregroundColor: Colors.white,
                ),
              ),
            ],
          ),
        ],
      ),
    ).animate().fadeIn(duration: BaginaDurations.medium);
  }
}
