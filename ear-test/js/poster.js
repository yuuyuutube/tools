/* 結果海報：固定 1080×1350 PNG，和螢幕解析度無關。
   插畫用 SVG 畫進 canvas；等字型與圖片都準備好才輸出，不會得到空白圖。 */
import { animalSVG, animalBox, flagSVG, INK } from './art.js';
import { CONFIG, STAGES } from './config.js';
import { toP, fmt } from './freq.js';

export const W = 1080, H = 1350;
const BG = '#F3EEE4', MUTE = '#8B8984', FAINT = '#CFCBC2';
const FONT = '"Helvetica Neue", Helvetica, "PingFang TC", "Noto Sans TC", "Microsoft JhengHei", Arial, sans-serif';
export const SITE = 'yuuyuutube.github.io/tools/ear-test';

function loadSVG(str) {
  return new Promise((res, rej) => {
    const img = new Image();
    img.onload = () => res(img);
    img.onerror = rej;
    img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(str);
  });
}

function fitText(ctx, text, weight, size, maxW) {
  let s = size;
  do { ctx.font = `${weight} ${s}px ${FONT}`; s -= 2; } while (ctx.measureText(text).width > maxW && s > 20);
}

function spaced(ctx, text, x, y, gap) {   // 字距（canvas letterSpacing 不是每個瀏覽器都有）
  const chars = [...text];
  const w = chars.reduce((a, c) => a + ctx.measureText(c).width, 0) + gap * (chars.length - 1);
  let cx = x - (ctx.textAlign === 'center' ? w / 2 : 0);
  const align = ctx.textAlign; ctx.textAlign = 'left';
  for (const c of chars) { ctx.fillText(c, cx, y); cx += ctx.measureText(c).width + gap; }
  ctx.textAlign = align;
}

/** r = { hz, isLimit, age, line, animal } → canvas */
export async function drawPoster(r) {
  if (document.fonts && document.fonts.ready) await document.fonts.ready;
  const b = animalBox(r.animal);
  // 動物放進 560×450 的框，等比縮放，大小一致
  const k = Math.min(560 / b.w, 450 / b.h);
  const aw = b.w * k, ah = b.h * k;
  const [animal, flag] = await Promise.all([
    loadSVG(animalSVG(r.animal, { xmlns: true, box: `${b.x} ${b.y} ${b.w} ${b.h}`, w: Math.round(aw * 2), h: Math.round(ah * 2) })),
    loadSVG(flagSVG({ size: 600, xmlns: true })),
  ]);
  const c = document.createElement('canvas');
  c.width = W; c.height = H;
  const ctx = c.getContext('2d');

  ctx.fillStyle = BG; ctx.fillRect(0, 0, W, H);
  ctx.textBaseline = 'alphabetic';

  // 標頭
  ctx.fillStyle = INK; ctx.textAlign = 'left';
  ctx.font = `600 30px ${FONT}`;
  spaced(ctx, '耳朵年齡機', 84, 120, 8);
  ctx.drawImage(flag, W - 84 - 44, 84, 44, 44);

  // 插畫：動物＋插在一旁的白旗
  // 白旗插在動物右後方，旗桿底與動物底部對齊
  const fs = Math.min(280, ah * 0.95), gap = 28;
  const groupW = aw + gap + fs * 0.62;
  const ax = (W - groupW) / 2, base = 740, ay = base - ah;
  ctx.save();
  ctx.translate(ax + aw + gap + fs * 0.1, base);
  ctx.rotate(0.12);
  ctx.drawImage(flag, -fs * 0.21, -fs * 0.94, fs, fs);
  ctx.restore();
  ctx.drawImage(animal, ax, ay, aw, ah);

  // 耳朵年齡
  ctx.textAlign = 'center'; ctx.fillStyle = INK;
  fitText(ctx, r.age, 800, 112, W - 168);
  ctx.fillText(r.age, W / 2, 900);

  // 頻率
  ctx.font = `500 42px ${FONT}`;
  const hzText = (r.isLimit ? '撐到 ' : '守到 ') + fmt(r.hz) + ' Hz' + (r.isLimit ? ' ・ 測試上限' : '');
  ctx.fillText(hzText, W / 2, 984);

  // 評語
  ctx.fillStyle = MUTE; ctx.font = `400 36px ${FONT}`;
  fitText(ctx, `「${r.line}」`, 400, 36, W - 168);
  ctx.fillText(`「${r.line}」`, W / 2, 1060);

  // 頻率譜：從 500 Hz 到上限，停下的地方插一面小白旗
  const x0 = 84, x1 = W - 84, ly = 1170;
  const px = x0 + (x1 - x0) * Math.min(1, Math.max(0, toP(r.hz)));
  ctx.lineCap = 'round';
  ctx.strokeStyle = FAINT; ctx.lineWidth = 4;
  ctx.beginPath(); ctx.moveTo(px, ly); ctx.lineTo(x1, ly); ctx.stroke();
  ctx.strokeStyle = INK;
  ctx.beginPath(); ctx.moveTo(x0, ly); ctx.lineTo(px, ly); ctx.stroke();
  for (const s of STAGES) {                         // 七隻動物的分界：小刻度
    const sx = x0 + (x1 - x0) * s.p;
    ctx.strokeStyle = sx <= px ? INK : FAINT; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(sx, ly - 9); ctx.lineTo(sx, ly + 9); ctx.stroke();
  }
  ctx.drawImage(flag, px - 12, ly - 58, 54, 54);
  ctx.fillStyle = MUTE; ctx.font = `400 22px ${FONT}`;
  ctx.textAlign = 'left'; ctx.fillText(fmt(CONFIG.F_MIN), x0, ly + 46);
  ctx.textAlign = 'right'; ctx.fillText(fmt(CONFIG.F_MAX) + ' Hz', x1, ly + 46);

  // 註記
  ctx.font = `400 22px ${FONT}`; ctx.fillStyle = MUTE;
  ctx.textAlign = 'left'; ctx.fillText('趣味測驗・非醫療檢查', x0, H - 64);
  ctx.textAlign = 'right'; ctx.fillText(SITE, x1, H - 64);

  return c;
}

export const toBlob = c => new Promise(res => c.toBlob(res, 'image/png'));

export async function sharePoster(blob) {
  const file = new File([blob], 'ear-age.png', { type: 'image/png' });
  if (navigator.canShare && navigator.canShare({ files: [file] })) {
    try { await navigator.share({ files: [file] }); return 'shared'; }
    catch (e) { if (e && e.name === 'AbortError') return 'cancel'; }
  }
  downloadPoster(blob);
  return 'downloaded';
}

export function downloadPoster(blob) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = 'ear-age.png';
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}
