#!/usr/bin/env python3
"""
serve.py — the dev server for yash.dev.

Why this exists instead of `python3 -m http.server`:

  * ES modules are fetched in CORS mode. Inside a sandboxed preview iframe the
    page has an *opaque* origin ("null"), so the browser refuses to load
    `js/main.js` unless the response carries Access-Control-Allow-Origin.
  * Caching makes editing a page look like nothing happened, so everything is
    no-store while developing.

Usage:  python3 serve.py [port]      (default 8123)
"""

import http.server
import os
import sys

PORT_DEFAULT = 8123


class Handler(http.server.SimpleHTTPRequestHandler):
    """Static files, CORS for everyone, no cache."""

    extensions_map = {
        **http.server.SimpleHTTPRequestHandler.extensions_map,
        ".js": "text/javascript",
        ".mjs": "text/javascript",
        ".glb": "model/gltf-binary",
        ".gltf": "model/gltf+json",
        ".woff2": "font/woff2",
        ".pdf": "application/pdf",
    }

    def end_headers(self):
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, HEAD, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "*")
        self.send_header("Cross-Origin-Resource-Policy", "cross-origin")
        self.send_header("Cache-Control", "no-store, max-age=0")
        super().end_headers()

    def do_OPTIONS(self):
        self.send_response(204)
        self.end_headers()

    def log_message(self, fmt, *args):
        # keep the console readable; only report real problems
        code = args[1] if len(args) > 1 else ""
        if str(code).startswith(("4", "5")):
            sys.stderr.write("%s — %s\n" % (self.requestline, code))


def main():
    port = int(sys.argv[1]) if len(sys.argv) > 1 else PORT_DEFAULT
    root = os.path.dirname(os.path.abspath(__file__))
    os.chdir(root)
    http.server.ThreadingHTTPServer.allow_reuse_address = True
    with http.server.ThreadingHTTPServer(("0.0.0.0", port), Handler) as httpd:
        print(f"yash.dev → http://0.0.0.0:{port}  (CORS on, cache off)", flush=True)
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            pass


if __name__ == "__main__":
    main()
