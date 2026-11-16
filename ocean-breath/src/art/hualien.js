// 花蓮：中央山脈一層層落進太平洋，前景是圓滾滾的礫石灘。海很大，山很安靜，海鳥偶爾掠過。
import { ridge, facets, pebble, tuft, submersible, el } from './kit.js';

export default {
  horizon: tall => tall ? .44 : .5,
  wave: { amp: 1.05, len: 1.1, speed: .9, chop: 1, foam: 1, swash: 1.1 },
  birds: true,
  build(ctx) {
    const a = ctx.art = {};
    a.ridges = ['far1', 'far2', 'far3'].map(k => ({ body: ctx.add('path', k, ctx.g.far), lit: ctx.add('path', 'cloud', ctx.g.far, { opacity: .2 }) }));
    a.shade = ctx.add('path', null, ctx.g.far, { opacity: .55 }); a.shade.setAttribute('fill', ctx.dotsFill);
    a.cliffFoam = ctx.add('path', 'foam', ctx.g.far, { opacity: .85 });
    a.rocks = [0, 1].map(() => submersible(ctx, ctx.g.back, 'rock', 'sea2'));
    a.wetPebbles = Array.from({ length: 26 }, (_, i) => ctx.add('path', ['rock', 'rock2', 'land2', 'cloud'][i % 4], ctx.g.inter));
    a.pebbles = Array.from({ length: 30 }, (_, i) => ctx.add('path', ['rock', 'land2', 'rock2', 'cloud', 'accent'][i % 9 === 4 ? 4 : i % 4], ctx.g.front));
    a.tufts = [0, 1, 2].map(() => tuft(ctx, ctx.g.front, 'plant', 6));
  },
  layout(ctx) {
    const { W, H, hz, tall, rand } = ctx, a = ctx.art;
    const span = tall ? .95 : .62;
    // 山：三層，越後面越高越淡；最前面一層像斷崖一樣落進海裡
    const R1 = [[0, hz - H * (tall ? .26 : .34)], [span * .13, hz - H * (tall ? .3 : .38)], [span * .3, hz - H * (tall ? .22 : .29)], [span * .44, hz - H * (tall ? .25 : .32)], [span * .62, hz - H * (tall ? .14 : .19)], [span * .82, hz - H * .07], [span, hz]].map(([x, y]) => [x * W, y]);
    const R2 = [[0, hz - H * (tall ? .18 : .24)], [span * .16, hz - H * (tall ? .15 : .2)], [span * .26, hz - H * (tall ? .2 : .26)], [span * .42, hz - H * (tall ? .1 : .12)], [span * .56, hz - H * .05], [span * .7, hz]].map(([x, y]) => [x * W, y]);
    const R3 = [[0, hz - H * (tall ? .08 : .11)], [span * .1, hz - H * (tall ? .11 : .15)], [span * .2, hz - H * (tall ? .07 : .09)], [span * .3, hz - H * .03], [span * .36, hz + H * .004]].map(([x, y]) => [x * W, y]);
    [R1, R2, R3].forEach((r, i) => { a.ridges[i].body.setAttribute('d', ridge(r, hz + 1)); a.ridges[i].lit.setAttribute('d', facets(r, hz + 1, 1)); });
    a.shade.setAttribute('d', facets(R3, hz + 1, -1));
    const fx = R3[R3.length - 1][0];
    a.cliffFoam.setAttribute('d', `M${fx - W * .05} ${hz + 1}Q${fx - W * .02} ${hz - H * .006} ${fx + W * .012} ${hz + 2}Q${fx - W * .02} ${hz + H * .004} ${fx - W * .05} ${hz + 1}Z`);

    // 礫石灘：新月形的灘線，越滿潮越靠近觀者
    const base = tall ? .7 : .78, curve = tall ? .06 : .1, range = tall ? .055 : .065;
    ctx.edge = (x, L) => H * (base - curve * (1 - Math.pow((x / W - .62) * 1.4, 2)) * .5 + (L - .5) * range) + Math.sin(x / W * 9) * H * .004;
    ctx.seaBottom = H * (base + range * .5 + .02);
    ctx.bandAt = [.07, .3, .6]; ctx.rippleAt = [.03, .14, .38, .5, null];

    // 海中兩塊礁石：潮水漲時只露出頂端
    const rk = [[.72, .15, .05], [.9, .2, .032]];
    a.rocks.forEach((r, i) => {
      const [fx2, fy, s] = rk[i], cx = fx2 * W, by = hz + (ctx.seaBottom - hz) * (fy + .25), w = s * ctx.u * 1.6, h = w * .55;
      r.set(`M${cx - w / 2} ${by}L${cx - w * .32} ${by - h * .7}L${cx - w * .05} ${by - h}L${cx + w * .28} ${by - h * .62}L${cx + w / 2} ${by}Z`, cx - w / 2, w, by + 2);
      r.h = h; r.by = by;
    });

    // 石頭：靠水的一批只在退潮露出（裁切在岸的形狀裡），其餘一直在
    const pr = ctx.seeded(41);
    a.wetPebbles.forEach(p => {
      const x = pr() * W, e = ctx.edge(x, .5), y = e + (pr() - .3) * H * .07, s = ctx.u * (.008 + pr() * .01);
      p.setAttribute('d', pebble(x, y, s * 1.4, s * .75, pr));
    });
    a.pebbles.forEach(p => {
      const x = pr() * W, f = pr(), y = ctx.edge(x, 1) + H * .03 + f * f * (H - ctx.edge(x, 1)), s = ctx.u * (.008 + f * .03);
      p.setAttribute('d', pebble(x, y, s * 1.35, s * .7, pr));
    });
    a.tufts.forEach((t, i) => t.place(W * (tall ? .76 : .86) + i * ctx.u * .03, H * (tall ? .86 : .985), ctx.u * (.06 + i * .015), pr));
  },
  tide(ctx, L) {
    for (const r of ctx.art.rocks) r.water(r.by - r.h * (.62 - L * .4));
  },
  frame(ctx, T, dt, p) { for (const t of ctx.art.tufts) t.sway(T, p.wind); },
};
