// 衣物與角色的 SVG 造型。座標以掛點（繩子）為原點，往下為正，單位約等於 1px（之後整組縮放）。
// 顏色全走 class，讓場景轉場時可以慢慢變色。

const peg = x => `<rect class="c-peg" x="${x - 6}" y="-15" width="12" height="36" rx="3"/>`;
const shade = d => `<path class="c-shade" d="${d}" transform="translate(5 5)"/>`;

const pick = list => list[Math.floor(Math.random() * list.length)];
const tone = () => pick(['c-a', 'c-b']);                 // 每件衣服各自挑主色或副色
const star = r => `M${[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map(i => { const a = i * Math.PI / 5, d = i % 2 ? r * .45 : r; return `${(Math.sin(a) * d).toFixed(1)} ${(-Math.cos(a) * d).toFixed(1)}`; }).join('L')}Z`;

// T-shirt 胸口的圖案，原點在圖案中心
const MOTIFS = {
  flower: `<g class="c-a">${[0, 72, 144, 216, 288].map(r => `<circle cx="0" cy="-21" r="19" transform="rotate(${r})"/>`).join('')}</g><circle class="c-cloth" r="12"/>`,
  sun: `<circle class="c-b" r="24"/><g class="c-a">${[0, 45, 90, 135, 180, 225, 270, 315].map(r => `<rect x="-4" y="-44" width="8" height="14" rx="4" transform="rotate(${r})"/>`).join('')}</g>`,
  dots: `<g class="c-a"><circle cx="-24" cy="-18" r="10"/><circle cx="24" cy="-18" r="10"/><circle cx="0" cy="8" r="10"/><circle cx="-24" cy="34" r="10"/><circle cx="24" cy="34" r="10"/></g>`,
  stripes: `<g class="c-a"><rect x="-76" y="-26" width="152" height="15"/><rect x="-78" y="4" width="156" height="15"/></g><rect class="c-b" x="-80" y="34" width="160" height="15"/>`,
  heart: `<path class="c-a" d="M0 34C-52-2-36-40-14-36Q-4-34 0-22Q4-34 14-36C36-40 52-2 0 34Z"/>`,
  star: `<path class="c-b" d="${star(38)}"/><circle class="c-a" r="8"/>`,
  cat: `<path class="c-a" d="M-30-12L-26-40L-6-28Q0-30 6-28L26-40L30-12Q34 26 0 28Q-34 26-30-12Z"/><g class="c-cloth"><circle cx="-12" cy="-2" r="4.5"/><circle cx="12" cy="-2" r="4.5"/></g>`,
  cloud: `<g class="c-b"><circle cx="-20" cy="2" r="18"/><circle cx="4" cy="-10" r="24"/><circle cx="26" cy="4" r="16"/><rect x="-38" y="0" width="80" height="20" rx="10"/></g>`,
};

// 三頭身角色穿的比例：短、寬、下襬微微外擴，袖子短短的
const TEE = 'M-34 2Q0 36 34 2L62 0L106 36L86 68L68 54L76 138Q0 152-76 138L-68 54L-86 68L-106 36L-62 0Z';
function tee() {
  const id = `tee${uid++}`;
  return { kind: 'tee', s: 1.22, pegs: [-48, 48], stiff: 8.5, drag: 2.4, gain: 1,
    html: `<clipPath id="${id}"><path d="${TEE}"/></clipPath>${shade(TEE)}<path class="c-cloth" d="${TEE}"/><g clip-path="url(#${id})"><g transform="translate(0 88) scale(.86)">${MOTIFS[pick(Object.keys(MOTIFS))]}</g></g>` };
}

const SOCK = 'M-22 0L22 0L22 82Q22 100 36 108L54 119Q72 131 61 149Q50 164 30 155L-8 135Q-22 127-22 108Z';
const SOCKS = {         // 襪筒上的花樣；腳尖與腳跟固定有色塊
  stripes: '<rect x="-30" y="16" width="60" height="11"/><rect x="-30" y="35" width="60" height="11"/>',
  band: '<rect x="-30" y="12" width="60" height="30"/>',
  dots: '<circle cx="-9" cy="22" r="6.5"/><circle cx="10" cy="40" r="6.5"/><circle cx="-9" cy="58" r="6.5"/><circle cx="10" cy="76" r="6.5"/>',
  zigzag: '<path d="M-22 30l11-12 11 12 11-12 11 12v16l-11-12-11 12-11-12-11 12Z"/>',
  top: '<rect x="-30" y="0" width="60" height="16"/><rect x="-30" y="24" width="60" height="6"/>',
};
let uid = 0;
function sock(pattern, col) {
  const id = `sock${uid++}`;
  return { kind: 'sock', pegs: [0], stiff: 12, drag: 2, gain: 1.35,
    html: `<clipPath id="${id}"><path d="${SOCK}"/></clipPath>${shade(SOCK)}<path class="c-cloth" d="${SOCK}"/>
<g clip-path="url(#${id})" class="${col}">${SOCKS[pattern]}<circle cx="58" cy="150" r="27"/><circle cx="-20" cy="118" r="20"/></g>` };
}

