# Dev static server: every response is no-store so edited ES modules are never served from cache.
import http.server, os, sys

class NoCache(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Cache-Control', 'no-store')
        super().end_headers()

port = int(sys.argv[1]) if len(sys.argv) > 1 else int(os.environ.get('PORT', 8767))
os.chdir(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'))
http.server.ThreadingHTTPServer(('127.0.0.1', port), NoCache).serve_forever()
