// 0 愚者：歐洲寓言木刻。
// 年輕旅人站在懸崖邊，抬頭望向遠方；手持白玫瑰，肩上扛著杖與包袱；小白犬在身後躍起；背後是太陽，崖外遠山。
// 色版：杏黃（天空、太陽、褲襪）、赭紅（靴、羽毛、包袱、衣上花紋）、灰綠（外衣、帽、岩石、遠山）、深褐墨
// 遮擋次序：天空 → 太陽 → 遠山 → 崖 → 包袱與杖 → 小狗 → 後腿 → 前腿 → 外衣 → 遠側手 → 頭 → 近側手臂 → 玫瑰
import { SOLID, CUT, tint, line, cutLine, g255, plateSVG, INKS } from './press.js';
import { printFrame } from './frame.js';

export const FOOL_INKS = {
  Y: { rgb: [242, 186, 96], angle: 8, strength: .94 },
  O: { rgb: [190, 74, 50], angle: 68, strength: .95 },
  B: { rgb: [104, 138, 118], angle: 22, strength: .95 },
  N: { rgb: [42, 34, 44], angle: 45, strength: .97 },
  FO: INKS.O,
  FN: { ...INKS.N, fixedRegistration: true },
};
// 臉、玫瑰、小狗頭：減少飛白（牌面座標）
export const FOOL_QUIET = [{ x: 158, y: 162, rx: 20, ry: 22 }, { x: 205, y: 185, rx: 16, ry: 16 }, { x: 118, y: 282, rx: 18, ry: 13 }];

const p = (d, a) => `<path d="${d}" ${a}/>`;
const hatch = (x, y, dx, dy, n, stepX, stepY) => Array.from({ length: n }, (_, i) => `M${x + i * stepX} ${y + i * stepY}l${dx} ${dy}`).join('');

// ---- 場景 ----
const SUN = { x: 50, y: 56, r: 26 };
const MOUNTS = 'M150 346V300L172 268L190 284L214 250L234 270L252 260V346Z';
const SNOW = 'M172 268L164 280L171 278L175 285L180 277L184 280ZM214 250L205 263L212 261L216 268L221 260L226 264Z';
const CLIFF = 'M-4 346V292C30 286 70 290 110 286C140 284 162 287 178 291L184 300L177 312L187 326L181 346Z';
const CLIFF_FACE = 'M150 288C162 287 172 289 178 291L184 300L177 312L187 326L181 346L150 346Z';

// ---- 人物（面向右、三分之二側身）----
const HEAD = 'M116 100C116 88 124 82 134 84C142 86 146 93 145 100L149 106L145 109L146 114C143 120 136 124 128 123C120 122 116 112 116 100Z';
const HAIR = 'M117 94C112 100 112 112 117 120L124 116C121 110 120 102 122 96Z';
const CAP = 'M113 97C112 85 122 77 135 79C142 81 147 86 148 91C137 88 125 91 113 97Z';
const FEATHER = 'M119 86C111 72 103 60 94 50C106 55 117 66 125 82Z';
const NECK = 'M124 120L135 120L136 131L123 131Z';
const TUNIC = 'M109 132C120 126 140 126 151 132L156 176C163 192 168 206 167 222C151 228 111 228 93 222C95 206 100 192 106 176Z';
const BELT = 'M104 174C120 178 140 178 157 174L158 182C140 186 120 186 103 182Z';
const BACK_LEG = 'M108 218L128 218L123 285L107 285Z';
const BACK_BOOT = 'M105 282L125 282L127 292L99 292C99 288 101 284 105 282Z';
const FRONT_LEG = 'M136 218L155 218L163 256L171 281L160 285L150 258Z';
const FRONT_BOOT = 'M158 279L172 276L178 284L177 290L158 290Z';
const SLEEVE = 'M139 133C150 133 158 141 160 155L169 145L176 151L162 172C156 177 148 173 145 166L136 146Z';
const HAND = 'M167 147C169 141 176 140 179 144C181 149 177 154 171 153Z';
const FAR_HAND = 'M121 150C123 144 131 144 133 149C135 155 129 159 124 157Z';
const STAFF = 'M131 156L62 98';
const BUNDLE = 'M66 98C57 100 50 111 52 123C54 134 69 139 80 133C89 127 87 112 77 104Z';
// 白玫瑰：花在手上方，莖從手中伸出
const ROSE = { x: 177, y: 132, r: 7 };
const STEM = 'M174 148C176 144 178 141 179 138';

