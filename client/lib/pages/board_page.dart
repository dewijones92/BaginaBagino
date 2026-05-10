import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../state/game_state.dart';
import '../theme/tokens.dart';
import '../widgets/board_view.dart';
import '../widgets/bouncy_button.dart';
import '../widgets/card_view.dart';
import '../wire/wire.dart';

class BoardPage extends ConsumerStatefulWidget {
  const BoardPage({super.key});
  @override
  ConsumerState<BoardPage> createState() => _BoardPageState();
}

class _BoardPageState extends ConsumerState<BoardPage> {
  final Set<String> _selected = {};

  void _toggleSelect(String cardId) {
    setState(() {
      if (_selected.contains(cardId)) {
        _selected.remove(cardId);
      } else {
        _selected.add(cardId);
      }
    });
  }

  // Show the player how close they are to a Bagino (3 Tooth + 2 Paw + 1 Snout)
  // or a Bagina (2 Tooth + 3 Paw + 1 Tit) so resource cards feel useful.
  String _handHint(GameStateSnapshot state) {
    int count(CardKind k) => state.hand.where((c) => c.kind == k).length;
    final teeth = count(CardKind.tooth);
    final paws = count(CardKind.paw);
    final snouts = count(CardKind.snout);
    final tits = count(CardKind.tit);
    final baginoMissing = [
      if (teeth < 3) '${3 - teeth} more Tooth',
      if (paws < 2) '${2 - paws} more Paw',
      if (snouts < 1) '${1 - snouts} Snout',
    ];
    final baginaMissing = [
      if (teeth < 2) '${2 - teeth} more Tooth',
      if (paws < 3) '${3 - paws} more Paw',
      if (tits < 1) '${1 - tits} Tit',
    ];
    if (baginoMissing.isEmpty) {
      return 'Tap 3 Teeth + 2 Paws + 1 Snout, then "Declare!"';
    }
    if (baginaMissing.isEmpty) {
      return 'Tap 2 Teeth + 3 Paws + 1 Tit, then "Declare!"';
    }
    final closer = baginoMissing.length <= baginaMissing.length ? ('Bagino', baginoMissing) : ('Bagina', baginaMissing);
    return 'Closest to ${closer.$1}: need ${closer.$2.join(' + ')}.';
  }

  @override
  Widget build(BuildContext context) {
    ref.listen<GameStateSnapshot?>(gameStateProvider, (prev, next) {
      if (!mounted) return;
      if (next == null) {
        context.go('/');
        return;
      }
      if (next.phase == RoomPhase.finished) {
        context.go('/results');
      }
    });
    final state = ref.watch(gameStateProvider);
    if (state == null) {
      return const Scaffold(body: Center(child: CircularProgressIndicator()));
    }
    final me = state.me;
    final socket = ref.read(socketProvider);

    return Scaffold(
      body: SafeArea(
        child: Column(
          children: [
            _Header(state: state),
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16),
              child: BoardView(players: state.players, activePlayerId: state.activePlayerId),
            ),
            const SizedBox(height: 8),
            Expanded(
              child: SingleChildScrollView(
                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text('Your hand (${state.hand.length})', style: BaginaTypeScale.title),
                        if (me != null)
                          _PooBadge(amount: me.poo).animate(target: 1).scale(curve: Curves.easeOutBack, duration: BaginaDurations.bouncy),
                      ],
                    ),
                    const SizedBox(height: 8),
                    SizedBox(
                      height: 130,
                      child: state.hand.isEmpty
                          ? Center(
                              child: Text(
                                'Your hand is suspiciously empty.',
                                style: BaginaTypeScale.caption.copyWith(color: BaginaPalette.ink.withValues(alpha: 0.6)),
                              ),
                            )
                          : ListView.separated(
                              scrollDirection: Axis.horizontal,
                              padding: const EdgeInsets.symmetric(vertical: 6),
                              itemCount: state.hand.length,
                              separatorBuilder: (_, _) => const SizedBox(width: 10),
                              itemBuilder: (context, i) {
                                final c = state.hand[i];
                                return CardView(
                                  card: c,
                                  selected: _selected.contains(c.id),
                                  onTap: () => _toggleSelect(c.id),
                                );
                              },
                            ),
                    ),
                    const SizedBox(height: 16),
                    Text('Actions', style: BaginaTypeScale.title),
                    const SizedBox(height: 8),
                    Builder(builder: (context) {
                      // Trades aren't wired in the UI yet, so don't render
                      // their buttons. The server still accepts the actions
                      // for clients that learn the protocol.
                      final wired = state.legalActions
                          .where((a) =>
                              a != LegalActionKind.offerTrade &&
                              a != LegalActionKind.respondTrade)
                          .toList();
                      if (wired.isEmpty) {
                        return Padding(
                          padding: const EdgeInsets.symmetric(vertical: 12),
                          child: Center(
                            child: Text(
                              state.isMyTurn ? 'No legal moves. Press your luck.' : 'Wait for your turn, you keen bean.',
                              style: BaginaTypeScale.caption.copyWith(color: BaginaPalette.ink.withValues(alpha: 0.6)),
                            ),
                          ),
                        );
                      }
                      return Wrap(
                        spacing: 10,
                        runSpacing: 10,
                        children: wired
                            .map((a) => _ActionButton(
                                  action: a,
                                  selectedIds: _selected,
                                  onSent: () => setState(_selected.clear),
                                  onSend: socket.send,
                                ))
                            .toList(),
                      );
                    }),
                    if (state.isMyTurn && state.hand.isNotEmpty) ...[
                      const SizedBox(height: 10),
                      Text(
                        _handHint(state),
                        style: BaginaTypeScale.caption.copyWith(color: BaginaPalette.ink.withValues(alpha: 0.65)),
                      ),
                    ],
                    const SizedBox(height: 24),
                    if (state.homeworkHints.isNotEmpty) ...[
                      Text('Homework whispers', style: BaginaTypeScale.title),
                      const SizedBox(height: 6),
                      ...state.homeworkHints.map((h) => Card(
                        child: Padding(
                          padding: const EdgeInsets.all(12),
                          child: Row(
                            children: [
                              const Text('🤫', style: TextStyle(fontSize: 22)),
                              const SizedBox(width: 8),
                              Expanded(child: Text(h.text, style: BaginaTypeScale.body)),
                            ],
                          ),
                        ),
                      )),
                    ],
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _Header extends StatelessWidget {
  const _Header({required this.state});
  final GameStateSnapshot state;
  @override
  Widget build(BuildContext context) {
    final me = state.me;
    final activeName = state.players.where((p) => p.id == state.activePlayerId).map((p) => p.nickname).firstOrNull;
    final whose = state.isMyTurn ? 'Your shout!' : (activeName == null ? '' : '$activeName is going');
    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 8, 16, 8),
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
            decoration: BoxDecoration(
              color: BaginaPalette.creamWarm,
              borderRadius: BorderRadius.circular(BaginaRadii.pill),
            ),
            child: Text('Room ${state.code}', style: BaginaTypeScale.caption.copyWith(fontWeight: FontWeight.w800)),
          ),
          const SizedBox(width: 8),
          Expanded(
            child: Text(whose, style: BaginaTypeScale.title.copyWith(color: BaginaPalette.pinkDeep), overflow: TextOverflow.ellipsis),
          ),
          if (me != null)
            Text('Slot ${me.slot + 1}/40', style: BaginaTypeScale.caption.copyWith(color: BaginaPalette.ink.withValues(alpha: 0.6))),
        ],
      ),
    );
  }
}

