// 畫風樣張：IX 隱者
// 四色版：黃（燈光、月亮、星）、朱橘（斗篷）、藍（夜空、山）、墨（線條與暗部）
// 風格：歐洲寓言木刻——側身的長袍人物、排線表現皺褶與暗面、顏色靠疊印產生
import { SOLID, CUT, tint, line, cutLine, g255, plateSVG } from './press.js';
import { burst } from '../art/kit.js';

const SERIF = '&quot;Songti TC&quot;,&quot;Noto Serif TC&quot;,&quot;Source Han Serif TC&quot;,&quot;PMingLiU&quot;,Georgia,serif';
const P = (d, attr) => `<path d="${d}" ${attr}/>`;

// ---- 共用的輪廓 ----
// 斗篷（面向左）：兜帽尖 → 帽沿 → 胸前 → 下襬 → 背
const CLOAK = 'M148 70C138 70 130 78 129 89C133 100 139 116 143 130C143 138 142 144 140 150C130 154 122 160 119 172C114 204 106 248 98 288C116 296 136 290 156 295C176 299 194 292 212 294C210 252 204 204 194 166C190 146 186 124 176 100C170 84 160 70 148 70Z';
// 舉燈的袖子
const SLEEVE = 'M136 164C122 160 106 158 91 157L85 168C92 178 97 194 98 216C112 210 126 198 136 186Z';
const HAND = 'M91 158C87 153 80 153 78 159C76 165 82 169 87 167Z';
// 側臉：額頭 → 眉骨 → 鼻 → 唇 → 下巴
const FACE = 'M132 92C127 95 124 100 123 105L120 108C122 110 122 112 121 114L111 123C111 127 114 128 118 127L116 131L119 133L117 136C118 140 120 143 124 144L144 142L146 104Z';
const BEARD = 'M116 128C110 136 107 148 106 160C105 172 107 180 103 192C114 187 122 178 127 168C132 160 139 154 143 146L142 126C134 132 124 132 116 128Z';
const HOOD = 'M148 70C138 70 130 78 129 89C133 100 139 116 143 130C143 138 142 144 140 150L152 150C154 126 152 96 148 70Z';
const FIST = 'M192 170C186 170 184 177 187 182C190 186 198 185 200 180C202 175 198 170 192 170Z';
// 燈：提環、燈蓋、玻璃、底座
const LAMP_GLASS = 'M70 186L90 186L87 214L73 214Z';
const LAMP_CAP = 'M80 173L93 186L67 186Z';
const LAMP_BASE = 'M71 214L89 214L91 220L69 220Z';
const LAMP_ALL = 'M80 171L94 186L90 186L87 214L91 220L69 220L73 214L70 186L66 186Z';
const FLAME = 'M80 210C74 203 78 197 80 190C83 197 86 203 80 210Z';
const MOON = 'M52 34A22 22 0 1 0 74 68A17 17 0 1 1 52 34Z';
const RIDGE = 'M-4 304V262L20 232L42 250L74 204L100 238L122 226L150 256L190 228L216 250L252 214V304Z';
const SNOW = 'M74 204L61 223L70 220L76 230L83 219L91 226ZM252 214L235 231L244 229L252 238ZM190 228L179 241L188 239L194 248L201 239ZM20 232L9 247L18 244L24 252L31 243Z';
const CRAG = 'M-4 346V318L30 300L60 306L92 290L130 294L170 288L214 296L236 284L252 290V346Z';
const CRAG_SHADE = 'M-4 346V328L30 311L60 318L92 302L130 306L170 300L214 308L236 296L252 302V346Z';
const STAFF = 'M203 58C200 62 204 70 201 78C199 130 196 214 193 296';
const STARS = [[112, 40, 5], [176, 36, 6], [222, 84, 4.500], [34, 120, 4.500], [230, 150, 4], [44, 222, 3.400], [226, 200, 3.400], [96, 84, 3]];
const DOTS = [[86, 60], [24, 96], [206, 118], [216, 50], [60, 150], [236, 110], [146, 28], [20, 176], [100, 120]];

