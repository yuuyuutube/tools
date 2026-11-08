import{g as i}from"./share-dialog-Bv_07jI8.js";function g(t,a,o,n){const f=n.trim().split(/\s+/).map(d=>{const e=/^(1|2|4|8|16|32)(\.?)(?:([a-g])([123])|(-))$/.exec(d);if(!e)throw new Error(`Invalid repertoire note: ${d}`);const c={duration:Number(e[1]),dotted:!!e[2]};return e[5]?{type:"rest",...c}:{type:"note",pitch:e[3],octave:Number(e[4]),sharp:!1,...c}}),r={schemaVersion:1,id:`beep-lab:repertoire:${t}`,title:a,tempoBpm:o,events:f,createdAt:"2026-11-08T00:00:00.000Z",updatedAt:"2026-11-08T00:00:00.000Z"};if(!i(r))throw new Error("Invalid repertoire melody");return r}function s(){return g("birthday","生日快樂歌",108,`
    8.g1 16g1 4a1 4g1 4c2 2b1
    8.g1 16g1 4a1 4g1 4d2 2c2
    8.g1 16g1 4g2 4e2 4c2 4b1 4a1
    8.f2 16f2 4e2 4c2 4d2 2.c2`)}function b(){return[s(),g("jingle-chorus","叮叮噹",144,`
      4e2 4e2 2e2 4e2 4e2 2e2 4e2 4g2 4.c2 8d2 1e2
      4f2 4f2 4.f2 8f2 4f2 4e2 4e2 8e2 8e2 4e2 4d2 4d2 4e2 2d2 2g2
      4e2 4e2 2e2 4e2 4e2 2e2 4e2 4g2 4.c2 8d2 1e2
      4f2 4f2 4.f2 8f2 4f2 4e2 4e2 8e2 8e2 4g2 4g2 4f2 4d2 1c2`),g("jingle-verse","雪花隨風飄",144,`
      4g1 4e2 4d2 4c2 2.g1 8g1 8g1 4g1 4e2 4d2 4c2 1a1
      4a1 4f2 4e2 4d2 1b1 4g2 4g2 4f2 4d2 1e2
      4g1 4e2 4d2 4c2 2.g1 4g1 4g1 4e2 4d2 4c2 1a1
      4a1 4f2 4e2 4d2 4g2 4g2 4g2 4g2 4a2 4g2 4f2 4d2 2c2 2g2`),g("wedding-march","結婚進行曲",116,`
      16c2 16c2 8c2 2.c2 16c2 16c2 8c2 2.c2
      16c2 16c2 8e2 4e2 16e2 16e2 8e2 4e2
      16e2 16e2 8e2 4g2 16g2 16g2 8g2 4g2
      4g1 2c3 4b2 8b2 8a2 4g2 4a2 4g2 4f2
      4e2 16d2 16e2 16d2 16e2 16d2 16e2 16d2 16e2
      16d2 16e2 16d2 16e2 16d2 16e2 16d2 16e2 4e2
      8.g1 16d2 4e2 4- 8- 8c2 8e2 8g2 2c3`)]}export{s as b,b as s};
