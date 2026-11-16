// 宜蘭頭城：寬闊的沙灘正對龜山島。湧浪規律、一道接一道，浪花比較多；沙丘上的濱草被風吹著。
import { ridge, facets, tuft, pebble } from './kit.js';

export default {
  horizon: tall => tall ? .5 : .54,
  wave: { amp: 1.1, len: 1.55, speed: .8, chop: 1.15, foam: 1.35, swash: 1.35 },
  build(ctx) {
    const a = ctx.art = {};
    a.coast = ctx.add('path', 'far3', ctx.g.far);
    a.island = ctx.add('path', 'far2', ctx.g.far); a.lit = ctx.add('path', 'cloud', ctx.g.far, { opacity: .16 });
    a.shade = ctx.add('path', null, ctx.g.far, { opacity: .5 }); a.shade.setAttribute('fill', ctx.dotsFill);
    a.foam = ctx.add('path', 'foam', ctx.g.far, { opacity: .8 });
    a.lines = [0, 1, 2].map(() => { const p = ctx.add('path', null, ctx.g.back, { opacity: .55 }); ctx.paint(p, 'foam', 'stroke'); p.setAttribute('fill', 'none'); return p; });
    a.ripples = Array.from({ length: 16 }, () => { const p = ctx.add('path', null, ctx.g.inter, { opacity: .5 }); ctx.paint(p, 'land2', 'stroke'); p.setAttribute('fill', 'none'); return p; });
    a.dune = ctx.add('path', 'land2', ctx.g.front);
    a.dune2 = ctx.add('path', 'land', ctx.g.front, { opacity: .55 });
    a.shells = Array.from({ length: 7 }, (_, i) => ctx.add('path', i % 3 ? 'cloud' : 'accent2', ctx.g.front));
    a.tufts = Array.from({ length: 7 }, (_, i) => tuft(ctx, ctx.g.front, i % 2 ? 'plant' : 'plant2', 7));
  },
  layout(ctx) {
    const { W, H, hz, tall, u } = ctx, a = ctx.art;
    // 北邊遠遠的海岸線，很淡很低
    const cw = tall ? .3 : .22;
    a.coast.setAttribute('d', ridge([[0, hz - H * .025], [W * cw * .4, hz - H * .03], [W * cw * .8, hz - H * .012], [W * cw, hz]], hz + 1));
    // 龜山島：龜殼（高）、龜首（右側小丘）、龜尾（左側低平的沙嘴）
    const cx = W * (tall ? .56 : .6), s = tall ? W * .9 : Math.min(W * .5, H * .95);
    const P = [[-.34, 0], [-.27, -.012], [-.16, -.022], [-.1, -.06], [-.05, -.13], [.0, -.16], [.04, -.15], [.1, -.1], [.15, -.06], [.19, -.05], [.22, -.066], [.25, -.07], [.28, -.05], [.31, -.02], [.34, 0]].map(([x, y]) => [cx + x * s, hz + y * s]);
    a.island.setAttribute('d', ridge(P, hz + 1)); a.lit.setAttribute('d', facets(P, hz + 1, -1)); a.shade.setAttribute('d', facets(P, hz + 1, 1));
    const fx = cx + .34 * s;
    a.foam.setAttribute('d', `M${cx - .36 * s} ${hz + 1}L${fx + s * .02} ${hz + 1}L${fx} ${hz + 3}L${cx - .34 * s} ${hz + 3}Z`);

    // 沙灘：幾乎平直、微微傾斜，潮差變化讓灘面寬窄改變
    const base = tall ? .68 : .74, range = .075;
    ctx.edge = (x, L) => H * (base + (x / W - .5) * .03 + (L - .5) * range) + Math.sin(x / W * 5 + 1) * H * .006;
    ctx.seaBottom = H * (base + .015 + range * .5 + .02);
    ctx.bandAt = [.1, .36, .68]; ctx.rippleAt = [.06, .22, .5, .82, null];
    // 平行的白浪線：外澳一道道湧浪
    a.lines.forEach((p, i) => {
      const y = hz + (ctx.seaBottom - hz) * (.3 + i * .2), pts = [];
      for (let k = 0; k <= 10; k++) pts.push([W * (.08 + i * .1) + k / 10 * W * (.5 - i * .08), y + Math.sin(k) * u * .002]);
      p.setAttribute('d', 'M' + pts.map(q => q.map(v => v.toFixed(1)).join(' ')).join('L'));
      p.setAttribute('stroke-width', (1.4 + i) * u / 1000 * 1.6); p.setAttribute('stroke-linecap', 'round');
      p.dataset.y = y; p.dataset.i = i;
    });
    // 退潮後露出的沙紋（裁切在沙灘形狀裡）
    const r = ctx.seeded(7);
    a.ripples.forEach(p => {
      const x = r() * W, y = ctx.edge(x, .5) + (r() - .2) * H * .06, w = u * (.03 + r() * .04);
      p.setAttribute('d', `M${x - w} ${y}Q${x - w / 2} ${y - u * .004} ${x} ${y}Q${x + w / 2} ${y + u * .004} ${x + w} ${y}`);
      p.setAttribute('stroke-width', u * .0025);
    });
    // 沙丘：最前面一道起伏，濱草長在上面
    const dy = H * (tall ? .82 : .9);
    a.dune.setAttribute('d', `M0 ${dy + H * .01}C${W * .2} ${dy - H * .04} ${W * .35} ${dy - H * .02} ${W * .5} ${dy + H * .01}S${W * .8} ${dy - H * .05} ${W} ${dy - H * .01}L${W} ${H + 2}L0 ${H + 2}Z`);
    a.dune2.setAttribute('d', `M0 ${dy + H * .05}C${W * .25} ${dy + H * .02} ${W * .45} ${dy + H * .04} ${W * .6} ${dy + H * .06}S${W * .9} ${dy + H * .03} ${W} ${dy + H * .05}L${W} ${H + 2}L0 ${H + 2}Z`);
    a.shells.forEach(p => { const x = r() * W, y = ctx.edge(x, 1) + H * .03 + r() * H * .07, s2 = u * (.005 + r() * .006); p.setAttribute('d', pebble(x, y, s2 * 1.3, s2, r, 5)); });
    const spots = tall ? [.08, .2, .62, .78, .9, .4, .52] : [.05, .12, .2, .62, .7, .86, .94];
    a.tufts.forEach((t, i) => t.place(W * spots[i], dy + H * (i % 2 ? .0 : .02) - H * .01, u * (.045 + (i % 3) * .015), r));
  },
  frame(ctx, T, dt, p) {
    for (const t of ctx.art.tufts) t.sway(T, p.wind);
    for (const l of ctx.art.lines) {
      const i = +l.dataset.i, ph = (T / p.period + i * .33) % 1;
      l.setAttribute('transform', `translate(${(Math.sin(T * .05 + i) * ctx.W * .04).toFixed(1)} ${(ph * ctx.u * .02).toFixed(1)})`);
      l.style.opacity = (Math.sin(ph * Math.PI) * (.25 + p.wave * .7)).toFixed(2);
    }
  },
};
