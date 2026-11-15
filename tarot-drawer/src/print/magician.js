// I 魔術師：歐洲寓言木刻。
// 站在工作桌後，右手（觀者左）舉杖向天、左手（觀者右）指地；頭上橫向無限符號，腰繫銜尾蛇；
// 紅外袍、白內衣；桌上四器：權杖、聖杯、寶劍、錢幣；上方玫瑰花架，下方玫瑰與百合。
// 色版：淡金（天空、金器、膚色）、朱紅（外袍、玫瑰）、苔綠（葉、蛇、劍刃）、墨褐
// 遮擋次序：天空 → 花架 → 無限符號 → 頭髮 → 外袍 → 內衣 → 腰帶 → 指地手臂 → 舉杖手臂 → 頸 → 頭 → 杖與拳
//           → 桌 → 桌上四器 → 前景花
import { SOLID, CUT, tint, line, cutLine, g255, plateSVG, INKS } from './press.js';
import { printFrame } from './frame.js';

export const MAGICIAN_INKS = {
  Y: { rgb: [238, 192, 98], angle: 8, strength: .94 },
  O: { rgb: [204, 62, 46], angle: 68, strength: .95 },
  B: { rgb: [94, 132, 88], angle: 22, strength: .95 },
  N: { rgb: [44, 32, 38], angle: 45, strength: .97 },
  FO: INKS.O,
  FN: { ...INKS.N, fixedRegistration: true },
};
// 臉、拳、指地的手、錢幣：減少飛白（牌面座標）
export const MAGICIAN_QUIET = [{ x: 150, y: 140, rx: 18, ry: 22 }, { x: 106, y: 124, rx: 12, ry: 12 }, { x: 200, y: 240, rx: 14, ry: 20 }, { x: 232, y: 274, rx: 26, ry: 14 }];

const p = (d, a) => `<path d="${d}" ${a}/>`;
const c = (x, y, r, a) => `<circle cx="${x}" cy="${y}" r="${r}" ${a}/>`;
const hatch = (x, y, dx, dy, n, stepX, stepY) => Array.from({ length: n }, (_, i) => `M${x + i * stepX} ${y + i * stepY}l${dx} ${dy}`).join('');

// ---- 上方玫瑰花架 ----
const ARBOR_ROSES = [[18, 14], [58, 20], [98, 12], [150, 12], [190, 20], [230, 14]];
const ARBOR_LEAVES = [[38, 10, -60], [40, 26, 30], [78, 8, 60], [80, 26, -20], [120, 6, -80], [128, 24, 70], [170, 8, 50], [168, 28, -30], [210, 10, -50], [212, 28, 20], [6, 30, 40], [244, 30, -40]];
// ---- 前景花：玫瑰與百合 ----
const GARDEN_ROSES = [[30, 292], [104, 300], [168, 296], [226, 290]];
const LILIES = [[64, 300], [136, 306], [200, 304]];
const GARDEN_LEAVES = [[18, 312, -40], [44, 316, 30], [82, 318, -30], [92, 322, 40], [120, 324, -40], [154, 320, 30], [182, 322, -30], [214, 316, 40], [238, 318, -30], [56, 330, 60], [146, 334, -60], [220, 334, 50]];
const LEAF = 'M0 0C-5-4-5-12 0-16C5-12 5-4 0 0Z';
const leafAt = ([x, y, r], a) => `<g transform="translate(${x} ${y}) rotate(${r})">${p(LEAF, a)}</g>`;
const veinAt = ([x, y, r], a) => `<g transform="translate(${x} ${y}) rotate(${r})">${p('M0-1V-13', a)}</g>`;
const ROSE = 'M0-8Q5-9 7-4Q10 1 6 5Q2 9-3 7Q-8 5-7 0Q-7-6 0-8Z';
const roseAt = ([x, y], a) => `<g transform="translate(${x} ${y})">${p(ROSE, a)}</g>`;
const roseInner = ([x, y], a) => `<g transform="translate(${x} ${y})">${p('M-4 0C-4-4 3-5 4-1C4 2 0 3-1 1C-1 0 0-1 1 0M-6 3C-3 6 3 6 6 2', a)}</g>`;
// 百合：三片尖瓣朝上外翻
const LILY = 'M0 0C-8-2-12-10-10-16C-6-12-4-8-2-6C-3-12-2-18 0-22C2-18 3-12 2-6C4-8 6-12 10-16C12-10 8-2 0 0Z';
const lilyAt = ([x, y], a) => `<g data-symbol="lily" transform="translate(${x} ${y})">${p(LILY, a)}</g>`;
const lilyInner = ([x, y], a) => `<g transform="translate(${x} ${y})">${p('M0-3V-16M-2-5L-6-12M2-5L6-12', a)}</g>`;
const STEMS = [...GARDEN_ROSES.map(([x, y]) => `M${x} ${y + 6}V346`), ...LILIES.map(([x, y]) => `M${x} ${y}V346`)].join('');

