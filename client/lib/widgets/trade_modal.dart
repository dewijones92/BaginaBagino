import 'package:flutter/material.dart';

import '../theme/player_color_ext.dart';
import '../theme/tokens.dart';
import '../wire/wire.dart';
import 'bouncy_button.dart';
import 'card_view.dart';

/// Modal for composing an outgoing trade offer.
///
/// You pick a partner (one of the other players), tap cards from your hand
/// to give, set poo to give, and optionally ask for poo back. We intentionally
/// don't let you request specific cards by ID — the offerer can't see the
/// recipient's hand, so that would be a fishing UX. Recipients see exactly
/// what's on offer and decide.
class TradeModal extends StatefulWidget {
  const TradeModal({
    super.key,
    required this.you,
    required this.otherPlayers,
    required this.myHand,
    required this.myPoo,
    required this.onSubmit,
  });

  /// You — used to filter from `otherPlayers` defensively.
  final String you;
  final List<PublicPlayer> otherPlayers;
  final List<GameCard> myHand;
  final int myPoo;

  /// Called when the user taps "Send offer". Args are ready-to-send.
  final void Function({
    required String to,
    required List<String> giveCardIds,
    required int givePoo,
    required int requestPoo,
  }) onSubmit;

  @override
  State<TradeModal> createState() => _TradeModalState();
}

class _TradeModalState extends State<TradeModal> {
  String? _partnerId;
  final Set<String> _giveCardIds = {};
  int _givePoo = 0;
  int _requestPoo = 0;

  @override
  void initState() {
    super.initState();
    final candidates = widget.otherPlayers.where((p) => p.id != widget.you).toList();
    if (candidates.isNotEmpty) _partnerId = candidates.first.id;
  }

  void _toggleCard(String id) {
    setState(() {
      if (_giveCardIds.contains(id)) {
        _giveCardIds.remove(id);
      } else {
        _giveCardIds.add(id);
      }
    });
  }

  bool get _canSubmit =>
      _partnerId != null &&
      (_giveCardIds.isNotEmpty || _givePoo > 0 || _requestPoo > 0);

  @override
  Widget build(BuildContext context) {
    final partners = widget.otherPlayers.where((p) => p.id != widget.you).toList();
    return Padding(
      padding: EdgeInsets.only(bottom: MediaQuery.of(context).viewInsets.bottom),
      child: Container(
        decoration: BoxDecoration(
          color: BaginaPalette.cream,
          borderRadius: const BorderRadius.vertical(top: Radius.circular(28)),
        ),
        padding: const EdgeInsets.fromLTRB(20, 16, 20, 20),
        child: SingleChildScrollView(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Center(
                child: Container(
                  width: 40,
                  height: 4,
                  margin: const EdgeInsets.only(bottom: 12),
                  decoration: BoxDecoration(
                    color: BaginaPalette.creamDeep,
                    borderRadius: BorderRadius.circular(2),
                  ),
                ),
              ),
              Text('Offer a trade', style: BaginaTypeScale.title),
              const SizedBox(height: 4),
              Text(
                'Send a deal. They can accept or refuse — no obligation.',
                style: BaginaTypeScale.caption.copyWith(color: BaginaPalette.ink.withValues(alpha: 0.6)),
              ),
              const SizedBox(height: 16),

              Text('Who?', style: BaginaTypeScale.body.copyWith(fontWeight: FontWeight.w800)),
              const SizedBox(height: 6),
              Wrap(
                spacing: 8,
                runSpacing: 8,
                children: [
                  for (final p in partners)
                    _PartnerChip(
                      player: p,
                      selected: _partnerId == p.id,
                      onTap: () => setState(() => _partnerId = p.id),
                    ),
                ],
              ),

              const SizedBox(height: 16),
              Text('Give', style: BaginaTypeScale.body.copyWith(fontWeight: FontWeight.w800)),
              const SizedBox(height: 6),
              if (widget.myHand.isEmpty)
                Padding(
                  padding: const EdgeInsets.symmetric(vertical: 8),
                  child: Text(
                    'No cards in hand to offer.',
                    style: BaginaTypeScale.caption.copyWith(color: BaginaPalette.ink.withValues(alpha: 0.6)),
                  ),
                )
              else
                SizedBox(
                  height: 130,
                  child: ListView.separated(
                    scrollDirection: Axis.horizontal,
                    itemCount: widget.myHand.length,
                    separatorBuilder: (_, _) => const SizedBox(width: 8),
                    itemBuilder: (context, i) {
                      final c = widget.myHand[i];
                      return CardView(
                        card: c,
                        selected: _giveCardIds.contains(c.id),
                        onTap: () => _toggleCard(c.id),
                      );
                    },
                  ),
                ),
              const SizedBox(height: 8),
              _PooStepper(
                label: 'Poo to give',
                value: _givePoo,
                max: widget.myPoo,
                onChanged: (v) => setState(() => _givePoo = v),
              ),

              const SizedBox(height: 16),
              Text('Ask for', style: BaginaTypeScale.body.copyWith(fontWeight: FontWeight.w800)),
              const SizedBox(height: 6),
              _PooStepper(
                label: 'Poo to receive',
                value: _requestPoo,
                max: 99,
                onChanged: (v) => setState(() => _requestPoo = v),
              ),

              const SizedBox(height: 20),
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  TextButton(
                    onPressed: () => Navigator.of(context).pop(),
                    child: const Text('Cancel'),
                  ),
                  BouncyButton(
                    label: 'Send offer',
                    icon: Icons.send_rounded,
                    onPressed: _canSubmit
                        ? () {
                            widget.onSubmit(
                              to: _partnerId!,
                              giveCardIds: _giveCardIds.toList(),
                              givePoo: _givePoo,
                              requestPoo: _requestPoo,
                            );
                            Navigator.of(context).pop();
                          }
                        : null,
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _PartnerChip extends StatelessWidget {
  const _PartnerChip({required this.player, required this.selected, required this.onTap});
  final PublicPlayer player;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final color = player.color.swatch;
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(BaginaRadii.pill),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
        decoration: BoxDecoration(
          color: color,
          borderRadius: BorderRadius.circular(BaginaRadii.pill),
          border: Border.all(
            color: selected ? BaginaPalette.ink : Colors.transparent,
            width: 2,
          ),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            if (selected) const Icon(Icons.check_rounded, size: 16, color: Colors.white),
            if (selected) const SizedBox(width: 4),
            Text(
              player.nickname,
              style: BaginaTypeScale.caption.copyWith(color: Colors.white, fontWeight: FontWeight.w800),
            ),
          ],
        ),
      ),
    );
  }
}

class _PooStepper extends StatelessWidget {
  const _PooStepper({
    required this.label,
    required this.value,
    required this.max,
    required this.onChanged,
  });
  final String label;
  final int value;
  final int max;
  final ValueChanged<int> onChanged;

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Expanded(child: Text(label, style: BaginaTypeScale.body)),
        IconButton(
          icon: const Icon(Icons.remove_circle_outline),
          onPressed: value > 0 ? () => onChanged(value - 1) : null,
        ),
        SizedBox(
          width: 44,
          child: Center(
            child: Text(
              '$value 💩',
              style: BaginaTypeScale.body.copyWith(fontWeight: FontWeight.w800),
              textAlign: TextAlign.center,
            ),
          ),
        ),
        IconButton(
          icon: const Icon(Icons.add_circle_outline),
          onPressed: value < max ? () => onChanged(value + 1) : null,
        ),
      ],
    );
  }
}
