// 讓數字「有意義」的純函式：判讀、重點、大事記。不碰 DOM，方便測試。
import {average,percentile,period,summary} from './data-core.mjs';

// 公開報導中的具名軍演。日期為「公告日期」（國防部統計前日 06:00 至當日 06:00，故比演習日晚一天）。
export const events=[
 {id:'js2023',start:'2023-04-09',end:'2023-04-11',name:'聯合利劍',bg:'蔡英文總統過境美國、會晤美國眾議院議長後，解放軍宣布環台演習。'},
 {id:'js2024a',start:'2024-05-24',end:'2024-05-25',name:'聯合利劍-2024A',bg:'賴清德總統就職後數日，解放軍宣布環台演習。'},
 {id:'js2024b',start:'2024-10-15',end:'2024-10-15',name:'聯合利劍-2024B',bg:'國慶演說後數日舉行，單日共機架次創下資料期間最高紀錄。'},
 {id:'st2025a',start:'2025-04-02',end:'2025-04-03',name:'海峽雷霆-2025A',bg:'解放軍宣布於台灣周邊舉行聯合演習，並以「海峽雷霆」命名第二階段。'},
 {id:'jm2025',start:'2025-12-30',end:'2025-12-31',name:'正義使命-2025',bg:'年底宣布的環台聯合演習，單日架次為資料期間第二高。'},
];
export const eventOf=date=>events.find(e=>date>=e.start&&date<=e.end)||null;
export function eventPeak(rows,e){return rows.filter(r=>r.date>=e.start&&r.date<=e.end&&r.aircraft_total!==null).reduce((p,r)=>!p||r.aircraft_total>p.aircraft_total?r:p,null);}

// 今日判讀：以過去 365 天的「有效觀測日」為背景，說明今天落在哪裡。
export const tones=[{min:95,label:'極高',tone:'peak',hint:'一年中最忙的 5% 日子'},{min:75,label:'偏多',tone:'high',hint:'比一年中多數日子忙'},{min:25,label:'一般',tone:'normal',hint:'落在一年中常見的範圍'},{min:-1,label:'偏少',tone:'low',hint:'比一年中多數日子安靜'}];
export function verdict(rows,date){
 const r=rows.find(x=>x.date===date),prior=rows.filter(x=>x.date<date);
 const from=new Date(Date.parse(date)-365*864e5).toISOString().slice(0,10);
 const year=prior.filter(x=>x.date>=from&&x.aircraft_total!==null);
 const value=r?.aircraft_total??null,avg30=average(prior,'aircraft_total',30);
 if(value===null)return {value,avg30,pct:null,tone:null,year};
 const pct=percentile(year,'aircraft_total',value);
 return {value,avg30,pct,tone:tones.find(t=>pct>=t.min),diff:avg30?100*(value/avg30-1):null,more:year.filter(x=>x.aircraft_total>value).length,days:year.length,year,cross:r.median_line_cross};
}

// 移動平均（缺值不計，不足 n 日時以現有天數計）
export function rolling(data,key,n=7){return data.map((r,i)=>{const w=data.slice(Math.max(0,i-n+1),i+1).filter(x=>x[key]!==null&&x[key]!==undefined);return w.length?w.reduce((s,x)=>s+x[key],0)/w.length:null;});}

// 自動產生的重點句。每項：{title, value, text, tone}
export function highlights(rows,latest){
 const y=Number(latest.slice(0,4)),end=latest.slice(5),out=[];
 const a=summary(period(rows,y,end),'aircraft_total'),b=summary(period(rows,y-1,end),'aircraft_total');
 if(a.days&&b.days){const ch=100*(a.average/b.average-1);out.push({title:`${y} 年 vs ${y-1} 年同期`,value:`${ch>=0?'+':'−'}${Math.abs(ch).toFixed(0)}%`,text:`今年平均每天 ${a.average.toFixed(1)} 架次，去年同期 ${b.average.toFixed(1)} 架次。整體活動${Math.abs(ch)<5?'與去年差不多':ch>0?'比去年更頻繁':'比去年少'}。`,tone:ch>=5?'up':ch<=-5?'down':'flat'});}
 const ca=summary(period(rows,y,end),'median_line_cross'),cb=summary(period(rows,y-1,end),'median_line_cross');
 if(a.total&&b.total){const ra=100*ca.total/a.total,rb=100*cb.total/b.total;out.push({title:'越過中線的比例',value:`${ra.toFixed(0)}%`,text:`今年每 100 架次中約 ${ra.toFixed(0)} 架次越過海峽中線，去年同期約 ${rb.toFixed(0)} 架次。`,tone:ra-rb>=3?'up':rb-ra>=3?'down':'flat'});}
 let streak=0;for(let i=rows.length-1;i>=0&&rows[i].median_line_cross>0;i--)streak++;
 const all=rows.filter(r=>r.aircraft_total!==null).map(r=>r.aircraft_total).sort((p,q)=>p-q),big=Math.round(all[Math.floor(all.length*.95)]||0);
 const lastBig=[...rows].reverse().find(r=>r.aircraft_total>=big);
 const since=lastBig?Math.round((Date.parse(latest)-Date.parse(lastBig.date))/864e5):null;
 out.push(streak>=3?{title:'連續越線',value:`${streak} 天`,text:`截至最新公告，已連續 ${streak} 天有共機越過海峽中線。`,tone:'up',date:latest}:{title:`上次單日 ≥ ${big} 架次`,value:since===null?'—':since===0?'今天':`${since} 天前`,text:lastBig?`${lastBig.date} 出現 ${lastBig.aircraft_total} 架次${eventOf(lastBig.date)?'（'+eventOf(lastBig.date).name+'）':''}；${big} 架次以上約是歷史前 5% 的高峰。`:'',tone:'flat',date:lastBig?.date});
 if(a.peak&&a.peak.date===lastBig?.date){const ms=Array.from({length:12},(_,i)=>({m:i+1,...summary(period(rows,y,end).filter(r=>Number(r.date.slice(5,7))===i+1),'aircraft_total')})).filter(m=>m.days),top=ms.reduce((p,m)=>m.average>p.average?m:p,ms[0]);if(top)out.push({title:`${y} 年最忙的月份`,value:`${top.m} 月`,text:`平均每天 ${top.average.toFixed(1)} 架次，全年平均 ${a.average.toFixed(1)} 架次。`,tone:'flat',date:top.peak?.date});}
 else if(a.peak)out.push({title:`${y} 年單日最高`,value:`${a.peak.aircraft_total} 架次`,text:`發生在 ${a.peak.date}${eventOf(a.peak.date)?'，'+eventOf(a.peak.date).name+'期間':''}。`,tone:'flat',date:a.peak.date});
 return out;
}