const stars = attr => STARS.map(([x, y, s]) => `${burst(x, y, s, s * .34, 4)} ${attr}/>`).join('') +
  DOTS.map(([x, y]) => `<circle cx="${x}" cy="${y}" r="1.3" ${attr}/>`).join('');
const figure = attr => P(CLOAK, attr) + P(SLEEVE, attr) + P(HAND, attr) + P(LAMP_ALL, attr) + P(FACE, attr) + P(BEARD, attr) + P(FIST, attr);

// 排線：兩條引導線之間平均插入 n 條線
function hatch(x0, y0, x1, y1, dx0, dy0, dx1, dy1, n, bend = 0) {
  let d = '';
  for (let i = 0; i < n; i++) {
    const t = n === 1 ? 0 : i / (n - 1), ax = x0 + dx0 * t, ay = y0 + dy0 * t, bx = x1 + dx1 * t, by = y1 + dy1 * t;
    d += `M${ax.toFixed(1)} ${ay.toFixed(1)}Q${((ax + bx) / 2 + bend).toFixed(1)} ${((ay + by) / 2).toFixed(1)} ${bx.toFixed(1)} ${by.toFixed(1)}`;
  }
  return d;
}

function frame(card) {
  const t = `font-family="${SERIF}" text-anchor="middle"`;
  const N =
    `<rect x="10" y="10" width="280" height="480" rx="9" ${line(2.6)}/>` +
    `<path d="M26 400V98a40 40 0 0 1 40 -40h168a40 40 0 0 1 40 40v302z" ${line(2.8)}/>` +
    `<text x="152.5" y="43" ${t} font-size="20" font-weight="700" letter-spacing="5" ${SOLID}>${card.romanNumeral}</text>` +
    `<text x="156" y="450" ${t} font-size="31" font-weight="900" letter-spacing="12" ${SOLID}>${card.nameZh}</text>` +
    `<text x="152" y="474" ${t} font-size="11.500" font-weight="900" letter-spacing="3.600" ${SOLID}>${card.nameEn.toUpperCase()}</text>` +
    `<path d="M40 412h220" ${line(1)}/>`;
  const O =
    `<rect x="16.500" y="16.500" width="267" height="467" rx="5" ${line(1.3)}/>` +
    `${burst(64, 36, 6, 2, 4)} ${SOLID}/>${burst(236, 36, 6, 2, 4)} ${SOLID}/>` +
    `${burst(52, 444, 4.5, 1.6, 4)} ${SOLID}/>${burst(248, 444, 4.5, 1.6, 4)} ${SOLID}/>`;
  return { N, O };
}

