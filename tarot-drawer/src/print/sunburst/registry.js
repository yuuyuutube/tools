import {BATCH as first} from './batch-01-masks.js';
import {BATCH as second} from './batch-02-masks.js';

// Completed production batches remain individually addressable for review.
export const BATCHES={
 '01':{numbers:[1,2,3],title:'魔術師、女祭司、皇后'},
 '02':{numbers:[4,5,6],title:'皇帝、教皇、戀人'},
};
export const BATCH={...first,...second};
for(const [batch,entry] of Object.entries(BATCHES))for(const n of entry.numbers)BATCH[n].batch=batch;
