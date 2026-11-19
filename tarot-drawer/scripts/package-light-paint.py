"""Validate the exported Light Paint files, then bundle self-contained projects."""
from pathlib import Path
import base64
import hashlib
import json
import struct
import zipfile
import zlib

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / 'docs/tarot-sunburst/light-paint'
manifest = json.loads((OUT / 'manifest.json').read_text())
assert [c['number'] for c in manifest['cards']] == list(range(22))

def sha(data):
    return hashlib.sha256(data).hexdigest()

def validate_png(data, size):
    assert data[:8] == b'\x89PNG\r\n\x1a\n'
    assert struct.unpack('>II', data[16:24]) == size
    pos = 8
    while pos < len(data):
        length = struct.unpack('>I', data[pos:pos + 4])[0]
        tag = data[pos + 4:pos + 8]
        chunk = data[pos + 4:pos + 8 + length]
        crc = struct.unpack('>I', data[pos + 8 + length:pos + 12 + length])[0]
        assert zlib.crc32(chunk) & 0xffffffff == crc
        pos += 12 + length
        if tag == b'IEND':
            break
    assert pos == len(data)

for card in manifest['cards']:
    data = (OUT / card['project']).read_bytes()
    assert sha(data) == card['projectSHA256']
    assert len(data) < 100 * 1024 * 1024
    p = json.loads(data)
    assert (p['format'], p['version']) == ('light-paint', 1)
    assert (p['width'], p['height'], p['activeId']) == (1024, 1536, 1)
    assert len(p['layers']) == 2 and len(p['swatches']) <= 28
    assert p['layers'][0]['id'] == 1 and p['layers'][1]['id'] == 2
    for layer, name in zip(p['layers'], ['colour', 'ink']):
        decoded = base64.b64decode(layer['image'].split(',', 1)[1], validate=True)
        assert decoded == (OUT / card[name]).read_bytes()
        assert layer['opacity'] == 1 and layer['visible'] is True
        validate_png(decoded, (1024, 1536))
    validate_png((OUT / card['preview']).read_bytes(), (256, 384))
    for path, expected in card['sourceFilesSHA256'].items():
        assert sha((ROOT / path).read_bytes()) == expected

pixels = json.loads((OUT / 'pixel-validation.json').read_text())
assert len(pixels) == 22
assert all(p['inkAlphaDifferences'] == p['nonOpaqueColourPixels'] == 0 for p in pixels)
for card, sample in zip(manifest['cards'], pixels):
    assert card['number'] == sample['number']
    assert sha((OUT / card['ink']).read_bytes()) == sample['inkFileSHA256']
report = {'projectsValidated': 22, 'pngFilesValidated': 66,
          'embeddedLayersMatchSidecars': True, 'sourcePlatesUnchanged': True,
          'inkAlphaMatchesOriginalPlate': True, 'colourLayerFullyOpaque': True,
          'browserLoadChecked': '06-lovers: two layers, correct active colour layer and swatches; ink can be hidden independently'}
(OUT / 'validation.json').write_text(json.dumps(report, ensure_ascii=False, indent=2) + '\n')
with zipfile.ZipFile(OUT / 'tarot-light-paint-projects.zip', 'w', zipfile.ZIP_DEFLATED) as archive:
    for name in [c['project'] for c in manifest['cards']] + ['README.md', 'manifest.json', 'validation.json', 'pixel-validation.json']:
        archive.write(OUT / name, name)
print(json.dumps(report, ensure_ascii=False, indent=2))