function towel() {
  // 布面每一格由 scene.js 重畫（下襬有波），這裡只給尺寸
  return { kind: 'towel', pegs: [-62, 62], stiff: 6.5, drag: 2.8, gain: .85, towel: true,
    html: `<path class="c-shade towel-shade" transform="translate(5 5)"/><path class="c-cloth towel-body"/><path class="c-b towel-wave" fill="none"/><path class="c-b towel-wave" fill="none"/>` };
}

const BODY = 'M-28 0L28 0L60 12L74 140Q0 156-74 140L-60 12Z';
const SLEEVE = 'M0-8L16-2L54 68L24 88L-8 44Z';
const CUFF = 'M44 49L54 68L24 88L14 69Z';
// 袖子是獨立的一片，scene.js 會讓它比身體慢半拍
const sleeve = (side, col) => `<g class="sleeve" data-side="${side}" transform="translate(${side * 56} 18)"><g${side < 0 ? ' transform="scale(-1 1)"' : ''}><path class="c-shade" d="${SLEEVE}" transform="translate(5 5)"/><path class="${col}" d="${SLEEVE}"/><path class="c-cloth" d="${CUFF}"/></g></g>`;
function shirt() {
  const col = tone();
  return { kind: 'shirt', s: 1.22, pegs: [-40, 40], stiff: 7.5, drag: 2.5, gain: .95, sleeves: true,
    html: `${sleeve(-1, col)}${sleeve(1, col)}${shade(BODY)}<path class="${col}" d="${BODY}"/>
<path class="c-cloth" d="M-28 0L0 34L-26 62L-54 10Z"/><path class="c-cloth" d="M28 0L0 34L26 62L54 10Z"/>
<g class="c-cloth"><circle cx="0" cy="80" r="10"/><circle cx="0" cy="116" r="10"/></g>` };
}

const KNIT = 'M-30 0Q0 24 30 0L62 10L74 134Q0 148-74 134L-62 10Z';
function sweater() {
  const col = tone(), id = `knit${uid++}`;
  const chest = pick([
    '<path class="knit" d="M-70 66l14-14 14 14 14-14 14 14 14-14 14 14 14-14 14 14 14-14 14 14"/>',
    '<rect class="c-cloth" x="-80" y="50" width="160" height="14"/><rect class="c-cloth" x="-80" y="76" width="160" height="6"/>',
    `<g class="c-cloth">${[-44, -22, 0, 22, 44].map((x, i) => `<path d="M${x} ${i % 2 ? 78 : 58}l8 8-8 8-8-8Z"/>`).join('')}</g>`,
  ]);
  return { kind: 'sweater', s: 1.22, pegs: [-42, 42], stiff: 6.8, drag: 2.7, gain: .9, sleeves: true,
    html: `${sleeve(-1, col)}${sleeve(1, col)}<clipPath id="${id}"><path d="${KNIT}"/></clipPath>${shade(KNIT)}<path class="${col}" d="${KNIT}"/>
<g clip-path="url(#${id})">${chest}<rect class="c-cloth" x="-80" y="120" width="160" height="30"/></g><path class="knit" d="M-30 0Q0 24 30 0"/>` };
}

const SHORTS = 'M-62 0L62 0L74 98L10 102L0 56L-10 102L-74 98Z';
function shorts() {
  const col = tone(), id = `short${uid++}`;
  return { kind: 'shorts', s: 1.2, pegs: [-44, 44], stiff: 9, drag: 2.3, gain: 1.05,
    html: `<clipPath id="${id}"><path d="${SHORTS}"/></clipPath>${shade(SHORTS)}<path class="${col}" d="${SHORTS}"/>
<g clip-path="url(#${id})" class="c-cloth"><rect x="-70" y="0" width="140" height="17"/>${pick(['<rect x="-80" y="30" width="18" height="80"/><rect x="62" y="30" width="18" height="80"/>', '<circle cx="-40" cy="48" r="8"/><circle cx="-24" cy="78" r="8"/><circle cx="40" cy="48" r="8"/><circle cx="24" cy="78" r="8"/><circle cx="-56" cy="80" r="8"/><circle cx="56" cy="80" r="8"/>', ''])}</g>` };
}

