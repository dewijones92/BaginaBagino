import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../state/game_state.dart';
import '../theme/tokens.dart';
import '../widgets/bouncy_button.dart';
import '../wire/wire.dart';

class HomePage extends ConsumerStatefulWidget {
  const HomePage({super.key});

  @override
  ConsumerState<HomePage> createState() => _HomePageState();
}

class _HomePageState extends ConsumerState<HomePage> {
  final _nick = TextEditingController(text: '');
  final _code = TextEditingController(text: '');
  bool _busy = false;


  @override
  void dispose() {
    _nick.dispose();
    _code.dispose();
    super.dispose();
  }

  Future<void> _create() async {
    final nick = _nick.text.trim();
    if (nick.isEmpty) return _toast('Need a nickname, you gormless soul.');
    setState(() => _busy = true);
    final socket = ref.read(socketProvider);
    socket.send(CreateRoomAction(nickname: nick));
  }

  Future<void> _join() async {
    final nick = _nick.text.trim();
    final code = _code.text.trim().toUpperCase();
    if (nick.isEmpty) return _toast('Need a nickname, you gormless soul.');
    if (!RegExp(r'^[ABCDEFGHJKMNPQRSTUVWXYZ23456789]{4}$').hasMatch(code)) {
      return _toast('That code looks suspicious. 4 chars, no I/O/L/0/1.');
    }
    setState(() => _busy = true);
    final socket = ref.read(socketProvider);
    socket.send(JoinRoomAction(code: code, nickname: nick));
  }

  void _toast(String text) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(text),
        behavior: SnackBarBehavior.floating,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(BaginaRadii.medium)),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    ref.listen<GameStateSnapshot?>(gameStateProvider, (prev, next) {
      if (next != null && next.code.isNotEmpty && mounted) {
        context.go('/lobby/${next.code}');
      }
    });
    return Scaffold(
      body: SafeArea(
        child: Center(
          child: SingleChildScrollView(
            padding: const EdgeInsets.all(24),
            child: ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 480),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  const SizedBox(height: 24),
                  _Title()
                      .animate()
                      .fadeIn(duration: BaginaDurations.medium)
                      .scale(curve: Curves.easeOutBack, duration: BaginaDurations.bouncy),
                  const SizedBox(height: 8),
                  Text(
                    'Build a bagino. Build a bagina. Hoard poo.',
                    style: BaginaTypeScale.caption.copyWith(color: BaginaPalette.ink.withValues(alpha: 0.7)),
                    textAlign: TextAlign.center,
                  ),
                  const SizedBox(height: 28),
                  TextField(
                    controller: _nick,
                    maxLength: 20,
                    decoration: const InputDecoration(
                      labelText: 'Your nickname',
                      hintText: 'e.g. Sir Ruffles',
                    ),
                  ),
                  const SizedBox(height: 16),
                  Card(
                    child: Padding(
                      padding: const EdgeInsets.all(16),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.stretch,
                        children: [
                          Text('Start a new room', style: BaginaTypeScale.title),
                          const SizedBox(height: 12),
                          Center(
                            child: BouncyButton(
                              icon: Icons.add_rounded,
                              label: _busy ? 'Spinning up…' : 'Create room',
                              onPressed: _busy ? null : _create,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                  const SizedBox(height: 12),
                  Card(
                    child: Padding(
                      padding: const EdgeInsets.all(16),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.stretch,
                        children: [
                          Text('Join a friend', style: BaginaTypeScale.title),
                          const SizedBox(height: 8),
                          TextField(
                            controller: _code,
                            decoration: const InputDecoration(
                              labelText: 'Room code',
                              hintText: 'ABCD',
                            ),
                            textCapitalization: TextCapitalization.characters,
                            maxLength: 4,
                          ),
                          const SizedBox(height: 4),
                          Center(
                            child: BouncyButton(
                              icon: Icons.login_rounded,
                              label: 'Join room',
                              color: BaginaPalette.lavenderDeep,
                              onPressed: _busy ? null : _join,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                  const SizedBox(height: 32),
                  Center(
                    child: Text(
                      'A daft little board game.',
                      style: BaginaTypeScale.caption.copyWith(color: BaginaPalette.ink.withValues(alpha: 0.5)),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}

class _Title extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return Text(
      'Bagino Bagina',
      textAlign: TextAlign.center,
      style: BaginaTypeScale.display.copyWith(color: BaginaPalette.pinkDeep, fontSize: 44, height: 1.0),
    );
  }
}
