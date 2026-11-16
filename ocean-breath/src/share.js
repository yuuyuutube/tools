// 分享圖：依橫式或直式重新排一次插畫（不是把畫面拉伸），加上地點、日期、潮汐狀態、少量數值與資料來源，像一張絹印海報。
import { createScene } from './scene.js';
import { STATE_TEXT, TYPE_TEXT } from './tide.js';
import { hm, md, ymd } from './util.js';

const SIZES = { land: [1600, 1000], port: [1080, 1620] };
// 匯出的 SVG 沒有頁面的 CSS：把必要的透明度、混色寫進去，動畫一律不帶
const EXPORT_CSS = '.crest{fill:none;stroke-linecap:round;opacity:.26;stroke-dasharray:70 26 12 40 30 18}.ripple{fill:none;stroke-linecap:round;opacity:.38}.swash{opacity:.8}.wet{opacity:.45}.foamline{fill:none;stroke-linecap:round;stroke-dasharray:18 7 4 9;opacity:.92}.waterline{opacity:.7}.glint{opacity:.45}.path{opacity:.75}.bird{opacity:0}.riso{mix-blend-mode:multiply;opacity:.75}.beam{opacity:0}.star{opacity:.8}';
const FONT = '"Helvetica Neue", Helvetica, "PingFang TC", "Noto Sans TC", "Microsoft JhengHei", Arial, sans-serif';

function svgImage(svg) {
  const markup = svg.outerHTML.replace('</defs>', `</defs><style>${EXPORT_CSS}</style>`);
  const url = URL.createObjectURL(new Blob([markup], { type: 'image/svg+xml' }));
  return new Promise((ok, bad) => { const img = new Image(); img.onload = () => ok({ img, url }); img.onerror = bad; img.src = url; });
}

export async function buildPoster({ coast, data, vs, t, ori = 'land', demo = false, live = true }) {
  const [W, H] = SIZES[ori], port = ori === 'port';
  const m = port ? 56 : 64, foot = port ? 390 : 236;
  const sw = W - m * 2, sh = H - m - foot;
  const box = document.createElement('div');
  const scene = createScene(box, coast, { size: [sw, sh], still: true });
  scene.setState(vs, { instant: true });
  const { img, url } = await svgImage(scene.svg);
  scene.destroy();

  const c = document.createElement('canvas'); c.width = W; c.height = H;
  const g = c.getContext('2d');
  g.fillStyle = '#f3eee3'; g.fillRect(0, 0, W, H);
  g.drawImage(img, m, m, sw, sh); URL.revokeObjectURL(url);
  // 紙張顆粒（整張），讓海報像印出來的
  const n = g.createImageData(W, H);
  for (let i = 0; i < n.data.length; i += 4) { const v = Math.random() < .5 ? 40 : 255; n.data[i] = n.data[i + 1] = n.data[i + 2] = v; n.data[i + 3] = Math.random() * 18; }
  const grain = document.createElement('canvas'); grain.width = W; grain.height = H; grain.getContext('2d').putImageData(n, 0, 0);
  g.globalCompositeOperation = 'multiply'; g.drawImage(grain, 0, 0); g.globalCompositeOperation = 'source-over';

  const ink = '#24221f', mute = '#7d7a73';
  const y0 = m + sh;
  const text = (s, x, y, size, weight = 500, color = ink, spacing = 0, align = 'left') => {
    g.font = `${weight} ${size}px ${FONT}`; g.fillStyle = color; g.textAlign = align; g.textBaseline = 'alphabetic';
    if ('letterSpacing' in g) g.letterSpacing = `${spacing}px`;
    g.fillText(s, x, y);
  };
  // 地點：大字＋Riso 錯版
  const big = port ? 120 : 112, ty = y0 + (port ? 136 : 132);
  for (const [dx, dy, col] of [[3, 2, 'rgba(255,72,176,.45)'], [-2, 3, 'rgba(0,120,191,.4)'], [0, 0, ink]]) text(coast.name, m + dx, ty + dy, big, 800, col, big * .12);
  const tideLine = data.tide.status === 'ok' ? STATE_TEXT[data.tide.state] : '潮汐資料不足';
  const nx = data.next ? `下一次${TYPE_TEXT[data.next.type]} ${ymd(data.next.t) === ymd(t) ? '' : md(data.next.t) + ' '}${hm(data.next.t)}` : '';
  const rx = port ? m : W - m, ra = port ? 'left' : 'right';
  text(tideLine, rx, port ? ty + 62 : y0 + 82, port ? 36 : 40, 700, ink, 4, ra);
  if (nx) text(nx, rx, port ? ty + 104 : y0 + 128, 26, 500, ink, 2, ra);
  const vals = [];
  if (data.obs.tide) vals.push(`潮位 ${data.obs.tide.value > 0 ? '+' : ''}${data.obs.tide.value} cm`);
  if (data.obs.wave) vals.push(`浪高 ${data.obs.wave.value.toFixed(1)} m`);
  if (data.obs.temp) vals.push(`海溫 ${data.obs.temp.value.toFixed(1)} °C`);
  const obsAt = data.obs.tide?.at || data.obs.wave?.at || data.obs.temp?.at;
  if (vals.length) text(vals.join('　'), rx, port ? ty + 142 : y0 + 168, 22, 400, ink, 1, ra);
  // 日期與資料來源：一定保留，過期數字不會被誤認為最新
  const dateLine = `${ymd(t).replace(/-/g, '.')} ${hm(t)}${obsAt ? `・觀測 ${md(obsAt)} ${hm(obsAt)}` : ''}${live ? '' : '・時間軸畫面'}`;
  text(dateLine, m, H - (port ? 62 : 34), 18, 500, mute, 1.5);
  text('資料：中央氣象署 潮汐預報 F-A0021-001・海象觀測 O-B0075-001', m, H - (port ? 34 : 12), 16, 400, mute, 1);
  text('海洋呼吸觀測所 OCEAN BREATH', W - m, port ? ty : H - 34, 18, 700, ink, 3, 'right');
  if (demo) {
    g.fillStyle = ink; const bw = 132, bh = 40, bx = W - m - bw - 16, by = m + 16;
    g.beginPath(); g.roundRect ? g.roundRect(bx, by, bw, bh, 20) : g.rect(bx, by, bw, bh); g.fill();
    text('展示模式', bx + bw / 2, by + 27, 19, 600, '#fbfaf6', 3, 'center');
  }
  return new Promise((ok, bad) => c.toBlob(b => b ? ok(b) : bad(new Error('PNG')), 'image/png'));
}
