import {BATCH as first} from './batch-01-masks.js';
import {BATCH as second} from './batch-02-masks.js';
import {BATCH as third} from './batch-03-ink.js';
import {BATCH as fourth} from './batch-04-ink.js';
import {BATCH as fifth} from './batch-05-ink.js';
import {BATCH as sixth} from './batch-06-ink.js';
import {BATCH as seventh} from './batch-07-ink.js';
import {SWATCHES} from './colour-swatches.js';

// Completed production batches remain individually addressable for review.
export const BATCHES={
 '01':{numbers:[1,2,3],title:'魔術師、女祭司、皇后'},
 '02':{numbers:[4,5,6],title:'皇帝、教皇、戀人'},
 '03':{numbers:[7,8,9],title:'戰車、力量、隱者'},
 '04':{numbers:[10,11,12],title:'命運之輪、正義、吊人'},
 '05':{numbers:[13,14,15],title:'死神、節制、惡魔'},
 '06':{numbers:[16,17,18],title:'高塔、星星、月亮'},
 '07':{numbers:[19,20,21],title:'太陽、審判、世界'},
};
export const LATEST_BATCH='07';
export const BATCH={...first,...second,...third,...fourth,...fifth,...sixth,...seventh};
for(const [batch,entry] of Object.entries(BATCHES))for(const n of entry.numbers)BATCH[n].batch=batch;

// Existing reviewed masters are immutable inputs to new monochrome proofs.
// Unfreeze explicitly when a future edit to one of these masters is authorized.
for(let n=1;n<=6;n++)BATCH[n].frozenInkMaster=true;

// Colour for 7–21: same Y/O/B/N plates and densities as batches 01–02, with
// region labels taken from the original colour reference instead of polygons.
for(let n=7;n<=21;n++)Object.assign(BATCH[n],{inkOnly:false,roles:SWATCHES,labelMap:`batch-${BATCH[n].batch}/${n}-labels.png`});
// Strength: the lion's face shares one open outline with its mane, so it is traced here.
BATCH[8].paint=[{role:'gold',from:['red','orange'],path:'M333 440L350 428L376 427L398 446L420 446L442 453L460 459L475 473L484 482L490 495L482 509L470 509L460 505L433 493L424 504L384 516L360 511L335 498L330 470Z'}];
