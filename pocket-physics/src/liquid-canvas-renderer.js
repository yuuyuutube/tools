export class LiquidCanvasRenderer {
  constructor(canvas,sim){this.canvas=canvas;this.sim=sim;this.ctx=canvas.getContext('2d');if(!this.ctx)throw Error('Canvas unavailable');this.width=0;this.cursor=null;
    this.colors=Array.from({length:256},(_,i)=>{const t=i/255;const a=t<.64?[0,88,164]:[19,153,207],b=t<.64?[19,153,207]:[217,248,255],u=t<.64?t/.64:(t-.64)/.36;return `rgb(${a.map((v,j)=>Math.round(v+(b[j]-v)*u)).join(',')})`;});
  }
  resize(width,height){this.width=width;this.height=height;this.dpr=Math.min(devicePixelRatio||1,2);this.canvas.width=Math.round(width*this.dpr);this.canvas.height=Math.round(height*this.dpr);this.scale=Math.min((width-48)/480,(height-85)/390,1.35);this.center={x:width/2,y:height*(innerWidth<=800?.48:.46)};}
  project(x,y,h=0){return {x:x*220,y:y*126-h*110};}
  pointFromClient(clientX,clientY){const rect=this.canvas.getBoundingClientRect();return {x:(clientX-rect.left-this.center.x)/(this.scale*220),y:(clientY-rect.top-this.center.y)/(this.scale*126)};}
  render(){
    const c=this.ctx,{width,height,dpr,scale,center,sim}=this;if(!width)return;
    c.setTransform(dpr,0,0,dpr,0,0);c.clearRect(0,0,width,height);c.save();c.translate(center.x,center.y);c.scale(scale,scale);
    c.save();c.translate(0,47);c.scale(1,.32);const shadow=c.createRadialGradient(0,0,30,0,0,260);shadow.addColorStop(0,'#00477830');shadow.addColorStop(1,'#00477800');c.fillStyle=shadow;c.beginPath();c.arc(0,0,260,0,Math.PI*2);c.fill();c.restore();
    c.beginPath();c.ellipse(0,18,224,129,0,0,Math.PI*2);const body=c.createLinearGradient(0,-100,0,150);body.addColorStop(0,'#65cae7');body.addColorStop(.65,'#0078bf');body.addColorStop(1,'#00477d');c.fillStyle=body;c.fill();
    c.beginPath();c.ellipse(0,0,224,129,0,0,Math.PI*2);c.fillStyle='#0078bf';c.fill();
    const n=sim.size,h=sim.height,mask=sim.mask;
    const vertices=Array.from({length:n*n},(_,i)=>this.project(sim.coord(i%n),sim.coord(Math.floor(i/n)),h[i]));
    for(let y=0;y<n-1;y++)for(let x=0;x<n-1;x++){
      const i=y*n+x,indices=[i,i+1,i+n+1,i+n];if(!indices.some(j=>mask[j]))continue;
      const pts=indices.map(j=>vertices[j]);const hx=h[i+1]-h[i],hy=h[i+n]-h[i];
      const nx=sim.coord(x),ny=sim.coord(y);
      const reflection=.46*Math.exp(-((nx+.34)**2/.5+(ny+.42)**2/.23));
      const light=Math.max(0,Math.min(1,.27+reflection+hx*7-hy*11+h[i]*.7));
      c.beginPath();c.moveTo(pts[0].x,pts[0].y);for(let k=1;k<4;k++)c.lineTo(pts[k].x,pts[k].y);c.closePath();
      c.fillStyle=this.colors[Math.round(light*255)];c.fill();c.strokeStyle=c.fillStyle;c.lineWidth=.6;c.stroke();
    }
    // Fine surface reflections follow the actual height field, rather than animated decorative rings.
    for(let y=3;y<n-3;y+=3){
      c.beginPath();let started=false;
      for(let x=1;x<n-1;x++){const i=y*n+x;if(!mask[i]){started=false;continue;}const p=vertices[i];if(started)c.lineTo(p.x,p.y);else c.moveTo(p.x,p.y);started=true;}
      c.strokeStyle=y%2?'#e6fbff29':'#80def344';c.lineWidth=.7;c.stroke();
    }
    c.beginPath();c.ellipse(0,0,224,129,0,0,Math.PI*2);c.strokeStyle='#b7edff8c';c.lineWidth=1;c.stroke();
    c.beginPath();c.ellipse(0,18,224,129,0,.1,Math.PI-.1);c.strokeStyle='#ff801e';c.lineWidth=1.6;c.stroke();
    // One orange contact marker makes direct manipulation legible without labels.
    if(this.cursor){const p=this.project(this.cursor.x,this.cursor.y);c.beginPath();c.ellipse(p.x,p.y,7,4,0,0,Math.PI*2);c.strokeStyle='#ff801e';c.lineWidth=2;c.stroke();}
    c.restore();
  }
}
