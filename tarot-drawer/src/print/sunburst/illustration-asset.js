import {WINDOW_BOUNDS} from './layout.js';
export const ILLUSTRATION_SIZE={width:654,height:870};
// Capture contains only pigment/ink/paper inside the art window, before frames.
export function illustrationAsset(source){
 const cv=Object.assign(document.createElement('canvas'),ILLUSTRATION_SIZE),g=cv.getContext('2d'),s=source.width/300,b=WINDOW_BOUNDS;
 g.drawImage(source,b.x*s,b.y*s,b.width*s,b.height*s,0,0,cv.width,cv.height);
 return cv;
}