// ---- 人物（正面）----
const INFINITY = 'M124 44C118 36 106 36 106 44C106 52 118 52 124 44C130 36 142 36 142 44C142 52 130 52 124 44Z';
const HAIR = 'M108 78C106 65 114 57 124 57C134 57 142 65 140 78L143 106C138 108 133 105 131 99L117 99C115 105 110 108 105 106Z';
const ROBE = 'M104 109C92 111 84 119 82 131L72 246L176 246L166 131C164 119 156 111 144 109Z';
const TUNIC = 'M107 111C115 107 133 107 141 111L145 176L150 246L98 246L103 176Z';
const BELT = 'M101 171C114 175 134 175 147 171L148 180C134 184 114 184 100 180Z';
const SLEEVE_R = 'M106 112C97 112 91 117 89 125L74 77C76 71 84 69 88 73L102 105Z';   // 舉杖的手臂（觀者左）
const SLEEVE_L = 'M142 112C150 112 156 117 158 125L178 163L168 169L147 141Z';         // 指地的手臂（觀者右）
const CAPE_L = 'M107 109C96 108 88 112 84 120C83 126 86 130 92 131C98 131 103 127 106 122L109 112Z';   // 披肩：蓋住兩肩，手臂從底下伸出
const CAPE_R = 'M141 109C152 108 160 112 164 120C165 126 162 130 156 131C150 131 145 127 142 122L139 112Z';
const NECK = 'M118 97L130 97L131 110L117 110Z';
const HEAD = 'M111 80C111 70 117 64 124 64C131 64 137 70 137 80C137 92 132 100 124 100C116 100 111 92 111 80Z';
const HEADBAND = 'M111 73C118 70 130 70 137 73L137 78C130 75 118 75 111 78Z';
const FIST = 'M72 62C72 58 76 56 80 56L86 57C89 58 90 62 89 66L88 73C86 76 80 77 76 75L73 72C71 69 71 65 72 62Z';
const POINT_HAND = 'M160 169C159 174 160 179 162 182L165.5 182L165.5 195C165.5 197.5 169 197.5 169 195L169.5 183C171.5 180 172 174 170 169Z';
const WAND_UP = 'M74.5 30L79 30L83 98L78.5 98Z';
const WAND_UP_ENDS = [[76.8, 28, 3.6], [80.8, 100, 3.6]];

