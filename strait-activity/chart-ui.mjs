export const plane='M22 12l-8-4V3a2 2 0 0 0-4 0v5l-8 4v2l8-2v6l-3 2v1l5-1 5 1v-1l-3-2v-6l8 2z';
export const ship='M3 15l9 4 9-4-2 6H5zM6 14V8h12v6M10 8V4h4v4';
export function shipMarks(total,shape='plane'){return Array.from({length:total??0},(_,i)=>{const x=36+i%36*26,y=326+Math.floor(i/36)*28;return shape==='square'?`<rect x="${x+4}" y="${y+7}" width="16" height="15" rx="1" fill="#ffc94d"/>`:`<path d="${ship}" transform="translate(${x},${y})" fill="none" stroke="#ffc94d" stroke-width="1.6" stroke-linejoin="round"/>`;}).join('');}
export function signalMarks(total,shape='plane'){
 return Array.from({length:total??0},(_,i)=>{const x=36+i%18*24,y=38+Math.floor(i/18)*24;return shape==='plane'?`<path d="${plane}" transform="translate(${x},${y}) scale(.72)" fill="#8fb8ff"/>`:`<rect x="${x}" y="${y}" width="15" height="15" rx="1" fill="#8fb8ff"/>`;}).join('');
}
export function metricIcon(key){
 const mark=key==='ships_total'
  ? `<path d="${ship}"/>`
  : `<path d="${plane}"/>${key==='median_line_cross'?'<path d="M2 4h5m-5 4h3M19 18h3m-5 4h5"/>':''}`;
 return `<svg class="metric-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">${mark}</svg>`;
}
export function barTrend(data){
 const max=Math.max(1,...data.flatMap(r=>[r.aircraft_total??0,r.median_line_cross??0]));
 const step=940/Math.max(1,data.length),bar=Math.min(14,step*.65),y=v=>210-v/max*180;
 const grid=[0,.5,1].map(t=>`<line class="chart-grid" x1="40" x2="980" y1="${y(t*max)}" y2="${y(t*max)}"/><text x="0" y="${y(t*max)+4}">${+(t*max).toFixed(1)}</text>`).join('');
 const bars=data.map((r,i)=>{const x=40+(i+.5)*step;return `<g>${r.aircraft_total===null?`<path class="chart-missing" d="M${x-2} 205l4 5m-4 0l4-5"/>`:`<rect class="bar-total" x="${x-bar/2}" y="${y(r.aircraft_total)}" width="${bar}" height="${r.aircraft_total/max*180}"/>`}${r.median_line_cross===null?'':`<rect class="bar-cross" x="${x-bar/2}" y="${y(r.median_line_cross)}" width="${bar}" height="${r.median_line_cross/max*180}"/>`}<rect class="hit" data-chart-date="${r.date}" x="${x-step/2}" y="20" width="${step}" height="192"><title>${r.date}：共機 ${r.aircraft_total??'缺值'}，越線 ${r.median_line_cross??'缺值'}</title></rect></g>`;}).join('');
 return `<svg class="chart bar-chart" viewBox="0 0 1000 250" role="img" aria-label="每日共機長條圖，陶土色為總架次內的越線部分，完整數值見下方資料表">${grid}${bars}<text x="40" y="242">${data[0]?.date||''}</text><text x="980" y="242" text-anchor="end">${data.at(-1)?.date||''}</text></svg>`;
}
