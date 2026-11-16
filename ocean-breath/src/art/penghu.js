// 澎湖：玄武岩柱狀台地站在海邊，遠方小島上有白色燈塔。潮間帶的石滬在退潮時現形；風大，草被吹得很斜，海面節奏短而碎。
import { ridge, submersible, tuft, pebble, el } from './kit.js';

export default {
  horizon: tall => tall ? .47 : .5,
  wave: { amp: 1.05, len: .7, speed: 1.35, chop: 1.2, foam: 1.15, swash: 1 },
  build(ctx) {
    const a = ctx.art = {};
    a.isle2 = ctx.add('path', 'far1', ctx.g.far);
    a.isle = ctx.add('path', 'far2', ctx.g.far);
    a.light = ctx.add('path', 'cloud', ctx.g.far); a.lightTop = ctx.add('path', 'accent', ctx.g.far);
    a.mesa = submersible(ctx, ctx.g.back, 'rock', 'sea2');
    a.cols = ctx.add('path', 'rock2', a.mesa.extra);
    a.capTop = ctx.add('path', 'plant2', a.mesa.extra); a.cap = ctx.add('path', 'plant', a.mesa.extra);
    a.dots = ctx.add('path', null, a.mesa.extra, { opacity: .5 }); a.dots.setAttribute('fill', ctx.dotsFill);
    a.under = Array.from({ length: 46 }, () => ctx.add('circle', 'sea3', ctx.g.back, { opacity: .45 }));
    a.weir = Array.from({ length: 46 }, (_, i) => ctx.add('path', i % 4 ? 'rock' : 'rock2', ctx.g.inter));
    a.ground = ctx.add('path', 'land2', ctx.g.front);
    a.stones = Array.from({ length: 9 }, (_, i) => ctx.add('path', i % 2 ? 'rock' : 'rock2', ctx.g.front));
    a.grass = Array.from({ length: 9 }, (_, i) => tuft(ctx, ctx.g.front, i % 3 ? 'plant' : 'plant2', 8));
  },
  layout(ctx) {
    const { W, H, hz, tall, u } = ctx, a = ctx.art;
    a.isle2.setAttribute('d', ridge([[W * .02, hz], [W * .06, hz - H * .012], [W * .2, hz - H * .016], [W * .26, hz]], hz + 1));
    const ix = W * (tall ? .18 : .3), iw = W * (tall ? .22 : .14);
    a.isle.setAttribute('d', ridge([[ix - iw / 2, hz], [ix - iw * .38, hz - H * .022], [ix + iw * .3, hz - H * .026], [ix + iw / 2, hz]], hz + 1));
    const lx = ix + iw * .18, lw = u * .0045, lh = u * .026, ly = hz - H * .024;
    a.light.setAttribute('d', `M${lx - lw} ${ly}L${lx - lw * .7} ${ly - lh}L${lx + lw * .7} ${ly - lh}L${lx + lw} ${ly}Z`);
    a.lightTop.setAttribute('d', `M${lx - lw} ${ly - lh}L${lx} ${ly - lh - lw * 2}L${lx + lw} ${ly - lh}Z`);

    // 玄武岩台地：平頂、垂直柱，腳下泡在海裡
    const mx0 = W * (tall ? .5 : .6), mx1 = W + 4, top = hz - H * (tall ? .13 : .17), by = hz + H * (tall ? .1 : .11);
    a.mesa.set(`M${mx0} ${by}L${mx0 + W * .03} ${top + H * .03}L${mx0 + W * .08} ${top}L${mx1} ${top - H * .01}L${mx1} ${by}Z`, mx0, mx1 - mx0, by + 2);
    a.mesa.top = top; a.mesa.by = by;
    let cd = ''; const r = ctx.seeded(23), n = Math.round((mx1 - mx0) / (u * .022));
    for (let i = 0; i < n; i++) {
      if (i % 2) continue;
      const x = mx0 + W * .04 + i / n * (mx1 - mx0), w = (mx1 - mx0) / n * (.7 + r() * .3), t2 = top + H * .03 + r() * H * .02;
      cd += `M${x} ${by}L${x} ${t2}L${x + w} ${t2 - r() * H * .01}L${x + w} ${by}Z`;
    }
    a.cols.setAttribute('d', cd);
    a.cap.setAttribute('d', `M${mx0 + W * .07} ${top + H * .004}L${mx0 + W * .085} ${top - H * .004}L${mx1} ${top - H * .016}L${mx1} ${top + H * .018}L${mx0 + W * .07} ${top + H * .024}Z`);
    a.capTop.setAttribute('d', `M${mx0 + W * .05} ${top + H * .028}L${mx0 + W * .07} ${top + H * .004}L${mx1} ${top + H * .01}L${mx1} ${top + H * .04}Z`);
    a.dots.setAttribute('d', `M${mx0} ${by}L${mx0 + W * .03} ${top + H * .03}L${mx0 + W * .08} ${top + H * .04}L${mx0 + W * .08} ${by}Z`);

    // 礁岩平台與石滬：一道弧形的石牆從左下伸進潮間帶
    const base = tall ? .68 : .75, range = .085;
    ctx.edge = (x, L) => H * (base + (L - .5) * range) + Math.sin(x / W * 8 + 1) * H * .01;
    ctx.seaBottom = H * (base + range * .5 + .03);
    ctx.bandAt = [.07, .28, .58]; ctx.rippleAt = [.04, .16, .3, .44, .7];
    const cx = W * (tall ? .4 : .34), cy = H * (base + .12), rx = W * (tall ? .42 : .3), ry = H * (tall ? .1 : .13);
    a.weir.forEach((p, i) => {
      const t = i / (a.weir.length - 1), ang = Math.PI * (1.05 + t * .9), x = cx + Math.cos(ang) * rx, y = cy + Math.sin(ang) * ry, s = u * (.006 + (y - H * base) / H * .03 + r() * .003);
      p.setAttribute('d', pebble(x, y, s * 1.3, s * .8, r, 6));
      const under = a.under[i]; under.setAttribute('cx', x.toFixed(1)); under.setAttribute('cy', y.toFixed(1)); under.setAttribute('r', (s * 1.1).toFixed(1));
    });
    // 前景小坡、石塊與被風吹斜的草
    const gy = H * (tall ? .84 : .91);
    a.ground.setAttribute('d', `M-2 ${gy}C${W * .1} ${gy - H * .05} ${W * .24} ${gy - H * .03} ${W * (tall ? .5 : .36)} ${gy + H * .02}L${W * (tall ? .56 : .42)} ${H + 2}L-2 ${H + 2}Z`);
    a.stones.forEach(p => { const x = r() * W * (tall ? .9 : .7) + W * .05, y = gy + r() * (H - gy), s = u * (.008 + r() * .02); p.setAttribute('d', pebble(x, y, s * 1.4, s * .8, r)); });
    a.grass.forEach((t, i) => t.place(W * (.02 + i * (tall ? .055 : .036)), gy - H * .01 + (i % 3) * H * .012, u * (.04 + (i % 3) * .016), r));
  },
  tide(ctx, L) { const m = ctx.art.mesa; m.water(m.by - H0(ctx) * (.2 + L * .5)); },
  frame(ctx, T, dt, p) { for (const t of ctx.art.grass) t.sway(T, Math.min(1, p.wind * 1.25 + .1)); },
};
const H0 = ctx => ctx.H * .05;
