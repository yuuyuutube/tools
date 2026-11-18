# Export the draw-screen card faces from the Sunburst finals.
# usage: python scripts/export-faces.py
# Reads docs/tarot-sunburst/batch-XX/N-final-3x5.png (and the Fool's final),
# writes assets/faces/<card-id>.webp at 600 × 1000 for the app and the result poster.
import os, re
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DOCS = os.path.join(ROOT, 'docs', 'tarot-sunburst')
OUT = os.path.join(ROOT, 'assets', 'faces')

with open(os.path.join(ROOT, 'src', 'data', 'cards.js'), encoding='utf8') as f:
    ids = [m.group(2) for m in re.finditer(r"card\(\s*(\d+)\s*,\s*'[^']*'\s*,\s*'([^']+)'", f.read())]
assert len(ids) == 22, ids

os.makedirs(OUT, exist_ok=True)
for n, card_id in enumerate(ids):
    src = (os.path.join(DOCS, 'fool-pipeline', 'fool-final-3x5.png') if n == 0
           else os.path.join(DOCS, f'batch-{(n - 1) // 3 + 1:02d}', f'{n}-final-3x5.png'))
    im = Image.open(src).convert('RGB').resize((600, 1000), Image.LANCZOS)
    dst = os.path.join(OUT, f'{card_id}.webp')
    im.save(dst, 'WEBP', quality=88, method=6)
    print(f'{n:2d} {card_id:16s} {os.path.getsize(dst) // 1024} KB')
