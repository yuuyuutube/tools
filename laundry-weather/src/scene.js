// 陽台插畫：建立 SVG、依畫面比例排版、讓風吹動衣服。
// 顏色與場景轉場交給 CSS（style.css 的 .scene[data-scene]），這裡只管形狀、位置與動態。
import { wardrobe, SETS, CAT, BIRDS, PLANTS, FACES, butterfly, FIREFLY } from './garments.js';
import { windParams, createBody, step } from './wind.js';
import { moonPhase, moonPath } from './moon.js';

const NS = 'http://www.w3.org/2000/svg';
const clamp = (n, a, b) => Math.min(b, Math.max(a, n));
const rand = (a, b) => a + Math.random() * (b - a);
const el = (tag, cls, parent) => { const n = document.createElementNS(NS, tag); if (cls) n.setAttribute('class', cls); parent?.appendChild(n); return n; };
const set = (n, attrs) => { for (const k in attrs) n.setAttribute(k, attrs[k]); return n; };

const CLOUDS = [                       // rank：0 晴天就有，1 多雲／潮濕才出現，2 雨天才出現
  { x: .08, y: .30, s: .9, v: 5, rank: 0, shape: 0 },      // 晴天那朵飄在山頭，不經過太陽
  { x: .52, y: .09, s: .62, v: 8, rank: 1, shape: 1 },
  { x: .30, y: .24, s: 1.05, v: 4, rank: 1, shape: 1 },
  { x: .92, y: .30, s: 1.2, v: 6, rank: 1, shape: 0 },
  { x: .66, y: .20, s: 1.35, v: 3.5, rank: 2, shape: 0 },
  { x: .14, y: .30, s: 1.25, v: 4.5, rank: 2, shape: 1 },
];
const CLOUD_SHAPES = [
  '<circle cx="-46" cy="-6" r="30"/><circle cx="-4" cy="-26" r="42"/><circle cx="44" cy="-8" r="30"/><rect x="-80" y="-12" width="160" height="34" rx="17"/>',
  '<circle cx="-30" cy="-14" r="32"/><circle cx="22" cy="-22" r="38"/><rect x="-66" y="-14" width="132" height="32" rx="16"/>',
];
const RANK = { sunny: 0, cloudy: 1, humid: 1, rainy: 2 };
const HEAVY = { sunny: 1, cloudy: 1, humid: .8, rainy: .6 };      // 濕衣服比較沉

