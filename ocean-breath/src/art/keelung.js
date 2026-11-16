// 基隆：防波堤盡頭的紅白燈塔、遠方圓錐形的基隆嶼，前景是和平島的豆腐岩，退潮時一格一格露出來。燈塔偶爾閃光。
import { ridge, facets, submersible, el } from './kit.js';

export default {
  horizon: tall => tall ? .46 : .5,
  wave: { amp: .9, len: .95, speed: 1, chop: 1, foam: .9, swash: .9 },
  build(ctx) {
    const a = ctx.art = {};
    a.islet = ctx.add('path', 'far1', ctx.g.far); a.isletLit = ctx.add('path', 'cloud', ctx.g.far, { opacity: .2 });
    a.hills = ctx.add('path', 'far2', ctx.g.far); a.hillsLit = ctx.add('path', 'cloud', ctx.g.far, { opacity: .14 });
    a.hills2 = ctx.add('path', 'far3', ctx.g.far);
    a.wall = ctx.add('path', 'rock', ctx.g.back); a.wallTop = ctx.add('path', 'land', ctx.g.back);
    a.blocks = ctx.add('path', 'rock2', ctx.g.back);
    a.wallFoam = ctx.add('path', 'foam', ctx.g.back, { opacity: .8 });
    const lh = a.lh = el('g', '', ctx.g.back);
    a.beam = ctx.add('path', 'glint', lh, { class: 'beam' });
    a.tower = ctx.add('path', 'cloud', lh); a.bands = ctx.add('path', 'accent', lh);
    a.gallery = ctx.add('rect', 'accent', lh); a.lamp = ctx.add('rect', 'sun', lh, { class: 'lamp' }); a.cap = ctx.add('path', 'accent', lh);
    a.mush = submersible(ctx, ctx.g.back, 'rock', 'sea2');
    a.mushCap = ctx.add('path', 'land2', a.mush.extra);
    a.gaps = ctx.add('path', 'rock', ctx.g.inter);
    a.tofu = Array.from({ length: 160 }, (_, i) => ctx.add('path', i % 7 === 3 ? 'land2' : 'land', ctx.g.inter));
    a.moss = Array.from({ length: 8 }, () => ctx.add('path', 'plant', ctx.g.inter, { opacity: .8 }));
    a.front = ctx.add('path', 'rock2', ctx.g.front);
    a.frontLit = ctx.add('path', 'rock', ctx.g.front);
  },
  layout(ctx) {
    const { W, H, hz, tall, u } = ctx, a = ctx.art;
    // 基隆嶼：圓錐小島
    const ix = W * (tall ? .62 : .7), is = tall ? W * .22 : u * .16;
    const IP = [[ix - is, hz], [ix - is * .45, hz - is * .2], [ix - is * .1, hz - is * .36], [ix + is * .12, hz - is * .32], [ix + is * .5, hz - is * .12], [ix + is, hz]];
    a.islet.setAttribute('d', ridge(IP, hz + 1)); a.isletLit.setAttribute('d', facets(IP, hz + 1, 1));
    // 右側的山
    const HP = [[W * .78, hz], [W * .86, hz - H * .08], [W * .92, hz - H * .1], [W * .97, hz - H * .16], [W * 1.02, hz - H * .2]];
    a.hills.setAttribute('d', ridge(HP, hz + 1)); a.hillsLit.setAttribute('d', facets(HP, hz + 1, -1));
    a.hills2.setAttribute('d', ridge([[W * .88, hz], [W * .94, hz - H * .05], [W * 1.02, hz - H * .09]], hz + 1));

    // 防波堤：從左邊伸進海裡，前端是燈塔
    const wy = hz + H * (tall ? .05 : .06), wx = W * (tall ? .5 : .4), th = H * .022;
    a.wall.setAttribute('d', `M-4 ${wy - th}L${wx} ${wy - th * .6}L${wx} ${wy + th * .7}L-4 ${wy + th * 1.2}Z`);
    a.wallTop.setAttribute('d', `M-4 ${wy - th}L${wx} ${wy - th * .6}L${wx} ${wy - th * .25}L-4 ${wy - th * .45}Z`);
    let blk = ''; const n = Math.round(wx / (u * .025));
    for (let i = 0; i < n; i++) { const x = i / n * wx, s = u * .011 * (1.2 - i / n * .4), y = wy + th * (1.2 - i / n * .5); blk += `M${x - s} ${y}L${x} ${y - s * 1.3}L${x + s} ${y}Z`; }
    a.blocks.setAttribute('d', blk);
    a.wallFoam.setAttribute('d', `M-4 ${wy + th * 1.15}L${wx + u * .01} ${wy + th * .66}L${wx + u * .02} ${wy + th * .9}L-4 ${wy + th * 1.5}Z`);
    const tw = u * .022, tH = u * .1, tx = wx - tw * 1.2, ty = wy - th * .6;
    a.tower.setAttribute('d', `M${tx - tw / 2} ${ty}L${tx - tw * .36} ${ty - tH}L${tx + tw * .36} ${ty - tH}L${tx + tw / 2} ${ty}Z`);
    let bd = ''; for (const f of [.18, .52]) { const y1 = ty - tH * f, y2 = y1 - tH * .17, w1 = tw * (.5 - f * .14), w2 = tw * (.5 - (f + .17) * .14); bd += `M${tx - w1} ${y1}L${tx - w2} ${y2}L${tx + w2} ${y2}L${tx + w1} ${y1}Z`; }
    a.bands.setAttribute('d', bd);
    a.gallery.setAttribute('x', tx - tw * .55); a.gallery.setAttribute('y', ty - tH - u * .005); a.gallery.setAttribute('width', tw * 1.1); a.gallery.setAttribute('height', u * .006);
    a.lamp.setAttribute('x', tx - tw * .3); a.lamp.setAttribute('y', ty - tH - u * .02); a.lamp.setAttribute('width', tw * .6); a.lamp.setAttribute('height', u * .015);
    a.cap.setAttribute('d', `M${tx - tw * .42} ${ty - tH - u * .02}L${tx} ${ty - tH - u * .036}L${tx + tw * .42} ${ty - tH - u * .02}Z`);
    const ly = ty - tH - u * .0125;
    a.beam.setAttribute('d', `M${tx} ${ly}L${tx + W * .5} ${ly - u * .022}L${tx + W * .5} ${ly + u * .022}ZM${tx} ${ly}L${tx - W * .5} ${ly - u * .016}L${tx - W * .5} ${ly + u * .016}Z`);

    // 蕈狀岩：潮水漲時只剩頭
    const mx = W * (tall ? .78 : .74), my = hz + H * (tall ? .16 : .17), mw = u * .05, mh = u * .085;
    a.mush.set(`M${mx - mw * .28} ${my}L${mx - mw * .2} ${my - mh * .62}L${mx + mw * .18} ${my - mh * .62}L${mx + mw * .3} ${my}Z`, mx - mw, mw * 2, my + 2);
    a.mushCap.setAttribute('d', `M${mx - mw * .7} ${my - mh * .6}Q${mx - mw * .6} ${my - mh * 1.05} ${mx + mw * .05} ${my - mh}Q${mx + mw * .72} ${my - mh * .95} ${mx + mw * .66} ${my - mh * .58}Z`);
    a.mush.top = my - mh * .62; a.mush.by = my;

    // 豆腐岩平台：一格格四方石塊，裁切在岸的形狀裡
    const base = tall ? .66 : .72, range = .06;
    ctx.edge = (x, L) => H * (base + (L - .5) * range) + Math.sin(x / W * 7 + 2) * H * .012 + Math.sin(x / W * 19) * H * .004;
    ctx.seaBottom = H * (base + range * .5 + .03);
    ctx.bandAt = [.08, .3, .62]; ctx.rippleAt = [.1, .4, .7, null, null];
    const rows = 6, top = H * (base - range * .5 - .01);
    a.gaps.setAttribute('d', `M0 ${top}L${W} ${top}L${W} ${H}L0 ${H}Z`);
    // 透視：遠處一排排小格，近處少而大；格與格之間是較深的裂縫
    let k = 0; const r = ctx.seeded(5);
    const cx = W * .5, R0 = H - top;
    for (let row = 0; row < rows && k < a.tofu.length; row++) {
      const f0 = Math.pow(row / rows, 1.6), f1 = Math.pow((row + 1) / rows, 1.6);
      const y = top + R0 * f0, y2 = top + R0 * f1, g = u * (.004 + f1 * .012);
      const spread = 1.1 + f0 * 1.3, cols = Math.max(4, Math.round(W * spread / (u * (.07 + f0 * .16))));   // 往下變寬變大，像從腳邊往海延伸
      for (let c = 0; c < cols && k < a.tofu.length; c++) {
        if (r() < .12) continue;                                            // 偶爾缺一塊
        const t0 = (c + (row % 2) * .5) / cols - .5, t1 = (c + 1 + (row % 2) * .5) / cols - .5;
        const xa = cx + t0 * W * spread, xb = cx + t1 * W * spread, xc = cx + t0 * W * (spread + (f1 - f0) * 1.3), xd = cx + t1 * W * (spread + (f1 - f0) * 1.3);
        const rr = Math.min(g * 1.4, (y2 - y) * .3);
        a.tofu[k++].setAttribute('d', `M${xa + g + rr} ${y + g}L${xb - g - rr} ${y + g}Q${xb - g} ${y + g} ${xb - g} ${y + g + rr}L${xd - g} ${y2 - g - rr}Q${xd - g} ${y2 - g} ${xd - g - rr} ${y2 - g}L${xc + g + rr} ${y2 - g}Q${xc + g} ${y2 - g} ${xc + g} ${y2 - g - rr}L${xa + g} ${y + g + rr}Q${xa + g} ${y + g} ${xa + g + rr} ${y + g}Z`);
      }
    }
    for (; k < a.tofu.length; k++) a.tofu[k].setAttribute('d', '');
    a.moss.forEach(p => { const x = r() * W, y = top + r() * (H - top) * .5, w = u * (.02 + r() * .03); p.setAttribute('d', `M${x - w} ${y}Q${x} ${y - w * .5} ${x + w} ${y}Q${x} ${y + w * .2} ${x - w} ${y}Z`); });
    // 最前方的岩角
    const fy = H * (tall ? .84 : .9);
    a.front.setAttribute('d', `M${W * (tall ? .62 : .78)} ${H + 2}L${W * (tall ? .74 : .84)} ${fy}L${W * .92} ${fy - H * .04}L${W + 2} ${fy - H * .02}L${W + 2} ${H + 2}Z`);
    a.frontLit.setAttribute('d', `M${W * (tall ? .74 : .84)} ${fy}L${W * .92} ${fy - H * .04}L${W * .9} ${fy + H * .02}Z`);
  },
  tide(ctx, L) { const m = ctx.art.mush; m.water(m.by - (m.by - m.top) * (.15 + L * .55)); },
};
