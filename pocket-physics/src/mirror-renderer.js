import { rotatePlane, project4, project3, TESSERACT } from './mirror-geometry.js';

const circle = (c, radius) => { c.beginPath(); c.arc(0,0,radius,0,Math.PI*2); };

export class MirrorRenderer {
  constructor(canvas, model) {
    this.canvas = canvas; this.model = model; this.ctx = canvas.getContext('2d');
    if (!this.ctx) throw new Error('Canvas 2D is unavailable');
    this.width = 0; this.height = 0; this.scale = 1; this.center = {x:0,y:0};
  }
  resize(width,height) {
    if (width <= 0 || height <= 0) return;
    this.width = width; this.height = height; this.dpr = Math.min(window.devicePixelRatio || 1,2);
    this.canvas.width = Math.round(width*this.dpr); this.canvas.height = Math.round(height*this.dpr);
    this.scale = Math.min((width-34)/490,(height-(window.innerWidth<=800?56:150))/500,1.30);
    this.center = {x:width/2,y:height*(window.innerWidth<=800?.45:.43)};
  }
  render() {
    const c = this.ctx, {width,height,dpr,scale,center} = this;
    c.setTransform(dpr,0,0,dpr,0,0); c.clearRect(0,0,width,height);
    c.save(); c.translate(center.x,center.y); c.scale(scale,scale);
    // Satin optical glass: a quiet circular aperture, never a glowing dashboard.
    c.save(); c.translate(0,246); c.scale(1,.12);
    const shadow = c.createRadialGradient(0,0,0,0,0,225);
    shadow.addColorStop(0,'#0c153b88'); shadow.addColorStop(1,'#0c153b00');
    c.fillStyle=shadow; circle(c,225); c.fill(); c.restore();

    const rim = c.createLinearGradient(-170,-220,170,220);
    rim.addColorStop(0,'#ffe800'); rim.addColorStop(.26,'#fffbc7'); rim.addColorStop(.48,'#6f7dba'); rim.addColorStop(.74,'#ffe800'); rim.addColorStop(1,'#a6b5e9');
    circle(c,216); c.fillStyle=rim; c.fill();
    circle(c,213.5);
    const lens=c.createRadialGradient(-65,-90,0,10,20,270);
    lens.addColorStop(0,'#3c4c7b'); lens.addColorStop(.52,'#283862'); lens.addColorStop(1,'#172548');
    c.fillStyle=lens;c.fill();
    circle(c,208.5);c.strokeStyle='#e8edff26';c.lineWidth=.65;c.stroke();
    c.save();circle(c,207);c.clip();
    const geometry=this.model.geometry();
    const extent=Math.max(...geometry.screen.map(point=>Math.hypot(point.x,point.y)));
    const zoom=Math.min(93,185/Math.max(extent,.001));
    const points=geometry.screen.map(point=>({...point,x:point.x*zoom,y:point.y*zoom}));

    c.save(); c.globalAlpha=.12;
    // Every surface is one of the tesseract's actual 24 square faces after projection.
    const faces=TESSERACT.faces.map(face=>({...face,z:face.indices.reduce((sum,i)=>sum+points[i].z,0)/4})).sort((a,b)=>a.z-b.z);
    for(const face of faces) {
      const vertices=face.indices.map(i=>points[i]);
      c.beginPath();c.moveTo(vertices[0].x,vertices[0].y);for(let i=1;i<4;i++)c.lineTo(vertices[i].x,vertices[i].y);c.closePath();
      const w=face.indices.reduce((sum,i)=>sum+geometry.four[i][3],0)/4;
      const gradient=c.createLinearGradient(vertices[0].x,vertices[0].y,vertices[2].x,vertices[2].y);
      if(face.axes.includes(3)) {
        gradient.addColorStop(0,'#8aa9ff05');gradient.addColorStop(.5,'#c3d4ff16');gradient.addColorStop(1,'#eef3ff2c');
      } else {
        const near=(Math.tanh(w*1.3)+1)/2;
        gradient.addColorStop(0,`rgba(255,232,0,${.035+.22*near})`);
        gradient.addColorStop(.55,'#d7e3ff0a');
        gradient.addColorStop(1,`rgba(170,191,255,${.16-.11*near})`);
      }
      c.fillStyle=gradient;c.fill();
    }
    const edges=TESSERACT.edges.map(edge=>({...edge,z:(points[edge.a].z+points[edge.b].z)/2})).sort((a,b)=>a.z-b.z);
    for(const edge of edges) {
      const a=points[edge.a],b=points[edge.b];
      const front=Math.max(0,Math.min(1,(edge.z+2)/4));
      c.beginPath();c.moveTo(a.x,a.y);c.lineTo(b.x,b.y);
      c.lineCap='round';c.lineWidth=2.5+front*1.6;
      c.strokeStyle=edge.axis===3?'#aabfffb0':`rgba(255,232,0,${.45+front*.55})`;c.stroke();
      c.lineWidth=.65;c.strokeStyle=edge.axis===3?'#f2f6ffb3':'#fffcdacc';c.stroke();
    }
    for(let i=0;i<points.length;i++) {
      const p=points[i];c.beginPath();c.arc(p.x,p.y,1.8,0,Math.PI*2);c.fillStyle='#fffbd4';c.fill();
    }
    c.restore();
    this.character(c,true);
    c.restore();

    // Broad edge reflections remain attached to the mirror, while the object turns within it.
    c.beginPath();c.arc(0,0,212,-Math.PI*.88,-Math.PI*.43);c.strokeStyle='#fffff178';c.lineWidth=1.6;c.stroke();
    c.beginPath();c.arc(0,0,211,Math.PI*.08,Math.PI*.37);c.strokeStyle='#b9c9ff38';c.lineWidth=2.5;c.stroke();
    // The visitor stands in front of the optical surface.
    c.save();c.translate(-164,174);c.scale(.48,.48);this.character(c,false);c.restore();
    c.restore();
  }
  character(c, reflected) {
    const transform=(x,y)=>{
      if(!reflected)return {x,y};
      let p=[-x/100,y/100,0,.25];
      p=rotatePlane(p,0,3,this.model.angles.xw);
      p=rotatePlane(p,1,3,this.model.angles.yw);
      p=rotatePlane(p,2,3,this.model.angles.zw);
      let three=project4(p,this.model.depth);
      three=rotatePlane(three,0,2,this.model.view.yaw);
      three=rotatePlane(three,1,2,this.model.view.pitch);
      three=rotatePlane(three,0,1,this.model.view.roll);
      const q=project3(three);
      return {x:q.x*100,y:q.y*100};
    };
    const shape=(points,fill)=>{
      c.beginPath();points.forEach(([x,y],i)=>{const p=transform(x,y);if(i)c.lineTo(p.x,p.y);else c.moveTo(p.x,p.y);});c.closePath();
      c.fillStyle=fill;c.fill();c.strokeStyle='#fff9a9';c.lineWidth=1.2;c.stroke();
    };
    const head=[];for(let i=0;i<64;i++){const a=i*Math.PI/32;head.push([Math.cos(a)*53,-58+Math.sin(a)*53]);}
    shape([[-35,-16],[-54,74],[-29,84],[-18,62],[18,62],[29,84],[54,74],[35,-16]],reflected?'#82d8d5':'#a6b5e9');
    shape(head,'#ffe800');
    if(!reflected)return; // The visitor faces the mirror; only the reflection shows a face.
    for(const x of [-18,18]){const eye=[];for(let i=0;i<20;i++){const a=i*Math.PI/10;eye.push([x+Math.cos(a)*5,-61+Math.sin(a)*8]);}shape(eye,'#263462');}
    c.beginPath();for(let i=0;i<=16;i++){const a=i*Math.PI/16;const p=transform(Math.cos(a)*14,-44+Math.sin(a)*8);if(i)c.lineTo(p.x,p.y);else c.moveTo(p.x,p.y);}c.strokeStyle='#263462';c.lineWidth=2;c.stroke();
  }
}
