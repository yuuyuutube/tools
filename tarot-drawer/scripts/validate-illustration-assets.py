"""Validate the illustration-only front assets and record their source PNGs."""
from pathlib import Path
import hashlib,json,re,struct,zlib
ROOT=Path(__file__).resolve().parent.parent
DOCS=ROOT/'docs/tarot-sunburst'
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
rows=[]
for num,card_id in re.findall(r"card\((\d+), '[^']*', '([^']+)'",(ROOT/'src/data/cards.js').read_text()):
 n=int(num);path=DOCS/'fool-pipeline/fool-illustration.png' if n==0 else DOCS/f'batch-{(n-1)//3+1:02}/{n}-illustration.png';p=path.read_bytes()
 assert p[:8]==b'\x89PNG\r\n\x1a\n' and struct.unpack('>II',p[16:24])==(654,870),path
 i=8
 while i<len(p):
  length=struct.unpack('>I',p[i:i+4])[0];assert zlib.crc32(p[i+4:i+8+length])&0xffffffff==struct.unpack('>I',p[i+8+length:i+12+length])[0];tag=p[i+4:i+8];i+=length+12
  if tag==b'IEND':break
 assert i==len(p)
 face=ROOT/f'assets/faces/{card_id}.webp';data=face.read_bytes();assert data[:4]==b'RIFF' and data[8:12]==b'WEBP';offset=data.index(b'\x9d\x01\x2a');w,h=struct.unpack('<HH',data[offset+3:offset+7]);assert(w&16383,h&16383)==(654,870)
 rows.append({'number':n,'id':card_id,'illustrationPNG':str(path.relative_to(ROOT)),'illustrationSHA256':sha(path),'webpSHA256':sha(face),'size':[654,870]})
assert len(rows)==22
reg=json.loads((DOCS/'illustration-extraction-regression.json').read_text());assert len(reg)==22
assert next(c for c in reg if c['number']==0)['captureCallbackChangedChannels']==0
assert all(c.get('storedReferenceChangedChannels',c.get('changedChannels'))==0 for c in reg if c['number']!=0)
report={'date':'2026-11-19','mode':'illustration-only-webp-plus-web-svg','cards':rows,'regression':reg,'webGeneratedLayers':['paper','border','accent-border','window','number','rule','title','subtitle','ornaments'],'note':'Stored Fool PNG differs from its current live pipeline; the capture-on/capture-off comparison of the same live pipeline is identical. Cards 1–21 match the stored print references pixel for pixel.'}
(DOCS/'illustration-assets-validation.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')
print('Validated 22 illustration PNG/WebP pairs at 654×870; extraction callback leaves printing unchanged.')
