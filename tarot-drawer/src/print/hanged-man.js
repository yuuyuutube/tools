// XII 倒吊人：歐洲寓言木刻。
// 一腳綁在長著葉子的活木 T 形架上，另一腿在後方交疊，雙手收在背後，頭上一圈光，神情安然。
// 色版：赭金（光環、木頭、膚色）、磚紅（腿衣）、灰藍（上衣、天空）、深藍墨（輪廓與排線）
// 遮擋次序：遠山 → 地面 → 立柱 → 橫木 → 光環 → 後腿 → 手肘 → 軀幹 → 前腿 → 衣襬 → 頸、頭髮、頭
import { SOLID, CUT, tint, line, cutLine, g255, plateSVG, INKS } from './press.js';
import { printFrame } from './frame.js';

export const HANGED_MAN_INKS = {
  Y: { rgb: [233, 177, 78], angle: 8, strength: .94 },
  O: { rgb: [192, 70, 48], angle: 68, strength: .95 },
  B: { rgb: [98, 134, 172], angle: 22, strength: .95 },
  N: { rgb: [32, 38, 72], angle: 45, strength: .97 },
  FO: INKS.O,
  FN: { ...INKS.N, fixedRegistration: true },
};
// 臉與綁腳處減少飛白（牌面座標）
export const HANGED_MAN_QUIET = [{ x: 150, y: 339, rx: 22, ry: 26 }, { x: 150, y: 120, rx: 16, ry: 16 }];

const p = (d, a) => `<path d="${d}" ${a}/>`;
const hatch = (x, y, dx, dy, n, stepX, stepY) => Array.from({ length: n }, (_, i) => `M${x + i * stepX} ${y + i * stepY}l${dx} ${dy}`).join('');

// ---- 場景 ----
const HILLS = 'M-4 328V298L30 282L62 296L100 276L140 294L186 272L222 290L252 280V328Z';
const GROUND = 'M-4 346V326C40 320 90 324 124 322C170 318 210 322 252 318V346Z';
const BEAM = 'M-4 31C40 26 90 30 124 27C170 25 210 30 252 27L252 45C210 48 170 44 124 46C90 48 40 45-4 49Z';
const POST = 'M113 44C114 120 112 220 110 334L138 334C136 220 134 120 135 44Z';
// 活木上的葉子：[x, y, 角度]。角度 0 = 葉尖朝上
const LEAVES = [
  [28, 30, -32], [42, 29, 18], [84, 28, -14], [98, 28, 30], [158, 27, -28], [172, 27, 16], [204, 28, -20], [222, 28, 24],
  [58, 47, 152], [72, 47, -168], [184, 45, 160], [14, 47, -160], [236, 45, 165],
];
const LEAF = 'M0 0C-5.500-4-5.500-11 0-15C5.500-11 5.500-4 0 0Z';
const leaves = a => LEAVES.map(([x, y, r]) => `<g data-symbol="living-leaf" transform="translate(${x} ${y}) rotate(${r})">${p(LEAF, a)}</g>`).join('');
const leafVeins = a => LEAVES.map(([x, y, r]) => `<g transform="translate(${x} ${y}) rotate(${r})">${p('M0-1V-12', a)}</g>`).join('');

// ---- 人物（倒掛，正面）----
const FOOT = 'M119 70C118 61 118 53 121 49C123 47 126 47 128 49C131 53 130 61 129 70Z';
const LEG = 'M119 68C116 84 115 96 118 108C118 116 117 122 116 128C113 146 112 160 111 180L137 180C136 160 134 146 132 128C131 122 130 116 130 108C133 96 132 84 129 68Z';
const THIGH = 'M128 178L148 178C158 170 168 158 174 148C178 141 174 133 166 133C154 140 142 150 129 158Z';
const SHIN = 'M173 147C162 141 148 136 133 131L133 119C148 121 163 125 175 131C180 136 178 144 173 147Z';
const BACK_FOOT = 'M117 120C109 117 99 117 95 121C93 125 97 128 104 128L117 129Z';
const ARM_L = 'M99 246C89 240 79 230 77 219C78 211 88 208 98 211L102 228Z';
const ARM_R = 'M149 246C159 240 169 230 171 219C170 211 160 208 150 211L146 228Z';
const TORSO = 'M103 180C101 200 99 222 95 246C105 252 115 254 124 254C133 254 143 252 153 246C149 222 147 200 145 180Z';
// 衣襬受重力往下（朝頭的方向）垂成幾片
const SKIRT = 'M99 166C108 163 140 163 149 166C152 176 153 186 151 196C147 192 143 192 140 197C136 192 131 192 128 198C124 192 119 192 115 197C111 192 106 192 101 196C98 186 97 176 99 166Z';
const NECK = 'M117 251L131 251L132 264L116 264Z';
const HEAD = 'M110 274C110 265 116 261 124 261C132 261 138 265 138 274L138 286C138 296 132 302 124 302C116 302 110 296 110 286Z';
const HAIR = 'M109 282C104 294 105 306 110 316C114 311 119 313 121 320C124 315 127 315 129 320C131 313 136 311 140 316C144 306 144 294 139 282C138 294 132 301 124 301C116 301 110 294 109 282Z';
const EARS = 'M110 278C106 278 106 285 110 285ZM138 278C142 278 142 285 138 285Z';
const HALO = '<circle cx="124" cy="284" r="34"';
const halo = a => `<g data-symbol="halo">${HALO} ${a}/></g>`;

