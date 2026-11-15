// 每款牌背各自決定配色與構圖，網站可共存多款。
import { printBack } from './back.js?v=ornate-2';
import { printMothBack } from './back-moth.js?v=botanical-frame-1';
import { printTideBack } from './back-tide.js';
import { printPomegranateBack } from './back-pomegranate.js';
import { printSerpentBack } from './back-serpent.js?v=scales-2';
import { printFoxBack } from './back-fox.js?v=contour-2';
import { printCraneBack } from './back-crane.js';
import { printFlowerBack } from './back-flower.js';
import { printGeometryBack } from './back-geometry.js';
export const BACK_DESIGNS = [
 { id:'celestial-eye', name:'星芒之眼', description:'雙月、星芒與花冠拱框', asset:'card-back.png', print:printBack },
 { id:'moth-garden', name:'夜蛾花園', description:'梅紫滿版、霧粉夜蛾、花冠藤蔓框', asset:'card-back-moth.png', print:printMothBack },
 { id:'tide-gate', name:'潮汐之門', description:'孔雀藍、海玻璃綠、扇貝與編繩框', asset:'card-back-tide.png', print:printTideBack },
 { id:'pomegranate-garden', name:'石榴秘園', description:'酒紅、杏桃果實、橄欖綠與花形框', asset:'card-back-pomegranate.png', print:printPomegranateBack },
 { id:'serpent-ring', name:'黑金蛇環', description:'炭黑、霧金盤蛇、灰綠晶石與扇形框', asset:'card-back-serpent.png', print:printSerpentBack },
 { id:'snow-fox', name:'雪境雙狐', description:'霧藍、灰紫、白狐與尖拱冰紋框', asset:'card-back-fox.png', print:printFoxBack },
 { id:'vermilion-cranes', name:'朱砂雙鶴', description:'朱砂紅、米白雙鶴、松綠與雲紋框', asset:'card-back-crane.png', print:printCraneBack },
 { id:'moon-flower', name:'月白花窗', description:'暖白紙地、紫色花冠與綠葉花窗', asset:'card-back-flower.png', print:printFlowerBack },
 { id:'jade-maze', name:'翠玉迷宮', description:'深翠綠、淺玉、霧金與八角折線', asset:'card-back-geometry.png', print:printGeometryBack },
];
