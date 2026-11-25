// The Certificate of Authenticity, twice: as HTML inside the dossier, and as a 1080×1350
// PNG drawn on a canvas for sharing (no interface, only the document).

import { artifactSVG } from '../game/artifact-art.js';
import { RARITIES, accessionNo } from '../game/artifacts.js';
import { esc } from '../game/doc.js';
import { sealSVG } from '../ui/icons.js';
import { hashString, mulberry32 } from '../core/prng.js';

const fmtDate = (t) => {
  const d = new Date(t);
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;
};

// Each rarity has its own absurd official mark rather than a colour tier.
export function rarityMark(rarity) {
  const r = RARITIES[rarity];
  return `<span class="rmark r-${rarity.toLowerCase()}"><span class="rm-zh">${r.zh}</span><span class="rm-en">${r.en}</span></span>`;
}

export function certificateHTML(a, rec, { uid = 'c', stamped = false } = {}) {
  const first = rec ? fmtDate(rec.firstAt) : '—';
  return `<div class="cert ${stamped ? 'stamped' : ''}">
    <div class="cert-frame">
      <div class="cert-top">
        <div class="cert-seal">${sealSVG({ color: '#22392F' })}</div>
        <div class="cert-bureau">THE BUREAU OF<br>UNNECESSARY PROTECTION</div>
        <div class="cert-acc">No.<b>${accessionNo(a)}</b></div>
      </div>
      <div class="cert-title">Certificate of Authenticity</div>
      <div class="cert-art">${artifactSVG(a.id, { uid })}</div>
      <div class="cert-name">${esc(a.name)}</div>
      <div class="cert-en">${esc(a.en)}</div>
      <table class="cert-fields">
        <tr><th>RARITY</th><td>${rarityMark(a.rarity)}</td></tr>
        <tr><th>CATEGORY</th><td>${esc(a.category)}</td></tr>
        <tr><th>SECURITY LEVEL</th><td>${esc(a.securityLevel)}</td></tr>
        <tr><th>CONDITION</th><td>${esc(a.condition)}<small>${esc(a.conditionEn)}</small></td></tr>
        <tr><th>FIRST SECURED</th><td>${first}</td></tr>
      </table>
      <p class="cert-desc">${esc(a.description)}</p>
      <div class="cert-foot">
        <div class="cert-sign"><span class="signature">封存仁</span><span>首席保管官</span></div>
        <div class="cert-stamp"><span>VERIFIED<br>AND SECURED</span><small>已入庫</small></div>
      </div>
    </div>
  </div>`;
}

// ---------------------------------------------------------------- PNG

const W = 1080;
const H = 1350;
const C = { paper: '#EFE8D6', ink: '#1B1C1A', soft: '#5A574D', green: '#22392F', red: '#B2321F', rule: 'rgba(27,28,26,0.28)' };
const SERIF = '"Songti TC", "Noto Serif TC", "Source Han Serif TC", serif';
const DISPLAY = '"Bodoni Moda", "Didot", "Bodoni 72", "Times New Roman", serif';
const MONO = '"IBM Plex Mono", "SF Mono", Menlo, monospace';

function loadSVG(svg) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
  });
}

