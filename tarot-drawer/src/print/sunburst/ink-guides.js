// Original 819 × 1229 geometry; each band follows one physical turning plane.
export const cut=(a,c1,c2,count=32,weight=1.55,extra={})=>({a,b:[a[0],c1,c2,a[3]],count,weight,bend:.13,mode:'cross',...extra});
export const fold=(a,c1,c2,strands=9,weight=1.55,extra={})=>cut(a,c1,c2,32,weight,{mode:'flow',strands,...extra});
export const fine=(a,c1,c2)=>fold(a,c1,c2,4,.95);
export const box=(x,y,w,h)=>`M${x} ${y}h${w}v${h}h-${w}Z`;
export const inkCard=(id,bands,outlines,options={})=>({id,inkOnly:true,designSize:[819,1229],map:{scale:.27,x:11.8,y:48},finishing:{outlineRadius:1.5,bands,outlines,...options.finishing},...Object.fromEntries(Object.entries(options).filter(([k])=>k!=='finishing'))});
