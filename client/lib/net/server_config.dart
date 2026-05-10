/// Server location, settable at build time via --dart-define.
/// Defaults to local dev (host = 10.0.2.2 from emulator, localhost from web).
class ServerConfig {
  static const host = String.fromEnvironment('SERVER_HOST', defaultValue: 'localhost');
  static const port = int.fromEnvironment('SERVER_PORT', defaultValue: 3001);
  static const path = String.fromEnvironment('SERVER_PATH', defaultValue: '');
  static const tls = bool.fromEnvironment('SERVER_TLS', defaultValue: false);

  static String httpUrl() {
    final scheme = tls ? 'https' : 'http';
    final basePath = path.isEmpty ? '' : path;
    final hasPort = !tls || port != 443;
    final hostPart = hasPort ? '$host:$port' : host;
    return '$scheme://$hostPart$basePath';
  }

  static String socketPath() {
    if (path.isEmpty) return '/socket.io';
    return '${path.replaceAll(RegExp(r'/$'), '')}/socket.io';
  }
}
