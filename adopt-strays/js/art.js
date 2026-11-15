/* 場景與角色的 SVG。三色油墨（粉紅、藍、黃）＋墨黑＋紙白，全部是手寫的幾何圖形。 */
import { I } from './icons.js';
export const INK = { pink: '#FF48B0', blue: '#0078BF', yellow: '#FFE800', ink: '#24221F', paper: '#FBFAF6' };
const C3 = [INK.pink, INK.blue, INK.yellow];

/* 卡片配色：底色、錯版色、印章色、底色上的文字色 */
export const COMBOS = [
  { a: INK.blue, b: INK.yellow, s: INK.pink, on: '#FBFAF6' },
  { a: INK.yellow, b: INK.pink, s: INK.blue, on: '#24221F' },
  { a: INK.pink, b: INK.yellow, s: INK.blue, on: '#24221F' },
  { a: '#E9E4D8', b: INK.blue, s: INK.pink, on: '#24221F' },
];
export const combo = id => COMBOS[Math.abs(id | 0) % COMBOS.length];

const capG = (x, y, r, rot, c, cls = '') =>
  `<g transform="translate(${x} ${y}) rotate(${rot})"><g class="capj ${cls}"><path d="M${-r} 0A${r} ${r} 0 0 1 ${r} 0Z" fill="${c}"/><path d="M${-r} 0A${r} ${r} 0 0 0 ${r} 0Z" fill="#E6E0D3"/></g></g>`;

/* 轉蛋機：有耳朵的桌上型機器 */
export function machineSVG() {
  const caps = [
    [48, 184, -20, 0], [86, 186, 35, 1], [124, 184, -60, 2], [160, 186, 15, 0], [194, 182, 80, 1],
    [66, 154, 50, 2], [104, 156, -15, 0], [142, 154, 110, 1], [178, 152, -40, 2],
    [88, 125, 20, 1], [126, 127, -75, 2], [162, 123, 40, 0],
  ].map(([x, y, r, c], i) => capG(x, y, 18, r, C3[c], i === 9 || i === 11 ? 'bob' : '')).join('');
  return `<svg class="mc" viewBox="0 0 240 356" aria-hidden="true">
  <defs><clipPath id="mcGlass"><rect x="26" y="52" width="188" height="152" rx="28"/></clipPath></defs>
  <path d="M56 42 L73 8 L100 34Z" fill="${INK.blue}"/><path d="M184 42 L167 8 L140 34Z" fill="${INK.blue}"/>
  <rect x="36" y="28" width="168" height="32" rx="16" fill="${INK.blue}"/>
  <rect x="26" y="52" width="188" height="152" rx="28" fill="${INK.paper}"/>
  <g clip-path="url(#mcGlass)">${caps}<path d="M40 60H66L44 122H40Z" fill="#fff" opacity=".75"/></g>
  <rect x="25" y="199" width="200" height="142" rx="20" fill="${INK.yellow}"/>
  <rect x="18" y="194" width="200" height="142" rx="20" fill="${INK.pink}"/>
  <rect x="36" y="212" width="52" height="20" rx="10" fill="${INK.ink}"/>
  <circle cx="48" cy="222" r="4" fill="${INK.yellow}"/><circle cx="62" cy="222" r="4" fill="${INK.blue}"/><circle cx="76" cy="222" r="4" fill="${INK.paper}"/>
  <rect x="180" y="212" width="8" height="26" rx="4" fill="${INK.ink}"/>
  <circle cx="118" cy="254" r="36" fill="${INK.paper}"/>
  <g class="mc-knob"><circle cx="118" cy="254" r="27" fill="${INK.yellow}"/><rect x="90" y="247" width="56" height="14" rx="7" fill="${INK.ink}"/></g>
  <path class="mc-chute" d="M84 336V312a12 12 0 0 1 12-12h44a12 12 0 0 1 12 12v24Z" fill="${INK.ink}"/>
  <rect x="34" y="336" width="38" height="16" rx="4" fill="${INK.ink}"/><rect x="164" y="336" width="38" height="16" rx="4" fill="${INK.ink}"/>
</svg>`;
}

/* 相遇所店員「阿糰」：原創角色。黃色的圓滾滾小生物，頭上長了一株藍色的芽，圍粉紅圍裙。
   五官偏高且靠近的小圓點眼睛；會眨眼、說話、開心（^ ^）、發呆（— —）、驚訝（圓眼）。 */
