// Website derivatives are exported from the same render as the review stages.
const make=(w,h)=>Object.assign(document.createElement('canvas'),{width:w,height:h});
export function deliveryAssets(result){
 if(!result.illustration)throw Error('Illustration-only render missing');
 const face=result.illustration;
 const art=make(1024,1536),g=art.getContext('2d'),data=Object.fromEntries(Object.entries(result.sourcePlates).map(([k,cv])=>[k,cv.getContext('2d').getImageData(0,0,1024,1536).data])),out=g.createImageData(1024,1536),inks={Y:[232,183,77],O:[222,83,43],B:[62,112,150],N:[30,40,74]};
 for(let i=0;i<1024*1536;i++){const j=i*4;let c=[246,239,224];for(const k of ['Y','O','B','N']){const d=data[k][j+1]/255;c=c.map((v,ch)=>v*(1-d+d*inks[k][ch]/255));}const ink=data.N[j]/255;for(let ch=0;ch<3;ch++)out.data[j+ch]=Math.round(c[ch]*(1-ink)+inks.N[ch]*ink);out.data[j+3]=255;}g.putImageData(out,0,0);
 return {face,art};
}
