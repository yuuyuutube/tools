// Timeline：潮汐刻度尺。實線是實際觀測、虛線是依預報極值插值的示意、三角是官方滿潮／乾潮。拖曳選擇時間，海景跟著變。
import { NS, clamp, hm, md, dayStart } from './util.js';
import { tideAt } from './tide.js';

const H = 3600000, D = 24 * H;
const svgEl = (tag, attrs, parent) => { const n = document.createElementNS(NS, tag); for (const k in attrs) n.setAttribute(k, attrs[k]); parent?.appendChild(n); return n; };

export function createTimeline(host, { get, onScrub, onRange, label, kind }) {
  let range = 'days', dragging = false, span = null;
  const rangeBox = document.getElementById('tl-range');

  function setRange(r) {
    range = r;
    for (const b of rangeBox.children) b.setAttribute('aria-checked', b.dataset.v === r);
    onRange?.(r); update(true);
  }
  rangeBox.addEventListener('click', e => { const b = e.target.closest('button'); if (b) setRange(b.dataset.v); });

  function bounds(now) {
    if (range === 'month') return [dayStart(now) - 29 * D, dayStart(now) + 2 * D];
    return [dayStart(now) - 2 * D, dayStart(now) + 3 * D];
  }

  function update(force) {
    if (host.closest('[hidden]') && !force) return;
    const { data, t, now, history } = get();
    if (!data) return;
    const W = host.clientWidth || 600, Hh = host.clientHeight || 120;
    const [a, b] = bounds(now); span = [a, b];
    const X = v => (v - a) / (b - a) * W;
    host.innerHTML = '';
    const svg = svgEl('svg', { viewBox: `0 0 ${W} ${Hh}`, 'aria-hidden': 'true' }, host);
    const top = 30, tideH = Hh * .42, lane = top + tideH + 12, laneH = Hh - lane - 14;

    svgEl('rect', { class: 'tl-future', x: X(now), y: 0, width: Math.max(0, W - X(now)), height: Hh - 12 }, svg);
    // 刻度：三天模式每 6 小時，三十天模式每天
    const stepT = range === 'month' ? D : 6 * H;
    for (let v = a; v <= b; v += stepT) {
      const x = X(v), day = (v - dayStart(v)) === 0;
      svgEl('line', { class: day ? 'tl-day' : 'tl-grid', x1: x, x2: x, y1: top - 4, y2: Hh - 14 }, svg);
      if (range === 'month' ? (new Date(v).getUTCDate() % 5 === 0 || v === dayStart(now)) : (day || W > 560)) {
        const tx = svgEl('text', { class: `tl-label${day ? ' day' : ''}`, x: x + 3, y: Hh - 2 }, svg);
        tx.textContent = range === 'month' || day ? md(v) : hm(v).replace(':00', '');
      }
    }

    // 觀測（實線）：潮位、浪高、海溫，各自依可見範圍正規化，只比形狀，不跨基準比較絕對值
    const series = (o, field) => {
      if (!o?.station) return [];
      const id = o.station.id, merged = new Map();
      for (const s of [...(history?.[id] || []), ...(o.series || [])]) if (s[field] != null) merged.set(Date.parse(s.t), s[field]);
      return [...merged.entries()].filter(([x]) => x >= a && x <= Math.min(b, now)).sort((p, q) => p[0] - q[0]);
    };
    const draw = (pts, cls, y0, h, dots) => {
      if (pts.length < 2) return null;
      const vals = pts.map(p => p[1]), lo = Math.min(...vals), hi = Math.max(...vals), k = hi - lo || 1;
      let d = '', prev = null;
      for (const [x, v] of pts) { const px = X(x), py = y0 + h - (v - lo) / k * h; d += (prev && x - prev > 2.5 * H ? 'M' : d ? 'L' : 'M') + px.toFixed(1) + ' ' + py.toFixed(1); prev = x; }
      svgEl('path', { class: cls, d }, svg);
      if (dots) { const [x, v] = pts[pts.length - 1]; svgEl('circle', { class: 'tl-obsdot', cx: X(x), cy: y0 + h - (v - lo) / k * h, r: 3 }, svg); }
      return { lo, hi };
    };

    const ev = data.clean.events.filter(e => e.t >= a - D && e.t <= b + D);
    // 預報（虛線）：相鄰極值的餘弦插值，只是示意
    if (ev.length > 1) {
      const hs = ev.map(e => e.height).filter(v => v != null), lo = Math.min(...hs), hi = Math.max(...hs), k = hi - lo || 1;
      let d = '', gap = true;
      for (let x = Math.max(a, ev[0].t); x <= Math.min(b, ev[ev.length - 1].t); x += (b - a) / 400) {
        const s = tideAt(data.clean, x); if (s.status !== 'ok') { gap = true; continue; }
        const h = s.prev.height + (s.next.height - s.prev.height) * (1 - Math.cos(Math.PI * s.progress)) / 2;
        d += (gap ? 'M' : 'L') + X(x).toFixed(1) + ' ' + (top + tideH - (h - lo) / k * tideH).toFixed(1); gap = false;
      }
      svgEl('path', { class: 'tl-curve', d }, svg);
      if (range === 'days') for (const e of ev) {
        if (e.t < a || e.t > b || e.height == null) continue;
        const x = X(e.t), y = top + tideH - (e.height - lo) / k * tideH, s = 4.5;
        svgEl('path', { class: `tl-ev ${e.type}`, d: e.type === 'high' ? `M${x - s} ${y - 2}L${x + s} ${y - 2}L${x} ${y - 2 - s * 1.4}Z` : `M${x - s} ${y + 2}L${x + s} ${y + 2}L${x} ${y + 2 + s * 1.4}Z` }, svg);
        if (W > 520) { const tx = svgEl('text', { class: 'tl-evt', x: x, y: e.type === 'high' ? y - 12 : y + 18, 'text-anchor': 'middle' }, svg); tx.textContent = hm(e.t); }
      }
    }
    draw(series(data.obs.tide || pickAny(data, 'tide'), 'tide'), 'tl-obs', top, tideH, true);
    // 下方小圖：浪高與海溫
    const wv = series(data.obs.wave || pickAny(data, 'wave'), 'wave'), tp = series(data.obs.temp || pickAny(data, 'temp'), 'temp');
    if (wv.length > 1) draw(wv, 'tl-wave', lane, laneH, false);
    if (tp.length > 1) draw(tp, 'tl-temp', lane, laneH, false);

    // 現在與播放頭
    svgEl('line', { class: 'tl-now', x1: X(now), x2: X(now), y1: top - 6, y2: Hh - 14 }, svg);
    const hx = clamp(X(t), 0, W);
    svgEl('line', { class: 'tl-head', x1: hx, x2: hx, y1: 4, y2: Hh - 14 }, svg);
    svgEl('circle', { class: 'tl-knob', cx: hx, cy: 6, r: 6 }, svg);
    // 圖例：線條樣式＋極短文字，說明哪條是觀測、哪條是示意
    const key = svgEl('g', { class: 'tl-key', transform: `translate(${W - 4} ${top + tideH + 8})` }, svg);
    let kx = 0;
    for (const [cls, txt, show] of [['tl-temp', '海溫', tp.length > 1], ['tl-wave', '浪高', wv.length > 1], ['tl-obs', '觀測', true], ['tl-curve', '預報示意', ev.length > 1]]) {
      if (!show) continue;
      const tx = svgEl('text', { x: kx, y: 3, 'text-anchor': 'end', class: 'tl-label' }, key); tx.textContent = txt;
      const w = txt.length * 10 + 4; kx -= w; svgEl('line', { class: cls, x1: kx - 14, x2: kx - 2, y1: 0, y2: 0 }, key); kx -= 24;
    }

    label(`${md(t)} ${hm(t)}`);
    kind(t > now + 10 * 60000 ? '潮汐預報' : t < now - 30 * 60000 ? (data.obs.tide?.status === 'history' ? '歷史觀測' : '無潮位觀測') : '');
    host.setAttribute('aria-valuetext', `${md(t)} ${hm(t)}`);
  }
  const pickAny = (data, key) => data.coast[key].length ? { station: data.coast[key][0], series: null } : null;

  // 拖曳：滑鼠與觸控都用 pointer events
  const timeAt = e => { const r = host.getBoundingClientRect(); return span[0] + clamp((e.clientX - r.left) / r.width, 0, 1) * (span[1] - span[0]); };
  const snap = v => Math.round(v / (range === 'month' ? H : 10 * 60000)) * (range === 'month' ? H : 10 * 60000);
  host.addEventListener('pointerdown', e => { if (!span) return; dragging = true; host.setPointerCapture(e.pointerId); onScrub(snap(timeAt(e))); });
  host.addEventListener('pointermove', e => { if (dragging) onScrub(snap(timeAt(e))); });
  for (const type of ['pointerup', 'pointercancel']) host.addEventListener(type, () => { dragging = false; });
  host.addEventListener('keydown', e => {
    const { t, now } = get();
    const d = { ArrowRight: 1, ArrowLeft: -1 }[e.key];
    if (e.key === 'Home') { e.preventDefault(); onScrub(now); return; }
    if (!d) return;
    e.preventDefault(); const stepT = (range === 'month' ? D : H) * (e.shiftKey ? 6 : 1);
    onScrub(clamp(snap(t + d * stepT), span[0], span[1]));
  });
  new ResizeObserver(() => update()).observe(host);
  setRange('days');
  return { update };
}
