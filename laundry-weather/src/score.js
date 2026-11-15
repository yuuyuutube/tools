export const RULES = Object.freeze({rain:45,humidity:30,wind:15,temperature:10,great:80,good:65,fair:40,rainRisk:60,strongWind:10});
const clamp=(n,a,b)=>Math.min(b,Math.max(a,n));
const valid=n=>typeof n==='number'&&Number.isFinite(n);
export function laundryScore(w) {
 const horizon=w.forecast || [];
 const rainValues=[w.pop,...horizon.map(p=>p.pop)].filter(valid);
 const risk=rainValues.length?Math.max(...rainValues):null;
 const missing=['temperature','humidity','windSpeed','pop'].filter(k=>!valid(w[k]));
 const sufficient=missing.length===0 && !w.stale && w.forecastComplete!==false;
 let score=0;
 if(valid(risk)) score+=RULES.rain*(1-risk/100);
 if(valid(w.humidity)) score+=RULES.humidity*clamp((95-w.humidity)/45,0,1);
 if(valid(w.windSpeed)) score+=RULES.wind*(w.windSpeed<=4?clamp(w.windSpeed/2,0,1):clamp(1-(w.windSpeed-4)/8,0,1));
 if(valid(w.temperature)) score+=RULES.temperature*clamp((w.temperature-10)/20,0,1);
 const raining=w.isRaining===true;
 const poor=raining || (risk!==null&&risk>=RULES.rainRisk) || (valid(w.windSpeed)&&w.windSpeed>=RULES.strongWind);
 if(poor) score=Math.min(score,29);
 if(!sufficient) score=Math.min(score,59);
 score=Math.round(clamp(score,0,100));
 const grade=poor?'POOR':score>=80?'GREAT':score>=65?'GOOD':score>=40?'FAIR':'POOR';
 const scene=raining || (risk!==null&&risk>=60)?'rainy':w.humidity>=85?'humid':/陰|雲|霧/.test(w.weather||'')?'cloudy':'sunny';
 const sceneLabel={sunny:'陽光剛剛好',cloudy:'雲朵慢慢走',humid:'空氣有點濕',rainy:raining?'雨天的小陽台':'雨雲可能靠近'}[scene];
 let title={GREAT:'今天很適合曬衣服',GOOD:'今天可以曬衣服',FAIR:'今天可能比較難乾',POOR:'今天不建議戶外晾衣'}[grade];
 let detail='';
 if(w.windSpeed>=10) detail='風勢較強，請固定好衣物。';
 if(!sufficient&&!poor) {
  title='天氣資料不足，先等等';
  detail=w.stale?'資料已較舊，請更新後再評估。':w.forecastComplete===false?'接下來幾小時的預報不足。':'部分天氣資料不足。';
 }
 if(w.isNight && !poor && sufficient) detail='入夜少了日照，可能需要多晾一會兒。';
 return {score,grade,scene,sceneLabel,title,detail,missing,sufficient,risk};
}
