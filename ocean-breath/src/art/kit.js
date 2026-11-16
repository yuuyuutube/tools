// 插畫零件：山脊與受光面、會被潮水淹沒的岩石與樁、隨風擺動的草。
import { el, set, clamp, poly, linePath } from '../util.js';

/** 山脊：points 為 [x, y]，自動封到 baseY。回傳 path d */
export function ridge(points, baseY) {
  const p = [[points[0][0], baseY], ...points, [points[points.length - 1][0], baseY]];
  return poly(p);
}

/** 受光面：每座山峰右側（或左側）一塊三角色塊，讓山有幾何的立體感 */
export function facets(points, baseY, side = 1) {
  let d = '';
  for (let i = 1; i < points.length - 1; i++) {
    const [x, y] = points[i], prev = points[i - 1], next = points[i + 1];
    if (y > prev[1] || y > next[1]) continue;            // 只在峰頂
    const nb = side > 0 ? next : prev;
    const foot = [x + (nb[0] - x) * .35, baseY];
    d += poly([[x, y], nb, [nb[0], Math.min(baseY, nb[1] + (baseY - nb[1]) * .5)], foot]);
  }
  return d;
}

/**
 * 會被潮水蓋住的物件：先畫本體，再用同形狀裁切一塊海色，從水面往下蓋住。
 * 回傳 { shape, cover, line, water(y) }，water(y) 設定水面高度
 */
export function submersible(ctx, parent, key = 'rock', waterKey = 'sea3') {
  const id = `${ctx.id}-sub${(ctx._sub = (ctx._sub || 0) + 1)}`;
  const g = el('g', '', parent);
  const clip = el('clipPath', '', ctx.defs, { id });
  const clipPath = el('path', '', clip);
  const shape = ctx.add('path', key, g);
  const extra = el('g', '', g);
  const cover = ctx.add('rect', waterKey, g, { 'clip-path': `url(#${id})` });
  const line = ctx.add('rect', 'foam', g, { 'clip-path': `url(#${id})`, class: 'waterline' });
  let box = { x: 0, w: 0, bottom: 0 };
  return {
    g, shape, extra,
    set(d, x, w, bottom) { shape.setAttribute('d', d); clipPath.setAttribute('d', d); box = { x, w, bottom }; },
    water(y) {
      set(cover, { x: box.x - 2, y: y.toFixed(1), width: box.w + 4, height: Math.max(0, box.bottom - y + 4).toFixed(1) });
      set(line, { x: box.x - 2, y: (y - 1).toFixed(1), width: box.w + 4, height: Math.max(1.5, ctx.u * .003).toFixed(1) });
    },
  };
}

/** 圓潤的石頭輪廓（多邊形圓角化），r 為半徑，sq 為扁平度 */
export function pebble(cx, cy, rx, ry, rand, n = 7) {
  const pts = [];
  for (let i = 0; i < n; i++) {
    const a = i / n * Math.PI * 2, k = .86 + rand() * .2;
    pts.push([cx + Math.cos(a) * rx * k, cy + Math.sin(a) * ry * k]);
  }
  let d = '';
  for (let i = 0; i < n; i++) {
    const a = pts[i], b = pts[(i + 1) % n], m = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
    d += (i ? '' : `M${((pts[n - 1][0] + a[0]) / 2).toFixed(1)} ${((pts[n - 1][1] + a[1]) / 2).toFixed(1)}`) + `Q${a[0].toFixed(1)} ${a[1].toFixed(1)} ${m[0].toFixed(1)} ${m[1].toFixed(1)}`;
  }
  return d + 'Z';
}

/** 一叢草：幾片細長的葉，transform-origin 在根部，隨風擺動 */
export function tuft(ctx, parent, key = 'plant', blades = 5) {
  const g = el('g', 'tuft', parent);
  const leaves = Array.from({ length: blades }, () => ctx.add('path', key, g));
  return {
    g,
    place(x, y, h, rand) {
      g.dataset.x = x; g.dataset.y = y; g.dataset.ph = rand() * 6;
      leaves.forEach((l, i) => {
        const a = (i - (blades - 1) / 2) / blades * 1.1 + (rand() - .5) * .2, hh = h * (.6 + rand() * .5), w = h * .07;
        const tx = Math.sin(a) * hh, ty = -Math.cos(a) * hh;
        l.setAttribute('d', `M${-w} 0Q${(tx * .4 - w).toFixed(1)} ${(ty * .5).toFixed(1)} ${tx.toFixed(1)} ${ty.toFixed(1)}Q${(tx * .4 + w).toFixed(1)} ${(ty * .5).toFixed(1)} ${w} 0Z`);
      });
      g.setAttribute('transform', `translate(${x.toFixed(1)} ${y.toFixed(1)})`);
    },
    sway(T, wind) {
      const a = (2 + wind * 12) * Math.sin(T * (1.1 + wind * 1.4) + +g.dataset.ph) + wind * 8;
      g.setAttribute('transform', `translate(${(+g.dataset.x).toFixed(1)} ${(+g.dataset.y).toFixed(1)}) skewX(${clamp(a, -24, 24).toFixed(1)})`);
    },
  };
}

export { el, set, clamp, poly, linePath };