// ---- 桌與四器 ----
const TABLE_TOP = 'M16 200L232 200L240 240L8 240Z';
const TABLE_FRONT = 'M8 240L240 240L240 268L8 268Z';
const WAND = 'M24 227L63 219L64 223L25 231Z';
const WAND_ENDS = [[23, 229.5, 3], [65, 221, 3]];
const CUP_BOWL = 'M76 196H100C100 208 94 214 88 214C82 214 76 208 76 196Z';
const CUP_STEM = 'M86 213H90V226H86Z';
const CUP_FOOT = 'M80 225H96L99 232H77Z';
const CUP_RIM = 'M76 196C76 194 82 193 88 193C94 193 100 194 100 196C100 198 94 199 88 199C82 199 76 198 76 196Z';
const SWORD_BLADE = 'M120 224L180 221L184 223.5L180 226L120 229Z';
const SWORD_GUARD = 'M115 218L120 218L120 235L115 235Z';
const SWORD_GRIP = 'M106 224.5L115 224.5L115 228.5L106 228.5Z';
const SWORD_POMMEL = [103.5, 226.5, 3];
const COIN = { x: 206, y: 223, rx: 19, ry: 9.5 };
function pentagram(cx, cy, rx, ry) {
  const pts = [];
  for (let k = 0; k < 5; k++) {
    const t = (-90 + k * 144) * Math.PI / 180;
    pts.push(`${(cx + rx * Math.cos(t)).toFixed(1)} ${(cy + ry * Math.sin(t)).toFixed(1)}`);
  }
  return `M${pts.join('L')}Z`;
}
const STAR = pentagram(COIN.x, COIN.y, 13, 6.5);
const coin = a => at(TK, `<g data-symbol="pentacle"><ellipse cx="${COIN.x}" cy="${COIN.y}" rx="${COIN.rx}" ry="${COIN.ry}" ${a}/></g>`);
const coinEdge = a => at(TK, `<path d="M${COIN.x - COIN.rx} ${COIN.y}V${COIN.y + 4}A${COIN.rx} ${COIN.ry} 0 0 0 ${COIN.x + COIN.rx} ${COIN.y + 4}V${COIN.y}Z" ${a}/>`);

const TW = 'translate(40 226) scale(1.3) translate(-40 -226)';
const TC = 'translate(88 234) scale(1.4) translate(-88 -232)';
const TS = 'translate(156 234) scale(1.2) translate(-150 -226)';
const TK = 'translate(206 214) scale(1.35) translate(-206 -223)';
const PH = 'translate(172.5 166.5) scale(1.35) translate(-165 -169)';   // 指地的手：放大並垂在袍外
const at = (t, inner) => `<g transform="${t}">${inner}</g>`;
const wandUp = a => p(WAND_UP, a) + WAND_UP_ENDS.map(([x, y, r]) => c(x, y, r, a)).join('');
const wand = a => at(TW, `<g data-symbol="wand">${p(WAND, a) + WAND_ENDS.map(([x, y, r]) => c(x, y, r, a)).join('')}</g>`);
const cup = a => at(TC, `<g data-symbol="cup">${p(CUP_FOOT, a) + p(CUP_STEM, a) + p(CUP_BOWL, a) + p(CUP_RIM, a)}</g>`);
const sword = a => at(TS, `<g data-symbol="sword">${p(SWORD_BLADE, a) + p(SWORD_GRIP, a) + c(...SWORD_POMMEL, a) + p(SWORD_GUARD, a)}</g>`);
const tools = a => wand(a) + coinEdge(a) + coin(a) + cup(a) + sword(a);
const table = a => p(TABLE_TOP, a) + p(TABLE_FRONT, a);
const figure = a => p(HAIR, a) + p(ROBE, a) + p(SLEEVE_L, a) + p(SLEEVE_R, a) + p(CAPE_L, a) + p(CAPE_R, a) + p(NECK, a) + p(HEAD, a) + at(PH, p(POINT_HAND, a)) + wandUp(a) + p(FIST, a);
const arbor = a => ARBOR_LEAVES.map(l => leafAt(l, a)).join('') + ARBOR_ROSES.map(r => roseAt(r, a)).join('');
const garden = a => GARDEN_LEAVES.map(l => leafAt(l, a)).join('') + GARDEN_ROSES.map(r => roseAt(r, a)).join('') + LILIES.map(l => lilyAt(l, a)).join('');

