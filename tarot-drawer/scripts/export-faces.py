# Rebuild illustration-only assets/faces WebP after the browser art export.
# The web SVG generates every piece of card interface, including the paper.
import os, re
from PIL import Image
ROOT=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DOCS=os.path.join(ROOT,'docs','tarot-sunburst')
with open(os.path.join(ROOT,'src','data','cards.js'),encoding='utf8') as f:
    ids=[m.group(2) for m in re.finditer(r"card\(\s*(\d+)\s*,\s*'[^']*'\s*,\s*'([^']+)'",f.read())]
assert len(ids)==22
for n,card_id in enumerate(ids):
    src=os.path.join(DOCS,'fool-pipeline','fool-illustration.png') if n==0 else os.path.join(DOCS,f'batch-{(n-1)//3+1:02d}',f'{n}-illustration.png')
    if not os.path.isfile(src):raise RuntimeError(f'Missing illustration-only PNG: {src}; export illustration-assets.html first.')
    im=Image.open(src).convert('RGB')
    assert im.size==(654,870),(src,im.size)
    dst=os.path.join(ROOT,'assets','faces',f'{card_id}.webp');im.save(dst,'WEBP',quality=88,method=6)
    print(n,card_id,im.size)