const PANTS = 'M-52 0L52 0L62 170L8 174L0 62L-8 174L-62 170Z';
function pants() {
  const col = tone(), id = `pant${uid++}`;
  return { kind: 'pants', s: 1.1, pegs: [-36, 36], stiff: 7, drag: 2.6, gain: .9,
    html: `<clipPath id="${id}"><path d="${PANTS}"/></clipPath>${shade(PANTS)}<path class="${col}" d="${PANTS}"/>
<g clip-path="url(#${id})" class="c-cloth"><rect x="-60" y="0" width="120" height="17"/><rect x="-70" y="150" width="140" height="30"/>${pick(['<rect x="-46" y="92" width="30" height="26" rx="5"/>', '<path d="M22 30h22v20q-11 10-22 0Z"/>', ''])}</g>` };
}

const SKIRT = 'M-40 0L40 0L90 116Q45 134 0 122Q-45 134-90 116Z';
function skirt() {
  const col = tone(), id = `skirt${uid++}`;
  return { kind: 'skirt', s: 1.15, pegs: [-28, 28], stiff: 7.5, drag: 2.4, gain: 1.05,
    html: `<clipPath id="${id}"><path d="${SKIRT}"/></clipPath>${shade(SKIRT)}<path class="${col}" d="${SKIRT}"/>
<g clip-path="url(#${id})">${pick(['<path class="pleat" d="M-16 16L-38 130M16 16L38 130M0 16V130"/>', '<g class="c-cloth"><circle cx="-36" cy="60" r="8"/><circle cx="0" cy="48" r="8"/><circle cx="36" cy="60" r="8"/><circle cx="-56" cy="98" r="8"/><circle cx="-18" cy="92" r="8"/><circle cx="20" cy="92" r="8"/><circle cx="58" cy="98" r="8"/></g>', '<rect class="c-cloth" x="-100" y="92" width="200" height="12"/>'])}<rect class="c-cloth" x="-50" y="0" width="100" height="16"/></g>` };
}

/** 隨機池：每個單位佔繩上一個位置（襪子是一雙）。w 是含縮放的寬度，排版用 */
const POOL = {
  tee: () => ({ w: 259, parts: [tee()] }),
  socks: () => { const p = pick(Object.keys(SOCKS)), c = tone(); return { w: 160, dx: -23, parts: [sock(p, c), sock(p, c)] }; },
  towel: () => ({ w: 176, parts: [towel()] }),
  shirt: () => ({ w: 270, parts: [shirt()] }),
  sweater: () => ({ w: 270, parts: [sweater()] }),
  shorts: () => ({ w: 180, parts: [shorts()] }),
  pants: () => ({ w: 140, parts: [pants()] }),
  skirt: () => ({ w: 210, parts: [skirt()] }),
};
/** 洗牌後取前 n 個單位。wanted 可指定種類（網址 ?wear=sweater,skirt 預覽用），不足的隨機補上 */
export function wardrobe(n = 4, wanted = []) {
  const rest = Object.keys(POOL).sort(() => Math.random() - .5);
  const names = [...new Set([...wanted.filter(name => POOL[name]), ...rest])].slice(0, n);
  const units = names.map(name => POOL[name]());
  for (const u of units) for (const g of u.parts) g.html = `${g.html}${g.pegs.map(peg).join('')}`;
  return units;
}

/** 配色組合，每次開啟挑一組 */
export const SETS = [
  { a: '#FF6B35', b: '#FFC629', peg: '#FF48B0' },      // 不用藍色：會和藍色山丘糊在一起
  { a: '#FF48B0', b: '#FFC629', peg: '#FF6B35' },
  { a: '#2E9E6B', b: '#FF6B35', peg: '#FFC629' },
  { a: '#FF6B35', b: '#2E9E6B', peg: '#FF48B0' },
];

