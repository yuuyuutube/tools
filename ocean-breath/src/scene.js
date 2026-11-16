// Scene Renderer：天空、日月、雲、海面分層、浪花、岸邊潮線與海鳥。每片海的地形交給 art/*.js。
// 三種時間尺度：潮汐（數小時，只動潮線與露出的岸）、海面起伏（數秒，依浪高與週期）、細節（反光、浪花、泡沫）。
import { el, set, clamp, lerp, smooth, frac, noise, seeded, wavePath, linePath } from './util.js';
import { palette } from './palettes.js';
import { moonPath } from './moon.js';
import { sunPosition } from './sun.js';
import { ARTS } from './art/index.js';

let uid = 0;
const TAU = Math.PI * 2;
const peak = th => 2 * Math.pow((1 + Math.sin(th)) / 2, 1.5) - 1;      // 波峰窄、波谷寬

/**
 * host：容器；opts.size = [w, h] 時用固定尺寸（分享圖、圖鑑縮圖）
 * opts.still：只畫一張靜態畫面
 */
export function createScene(host, coast, opts = {}) {
  const art = ARTS[coast.id];
  const id = `s${++uid}`;
  const svg = el('svg', 'scene', null, { 'aria-hidden': 'true', xmlns: 'http://www.w3.org/2000/svg' });
  const defs = el('defs', '', svg);
  const painted = [];
  const paint = (node, key, attr = 'fill') => { node.setAttribute(`data-${attr === 'fill' ? 'c' : 's'}`, key); painted.push([node, key, attr]); return node; };
  const add = (tag, key, parent, attrs) => { const n = el(tag, '', parent, attrs); if (key) paint(n, key); return n; };

  // 網點：只用在少數色塊上
  const dots = el('pattern', '', defs, { id: `${id}-dots`, width: 6, height: 6, patternUnits: 'userSpaceOnUse', patternTransform: 'rotate(30)' });
  paint(el('circle', '', dots, { cx: 3, cy: 3, r: 1.1 }), 'rock2');
  const skyClip = el('clipPath', '', defs, { id: `${id}-sky` }); const skyClipRect = el('rect', '', skyClip);
  const landClip = el('clipPath', '', defs, { id: `${id}-land` }); const landClipPath = el('path', '', landClip);

  const g = {};
  for (const name of ['sky', 'stars', 'celestial', 'clouds', 'far', 'sea', 'glints', 'back', 'land', 'inter', 'swash', 'front', 'life']) g[name] = el('g', `l-${name}`, svg);
  g.celestial.setAttribute('clip-path', `url(#${id}-sky)`);
  g.inter.setAttribute('clip-path', `url(#${id}-land)`);

  const sky = add('rect', 'sky', g.sky), sky2 = add('rect', 'sky2', g.sky);
  const stars = Array.from({ length: 22 }, (_, i) => add('circle', 'glint', g.stars, { class: 'star' }));
  const sunBack = add('circle', 'accent2', g.celestial, { class: 'riso' }), sun = add('circle', 'sun', g.celestial);
  const moonG = el('g', '', g.celestial); const moonDisk = add('circle', 'sky2', moonG, { r: 1 }); const moonLit = add('path', 'sun', moonG);
  const clouds = [0, 1, 2, 3].map(i => { const n = el('g', 'cloud', g.clouds); return { n, parts: [0, 1, 2].map(() => add('rect', 'cloud', n)), x: 0, y: 0, s: 1, v: 1 }; });
  const seaBody = add('rect', 'sea0', g.sea);
  const BANDS = ['seaA', 'sea1', 'sea2', 'sea3'];
  const bands = BANDS.map(k => add('path', k, g.sea));
  // 每道波峰上一條斷續的亮線，像絹印多印了一版
  const crests = BANDS.map(() => { const p = el('path', 'crest', g.sea); paint(p, 'foam', 'stroke'); return p; });
  const ripples = [0, 1, 2, 3, 4].map(() => { const p = el('path', 'ripple', g.sea); paint(p, 'foam', 'stroke'); return p; });
  const caps = Array.from({ length: 18 }, () => add('path', 'foam', g.sea, { class: 'cap' }));
  const glints = Array.from({ length: 16 }, () => add('rect', 'glint', g.glints, { class: 'glint' }));
  const path = Array.from({ length: 9 }, () => add('rect', 'glint', g.glints, { class: 'path' }));
  const land = add('path', 'land', g.land), wet = add('path', 'land2', g.land, { class: 'wet' });
  const sheet = add('path', 'sea1', g.swash, { class: 'swash' }); const foamLine = el('path', 'foamline', g.swash); paint(foamLine, 'foam', 'stroke');
  const birds = [0, 1].map(() => { const n = el('g', 'bird', g.life); const p = el('path', '', n); paint(p, 'text', 'stroke'); return { n, p, on: false }; });

  const seedBase = coast.id.length * 7919 + coast.id.charCodeAt(0) + 17;
  const ctx = { svg, defs, g, id, add, paint, rand: seeded(coast.id.length * 7919 + coast.id.charCodeAt(0)), seeded, dotsFill: `url(#${id}-dots)`, landClipId: `${id}-land` };
  art.build(ctx);
  svg.appendChild(g.life);           // 海鳥永遠在最上層
  (host || document.body).appendChild(svg);

  let W = 0, H = 0, raf = 0, last = 0, t0 = performance.now() / 1000 + ctx.rand() * 400, time = t0;
  let vs = null, tideNow = .5, tideTo = .5, wave = .32, waveTo = .32, wind = .25, windTo = .25, period = 8;
  let paused = false, still = !!opts.still, nextBird = 18 + ctx.rand() * 30;
  let currentPalette = null;

  function applyPalette(p) {
    currentPalette = p;
    for (const [n, key, attr] of painted) n.setAttribute(attr, p[key]);
    svg.style.setProperty('--ink', p.text);
  }

  function layout() {
    [W, H] = opts.size || [host.clientWidth, host.clientHeight];
    if (!W || !H) return;
    ctx.rand = seeded(seedBase);
    const tall = W / H < .9, u = Math.min(W, H * 1.6);
    Object.assign(ctx, { W, H, tall, u, hz: Math.round(H * art.horizon(tall, W / H)) });
    set(svg, { viewBox: `0 0 ${W} ${H}`, width: W, height: H });
    set(sky, { width: W, height: H }); set(skyClipRect, { width: W, height: ctx.hz + 1 });
    // 天空的第二層色塊：貼著地平線的一條寬帶，不用漸層
    const bandH = Math.round((ctx.hz) * (tall ? .22 : .26));
    set(sky2, { y: ctx.hz - bandH, width: W, height: bandH + 2 });
    set(seaBody, { y: ctx.hz, width: W, height: H - ctx.hz });
    const r = ctx.rand;
    stars.forEach((s, i) => set(s, { cx: (r() * W).toFixed(1), cy: (r() * ctx.hz * .7).toFixed(1), r: (.8 + r() * 1.3).toFixed(1) }) && (s.style.animationDelay = `${(-r() * 6).toFixed(1)}s`));
    clouds.forEach((c, i) => {
      c.s = (tall ? W / 520 : u / 1000) * (.75 + r() * .6); c.y = ctx.hz * (.18 + i * .16 + r() * .05); c.x = r() * W; c.v = .6 + r() * .8;
      const w = 160 * c.s, h = 26 * c.s;
      set(c.parts[0], { x: -w / 2, y: 0, width: w, height: h, rx: h / 2 });
      set(c.parts[1], { x: -w * .32, y: -h * .78, width: w * .5, height: h, rx: h / 2 });
      set(c.parts[2], { x: w * .04, y: -h * 1.4, width: w * .3, height: h * .9, rx: h * .45 });
    });
    glints.forEach(gl => { gl.dataset.f = r(); gl.dataset.x = r(); gl.style.animationDelay = `${(-r() * 9).toFixed(1)}s`; gl.style.animationDuration = `${(5 + r() * 6).toFixed(1)}s`; });
    path.forEach((p, i) => { p.style.animationDelay = `${(-r() * 7).toFixed(1)}s`; p.style.animationDuration = `${(3.5 + r() * 4).toFixed(1)}s`; });
    ctx.bandAt = [.1, .32, .64]; ctx.rippleAt = [.05, .2, .45, null, null]; ctx.seaBottom = H;
    art.layout(ctx);
    placeGlints(); placeCelestial(); drawLand(true); frame(0);
  }

  // 依透視：越接近地平線越扁越小
  const seaBottom = () => Math.min(ctx.H, ctx.seaBottom ?? ctx.H);
  function placeGlints() {
    const top = ctx.hz + 4, bot = seaBottom();
    glints.forEach(gl => {
      const f = +gl.dataset.f, y = top + (bot - top) * f * f * .85, w = (6 + 30 * f) * ctx.u / 1000;
      set(gl, { x: (+gl.dataset.x * ctx.W).toFixed(1), y: y.toFixed(1), width: w.toFixed(1), height: Math.max(1.4, 3.2 * f * ctx.u / 1000).toFixed(1), rx: 1.5 });
    });
  }

  function placeCelestial() {
    if (!vs || !W) return;
    const rel = a => ((a - vs.facing + 540) % 360) - 180;
    const R = (ctx.tall ? W * .075 : ctx.u * .042);
    const where = (az, elev) => {
      const r = rel(az), x = clamp(W / 2 + r / 80 * W * .5, R * 1.4, W - R * 1.4), y = ctx.hz - clamp(elev / 55, -.2, 1) * (ctx.hz - (ctx.tall ? H * .2 : H * .12));
      return { x, y, visible: Math.abs(r) < 88 && elev > -4 };
    };
    const s = where(vs.azimuth, vs.elevation);
    const sunUp = s.visible && vs.phase !== 'night';
    for (const n of [sun, sunBack]) n.style.opacity = sunUp ? '' : 0;
    set(sun, { cx: s.x, cy: s.y, r: R }); set(sunBack, { cx: s.x + R * .1, cy: s.y + R * .08, r: R });
    // 月亮：以「月齡 × 一天」往回推太陽的位置，粗略得到月亮在天空的位置
    const mp = sunPosition(vs.t - vs.moon * 24.84 * 3600000, ctx.lat || 24, ctx.lon || 121);
    const m = where(mp.azimuth, mp.elevation);
    const moonUp = m.visible && vs.phase !== 'day' && vs.moon > .04 && vs.moon < .96;
    moonG.style.opacity = moonUp ? '' : 0;
    set(moonG, { transform: `translate(${m.x.toFixed(1)} ${m.y.toFixed(1)}) scale(${(R * .72).toFixed(1)}) rotate(-20)` });
    moonLit.setAttribute('d', moonPath(vs.moon));
    stars.forEach(st => st.style.opacity = vs.phase === 'night' ? '' : 0);
    // 日月在海面上的反光帶
    const src = sunUp ? s : moonUp ? m : null;
    const low = src && (sunUp ? vs.elevation < 35 : true);
    path.forEach((p, i) => {
      if (!low) { p.style.display = 'none'; return; }
      p.style.display = '';
      const f = (i + .5) / path.length, y = ctx.hz + 3 + (seaBottom() - ctx.hz) * .62 * f * f + 2, w = R * (.35 + 1.6 * f) * (sunUp ? 1 : .7);
      set(p, { x: (src.x - w / 2 + Math.sin(i * 2.3) * R * .3).toFixed(1), y: y.toFixed(1), width: w.toFixed(1), height: Math.max(1.6, R * .07 * (.5 + f * 2)).toFixed(1), rx: 2 });
    });
  }

  // 潮線：岸的上緣隨水位上下移動；越滿潮，水越靠近觀者
  let landKey = '';
  function drawLand(force) {
    if (!ctx.edge) return;
    const key = tideNow.toFixed(4);
    if (!force && key === landKey) return; landKey = key;
    const n = 56, pts = [];
    for (let i = 0; i <= n; i++) { const x = i / n * W; pts.push([x, ctx.edge(x, tideNow)]); }
    const d = wavePath(pts, H + 2);
    land.setAttribute('d', d); landClipPath.setAttribute('d', d);
    ctx.edgePts = pts;
    art.tide?.(ctx, tideNow);
  }

  function frame(dt) {
    if (!W || !vs) return;
    const T = time;
    const k = 1 - Math.exp(-dt / 2.5);           // 參數變化用數秒時間常數慢慢過渡，不跳
    tideNow = lerp(tideNow, tideTo, still ? 1 : k); wave = lerp(wave, waveTo, still ? 1 : k); wind = lerp(wind, windTo, still ? 1 : k);
    drawLand(false);
    const P = art.wave || {}, u = ctx.u, hz = ctx.hz, bot = seaBottom();
    const om = TAU / period;
    const step = Math.max(14, W / 64);
    const fr = [ctx.bandAt[0] * .3, ...ctx.bandAt];
    const contour = (i, x) => {
      const f = fr[i], persp = .12 + Math.pow(f, 1.25) * .88;
      const A = wave * u * .03 * persp * (P.amp || 1);
      const lam = u * .17 * (.3 + persp) * (P.len || 1);
      const kk = TAU / lam, base = hz + (bot - hz) * f;
      const env = .62 + .38 * noise(x / (lam * 2.6) + T * .025 * (P.speed || 1) + i * 7.3);
      const bob = A * .55 * Math.sin(om * T - i * 1.1);       // 一道道湧浪由遠而近
      const th1 = kk * x - om * .32 * T * (P.speed || 1) + i * 1.7, th2 = kk * 1.83 * x + om * .21 * T * (P.speed || 1) + i * 4.1;
      return { y: base + bob - A * env * (peak(th1) * (P.chop || 1) + .42 * Math.sin(th2)), A, kk, env, th1 };
    };
    let capI = 0;
    bands.forEach((b, i) => {
      const pts = [];
      for (let x = -step; x <= W + step; x += step) pts.push([x, contour(i, x).y]);
      b.setAttribute('d', wavePath(pts, H + 2));
      const lift = 1 + i * .6;
      crests[i].setAttribute('d', linePath(pts.map(([x, y]) => [x, y + lift])));
      crests[i].setAttribute('stroke-width', (.8 + i * .55) * u / 1000 + .4);
      // 浪花：只在最近的兩層、浪大一點的波峰上出現
      if (i >= bands.length - 2) {
        const c0 = contour(i, 0), lam = TAU / c0.kk, phase0 = c0.th1;
        let x = ((Math.PI / 2 - phase0) / c0.kk) % lam; if (x < 0) x += lam;
        for (; x < W && capI < caps.length; x += lam) {
          const c = contour(i, x), on = smooth(clamp((c.env * wave - .26) / .3, 0, 1)) * (P.foam ?? 1);
          const cap = caps[capI++], w = lam * .3, h = Math.max(1.5, c.A * .75);
          cap.setAttribute('d', `M${(x - w / 2).toFixed(1)} ${(c.y + h * .4).toFixed(1)}Q${x.toFixed(1)} ${(c.y - h).toFixed(1)} ${(x + w / 2).toFixed(1)} ${(c.y + h * .4).toFixed(1)}Q${x.toFixed(1)} ${(c.y + h * .1).toFixed(1)} ${(x - w / 2).toFixed(1)} ${(c.y + h * .4).toFixed(1)}Z`);
          cap.style.opacity = on.toFixed(2);
        }
      }
    });
    for (; capI < caps.length; capI++) caps[capI].style.opacity = 0;
    // 細長的波紋線：一段段短線，緩慢漂移
    ripples.forEach((r, i) => {
      const f = ctx.rippleAt?.[i]; if (f == null) { r.style.display = 'none'; return; }
      const y0 = hz + (bot - hz) * f, len = W * (.1 + .08 * ((i * 37) % 5)), x0 = frac(i * .37 + T * .004 * (i % 2 ? 1 : -1) * (P.speed || 1)) * (W + len) - len;
      const pts = []; for (let s = 0; s <= 6; s++) { const x = x0 + s / 6 * len; pts.push([x, y0 + Math.sin(x / (u * .03) + T * .5) * u * .002 * (1 + f)]); }
      r.style.display = ''; r.setAttribute('d', linePath(pts)); r.setAttribute('stroke-width', (1 + f * 2.2) * u / 1000);
    });
    // 岸邊的湧上與退去：快上慢退，週期跟著波浪週期
    if (ctx.edgePts && ctx.swash !== false) {
      const R = u * .016 * (.35 + wave) * (P.swash || 1), up = [], dn = [], foam = [];
      for (const [x, y] of ctx.edgePts) {
        const ph = frac(T / period + x / W * .35 + noise(x / (W * .2)) * .15);
        const s = ph < .3 ? smooth(ph / .3) : 1 - smooth((ph - .3) / .7);
        const run = R * (.25 + .75 * s) * (.7 + .3 * noise(x / (W * .1) + 3));
        up.push([x, y]); dn.push([x, y + run]);
      }
      const d = 'M' + up.map(p => p[0].toFixed(1) + ' ' + p[1].toFixed(1)).join('L') + 'L' + dn.reverse().map(p => p[0].toFixed(1) + ' ' + p[1].toFixed(1)).join('L') + 'Z';
      sheet.setAttribute('d', d); foamLine.setAttribute('d', linePath(dn.reverse()));
      foamLine.setAttribute('stroke-width', (2.2 * u / 1000 + .8).toFixed(1));
      // 濕沙：最近一次湧上留下的痕跡
      const wd = 'M' + ctx.edgePts.map(p => p[0].toFixed(1) + ' ' + p[1].toFixed(1)).join('L') + 'L' + [...ctx.edgePts].reverse().map(p => p[0].toFixed(1) + ' ' + (p[1] + R * 1.35).toFixed(1)).join('L') + 'Z';
      wet.setAttribute('d', wd);
    }
    // 雲：風越大飄越快（有上限）
    clouds.forEach(c => {
      c.x += dt * (3 + 16 * wind) * c.v * ctx.u / 1000 * (ctx.cloudDir || 1);
      const w = 200 * c.s; if (c.x > W + w) c.x = -w; if (c.x < -w) c.x = W + w;
      c.n.setAttribute('transform', `translate(${c.x.toFixed(1)} ${c.y.toFixed(1)})`);
    });
    // 海鳥：白天偶爾一隻（或兩隻）掠過
    if (!still && (vs.phase === 'day' || vs.phase === 'dawn' || vs.phase === 'dusk')) {
      nextBird -= dt;
      if (nextBird < 0) { launchBird(); nextBird = (art.birds ? 30 : 60) + ctx.rand() * 80; }
    }
    for (const b of birds) if (b.on) {
      b.p0 += dt / b.dur; if (b.p0 >= 1) { b.on = false; b.n.style.opacity = 0; continue; }
      const x = lerp(b.from, b.to, b.p0), y = b.y + Math.sin(b.p0 * 6) * ctx.u * .012, fl = Math.sin(T * 7 + b.seed), s = b.s;
      b.p.setAttribute('d', `M${-10 * s} ${fl * 3 * s}Q${-5 * s} ${(-4 - fl * 3) * s} 0 0Q${5 * s} ${(-4 - fl * 3) * s} ${10 * s} ${fl * 3 * s}`);
      b.n.setAttribute('transform', `translate(${x.toFixed(1)} ${y.toFixed(1)})`);
    }
    art.frame?.(ctx, T, dt, { wind, wave, period, vs });
  }

  function launchBird() {
    const b = birds.find(b => !b.on); if (!b) return;
    const ltr = ctx.rand() < .5;
    Object.assign(b, { on: true, p0: 0, dur: 16 + ctx.rand() * 10, from: ltr ? -40 : W + 40, to: ltr ? W + 40 : -40, y: ctx.hz * (.25 + ctx.rand() * .4), s: ctx.u / 1000 * (1 + ctx.rand() * .4), seed: ctx.rand() * 9 });
    b.n.style.opacity = 1; b.p.setAttribute('stroke-width', 2.2 * b.s);
  }

  function loop(now) {
    raf = 0; if (paused || still) return;
    const s = now / 1000, dt = Math.min(.25, s - last);
    if (dt >= 1 / 30) { last = s; time += dt; frame(dt); }
    raf = requestAnimationFrame(loop);
  }
  function start() { if (!raf && !paused && !still) { last = performance.now() / 1000; raf = requestAnimationFrame(loop); } }

  const ro = opts.size ? null : new ResizeObserver(() => { layout(); });
  ro?.observe(host);
  ctx.lat = coast.lat; ctx.lon = coast.lon;

  return {
    svg, ctx,
    /** vs：visual.js 的 VisualState；instant：時間軸拖曳時直接到位 */
    setState(next, { instant = false } = {}) {
      const phaseChanged = !vs || vs.phase !== next.phase || Math.abs((vs.warm || 0) - next.warm) > .05;
      vs = next; tideTo = next.tide; waveTo = next.wave; windTo = next.wind; period = next.period;
      if (instant || !currentPalette) { tideNow = tideTo; wave = waveTo; wind = windTo; }
      if (phaseChanged) { applyPalette(palette(coast.id, next.phase, next.warm)); svg.dataset.phase = next.phase; }
      if (!W) layout(); else placeCelestial();
      if (still || instant) frame(.016);
      start();
    },
    setStill(v) { still = v; svg.classList.toggle('still', v); if (v) { cancelAnimationFrame(raf); raf = 0; frame(.016); } else start(); },
    setPaused(v) { paused = v; if (v) { cancelAnimationFrame(raf); raf = 0; } else start(); },
    layout,
    birdNow: launchBird,
    palette: () => currentPalette,
    destroy() { cancelAnimationFrame(raf); raf = 0; paused = true; ro?.disconnect(); svg.remove(); },
  };
}
