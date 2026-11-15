// VIII 力量：歐洲寓言木刻。
// 穿白袍的女子站在獅子身後；獅子抬頭轉向她。她一手掌心朝下覆在獅子鼻樑上，一手從下方托住下顎，溫柔地合上獅口。
// 頭上無限符號、頭戴花冠、腰繫花帶，花鏈從腰間垂下、繞到獅子頸上。遠山、草地。
// 花冠、花帶、花鏈只用色版印，不描墨線。
// 色版：赭金（天空、獅身、花心）、赭橘（獅子的暖色、花瓣）、苔綠（遠山、草地、藤葉）、深棕墨
// 遮擋次序：天空 → 遠山 → 地面 → 女子（後髮 → 白袍 → 花帶 → 頸 → 臉 → 前髮 → 花冠）
//           → 獅子（遠側腿 → 尾 → 身 → 近側後腿 → 近側前腳 → 鬃毛 → 耳 → 臉）→ 花鏈 → 遠側手臂與手 → 近側手臂與手
import { SOLID, CUT, tint, line, cutLine, g255, plateSVG, INKS } from './press.js';
import { printFrame } from './frame.js';

export const STRENGTH_INKS = {
  Y: { rgb: [238, 180, 74], angle: 8, strength: .95 },
  O: { rgb: [204, 98, 50], angle: 68, strength: .95 },
  B: { rgb: [100, 136, 92], angle: 22, strength: .95 },
  N: { rgb: [46, 32, 30], angle: 45, strength: .97 },
  FO: INKS.O,
  FN: { ...INKS.N, fixedRegistration: true },
};
// 女子的臉、獅子的臉與兩隻手：減少飛白（牌面座標）
export const STRENGTH_QUIET = [{ x: 106, y: 154, rx: 16, ry: 20 }, { x: 144, y: 254, rx: 34, ry: 30 }];

const p = (d, a) => `<path d="${d}" ${a}/>`;
const c = (x, y, r, a) => `<circle cx="${x}" cy="${y}" r="${r}" ${a}/>`;
const hatch = (x, y, dx, dy, n, stepX, stepY) => Array.from({ length: n }, (_, i) => `M${x + i * stepX} ${y + i * stepY}l${dx} ${dy}`).join('');
const at = (t, inner) => `<g transform="${t}">${inner}</g>`;

// 女子整組往左挪一點；獅頭抬高、轉向她
const WT = 'translate(-8 0)';
const HT = 'translate(10 -30) rotate(22 122 236)';
const W = inner => at(WT, inner);
const H = inner => at(HT, inner);

// ---- 場景 ----
const MOUNTS = 'M-4 250V222L26 196L48 212L74 184L96 204V250ZM150 250V210L178 186L204 204L228 180L252 200V250Z';
const SNOW = 'M74 184L66 195L72 193L76 199L80 192L84 196ZM228 180L220 191L226 189L230 196L234 188L238 192Z';
const GROUND = 'M-4 346V300C40 292 90 298 130 294C176 290 214 296 252 292V346Z';

