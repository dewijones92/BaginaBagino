#!/usr/bin/env python3
"""
Public dev-URL helper: rebuild the Flutter web bundle on every source save and
serve build/web/ on port 8888 so the SSH reverse tunnel can publish it at
https://333133333.xyz/bagina-dev/.

Why this exists instead of `flutter run -d web-server`:
  - Browsers block ws:// from https:// pages (mixed content).
  - The dev server's injected DDC client uses ws://localhost:<port>, which
    cannot work over the HTTPS tunnel — so the dev page hangs on the loader.
  - This script trades hot reload for a public URL that actually renders.
    Save a file → flutter rebuilds (~3-5s incremental) → refresh the tab.

Usage:
    python3 scripts/dev-public-watch.py
    # Ctrl-C to stop.
"""
from __future__ import annotations

import http.server
import os
import socketserver
import subprocess
import sys
import threading
import time
from pathlib import Path

try:
    from watchdog.observers import Observer
    from watchdog.events import FileSystemEventHandler
except ImportError:
    print("watchdog not installed. Run:")
    print("  pip3 install --user --break-system-packages watchdog")
    sys.exit(1)

ROOT = Path(__file__).resolve().parent.parent
CLIENT = ROOT / "client"
BUILD_WEB = CLIENT / "build" / "web"
PORT = int(os.environ.get("BAGINA_DEV_PORT", "8888"))

# Paths whose changes should trigger a rebuild. Keep this tight so we don't
# fire on build outputs or pnpm-store noise.
WATCH = [
    CLIENT / "lib",
    CLIENT / "assets",
    CLIENT / "pubspec.yaml",
    ROOT / "packages" / "schema" / "src",
    ROOT / "packages" / "schema" / "data",
    ROOT / "packages" / "theme" / "tokens.yaml",
]

# Same dart-defines the production build uses, but pointed at the dev mount.
DEFINES = [
    "--dart-define=SERVER_HOST=333133333.xyz",
    "--dart-define=SERVER_PATH=/bagina-dev",
    "--dart-define=SERVER_TLS=true",
]

FLUTTER = os.environ.get("FLUTTER_BIN", str(Path.home() / "code" / "flutter" / "bin" / "flutter"))


def run_build(reason: str) -> bool:
    """One full build. If a schema file changed, regen first."""
    print(f"\n[build] triggered by: {reason}")
    t0 = time.time()
    if "schema" in reason or "tokens.yaml" in reason:
        print("[build] running pnpm gen first…")
        rc = subprocess.call(["pnpm", "gen"], cwd=ROOT)
        if rc != 0:
            print(f"[build] pnpm gen failed (rc={rc})")
            return False
    rc = subprocess.call(
        [FLUTTER, "build", "web", "--debug", "--base-href=/bagina-dev/", *DEFINES],
        cwd=CLIENT,
    )
    dt = time.time() - t0
    if rc != 0:
        print(f"[build] FAILED in {dt:.1f}s (rc={rc})")
        return False
    print(f"[build] OK in {dt:.1f}s — refresh https://333133333.xyz/bagina-dev/")
    return True


class _Debouncer(FileSystemEventHandler):
    """Coalesce file events into a single rebuild ~500 ms after the last one."""

    def __init__(self):
        self._lock = threading.Lock()
        self._pending: str | None = None
        self._timer: threading.Timer | None = None

    def on_any_event(self, event):  # noqa: ANN001
        if event.is_directory:
            return
        path = str(event.src_path)
        # Ignore obvious build/IDE noise
        if "/build/" in path or "/.dart_tool/" in path or path.endswith("~") or "/__pycache__/" in path:
            return
        with self._lock:
            self._pending = path
            if self._timer:
                self._timer.cancel()
            self._timer = threading.Timer(0.6, self._fire)
            self._timer.daemon = True
            self._timer.start()

    def _fire(self):
        with self._lock:
            reason = self._pending or "unknown"
            self._pending = None
        run_build(reason)


def serve():
    # Quiet handler — don't spam the logs with every asset request.
    class Q(http.server.SimpleHTTPRequestHandler):
        def log_message(self, *_args):
            return
        def end_headers(self):
            # Discourage caching the index so refreshes show new builds.
            if self.path in ("/", "/index.html"):
                self.send_header("Cache-Control", "no-store")
            super().end_headers()

    os.chdir(BUILD_WEB)
    with socketserver.ThreadingTCPServer(("0.0.0.0", PORT), Q) as httpd:
        print(f"[serve] http://0.0.0.0:{PORT} → {BUILD_WEB}")
        httpd.serve_forever()


def main():
    BUILD_WEB.mkdir(parents=True, exist_ok=True)
    # Initial build
    if not run_build("startup"):
        print("[main] initial build failed — fix it and rerun")
        sys.exit(1)

    # File watcher
    obs = Observer()
    handler = _Debouncer()
    for p in WATCH:
        if p.exists():
            obs.schedule(handler, str(p), recursive=p.is_dir())
            print(f"[watch] {p}")
    obs.start()

    # Server in a thread so the watcher's Observer keeps the main thread alive
    t = threading.Thread(target=serve, daemon=True)
    t.start()

    try:
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        print("\n[main] bye")
        obs.stop()
        obs.join()


if __name__ == "__main__":
    main()