// ---- 小白犬（側面朝右，四腳站立、抬起近側前腳、仰頭看主人）----
// 獵犬型：胸深、腰收、腿長、口鼻長、耳朵豎起、長尾上翹
const DOG_TAIL = 'M35 254C26 250 20 242 20 231C23 240 27 246 37 249Z';
const DOG_HIND_FAR = 'M48 262L55 262L57 278L55 288L59 292L50 292L49 280Z';
const DOG_FRONT_FAR = 'M76 266L83 266L84 288L87 292L75 292L77 288Z';
const DOG_BODY = 'M36 252C44 246 62 246 78 244C86 243 92 248 94 256C94 264 90 270 84 272C76 274 70 270 64 266C56 264 50 264 44 266C38 266 33 262 33 257C33 255 34 253 36 252Z';
const DOG_HIND = 'M34 255C30 265 35 272 42 274L40 288L36 292L47 292L47 286L50 272C52 265 50 258 44 254Z';
const DOG_FRONT = 'M84 264L92 265L98 273L104 271L106 275L98 279L89 273Z';
const DOG_NECK = 'M76 246C80 238 86 231 92 227L102 231C100 239 98 247 94 255L86 254Z';
const DOG_HEAD = 'M88 228C88 220 94 215 101 216C105 217 108 220 109 223L118 224C121 225 121 229 118 230L108 232C104 236 96 237 92 235C89 233 88 231 88 228Z';
const DOG_EAR_FAR = 'M99 217L100 205L106 216Z';
const DOG_EAR = 'M94 218L91 206L101 215Z';
// 只描露在外面的輪廓：接到身體、頭的那一側不描，交接處才不會有框線穿過
const DOG_NECK_LINE = 'M76 246C80 238 86 231 92 227M102 231C100 239 98 247 94 255';
const DOG_HEAD_LINE = 'M89 231C88 230 88 229 88 228C88 220 94 215 101 216C105 217 108 220 109 223L118 224C121 225 121 229 118 230L108 232C104 236 98 237 94 236';
const DOG_EAR_LINE = 'M94 218L91 206L101 215';
const DOG_FRONT_LINE = 'M87 270L89 273L98 279L106 275L104 271L98 273L93 266';
const DOG_HIND_LINE = 'M34 255C30 265 35 272 42 274L40 288L36 292L47 292L47 286L50 272C52 265 50 258 44 254';
const dog = a => '<g transform="translate(-12 0)">' + p(DOG_TAIL, a) + p(DOG_HIND_FAR, a) + p(DOG_FRONT_FAR, a) + p(DOG_BODY, a) +
  p(DOG_HIND, a) + p(DOG_FRONT, a) + p(DOG_NECK, a) + p(DOG_HEAD, a) + p(DOG_EAR_FAR, a) + p(DOG_EAR, a) + '</g>';

const legs = a => p(BACK_LEG, a) + p(BACK_BOOT, a) + p(FRONT_LEG, a) + p(FRONT_BOOT, a);
const body = a => p(TUNIC, a) + p(NECK, a) + p(HEAD, a) + p(HAIR, a) + p(CAP, a) + p(FEATHER, a) + p(SLEEVE, a) + p(HAND, a) + p(FAR_HAND, a);
const ROSE_PETALS = 'M174.8 120.2Q179.0 112.5 183.2 120.2Q192.8 122.5 186.8 128.9Q187.5 138.7 179.6 135.0Q170.5 138.7 171.6 130.0Q165.2 122.5 173.9 120.9Z';
const rose = a => `<g data-symbol="white-rose"><path d="${ROSE_PETALS}" ${a}/></g>`;
const figure = a => legs(a) + body(a) + rose(a);
const props = a => p(BUNDLE, a);

// 太陽：直的長芒與波浪短芒交替
function sunRays() {
  let straight = '', wavy = '';
  for (let i = 0; i < 16; i++) {
    const t = (i * 22.5) * Math.PI / 180, c = Math.cos(t), s = Math.sin(t), nx = -s, ny = c;
    const at = (r, o = 0) => `${(SUN.x + r * c + o * nx).toFixed(1)} ${(SUN.y + r * s + o * ny).toFixed(1)}`;
    if (i % 2 === 0) straight += `M${at(31, 2.2)}L${at(46)}L${at(31, -2.2)}Z`;
    else wavy += `M${at(31)}Q${at(35, 3)} ${at(38)}T${at(44)}`;
  }
  return { straight, wavy };
}
// 外衣上的圓形花紋（輪中花）
const MEDALLIONS = [[116, 150], [138, 148], [110, 196], [132, 198], [152, 206], [124, 212], [104, 208]];
const medallions = a => MEDALLIONS.map(([x, y]) => `<circle cx="${x}" cy="${y}" r="6" ${a}/>`).join('');
const medallionMarks = MEDALLIONS.map(([x, y]) => `M${x - 3} ${y}h6M${x} ${y - 3}v6`).join('');

