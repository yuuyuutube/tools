import {BATCH as first} from './batch-01-masks.js';
import {BATCH as second} from './batch-02-masks.js';
import {BATCH as third} from './batch-03-ink.js';
import {BATCH as fourth} from './batch-04-ink.js';
import {BATCH as fifth} from './batch-05-ink.js';
import {BATCH as sixth} from './batch-06-ink.js';
import {BATCH as seventh} from './batch-07-ink.js';

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