export async function renderCertificate(a, rec, { employeeNo = '0000' } = {}) {
  if (document.fonts && document.fonts.ready) await document.fonts.ready;
  const cv = document.createElement('canvas');
  cv.width = W;
  cv.height = H;
  const c = cv.getContext('2d');
  const rnd = mulberry32(hashString(a.id));

  // Paper with fibres.
  c.fillStyle = C.paper;
  c.fillRect(0, 0, W, H);
  for (let i = 0; i < 2600; i++) {
    c.fillStyle = `rgba(${rnd() < 0.5 ? '90,80,60' : '255,255,255'},${0.03 + rnd() * 0.05})`;
    const x = rnd() * W;
    const y = rnd() * H;
    c.fillRect(x, y, 1 + rnd() * 3, 1);
  }

  // Guilloche frame: interfering sine bands along all four edges.
  const m = 54;
  c.strokeStyle = C.ink;
  c.lineWidth = 2;
  c.strokeRect(m, m, W - 2 * m, H - 2 * m);
  c.lineWidth = 0.8;
  c.strokeRect(m + 30, m + 30, W - 2 * m - 60, H - 2 * m - 60);
  c.save();
  c.beginPath();
  c.rect(m, m, W - 2 * m, H - 2 * m);
  c.rect(m + 30, m + 30, W - 2 * m - 60, H - 2 * m - 60);
  c.clip('evenodd');
  c.strokeStyle = 'rgba(34,57,47,0.55)';
  c.lineWidth = 0.7;
  const band = (len, place) => {
    for (let k = 0; k < 7; k++) {
      c.beginPath();
      for (let s = 0; s <= len; s += 3) {
        const v = Math.sin(s / 11 + k * 0.9) * 9 + Math.sin(s / 29 + k) * 4;
        const [x, y] = place(s, 15 + v);
        if (s === 0) c.moveTo(x, y);
        else c.lineTo(x, y);
      }
      c.stroke();
    }
  };
  band(W - 2 * m, (s, v) => [m + s, m + v]);
  band(W - 2 * m, (s, v) => [m + s, H - m - v]);
  band(H - 2 * m, (s, v) => [m + v, m + s]);
  band(H - 2 * m, (s, v) => [W - m - v, m + s]);
  c.restore();

  // Rosette behind the specimen.
  const cx = W / 2;
  const cy = 520;
  c.save();
  c.strokeStyle = 'rgba(34,57,47,0.12)';
  c.lineWidth = 0.8;
  for (let k = 0; k < 24; k++) {
    c.beginPath();
    for (let t = 0; t <= Math.PI * 2 + 0.01; t += 0.02) {
      const r = 200 + 28 * Math.sin(9 * t + (k * Math.PI) / 12);
      const x = cx + r * Math.cos(t);
      const y = cy + r * Math.sin(t);
      if (t === 0) c.moveTo(x, y);
      else c.lineTo(x, y);
    }
    c.stroke();
  }
  c.restore();

  // Header.
  c.fillStyle = C.ink;
  c.textAlign = 'center';
  c.textBaseline = 'alphabetic';
  c.font = `600 22px ${MONO}`;
  spaced(c, 'THE BUREAU OF', cx, 160, 6);
  spaced(c, 'UNNECESSARY PROTECTION', cx, 192, 6);
  c.font = `500 italic 40px ${DISPLAY}`;
  c.fillText('Certificate of Authenticity', cx, 258);
  c.strokeStyle = C.rule;
  c.lineWidth = 1;
  line(c, cx - 200, 282, cx + 200, 282);

  const seal = await loadSVG(sealSVG({ color: C.green }).replace('<svg ', '<svg xmlns="http://www.w3.org/2000/svg" '));
  c.globalAlpha = 0.85;
  c.drawImage(seal, 120, 112, 96, 96);
  c.globalAlpha = 1;
  c.textAlign = 'right';
  c.font = `500 16px ${MONO}`;
  c.fillStyle = C.soft;
  c.fillText('ACCESSION NO.', W - 124, 140);
  c.font = `600 34px ${MONO}`;
  c.fillStyle = C.ink;
  c.fillText(accessionNo(a), W - 124, 182);

  // Specimen.
  const art = await loadSVG(artifactSVG(a.id, { uid: 'png' }));
  c.drawImage(art, cx - 230, cy - 230, 460, 460);

  // Name.
  c.textAlign = 'center';
  c.fillStyle = C.ink;
  c.font = `600 58px ${SERIF}`;
  spaced(c, a.name, cx, 818, 14);
  c.font = `500 18px ${MONO}`;
  c.fillStyle = C.soft;
  spaced(c, a.en, cx, 856, 4);

  // Fields with dotted leaders.
  const rows = [
    ['ACCESSION NO.', accessionNo(a)],
    ['RARITY', `${RARITIES[a.rarity].en} ／ ${RARITIES[a.rarity].zh}`],
    ['SECURITY LEVEL', a.securityLevel],
    ['CONDITION', a.conditionEn],
    ['FIRST SECURED', rec ? fmtDate(rec.firstAt) : '—'],
  ];
  let y = 920;
  for (const [k, v] of rows) {
    c.textAlign = 'left';
    c.font = `500 18px ${MONO}`;
    c.fillStyle = C.soft;
    c.fillText(k, 250, y);
    c.textAlign = 'right';
    c.font = `600 19px ${MONO}`;
    c.fillStyle = C.ink;
    c.fillText(v, W - 250, y);
    const kw = measure(c, k, `500 18px ${MONO}`);
    const vw = measure(c, v, `600 19px ${MONO}`);
    c.fillStyle = 'rgba(27,28,26,0.35)';
    for (let x = 250 + kw + 14; x < W - 250 - vw - 12; x += 9) c.fillRect(x, y - 5, 2, 2);
    y += 38;
  }

  // Description.
  c.textAlign = 'center';
  c.fillStyle = C.ink;
  c.font = `500 30px ${SERIF}`;
  c.fillText(a.description, cx, 1128);

  // Signature and seal.
  c.save();
  c.strokeStyle = '#1F2E5A';
  c.lineWidth = 2.6;
  c.lineCap = 'round';
  c.beginPath();
  let sx = 196;
  c.moveTo(sx, 1232);
  for (let i = 0; i < 9; i++) {
    const h = 18 + rnd() * 26;
    c.bezierCurveTo(sx + 8, 1232 - h, sx + 18, 1232 - h, sx + 16, 1236);
    c.bezierCurveTo(sx + 14, 1244, sx + 22, 1240, sx + 26, 1228);
    sx += 22;
  }
  c.lineTo(sx + 60, 1222);
  c.stroke();
  c.restore();
  c.strokeStyle = C.rule;
  line(c, 180, 1248, 470, 1248);
  c.textAlign = 'left';
  c.font = `500 16px ${MONO}`;
  c.fillStyle = C.soft;
  c.fillText('CHIEF CUSTODIAN　首席保管官', 180, 1274);

  // Barcode.
  const code = hashString(`${a.id}|${employeeNo}`);
  let bx = 520;
  for (let i = 0; i < 48; i++) {
    const wide = (code >>> i % 32) & 1;
    c.fillStyle = C.ink;
    c.fillRect(bx, 1214, wide ? 3 : 1.5, 42);
    bx += wide ? 6 : 4.5;
  }
  c.font = `500 13px ${MONO}`;
  c.fillText(`BUP-${accessionNo(a)}-${employeeNo}`, 520, 1274);

  // Rubber stamp, slightly rotated, ink imperfect.
  c.save();
  c.translate(W - 196, 1214);
  c.rotate(-0.16);
  c.globalAlpha = 0.86;
  c.strokeStyle = C.red;
  c.fillStyle = C.red;
  c.lineWidth = 5;
  c.beginPath();
  c.arc(0, 0, 86, 0, Math.PI * 2);
  c.stroke();
  c.lineWidth = 1.6;
  c.beginPath();
  c.arc(0, 0, 74, 0, Math.PI * 2);
  c.stroke();
  c.textAlign = 'center';
  c.font = `700 22px ${MONO}`;
  c.fillText('VERIFIED', 0, -8);
  c.fillText('AND SECURED', 0, 20);
  c.font = `700 18px ${SERIF}`;
  c.fillText('已 入 庫', 0, 50);
  c.font = `600 12px ${MONO}`;
  c.fillText(rec ? fmtDate(rec.firstAt) : '', 0, -38);
  c.globalCompositeOperation = 'destination-out';
  for (let i = 0; i < 260; i++) {
    c.globalAlpha = 0.5 * rnd();
    c.fillRect(-90 + rnd() * 180, -90 + rnd() * 180, 1 + rnd() * 3, 1 + rnd() * 2);
  }
  c.restore();
  return cv;
}

function spaced(c, text, x, y, gap) {
  const chars = [...text];
  const widths = chars.map((ch) => c.measureText(ch).width);
  const total = widths.reduce((s, w) => s + w, 0) + gap * (chars.length - 1);
  const align = c.textAlign;
  c.textAlign = 'left';
  let cx = align === 'center' ? x - total / 2 : x;
  chars.forEach((ch, i) => {
    c.fillText(ch, cx, y);
    cx += widths[i] + gap;
  });
  c.textAlign = align;
}

function measure(c, text, font) {
  const f = c.font;
  c.font = font;
  const w = c.measureText(text).width;
  c.font = f;
  return w;
}

function line(c, x1, y1, x2, y2) {
  c.beginPath();
  c.moveTo(x1, y1);
  c.lineTo(x2, y2);
  c.stroke();
}

export async function downloadCertificate(a, rec, opts) {
  const cv = await renderCertificate(a, rec, opts);
  const blob = await new Promise((r) => cv.toBlob(r, 'image/png'));
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `BUP-${accessionNo(a)}-${a.en.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.png`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
  return cv;
}
