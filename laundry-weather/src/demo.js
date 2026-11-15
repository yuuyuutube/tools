const FIXED_TIME = '2026-11-13T09:00:00+08:00';
export const DEMOS = {
 sunny:{ temperature:28,humidity:58,windSpeed:2.4,windDirection:80,pop:10,weather:'晴',isRaining:false },
 cloudy:{ temperature:24,humidity:70,windSpeed:1.8,windDirection:135,pop:20,weather:'多雲',isRaining:false },
 humid:{ temperature:22,humidity:91,windSpeed:.6,windDirection:200,pop:30,weather:'陰',isRaining:false },
 rainy:{ temperature:21,humidity:88,windSpeed:4.2,windDirection:60,pop:85,weather:'小雨',isRaining:true }
};
export function demoWeather(scene='sunny',location={county:'臺北市',town:'中正區'}) {
 const d=DEMOS[scene] || DEMOS.sunny;
 return {...d,mode:'demo',county:location.county,town:location.town,isNight:false,observedAt:FIXED_TIME,fetchedAt:null,
  currentPeriod:{start:FIXED_TIME,end:'2026-11-13T12:00:00+08:00'},
  forecast:[{start:FIXED_TIME,end:'2026-11-13T12:00:00+08:00',pop:d.pop},{start:'2026-11-13T12:00:00+08:00',end:'2026-11-13T15:00:00+08:00',pop:d.pop}],
  station:null,origins:{temperature:'展示',humidity:'展示',windSpeed:'展示',weather:'展示'},issues:[]};
}
