export const fields=['aircraft_total','median_line_cross','ships_total'];
export function parseCSV(text){
 const rows=[];let row=[],cell='',quoted=false;
 for(let i=0;i<text.length;i++){const c=text[i];if(c==='"'){if(quoted&&text[i+1]==='"'){cell+='"';i++;}else quoted=!quoted;}else if(c===','&&!quoted){row.push(cell);cell='';}else if(c==='\n'&&!quoted){row.push(cell.replace(/\r$/,''));rows.push(row);row=[];cell='';}else cell+=c;}
 if(quoted)throw Error('CSV 引號未閉合');if(cell||row.length){row.push(cell.replace(/\r$/,''));rows.push(row);}const headers=rows.shift().map(x=>x.replace(/^\uFEFF/,''));
 if(!['date',...fields].every(x=>headers.includes(x)))throw Error('CSV 必要欄位已變更');
 return rows.filter(r=>r.some(Boolean)).map(r=>Object.fromEntries(headers.map((h,i)=>[h,r[i]??''])));
}
export function validDate(s){return /^\d{4}-\d{2}-\d{2}$/.test(s)&&!isNaN(Date.parse(s))&&new Date(s+'T00:00:00Z').toISOString().slice(0,10)===s;}
export function normalize(csv,today){const seen=new Set();return parseCSV(csv).map(r=>{if(!validDate(r.date)||r.date>today||seen.has(r.date))throw Error('日期無效、重複或超前：'+r.date);seen.add(r.date);const o={date:r.date,note:r.special_event||'',types:r.aircraft_type||null,source:null};for(const f of fields){o[f]=r[f].trim()===''?null:Number(r[f]);if(o[f]!==null&&(!Number.isSafeInteger(o[f])||o[f]<0))throw Error('數值無效：'+r.date+' '+f);}if(o.median_line_cross!==null&&o.aircraft_total!==null&&o.median_line_cross>o.aircraft_total)throw Error('越線架次超過總架次');return o;}).sort((a,b)=>a.date.localeCompare(b.date));}
export const taipeiDate=(d=new Date())=>new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Taipei',year:'numeric',month:'2-digit',day:'2-digit'}).format(d);
export const average=(rows,key,n=Infinity)=>{const a=rows.filter(r=>r[key]!==null).slice(-n);return a.length?a.reduce((s,r)=>s+r[key],0)/a.length:null;};
export function summary(rows,key){const a=rows.filter(r=>r[key]!==null);return {days:a.length,total:a.reduce((s,r)=>s+r[key],0),average:average(a,key),peak:a.reduce((p,r)=>!p||r[key]>p[key]?r:p,null)};}
export const ratio=r=>r&&r.aircraft_total>0&&r.median_line_cross!==null?r.median_line_cross/r.aircraft_total:null;
export function percentile(rows,key,value){const a=rows.filter(r=>r[key]!==null);return value===null||!a.length?null:100*a.filter(r=>r[key]<value).length/a.length;}
export const period=(rows,year,end='12-31')=>rows.filter(r=>r.date.startsWith(String(year))&&r.date.slice(5)<=end);
export const monthly=(rows,year,key,end='12-31')=>Array.from({length:12},(_,i)=>summary(period(rows,year,end).filter(r=>Number(r.date.slice(5,7))===i+1),key));
export function daysOfYear(year){const a=[];for(let d=new Date(Date.UTC(year,0,1));d.getUTCFullYear()===year;d.setUTCDate(d.getUTCDate()+1))a.push(d.toISOString().slice(0,10));return a;}
export const thresholds={aircraft_total:[1,10,20,40,80],median_line_cross:[1,5,10,20,40],ships_total:[1,5,10,15,25]};
export const level=(value,key)=>value===null?-1:thresholds[key].filter(t=>value>=t).length;
