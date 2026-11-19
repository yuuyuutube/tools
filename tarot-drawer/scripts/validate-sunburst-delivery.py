"""Audit all exported Sunburst stages, website derivatives and Light Paint sources."""
from pathlib import Path
import hashlib
import json
import re
import struct
import subprocess
import zlib

ROOT=Path(__file__).resolve().parent.parent
DOCS=ROOT/'docs/tarot-sunburst'

def sha(data):return hashlib.sha256(data).hexdigest()
def png(path,size):
 data=path.read_bytes()
 assert data[:8]==b'\x89PNG\r\n\x1a\n' and struct.unpack('>II',data[16:24])==size,path
 pos=8
 while pos<len(data):
  length=struct.unpack('>I',data[pos:pos+4])[0];tag=data[pos+4:pos+8]
  assert zlib.crc32(data[pos+4:pos+8+length])&0xffffffff==struct.unpack('>I',data[pos+8+length:pos+12+length])[0],path
  pos+=12+length
  if tag==b'IEND':break
 assert pos==len(data),path
 return {'size':list(size),'sha256':sha(data)}
def webp(path,size):
 data=path.read_bytes();assert data[:4]==b'RIFF' and data[8:12]==b'WEBP',path
 assert struct.unpack('<I',data[4:8])[0]+8==len(data),path
 offset=data.index(b'\x9d\x01\x2a');w,h=struct.unpack('<HH',data[offset+3:offset+7]);assert (w&16383,h&16383)==size,path
 return {'size':list(size),'sha256':sha(data)}
def same_as_commit(path,commit='d79c669'):
 return subprocess.check_output(['git','show',f'{commit}:tarot-drawer/{path}'],cwd=ROOT)==(ROOT/path).read_bytes()

cards=re.findall(r"card\((\d+), '[^']*', '([^']+)', '([^']+)'",(ROOT/'src/data/cards.js').read_text())
assert len(cards)==22
ink_checks=json.loads((DOCS/'current-ink-channel-validation.json').read_text())
assert len(ink_checks)==21 and all(r['pixelsDifferingMoreThanOne']==0 for r in ink_checks)
light=json.loads((DOCS/'light-paint/manifest.json').read_text())
rows=[]
for number,card_id,name in cards:
 n=int(number);outputs={}
 line=f'docs/tarot-sunburst/line/{n}.png' if n else 'docs/tarot-sunburst/line/0-smooth-aligned-rays.png'
 assert same_as_commit(Path(line)),line
 if n:
  b=f'{(n-1)//3+1:02}';folder=DOCS/f'batch-{b}'
  for stage in ['smooth','ink','proof','flat','final']:
   filename=f'{n}-{stage}-3x5.png';outputs[filename]=png(folder/filename,(900,1500))
  master=f'{n}-ink'+('-current' if n==6 else '')+'.png';outputs[master]=png(folder/master,(1024,1536))
  assert outputs[master]['sha256']==ink_checks[n-1]['masterSHA256']
  for key in ['Y','O','B','N']:
   filename=f'{n}-{key}-source.png';outputs[filename]=png(folder/filename,(1024,1536))
  assert outputs[f'{n}-N-source.png']['sha256']==ink_checks[n-1]['plateSHA256']
  for filename in [f'{n}-ink-detail.png',f'{n}-proof-detail.png']:
   data=(folder/filename).read_bytes();size=struct.unpack('>II',data[16:24]);assert size[0]==720;outputs[filename]=png(folder/filename,size)
  outputs[f'{n}-masks-source.png']=png(folder/f'{n}-masks-source.png',(900,1500))
  assert (ROOT/f'assets/sunburst-{n}-final-3x5.png').read_bytes()==(folder/f'{n}-final-3x5.png').read_bytes()
  for key in ['Y','O','B','N']:
   path=f'docs/tarot-sunburst/batch-{b}/{n}-{key}-source.png';assert light['cards'][n]['sourceFilesSHA256'][path]==sha((ROOT/path).read_bytes())
  if n<=6:assert same_as_commit(Path(f'docs/tarot-sunburst/batch-{b}/{n}-ink.png'))
 else:
  for key in ['Y','O','B','N']:
   path=f'docs/tarot-sunburst/fool-pipeline/fool-{key}-source.png';assert light['cards'][n]['sourceFilesSHA256'][path]==sha((ROOT/path).read_bytes())
 outputs['face.webp']=webp(ROOT/f'assets/faces/{card_id}.webp',(654,870))
 outputs['art-preview.webp']=webp(DOCS/f'art-preview/{n}.webp',(1024,1536))
 rows.append({'number':n,'id':card_id,'name':name,'originalLineUnchanged':True,'websiteFinalMatchesBatch':True if n else None,'outputs':outputs})
for b in range(1,8):
 for filename,size in [('overview.png',(960,550)),('ink-comparison.png',(1280,550))]:png(DOCS/f'batch-{b:02}'/filename,size)
for kind in ['ink','proof','final']:png(DOCS/f'all-{kind}-overview.png',(1470,1190))
layout_path=Path('src/print/sunburst/layout.js')
old_layout=subprocess.check_output(['git','show',f'd79c669:tarot-drawer/{layout_path}'],cwd=ROOT,text=True)
new_layout=(ROOT/layout_path).read_text()
for symbol in ['WINDOW','ART_SHIFT','ART_OFFSET']:
 pattern=rf'export const {symbol}=(.*?);'
 assert re.search(pattern,old_layout).group(1)==re.search(pattern,new_layout).group(1),symbol
assert same_as_commit(Path('src/print/sunburst/colour-repairs.js'))
report={'date':'2026-11-19','sourceInkCommit':'ff36530','faceAssetMode':'illustration-only; web SVG renders the complete interface','originalLinesUnchanged':True,'layoutUnchanged':True,'layoutSourceRefactoredForWebLayers':True,'colourRepairRulesUnchanged':True,'frozenMastersPreserved':list(range(1,7)),'currentMasterOverride':{'6':'batch-02/6-ink-current.png'},'lightPaintSourcesMatchCurrentPlates':True,'cards':rows}
(DOCS/'ink-sync-validation.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')
# Refresh the former delivery record instead of retaining stale output hashes.
(DOCS/'ink-delivery-validation.json').write_text(json.dumps({'date':'2026-11-19','currentValidation':'ink-sync-validation.json','cards':rows[1:]},ensure_ascii=False,indent=2)+'\n')
print(json.dumps({k:v for k,v in report.items() if k!='cards'},ensure_ascii=False,indent=2))
print('Validated 22 cards, all review stages, derivative dimensions and source relationships.')