export function hermitPlates(card) {
  const fr = frame(card);

  // ---- 藍：夜空（上深下淺的網點漸層）、遠山、前景岩石 ----
  const B = plateSVG({
    defs:
      `<linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${g255(.78)}"/><stop offset=".8" stop-color="${g255(.34)}"/></linearGradient>` +
      `<radialGradient id="hole" cx="80" cy="200" r="64" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#000" stop-opacity=".9"/><stop offset=".55" stop-color="#000" stop-opacity=".45"/><stop offset="1" stop-color="#000" stop-opacity="0"/></radialGradient>`,
    art:
      `<rect x="-2" y="-2" width="252" height="346" fill="url(#sky)"/>` +
      P(RIDGE, tint(.9)) + P(SNOW, CUT) +
      `<circle cx="80" cy="200" r="64" fill="url(#hole)"/>` +      // 燈光把夜色推開
      P(CRAG, SOLID) +
      P(MOON, CUT) + stars(CUT) + figure(CUT) + P(STAFF, cutLine(4.6)),
  });

  // ---- 黃：燈、光暈、月亮與星星，以及照在人身上的光 ----
  let rays = '';
  for (let i = 0; i < 14; i++) {
    const a = (i * 360 / 14 + 8) * Math.PI / 180, r1 = 27, r2 = i % 2 ? 37 : 44;
    rays += `M${(80 + r1 * Math.cos(a)).toFixed(1)} ${(200 + r1 * Math.sin(a)).toFixed(1)}L${(80 + r2 * Math.cos(a)).toFixed(1)} ${(200 + r2 * Math.sin(a)).toFixed(1)}`;
  }
  const Y = plateSVG({
    defs: `<radialGradient id="glow" cx="80" cy="200" r="78" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="${g255(.95)}"/><stop offset=".4" stop-color="${g255(.6)}"/><stop offset="1" stop-color="${g255(0)}"/></radialGradient>`,
    art:
      `<circle cx="80" cy="200" r="78" fill="url(#glow)" style="mix-blend-mode:lighten"/>` +
      P(rays, line(1.5)) +
      P(MOON, SOLID) + stars(SOLID) +
      P(LAMP_GLASS, SOLID) +
      // 迎光面：兜帽與斗篷前緣、袖子上緣、臉
      P('M129 89C133 100 139 116 143 130C143 138 142 144 140 150C130 154 122 160 119 172C114 204 106 248 98 288L113 292C116 250 122 208 128 178C136 166 150 158 152 146C152 120 146 96 138 76Z', tint(.6)) +
      P('M136 164C122 160 106 158 91 157L88 164C104 166 120 170 134 176Z', tint(.6)) +
      P(FACE, tint(.3)) + P(HAND, tint(.3)) +
      `<ellipse cx="74" cy="303" rx="64" ry="9" ${tint(.5)}/>`,
  });

  // ---- 朱橘：斗篷、火焰、膚色 ----
  const O = plateSVG({
    frame: fr.O,
    art:
      P(CLOAK, SOLID) + P(FACE, CUT) + P(FACE, tint(.3)) + P(HOOD, SOLID) +
      P(SLEEVE, SOLID) + P(BEARD, CUT) + P(HAND, tint(.34)) + P(FIST, CUT) + P(FIST, tint(.34)) +
      P(FLAME, SOLID) +
      `<ellipse cx="89" cy="163" rx="4" ry="6.500" transform="rotate(-12 89 163)" ${CUT}/>`,
  });

  // ---- 墨：輪廓、排線、暗部 ----
  const cloakFolds =
    'M150 82C158 120 168 200 176 292M138 152C144 196 148 246 142 291M127 178C127 222 124 258 119 289M160 98C170 130 180 168 186 200';
  const N = plateSVG({
    defs: `<linearGradient id="night" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${g255(.5)}"/><stop offset=".46" stop-color="${g255(0)}"/></linearGradient>`,
    frame: fr.N,
    art:
      // 夜空頂端再壓一層墨的細網
      `<rect x="-2" y="-2" width="252" height="346" fill="url(#night)"/>` + P(MOON, CUT) + stars(CUT) +
      // 遠山：稜線與背光面的排線
      P('M-4 262L20 232L42 250L74 204L100 238L122 226L150 256L190 228L216 250L252 214', line(1.5)) +
      P(hatch(76, 210, 86, 262, 22, 28, 30, 6, 8) + hatch(192, 234, 198, 270, 20, 18, 26, 4, 6) + hatch(22, 238, 26, 268, 16, 12, 22, 2, 5), line(.8)) +
      // 前景岩石
      P(CRAG_SHADE, tint(.56)) +
      P('M-4 318L30 300L60 306L92 290L130 294L170 288L214 296L236 284L252 290', line(2.2)) +
      P('M30 300L36 322L24 346M92 290L84 314L98 346M170 288L176 316L160 346M214 296L206 322L222 346M60 306L64 330M130 294L128 320L140 346M236 284L240 312', line(1.2)) +
      P(hatch(38, 322, 30, 344, 40, 0, 44, 0, 7) + hatch(104, 314, 108, 344, 46, 0, 40, 0, 8) + hatch(184, 318, 176, 344, 24, 0, 28, 0, 5), line(.8)) +
      // 手杖
      P(STAFF, line(3.600)) + P('M197 120l8 2M195 230l8 1', line(1.400)) +
      // 斗篷：背光面的網點、皺褶與排線
      figure(CUT) +
      P('M150 72C160 96 166 124 166 150C174 200 180 250 184 294C194 296 204 293 212 294C210 252 204 204 194 166C190 146 186 124 176 100C170 84 160 72 150 72Z', tint(.52)) +
      P('M136 186C126 198 112 210 98 216C98 204 96 192 92 182C106 180 122 182 136 186Z', tint(.44)) +
      P(CLOAK, line(2.400)) +
      P('M150 72C160 96 166 124 166 150C174 200 180 250 184 294M150 152C151 200 147 250 139 293M128 182C124 222 118 258 111 291', line(1.500)) +
      P('M119 196C140 205 172 205 199 195', line(2.200)) + P('M146 203C144 214 146 226 142 238M150 203C152 214 150 224 153 234', line(1.300)) +
      P(hatch(170, 110, 190, 288, 14, 40, 16, 4, 8, 5) + hatch(154, 216, 150, 288, 12, 0, 18, 2, 5, 3) + hatch(122, 214, 106, 286, 10, 0, 14, 2, 4, -2), line(.850)) +
      P('M98 288C116 296 136 290 156 295C176 299 194 292 212 294', line(2.700)) +
      // 臉：側面輪廓、眼、眉、顴骨
      P('M132 92C127 95 124 100 123 105L120 108C122 110 122 112 121 114L111 123C111 127 114 128 118 127L116 131L119 133L117 136', line(1.800)) +
      P('M119 107C123 103 129 103 134 107', line(2.400)) + P('M123 112C126 111 129 112 131 114', line(1.700)) + P('M124 113.500l4 .8', line(1.200)) +
      P('M127 120C130 124 130 128 127 131M136 112C138 118 138 124 136 130', line(.850)) +
      // 兜帽前緣與裡面的暗處
      P('M131 92C136 102 141 116 143 130L141 142C141 126 137 108 131 96Z', SOLID) +
      P('M129 89C133 100 139 116 143 130C143 138 142 144 140 150', line(2.200)) +
      // 袖子與手
      P(SLEEVE, line(2.200)) + P('M100 170C104 182 106 196 106 208M112 168C117 178 120 190 121 200M124 168C128 176 130 184 131 190', line(1)) +
      P(HAND, line(1.600)) + P('M82 158l-1 8M86 158l0 9', line(.8)) +
      `<ellipse cx="89" cy="163" rx="4" ry="6.500" transform="rotate(-12 89 163)" ${line(1.300)}/>` +
      P(FIST, line(1.600)) + P('M188 174l10 -1M188 178l11 -1', line(.8)) +
      // 鬍子
      P(BEARD, line(1.700)) + P('M116 128C122 133 131 132 138 126', line(1.600)) +
      P('M113 138C110 152 111 168 106 186M119 139C118 154 117 166 112 180M125 140C125 152 123 162 119 172M131 139C132 148 130 156 127 163M137 136C138 143 137 148 135 153', line(.9)) +
      // 鞋尖
      P('M99 289C95 291 91 293 89 297L108 297L110 291Z', SOLID) +
      // 提燈
      P('M80 167a3.500 3.500 0 1 0 .1 0', line(1.500)) + P(LAMP_CAP, SOLID) + P(LAMP_BASE, SOLID) +
      P(LAMP_GLASS, line(1.800)) + P('M80 186V214M71 200H89', line(.8)),
  });

  return { Y, O, B, N };
}
