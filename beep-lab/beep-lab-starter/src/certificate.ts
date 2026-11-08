import { drawCertificatePraise } from './certificate-praise';
export type CertificateDetails={name:string;dateLabel:string;dateISO:string;levelCount:number;praise:string};
export function canIssueCertificate(completed:readonly string[],levelIds:readonly string[]):boolean {
  return levelIds.length>0&&levelIds.every(id=>completed.includes(id));
}
export function certificateDetails(rawName:string,levelCount:number,date=new Date(),praise=drawCertificatePraise()):CertificateDetails {
  const name=rawName.normalize('NFC').replace(/[\u0000-\u001f\u007f-\u009f\u202a-\u202e\u2066-\u2069]/g,'').replace(/\s+/g,' ').trim();
  if(!name)throw new Error('請輸入要印在證書上的名字。');
  if(Array.from(name).length>24)throw new Error('名字請在 24 字以內。');
  if(!Number.isInteger(levelCount)||levelCount<1||!Number.isFinite(date.getTime()))throw new Error('無法產生證書，請重新整理後再試。');
  const year=date.getFullYear(),month=String(date.getMonth()+1).padStart(2,'0'),day=String(date.getDate()).padStart(2,'0');
  return {name,levelCount,praise,dateISO:`${year}-${month}-${day}`,dateLabel:`${year} 年 ${month} 月 ${day} 日`};
}
export function drawCertificate(canvas:HTMLCanvasElement,details:CertificateDetails) {
  canvas.width=1600;canvas.height=1200;const ctx=canvas.getContext('2d');
  if(!ctx)throw new Error('此瀏覽器無法產生圖片，請改用新版 Safari 或 Chrome。');
  const ink='#303e34',green='#5e7969',gold='#b79d60',red='#b44f36',paper='#f7f3e8';
  ctx.fillStyle=paper;ctx.fillRect(0,0,1600,1200);
  ctx.strokeStyle=gold;ctx.lineWidth=2;ctx.strokeRect(64,64,1472,1072);ctx.strokeStyle='#d9d4c3';ctx.lineWidth=1;ctx.strokeRect(82,82,1436,1036);
  // One bar for each completed challenge.
  const heights=[28,52,40,72,60,88,64,44];
  Array.from({length:details.levelCount},(_,index)=>{const height=heights[index%heights.length];ctx.fillStyle=index===Math.floor(details.levelCount/2)?red:green;ctx.fillRect((1600-((details.levelCount-1)*40+18))/2+index*40,160-height/2,18,height);});
  ctx.textAlign='center';ctx.fillStyle=green;ctx.font='500 30px Arial, sans-serif';ctx.fillText('BEEP LAB',800,260);
  ctx.fillStyle=ink;ctx.font='600 70px "Songti TC", "Noto Serif CJK TC", serif';ctx.fillText('鈴聲考古・通關證書',800,370);
  ctx.font='28px sans-serif';ctx.fillStyle=green;ctx.fillText('頒予',800,460);
  let size=112;do{ctx.font=`600 ${size}px "Songti TC", "Noto Serif CJK TC", serif`;if(ctx.measureText(details.name).width<=1200)break;size-=2;}while(size>40);
  ctx.fillStyle=ink;ctx.fillText(details.name,800,600);
  ctx.strokeStyle=gold;ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(340,638);ctx.lineTo(1260,638);ctx.stroke();
  ctx.font='32px sans-serif';ctx.fillStyle=ink;ctx.fillText(`完成全部 ${details.levelCount} 首經典旋律修復`,800,710);
  ctx.font='32px \"Songti TC\", \"Noto Serif CJK TC\", serif';ctx.fillStyle=green;
  const lines:string[]=[];let line='';for(const letter of Array.from(details.praise)){if(line&&ctx.measureText(line+letter).width>1200){lines.push(line);line=letter;}else line+=letter;}if(line)lines.push(line);
  lines.forEach((text,index)=>ctx.fillText(text,800,784+index*44));
  ctx.font='28px sans-serif';ctx.fillStyle=green;ctx.fillText(details.dateLabel,800,912);
  ctx.strokeStyle=red;ctx.lineWidth=3;ctx.beginPath();ctx.arc(800,1020,67,0,Math.PI*2);ctx.stroke();ctx.lineWidth=1;ctx.beginPath();ctx.arc(800,1020,58,0,Math.PI*2);ctx.stroke();
  ctx.fillStyle=red;ctx.font='600 29px Arial, sans-serif';ctx.fillText(`${details.levelCount} / ${details.levelCount}`,800,1021);ctx.font='18px sans-serif';ctx.fillText('全數修復',800,1050);
}
export function certificateBlob(canvas:HTMLCanvasElement):Promise<Blob> {
  return new Promise((resolve,reject)=>canvas.toBlob(blob=>blob?resolve(blob):reject(new Error('無法產生圖片，請再試一次。')),'image/png'));
}
