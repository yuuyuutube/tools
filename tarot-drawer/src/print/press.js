// 絹印引擎：把每一色的「版」印到紙上，算出整張牌的點陣圖。
// 手法參考 retro-printer 的刮印引擎與 stamp-tour 的蓋章：每個像素各自算墨量，再以相乘疊在紙色上。
//
// 版（plate）是一張 300 × 500 的 SVG，黑底：
//   紅色通道 = 實地（滿版墨）
//   綠色通道 = 網點的濃度（0～255 → 0～100%）
// 一張牌有幾色就有幾張版。這裡負責：
//   邊緣抖動與滲墨（墨往外暈、細處黏在一起、轉角變圓）
//   細網網點（每一色各自的網角）
//   飛白、墨色不均、紙的凹凸吃墨
//   各色版的套色誤差
//   紙張底紋與纖維
// 亂數全部來自種子：同一個種子印出來的每一個像素都一樣。
import { seeded } from '../engine/random.js';

export const CW = 300, CH = 500;

export const INKS = {
  Y: { rgb: [255, 204, 36], angle: 8, strength: .92 },
  O: { rgb: [255, 84, 46], angle: 68, strength: .92 },
  B: { rgb: [0, 118, 190], angle: 22, strength: .92 },
  N: { rgb: [30, 40, 74], angle: 45, strength: .97 },
};
export const PRINT_ORDER = ['Y', 'O', 'B', 'N'];
export const PAPER = [246, 239, 224];

export const TUNE = {
  period: 2.1,      // 網點間距（牌面單位）：細網
  jitter: 1.0,      // 邊緣大波浪（牌面單位）
  jitterFine: .42,  // 邊緣細碎的抖動
  bleed: .24,       // 滲墨：門檻隨噪聲上下的幅度
  speckle: .86,     // 飛白門檻：越低白點越多
  misregister: 1.5, // 套色誤差上限（牌面單位）
};

const smooth = (a, b, x) => { const t = x <= a ? 0 : x >= b ? 1 : (x - a) / (b - a); return t * t * (3 - 2 * t); };

// 數值噪聲：回傳 (x, y) => 0..1
function makeNoise(rnd, W, H, cell) {
  const gw = Math.ceil(W / cell) + 2, gh = Math.ceil(H / cell) + 2, g = new Float32Array(gw * gh), ic = 1 / cell;
  for (let i = 0; i < g.length; i++) g[i] = rnd();
  return (x, y) => {
    const fx = x * ic, fy = y * ic, ix = fx | 0, iy = fy | 0;
    let tx = fx - ix, ty = fy - iy;
    tx = tx * tx * (3 - 2 * tx); ty = ty * ty * (3 - 2 * ty);
    const k = iy * gw + ix, a = g[k], b = g[k + 1], c = g[k + gw], d = g[k + gw + 1];
    return a + (b - a) * tx + (c - a + (d - c - (b - a)) * tx) * ty;
  };
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('版載入失敗'));
    img.src = src;
  });
}

