# 開發用靜態伺服器：每個回應都帶 no-store，改完色版重新整理就能看到，不會吃到舊的模組快取
import http.server, os, sys

class NoCache(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Cache-Control', 'no-store')
        super().end_headers()

port = int(sys.argv[1]) if len(sys.argv) > 1 else int(os.environ.get('PORT', 8000))
os.chdir(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'))
# Local artwork review should never expose the repository to the LAN.
http.server.ThreadingHTTPServer(('127.0.0.1', port), NoCache).serve_forever()
