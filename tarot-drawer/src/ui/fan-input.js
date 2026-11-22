// Distinguish deliberate dragging from hover, even on a narrow desktop window.
export const SWIPE={touchPerCard:1,mousePerCard:3.2,fling:.7,friction:.99,maxV:.0075};
export function swipeCardDelta(pixels,spacing,pointerType){
 const perCard=pointerType==='mouse'?SWIPE.mousePerCard:SWIPE.touchPerCard;
 return -pixels/(spacing*perCard);
}
export function fanFocusPosition(current,index,scroll,recenter=true){
 return scroll&&index>=0&&recenter?index:current;
}
// WheelEvent 不提供可靠的 mouse/trackpad 分類；直接接受橫向意圖。
// 一般直向滾輪與 Ctrl 縮放不介入，Shift + 滾輪則支援沒有橫向軸的滑鼠。
export function wheelCardDelta(event,spacing,pageWidth){
 if(event.ctrlKey)return 0;
 const {deltaX=0,deltaY=0,deltaMode=0,shiftKey=false}=event;
 const horizontal=Math.abs(deltaX)>=Math.abs(deltaY)?deltaX:shiftKey?deltaY:0;
 const unit=deltaMode===1?16:deltaMode===2?pageWidth:1;
 return horizontal*unit/(spacing*SWIPE.mousePerCard);
}