async function rasterPlate(svg, W, H) {
  const img = await loadImage('data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg));
  const cv = document.createElement('canvas');
  cv.width = W; cv.height = H;
  const g = cv.getContext('2d', { willReadFrequently: true });
  g.fillStyle = '#000'; g.fillRect(0, 0, W, H);
  g.drawImage(img, 0, 0, W, H);
  return g.getImageData(0, 0, W, H).data;
}

// plates：{ Y: svg, O: svg, B: svg, N: svg }（缺的顏色就不印）
// 回傳畫好的 canvas（寬 300 × scale）
export async function printCard(plates, { seed = 1, scale = 2, quietAreas = [], inks = INKS, tune = {} } = {}) {
  const tuning = { ...TUNE, ...tune };
  const W = Math.round(CW * scale), H = Math.round(CH * scale), n = W * H;
  const rnd = seeded(seed);
  const R = new Float32Array(n), G = new Float32Array(n), Bc = new Float32Array(n);

  // 紙：大片的色差、細顆粒，以及會讓墨吃不進去的凹凸（tooth）
  const pLow = makeNoise(rnd, W, H, 70 * scale), pMid = makeNoise(rnd, W, H, 3.2 * scale);
  const tooth = new Float32Array(n);
  for (let y = 0, i = 0; y < H; y++) for (let x = 0; x < W; x++, i++) {
    const t = rnd(); tooth[i] = t;
    const v = 1 - .028 * pLow(x, y) - .03 * pMid(x, y) - .035 * t * t;
    R[i] = PAPER[0] * v; G[i] = PAPER[1] * v; Bc[i] = PAPER[2] * (v - .012 * pLow(x, y));
  }

  // 額外色版（例如固定色的共用牌框）依傳入順序，接在插畫四色之後。
  const printOrder = [...PRINT_ORDER, ...Object.keys(plates).filter(key => !PRINT_ORDER.includes(key))];
  for (const key of printOrder) {
    if (!plates[key]) continue;
    const ink = inks[key], data = await rasterPlate(plates[key], W, H);
    const cr = ink.rgb[0] / 255, cg = ink.rgb[1] / 255, cb = ink.rgb[2] / 255;
    // 套色誤差：主版（墨線）不動，其他色版各偏一點
    const mis = (key === 'N' || ink.fixedRegistration) ? 0 : tuning.misregister * scale, ang = rnd() * Math.PI * 2, len = .45 + rnd() * .55;
    const ox = Math.cos(ang) * len * mis, oy = Math.sin(ang) * len * mis;
    const nJx = makeNoise(rnd, W, H, 34 * scale), nJy = makeNoise(rnd, W, H, 34 * scale);
    const nFx = makeNoise(rnd, W, H, 3.4 * scale), nFy = makeNoise(rnd, W, H, 3.4 * scale);
    const nBleed = makeNoise(rnd, W, H, 7 * scale), nDen = makeNoise(rnd, W, H, 46 * scale);
    const nVoid = makeNoise(rnd, W, H, 1.5 * scale), nPatch = makeNoise(rnd, W, H, 24 * scale);
    const J = tuning.jitter * scale, JF = tuning.jitterFine * scale;
    const p = tuning.period * scale, th0 = ink.angle * Math.PI / 180, ca = Math.cos(th0) / p * 2 * Math.PI, sa = Math.sin(th0) / p * 2 * Math.PI;

    for (let y = 0, i = 0; y < H; y++) {
      for (let x = 0; x < W; x++, i++) {
        const sx = x - ox + (nJx(x, y) - .5) * 2 * J + (nFx(x, y) - .5) * 2 * JF;
        const sy = y - oy + (nJy(x, y) - .5) * 2 * J + (nFy(x, y) - .5) * 2 * JF;
        if (sx < 0 || sy < 0 || sx >= W - 1 || sy >= H - 1) continue;
        const ix = sx | 0, iy = sy | 0, k = (iy * W + ix) * 4;
        // 四個鄰點都沒有墨就跳過
        if (!(data[k] | data[k + 1] | data[k + 4] | data[k + 5] | data[k + W * 4] | data[k + W * 4 + 1] | data[k + W * 4 + 4] | data[k + W * 4 + 5])) continue;
        const tx = sx - ix, ty = sy - iy, w00 = (1 - tx) * (1 - ty), w10 = tx * (1 - ty), w01 = (1 - tx) * ty, w11 = tx * ty;
        const k2 = k + W * 4;
        const solid = (data[k] * w00 + data[k + 4] * w10 + data[k2] * w01 + data[k2 + 4] * w11) / 255;
        const tone = (data[k + 1] * w00 + data[k + 5] * w10 + data[k2 + 1] * w01 + data[k2 + 5] * w11) / 255;

        // 實地：門檻跟著噪聲浮動，墨多的地方往外暈、少的地方往內縮
        let a = 0;
        if (solid > .04) {
          const th = .42 - tuning.bleed * (nBleed(x, y) - .5);
          a = smooth(th - .11, th + .11, solid);
        }
        // 網點
        if (tone > .03 && a < 1) {
          const t = tone * (.9 + .2 * nPatch(x, y));
          const spot = .5 + .25 * (Math.cos(x * ca + y * sa) + Math.cos(-x * sa + y * ca));
          const h = t >= .97 ? 1 : smooth(1 - t - .1, 1 - t + .1, spot);
          if (h > a) a = h;
        }
        if (a <= .003) continue;

        // 局部減少飛白與紙齒，保留細小的五官、手指和燈芯。
        let quiet = 0;
        for (const { x: qx, y: qy, rx, ry } of quietAreas) {
          const distance = Math.hypot((x / scale - qx) / rx, (y / scale - qy) / ry);
          quiet = Math.max(quiet, 1 - smooth(.5, 1, distance));
        }
        // 飛白與紙的凹凸
        const v = nVoid(x, y) + .1 * (nPatch(x, y) - .5);
        a *= 1 - .92 * (1 - .8 * quiet) * smooth(tuning.speckle, tuning.speckle + .06, v);
        const t = tooth[i];
        if (t > .9) a *= 1 - (t - .9) * 4.5 * (1 - .8 * quiet);
        a *= ink.strength * (.83 + .17 * nDen(x, y));

        R[i] *= 1 - a + a * cr; G[i] *= 1 - a + a * cg; Bc[i] *= 1 - a + a * cb;
      }
    }
  }

  const cv = document.createElement('canvas');
  cv.width = W; cv.height = H;
  const g = cv.getContext('2d'), im = g.createImageData(W, H), d = im.data;
  for (let i = 0, j = 0; i < n; i++, j += 4) { d[j] = R[i]; d[j + 1] = G[i]; d[j + 2] = Bc[i]; d[j + 3] = 255; }
  g.putImageData(im, 0, 0);

  // 紙纖維：幾根淺色與深色的細毛
  g.lineCap = 'round';
  for (let i = 0; i < 520; i++) {
    const x = rnd() * W, y = rnd() * H, a = rnd() * Math.PI * 2, len = (3 + rnd() * 9) * scale, bend = (rnd() - .5) * len * .6;
    g.strokeStyle = rnd() < .55 ? `rgba(255,251,240,${.1 + rnd() * .16})` : `rgba(96,74,44,${.04 + rnd() * .07})`;
    g.lineWidth = (.25 + rnd() * .35) * scale;
    g.beginPath(); g.moveTo(x, y);
    g.quadraticCurveTo(x + Math.cos(a) * len / 2 - Math.sin(a) * bend, y + Math.sin(a) * len / 2 + Math.cos(a) * bend, x + Math.cos(a) * len, y + Math.sin(a) * len);
    g.stroke();
  }
  return cv;
}

// ---- 畫版用的小工具 ----
// 實地、網點都用 lighten 疊，互不蓋掉對方的通道；CUT 是把這一色挖掉
const LIGHTEN = 'style="mix-blend-mode:lighten"';
export const SOLID = `fill="#f00" ${LIGHTEN}`;
export const CUT = 'fill="#000"';
export const tint = t => `fill="rgb(0,${Math.round(t * 255)},0)" ${LIGHTEN}`;
export const line = (w = 2) => `fill="none" stroke="#f00" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round" ${LIGHTEN}`;
export const cutLine = (w = 2) => `fill="none" stroke="#000" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"`;
export const g255 = t => `rgb(0,${Math.round(t * 255)},0)`;

// 插畫窗格：與原本的牌框相同，原點 (26, 58)、大小 248 × 342
export const WINDOW = 'M26 400V98a40 40 0 0 1 40 -40h168a40 40 0 0 1 40 40v302z';

// 把「牌框層」與「窗格裡的插畫」組成一張版。整張先做一點點模糊，門檻化之後轉角才會像墨一樣圓
export function plateSVG({ defs = '', frame = '', art = '' }) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${CW}" height="${CH}" viewBox="0 0 ${CW} ${CH}">` +
    `<defs><filter id="soft" x="-5%" y="-5%" width="110%" height="110%"><feGaussianBlur stdDeviation=".5"/></filter>` +
    `<clipPath id="win"><path d="${WINDOW}"/></clipPath>${defs}</defs>` +
    `<g filter="url(#soft)"><rect width="${CW}" height="${CH}" fill="#000"/>` +
    `<g clip-path="url(#win)"><rect width="${CW}" height="${CH}" fill="#000"/><g transform="translate(26 58)">${art}</g></g>` +
    `${frame}</g></svg>`;
}
