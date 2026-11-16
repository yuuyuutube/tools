export const LIQUID_STEP = 1/120;
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));

/** Damped height-field wave equation on a pinned circular boundary, not Navier–Stokes. */
export class LiquidSimulation {
  constructor(size=65) {
    this.size=size;this.height=new Float32Array(size*size);this.velocity=new Float32Array(size*size);
    this.mask=new Uint8Array(size*size);this.cells=[];
    for(let y=1;y<size-1;y++)for(let x=1;x<size-1;x++)if(Math.hypot(this.coord(x),this.coord(y))<.98){const i=y*size+x;this.mask[i]=1;this.cells.push(i);}
    this.reset();
  }
  coord(i){return i/(this.size-1)*2-1;}
  reset(){this.height.fill(0);this.velocity.fill(0);this.time=0;this.phase=0;this.persistence=.6;this.sensitivity=1;this.poke(-.2,.05,.5);}
  poke(x,y,strength=.7,radius=.12){
    x=clamp(x,-1,1);y=clamp(y,-1,1);strength=clamp(strength,-2,2);
    const n=this.size,r=Math.max(2,radius*(n-1)/2),cx=(x+1)*(n-1)/2,cy=(y+1)*(n-1)/2;
    for(let gy=Math.max(1,Math.floor(cy-r*2));gy<=Math.min(n-2,Math.ceil(cy+r*2));gy++)for(let gx=Math.max(1,Math.floor(cx-r*2));gx<=Math.min(n-2,Math.ceil(cx+r*2));gx++){
      const i=gy*n+gx;if(this.mask[i])this.velocity[i]=clamp(this.velocity[i]+strength*9*Math.exp(-((gx-cx)**2+(gy-cy)**2)/(r*r)),-16,16);
    }
  }
  step(dt=LIQUID_STEP,signal={level:0,brightness:0,peak:0}){
    dt=clamp(dt,0,LIQUID_STEP);const n=this.size,h=this.height,v=this.velocity;
    const level=clamp((signal.level||0)*this.sensitivity,0,1),bright=clamp(signal.brightness||0,0,1);
    this.phase+=dt*(1.2+bright*3.8)*Math.PI*2;
    if(level>.005){
      const lobes=2+Math.round(bright*4),r=.18+bright*.32;
      for(let k=0;k<lobes;k++){const a=k/lobes*Math.PI*2;this.poke(Math.cos(a)*r,Math.sin(a)*r,Math.sin(this.phase+k*Math.PI)*level*dt*8,.075+(.1*(1-bright)));}
    }
    const damping=Math.exp(-dt*(.65+(1-this.persistence)*4.5));
    for(const i of this.cells){const lap=h[i-1]+h[i+1]+h[i-n]+h[i+n]-4*h[i];v[i]=clamp((v[i]+dt*529*lap)*damping,-16,16);}
    for(const i of this.cells){h[i]=clamp(h[i]+v[i]*dt,-.75,.75);if(Math.abs(h[i])===.75)v[i]*=.5;}
    this.time+=dt;
  }
  energy(){let total=0;for(const i of this.cells)total+=this.height[i]**2+this.velocity[i]**2/529;return total/this.cells.length;}
}