// ---- 女子（面向右，座標在 WT 之前）----
const INFINITY = 'M88 56C83 49 73 49 73 56C73 63 83 63 88 56C93 49 103 49 103 56C103 63 93 63 88 56Z';
const HAIR = 'M70 96C68 84 76 76 86 76C96 76 102 84 100 96L96 106C94 116 90 134 80 150C72 140 66 124 66 110Z';
const HEAD = 'M74 96C74 86 80 80 88 80C96 80 101 86 101 94L104 100L101.5 102L102.5 106C100 112 94 114 88 113C80 112 74 106 74 96Z';
const HAIR_FRONT = 'M75 94C73 86 79 80 88 80C97 80 101 86 101 92C94 94 89 89 86 92C83 95 81 100 82 104L78 110C73 105 72 99 75 94Z';
const NECK = 'M82 110L93 110L95 123L80 123Z';
const ROBE = 'M72 122C82 118 96 118 104 124L110 176C116 210 120 260 122 318L30 318C36 260 50 210 64 178Z';
const GIRDLE = 'M64 172C78 178 96 178 110 172L111 180C96 186 78 186 63 180Z';
// 遠側手臂：上臂、手肘、前臂，手掌心朝下覆在獅子鼻樑上
const SLEEVE_FAR = 'M96 127C106 128 111 137 115 148L124 170L133 179L128 190L119 183L102 158C96 148 92 137 96 127Z';
const SLEEVE_FAR_LINE = 'M96 127C106 128 111 137 115 148L124 170L133 179M128 190L119 183L102 158C97 149 94 140 94 133';
const HAND_TOP = 'M126 182L132 185C135 188 136 192 134 195L124 199L118 201C116 201 115 199 118 197L126 193L120 196C117 197 115 195 118 193L124 189L123 187Z';
// 近側手臂：上臂順著身體往下，手肘彎曲，前臂往前，手從下方托住下顎
const SLEEVE_NEAR = 'M78 129C71 133 71 143 73 153L82 194C83 203 88 208 94 211L111 228L120 219L99 196L92 169L91 145C91 136 86 129 78 129Z';
const SLEEVE_NEAR_LINE = 'M78 129C71 133 71 143 73 153L82 194C83 203 88 208 94 211L111 228M120 219L99 196L92 169L91 145C91 136 86 129 78 129';
const HAND_LOW = 'M117 220L122 218C126 219 129 221 132 221L141 220C144 220 144 222 141 223L133 225L142 224C145 224 145 227 142 228L132 230C125 231 120 228 114 225Z';

// ---- 獅子（側面朝左）----
const L_FRONT_FAR = 'M164 262L178 264L178 302C178 308 182 312 186 314L186 318L166 318L166 304Z';
const L_HIND_FAR = 'M196 272L210 274L208 304C208 310 212 314 214 314V318H196L198 304Z';
const L_TAIL = 'M236 232C246 238 246 260 240 276C236 288 239 297 243 299';
const L_TUFT = 'M243 299L237 293L247 295L243 287L250 297L244 307Z';
// 身體：胸深、背線平直、腹部往上收、臀部圓實
const L_BODY = 'M148 208C165 202 183 209 202 211C217 208 232 215 237 229C243 245 234 262 219 269C208 274 195 269 185 266C175 264 165 270 155 274C144 278 136 267 138 251C139 232 140 218 148 208Z';
// 近側前腳：肘、前臂、腕，大腳掌
const L_FRONT = 'M142 252C150 250 160 254 162 262L162 300C162 306 164 310 170 312C174 314 174 318 170 318L146 318C142 318 142 314 144 310L146 296Z';
const L_FRONT_LINE = 'M142 252L146 296L144 310C142 314 142 318 146 318L170 318C174 318 174 314 170 312C164 310 162 306 162 300L162 262';
// 近側後腿：粗壯的大腿、膝、跗關節
const L_HIND = 'M207 229C223 224 237 235 236 252C235 263 228 273 223 282L221 299C222 306 228 310 234 313C238 316 236 318 232 318H212C207 318 208 314 211 310L214 294C202 282 196 273 194 261C192 247 196 234 207 229Z';
const L_HIND_LINE = 'M199 276C204 284 209 290 214 294L211 310C208 314 207 318 212 318H232C236 318 238 316 234 313C228 310 222 306 221 299L223 282C228 273 235 263 236 252C237 241 231 232 222 229';
// 鬃毛：不規則毛簇與順體積轉向的刻線（座標在 HT 之前）
const MANE = 'M143 196C153 191 164 199 164 207C176 205 179 217 173 223C185 228 180 240 175 244C179 255 168 261 160 263C159 275 148 276 141 270C132 281 120 273 118 266C106 270 100 259 104 252C95 245 97 240 104 233C93 224 99 213 110 208C110 204 119 200 127 202C132 195 137 194 143 196Z';
const MANE_IN = 'M140 207C154 202 165 215 164 226C174 236 165 249 154 252C150 264 134 267 126 257C114 261 106 250 112 240C103 228 115 215 127 217C130 210 135 207 140 207Z';
const L_EAR = 'M135 215C128 213 128 205 134 202C141 199 148 207 144 213L142 216Z';
const L_FACE = 'M151 223C143 214 131 213 121 218C115 221 112 225 111 229L105 230C100 231 100 237 104 240L109 242C104 246 107 252 114 254C125 258 138 252 145 244C151 238 154 230 151 223Z';

