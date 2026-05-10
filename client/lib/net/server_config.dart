/// Server location, settable at build time via --dart-define.
class ServerConfig {
  static const host = String.fromEnvironment('SERVER_HOST', defaultValue: 'localhost');
  static const tls = bool.fromEnvironment('SERVER_TLS', defaultValue: false);

  /// Port: defaults to 3001 (dev) when no TLS, 443 when TLS is on,
  /// can be overridden with --dart-define=SERVER_PORT=…
  static const _portOverride = int.fromEnvironment('SERVER_PORT', defaultValue: -1);
  static int get port => _portOverride > 0 ? _portOverride : (tls ? 443 : 3001);

  static const path = String.fromEnvironment('SERVER_PATH', defaultValue: '');

  /// Origin only — no path. socket.io interprets a path on the URL as
  /// a namespace, which is not what we want.
  static String httpUrl() {
    final scheme = tls ? 'https' : 'http';
    final isStandardPort = (tls && port == 443) || (!tls && port == 80);
    final hostPart = isStandardPort ? host : '$host:$port';
    return '$scheme://$hostPart';
  }

  /// Path the socket.io engine.io endpoint is hosted on, e.g. `/bagina/socket.io`.
  static String socketPath() {
    if (path.isEmpty) return '/socket.io';
    return '${path.replaceAll(RegExp(r'/$'), '')}/socket.io';
  }
}
