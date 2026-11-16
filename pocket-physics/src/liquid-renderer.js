import { LiquidCanvasRenderer } from './liquid-canvas-renderer.js';
const vertex=`
precision highp float;
attribute vec2 aPoint;
uniform sampler2D uHeight;
uniform vec2 uViewport,uCenter;
uniform float uScale,uKind;
varying vec2 vPoint;
varying float vHeight;
float elevation(vec2 p){return ((dot(texture2D(uHeight,p*.5+.5).rg,vec2(65280.,255.))/65535.)*2.-1.)*.75;}
void main(){
 vPoint=aPoint;float h=uKind<.5?elevation(aPoint):uKind<1.5?-.125:-.19;vHeight=h;
 vec2 pixel=uCenter+vec2(aPoint.x*220.,aPoint.y*126.-h*110.)*uScale;
 gl_Position=vec4(pixel.x/uViewport.x*2.-1.,1.-pixel.y/uViewport.y*2.,-(aPoint.y*.55+h*.7)*.3,1.);
}`;
const fragment=`
precision highp float;
uniform sampler2D uHeight;
uniform float uKind,uStep,uCursorActive;
uniform vec2 uCursor;
varying vec2 vPoint;
varying float vHeight;
float elevation(vec2 p){return ((dot(texture2D(uHeight,p*.5+.5).rg,vec2(65280.,255.))/65535.)*2.-1.)*.75;}
void main(){
 float r=length(vPoint);
 if(uKind>1.5){float a=exp(-r*r*3.)*.16;gl_FragColor=vec4(.0,.21,.36,a);return;}
 if(r>.985)discard;
 if(uKind>.5){float edge=smoothstep(.96,.984,r);vec3 color=mix(vec3(.0,.27,.46),vec3(1.,.502,.118),edge);gl_FragColor=vec4(color,1.);return;}
 float dx=(elevation(vPoint+vec2(uStep,0.))-elevation(vPoint-vec2(uStep,0.)))/(2.*uStep);
 float dy=(elevation(vPoint+vec2(0.,uStep))-elevation(vPoint-vec2(0.,uStep)))/(2.*uStep);
 vec3 normal=normalize(vec3(-dx*.65,1.,-dy*.65));
 vec3 eye=normalize(vec3(0.,1.2,1.8));vec3 light=normalize(vec3(-.5,1.4,-.4));
 float diffuse=max(0.,dot(normal,light));
 vec3 color=mix(vec3(.0,.24,.49),vec3(.0,.54,.77),diffuse);
 vec3 reflected=reflect(-eye,normal);
 float softbox=pow(max(0.,dot(reflected,normalize(vec3(-.5,1.,-.8)))),18.);
 float ribbon=pow(max(0.,dot(reflected,normalize(vec3(.6,1.,-.1)))),65.);
 float fresnel=pow(1.-max(0.,dot(normal,eye)),3.);
 color=mix(color,vec3(.80,.96,1.),softbox*.85);
 color+=vec3(.30,.48,.51)*ribbon;
 color+=vec3(.06,.10,.12)*exp(-pow((vPoint.x+vPoint.y*.4+.35)*3.,2.));
 color=mix(color,vec3(.19,.69,.87),fresnel*.65);
 // A warm strip reflected at the far edge balances the cold blue pigment.
 float rim=smoothstep(.93,.984,r)*max(0.,-vPoint.y)*.6;
 color=mix(color,vec3(1.,.502,.118),rim);
 float marker=(1.-smoothstep(.006,.012,abs(distance(vPoint,uCursor)-.035)))*uCursorActive;
 color=mix(color,vec3(1.,.502,.118),marker);
 gl_FragColor=vec4(color,1.);
}`;