export function npcSVG(kind = 'full') {
  const vb = kind === 'head' ? '10 4 100 106' : '0 0 120 150';
  return `<svg class="npc npc--${kind}" viewBox="${vb}" aria-hidden="true">
  <g class="npc-body">
    <path d="M20 150C20 118 38 104 60 104C82 104 100 118 100 150Z" fill="${INK.yellow}"/>
    <path d="M34 150V124Q60 136 86 124V150Z" fill="${INK.pink}"/>
    <rect x="51" y="134" width="18" height="12" rx="2" fill="${INK.paper}"/>
    <path d="M42 109Q60 122 78 109" fill="none" stroke="${INK.blue}" stroke-width="6" stroke-linecap="round"/>
  </g>
  <g class="npc-head">
    <circle cx="29" cy="36" r="12" fill="${INK.yellow}"/><circle cx="91" cy="36" r="12" fill="${INK.yellow}"/>
    <circle cx="29" cy="37" r="5.500" fill="${INK.pink}"/><circle cx="91" cy="37" r="5.500" fill="${INK.pink}"/>
    <path d="M17 68C17 43 35 29 60 29C85 29 103 43 103 68C103 92 87 104 60 104C33 104 17 92 17 68Z" fill="${INK.yellow}"/>
    <g class="npc-sprout"><path d="M60 30Q59 17 49 12Q61 7 64 20Z" fill="${INK.blue}"/><path d="M61 30Q63 20 74 17Q73 28 63 30Z" fill="${INK.blue}"/></g>
    <circle cx="39" cy="73" r="6.500" fill="${INK.pink}" opacity=".5"/><circle cx="81" cy="73" r="6.500" fill="${INK.pink}" opacity=".5"/>
    <g class="npc-eyes"><circle cx="50" cy="61" r="2.800" fill="${INK.ink}"/><circle cx="70" cy="61" r="2.800" fill="${INK.ink}"/></g>
    <g class="npc-happy" fill="none" stroke="${INK.ink}" stroke-width="2.400" stroke-linecap="round"><path d="M46 63Q50 57.500 54 63"/><path d="M66 63Q70 57.500 74 63"/></g>
    <g class="npc-daze" fill="none" stroke="${INK.ink}" stroke-width="2.400" stroke-linecap="round"><path d="M46 61.500H54"/><path d="M66 61.500H74"/></g>
    <g class="npc-wow"><circle cx="50" cy="61" r="4.200" fill="${INK.ink}"/><circle cx="70" cy="61" r="4.200" fill="${INK.ink}"/></g>
    <path class="npc-mouth-c" d="M55 73Q60 78 65 73" fill="none" stroke="${INK.ink}" stroke-width="2.400" stroke-linecap="round"/>
    <path class="npc-mouth-o" d="M54.500 72Q60 84 65.500 72Z" fill="${INK.ink}"/>
  </g>
</svg>`;
}

/* 動物圖鑑：立著的藍色書，封面是一張黃色的臉 */
export const bookSVG = () => `<svg viewBox="0 0 60 84" aria-hidden="true">
  <rect x="3" y="3" width="57" height="81" rx="3" fill="${INK.yellow}"/>
  <rect x="0" y="0" width="56" height="81" rx="3" fill="${INK.blue}"/>
  <rect x="0" y="0" width="9" height="81" rx="3" fill="#005f99"/>
  <path d="M19 28L22 16L30 23Q33 22 36 23L44 16L47 28V37Q47 48 33 48Q19 48 19 37Z" fill="${INK.yellow}"/>
  <circle cx="28" cy="34" r="1.800" fill="${INK.ink}"/><circle cx="38" cy="34" r="1.800" fill="${INK.ink}"/>
  <rect x="18" y="58" width="30" height="5" rx="2.500" fill="${INK.paper}"/><rect x="18" y="67" width="18" height="5" rx="2.500" fill="${INK.paper}" opacity=".6"/>
  <path d="M44 0H52V20L48 16L44 20Z" fill="${INK.pink}"/>
</svg>`;

/* 我的相遇紀錄：粉紅小冊子，封面蓋了一顆章 */
export const albumSVG = () => `<svg viewBox="0 0 56 70" aria-hidden="true">
  <rect x="4" y="4" width="52" height="66" rx="3" fill="${INK.blue}"/>
  <rect x="0" y="0" width="52" height="66" rx="3" fill="${INK.pink}"/>
  <rect x="9" y="14" width="34" height="38" rx="2" fill="${INK.paper}"/>
  <circle cx="26" cy="33" r="11" fill="none" stroke="${INK.blue}" stroke-width="2"/>
  <path transform="translate(18 25) scale(.667)" d="${I.paw}" fill="${INK.blue}"/>
  <circle cx="6" cy="12" r="1.800" fill="${INK.ink}"/><circle cx="6" cy="33" r="1.800" fill="${INK.ink}"/><circle cx="6" cy="54" r="1.800" fill="${INK.ink}"/>
</svg>`;