// ---- 花：五瓣花加花心；花鏈只用色版印 ----
const CHAIN = 'M100 184C96 204 94 224 98 240C104 254 124 260 142 258C158 256 172 250 184 242';
const CHAIN_FLOWERS = [[97, 200], [95, 216], [96, 232], [103, 247], [116, 255], [130, 258], [144, 257], [158, 254], [171, 249], [183, 242]];
const CHAIN_LEAVES = [[98, 208, -60], [93, 224, 60], [99, 240, -40], [110, 252, 40], [123, 258, -20], [137, 258, 30], [151, 256, -30], [165, 252, 30], [177, 246, -20]];
const CROWN = [[77, 84], [84, 79], [92, 78], [99, 82]];          // WT 之前
const GIRDLE_FLOWERS = [[72, 178], [86, 181], [100, 179]];        // WT 之前
const petals = ([x, y], r, a) => Array.from({ length: 5 }, (_, i) => {
  const t = (-90 + i * 72) * Math.PI / 180;
  return c((x + r * .55 * Math.cos(t)).toFixed(1), (y + r * .55 * Math.sin(t)).toFixed(1), (r * .52).toFixed(2), a);
}).join('');
const blossom = (f, r, a) => c(f[0], f[1], r * 1.08, a);
const leafAt = ([x, y, rot], s, a) => `<ellipse cx="${x}" cy="${y}" rx="${s}" ry="${s * .45}" transform="rotate(${rot} ${x} ${y})" ${a}/>`;

const woman = a => W(p(HAIR, a) + p(ROBE, a) + p(NECK, a) + p(HEAD, a) + CROWN.map(f => blossom(f, 4, a)).join(''));
const lion = a => p(L_FRONT_FAR, a) + p(L_HIND_FAR, a) + p(L_BODY, a) + p(L_FRONT, a) + p(L_HIND, a) + H(p(MANE, a) + p(L_EAR, a) + p(L_FACE, a)) + p(L_TUFT, a);
const chain = a => CHAIN_FLOWERS.map(f => blossom(f, 5.2, a)).join('') + CHAIN_LEAVES.map(l => leafAt(l, 4.4, a)).join('');
const arms = a => W(p(SLEEVE_FAR, a) + p(HAND_TOP, a) + p(SLEEVE_NEAR, a) + p(HAND_LOW, a));
const allCut = () => woman(CUT) + lion(CUT) + p(L_TAIL, cutLine(5)) + p(CHAIN, cutLine(2.4)) + chain(CUT) + arms(CUT);

