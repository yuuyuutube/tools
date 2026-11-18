# Export the card backs used by the draw screen as light WebP copies.
# usage: python scripts/export-backs.py
# Source: assets/card-back*.png (720 × 1200, from src/print/back-*.js); output: assets/backs/*.webp
# The list must match BACKS in src/art/frame.js.
import os
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ASSETS = os.path.join(ROOT, 'assets')
BACKS = ['card-back', 'card-back-moth', 'card-back-tide', 'card-back-pomegranate',
         'card-back-serpent', 'card-back-flower', 'card-back-geometry']

os.makedirs(os.path.join(ASSETS, 'backs'), exist_ok=True)
for name in BACKS:
    dst = os.path.join(ASSETS, 'backs', f'{name}.webp')
    Image.open(os.path.join(ASSETS, f'{name}.png')).convert('RGB').save(dst, 'WEBP', quality=80, method=6)
    print(f'{name:24s} {os.path.getsize(dst) // 1024} KB')