export function magicianPlates(card) {
  const fr = printFrame(card);

  // ---- 淡金：天空、金器、膚色、百合花心、桌面木色 ----
  const Y = plateSVG({
    defs: `<linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop stop-color="${g255(.72)}"/><stop offset="1" stop-color="${g255(.4)}"/></linearGradient>`,
    art:
      '<rect x="-3" y="-3" width="254" height="270" fill="url(#sky)"/>' +
      `<rect x="-3" y="266" width="254" height="82" ${tint(.32)}/>` + arbor(CUT) + figure(CUT) + table(CUT) + tools(CUT) + garden(CUT) + p(STEMS, cutLine(3)) +
      p(HEAD, tint(.3)) + p(NECK, tint(.3)) + p(FIST, tint(.3)) + at(PH, p(POINT_HAND, tint(.3))) + p(HAIR, tint(.7)) +
      p(TABLE_TOP, tint(.55)) + p(TABLE_FRONT, tint(.4)) +
      cup(SOLID) + coinEdge(SOLID) + coin(SOLID) + at(TS, p(SWORD_GUARD, SOLID) + c(...SWORD_POMMEL, SOLID) + p(SWORD_GRIP, tint(.6))) + p(BELT, tint(.4)) +
      LILIES.map(([x, y]) => c(x, y - 4, 2.5, SOLID)).join(''),
  });

  // ---- 朱紅：外袍、玫瑰、桌子暖色、膚色的紅 ----
  const O = plateSVG({
    art:
      arbor(CUT) + ARBOR_ROSES.map(r => roseAt(r, SOLID)).join('') +
      figure(CUT) + p(ROBE, SOLID) + p(TUNIC, CUT) + p(SLEEVE_L, CUT) + at(PH, p(POINT_HAND, CUT)) + p(SLEEVE_R, CUT) + p(FIST, CUT) + p(CAPE_L, SOLID) + p(CAPE_R, SOLID) + p(HAIR, tint(.42)) +
      p(HEAD, tint(.16)) + p(FIST, tint(.2)) + at(PH, p(POINT_HAND, tint(.2))) +
      `<circle cx="117" cy="88" r="3" ${tint(.35)}/><circle cx="131" cy="88" r="3" ${tint(.35)}/>` +
      table(CUT) + p(TABLE_FRONT, tint(.32)) + p(TABLE_TOP, tint(.18)) + tools(CUT) + at(TS, p(SWORD_GRIP, tint(.55))) +
      garden(CUT) + p(STEMS, cutLine(3)) + GARDEN_ROSES.map(r => roseAt(r, SOLID)).join(''),
  });

  // ---- 苔綠：葉、蛇腰帶、劍刃、花莖 ----
  const B = plateSVG({
    art:
      `<rect x="-3" y="266" width="254" height="82" ${tint(.28)}/>` +
      arbor(CUT) + ARBOR_LEAVES.map(l => leafAt(l, SOLID)).join('') +
      figure(CUT) + p(BELT, SOLID) +
      table(CUT) + tools(CUT) + at(TS, p(SWORD_BLADE, tint(.3))) +
      p(STEMS, line(2.4)) + garden(CUT) + GARDEN_LEAVES.map(l => leafAt(l, SOLID)).join(''),
  });

  // ---- 墨：由後往前，每一層先挖空再描露出來的輪廓 ----
  const N = plateSVG({
    defs:
      `<clipPath id="cRobe"><path d="${ROBE}"/></clipPath><clipPath id="cTunic"><path d="${TUNIC}"/></clipPath>` +
      `<clipPath id="cHair"><path d="${HAIR}"/></clipPath><clipPath id="cHead"><path d="${HEAD}"/></clipPath>` +
      `<clipPath id="cSleeveL"><path d="${SLEEVE_L}"/></clipPath><clipPath id="cSleeveR"><path d="${SLEEVE_R}"/></clipPath>` +
      `<clipPath id="cFront"><path d="${TABLE_FRONT}"/></clipPath><clipPath id="cTop"><path d="${TABLE_TOP}"/></clipPath>` +
      `<clipPath id="cBowl"><path d="${CUP_BOWL}"/></clipPath>`,
    art:
      // 花架
      ARBOR_LEAVES.map(l => leafAt(l, CUT) + leafAt(l, line(1.4)) + veinAt(l, line(.9))).join('') +
      ARBOR_ROSES.map(r => roseAt(r, CUT) + roseAt(r, line(1.6)) + roseInner(r, line(1))).join('') +
      p('M-4 22C30 16 60 28 98 18C130 10 170 28 252 20', line(1.3)) +
      // 無限符號
      `<g data-symbol="infinity">${p(INFINITY, line(2.4))}</g>` +
      // 頭髮（在頭與外袍後面）
      p(HAIR, CUT) + `<g clip-path="url(#cHair)">${p('M130 60L146 60L146 110L130 110Z', tint(.5)) + p(hatch(108, 82, 3, 22, 6, 1, 0) + hatch(132, 82, 3, 22, 6, 1.4, 0), line(.9))}</g>` + p(HAIR, line(2)) +
      // 外袍：右半背光、褶線
      p(ROBE, CUT) +
      `<g clip-path="url(#cRobe)">${p('M146 110L180 110L180 250L148 250Z', tint(.48)) + p(hatch(150, 128, 5, 18, 8, 3.2, 0) + hatch(150, 170, 6, 22, 8, 3.2, 0) + hatch(152, 210, 6, 24, 7, 3.4, 0), line(1))}</g>` +
      p(ROBE, line(2.5)) + p('M92 150L84 240M100 128L94 200M156 150L164 240', line(1.4)) +
      // 內衣：右側淡淡的背光
      p(TUNIC, CUT) +
      `<g clip-path="url(#cTunic)">${p('M128 108L152 108L152 250L132 250Z', tint(.32)) + p(hatch(134, 186, 4, 20, 5, 3, 0), line(.9))}</g>` +
      p(TUNIC, line(2.2)) + p('M114 186L110 244M124 186V244M134 186L138 244M118 112L124 124L130 112', line(1.2)) +
      // 銜尾蛇腰帶：鱗紋，蛇頭在中央咬住尾巴
      `<g data-symbol="ouroboros">${p(BELT, CUT) + p(BELT, line(1.8)) + p(hatch(104, 173, 2, 8, 12, 3.6, .2), line(.8)) +
        p('M121 174C125 172 131 173 133 176C131 180 125 181 121 179Z', CUT) + p('M121 174C125 172 131 173 133 176C131 180 125 181 121 179Z', line(1.5)) +
        c(129.5, 175.5, .9, SOLID) + p('M120 177L115 177L113 175M115 177L113 179', line(1.1))}</g>` +
      // 指地的手臂（在袍前，肩頭藏在披肩底下）
      p(SLEEVE_L, CUT) + `<g clip-path="url(#cSleeveL)">${p('M152 112L184 112L184 180L162 180Z', tint(.36)) + p(hatch(154, 126, 9, 4, 8, 0, 6), line(.9))}</g>` +
      p('M142 112C150 112 156 117 158 125L178 163M168 169L147 141', line(2.1)) + p('M167 165L179 160', line(1.6)) +
      // 舉杖的手臂（從披肩底下往上伸）
      p(SLEEVE_R, CUT) + `<g clip-path="url(#cSleeveR)">${p('M90 76L104 108L102 120L88 126Z', tint(.3)) + p(hatch(84, 92, 8, -3, 6, 1.6, 6), line(.85))}</g>` +
      p('M106 112C97 112 91 117 89 125L74 77M88 73L102 105', line(2.1)) + p('M75 80L88 76', line(1.6)) +
      // 披肩：蓋住肩頭與手臂根部；右肩背光
      p(CAPE_L, CUT) + p(CAPE_L, line(2.2)) + p('M92 118C94 122 97 125 100 126', line(1.1)) +
      p(CAPE_R, CUT) + `<clipPath id="cCapeR"><path d="${CAPE_R}"/></clipPath><g clip-path="url(#cCapeR)">${p('M150 108L168 108L168 132L150 132Z', tint(.45)) + p(hatch(150, 112, 6, 14, 5, 3.4, 0), line(.9))}</g>` +
      p(CAPE_R, line(2.2)) + p('M156 118C154 122 151 125 148 126', line(1.1)) +
      // 頸、頭
      p(NECK, CUT) + p('M126 99L131 99L131 110L127 110Z', tint(.4)) + p('M118 98L117 110M130 98L131 110', line(1.6)) +
      p(HEAD, CUT) + `<g clip-path="url(#cHead)">${p('M128 62L140 62L140 102L130 102Z', tint(.3))}</g>` + p(HEAD, line(2.1)) +
      p(HEADBAND, CUT) + p(HEADBAND, line(1.4)) +
      p('M115 80.5Q118.5 78.5 122 80.5M126 80.5Q129.5 78.5 133 80.5', line(1.7)) + p('M117 84h3M128 84h3', line(1.6)) +
      p('M124 82C125 86 126 89 124 91C123 91 122 90.5 121.5 90', line(1.2)) + p('M120 94.5Q124 96.5 128 94.5', line(1.3)) +
      // 指地的手：食指伸直指向地面
      at(PH, p(POINT_HAND, CUT)) + at(PH, p(POINT_HAND, line(1.6))) +
      at(PH, p('M161.5 176H170.5M162 179.5C164 181.5 167 181.5 169.5 180', line(.75)) + p('M160.5 172C157.5 175 157.5 179 160.5 181', line(1)) + p('M165.5 186H169', line(.6))) +
      // 舉起的杖（白色、兩端圓頭）與握杖的拳
      wandUp(CUT) + p(WAND_UP, line(1.7)) + WAND_UP_ENDS.map(([x, y, r]) => c(x, y, r, line(1.6))).join('') +
      p(FIST, CUT) + p(FIST, line(1.6)) +
      p('M72.5 61.5H85M72 65.5H85.5M72.5 69.5H85', line(.9)) + p('M86 58C90 58 91 62 88.5 64.5L83 65.5', line(1.3)) +
      // 桌：桌面木紋、前板暗面
      table(CUT) +
      `<g clip-path="url(#cTop)">${p(hatch(14, 206, 214, 0, 7, 0, 5), line(.7))}</g>` +
      `<g clip-path="url(#cFront)">${p('M8 240H240V251H8Z', tint(.55)) + p(hatch(10, 242, -2, 26, 58, 4.2, 0), line(1))}</g>` +
      p(TABLE_TOP, line(2.3)) + p(TABLE_FRONT, line(2.4)) +
      // 權杖（平放）
      wand(CUT) + at(TW, p(WAND, line(1.3)) + WAND_ENDS.map(([x, y, r]) => c(x, y, r, line(1.2))).join('') + p('M28 228L60 221.5', line(.7))) +
      // 錢幣：厚度側面背光、五芒星（在杯與劍後面）
      coinEdge(CUT) + coin(CUT) + coinEdge(tint(.45)) + coinEdge(line(1.3)) + coin(line(1.4)) +
      at(TK, `<ellipse cx="${COIN.x}" cy="${COIN.y}" rx="15.5" ry="7.5" ${line(.8)}/>` + p(STAR, line(1))) +
      // 聖杯：杯身右側背光
      cup(CUT) + at(TC, `<g clip-path="url(#cBowl)">${p('M90 196H102V216H90Z', tint(.4)) + p(hatch(92, 200, 2, 10, 4, 2.4, 0), line(.65))}</g>` +
        p(CUP_BOWL, line(1.3)) + p(CUP_RIM, line(1.1)) + p(CUP_STEM, line(1.1)) + p(CUP_FOOT, line(1.2)) + p('M88 216V224', line(.6))) +
      // 寶劍：刃上一道亮線、下緣陰影（最前面）
      sword(CUT) + at(TS, p('M120 227.5L180 224.8L184 223.5', line(.85)) + p(SWORD_BLADE, line(1.4)) + p(SWORD_GRIP, line(1.2)) + p('M108 224.5v4M111 224.5v4', line(.7)) +
        c(...SWORD_POMMEL, line(1.2)) + p(SWORD_GUARD, line(1.3))) +
      // 前景：花莖、葉、玫瑰、百合；桌下暗影
      p('M8 268H240L240 280C180 276 60 278 8 282Z', tint(.6)) + p(hatch(10, 270, 6, 10, 38, 6.2, 0), line(.9)) +
      p(STEMS, line(1.6)) +
      GARDEN_LEAVES.map(l => leafAt(l, CUT) + leafAt(l, line(1.4)) + veinAt(l, line(.9))).join('') +
      GARDEN_ROSES.map(r => roseAt(r, CUT) + roseAt(r, line(1.6)) + roseInner(r, line(1))).join('') +
      LILIES.map(l => lilyAt(l, CUT) + lilyAt(l, line(1.5)) + lilyInner(l, line(.9))).join(''),
  });

  return { Y, O, B, N, FO: plateSVG({ frame: fr.O }), FN: plateSVG({ frame: fr.N }) };
}
