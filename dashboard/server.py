#!/usr/bin/env python3
"""
Einfacher HTTP-Server für das Balkonkraftwerk-Dashboard.
Ausführen: python dashboard/server.py
"""
import http.server
import socketserver
import os
import webbrowser
import threading

PORT = 8765
DIR = os.path.dirname(os.path.abspath(__file__))

class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=DIR, **kwargs)

    def log_message(self, format, *args):
        print(f"  {self.address_string()} → {format % args}")

def open_browser():
    import time
    time.sleep(0.5)
    webbrowser.open(f"http://localhost:{PORT}")

print(f"\n☀️  Balkonkraftwerk Dashboard")
print(f"   Server läuft auf http://localhost:{PORT}")
print(f"   Strg+C zum Beenden\n")

threading.Thread(target=open_browser, daemon=True).start()

with socketserver.TCPServer(("", PORT), Handler) as httpd:
    httpd.allow_reuse_address = True
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\nServer beendet.")