class _PooBadge extends StatelessWidget {
  const _PooBadge({required this.amount});
  final int amount;
  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
      decoration: BoxDecoration(
        color: BaginaPalette.pooGlow,
        borderRadius: BorderRadius.circular(BaginaRadii.pill),
        border: Border.all(color: BaginaPalette.poo, width: 2),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          const Text('💩', style: TextStyle(fontSize: 16)),
          const SizedBox(width: 4),
          Text('$amount', style: BaginaTypeScale.body.copyWith(fontWeight: FontWeight.w900)),
        ],
      ),
    );
  }
}

class _ActionButton extends StatelessWidget {
  const _ActionButton({
    required this.action,
    required this.selectedIds,
    required this.onSent,
    required this.onSend,
  });
  final LegalActionKind action;
  final Set<String> selectedIds;
  final VoidCallback onSent;
  final void Function(GameAction) onSend;

  @override
  Widget build(BuildContext context) {
    final (label, color, icon) = _present();
    return BouncyButton(
      label: label,
      icon: icon,
      color: color,
      onPressed: () {
        final action = _toAction(context);
        if (action != null) {
          onSend(action);
          onSent();
        }
      },
    );
  }

  GameAction? _toAction(BuildContext context) {
    switch (action) {
      case LegalActionKind.moveToken: return const MoveTokenAction();
      case LegalActionKind.drawCard: return const DrawCardAction();
      case LegalActionKind.endTurn: return const EndTurnAction();
      case LegalActionKind.playCard:
        if (selectedIds.length != 1) {
          ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Pick one special card to play.')));
          return null;
        }
        return PlayCardAction(cardId: selectedIds.first);
      case LegalActionKind.declareCompletion:
        if (selectedIds.length != 6) {
          ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Pick exactly 6 cards (3+2+1) to declare.')));
          return null;
        }
        // Heuristic: try bagino first, then bagina. Server validates.
        return DeclareCompletionAction(what: CompletionKind.bagino, cardIds: selectedIds.toList());
      case LegalActionKind.offerTrade:
      case LegalActionKind.respondTrade:
        ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Trades coming in v1.1, hold tight.')));
        return null;
    }
  }

  (String, Color, IconData) _present() {
    switch (action) {
      case LegalActionKind.moveToken:
        return ('Take a step', BaginaPalette.pinkDeep, Icons.directions_walk_rounded);
      case LegalActionKind.drawCard:
        return ('Grab a card (3 💩)', BaginaPalette.lavenderDeep, Icons.style_rounded);
      case LegalActionKind.playCard:
        return ('Play selected', BaginaPalette.mintDeep, Icons.auto_awesome_rounded);
      case LegalActionKind.offerTrade:
        return ('Offer a trade', BaginaPalette.butterDeep, Icons.swap_horiz_rounded);
      case LegalActionKind.respondTrade:
        return ('Trade open', BaginaPalette.butterDeep, Icons.move_to_inbox_rounded);
      case LegalActionKind.declareCompletion:
        return ('Declare!', BaginaPalette.win, Icons.celebration_rounded);
      case LegalActionKind.endTurn:
        return ('Wrap turn', BaginaPalette.uhOh, Icons.fast_forward_rounded);
    }
  }
}
