// Finish the supplied raster drawing without asking a generator to reinterpret
// it. Coordinates of all authored guides use the original 819 × 1229 image.
// Guide paths select existing strokes or contain hatch marks; they are never
// painted as replacement silhouettes, faces, limbs, clothes, or symbols.
const make=(w,h)=>Object.assign(document.createElement('canvas'),{width:w,height:h});
export function finishLine(image,{outlines=[],hatching=[],bands=[],protectedAreas=[],thinLines=[],corrections=[],outlineRadius=2}={}){
 const w=1024,h=1536,cv=make(w,h),g=cv.getContext('2d',{willReadFrequently:true});
 g.fillStyle='white';g.fillRect(0,0,w,h);g.drawImage(image,0,0,w,h);
 // Explicitly authorized symbolic corrections are separate from finishing.
 // They use original drawing coordinates and never replace a face or body.
 g.save();g.scale(w/819,h/1229);
 for(const mark of corrections){
  if(mark.type==='text'){g.fillStyle='black';g.font=`bold ${mark.size}px Georgia`;g.textAlign='center';g.fillText(mark.text,mark.x,mark.y);}
  if(mark.type==='star-arc'){
   g.fillStyle='white';for(const [x,y]of mark.old){g.beginPath();g.arc(x,y,mark.eraseRadius,0,Math.PI*2);g.fill();}
   for(let i=0;i<mark.count;i++){const angle=(mark.start+(mark.end-mark.start)*i/(mark.count-1))*Math.PI/180,x=mark.cx+mark.rx*Math.cos(angle),y=mark.cy+mark.ry*Math.sin(angle);
    g.beginPath();for(let j=0;j<10;j++){const a=-Math.PI/2+j*Math.PI/5,r=j%2?mark.r*.43:mark.r,px=x+Math.cos(a)*r,py=y+Math.sin(a)*r;j?g.lineTo(px,py):g.moveTo(px,py);}g.closePath();g.fillStyle='white';g.fill();g.strokeStyle='black';g.lineWidth=mark.weight;g.lineJoin='round';g.stroke();
   }
  }
 }g.restore();
 const original=g.getImageData(0,0,w,h),ink=new Float32Array(w*h);
 for(let i=0;i<ink.length;i++)ink[i]=1-original.data[i*4]/255;
 if(thinLines.length){
  const tc=make(w,h),tg=tc.getContext('2d',{willReadFrequently:true});tg.scale(w/819,h/1229);tg.strokeStyle='white';tg.lineWidth=5;tg.lineCap='round';
  for(const p of thinLines)tg.stroke(new Path2D(p));
  const selected=tg.getImageData(0,0,w,h).data,before=ink.slice();
  for(let y=1;y<h-1;y++)for(let x=1;x<w-1;x++){
   const i=y*w+x,strength=selected[i*4]/255;if(!strength)continue;let fine=before[i];
   for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++)fine=Math.min(fine,before[(y+dy)*w+x+dx]);
   ink[i]=before[i]*(1-strength)+fine*strength;
  }
 }
 const guide=make(w,h),gg=guide.getContext('2d',{willReadFrequently:true});
 gg.scale(w/819,h/1229);gg.strokeStyle='white';gg.lineWidth=15;gg.lineCap='round';gg.lineJoin='round';
 for(const p of outlines)gg.stroke(new Path2D(p));
 gg.globalCompositeOperation='destination-out';
 for(const p of protectedAreas)gg.fill(new Path2D(p));
 const weights=gg.getImageData(0,0,w,h).data,out=g.createImageData(w,h);
 for(let y=0;y<h;y++)for(let x=0;x<w;x++){
  const i=y*w+x,weight=weights[i*4]/255;let coverage=ink[i];
  // At most two source pixels of added weight, only beside original strokes
  // selected by the contour guide. Inner face and fingers stay untouched.
  if(weight>0){let thick=coverage;for(let dy=-2;dy<=2;dy++)for(let dx=-2;dx<=2;dx++){
   if(dx*dx+dy*dy>outlineRadius*outlineRadius||x+dx<0||x+dx>=w||y+dy<0||y+dy>=h)continue;
   thick=Math.max(thick,ink[(y+dy)*w+x+dx]);
  }coverage=coverage*(1-weight)+thick*weight;}
  const value=Math.round(255*(1-coverage));out.data[i*4]=out.data[i*4+1]=out.data[i*4+2]=value;out.data[i*4+3]=255;
 }
 g.putImageData(out,0,0);
 const hatchLayer=make(w,h),hg=hatchLayer.getContext('2d',{willReadFrequently:true}),openMask=make(w,h),og=openMask.getContext('2d',{willReadFrequently:true});hg.save();hg.scale(w/819,h/1229);og.scale(w/819,h/1229);og.fillStyle='white';
 for(const [zoneIndex,zone]of hatching.entries()){
  if(zone.allowOpen)og.fill(new Path2D(zone.path));
  hg.save();hg.clip(new Path2D(zone.path));hg.translate(...zone.origin);hg.rotate((zone.angle||0)*Math.PI/180);
  const spacing=(zone.spacing||7.5)*.72,length=zone.length||110;
  for(let row=-220;row<=220;row+=spacing){
   const phase=row*.079+zoneIndex,shift=Math.sin(phase)*1.2;
   hg.beginPath();hg.moveTo(-length/2,row+shift);
   hg.quadraticCurveTo(0,row+(zone.bend||0)+Math.sin(phase+1)*.7,length/2,row+Math.cos(phase)*.8);
   hg.strokeStyle='#000';hg.lineWidth=(zone.weight||1.6)*(1+.15*Math.sin(phase*1.7));hg.lineCap='round';hg.stroke();
  }hg.restore();
 }
 // Curved bands follow an authored dark seam and taper toward a light edge.
 // Each cut has a pointed tip; no parallel grid is stamped across folds.
 const bez=(p,t)=>{const u=1-t;return [0,1].map(k=>u*u*u*p[0][k]+3*u*u*t*p[1][k]+3*u*t*t*p[2][k]+t*t*t*p[3][k]);};
 for(const [bi,band]of bands.entries()){
  const light=band.b.map((p,i)=>p.map((v,k)=>band.a[i][k]+(v-band.a[i][k])*(band.spread||1)));
  if(band.allowOpen){og.beginPath();og.moveTo(...band.a[0]);og.bezierCurveTo(...band.a[1],...band.a[2],...band.a[3]);og.bezierCurveTo(...light[2],...light[1],...light[0]);og.closePath();og.fill();}
  if(band.mode==='flow'){
   const strands=band.strands||6;hg.fillStyle='#000';
   for(let j=1;j<=strands;j++){
    const u=(j-.28+.09*Math.sin(j*1.7+bi))/(strands+.7),curve=band.a.map((p,i)=>p.map((v,k)=>v+(light[i][k]-v)*u));
    const left=[],right=[];
    const start=.015+.13*u+.012*Math.sin(j*1.6+bi),end=.985-.2*u+.014*Math.sin(j*1.3+bi);
    for(let step=0;step<=36;step++){
     const progress=step/36,t=start+(end-start)*progress,p=bez(curve,t),q=bez(curve,Math.min(1,t+.002)),r=bez(curve,Math.max(0,t-.002)),dx=q[0]-r[0],dy=q[1]-r[1],len=Math.hypot(dx,dy)||1;
     const half=(band.weight||1.4)*Math.pow(Math.sin(Math.PI*progress),.55)*(.47+.04*Math.sin(j*1.9+bi));
     left.push([p[0]-dy/len*half,p[1]+dx/len*half]);right.push([p[0]+dy/len*half,p[1]-dx/len*half]);
    }
    hg.beginPath();for(const [i,p]of [...left,...right.reverse()].entries())i?hg.lineTo(...p):hg.moveTo(...p);hg.closePath();hg.fill();
   }continue;
  }
  const count=band.count||28;hg.fillStyle='#000';
  for(let j=1;j<count;j++){
   const t=(j+.13*Math.sin(j*1.7+bi))/count,a=bez(band.a,t),b=bez(light,t),dx=b[0]-a[0],dy=b[1]-a[1],length=Math.hypot(dx,dy);if(length<.7)continue;
   const nx=-dy/length,ny=dx/length,width=(band.weight||1.4)*(1+.08*Math.sin(j*1.7+bi)),bend=(band.bend??.12)*length;
   const mx=(a[0]+b[0])/2+nx*bend,my=(a[1]+b[1])/2+ny*bend;
   hg.beginPath();hg.moveTo(a[0]+nx*width/2,a[1]+ny*width/2);
   hg.quadraticCurveTo(mx+nx*width*.4,my+ny*width*.4,b[0],b[1]);
   hg.quadraticCurveTo(mx-nx*width*.4,my-ny*width*.4,a[0]-nx*width/2,a[1]-ny*width/2);hg.closePath();hg.fill();
  }
 }hg.restore();
 // Do not add a single hatch to the exterior white component. This clips
 // shadows to actual closed regions of the supplied linework, not guessed
 // replacement contours. In particular, no marks hang outside throne edges.
 const outside=new Uint8Array(w*h),queue=new Int32Array(w*h);let head=0,tail=0;
 const visit=i=>{if(!outside[i]&&ink[i]<.45){outside[i]=1;queue[tail++]=i;}};
 for(let x=0;x<w;x++){visit(x);visit((h-1)*w+x);}for(let y=0;y<h;y++){visit(y*w);visit(y*w+w-1);}
 while(head<tail){const i=queue[head++],x=i%w,y=(i/w)|0;if(x)visit(i-1);if(x<w-1)visit(i+1);if(y)visit(i-w);if(y<h-1)visit(i+w);}
 const hatchPixels=hg.getImageData(0,0,w,h),openPixels=og.getImageData(0,0,w,h).data;
 for(let i=0;i<outside.length;i++)if(outside[i])hatchPixels.data[i*4+3]*=openPixels[i*4+3]/255;
 hg.putImageData(hatchPixels,0,0);g.drawImage(hatchLayer,0,0);
 // Subpixel waviness retains the centre and topology of supplied lines. Print
 // registration/bleed is a separate later stage and keeps its approved values.
 const dry=g.getImageData(0,0,w,h),warped=g.createImageData(w,h);
 for(let y=0;y<h;y++)for(let x=0;x<w;x++){
  const sx=x+.48*Math.sin(y*.091+x*.019)+.2*Math.sin(y*.39),sy=y+.38*Math.sin(x*.087+y*.013);
  const ax=Math.max(0,Math.min(w-1,Math.floor(sx))),ay=Math.max(0,Math.min(h-1,Math.floor(sy))),bx=Math.min(w-1,ax+1),by=Math.min(h-1,ay+1),fx=Math.max(0,sx-ax),fy=Math.max(0,sy-ay);
  const v=(dry.data[(ay*w+ax)*4]*(1-fx)+dry.data[(ay*w+bx)*4]*fx)*(1-fy)+(dry.data[(by*w+ax)*4]*(1-fx)+dry.data[(by*w+bx)*4]*fx)*fy;
  const i=(y*w+x)*4;warped.data[i]=warped.data[i+1]=warped.data[i+2]=v;warped.data[i+3]=255;
 }g.putImageData(warped,0,0);return cv;
}
