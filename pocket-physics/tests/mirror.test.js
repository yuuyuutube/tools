import test from 'node:test';
import assert from 'node:assert/strict';
import { TESSERACT, MirrorGeometry, MIRROR_STEP, rotatePlane, project4, wrapAngle } from '../src/mirror-geometry.js';
const distance=(a,b)=>Math.hypot(...a.map((x,i)=>x-b[i]));
const near=(a,b,tolerance=1e-9)=>assert.ok(Math.abs(a-b)<tolerance,`${a} ≈ ${b}`);

test('the tesseract has its exact 16 vertices, 32 edges and 24 square faces',()=>{
  const {vertices,edges,faces}=TESSERACT;
  assert.equal(vertices.length,16);assert.equal(edges.length,32);assert.equal(faces.length,24);
  const degree=new Array(16).fill(0),edgeFaces=new Map();
  for(const edge of edges){near(distance(vertices[edge.a],vertices[edge.b]),2);degree[edge.a]++;degree[edge.b]++;}
  assert.ok(degree.every(x=>x===4));
  for(const face of faces){
    const [a,b,c,d]=face.indices;
    for(const [i,j] of [[a,b],[b,c],[c,d],[d,a]]){
      near(distance(vertices[i],vertices[j]),2);
      const key=[i,j].sort((x,y)=>x-y).join(',');edgeFaces.set(key,(edgeFaces.get(key)||0)+1);
    }
    near(distance(vertices[a],vertices[c]),Math.sqrt(8));near(distance(vertices[b],vertices[d]),Math.sqrt(8));
  }
  assert.equal(edgeFaces.size,32);assert.ok([...edgeFaces.values()].every(n=>n===3));
});

test('all six 4D rotation planes preserve lengths, distances and inverse rotations',()=>{
  const p=[1,-2,3,.7],q=[-3,2,.5,1.7];
  for(let a=0;a<4;a++)for(let b=a+1;b<4;b++){
    const rotated=rotatePlane(p,a,b,1.234),other=rotatePlane(q,a,b,1.234);
    near(Math.hypot(...p),Math.hypot(...rotated));near(distance(p,q),distance(rotated,other));
    rotatePlane(rotated,a,b,-1.234).forEach((x,i)=>near(x,p[i]));
  }
});

test('the fourth coordinate genuinely changes perspective projection',()=>{
  const far=project4([1,1,1,-1],4),nearer=project4([1,1,1,1],4);
  near(far[0],.8);near(nearer[0],4/3);
  const model=new MirrorGeometry(),before=model.transformed4();model.rotate(.8,.4);const after=model.transformed4();
  assert.notDeepEqual(before,after);
  for(const edge of TESSERACT.edges)near(distance(after[edge.a],after[edge.b]),2);
});

test('3D mode rotates only the projected view while retaining all 4D coordinates',()=>{
  const model=new MirrorGeometry();model.mode='3d';
  const before=model.geometry();model.rotate(.7,-.4);model.twist(.3);const after=model.geometry();
  assert.deepEqual(before.four,after.four);assert.notDeepEqual(before.screen,after.screen);
  for(const edge of TESSERACT.edges)near(distance(before.three[edge.a],before.three[edge.b]),distance(after.three[edge.a],after.three[edge.b]));
});

test('both extremes of perspective remain finite for varied 4D and 3D orientations',()=>{
  const model=new MirrorGeometry();
  for(let i=0;i<1000;i++){
    model.depth=i%2?2.7:6;model.angles={xw:i*.381,yw:i*.773,zw:i*.127};model.view={yaw:i*.391,pitch:i*.281,roll:i*.143};
    const geometry=model.geometry();
    for(const p of geometry.four)near(Math.hypot(...p),2);
    for(const p of geometry.three)assert.ok(Math.hypot(...p)<3.1);
    for(const p of geometry.screen)assert.ok(Number.isFinite(p.x)&&Number.isFinite(p.y)&&Number.isFinite(p.z));
  }
});

test('a flip is exactly a quarter-turn in XW, with the same result when motion is reduced',()=>{
  const animated=new MirrorGeometry(),instant=new MirrorGeometry();animated.flip();instant.flip(false);
  for(let i=0;i<150;i++)animated.step(MIRROR_STEP,false);
  assert.equal(animated.transition,null);near(wrapAngle(animated.angles.xw-instant.angles.xw),0);
  near(animated.angles.yw,instant.angles.yw);near(animated.angles.zw,instant.angles.zw);
});

test('automatic movement respects selected rotation space and stays stable for ten minutes',()=>{
  const model=new MirrorGeometry();
  for(let i=0;i<72000;i++){
    model.mode=i%2000<1000?'3d':'4d';model.step();
    if(i%1200===0){
      for(const angle of [...Object.values(model.angles),...Object.values(model.view)])assert.ok(Math.abs(angle)<=Math.PI);
      for(const p of model.geometry().screen)assert.ok(Number.isFinite(p.x)&&Number.isFinite(p.y));
    }
  }
  const before={...model.angles};model.mode='3d';model.step();assert.deepEqual(model.angles,before);
});

test('reset restores the full pose, projection depth and interaction mode deterministically',()=>{
  const model=new MirrorGeometry(),original=model.geometry();model.rotate(2,1);model.twist(1);model.depth=2.7;model.mode='3d';model.flip();model.step();model.reset();
  assert.deepEqual(model.geometry(),original);assert.equal(model.depth,3.6);assert.equal(model.mode,'4d');assert.equal(model.time,0);assert.equal(model.transition,null);
});
