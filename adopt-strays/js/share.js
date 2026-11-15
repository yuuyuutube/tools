/* Share Generator：相遇紀念卡（1080×1350 PNG）與分享連結。
   分享連結一律指向本站的動物頁（#/a/編號），不產生任何官方個別頁網址。 */
import { combo, placeholderSVG, INK } from './art.js';
import { title } from './labels.js';
import { IMG_PROXY } from './card.js';
import { I } from './icons.js';

export const shareUrl = a => `${location.origin}${location.pathname}#/a/${a.id}`;
const FONT = '"Helvetica Neue","PingFang TC","Noto Sans TC","Microsoft JhengHei",sans-serif';

function loadImg(src, cors, timeout = 15000) {
  return new Promise((res, rej) => {
    const im = new Image();
    if (cors) im.crossOrigin = 'anonymous';
    const finish = (error) => {
      clearTimeout(timer); im.onload = im.onerror = null;
      if (error) rej(error); else res(im);
    };
    const timer = setTimeout(() => { finish(new Error('image timeout')); im.src = ''; }, timeout);
    im.onload = () => finish(); im.onerror = () => finish(new Error('image unavailable')); im.src = src;
  });
}
function fit(ctx, text, max) {
  if (ctx.measureText(text).width <= max) return text;
  let t = text;
  while (t.length > 1 && ctx.measureText(t + '…').width > max) t = t.slice(0, -1);
  return t + '…';
}
function arch(ctx, x, y, w, h) {
  ctx.beginPath(); ctx.moveTo(x, y + h); ctx.lineTo(x, y + w / 2); ctx.arc(x + w / 2, y + w / 2, w / 2, Math.PI, 0); ctx.lineTo(x + w, y + h); ctx.closePath();
}

/* 回傳 { blob, photo }：photo=false 表示照片無法匯出，改用替代插圖 */
export async function makeShareImage(a) {
  const W = 1080, H = 1350, k = combo(a.id);
  const cv = Object.assign(document.createElement('canvas'), { width: W, height: H }), ctx = cv.getContext('2d');
  let photo = null;
  if (a.photo && IMG_PROXY) photo = await loadImg(`${IMG_PROXY}${encodeURIComponent(a.photo)}&w=1000&output=jpg&q=85`, true).catch(() => null);
  const art = photo ? null : await loadImg('data:image/svg+xml;charset=utf-8,' + encodeURIComponent(placeholderSVG(a).replace('<svg ', '<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400" ')), false).catch(() => null);

  ctx.fillStyle = '#F7F4EE'; ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = k.a; ctx.fillRect(0, 0, W, 900);
  const ax = 210, ay = 130, aw = 660, ah = 770;
  ctx.globalCompositeOperation = 'multiply'; ctx.fillStyle = k.b; arch(ctx, ax + 18, ay - 16, aw, ah + 16); ctx.fill();
  ctx.globalCompositeOperation = 'source-over';
  ctx.save(); arch(ctx, ax, ay, aw, ah); ctx.clip();
  ctx.fillStyle = '#FBFAF6'; ctx.fillRect(ax, ay, aw, ah);
  if (photo) {
    const s = Math.max(aw / photo.width, ah / photo.height), dw = photo.width * s, dh = photo.height * s;
    ctx.drawImage(photo, ax + (aw - dw) / 2, ay + (ah - dh) * 0.35, dw, dh);
  } else if (art) ctx.drawImage(art, ax + 30, ay + ah - 600, 600, 600);
  ctx.restore();

  // 相遇章
  ctx.save(); ctx.translate(900, 170); ctx.rotate(0.2); ctx.globalCompositeOperation = 'multiply';
  ctx.strokeStyle = ctx.fillStyle = k.s; ctx.lineWidth = 8; ctx.beginPath(); ctx.arc(0, 0, 104, 0, 7); ctx.stroke();
  ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(0, 0, 86, 0, 7); ctx.stroke();
  ctx.translate(-60, -64); ctx.scale(5, 5); ctx.fill(new Path2D(I.paw));
  ctx.restore();

  ctx.fillStyle = k.on; ctx.font = `600 30px ${FONT}`; ctx.textBaseline = 'alphabetic';
  ctx.fillText(`No. ${a.id}`, 56, 84);
  if (!photo) { ctx.textAlign = 'center'; ctx.fillStyle = INK.ink; ctx.font = `500 28px ${FONT}`; ctx.fillText(a.photo ? '照片無法匯出' : '目前沒有照片', W / 2, 250 + 120); ctx.textAlign = 'left'; }

  ctx.fillStyle = INK.ink;
  ctx.font = `800 84px ${FONT}`; ctx.fillText(fit(ctx, title(a), W - 112), 56, 1030);
  ctx.font = `500 40px ${FONT}`; ctx.fillText(fit(ctx, [a.county, a.shelter].filter(Boolean).join(' · '), W - 112), 56, 1100);
  ctx.font = `500 32px ${FONT}`; ctx.fillStyle = '#6b6760'; ctx.fillText(fit(ctx, `收容編號 ${a.sub}`, W - 112), 56, 1156);

  ctx.fillStyle = INK.ink; ctx.fillRect(56, 1214, W - 112, 3);
  ctx.font = `800 36px ${FONT}`; ctx.fillText('小小相遇所', 56, 1282);
  [INK.yellow, INK.pink, INK.blue].forEach((c, i) => { ctx.fillStyle = c; ctx.beginPath(); ctx.arc(266 + i * 30, 1270, 10, 0, 7); ctx.fill(); });
  ctx.fillStyle = INK.ink; ctx.textAlign = 'right'; ctx.font = `500 30px ${FONT}`;
  ctx.fillText(a.demo ? '展示模式／非真實認養資料' : '認養查詢 pet.gov.tw', W - 56, 1282);
  ctx.textAlign = 'left';
  if (a.demo) { ctx.fillStyle = INK.ink; ctx.fillRect(0, 0, W, 0); ctx.save(); ctx.translate(W / 2, 520); ctx.rotate(-0.2); ctx.fillStyle = 'rgba(36,34,31,.86)'; ctx.fillRect(-420, -44, 840, 88); ctx.fillStyle = '#FBFAF6'; ctx.textAlign = 'center'; ctx.font = `700 40px ${FONT}`; ctx.fillText('展示模式／非真實認養資料', 0, 14); ctx.restore(); }

  const blob = await new Promise((res, rej) => { try { cv.toBlob(b => (b ? res(b) : rej(new Error('toBlob'))), 'image/png'); } catch (e) { rej(e); } });
  return { blob, photo: !!photo };
}

export function download(blob, name) {
  const url = URL.createObjectURL(blob), a = Object.assign(document.createElement('a'), { href: url, download: name });
  document.body.append(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}
export async function copyText(text) {
  try { await navigator.clipboard.writeText(text); return true; } catch { /* 退回舊方法 */ }
  const t = Object.assign(document.createElement('textarea'), { value: text });
  t.style.cssText = 'position:fixed;opacity:0'; document.body.append(t); t.select();
  let ok = false; try { ok = document.execCommand('copy'); } catch { /* ignore */ }
  t.remove(); return ok;
}
export function canShareFile(file) { try { return !!navigator.canShare?.({ files: [file] }); } catch { return false; } }