// 花貓。原點在臀部下方的地面，往右是頭。耳朵畫在頭後面、底邊埋進頭裡，所以不會有縫
const BODYCAT = 'M-128 0Q-140-74-58-84Q8-92 60-66L120 0Z';
const face = (name, html) => `<g class="face" data-f="${name}">${html}</g>`;
const MOUTH = '<path d="M78-34q7 7 7 0q0 7 7 0"/>';
export const FACES = ['happy', 'peek', 'yawn', 'blink'];     // 偶爾出現的表情；平常是 sleep，雨天是 grumpy
export const CAT = `
<g class="cat-body">
<path class="c-shade" d="${BODYCAT}" transform="translate(5 3)"/>
<clipPath id="catclip"><path d="${BODYCAT}"/></clipPath>
<path class="c-cloth" d="${BODYCAT}"/>
<g clip-path="url(#catclip)" class="c-cat"><circle cx="-56" cy="-82" r="38"/><circle cx="-116" cy="-50" r="20"/></g>
</g>
<g transform="translate(-118 -10)"><g class="cat-wag"><path class="cat-tail" d="M0 0Q-32 16 6 20Q58 24 112 12"/><path class="cat-tip" d="M88 16Q100 14 112 12"/></g></g>
<g class="cat-head">
<g transform="translate(56 -86)"><path class="ear ear-l c-cloth" d="M-15 22L-6-18L20-5Z"/></g>
<g transform="translate(112 -86)"><path class="ear ear-r c-cat" d="M15 22L6-18L-20-5Z"/></g>
<clipPath id="headclip"><ellipse cx="84" cy="-50" rx="50" ry="42"/></clipPath>
<ellipse class="c-cloth" cx="84" cy="-50" rx="50" ry="42"/>
<g clip-path="url(#headclip)"><circle class="c-cat" cx="128" cy="-80" r="26"/></g>
<g transform="translate(44 -31)"><path class="whisk c-line thin" d="M0-3l-23-5M0 4l-23 4"/></g>
<g transform="translate(124 -31)"><path class="whisk whisk-r c-line thin" d="M0-3l23-5M0 4l23 4"/></g>
<g class="c-line">
${face('sleep', `<path d="M58-50q8 8 16 0M96-50q8 8 16 0"/>${MOUTH}`)}
${face('happy', `<path d="M58-46q8-10 16 0M96-46q8-10 16 0"/>${MOUTH}`)}
${face('peek', `<path d="M58-50q8 8 16 0"/><circle class="c-ink" cx="104" cy="-49" r="5"/>${MOUTH}`)}
${face('blink', `<circle class="c-ink" cx="66" cy="-49" r="5"/><circle class="c-ink" cx="104" cy="-49" r="5"/>${MOUTH}`)}
${face('yawn', `<path d="M59-54l13 5l-13 5M111-54l-13 5l13 5"/><ellipse class="c-yawn" cx="85" cy="-27" rx="7" ry="9"/>`)}
${face('grumpy', `<path d="M58-48h16M96-48h16M78-29q7-6 14 0"/>`)}
</g>
<path class="c-cat" d="M81-41h8l-4 5Z"/>
</g>`;

// 點綴的盆栽，原點在地面中央。每次開啟挑幾種
const POT = '<path class="c-shade" d="M-30-46L30-46L23 0L-23 0Z" transform="translate(4 0)"/><path class="c-pot" d="M-30-46L30-46L23 0L-23 0Z"/><rect class="c-pot" x="-34" y="-56" width="68" height="14" rx="4"/>';
const sway = html => `<g transform="translate(0 -52)"><g class="leaf">${html}</g></g>`;
const blossom = (x, y) => `<g transform="translate(${x} ${y})"><g class="c-cloth">${[0, 72, 144, 216, 288].map(r => `<circle cy="-11" r="10" transform="rotate(${r})"/>`).join('')}</g><circle class="c-peg" r="7"/></g>`;
export const PLANTS = [
  [[-34, 1], [-6, 1.25], [24, .9]].map(([r, k], i) => `<g transform="rotate(${r}) scale(${k})"><path class="leaf c-leaf${i % 2}" d="M0 0Q-46-70-8-150Q38-76 0 0Z"/></g>`).join(''),
  `${sway(`<path class="c-stem" d="M0 0Q-8-40-36-62M0 0V-84M0 0Q10-34 38-50"/><circle class="c-leaf0" cx="-38" cy="-66" r="24"/><circle class="c-leaf1" cx="0" cy="-92" r="27"/><circle class="c-leaf0" cx="40" cy="-54" r="21"/>`)}${POT}`,
  `${sway(`<path class="c-stem" d="M0 0Q-6-36-28-56M0 0V-78M0 0Q8-30 30-44"/><path class="c-leaf0" d="M0-20Q-26-30-30-12Q-12-6 0-20ZM0-34Q24-46 30-28Q12-20 0-34Z"/>${blossom(-28, -58)}${blossom(0, -82)}${blossom(30, -46)}`)}${POT}`,
  `${sway(`<path class="c-leaf1" d="M-20 0Q-34-70-22-118Q-4-70-4 0Z"/><path class="c-leaf0" d="M-8 0Q-10-90 4-146Q20-90 12 0Z"/><path class="c-leaf1" d="M6 0Q22-60 34-96Q36-50 24 0Z"/>`)}${POT}`,
  `${sway(`<path class="c-leaf0" d="M-22 0V-58Q-22-84 0-84Q22-84 22-58V0Z"/><path class="c-leaf1" d="M22-34H34Q44-34 44-46V-62Q44-70 37-70Q30-70 30-62V-48H22Z"/><path class="c-leaf1" d="M-22-20H-32Q-44-20-44-32V-44Q-44-52-37-52Q-30-52-30-44V-34H-22Z"/>${blossom(0, -90)}`)}${POT}`,
];

