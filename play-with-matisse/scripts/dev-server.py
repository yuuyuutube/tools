# Dev static server: every response is no-store so edited ES modules are never served from cache.
# It also accepts the forest editors' saves: POST /__save/intro-layout writes src/intro-layout.js, and
# POST /__save/og-layout writes src/og-layout.js and re-renders og.png.
import http.server, json, os, re, subprocess, sys

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
TARGETS = {
    '/__save/intro-layout': ('intro-layout.js', '''// Hand-tuned overrides for the intro forest, written by scripts/intro-editor.html (via the dev server).
// colors: piece key → fill. z: piece key → stacking rank (higher is in front); "title" is the cut-paper title.
'''),
    '/__save/og-layout': ('og-layout.js', '''// OG-image-only overrides, written by scripts/og-editor.html (via the dev server). They sit on top of
// intro-layout.js: colors replace the intro's for those keys; a non-empty z replaces the intro's stacking.
'''),
}
HEX = re.compile(r'^#[0-9A-Fa-f]{6}$')
KEY = re.compile(r'^(title|L\d-\d{1,3}|B\d{1,2})$')

def clean(data):
    if not isinstance(data, dict):
        raise ValueError('not an object')
    colors = {k: v.upper() for k, v in (data.get('colors') or {}).items() if KEY.match(k) and isinstance(v, str) and HEX.match(v)}
    z = {k: round(float(v), 2) for k, v in (data.get('z') or {}).items() if KEY.match(k) and isinstance(v, (int, float))}
    return {'colors': colors, 'z': z}

class NoCache(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Cache-Control', 'no-store')
        super().end_headers()

    def do_POST(self):
        if self.path not in TARGETS:
            self.send_error(404)
            return
        name, header = TARGETS[self.path]
        try:
            n = int(self.headers.get('Content-Length') or 0)
            if n > 100_000:
                raise ValueError('too large')
            layout = clean(json.loads(self.rfile.read(n)))
            body = header + 'export default ' + json.dumps(layout, indent=2, sort_keys=True, ensure_ascii=False) + ';\n'
            with open(os.path.join(ROOT, 'src', name), 'w', encoding='utf-8') as f:
                f.write(body)
            out, code = {'ok': True, 'colors': len(layout['colors']), 'z': len(layout['z'])}, 200
            if name == 'og-layout.js':
                env = dict(os.environ, BASE=f'http://localhost:{self.server.server_address[1]}')
                subprocess.run([os.path.join(ROOT, 'scripts', 'render-og.sh'), 'og'], cwd=ROOT, env=env, check=True, capture_output=True, timeout=60)
                out['rendered'] = True
        except Exception as e:
            out, code = {'ok': False, 'error': str(e)}, 400
        payload = json.dumps(out).encode()
        self.send_response(code)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Content-Length', str(len(payload)))
        self.end_headers()
        self.wfile.write(payload)

port = int(sys.argv[1]) if len(sys.argv) > 1 else int(os.environ.get('PORT', 8767))
os.chdir(ROOT)
http.server.ThreadingHTTPServer(('127.0.0.1', port), NoCache).serve_forever()