export function createScene(host, { reduced = false, shot = false } = {}) {       // shot：分享圖用的精簡構圖
  const look = SETS[Math.floor(Math.random() * SETS.length)];
  const svg = set(el('svg', 'scene'), { 'aria-hidden': 'true', 'data-scene': 'sunny' });
  svg.style.setProperty('--a', look.a); svg.style.setProperty('--b', look.b); svg.style.setProperty('--pegc', look.peg);

  const sky = el('rect', 'c-sky', svg);
  const sun = el('g', 'sun', svg);
  el('circle', 'c-sunoff', sun);
  const rays = el('g', 'rays', sun);
  for (let i = 0; i < 9; i++) set(el('rect', 'c-ray', rays), { x: -.09, y: -1.72, width: .18, height: .36, rx: .05, transform: `rotate(${i * 40})` });
  el('circle', 'c-sun', sun); const moon = el('path', 'c-moon', sun);
  for (const c of sun.querySelectorAll('circle')) set(c, { r: 1 });
  set(sun.querySelector('.c-sunoff'), { cx: .06, cy: .05 }); set(moon, { transform: 'rotate(-24)' });

  const mass = el('g', 'c-mass', svg);
  const hills = [0, 1, 2, 3].map(() => el('circle', '', mass)); const massRect = el('rect', '', mass);
  const haze = el('g', 'haze', svg); const bands = [0, 1, 2].map(() => el('rect', 'c-cloud', haze));
  const clouds = CLOUDS.map(c => { const g = el('g', `cloud c-cloud${c.rank ? ' off' : ''}`, svg); g.innerHTML = CLOUD_SHAPES[c.shape]; return { ...c, g, off: 0 }; });
  const veil = el('g', 'cloud c-cloud veil', svg); veil.innerHTML = CLOUD_SHAPES[0];     // 太陽前面那朵
  const rain = el('g', 'rain', svg); const rainIn = el('g', 'rain-in', rain);
  const rope = el('path', 'rope', svg);

  // 掛在繩上的單位（襪子是一雙），每次開啟從隨機池抽四個：寬螢幕全掛，直式只掛前兩個
  const units = wardrobe(4, (new URLSearchParams(location.search).get('wear') || '').split(',')); let seed = 0;
  for (const u of units) u.items = u.parts.map(g => {
    const node = el('g', `garment ${g.kind}`, svg); const cloth = el('g', 'cloth', node); cloth.innerHTML = g.html;
    return { ...g, node, cloth, body: createBody({ seed: seed++ * 1.93 + rand(0, 6), stiff: g.stiff, drag: g.drag, gain: g.gain }),
      sleeves: g.sleeves ? [...cloth.querySelectorAll('.sleeve')] : null,
      parts: g.towel ? { body: cloth.querySelector('.towel-body'), shade: cloth.querySelector('.towel-shade'), waves: [...cloth.querySelectorAll('.towel-wave')] } : null };
  });
  const items = units.flatMap(u => u.items);

  // 小鳥最多三隻同時停在繩上；蝴蝶白天飛過，螢火蟲晚上出來
  const birds = [0, 1, 2].map(() => { const g = el('g', 'bird', svg), inner = el('g', 'bird-in', g), art = el('g', '', inner); return { g, inner, art, spot: -1 }; });
  const flies = [0, 1, 2, 3, 4, 5, 6].map(() => { const g = el('g', 'firefly', svg); g.innerHTML = FIREFLY; return g; });
  const bug = el('g', 'bug', svg), bugIn = el('g', '', bug);
  const ledgeTop = el('rect', 'c-cloud', svg); const ledge = el('rect', 'c-ledge', svg);
  const kinds = PLANTS.map((_, i) => i).sort(() => Math.random() - .5).slice(0, 3);      // 每次開啟挑三種盆栽
  const plants = kinds.map(i => { const g = el('g', 'plant', svg); g.innerHTML = PLANTS[i]; return g; });
  const cat = el('g', 'cat', svg); cat.innerHTML = CAT; set(cat, { 'data-face': 'sleep' });
  host.appendChild(svg);

  let W = 0, H = 0, L = null, t = rand(0, 500), last = 0, raf = 0, alive = true;
  let scene = 'sunny', target = windParams(2, 270), wind = { ...target }, cover = 0, coverTo = 0, heavy = 1, heavyTo = 1;
  let birdTimer = 0, bugTimer = 0, kickAt = t + rand(30, 70), birdBusy = false, night = false, perches = [], birdK = 1;

  const point = (r, f) => {            // 繩子上的點與切線角度。f：0–1
    const u = 1 - f, x = u * u * r[0] + 2 * u * f * r[2] + f * f * r[4], y = u * u * r[1] + 2 * u * f * r[3] + f * f * r[5];
    const dx = 2 * u * (r[2] - r[0]) + 2 * f * (r[4] - r[2]), dy = 2 * u * (r[3] - r[1]) + 2 * f * (r[5] - r[3]);
    return { x, y, deg: Math.atan2(dy, dx) * 180 / Math.PI };
  };

  function layout() {
    W = host.clientWidth; H = host.clientHeight; if (!W || !H) return;
    const tall = W / H < .9, m = Math.min(W, H * 1.5);
    set(svg, { viewBox: `0 0 ${W} ${H}`, width: W, height: H }); set(sky, { width: W, height: H });
    const lh = tall ? 126 : clamp(H * .13, 74, 112), ly = H - lh;
    set(ledge, { x: 0, y: ly, width: W, height: lh }); set(ledgeTop, { x: 0, y: ly - 9, width: W, height: 10 });
    // 直式：太陽放在標題下方的天空，山丘頂端壓在太陽與光芒之下，永遠不遮住它
    const sr = tall ? clamp(.115 * W, 36, 62) : .072 * m, sx = (tall ? .76 : .81) * W, sy = tall ? 112 + 1.75 * sr : .2 * H;
    const crest = tall ? sy + 1.95 * sr : 0;
    const circles = tall
      ? [[.16 * W, crest + 14 + .36 * W, .36 * W], [.80 * W, crest + .38 * W, .38 * W], [0, 0, 0], [0, 0, 0]]
      : shot ? [[.09 * W, .74 * H, .19 * m], [.39 * W, .64 * H, .21 * m], [.70 * W, .61 * H, .18 * m], [.98 * W, .575 * H, .19 * m]]        // 左邊山丘壓低，讓出標題的位置
      : [[.09 * W, .61 * H, .19 * m], [.39 * W, .565 * H, .21 * m], [.70 * W, .61 * H, .18 * m], [.98 * W, .575 * H, .19 * m]];
    circles.forEach(([cx, cy, r], i) => set(hills[i], { cx, cy, r }));
    const top = tall ? crest + .38 * W : shot ? .66 * H : .61 * H; set(massRect, { x: 0, y: top, width: W, height: H - top });
    set(sun, { transform: `translate(${sx} ${sy}) scale(${sr})` });
    bands.forEach((b, i) => set(b, { x: -W * .2 + i * W * .14, y: (tall ? top + H * .04 : H * .66) + i * H * .1, width: W * (1.1 - i * .12), height: clamp(H * .035, 14, 30), rx: 15 }));

    // 晾衣繩只有一條。直式只掛兩樣，依寬度與高度決定大小，左右留白平均分
    const ry = tall ? crest + .1 * W + 26 : 0;
    const line = tall ? [-20, ry, W / 2, ry + .06 * H, W + 20, ry - .015 * H] : [-30, .355 * H, W / 2, .47 * H, W + 30, .33 * H];
    const hung = tall ? units.slice(0, 2) : shot ? units.slice(0, 2) : units;
    const k = tall
      ? clamp(Math.min((W - 66) / (hung[0].w + hung[1].w), (ly - ry - .03 * H - 135) / 215), .38, 1.15)
      : shot ? W / 1000 : clamp(Math.min(W / 1180, (.44 * H - 60) / 215), .38, 1.5);
    set(rope, { d: `M${line[0]} ${line[1]}Q${line[2]} ${line[3]} ${line[4]} ${line[5]}`, 'stroke-width': clamp(3.4 * k, 2, 4) });
    const span = line[4] - line[0], at = x => point(line, (x - line[0]) / span);
    const room = tall ? (W - (hung[0].w + hung[1].w) * k) / 3 : 0;
    const xs = tall ? [room + hung[0].w * k / 2, W - room - hung[1].w * k / 2] : (shot ? [.50, .74] : [.16, .385, .60, .835]).map(f => f * W);
    for (const it of items) { it.off = true; it.node.style.display = 'none'; }
    hung.forEach((u, n) => u.items.forEach((it, j) => {
      const x = xs[n] + ((u.dx || 0) + (u.items.length > 1 ? (j ? 34 : -34) : 0)) * k;
      it.off = false; it.node.style.display = ''; it.at = at(x); it.body.x = x / W; it.k = k * (it.s || 1);
    }));
    // 小鳥停在兩件衣服中間的空位
    // 小鳥能停的位置：相鄰衣物之間的空位，直式再加上兩端
    const left = n => xs[n] - hung[n].w * k / 2, right = n => xs[n] + hung[n].w * k / 2;
    perches = hung.slice(1).map((_, n) => at((right(n) + left(n + 1)) / 2));
    if (tall && room > 44) perches.push(at(room / 2), at(W - room / 2));
    birdK = clamp(k * 1.1, .6, 1.3);
    for (const b of birds) if (b.spot >= 0) seat(b, Math.min(b.spot, perches.length - 1));
    scatter(ly);
    const ck = tall ? clamp(W / 400, .7, 1.15) : shot ? 1.05 : clamp(k * .92, .4, 1.2);
    set(cat, { transform: `translate(${(tall ? .62 : shot ? .17 : .47) * W} ${ly - 8}) scale(${ck})` });
    // 盆栽：寬螢幕三盆，一般兩盆，直式或很窄時只留一盆
    const show = shot ? 0 : tall || W < 640 ? 1 : W < 1280 ? 2 : 3, pk = tall ? ck * .72 : clamp(k, .5, 1.2);
    const px = tall ? [36 * pk] : [W - 62 * pk, W - 190 * pk, .47 * W - 215 * k];
    plants.forEach((g, i) => { g.style.display = i < show ? '' : 'none'; if (i < show) set(g, { transform: `translate(${px[i]} ${ly - 6}) scale(${(pk * [1, .8, .9][i]).toFixed(3)})` }); });
    // 雨：一塊可以上下接起來的圖樣，CSS 讓它往下捲
    const n = Math.round(clamp(W * H / 13000, 24, 90)); let s = '';
    for (let i = 0; i < n; i++) { const x = rand(-.05, 1.05) * W, y = rand(0, H), len = rand(18, 40); for (const o of [0, -H]) s += `<line x1="${x.toFixed(1)}" y1="${(y + o).toFixed(1)}" x2="${(x - len * .22).toFixed(1)}" y2="${(y + o + len).toFixed(1)}"/>`; }
    rainIn.innerHTML = s; svg.style.setProperty('--tile', `${H}px`);
    L = { sx, sy, sr, k, tall, crest }; frame(0);
  }

  function towelPath(it, p) {
    const hw = 88, h = 214, a = 1.5 + 8 * p.ripple * heavy, ph = t * (1.6 + p.tempo), pts = [];
    for (let i = 0; i <= 14; i++) { const x = hw - i * (2 * hw / 14); pts.push(`${x.toFixed(1)} ${(h + a * Math.sin(x * .045 - ph + it.body.seed) + a * .4 * Math.sin(x * .09 + ph * .6)).toFixed(1)}`); }
    const d = `M${-hw} 0L${hw} 0L${pts.join('L')}Z`;
    it.parts.body.setAttribute('d', d); it.parts.shade.setAttribute('d', d);
  }
  function towelWaves(it) {            // 印在毛巾上的波浪，只畫一次
    it.parts.waves.forEach((w, j) => { let d = `M-88 ${150 + j * 26}`; for (let x = -88; x < 88; x += 44) d += `q11-12 22 0t22 0`; set(w, { d, 'stroke-width': 10 }); });
  }
  items.filter(i => i.towel).forEach(towelWaves);

  function frame(dt) {
    if (!L) return;
    t += dt; const ease = 1 - Math.exp(-dt / 4);           // 風與場景的變化都慢慢過渡
    for (const key in target) wind[key] += (target[key] - wind[key]) * (dt ? ease : 1);
    heavy += (heavyTo - heavy) * (dt ? ease : 1); cover += (coverTo - cover) * (dt ? 1 - Math.exp(-dt / 6) : 1);
    if (dt && t > kickAt) { const socks = items.filter(i => i.kind === 'sock' && !i.off), s = socks[Math.floor(Math.random() * socks.length)]; if (s) s.body.v += (Math.random() < .5 ? -1 : 1) * 55; kickAt = t + rand(45, 110); }   // 襪子偶爾碰一下

    for (const it of items) {
      if (it.off) continue;
      const m = dt ? step(it.body, wind, t, dt, heavy) : { angle: wind.lean * it.gain * heavy, shear: 0 };
      it.node.setAttribute('transform', `translate(${it.at.x.toFixed(2)} ${it.at.y.toFixed(2)}) rotate(${(it.at.deg * .35 + m.angle).toFixed(2)}) scale(${it.k})`);
      it.cloth.setAttribute('transform', `skewX(${m.shear.toFixed(2)})`);
      if (it.sleeves) for (const s of it.sleeves) { const side = +s.dataset.side; s.setAttribute('transform', `translate(${side * 56} 18) rotate(${clamp(m.shear * 1.6 * (m.shear * side > 0 ? 1 : .35), -14, 14).toFixed(2)})`); }
      if (it.parts) towelPath(it, wind);
    }
    const dir = wind.lean < 0 ? -1 : 1, rank = RANK[scene];
    for (const c of clouds) {
      c.off += dir * c.v * (.5 + wind.tempo) * dt * .6; const pad = 140 * c.s, span = W + 2 * pad;
      const x = (((c.x * W + c.off + pad) % span) + span) % span - pad;
      c.g.setAttribute('transform', `translate(${x.toFixed(1)} ${(L.tall && !c.rank ? L.crest + .05 * H : c.y * H).toFixed(1)}) scale(${(c.s * clamp(L.k * 1.5, .55, 1.3)).toFixed(3)})`);
      c.g.classList.toggle('off', c.rank > rank);
    }
    // 晴天：小雲停在太陽腳邊。多雲：大雲慢慢滑過太陽，偶爾露出來
    const slide = Math.sin(t * .045) * 1.5 * cover, vs = L.sr / 92 * (1 + cover * 1.5);
    veil.setAttribute('transform', `translate(${(L.sx + L.sr * (.62 * (1 - cover) + slide)).toFixed(1)} ${(L.sy + L.sr * (.82 - cover * .55)).toFixed(1)}) scale(${vs.toFixed(3)})`);
  }

  function loop(now) {
    raf = 0; if (!alive) return;
    const dt = last ? Math.min(.05, (now - last) / 1000) : 0; last = now;
    frame(dt); raf = requestAnimationFrame(loop);
  }
  const start = () => { if (!raf && alive && !reduced && !document.hidden) { last = 0; raf = requestAnimationFrame(loop); } };
  const stop = () => { if (raf) cancelAnimationFrame(raf); raf = 0; };
  const onVisible = () => { document.hidden ? stop() : start(); svg.classList.toggle('paused', document.hidden); };

  // 貓的表情：平常睡著，偶爾換一下；雨天不太高興
  let faceTimer = 0;
  const baseFace = () => scene === 'rainy' ? 'grumpy' : 'sleep';
  function scheduleFace() {
    clearTimeout(faceTimer); set(cat, { 'data-face': baseFace() }); if (reduced) return;
    faceTimer = setTimeout(() => {
      if (!alive) return;
      if (!document.hidden) set(cat, { 'data-face': FACES[Math.floor(Math.random() * FACES.length)] });
      faceTimer = setTimeout(scheduleFace, rand(2.5, 6) * 1000);
    }, rand(12, 34) * 1000);
  }

  // 小鳥：隔一陣子來一批，一到三隻、種類與方向隨機，各自停一會兒就飛走。下雨、晚上、風大或減少動態時不來
  function seat(b, spot) { const p = perches[spot]; b.spot = spot; set(b.g, { transform: `translate(${p.x} ${p.y}) rotate(${p.deg}) scale(${birdK})` }); }
  function scheduleBird(first) { clearTimeout(birdTimer); if (!reduced) birdTimer = setTimeout(visit, (first ? rand(15, 35) : rand(50, 140)) * 1000); }
  const quiet = () => document.hidden || night || scene === 'rainy' || target.flutter > 5.4;
  async function visit() {
    if (!alive) return;
    if (quiet() || birdBusy || !perches.length || !birds[0].inner.animate) return scheduleBird();
    birdBusy = true;
    const free = perches.map((_, i) => i).sort(() => Math.random() - .5), roll = Math.random();
    const count = Math.min(free.length, roll < .5 ? 1 : roll < .85 ? 2 : 3);
    await Promise.all(birds.slice(0, count).map((b, i) => perchOne(b, free[i], i * rand(.6, 2.2))));
    birdBusy = false; if (alive) scheduleBird();
  }
  async function perchOne(b, spot, delay) {
    const face = Math.random() < .5 ? 1 : -1, side = Math.random() < .5 ? -1 : 1;
    b.art.innerHTML = BIRDS[Math.floor(Math.random() * BIRDS.length)]; set(b.art, { transform: `scale(${face} 1)` }); seat(b, spot);
    const far = (dir, up) => `translate(${dir * W * .55}px, ${-H * up}px) rotate(${dir * 18}deg)`;
    try {
      await new Promise(r => setTimeout(r, delay * 1000)); if (!alive) return;
      b.g.classList.add('on');
      await b.inner.animate([{ transform: far(side, rand(.25, .4)) }, { transform: 'translate(0,-26px) rotate(-6deg)', offset: .86 }, { transform: 'none' }], { duration: rand(2300, 3000), easing: 'cubic-bezier(.2,.7,.3,1)' }).finished;
      b.g.classList.add('perched'); b.inner.style.animationDelay = `${-rand(0, 3).toFixed(2)}s`;
      await new Promise(r => setTimeout(r, rand(8, 18) * 1000));
      b.g.classList.remove('perched');
      await b.inner.animate([{ transform: 'none' }, { transform: `translate(${face * 10}px,-30px) rotate(${-face * 20}deg)`, offset: .12 }, { transform: far(face, rand(.3, .45)) }], { duration: rand(2100, 2700), easing: 'cubic-bezier(.5,0,.8,.6)' }).finished;
    } catch { /* 動畫被取消 */ }
    b.g.classList.remove('on', 'perched'); b.spot = -1;
  }

  // 蝴蝶：偶爾從一邊晃到另一邊，路線每次不同
  function scheduleBug(first) { clearTimeout(bugTimer); if (!reduced) bugTimer = setTimeout(flutter, (first ? rand(6, 18) : rand(35, 90)) * 1000); }
  async function flutter() {
    if (!alive) return;
    if (quiet() || !bug.animate) return scheduleBug();
    const dir = Math.random() < .5 ? 1 : -1, lo = H - 150, hi = Math.max(L.crest || H * .5, H * .45) + 40, steps = 9, frames = [];
    for (let i = 0; i <= steps; i++) frames.push({ transform: `translate(${((dir > 0 ? -.08 : 1.08) + dir * 1.16 * i / steps) * W + rand(-18, 18)}px, ${rand(hi, lo)}px)` });
    bugIn.innerHTML = butterfly(); set(bugIn, { transform: `scale(${clamp(L.k * 1.5, 1, 1.6)})` }); bug.classList.add('on');
    try { await bug.animate(frames, { duration: rand(15, 24) * 1000, easing: 'ease-in-out' }).finished; } catch { /* 動畫被取消 */ }
    bug.classList.remove('on'); if (alive) scheduleBug();
  }

  // 螢火蟲：散在下半部，各自慢慢飄。只有晚上看得到（CSS 控制）
  let glows = [];
  function scatter(ly) {
    glows.forEach(a => a.cancel()); glows = [];
    const n = W < 700 ? 4 : flies.length;
    flies.forEach((g, i) => {
      g.style.display = i < n ? '' : 'none'; if (i >= n) return;
      const x = rand(.06, .94) * W, y = rand(H * .5, ly - 30), hop = () => `translate(${x + rand(-70, 70)}px, ${y + rand(-50, 50)}px)`;
      g.style.transform = `translate(${x}px, ${y}px)`; g.style.animationDelay = `${-rand(0, 4).toFixed(2)}s`;
      if (!reduced && g.animate) glows.push(g.animate([{ transform: hop() }, { transform: hop() }, { transform: hop() }, { transform: hop() }], { duration: rand(14, 26) * 1000, direction: 'alternate', iterations: Infinity, easing: 'ease-in-out' }));
    });
  }

  const ro = new ResizeObserver(layout); ro.observe(host);
  document.addEventListener('visibilitychange', onVisible);
  layout(); start(); scheduleBird(true); scheduleBug(true); scheduleFace();

  return {
    /** scene: sunny|cloudy|humid|rainy；night；windSpeed m/s；windDirection 度（可為 null） */
    setWeather({ scene: s = 'sunny', night: n = false, windSpeed = 0, windDirection = null }) {
      if (n) set(moon, { d: moonPath(moonPhase()) });          // 月亮的形狀跟著今天的月相
      scene = s; night = n; set(svg, { 'data-scene': s }); svg.toggleAttribute('data-night', n);
      target = windParams(windSpeed, windDirection); heavyTo = HEAVY[s]; coverTo = s === 'sunny' ? 0 : 1;
      if (reduced) frame(0);
      if (cat.dataset.face === 'sleep' || cat.dataset.face === 'grumpy') set(cat, { 'data-face': baseFace() });
    },
    callBirds: visit, callButterfly: flutter,          // 預覽用：立刻叫小鳥／蝴蝶來
    setReduced(v) { reduced = v; svg.classList.toggle('still', v); if (v) { stop(); clearTimeout(birdTimer); clearTimeout(bugTimer); frame(0); } else { start(); scheduleBird(true); scheduleBug(true); } layout(); scheduleFace(); },
    destroy() { alive = false; stop(); clearTimeout(birdTimer); clearTimeout(bugTimer); clearTimeout(faceTimer); ro.disconnect(); document.removeEventListener('visibilitychange', onVisible); glows.forEach(a => a.cancel()); svg.getAnimations?.({ subtree: true }).forEach(a => a.cancel()); svg.remove(); },
  };
}