// 小鳥，原點在腳下（站在繩上）
const LEGS = '<path class="c-line thin" d="M-3-2v8M5-2v8"/>';
const EYE = (x, y) => `<circle class="c-ink" cx="${x}" cy="${y}" r="2.4"/>`;
/** 幾種小鳥，面向右。每次來訪隨機挑 */
export const BIRDS = [
  `<path fill="#FF48B0" d="M-20-16Q-18-34 0-34Q16-34 18-18Q18-4 2-2L-14-2L-34 4Z"/><path fill="#FFC629" d="M17-24l11 3-11 4Z"/>${EYE(7, -24)}${LEGS}`,
  `<path fill="#FFC629" d="M-30-14L-16-20L-14-8Z"/><circle fill="#FFC629" cx="0" cy="-20" r="18"/><path fill="#fbf7ec" d="M-12-8Q0 2 13-9Q8-20-4-18Z"/><path fill="#FF6B35" d="M16-24l11 3-11 4Z"/><path fill="#FF6B35" d="M-2-37l4-9 4 9Z"/>${EYE(8, -25)}${LEGS}`,
  `<path fill="#FF6B35" d="M-14-10L-44 22L-34 24L-6-2Z"/><path fill="#FF6B35" d="M-18-18Q-14-36 4-36Q18-34 18-20Q16-4 0-2L-12-2Z"/><path fill="#fbf7ec" d="M-10-6Q2 0 14-12Q6-14-2-10Z"/><path fill="#24221f" d="M17-27l12 3-12 4Z"/>${EYE(8, -27)}${LEGS}`,
  `<path fill="#fbf7ec" d="M-22-14Q-20-32-2-34Q8-44 18-34Q24-24 16-14Q12-2 0-2L-16-2L-36 2Z"/><path fill="#d9d4c6" d="M-18-12Q-4-22 6-10Q-6-2-18-6Z"/><path fill="#FF48B0" d="M21-30l10 3-10 4Z"/>${EYE(13, -31)}${LEGS}`,
  `<circle fill="#2E9E6B" cx="-2" cy="-16" r="15"/><circle fill="#2E9E6B" cx="10" cy="-30" r="11"/><path fill="#2E9E6B" d="M-14-10L-34-4L-14-22Z"/><path fill="#FFC629" d="M-14-12Q-2-22 8-12Q-2-2-12-6Z"/><path fill="#FF6B35" d="M19-33l11 3-11 4Z"/>${EYE(13, -32)}${LEGS}`,
];

// 蝴蝶：兩片翅膀各自拍動。原點在身體中心
const WINGS = ['#FF48B0', '#FFC629', '#FF6B35', '#fbf7ec'];
export const butterfly = () => { const c = WINGS[Math.floor(Math.random() * WINGS.length)]; return `<g class="wing"><path fill="${c}" d="M0 0Q-6-22-22-20Q-30-8-16 0Q-26 10-14 16Q-2 14 0 0Z"/></g><g class="wing wing-r"><path fill="${c}" d="M0 0Q6-22 22-20Q30-8 16 0Q26 10 14 16Q2 14 0 0Z"/></g><path class="c-line thin" d="M0-9V9M0-9l-4-6M0-9l4-6"/>`; };
// 螢火蟲：一圈光暈加一個亮點
export const FIREFLY = '<circle class="glow" r="9"/><circle class="spark" r="3"/>';