export function strengthPlates(card) {
  const fr = printFrame(card);
  const crownFlowers = (fn) => W(CROWN.map(f => fn(f, 4)).join('') + GIRDLE_FLOWERS.map(f => fn(f, 3.8)).join(''));

  // ---- 赭金：天空、獅子、頭髮、膚色（淡）、花心 ----
  const Y = plateSVG({
    defs: `<linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop stop-color="${g255(.62)}"/><stop offset="1" stop-color="${g255(.3)}"/></linearGradient>`,
    art:
      '<rect x="-3" y="-3" width="254" height="300" fill="url(#sky)"/>' + p(MOUNTS, CUT) + p(GROUND, tint(.4)) +
      allCut() +
      W(p(HAIR, SOLID) + p(ROBE, CUT) + p(NECK, CUT) + p(NECK, tint(.15)) + p(HEAD, CUT) + p(HEAD, tint(.2)) + p(HAIR_FRONT, SOLID) + p(HAND_TOP, tint(.2)) + p(HAND_LOW, tint(.2))) +
      lion(SOLID) + p(L_TAIL, line(3.4)) +
      CHAIN_FLOWERS.map(f => c(f[0], f[1], 1.9, SOLID)).join('') + crownFlowers(f => c(f[0], f[1], 1.5, SOLID)) + arms(CUT) + W(p(HAND_TOP,tint(.2))+p(HAND_LOW,tint(.2))),
  });

  // ---- 赭橘：獅子的暖色（鬃毛較深）、花瓣、頭髮的紅、臉頰 ----
  const O = plateSVG({
    art:
      allCut() +
      lion(tint(.42)) + H(p(MANE, tint(.82)) + p(L_EAR, tint(.42)) + p(L_FACE, CUT) + p(L_FACE, tint(.2))) + p(L_TUFT, tint(.82)) + p(L_TAIL, line(3.4)) +
      W(p(HAIR, tint(.5)) + p(ROBE, CUT) + p(NECK, CUT) + p(HEAD, CUT) + p(HEAD, tint(.07)) + p(HAIR_FRONT, tint(.5)) + p(HAND_TOP, tint(.07)) + p(HAND_LOW, tint(.07)) + `<circle cx="95" cy="103" r="2.6" ${tint(.35)}/>`) +
      CHAIN_FLOWERS.map(f => petals(f, 5.2, SOLID) + c(f[0], f[1], 1.9, CUT)).join('') +
      crownFlowers((f, r) => petals(f, r, SOLID) + c(f[0], f[1], 1.5, CUT)) + arms(CUT) + W(p(HAND_TOP,tint(.07))+p(HAND_LOW,tint(.07))),
  });

  // ---- 苔綠：遠山、草地、藤與葉 ----
  const B = plateSVG({
    defs: `<linearGradient id="haze" x1="0" y1="0" x2="0" y2="1"><stop stop-color="${g255(.62)}"/><stop offset="1" stop-color="${g255(.3)}"/></linearGradient>`,
    art:
      p(MOUNTS, 'fill="url(#haze)" style="mix-blend-mode:lighten"') + p(SNOW, CUT) + p(GROUND, CUT) + p(GROUND, tint(.55)) +
      allCut() +
      W(p(GIRDLE, tint(.35))) +
      p(CHAIN, line(1.8)) + CHAIN_LEAVES.map(l => leafAt(l, 4.4, SOLID)).join('') + CHAIN_FLOWERS.map(f => blossom(f, 5.2, CUT)).join('') +
      W(CROWN.map(([x, y], i) => leafAt([x + (i % 2 ? 3 : -3), y + 3.5, i % 2 ? 30 : -30], 3, SOLID)).join('') + CROWN.map(f => blossom(f, 4, CUT)).join('')) + arms(CUT),
  });

  // ---- 墨：由後往前，每一層先挖空再描露出的輪廓；花不描線 ----
  const N = plateSVG({
    defs:
      `<clipPath id="cRobe"><path d="${ROBE}"/></clipPath><clipPath id="cHair"><path d="${HAIR}"/></clipPath><clipPath id="cFringe"><path d="${HAIR_FRONT}"/></clipPath><clipPath id="cHead"><path d="${HEAD}"/></clipPath>` +
      `<clipPath id="cBody"><path d="${L_BODY}"/></clipPath><clipPath id="cHind"><path d="${L_HIND}"/></clipPath><clipPath id="cFront"><path d="${L_FRONT}"/></clipPath>` +
      `<clipPath id="cMane"><path d="${MANE}"/></clipPath><clipPath id="cFace"><path d="${L_FACE}"/></clipPath>` +
      `<clipPath id="cFar"><path d="${SLEEVE_FAR}"/></clipPath><clipPath id="cNear"><path d="${SLEEVE_NEAR}"/></clipPath>` +
      `<clipPath id="cMounts"><path d="${MOUNTS}"/></clipPath><clipPath id="cGround"><path d="${GROUND}"/></clipPath>`,
    art:
      // 遠山
      p('M-4 222L26 196L48 212L74 184L96 204M150 210L178 186L204 204L228 180L252 200', line(1.4)) + p(SNOW, line(.9)) +
      `<g clip-path="url(#cMounts)">${p(hatch(30, 200, 10, 22, 6, 3.2, 1.4) + hatch(78, 190, 10, 26, 5, 3.2, 1.4) + hatch(182, 192, 10, 24, 6, 3.2, 1.4) + hatch(232, 186, 8, 26, 5, 3, 1.4), line(1))}</g>` +
      // 地面：草叢與獅子腳下的影子
      p(GROUND, CUT) + p('M-4 300C40 292 90 298 130 294C176 290 214 296 252 292', line(1.6)) +
      `<g clip-path="url(#cGround)">${p('M132 316C164 311 214 311 246 318C214 326 164 328 132 324Z', tint(.5)) + p(hatch(134, 322, 10, -6, 12, 9, 0), line(1)) + p(hatch(-2, 336, 12, -5, 6, 12, 0), line(1))}</g>` +
      p('M14 308l3-10l5 9M240 330l3-10l5 9M10 330l4-11l5 10', line(1.1)) +
      // 女子
      W(
        `<g data-symbol="infinity">${p(INFINITY, line(2.3))}</g>` +
        p(HAIR, CUT) + `<g clip-path="url(#cHair)">${p(hatch(68, 100, 8, 40, 7, 3.6, 0), line(.9)) + p('M66 108L76 108L84 152L66 140Z', tint(.45))}</g>` + p(HAIR, line(2)) +
        p(ROBE, CUT) +
        `<g clip-path="url(#cRobe)">${p('M96 120L124 120L126 320L104 320Z', tint(.34)) + p(hatch(100, 190, 6, 22, 8, 3, 0) + hatch(98, 240, 8, 26, 6, 3.4, 0) + hatch(40, 270, -4, 40, 6, 5, 0), line(.95))}</g>` +
        p(ROBE, line(2.4)) + p('M84 186C80 226 70 270 60 316M96 186C96 230 92 272 88 316M74 186C66 226 52 270 44 316', line(1.4)) +
        p(GIRDLE, CUT) + p(GIRDLE, line(1.4)) + GIRDLE_FLOWERS.map(f => blossom(f, 3.8, CUT)).join('') +
        p(NECK, CUT) + p('M89 112L94 112L95 123L90 123Z', tint(.35)) + p('M82 111L80 123M93 111L95 123', line(1.6)) +
        p(HEAD, CUT) + `<g clip-path="url(#cHead)">${p('M72 94L80 94L82 116L72 116Z', tint(.22))}</g>` +
        p('M101 94L104 100L101.5 102L102.5 106C100 112 94 114 88 113C81 112 75 106 74 98', line(1.9)) +
        p('M91 92C93.5 90.5 96.5 90.5 98.5 92.5', line(1.8)) + p('M92 96Q95 97.5 98 96', line(1.6)) + p('M99.5 108.5Q101 109.5 102 109', line(1.1)) +
        p('M84 98C86 102 86 106 84 108', line(.9)) +
        p(HAIR_FRONT, CUT) + p(HAIR_FRONT, line(1.5)) + `<g clip-path="url(#cFringe)">${p('M78 87Q82 82 85 84M78 94L77 104M83 86Q90 84 96 89', line(.8))}</g>` +
        CROWN.map(f => blossom(f, 4, CUT)).join('')
      ) +
      // 獅子：遠側腿（較暗）
      p(L_FRONT_FAR, CUT) + p(L_FRONT_FAR, tint(.45)) + p(L_FRONT_FAR, line(1.8)) +
      p(L_HIND_FAR, CUT) + p(L_HIND_FAR, tint(.45)) + p(L_HIND_FAR, line(1.8)) +
      // 尾巴
      p(L_TAIL, line(5.6)) + p(L_TAIL, cutLine(2.4)) + p(L_TUFT, CUT) + p(L_TUFT, tint(.4)) + p(L_TUFT, line(1.6)) +
      // 身體：腹部與臀部背光、腹下的毛、肋側
      p(L_BODY, CUT) +
      `<g clip-path="url(#cBody)">${p('M138 256C164 262 194 262 238 244V280H138Z', tint(.46)) + p(hatch(150, 258, 4, 16, 18, 4.8, -.8), line(1)) +
        p(hatch(172, 222, 2, 30, 6, 5.6, 0), line(.75)) + p('M218 212C232 216 240 230 238 246L226 246C226 232 222 220 214 214Z', tint(.4))}</g>` +
      p(L_BODY, line(2.4)) + p('M172 266l2 5M180 265l1 5M190 267l1 4', line(1)) +
      // 近側後腿：只描露出的輪廓
      p(L_HIND, CUT) + `<g clip-path="url(#cHind)">${p('M214 226L244 226L244 320L222 320Z', tint(.46)) + p(hatch(214, 238, 4, 16, 8, 3.6, 2.4), line(1))}</g>` +
      p(L_HIND_LINE, line(2.3)) + p('M200 252C204 262 210 270 214 276', line(1.2)) + p('M216 318v-4M222 318v-4M228 318v-4', line(1)) +
      // 近側前腳
      p(L_FRONT, CUT) + `<g clip-path="url(#cFront)">${p('M154 252L164 252L164 320L156 320Z', tint(.44)) + p(hatch(150, 262, 3, 10, 5, 2.6, 0), line(.9))}</g>` +
      p(L_FRONT_LINE, line(2.3)) + p('M152 318v-4M158 318v-4M164 318v-4M146 272C150 276 156 276 160 274', line(1)) +
      // 鬃毛、耳、臉（抬頭轉向女子）
      H(
        p(MANE, CUT) +
        `<g clip-path="url(#cMane)">${p(MANE_IN, tint(.3)) + p('M150 240L184 240L184 278L146 278Z', tint(.44))}</g>` +
        p(MANE, line(2.2)) + p(MANE_IN, line(1.3)) +
        Array.from({ length: 15 }, (_, i) => {
          const t = (-90 + i * 24 + 12) * Math.PI / 180;
          return p(`M${(140 + 24 * Math.cos(t)).toFixed(1)} ${(234 + 24 * Math.sin(t)).toFixed(1)}L${(140 + 35 * Math.cos(t)).toFixed(1)} ${(234 + 35 * Math.sin(t)).toFixed(1)}`, line(.95));
        }).join('') +
        p(L_EAR, CUT) + p(L_EAR, line(1.6)) + p('M135 210L139 207', line(.9)) +
        p(L_FACE, CUT) + `<g clip-path="url(#cFace)">${p('M134 236C140 244 148 244 156 236V260H134Z', tint(.4)) + p(hatch(136, 240, 3, 12, 5, 3.6, 0), line(.85))}</g>` +
        p(L_FACE, line(2.2)) +
        p('M121 219C116 222 113 225 112 229', line(1.5)) +
        p('M102 233C104 230 111 230 114 232L113 236L108 238L104 236Z', SOLID) +
        p('M108 238V242M108 242C113 246 119 243 120 240M108 242C105 244 104 244 103 242', line(1.4)) +
        p('M115 250C121 252 129 250 134 246', line(1.4)) +
        c(117,237,.9,SOLID)+c(120,239,.8,SOLID)+c(116,241,.8,SOLID)+
        p('M123 222Q129 219 135 223',line(1.8))+
        p('M124 226Q129 223 133 226Q129 229 124 226Z',SOLID)+
        p('M146 230L153 234M144 240L151 244M140 249L146 254M126 214L130 209', line(1.1))
      ) +
      // 花鏈：只挖空，讓色版的花與葉乾淨地印上去
      `<g data-symbol="flower-chain">${p(CHAIN, cutLine(2.4)) + chain(CUT)}</g>` +
      // 遠側手臂：前臂伸向獅頭，手掌心朝下覆在鼻樑上
      W(
        p(SLEEVE_FAR, CUT) + `<g clip-path="url(#cFar)">${p('M106 128L134 128L134 190L114 190Z', tint(.32)) + p(hatch(104, 150, 8, 4, 6, 2.4, 6), line(.85))}</g>` +
        p(SLEEVE_FAR_LINE, line(2)) + p('M127 179L124 187', line(1.4)) + p('M104 147Q110 153 115 154', line(1)) +
        p(HAND_TOP, CUT) + p(HAND_TOP, line(1.3)) +
        p('M127 191L120 195M129 194L122 197', line(.65))
      ) +
      // 近側手臂：上臂順著身體、手肘彎曲、前臂往前，手從下方托住下顎
      W(
        p(SLEEVE_NEAR, CUT) + `<g clip-path="url(#cNear)">${p('M78 136L86 136L91 190L114 221L110 226L87 207L81 191Z', tint(.32)) + p(hatch(74, 150, 9, 4, 6, .8, 6) + hatch(92, 188, 10, -6, 5, 3, 6), line(.85))}</g>` +
        p(SLEEVE_NEAR_LINE, line(2)) + p('M112 226L119 219', line(1.4)) + p('M84 190Q88 197 95 199', line(1)) +
        p(HAND_LOW, CUT) + p(HAND_LOW, line(1.3)) +
        p('M123 223Q128 227 133 225M122 226L133 228', line(.7))
      ),
  });

  return { Y, O, B, N, FO: plateSVG({ frame: fr.O }), FN: plateSVG({ frame: fr.N }) };
}
