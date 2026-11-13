import {CwaService} from '../server/cwa.js';
if(!process.env.CWA_API_KEY){console.error('未設定 CWA_API_KEY：未執行官方 API 驗證。');process.exitCode=2;}
else {try {const w=await new CwaService({key:process.env.CWA_API_KEY}).weather('臺北市','中正區');console.log(JSON.stringify({mode:w.mode,feed:w.feed,town:w.town,observedAt:w.observedAt,station:w.station,origins:w.origins,currentPeriod:w.currentPeriod,issues:w.issues},null,2));}catch{console.error('官方 API 驗證失敗。請檢查金鑰、網路與目前資料格式。');process.exitCode=1;}}