export class LiquidRenderer {
  constructor(canvas,sim){
    const gl=canvas.getContext('webgl',{alpha:true,antialias:true,premultipliedAlpha:false});
    if(!gl||gl.getParameter(gl.MAX_VERTEX_TEXTURE_IMAGE_UNITS)<1){
      if(gl)throw Error('Vertex texture sampling is unavailable');
      return new LiquidCanvasRenderer(canvas,sim);
    }
    this.canvas=canvas;this.sim=sim;this.gl=gl;this.width=0;this.cursor=null;this.lost=false;
    this.onLost=e=>{e.preventDefault();this.lost=true;};this.onRestore=()=>{this.lost=false;this.setup();this.render();};
    canvas.addEventListener('webglcontextlost',this.onLost);canvas.addEventListener('webglcontextrestored',this.onRestore);this.setup();
  }
  setup(){
    const gl=this.gl;
    const compile=(type,source)=>{const shader=gl.createShader(type);gl.shaderSource(shader,source);gl.compileShader(shader);if(!gl.getShaderParameter(shader,gl.COMPILE_STATUS))throw Error(gl.getShaderInfoLog(shader));return shader;};
    this.program=gl.createProgram();const vs=compile(gl.VERTEX_SHADER,vertex),fs=compile(gl.FRAGMENT_SHADER,fragment);gl.attachShader(this.program,vs);gl.attachShader(this.program,fs);gl.linkProgram(this.program);gl.deleteShader(vs);gl.deleteShader(fs);if(!gl.getProgramParameter(this.program,gl.LINK_STATUS))throw Error(gl.getProgramInfoLog(this.program));
    this.uniform={};for(const name of ['Viewport','Center','Scale','Kind','Height','Step','Cursor','CursorActive'])this.uniform[name]=gl.getUniformLocation(this.program,'u'+name);
    const data=[],size=128;
    for(let y=0;y<size;y++)for(let x=0;x<size;x++){
      const a=x/size*2-1,b=y/size*2-1,d=2/size;if(Math.hypot(a+d*.5,b+d*.5)>1.02)continue;
      data.push(a,b,a+d,b,a,b+d,a+d,b,a+d,b+d,a,b+d);
    }
    this.surfaceCount=data.length/2;this.surface=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,this.surface);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(data),gl.STATIC_DRAW);
    this.quad=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,this.quad);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1.3,-1.3,1.3,-1.3,-1.3,1.3,1.3,-1.3,1.3,1.3,-1.3,1.3]),gl.STATIC_DRAW);
    this.texture=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,this.texture);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
    this.pixels=new Uint8Array(this.sim.height.length*4);gl.clearColor(0,0,0,0);
  }
  resize(width,height){this.width=width;this.height=height;this.dpr=Math.min(devicePixelRatio||1,2);this.canvas.width=Math.round(width*this.dpr);this.canvas.height=Math.round(height*this.dpr);this.scale=Math.min((width-48)/480,(height-85)/390,1.35);this.center={x:width/2,y:height*(innerWidth<=800?.48:.46)};}
  pointFromClient(clientX,clientY){const r=this.canvas.getBoundingClientRect();return {x:(clientX-r.left-this.center.x)/(this.scale*220),y:(clientY-r.top-this.center.y)/(this.scale*126)};}
  render(){
    if(!this.width||this.lost)return;const gl=this.gl;gl.viewport(0,0,this.canvas.width,this.canvas.height);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);gl.useProgram(this.program);
    for(let i=0;i<this.sim.height.length;i++){const value=Math.round((this.sim.height[i]/.75+1)*32767.5);this.pixels[i*4]=Math.floor(value/256);this.pixels[i*4+1]=value%256;this.pixels[i*4+2]=value;this.pixels[i*4+3]=255;}
    gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,this.texture);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,this.sim.size,this.sim.size,0,gl.RGBA,gl.UNSIGNED_BYTE,this.pixels);
    gl.uniform1f(this.uniform.CursorActive,this.cursor?1:0);gl.uniform2f(this.uniform.Cursor,this.cursor?.x||0,this.cursor?.y||0);
    gl.uniform1i(this.uniform.Height,0);gl.uniform2f(this.uniform.Viewport,this.width,this.height);gl.uniform2f(this.uniform.Center,this.center.x,this.center.y);gl.uniform1f(this.uniform.Scale,this.scale);gl.uniform1f(this.uniform.Step,2/(this.sim.size-1));
    const attribute=gl.getAttribLocation(this.program,'aPoint');gl.enableVertexAttribArray(attribute);
    const draw=(buffer,count,kind)=>{gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.vertexAttribPointer(attribute,2,gl.FLOAT,false,0,0);gl.uniform1f(this.uniform.Kind,kind);gl.drawArrays(gl.TRIANGLES,0,count);};
    gl.disable(gl.DEPTH_TEST);gl.enable(gl.BLEND);gl.blendFunc(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA);draw(this.quad,6,2);gl.disable(gl.BLEND);
    gl.enable(gl.DEPTH_TEST);gl.depthFunc(gl.LEQUAL);gl.depthMask(false);draw(this.surface,this.surfaceCount,1);gl.depthMask(true);draw(this.surface,this.surfaceCount,0);
  }
  dispose(){const gl=this.gl;this.canvas.removeEventListener('webglcontextlost',this.onLost);this.canvas.removeEventListener('webglcontextrestored',this.onRestore);gl.deleteBuffer(this.surface);gl.deleteBuffer(this.quad);gl.deleteTexture(this.texture);gl.deleteProgram(this.program);}
}
