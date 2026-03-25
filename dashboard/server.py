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

RESULT_CSV = os.path.join(os.path.dirname(DIR), 'result', 'result.csv')

class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=DIR, **kwargs)

    def do_GET(self):
        if self.path == '/result.csv':
            try:
                with open(RESULT_CSV, 'rb') as f:
                    content = f.read()
                self.send_response(200)
                self.send_header('Content-Type', 'text/csv; charset=utf-8')
                self.send_header('Content-Length', str(len(content)))
                self.end_headers()
                self.wfile.write(content)
            except FileNotFoundError:
                self.send_error(404, 'result.csv not found')
            return
        super().do_GET()

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
