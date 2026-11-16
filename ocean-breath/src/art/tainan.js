// 台南安平：天空很大、海很淺。退潮時沙洲浮出、潮間帶的沙紋慢慢顯現；一排排蚵棚竹樁被潮水淹過又露出。白鷺鷥站在灘上。
import { ridge, submersible, el } from './kit.js';

export default {
  horizon: tall => tall ? .55 : .6,
  wave: { amp: .5, len: 1.25, speed: .7, chop: .6, foam: .35, swash: .7 },
  build(ctx) {
    const a = ctx.art = {};
    a.trees = ctx.add('path', 'far3', ctx.g.far);
    a.city = ctx.add('path', 'far3', ctx.g.far);
    a.bars = [0, 1].map(() => ctx.add('path', 'land2', ctx.g.back));
    a.barFoam = [0, 1].map(() => ctx.add('path', 'foam', ctx.g.back, { opacity: .7 }));
    a.poles = Array.from({ length: 22 }, () => submersible(ctx, ctx.g.back, 'rock', 'sea2'));
    a.racks = ctx.add('path', null, ctx.g.back); ctx.paint(a.racks, 'rock', 'stroke'); a.racks.setAttribute('fill', 'none');
    a.marks = Array.from({ length: 34 }, () => { const p = ctx.add('path', null, ctx.g.inter, { opacity: .7 }); ctx.paint(p, 'land2', 'stroke'); p.setAttribute('fill', 'none'); p.setAttribute('stroke-linecap', 'round'); return p; });
    a.pools = Array.from({ length: 6 }, () => ctx.add('path', 'sea0', ctx.g.inter, { opacity: .8 }));
    a.egret = el('g', '', ctx.g.front);
    a.legs = ctx.add('path', null, a.egret); ctx.paint(a.legs, 'accent', 'stroke'); a.legs.setAttribute('fill', 'none');
    a.body = ctx.add('path', 'cloud', a.egret); a.head = el('g', '', a.egret); a.neck = ctx.add('path', 'cloud', a.head); a.beak = ctx.add('path', 'accent2', a.head);
    a.shadow = ctx.add('path', 'land2', a.egret, { opacity: .6 });
  },
  layout(ctx) {
    const { W, H, hz, tall, u } = ctx, a = ctx.art;
    // 遠方：右邊一排矮樹林，左邊城市低低的剪影（非常細）
    let tr = ''; for (let i = 0; i < 14; i++) { const x = W * (.62 + i * .03), r0 = u * (.012 + (i % 3) * .004); tr += `M${x - r0 * 1.6} ${hz + 1}A${r0 * 1.6} ${r0 * 1.2} 0 0 1 ${x + r0 * 1.6} ${hz + 1}Z`; }
    a.trees.setAttribute('d', tr);
    let cd = ''; const r = ctx.seeded(11);
    for (let i = 0; i < 24; i++) { const x = W * (.02 + i * .016), w = W * (.008 + r() * .008), h = u * (.004 + r() * .012); cd += `M${x} ${hz + 1}L${x} ${hz - h}L${x + w} ${hz - h}L${x + w} ${hz + 1}Z`; }
    a.city.setAttribute('d', cd);
    // 潮間帶：潮差大，灘面寬窄變化明顯
    const base = tall ? .68 : .77, range = tall ? .1 : .11;
    ctx.edge = (x, L) => H * (base + (L - .5) * range) + Math.sin(x / W * 4 + .5) * H * .008;
    ctx.seaBottom = H * (base + range * .5 + .02);
    ctx.bandAt = [.12, .4, .7]; ctx.rippleAt = [.06, .2, .34, .56, .8];
    // 沙洲：兩條細長色塊
    a.barDefs = [[.18, .62, .26], [.55, .95, .46]].map(([x0, x1, f]) => ({ x0: x0 * W, x1: x1 * W, y: hz + (ctx.seaBottom - hz) * f }));
    // 蚵棚：兩排竹樁，往遠處變小變密
    const rows = [[.48, .04, .5, 11], [.66, .3, .9, 11]];
    let k = 0, rk = '';
    for (const [f, xa, xb, n] of rows) {
      const y = hz + (ctx.seaBottom - hz) * f, h = u * (.025 + f * .03), w = u * (.0025 + f * .002);
      let px = null;
      for (let i = 0; i < n; i++) {
        const x = W * (xa + (xb - xa) * i / (n - 1)), p = a.poles[k++];
        p.set(`M${x - w} ${y}L${x - w} ${y - h}L${x + w} ${y - h}L${x + w} ${y}Z`, x - w, w * 2, y + 2);
        p.top = y - h; p.by = y;
        if (px !== null) rk += `M${px} ${y - h * .8}L${x} ${y - h * .8}`;
        px = x;
      }
    }
    a.racks.setAttribute('d', rk); a.racks.setAttribute('stroke-width', u * .002);
    a.marks.forEach(p => { const x = r() * W, y = ctx.edge(x, .5) + (r() - .25) * H * .1, w = u * (.015 + r() * .02); p.setAttribute('d', `M${x - w} ${y}Q${x - w / 2} ${y - u * .005} ${x} ${y}Q${x + w / 2} ${y + u * .005} ${x + w} ${y}`); p.setAttribute('stroke-width', u * .0028); });
    a.pools.forEach(p => { const x = r() * W, y = ctx.edge(x, .5) + r() * H * .05, w = u * (.03 + r() * .05); p.setAttribute('d', `M${x - w} ${y}Q${x} ${y - u * .008} ${x + w} ${y}Q${x} ${y + u * .006} ${x - w} ${y}Z`); });
    // 白鷺鷥
    const ex = W * (tall ? .7 : .8), ey = H * (tall ? .8 : .9), s = u / 1000 * (tall ? 1.3 : 1.1);
    a.egret.setAttribute('transform', `translate(${ex} ${ey}) scale(${s})`);
    a.legs.setAttribute('d', 'M-4 -20L-6 0M4 -20L6 0'); a.legs.setAttribute('stroke-width', 2.2);
    a.body.setAttribute('d', 'M-22 -34Q-18 -48 0 -46Q16 -44 22 -34Q12 -20 -4 -20Q-16 -22 -22 -34Z');
    a.neck.setAttribute('d', 'M12 -42Q8 -58 16 -70Q22 -76 28 -72Q22 -64 20 -56Q20 -46 16 -40Z');
    a.beak.setAttribute('d', 'M27 -73L46 -70L27 -69Z');
    a.shadow.setAttribute('d', 'M-26 1Q0 -3 26 1Q0 5 -26 1Z');
    a.headO = 0;
  },
  tide(ctx, L) {
    const a = ctx.art, { u } = ctx;
    for (const p of a.poles) p.water(p.by - (p.by - p.top) * (.05 + L * .7));
    // 沙洲：只在退潮時浮出，越乾越厚
    const show = Math.max(0, .55 - L) / .55;
    a.barDefs.forEach((b, i) => {
      const h = show * u * .012 * (1 + i * .5), m = (b.x0 + b.x1) / 2, w = (b.x1 - b.x0) / 2 * (.6 + show * .4);
      a.bars[i].setAttribute('d', h < .3 ? '' : `M${m - w} ${b.y}Q${m - w * .4} ${b.y - h} ${m} ${b.y - h}Q${m + w * .6} ${b.y - h} ${m + w} ${b.y}Z`);
      a.barFoam[i].setAttribute('d', h < .3 ? '' : `M${m - w} ${b.y}L${m + w} ${b.y}L${m + w * .96} ${b.y + u * .003}L${m - w * .96} ${b.y + u * .003}Z`);
    });
  },
  frame(ctx, T) {
    // 白鷺鷥偶爾低頭啄一下
    const ph = (T % 23) / 23, dip = ph > .82 && ph < .9 ? Math.sin((ph - .82) / .08 * Math.PI) : 0;
    ctx.art.head.setAttribute('transform', `translate(${(dip * 6).toFixed(1)} ${(dip * 26).toFixed(1)}) rotate(${(dip * 30).toFixed(1)} 16 -40)`);
  },
};