/* 盆栽：藍葉與黃葉疊印出綠色 */
export const plantSVG = () => `<svg viewBox="0 0 90 140" aria-hidden="true">
  <g class="leaves" style="mix-blend-mode:multiply">
    <path d="M45 96C20 84 14 50 30 22C52 40 56 74 45 96Z" fill="${INK.blue}"/>
    <path d="M45 96C40 66 54 40 78 30C84 58 70 86 45 96Z" fill="${INK.yellow}"/>
    <path d="M45 96C36 80 40 56 50 40C62 58 58 82 45 96Z" fill="${INK.yellow}"/>
  </g>
  <path d="M22 96H68L62 140H28Z" fill="${INK.pink}"/><rect x="18" y="90" width="54" height="12" rx="3" fill="${INK.ink}"/>
</svg>`;

/* 轉蛋：上半彩色、下半紙白 */
export const capsuleSVG = c => `<svg viewBox="0 0 100 100" aria-hidden="true">
  <g class="cap-bot"><path d="M4 50A46 46 0 0 0 96 50Z" fill="${INK.paper}"/><path d="M4 50A46 46 0 0 0 96 50Z" fill="none" stroke="rgba(36,34,31,.12)"/></g>
  <g class="cap-top"><path d="M4 50A46 46 0 0 1 96 50Z" fill="${c}"/><path d="M22 34A30 30 0 0 1 40 16" fill="none" stroke="#fff" stroke-width="5" stroke-linecap="round" opacity=".7"/></g>
</svg>`;

/* 沒有照片時的替代插圖：只表示「種類」，不代表牠的長相 */
export function placeholderSVG(a) {
  const k = combo(a.id + 1), body = k.a === '#E9E4D8' ? INK.blue : k.a, d = INK.ink;
  const face = `<circle cx="84" cy="104" r="5" fill="${d}"/><circle cx="116" cy="104" r="5" fill="${d}"/>`;
  const shapes = a.kind === 'dog'
    ? `<path d="M52 62Q30 70 34 120Q52 126 62 96Z" fill="${d}"/><path d="M148 62Q170 70 166 120Q148 126 138 96Z" fill="${d}"/>
       <path d="M50 100Q50 52 100 52Q150 52 150 100V200H50Z" fill="${body}"/>${face}
       <ellipse cx="100" cy="132" rx="24" ry="18" fill="${INK.paper}"/><ellipse cx="100" cy="124" rx="8" ry="6" fill="${d}"/>`
    : a.kind === 'cat'
      ? `<path d="M48 110V34L84 62Q100 58 116 62L152 34V110V200H48Z" fill="${body}"/>${face}
         <path d="M94 120H106L100 127Z" fill="${d}"/><path d="M60 122H80M60 132H80M120 122H140M120 132H140" stroke="${d}" stroke-width="3" stroke-linecap="round"/>`
      : `<path d="M50 200V110Q50 58 100 58Q150 58 150 110V200Z" fill="${body}"/><circle cx="62" cy="62" r="16" fill="${body}"/><circle cx="138" cy="62" r="16" fill="${body}"/>${face}
         <path d="M92 122Q100 130 108 122" fill="none" stroke="${d}" stroke-width="4" stroke-linecap="round"/>`;
  return `<svg class="ph-art" viewBox="0 0 200 200" preserveAspectRatio="xMidYMax meet" aria-hidden="true">${shapes}</svg>`;
}

/* 相遇章：圓章＋腳印＋日期 */
export function stampSVG(dateStr) {
  const id = 'sp' + Math.random().toString(36).slice(2, 8);
  return `<svg class="stamp-art" viewBox="0 0 100 100" aria-hidden="true">
  <circle cx="50" cy="50" r="46" fill="none" stroke="currentColor" stroke-width="3.500"/>
  <circle cx="50" cy="50" r="38" fill="none" stroke="currentColor" stroke-width="1.200"/>
  <path transform="translate(31 20) scale(1.580)" d="${I.paw}" fill="currentColor"/>
  <path id="${id}" d="M20 56A30 30 0 0 0 80 56" fill="none"/>
  <text font-size="11" font-weight="700" letter-spacing="1.500" fill="currentColor" text-anchor="middle"><textPath href="#${id}" startOffset="50%">${dateStr}</textPath></text>
</svg>`;
}

/* 空的轉蛋殼：沒有結果時用 */
export const emptySVG = () => `<svg viewBox="0 0 120 80" aria-hidden="true">
  <path d="M10 44A30 30 0 0 0 70 44Z" fill="${INK.paper}"/><path d="M56 30A30 30 0 0 1 112 52Z" fill="${INK.blue}" transform="rotate(18 84 40)"/>
  <circle cx="40" cy="30" r="3" fill="${INK.pink}"/><circle cx="52" cy="18" r="2" fill="${INK.yellow}"/>
</svg>`;
