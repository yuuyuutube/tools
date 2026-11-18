# Full, unclipped art for window-editor.html, rebuilt from the colour plates.
# usage: python scripts/export-art-preview.py
# Plates (1024 × 1536): Y/O/B density in G; N holds ink in R and the dark tint in G.
# Writes docs/tarot-sunburst/art-preview/N.webp (flat colour + ink, bleed included).
import os
import numpy as np
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DOCS = os.path.join(ROOT, 'docs', 'tarot-sunburst')
OUT = os.path.join(DOCS, 'art-preview')
PAPER = np.array([246, 239, 224], float)
INK = {'Y': [232, 183, 77], 'O': [222, 83, 43], 'B': [62, 112, 150], 'N': [30, 40, 74]}

os.makedirs(OUT, exist_ok=True)
for n in range(22):
    base = (os.path.join(DOCS, 'fool-pipeline', 'fool-{}-source.png') if n == 0
            else os.path.join(DOCS, f'batch-{(n - 1) // 3 + 1:02d}', f'{n}-{{}}-source.png'))
    plate = {k: np.asarray(Image.open(base.format(k)).convert('RGB'), float) / 255 for k in INK}
    color = np.broadcast_to(PAPER, plate['Y'].shape).copy()
    for k in 'YOB':
        d = plate[k][..., 1:2]
        color *= 1 - d + d * np.array(INK[k]) / 255
    dark = plate['N'][..., 1:2]
    color *= 1 - dark + dark * np.array(INK['N']) / 255
    ink = plate['N'][..., 0:1]
    color = color * (1 - ink) + np.array(INK['N']) * ink
    dst = os.path.join(OUT, f'{n}.webp')
    Image.fromarray(np.clip(color, 0, 255).astype(np.uint8)).save(dst, 'WEBP', quality=85, method=6)
    print(n, os.path.getsize(dst) // 1024, 'KB')