export function foolPlates(card) {
  const fr = printFrame(card);
  const rays = sunRays();

  // ---- 杏黃：天空、太陽、褲襪、膚色、內襯、狗的暖影 ----
  const Y = plateSVG({
    defs: `<linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop stop-color="${g255(.78)}"/><stop offset="1" stop-color="${g255(.38)}"/></linearGradient>`,
    art:
      '<rect x="-3" y="-3" width="254" height="300" fill="url(#sky)"/>' +
      `<circle cx="${SUN.x}" cy="${SUN.y}" r="${SUN.r}" ${SOLID}/>` + p(rays.straight, SOLID) + p(rays.wavy, line(1.6)) +
      p(MOUNTS, CUT) + p(CLIFF, tint(.45)) + p(CLIFF_FACE, CUT) +
      props(CUT) + p(STAFF, cutLine(4.5)) + dog(CUT) + figure(CUT) +
      p(BACK_LEG, SOLID) + p(FRONT_LEG, SOLID) +
      p(HEAD, tint(.3)) + p(NECK, tint(.3)) + p(HAND, tint(.3)) + p(FAR_HAND, tint(.3)) + p(HAIR, SOLID) +
      p(BELT, SOLID) + p(DOG_BODY, tint(.12)) + rose(tint(.12)) + dog(CUT),
  });

  // ---- 赭紅：靴、羽毛、包袱、衣上花紋、杖、膚色的紅 ----
  const O = plateSVG({
    art:
      `<circle cx="${SUN.x}" cy="${SUN.y}" r="${SUN.r}" ${tint(.2)}/>` +
      props(SOLID) + p(STAFF, line(3.2)) + dog(CUT) + figure(CUT) +
      p(BACK_BOOT, SOLID) + p(FRONT_BOOT, SOLID) + p(FEATHER, SOLID) +
      medallions(SOLID) + p('M156 160L169 145L176 151L163 170Z', tint(.55)) + p(HEAD, tint(.2)) + p(HAND, tint(.2)) + p(FAR_HAND, tint(.2)) + p(HAIR, tint(.45)) +
      `<circle cx="140" cy="108" r="3.2" ${tint(.4)}/>` + dog(CUT),
  });

  // ---- 灰綠：遠山、崖、外衣、帽、狗的冷影 ----
  const B = plateSVG({
    defs: `<linearGradient id="haze" x1="0" y1="0" x2="0" y2="1"><stop stop-color="${g255(.3)}"/><stop offset="1" stop-color="${g255(.7)}"/></linearGradient>`,
    art:
      p(MOUNTS, 'fill="url(#haze)" style="mix-blend-mode:lighten"') + p(SNOW, CUT) +
      p(CLIFF, tint(.55)) + p(CLIFF_FACE, SOLID) +
      props(CUT) + p(STAFF, cutLine(4.5)) + dog(CUT) + figure(CUT) +
      p(TUNIC, SOLID) + medallions(CUT) + medallions(tint(.35)) + p(SLEEVE, SOLID) + p(CAP, SOLID) + p(BELT, CUT) + dog(CUT),
  });

  // ---- 墨：輪廓、排線、暗面 ----
  const N = plateSVG({
    defs:
      `<clipPath id="cTunic"><path d="${TUNIC}"/></clipPath><clipPath id="cCliff"><path d="${CLIFF_FACE}"/></clipPath>` +
      `<clipPath id="cTop"><path d="${CLIFF}"/></clipPath><clipPath id="cMounts"><path d="${MOUNTS}"/></clipPath>` +
      `<clipPath id="cDog"><path d="${DOG_BODY}"/></clipPath><clipPath id="cBundle"><path d="${BUNDLE}"/></clipPath>` +
      `<clipPath id="cBack"><path d="${BACK_LEG}"/></clipPath><clipPath id="cFront"><path d="${FRONT_LEG}"/></clipPath>` +
      `<clipPath id="cSleeve"><path d="${SLEEVE}"/></clipPath><clipPath id="cHead"><path d="${HEAD}"/></clipPath>`,
    art:
      // 太陽輪廓
      `<circle cx="${SUN.x}" cy="${SUN.y}" r="${SUN.r}" ${line(2)}/>` + p(rays.straight, line(1)) + p(rays.wavy, line(1.1)) +
      // 遠山：稜線與背光面
      p('M150 300L172 268L190 284L214 250L234 270L252 260', line(1.5)) + p(SNOW, line(.9)) +
      `<g clip-path="url(#cMounts)">${p(hatch(176, 274, 10, 26, 6, 3, 1.4) + hatch(218, 256, 12, 30, 8, 3, 1.4), line(1))}</g>` +
      // 崖頂：草與石
      p(CLIFF, CUT) +
      `<g clip-path="url(#cTop)">${p(hatch(-2, 306, 14, -4, 10, 0, 4.2) + hatch(60, 302, 16, -4, 6, 0, 4.4), line(1))}</g>` +
      p('M-4 292C30 286 70 290 110 286C140 284 162 287 178 291', line(2.2)) +
      p('M14 300l3-10l5 9M34 296l4-8M78 304l4-11l5 10M140 300l3-8l4 7M24 330C28 322 40 322 44 330ZM96 336C100 330 110 330 112 336', line(1.2)) +
      // 崖面：直斜刻線，越往下越密
      `<g clip-path="url(#cCliff)">${p('M160 290L190 290L190 346L166 346Z', tint(.45)) + p(hatch(152, 292, 8, 54, 9, 4, 0) + hatch(162, 312, 6, 34, 7, 3, 0), line(1))}</g>` +
      p('M178 291L184 300L177 312L187 326L181 346', line(2.4)) + p('M164 296L170 316L162 334M172 318L178 340', line(1.3)) +
      // 杖與包袱：包袱下半背光
      props(CUT) + p(STAFF, line(3.4)) +
      `<g clip-path="url(#cBundle)">${p('M50 118C60 128 74 130 90 120V140H50Z', tint(.45)) + p(hatch(54, 118, 12, 18, 7, 4, 0), line(1))}</g>` +
      p(BUNDLE, line(2.2)) + p('M62 100C66 96 72 96 76 101M68 99L64 92M70 99L76 92', line(1.4)) +
      p('M60 112C66 118 76 118 82 112', line(1)) +
      // 後腿（負重）與前腿（試探步）：背光面排線
      legs(CUT) +
      `<g clip-path="url(#cBack)">${p('M108 218L114 218L111 286L106 286Z', tint(.5)) + p(hatch(108, 226, 6, 4, 12, 0, 5), line(1))}</g>` +
      `<g clip-path="url(#cFront)">${p('M136 218L143 218L156 266L150 268Z', tint(.5)) + p(hatch(138, 226, 6, 3, 12, 1.4, 5), line(1))}</g>` +
      p(BACK_LEG, line(2.2)) + p(FRONT_LEG, line(2.2)) + p('M152 252C156 254 160 254 163 252M112 252C116 254 120 254 123 252', line(1.2)) +
      p(BACK_BOOT, SOLID) + p(FRONT_BOOT, line(2.2)) + p('M162 284H176', line(1)) +
      // 外衣：左側背光、腰帶下的暗影、裙襬褶
      p(TUNIC, CUT) +
      `<g clip-path="url(#cTunic)">${p('M90 130L118 130L114 176L104 240H86Z', tint(.46)) + p('M100 184C120 188 140 188 158 184L160 192C140 196 120 196 100 192Z', tint(.5)) +
        p(hatch(94, 136, 12, 10, 12, 1.2, 8.6) + hatch(140, 190, 6, 12, 5, 4, 1), line(1))}</g>` +
      p(TUNIC, line(2.5)) + medallions(line(1.2)) + p(medallionMarks, line(.9)) +
      p('M118 186C115 200 110 212 106 224M134 188C134 202 132 214 131 226M148 186C153 198 158 210 160 222', line(1.4)) +
      p(BELT, SOLID) + p('M93 222C111 228 151 228 167 222', line(2.6)) +
      // 遠側手握杖
      p(FAR_HAND, CUT) + p(FAR_HAND, line(1.6)) + p('M124 151l7 -1M124 154l7 -1', line(.8)) +
      // 頭：側臉抬起望向遠方；帽與羽毛
      p(NECK, CUT) + p('M131 120L136 120L136 131L131 131Z', tint(.4)) + p('M124 121L123 131M135 121L136 131', line(1.6)) +
      p(HEAD, CUT) + `<g clip-path="url(#cHead)">${p('M114 104L124 104L126 126L114 126Z', tint(.35))}</g>` +
      p('M145 100L149 106L145 109L146 114C143 120 136 124 128 123C121 122 117 113 116 104', line(1.9)) +
      p('M134 97C137 95 141 95 143 97', line(1.9)) + p('M136.5 101h3', line(1.8)) + p('M141 115C142 116 143 116 144 115', line(1.2)) +
      p('M128 108C130 112 130 116 128 118', line(.9)) +
      p(HAIR, CUT) + p(HAIR, line(1.6)) + p('M118 100L117 112M120 98L120 114', line(.9)) +
      p(CAP, CUT) + p(CAP, line(2)) + p(hatch(116, 92, 12, -6, 5, 2.4, -1.2), line(.9)) +
      p(FEATHER, CUT) + p(FEATHER, line(1.6)) + p('M122 82C114 70 106 60 97 52', line(.9)) +
      // 近側手臂與手：袖口背光
      p(SLEEVE, CUT) +
      `<g clip-path="url(#cSleeve)">${p('M136 150L150 172L162 172L146 178Z', tint(.45)) + p(hatch(140, 152, 8, 12, 5, 3, 1), line(1))}</g>` +
      p(SLEEVE, line(2.2)) + p('M148 140C152 148 154 156 154 162', line(1.2)) +
      p(HAND, CUT) + p(HAND, line(1.6)) + p('M170 147l6 -1M171 150l6 -1', line(.8)) +
      // 白玫瑰：花瓣螺旋、莖與葉
      p(STEM, line(1.4)) + p('M176 142C180 140 183 142 182 145C179 146 177 145 176 142Z', line(1.1)) +
      rose(CUT) + rose(line(1.6)) +
      p('M172 127C175 134 183 134 186 127', line(1.1)) + p('M179.5 126.5C178 126.5 177.5 124.5 179 124C181.5 123.5 182.5 126.5 181 128C179 130 175.5 128.5 175.5 125.5C175.5 122 179 120.5 182 121.5', line(1)) + p('M170 122C171 119 173 118 175 118M188 122C187 119 185 118 183 118', line(.8)) +
      // 小白犬：由後往前印——尾巴、遠側腿 → 身體 → 近側後腿 → 頸 → 遠側耳 → 頭 → 近側耳 → 近側前腳
      // 每個部位先用紙色蓋掉後方的線，再描自己露在外面的輪廓
      dog(CUT) + '<g transform="translate(-12 0)">' +
      p(DOG_TAIL, line(1.8)) +
      p(DOG_HIND_FAR, CUT) + p(DOG_HIND_FAR, tint(.4)) + p(DOG_HIND_FAR, line(1.7)) +
      p(DOG_FRONT_FAR, CUT) + p(DOG_FRONT_FAR, tint(.4)) + p(DOG_FRONT_FAR, line(1.7)) +
      p(DOG_BODY, CUT) +
      `<g clip-path="url(#cDog)">${p('M40 262C54 261 68 266 86 268V280H40Z', tint(.34)) + p(hatch(52, 263, 3, 7, 6, 5, .8), line(.9))}</g>` +
      p(DOG_BODY, line(2.2)) + p('M86 258L88 264M90 257L92 262', line(.9)) +
      p(DOG_HIND, CUT) + p(DOG_HIND_LINE, line(2)) + p('M38 263C41 266 45 267 48 264M40 290v-2', line(1)) +
      p(DOG_NECK, CUT) + p(DOG_NECK_LINE, line(2)) + p('M92 234C94 241 94 248 92 253', line(1.1)) +
      p(DOG_EAR_FAR, CUT) + p(DOG_EAR_FAR, tint(.4)) + p(DOG_EAR_FAR, line(1.5)) +
      p(DOG_HEAD, CUT) + p(DOG_HEAD_LINE, line(2)) + p('M108 224C106 226 106 229 108 231', line(1)) +
      p('M117.5 225.5a2 2 0 1 0 .1 0', SOLID) + p('M108 230.5L115 229.5', line(1.1)) +
      p('M99 221.5C100.5 220.5 102.5 220.5 103.5 222C102 222.8 100.5 222.8 99 221.5Z', SOLID) +
      p(DOG_EAR, CUT) + p(DOG_EAR_LINE, line(1.6)) + p('M94 216L93 210', line(.8)) +
      p(DOG_FRONT, CUT) + p(DOG_FRONT_LINE, line(1.8)) + p('M100 273l1 3M80 290v-2', line(.9)) +
      '</g>',
  });

  return { Y, O, B, N, FO: plateSVG({ frame: fr.O }), FN: plateSVG({ frame: fr.N }) };
}
