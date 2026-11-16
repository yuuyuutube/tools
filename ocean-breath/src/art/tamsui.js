// 淡水：河口對岸是躺臥的觀音山，夕陽在西北邊落下。水面平靜，碼頭木樁隨潮水淹沒，一艘小船慢慢漂（裝飾，不代表實際船舶）。
import { ridge, facets, submersible, el, tuft } from './kit.js';

export default {
  horizon: tall => tall ? .5 : .56,
  wave: { amp: .45, len: 1.5, speed: .55, chop: .45, foam: .15, swash: .5 },
  build(ctx) {
    const a = ctx.art = {};
    a.back = ctx.add('path', 'far1', ctx.g.far);
    a.mount = ctx.add('path', 'far2', ctx.g.far); a.lit = ctx.add('path', 'far3', ctx.g.far);
    a.shade = ctx.add('path', null, ctx.g.far, { opacity: .35 }); a.shade.setAttribute('fill', ctx.dotsFill);
    a.town = ctx.add('path', 'far3', ctx.g.far);
    a.boat = el('g', '', ctx.g.back); a.hull = ctx.add('path', 'accent', a.boat); a.sail = ctx.add('path', 'cloud', a.boat); a.mast = ctx.add('rect', 'accent', a.boat);
    a.posts = Array.from({ length: 7 }, () => submersible(ctx, ctx.g.back, 'rock', 'sea3'));
    a.beam = ctx.add('path', 'rock2', ctx.g.back);
    a.mud = Array.from({ length: 12 }, () => ctx.add('path', 'land2', ctx.g.inter, { opacity: .7 }));
    a.mangrove = el('g', '', ctx.g.front);
    a.roots = ctx.add('path', null, a.mangrove); ctx.paint(a.roots, 'rock2', 'stroke'); a.roots.setAttribute('fill', 'none');
    a.crowns = Array.from({ length: 6 }, (_, i) => ctx.add('path', i % 2 ? 'plant' : 'plant2', a.mangrove));
    a.reeds = Array.from({ length: 5 }, () => tuft(ctx, ctx.g.front, 'plant2', 6));
  },
  layout(ctx) {
    const { W, H, hz, tall, u } = ctx, a = ctx.art;
    a.back.setAttribute('d', ridge([[W * .52, hz], [W * .66, hz - H * .03], [W * .8, hz - H * .045], [W * .92, hz - H * .03], [W + 2, hz - H * .04]], hz + 1));
    // 觀音山：像一個人躺著的側臉，從左邊緩緩升起
    const sx = tall ? 1.15 : .72, x0 = tall ? -W * .1 : W * .02, s = tall ? H * .7 : H;
    const M = [[0, 0], [.08, -.04], [.15, -.085], [.21, -.13], [.25, -.175], [.28, -.15], [.31, -.16], [.35, -.12], [.4, -.115], [.45, -.085], [.5, -.09], [.56, -.05], [.66, -.02], [.76, 0]].map(([x, y]) => [x0 + x * W * sx, hz + y * s * .95]);
    a.mount.setAttribute('d', ridge(M, hz + 1)); a.lit.setAttribute('d', facets(M, hz + 1, -1)); a.shade.setAttribute('d', facets(M, hz + 1, 1));
    // 對岸八里的小房子：一排細小色塊
    let td = ''; const r = ctx.seeded(3);
    for (let i = 0; i < 18; i++) { const x = x0 + W * sx * (.42 + i * .018), w = u * (.006 + r() * .006), h = u * (.006 + r() * .012); td += `M${x} ${hz}L${x} ${hz - h}L${x + w} ${hz - h}L${x + w} ${hz}Z`; }
    a.town.setAttribute('d', td);

    // 泥灘與紅樹林：岸往右邊升高
    const base = tall ? .7 : .77, range = .07;
    ctx.edge = (x, L) => H * (base - (x / W) * .06 + (L - .5) * range) + Math.sin(x / W * 6) * H * .006;
    ctx.seaBottom = H * (base + range * .5 + .02);
    ctx.bandAt = [.14, .42, .72]; ctx.rippleAt = [.08, .26, .5, .66, .86];
    // 木樁：一排舊碼頭，越近越高
    const py = hz + (ctx.seaBottom - hz) * .62;
    a.posts.forEach((p, i) => {
      const f = i / (a.posts.length - 1), x = W * ((tall ? .08 : .14) + f * (tall ? .5 : .3)), by = py + f * H * .07, w = u * (.006 + f * .006), h = u * (.04 + f * .05);
      p.set(`M${x - w} ${by}L${x - w} ${by - h + w}Q${x} ${by - h - w * .4} ${x + w} ${by - h + w}L${x + w} ${by}Z`, x - w, w * 2, by + 2);
      p.top = by - h; p.by = by;
    });
    const p0 = a.posts[0], p1 = a.posts[a.posts.length - 1];
    const bx0 = W * (tall ? .08 : .14), bx1 = W * (tall ? .58 : .44);
    a.beam.setAttribute('d', `M${bx0} ${p0.top + u * .008}L${bx1} ${p1.top + u * .012}L${bx1} ${p1.top + u * .02}L${bx0} ${p0.top + u * .013}Z`);
    a.boatY = hz + (ctx.seaBottom - hz) * .3; a.boatS = u / 1000 * (tall ? 1.2 : 1);
    const bs = a.boatS;
    a.hull.setAttribute('d', `M${-34 * bs} 0L${34 * bs} 0L${24 * bs} ${9 * bs}L${-26 * bs} ${9 * bs}Z`);
    a.mast.setAttribute('x', -1.2 * bs); a.mast.setAttribute('y', -40 * bs); a.mast.setAttribute('width', 2.4 * bs); a.mast.setAttribute('height', 40 * bs);
    a.sail.setAttribute('d', `M${2 * bs} ${-38 * bs}L${24 * bs} ${-4 * bs}L${2 * bs} ${-4 * bs}Z`);
    a.boatX = a.boatX ?? W * .55;
    a.mud.forEach(p => { const x = r() * W, y = ctx.edge(x, .5) + (r() - .1) * H * .05, w = u * (.02 + r() * .05); p.setAttribute('d', `M${x - w} ${y}Q${x} ${y - u * .006} ${x + w} ${y}Q${x} ${y + u * .004} ${x - w} ${y}Z`); });
    // 紅樹林（水筆仔）：圓圓的樹冠，細細的支柱根
    const mx = W * (tall ? .72 : .8), my = ctx.edge(mx, .2) + H * .03;
    let rd = '';
    a.crowns.forEach((c, i) => {
      const x = mx + (i - 2.5) * u * .045 + (i % 2) * u * .01, y = my - u * (.035 + (i % 3) * .012), rx = u * (.04 + (i % 2) * .012), ry = rx * .7;
      c.setAttribute('d', `M${x - rx} ${y}A${rx} ${ry} 0 0 1 ${x + rx} ${y}Q${x} ${y + ry * .5} ${x - rx} ${y}Z`);
      for (let j = -1; j <= 1; j++) rd += `M${x + j * rx * .4} ${y + ry * .1}Q${x + j * rx * .55} ${my - u * .01} ${x + j * rx * .75} ${my + u * .006}`;
    });
    a.roots.setAttribute('d', rd); a.roots.setAttribute('stroke-width', u * .003);
    a.reeds.forEach((t, i) => t.place(W * ((tall ? .05 : .03) + i * .045), H * ((tall ? .86 : .97) - (i % 2) * .015), u * (.06 + (i % 3) * .015), r));
  },
  tide(ctx, L) { for (const p of ctx.art.posts) p.water(p.by - (p.by - p.top) * (.1 + L * .45)); },
  frame(ctx, T, dt, p) {
    const a = ctx.art;
    a.boatX += dt * ctx.u * .004; if (a.boatX > ctx.W + 60) a.boatX = -60;          // 非常慢地漂
    const bob = Math.sin(T * Math.PI * 2 / p.period) * ctx.u * .002, tilt = Math.sin(T * Math.PI * 2 / p.period + 1) * 1.5;
    a.boat.setAttribute('transform', `translate(${a.boatX.toFixed(1)} ${(a.boatY + bob).toFixed(1)}) rotate(${tilt.toFixed(2)})`);
    for (const t of a.reeds) t.sway(T, p.wind);
  },
};
