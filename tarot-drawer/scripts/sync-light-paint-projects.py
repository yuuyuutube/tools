"""Package current Photoshop sidecars without re-exporting/overwriting artwork."""
from pathlib import Path
import json,base64,hashlib,re,zipfile,struct
root=Path(__file__).resolve().parents[1]/'docs/tarot-sunburst/light-paint'
manifest=json.loads((root/'manifest.json').read_text());changed=[]
sha=lambda d:hashlib.sha256(d).hexdigest()
for card in manifest['cards']:
 project=root/card['project'];p=json.loads(project.read_text());updated=False
 for layer,key in zip(p['layers'],['colour','ink']):
  data=(root/card[key]).read_bytes();image='data:image/png;base64,'+base64.b64encode(data).decode()
  assert struct.unpack('>II',data[16:24])==(1024,1536)
  if layer['image']!=image:layer['image']=image;updated=True
 if updated:
  project.write_text(json.dumps(p,ensure_ascii=False,separators=(',',':')))
  changed.append(card['number'])
 card['projectSHA256']=sha(project.read_bytes())
 card['currentLayersSHA256']={key:sha((root/card[key]).read_bytes()) for key in ['colour','ink']}
 version=card['projectSHA256'][:12]
 index=root/'index.html';html=index.read_text()
 for key in ['project','preview','colour','ink']:
  html=re.sub(re.escape(card[key])+r'\?v=[a-zA-Z0-9_-]+',card[key]+'?v='+version,html)
 index.write_text(html)
manifest['currentSidecarsSynced']='2026-11-23-symbol-details'
(root/'manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n')
# Validate the current embedded images, rather than asserting old ink has not
# changed: the moon ray edit and wheel lettering are explicitly authorized.
for card in manifest['cards']:
 p=json.loads((root/card['project']).read_text())
 for layer,key in zip(p['layers'],['colour','ink']):assert base64.b64decode(layer['image'].split(',',1)[1])==(root/card[key]).read_bytes()
report={'projectsValidated':22,'embeddedLayersMatchCurrentSidecars':True,'size':[1024,1536],'updatedProjects':changed,'revision':'2026-11-23-symbol-details','scope':'Current PNG and embedded layer consistency; historical source-plate equality is not asserted.'}
(root/'current-project-validation.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')
with zipfile.ZipFile(root/'tarot-light-paint-projects.zip','w',zipfile.ZIP_DEFLATED) as z:
 for f in [card['project'] for card in manifest['cards']]+['README.md','manifest.json','current-project-validation.json']:
  z.write(root/f,f)
print(json.dumps(report,ensure_ascii=False))