const backLeg = a => p(SHIN, a) + p(BACK_FOOT, a) + p(THIGH, a);
const cloth = a => p(ARM_L, a) + p(ARM_R, a) + p(TORSO, a) + p(SKIRT, a);
const skin = a => p(NECK, a) + p(HEAD, a) + p(EARS, a);
const wood = a => p(POST, a) + p(BEAM, a);
const figure = a => backLeg(a) + cloth(a) + p(LEG, a) + p(FOOT, a) + skin(a) + p(HAIR, a);

// 光環的短光芒
function haloRays() {
  let d = '';
  for (let i = 0; i < 24; i++) {
    const t = (i * 15 + 7.5) * Math.PI / 180, r1 = 38, r2 = i % 2 ? 43 : 47;
    d += `M${(124 + r1 * Math.cos(t)).toFixed(1)} ${(284 + r1 * Math.sin(t)).toFixed(1)}L${(124 + r2 * Math.cos(t)).toFixed(1)} ${(284 + r2 * Math.sin(t)).toFixed(1)}`;
  }
  return d;
}

export function hangedManPlates(card) {
  const fr = printFrame(card);
  const rays = haloRays();

  // ---- 赭金：光環、木頭、葉子的底、膚色、頭髮、鞋 ----
  const Y = plateSVG({
    art:
      p(GROUND, tint(.55)) + wood(tint(.72)) + leaves(SOLID) +
      halo(tint(.8)) + p(rays, line(1.5)) +
      figure(CUT) +
      skin(tint(.3)) + p(HAIR, SOLID) + p(FOOT, SOLID) + p(BACK_FOOT, SOLID),
  });

  // ---- 磚紅：腿衣、木頭的暖色、膚色與頭髮的一點紅 ----
  const O = plateSVG({
    art:
      wood(tint(.36)) + leaves(CUT) + halo(CUT) +
      figure(CUT) +
      backLeg(SOLID) + p(BACK_FOOT, CUT) + p(LEG, SOLID) +
      skin(tint(.2)) + p(HAIR, tint(.42)) + p(FOOT, tint(.5)) + p(BACK_FOOT, tint(.5)) +
      `<circle cx="114" cy="277" r="3" ${tint(.3)}/><circle cx="134" cy="277" r="3" ${tint(.3)}/>`,
  });

  // ---- 灰藍：天空、遠山、草地（疊在赭金上變綠）、葉子、上衣 ----
  const B = plateSVG({
    defs: `<linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop stop-color="${g255(.62)}"/><stop offset="1" stop-color="${g255(.16)}"/></linearGradient>`,
    art:
      '<rect x="-3" y="-3" width="254" height="322" fill="url(#sky)"/>' +
      p(HILLS, tint(.66)) + p(GROUND, CUT) + p(GROUND, tint(.5)) +
      wood(CUT) + leaves(CUT) + leaves(tint(.66)) +
      halo(CUT) + p(rays, cutLine(2.6)) +
      figure(CUT) + cloth(SOLID),
  });

  // ---- 墨：輪廓、木紋、暗面的排線 ----
  const N = plateSVG({
    defs:
      `<clipPath id="cPost"><path d="${POST}"/></clipPath><clipPath id="cBeam"><path d="${BEAM}"/></clipPath>` +
      `<clipPath id="cTorso"><path d="${TORSO}"/></clipPath><clipPath id="cLeg"><path d="${LEG}"/></clipPath>` +
      `<clipPath id="cThigh"><path d="${THIGH}"/></clipPath><clipPath id="cShin"><path d="${SHIN}"/></clipPath>` +
      `<clipPath id="cSkirt"><path d="${SKIRT}"/></clipPath><clipPath id="cArmR"><path d="${ARM_R}"/></clipPath><clipPath id="cArmL"><path d="${ARM_L}"/></clipPath>` +
      `<clipPath id="cHills"><path d="${HILLS}"/></clipPath><clipPath id="cGround"><path d="${GROUND}"/></clipPath>` +
      `<clipPath id="cHair"><path d="${HAIR}"/></clipPath><clipPath id="cHead"><path d="${HEAD}"/></clipPath>`,
    art:
      // 遠山：稜線與背光面
      p('M-4 298L30 282L62 296L100 276L140 294L186 272L222 290L252 280', line(1.4)) +
      `<g clip-path="url(#cHills)">${p(hatch(32, 284, 10, 22, 6, 3.2, 1.6) + hatch(102, 278, 12, 24, 7, 3.2, 1.8) + hatch(188, 274, 11, 22, 7, 3.2, 1.9), line(1))}</g>` +
      // 地面：草、石、立柱影子
      p(GROUND, CUT) +
      p('M-4 326C40 320 90 324 124 322C170 318 210 322 252 318', line(1.6)) +
      `<g clip-path="url(#cGround)">${p('M138 326C160 322 190 326 214 330C190 338 160 340 138 336Z', tint(.42)) + p(hatch(140, 334, 9, -8, 13, 5.2, 0), line(1))}` +
      p(hatch(-2, 344, 12, -5, 9, 12, 0) + hatch(150, 345, 12, -5, 8, 12, -.4), line(1)) + '</g>' +
      p('M22 332l3-10l5 9M34 334l4-8M70 340l4-11l5 10M196 328l4-11l5 10M226 338l4-10l5 9M92 334l3-8l4 7', line(1.1)) +
      p('M48 340C50 334 60 333 64 338C64 343 50 344 48 340ZM176 343C179 338 188 338 190 343Z', line(1.3)) +
      // 立柱：右半背光，木紋順著樹幹
      wood(CUT) +
      `<g clip-path="url(#cPost)">${p('M126 40L140 40L140 336L124 336Z', tint(.46))}` +
      p(hatch(127, 48, 0, 288, 4, 3, 0), line(1)) + p('M118 60C117 120 118 200 116 330', line(.9)) + '</g>' +
      p(POST, line(2.4)) +
      p('M112 330C106 334 102 337 98 337M137 330C142 334 147 336 152 336', line(1.5)) +
      // 橫木
      p(BEAM, CUT) +
      `<g clip-path="url(#cBeam)">${p('M-4 39C40 36 90 39 124 37C170 35 210 39 252 37V50H-4Z', tint(.46))}` +
      p(hatch(4, 39, -3, 9, 60, 4.1, -.02), line(.95)) +
      p('M-4 35C30 32 70 35 108 33M140 32C180 30 216 34 252 32', line(.9)) + '</g>' +
      p(BEAM, line(2.5)) +
      p('M64 36C61 33 67 31 69 35C70 39 64 39 64 36ZM196 35C194 32 199 31 201 34C201 37 196 38 196 35Z', line(1.1)) +
      leaves(CUT) + leaves(line(1.5)) + leafVeins(line(.9)) +
      // 繩：從橫木垂下，圈住腳踝
      p('M116 27V46M132 27V46', line(1.8)) + p('M116 31L132 35M116 37L132 41M116 43L132 46', line(1.1)) +
      // 光環
      halo(CUT) + halo(line(1.6)) +
      // 後腿：大腿往外、膝蓋頂出，小腿繞到前腿後面，腳從另一側露出（交腿成「4」字）
      backLeg(CUT) +
      `<g clip-path="url(#cShin)">${p('M133 127L178 137L178 150L133 133Z', tint(.44)) + p(hatch(137, 126, -3, 9, 10, 4, 1), line(1))}</g>` +
      `<g clip-path="url(#cThigh)">${p('M129 166L150 180L178 146L182 154L148 184L129 182Z', tint(.44)) + p(hatch(132, 164, 6, 16, 10, 4.3, -2.2), line(1))}</g>` +
      p(SHIN, line(2.2)) + p(BACK_FOOT, line(2)) + p(THIGH, line(2.3)) +
      p('M166 134C171 137 174 141 173 147', line(1.3)) + p('M104 118L103 127M110 118L109 128', line(.9)) +
      // 手肘：雙手綁在背後，只露出兩側手肘，形成倒三角
      p(ARM_L, CUT) + p(ARM_R, CUT) +
      `<g clip-path="url(#cArmR)">${p('M148 206L174 206L174 248L148 248Z', tint(.42)) + p(hatch(150, 212, 14, 9, 7, 0, 5), line(1))}</g>` +
      `<g clip-path="url(#cArmL)">${p(hatch(78, 220, 11, 8, 5, 2, 5), line(.95))}</g>` +
      p(ARM_L, line(2.2)) + p(ARM_R, line(2.2)) +
      // 軀幹：胸廓、肩線；衣褶受重力拉向肩；右半背光
      p(TORSO, CUT) +
      `<g clip-path="url(#cTorso)">${p('M128 178L158 178L158 258L128 258Z', tint(.42)) + p(hatch(131, 202, 14, 11, 9, .6, 5.6), line(1))}</g>` +
      p(TORSO, line(2.4)) +
      p('M110 202C108 218 106 232 103 244M124 204V240M138 202C140 218 142 232 145 244', line(1.5)) +
      p('M101 226C112 232 136 232 147 226', line(1.2)) +
      p('M116 253L124 241L132 253', line(1.6)) + p('M121 247H127M122 250.5H126', line(.9)) +
      // 前腿：膝蓋、小腿肚；右側背光
      p(LEG, CUT) +
      `<g clip-path="url(#cLeg)">${p('M125 66L137 66L139 182L126 182Z', tint(.44)) + p(hatch(126, 74, 9, 3, 26, 0, 4.1), line(1))}</g>` +
      p(LEG, line(2.4)) + p('M118 126C121 130 127 130 131 126M117 108C120 111 127 111 130 108', line(1.2)) +
      // 腳與繩
      p(FOOT, CUT) + p(FOOT, line(2)) + p('M121 52V61M124 51V61M127 52V61', line(.85)) +
      p('M118 46L119 66M130 46L129 66', line(1.5)) + p('M117 66Q124 69 131 66M117 70Q124 73 131 70M118 74Q124 76.5 130 74', line(1.5)) +
      // 衣襬：垂向胸口的幾片布，下壓暗影；腰帶
      p(SKIRT, CUT) +
      `<g clip-path="url(#cSkirt)">${p('M127 162L154 162L154 200L127 200Z', tint(.42)) + p(hatch(129, 168, 4, 18, 6, 4, 0), line(1))}</g>` +
      p(SKIRT, line(2.4)) + p('M114 169V190M127 168V192M139 169V190M107 170L105 186M146 170L148 186', line(1.2)) +
      p('M99 166C108 163 140 163 149 166', line(1.6)) +
      p('M100 200C110 204 138 204 148 200L148 206C138 210 110 210 100 206Z', SOLID) +
      // 頸、頭髮、頭
      p(NECK, CUT) + p('M126 253L131 253L132 264L127 264Z', tint(.4)) + p('M117 252L116 264M131 252L132 264', line(1.6)) +
      p(HAIR, CUT) + `<g clip-path="url(#cHair)">${p('M128 294L146 294L146 322L128 322Z', tint(.36))}</g>` + p(HAIR, line(2)) +
      p('M112 294C109 302 110 308 112 313M117 300C116 307 117 312 120 317M124 302V316M131 300C132 307 131 312 128 317M136 294C139 302 138 308 136 313', line(1)) +
      p(HEAD, CUT) + p(EARS, CUT) + p(EARS, line(1.4)) +
      `<g clip-path="url(#cHead)">${p('M131 260L140 260L140 302L133 302Z', tint(.3))}</g>` +
      p(HEAD, line(2.1)) +
      // 五官（上下顛倒）：嘴在上、眼在下；閉眼，神情安然
      p('M119 269.5Q124 267 129 269.5', line(1.5)) + p('M122 266.5H126', line(.85)) +
      p('M126 285C127.5 281 127 277.5 124 275.5C121.5 275.5 120.5 277 121.5 278.5', line(1.4)) +
      p('M113.5 283Q117.5 280.5 121 283M127 283Q130.5 280.5 134.5 283', line(1.6)) +
      p('M113 287.5Q117 290 121.5 288M126.5 288Q131 290 135 287.5', line(1.5)) +
      p('M110 285C113 290 113 294 112 297M138 285C135 290 135 294 136 297', line(.9)),
  });

  return { Y, O, B, N, FO: plateSVG({ frame: fr.O }), FN: plateSVG({ frame: fr.N }) };
}
