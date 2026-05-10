import 'dart:async';
import 'package:flutter/foundation.dart';
import 'package:socket_io_client/socket_io_client.dart' as io;

import '../wire/wire.dart';
import 'server_config.dart';

/// Wrapper around socket.io that converts incoming JSON into typed
/// [ServerEvent]s and lets callers send typed [GameAction]s.
class BaginaSocket {
  BaginaSocket._(this._socket);

  final io.Socket _socket;
  final _events = StreamController<ServerEvent>.broadcast();
  final _connected = StreamController<bool>.broadcast();

  Stream<ServerEvent> get events => _events.stream;
  Stream<bool> get connectionChanges => _connected.stream;
  bool get isConnected => _socket.connected;
  String? get id => _socket.id;

  static BaginaSocket connect() {
    final url = ServerConfig.httpUrl();
    final path = ServerConfig.socketPath();
    debugPrint('[BaginaSocket] connecting to $url (path=$path)');
    final socket = io.io(
      url,
      io.OptionBuilder()
          .setTransports(['websocket', 'polling'])
          .setPath(path)
          .enableReconnection()
          .setReconnectionDelay(800)
          .build(),
    );
    final s = BaginaSocket._(socket);
    socket.on('connect', (_) {
      debugPrint('[BaginaSocket] connected id=${socket.id}');
      s._connected.add(true);
    });
    socket.on('disconnect', (reason) {
      debugPrint('[BaginaSocket] disconnect: $reason');
      s._connected.add(false);
    });
    socket.on('connect_error', (err) {
      debugPrint('[BaginaSocket] connect_error: $err');
    });
    socket.on('error', (err) {
      debugPrint('[BaginaSocket] error: $err');
    });
    socket.on('event', (data) {
      try {
        if (data is Map) {
          final ev = ServerEvent.fromJson(Map<String, dynamic>.from(data));
          s._events.add(ev);
        }
      } catch (e) {
        debugPrint('[BaginaSocket] bad event payload: $e');
      }
    });
    socket.connect();
    return s;
  }

  void send(GameAction action) {
    _socket.emit('action', action.toJson());
  }

  Future<void> close() async {
    _socket.dispose();
    await _events.close();
    await _connected.close();
  }
}
