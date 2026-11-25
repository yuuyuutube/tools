// Specimen plates for the Bureau of Unnecessary Protection.
// Every holding is drawn as a 3-4 colour screenprint plate: flat inks,
// a misregistered colour layer, a hatched shadow and a halftone cast shadow.
// Pure string output, no dependencies: works in browsers and in Node.

const INK = '#1B1C1A';
const PAPER = '#F4EEDF';
const CREAM = '#ECE5D3';
const VERM = '#B2321F';
const GREEN = '#22392F';
const BRASS = '#B39256';
const BLUE = '#2B4C7E';
const OCHRE = '#C9A36B';
const TAN = '#D8C9A3';
const BROWN = '#8C6A43';
const MUSTARD = '#E3B23C';
const TEAL = '#9DB4AE';
const GREY = '#C8C2B4';
const STEEL = '#6E7F86';
const RUST = '#A4572E';

const SANS = 'Helvetica, Arial, sans-serif';
const SERIF = 'Georgia, serif';
const CJK = 'serif';

const MIS = 'translate(2.5 2)'; // the signature misregistration of the colour layer

// ---------------------------------------------------------------- utilities

const f = (n) => String(Math.round(n * 10) / 10);
const pt = (p) => `${f(p[0])} ${f(p[1])}`;
const rad = (deg) => (deg * Math.PI) / 180;

function hash(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

// Catmull-Rom spline through points, as cubic beziers.
function crSegs(pts, closed, t = 1) {
  const n = pts.length;
  const g = (i) => (closed ? pts[((i % n) + n) % n] : pts[Math.max(0, Math.min(n - 1, i))]);
  const out = [];
  const last = closed ? n : n - 1;
  for (let i = 0; i < last; i++) {
    const p0 = g(i - 1), p1 = g(i), p2 = g(i + 1), p3 = g(i + 2);
    out.push([
      p1,
      [p1[0] + ((p2[0] - p0[0]) * t) / 6, p1[1] + ((p2[1] - p0[1]) * t) / 6],
      [p2[0] - ((p3[0] - p1[0]) * t) / 6, p2[1] - ((p3[1] - p1[1]) * t) / 6],
      p2,
    ]);
  }
  return out;
}

function segsToD(segs, close) {
  let d = `M${pt(segs[0][0])}`;
  for (const s of segs) d += `C${pt(s[1])} ${pt(s[2])} ${pt(s[3])}`;
  return close ? d + 'Z' : d;
}

const smooth = (pts, closed = true, t = 1) => segsToD(crSegs(pts, closed, t), closed);

// Irregular closed blob: one radius multiplier per point.
function blob(cx, cy, rx, ry, mults, rot = 0) {
  const n = mults.length;
  const c = Math.cos(rad(rot)), s = Math.sin(rad(rot));
  return mults.map((m, i) => {
    const a = (i / n) * Math.PI * 2;
    const x = rx * m * Math.cos(a), y = ry * m * Math.sin(a);
    return [cx + x * c - y * s, cy + x * s + y * c];
  });
}

// Polygon with softened corners and gently bowed (hand-drawn) edges.
function poly(pts, r = 3, bow = 0, rand = null) {
  const n = pts.length;
  const rr = Array.isArray(r) ? r : pts.map(() => r);
  const A = [], B = [];
  for (let i = 0; i < n; i++) {
    const p = pts[i], a = pts[(i - 1 + n) % n], b = pts[(i + 1) % n];
    const la = Math.hypot(a[0] - p[0], a[1] - p[1]) || 1;
    const lb = Math.hypot(b[0] - p[0], b[1] - p[1]) || 1;
    const ra = Math.min(rr[i], la / 2), rb = Math.min(rr[i], lb / 2);
    A.push([p[0] + ((a[0] - p[0]) * ra) / la, p[1] + ((a[1] - p[1]) * ra) / la]);
    B.push([p[0] + ((b[0] - p[0]) * rb) / lb, p[1] + ((b[1] - p[1]) * rb) / lb]);
  }
  let d = `M${pt(B[0])}`;
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    const s = B[i], e = A[j];
    if (bow && rand) {
      const len = Math.hypot(e[0] - s[0], e[1] - s[1]) || 1;
      const k = (rand() * 2 - 1) * bow * Math.min(1, len / 40);
      const m = [(s[0] + e[0]) / 2 + (-(e[1] - s[1]) / len) * k, (s[1] + e[1]) / 2 + ((e[0] - s[0]) / len) * k];
      d += `Q${pt(m)} ${pt(e)}`;
    } else d += `L${pt(e)}`;
    d += `Q${pt(pts[j])} ${pt(B[j])}`;
  }
  return d + 'Z';
}

const attrT = (T) => (T ? ` transform="${T}"` : '');
const inT = (T, s) => (T ? `<g transform="${T}">${s}</g>` : s);

function line(d, o = {}) {
  return `<path d="${d}" fill="none" stroke="${o.stroke ?? INK}" stroke-width="${o.w ?? 1.2}" stroke-linecap="round" stroke-linejoin="round"${o.op != null ? ` opacity="${o.op}"` : ''}${o.dash ? ` stroke-dasharray="${o.dash}"` : ''}${attrT(o.T)}/>`;
}

function fillPath(d, fill, o = {}) {
  return `<path d="${d}" fill="${fill}"${o.op != null ? ` opacity="${o.op}"` : ''}${o.rule ? ` fill-rule="${o.rule}"` : ''}${o.stroke ? ` stroke="${o.stroke}" stroke-width="${o.w ?? 1.2}" stroke-linejoin="round"` : ''}${attrT(o.T)}/>`;
}

function text(x, y, s, o = {}) {
  return `<text x="${f(x)}" y="${f(y)}" font-family="${o.family ?? SANS}" font-size="${o.size ?? 10}"${o.weight ? ` font-weight="${o.weight}"` : ''} fill="${o.fill ?? INK}"${o.anchor ? ` text-anchor="${o.anchor}"` : ''}${o.ls != null ? ` letter-spacing="${o.ls}"` : ''}${o.op != null ? ` opacity="${o.op}"` : ''}${attrT(o.T)}>${esc(s)}</text>`;
}

// A thick "wire" drawn as ink outline + colour core, with shadow and glint.
function wire(c, d, o = {}) {
  const T = attrT(o.T);
  const w = o.w ?? 4.4, col = o.fill ?? GREY;
  c.back.push(`<g transform="${MIS}"><path d="${d}"${T} fill="none" stroke="${o.misFill ?? col}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"/></g>`);
  let s = `<path d="${d}"${T} fill="none" stroke="${INK}" stroke-width="${w + 3}" stroke-linecap="${o.cap ?? 'round'}" stroke-linejoin="round"/>`;
  s += `<path d="${d}"${T} fill="none" stroke="${col}" stroke-width="${w}" stroke-linecap="${o.cap ?? 'round'}" stroke-linejoin="round"/>`;
  if (o.shade !== false) s += `<g transform="translate(.8 .9)"><path d="${d}"${T} fill="none" stroke="${o.shade ?? STEEL}" stroke-width="${w * 0.36}" stroke-linecap="round" stroke-linejoin="round"/></g>`;
  if (o.glint !== false) s += `<g transform="translate(-.7 -.8)"><path d="${d}"${T} fill="none" stroke="${PAPER}" stroke-width="${w * 0.24}" stroke-linecap="round" stroke-linejoin="round" opacity=".9"${o.glintDash ? ` stroke-dasharray="${o.glintDash}"` : ''}/></g>`;
  return s;
}

// The core primitive: a flat colour shape with misregistered under-layer,
// a flat shadow on the side away from a top-left light, optional hatching,
// a paper highlight and the ink outline.
function solid(c, d, o = {}) {
  const fill = o.fill ?? PAPER;
  const T = attrT(o.T);
  const rule = o.rule ? ` fill-rule="${o.rule}"` : '';
  if (o.mis !== false) {
    c.back.push(`<g transform="${MIS}"><path d="${d}"${T}${rule} fill="${o.misFill ?? fill}"${o.fillOpacity != null ? ` fill-opacity="${o.fillOpacity}"` : ''}/></g>`);
  }
  let s = `<path d="${d}"${T}${rule} fill="${fill}"${o.fillOpacity != null ? ` fill-opacity="${o.fillOpacity}"` : ''}/>`;
  let cid = null;
  const clip = () => {
    if (!cid) {
      cid = c.id('c');
      c.defs.push(`<clipPath id="${cid}"><path d="${d}"${T}${o.rule ? ` clip-rule="${o.rule}"` : ''}/></clipPath>`);
    }
    return cid;
  };
  if (o.detail) s += `<g clip-path="url(#${clip()})">${o.detail}</g>`;
  if (o.shade !== false) {
    const [dx, dy] = o.light ?? [-7, -6];
    const mid = c.id('m');
    c.defs.push(
      `<mask id="${mid}" maskUnits="userSpaceOnUse" x="0" y="0" width="240" height="240"><path d="${d}"${T}${rule} fill="#fff"/><g transform="translate(${dx} ${dy})"><path d="${d}"${T}${rule} fill="#000"/></g></mask>`
    );
    const shade = o.shade ?? INK;
    const op = o.shadeOpacity ?? (o.shade ? 1 : 0.18);
    s += `<g mask="url(#${mid})"><rect width="240" height="240" fill="${shade}" opacity="${op}"/>${o.hatch !== false ? `<rect width="240" height="240" fill="url(#h-${c.uid})"/>` : ''}</g>`;
  }
  if (o.inner) s += `<g clip-path="url(#${clip()})">${o.inner}</g>`;
  if (o.hl) s += `<path d="${o.hl}"${T} fill="${PAPER}"${o.hlOpacity != null ? ` opacity="${o.hlOpacity}"` : ''}/>`;
  if (o.sw !== 0) {
    s += `<path d="${d}"${T}${rule} fill="none" stroke="${INK}" stroke-width="${o.sw ?? 2.2}" stroke-linejoin="round" stroke-linecap="round"/>`;
  }
  if (o.over) s += o.over;
  return s;
}

// Halftone cast shadow on the implied ground.
function ground(c, cx, cy, rx, ry) {
  c.ground = `<g opacity=".35"><ellipse cx="${f(cx)}" cy="${f(cy)}" rx="${f(rx)}" ry="${f(ry)}" fill="url(#d-${c.uid})"/><ellipse cx="${f(cx - rx * 0.05)}" cy="${f(cy - ry * 0.05)}" rx="${f(rx * 0.72)}" ry="${f(ry * 0.66)}" fill="url(#e-${c.uid})"/><ellipse cx="${f(cx - rx * 0.08)}" cy="${f(cy - ry * 0.08)}" rx="${f(rx * 0.42)}" ry="${f(ry * 0.4)}" fill="url(#g-${c.uid})"/></g>`;
}

function baseDefs(uid) {
  const dot = (id, r) =>
    `<pattern id="${id}-${uid}" patternUnits="userSpaceOnUse" width="4.2" height="4.2" patternTransform="rotate(22)"><circle cx="2.1" cy="2.1" r="${r}" fill="${INK}"/></pattern>`;
  return (
    `<pattern id="h-${uid}" patternUnits="userSpaceOnUse" width="3.4" height="3.4" patternTransform="rotate(38)"><path d="M1.7 -1V4.4" stroke="${INK}" stroke-width=".8" opacity=".4"/></pattern>` +
    dot('d', 0.75) + dot('e', 1.15) + dot('g', 1.6)
  );
}

// Seeded scatter of small marks inside an ellipse.
function speckle(c, cx, cy, rx, ry, n, draw) {
  let s = '';
  for (let i = 0; i < n; i++) {
    const a = c.rand() * Math.PI * 2, r = Math.sqrt(c.rand());
    s += draw(cx + Math.cos(a) * rx * r, cy + Math.sin(a) * ry * r, i);
  }
  return s;
}

// ---------------------------------------------------------------- drawings

const ART = {};

// 001 ORDINARY POTATO -- the hero of the Bureau.
ART['artifact-001'] = (c) => {
  ground(c, 128, 176, 80, 11);
  const body = smooth(
    blob(120, 118, 78, 51,[1.0, 1.03, 1.0, 0.95, 0.99, 1.06, 1.03, 0.98, 1.02, 0.99, 0.91, 0.97, 1.04, 1.02], -9)
  );
  const eye = (x, y, a, s = 1) =>
    inT(`translate(${x} ${y}) rotate(${a}) scale(${s})`,
      fillPath('M-6 0.5 Q0 4.5 6 0.5 Q0 2.4 -6 0.5Z', BROWN) +
      line('M-6.5 0 Q0 4 6.5 0', { w: 1.2 }) +
      `<ellipse cx="0" cy="1.6" rx="1.5" ry="0.9" fill="${INK}"/>` +
      line('M-3 -2.2 Q0 -3.4 3 -2.2', { w: 0.8, op: 0.45 }));
  let marks = speckle(c, 118, 118, 60, 38, 30, (x, y, i) =>
    i % 3 === 0
      ? line(`M${f(x)} ${f(y)}l${f(2 + c.rand() * 1.5)} ${f(-0.6 + c.rand())}`, { w: 0.9, stroke: BROWN })
      : `<circle cx="${f(x)}" cy="${f(y)}" r="${f(0.6 + c.rand() * 0.8)}" fill="${BROWN}"/>`);
  marks += eye(84, 104, -18) + eye(124, 136, 8, 0.9) + eye(152, 92, -32, 0.85);
  // the sprout: one tiny, determined shoot
  const sp =
    fillPath('M150.6 91.5 C149.6 85 151 79.5 154.6 76 L158.6 78.6 C155.8 81.4 154.6 86 155.4 91.5 Z', PAPER, { stroke: INK, w: 1.2 }) +
    line('M152.6 89 C152.2 84.5 153.2 81 155.6 78.6', { w: 0.8, stroke: TEAL }) +
    fillPath('M155.2 76.8 C150.6 74 149.6 69 151.4 65.6 C155.4 68 157 72.4 155.2 76.8 Z', TEAL, { stroke: INK, w: 1.2 }) +
    fillPath('M157.6 77.2 C160.6 73.4 165 72.4 168.6 73.8 C166.4 77.2 162 78.6 157.6 77.2 Z', TEAL, { stroke: INK, w: 1.2 }) +
    `<ellipse cx="156.6" cy="76.6" rx="2.6" ry="2.2" fill="${PAPER}" stroke="${INK}" stroke-width="1.1"/>` +
    line('M151.6 68 Q152.6 71.6 154.6 74.6', { w: 0.7, stroke: GREEN, op: 0.7 });
  const sprout = `<g transform="translate(153 91.5) scale(1.4) translate(-153 -91.5)">${sp}</g>`;
  return solid(c, body, {
    fill: OCHRE,
    shade: BROWN,
    light: [-10, -9],
    detail: '',
    inner: marks + line('M62 128 Q70 142 88 150', { w: 0.9, op: 0.35 }) + line('M168 140 Q176 130 180 118', { w: 0.9, op: 0.35 }),
    hl: smooth([[78, 90], [90, 83], [104, 82], [101, 86], [88, 89], [80, 95]]),
    hlOpacity: 0.9,
    over: sprout,
  });
};

// 002 HALF A STRAW
ART['artifact-002'] = (c) => {
  ground(c, 124, 168, 76, 9);
  const T = 'translate(118 116) rotate(-26)';
  const bumps = (x0, y0, x1, y1, n, out) => {
    let d = '';
    for (let i = 0; i < n; i++) {
      const a = i / n, b = (i + 1) / n, m = (a + b) / 2;
      const ex = x0 + (x1 - x0) * b, ey = y0 + (y1 - y0) * b;
      const mx = x0 + (x1 - x0) * m, my = y0 + (y1 - y0) * m;
      d += `Q${f(mx)} ${f(my + out)} ${f(ex)} ${f(ey)}`;
    }
    return d;
  };
  const body =
    'M-80 -7L28 -7' + bumps(28, -7, 47.5, -5.6, 5, -2.6) +
    'L68.3 -22.4L77.3 -11.6L57.4 5.3' + bumps(57.4, 5.3, 28, 7, 6, 2.8) + 'L-80 7Z';
  let stripes = '';
  for (let x = -96; x < 34; x += 13) stripes += `<path d="M${x} -10L${x + 6} -10L${x + 1} 10L${x - 5} 10Z" fill="${VERM}"/>`;
  let bent = '';
  for (let x = -4; x < 32; x += 13) bent += `<path d="M${x} -10L${x + 6} -10L${x + 1} 10L${x - 5} 10Z" fill="${VERM}"/>`;
  let ridges = '';
  for (let i = 1; i < 5; i++) {
    const a = i / 5, b = 1 - i / 6;
    const tx = 28 + 19.5 * a, ty = -7 + 1.4 * a;
    const bx = 28 + 29.4 * (1 - b) * 1, by = 7 - 1.7 * (1 - b);
    ridges += line(`M${f(tx)} ${f(ty)}L${f(bx + 2)} ${f(by)}`, { w: 0.9, op: 0.7 });
  }
  const detail = inT(T, stripes + `<g transform="translate(54 0) rotate(-40)">${bent}</g>`);
  const ends =
    inT(T,
      `<ellipse cx="-80" cy="0" rx="3.2" ry="7" fill="${PAPER}" stroke="${INK}" stroke-width="1.2"/>` +
      fillPath('M-80 -4.8 A2 4.8 0 0 0 -80 4.8 A1.4 4.8 0 0 1 -80 -4.8Z', INK, { op: 0.55 }) +
      `<g transform="translate(72.8 -17) rotate(-40)"><ellipse cx="0" cy="0" rx="2.8" ry="7" fill="${PAPER}" stroke="${INK}" stroke-width="1.2"/><path d="M0 -4.8 A1.8 4.8 0 0 0 0 4.8 A1.3 4.8 0 0 1 0 -4.8Z" fill="${INK}" opacity=".55"/></g>` +
      ridges +
      line('M-72 -3.6 L20 -3.6', { w: 1.3, stroke: PAPER, op: 0.85 }));
  return solid(c, body, { T, fill: PAPER, detail, light: [-3, -4], over: ends });
};

// 003 EXPIRED PARKING TICKET
ART['artifact-003'] = (c) => {
  ground(c, 126, 186, 50, 8);
  const T = 'rotate(7 120 114)';
  const card = poly([[84, 50], [156, 50], [157, 152], [136, 177], [84, 177]], 2.5, 1.4, c.rand);
  const hole = ' M124.5 66 A4.5 4.5 0 1 0 115.5 66 A4.5 4.5 0 1 0 124.5 66Z';
  let print =
    text(120, 136, 'P', { size: 74, weight: 'bold', fill: BLUE, op: 0.26, anchor: 'middle' }) +
    line('M92 80 H148', { w: 0.8, op: 0.5 }) +
    text(92, 91, 'IN  08:42', { size: 7, op: 0.55, ls: 0.6 }) +
    text(92, 100, 'NO. 004127', { size: 7, op: 0.5, ls: 0.6 }) +
    line('M92 158 H128', { w: 0.8, op: 0.45 });
  for (let i = 0; i < 14; i++) {
    const x = 92 + i * 2.6 + (i % 3 === 0 ? 0.6 : 0);
    print += `<rect x="${f(x)}" y="146" width="${i % 4 === 1 ? 1.6 : 0.8}" height="8" fill="${INK}" opacity=".45"/>`;
  }
  const flap =
    fillPath('M157 152 C150 156 142.5 160 140.5 168 C139.5 172 137.5 175 136 177 Z', TAN, { stroke: INK, w: 1.4, T }) +
    line('M154 155 Q146 160 143 167', { w: 0.8, op: 0.4, T });
  return solid(c, card + hole, {
    T,
    rule: 'evenodd',
    fill: PAPER,
    shade: GREY,
    light: [-5, -4],
    detail: inT(T, print),
    over: flap,
  });
};

// 004 UNIDENTIFIED SCREW
ART['artifact-004'] = (c) => {
  ground(c, 134, 190, 38, 7);
  // drawn at 1.16x about its centre; line weights are divided back so they match the set
  const T = 'rotate(13 120 118) translate(120 118) scale(1.16) translate(-120 -118)';
  const L = [], R = [];
  const env = (y) => (y < 150 ? 9 : Math.max(0, 9 * (1 - (y - 150) / 30)));
  for (let y = 68; y <= 176; y += 4.5) {
    const k = Math.round((y - 68) / 4.5);
    const w = env(y);
    L.push([120 - w - (k % 2 === 0 ? 3.6 * (w / 9) : 0), y]);
    R.push([120 + w + (k % 2 === 1 ? 3.6 * (w / 9) : 0), y]);
  }
  let shank = `M111 61L111 68`;
  for (const p of L) shank += `L${pt(p)}`;
  shank += `L120 181`;
  for (const p of R.slice().reverse()) shank += `L${pt(p)}`;
  shank += 'L129 68L129 61Z';
  let threads = '';
  for (let i = 0; i < L.length - 1; i += 2) {
    const a = L[i], b = R[Math.min(R.length - 1, i + 1)];
    if (a[1] > 172) break;
    threads += line(`M${pt(a)}L${pt(b)}`, { w: 1 });
  }
  const head = 'M94 50 A26 8.5 0 0 1 146 50 L146 59 A26 8.5 0 0 1 94 59 Z';
  const top = `<ellipse cx="120" cy="50" rx="26" ry="8.5" fill="${GREY}" stroke="${INK}" stroke-width="1.2"/>` +
    `<ellipse cx="120" cy="50" rx="26" ry="8.5" fill="${PAPER}" opacity=".35"/>` +
    `<g transform="translate(120 50) scale(1 .33) rotate(28)"><path d="M-14 -2.8H14V2.8H-14Z M-2.8 -14H2.8V14H-2.8Z" fill="${INK}"/></g>` +
    line('M100 46 Q110 42.6 122 42.4', { w: 1.3, stroke: PAPER });
  return (
    solid(c, shank, {
      T, fill: GREY, shade: STEEL, light: [-6, -2], sw: 1.9,
      inner: inT(T, threads + `<path d="M113.5 72 L114.6 72 L114.8 148 L113.7 148 Z" fill="${PAPER}" opacity=".9"/>`),
    }) +
    solid(c, head, { T, fill: GREY, shade: STEEL, light: [-7, -2], sw: 1.9, over: inT(T, top) })
  );
};

// 005 LEFT SOCK
ART['artifact-005'] = (c) => {
  ground(c, 100, 178, 72, 8);
  const sock =
    'M100 36 L152 34 C153 58 155 90 158 112 C162 132 160 150 146 159 C128 166 90 168 58 165 C40 164 29 156 29 142 C29 128 44 121 62 119 C82 117 96 107 99 91 C100 73 99 55 100 36Z';
  let ribs = '';
  for (let x = 105; x <= 149; x += 5.5) ribs += line(`M${f(x)} 40 C${f(x + 0.3)} 70 ${f(x + 0.8)} 92 ${f(x + 1.6)} 104`, { w: 0.8, op: 0.3 });
  const detail =
    ribs +
    `<path d="M90 47 Q126 52 165 45 L165 54 Q126 61 90 56Z" fill="${VERM}"/>` +
    `<path d="M90 61 Q126 66 165 59 L165 65 Q126 72 90 67Z" fill="${BLUE}"/>` +
    fillPath('M157 112 C165 132 162 152 146 159 C137 162 129 163 123 162 C131 150 143 132 157 112Z', GREY, { stroke: INK, w: 1.1 }) +
    fillPath('M53 120 C43 123 29 128 29 142 C29 156 40 164 58 165 C54 152 51 137 53 120Z', GREY, { stroke: INK, w: 1.1 });
  const darn =
    line('M139 140 l4 4 M143 140 l-4 4 M145 147 l4 4 M149 147 l-4 4 M137 149 l4 4 M141 149 l-4 4', { w: 0.9, stroke: VERM });
  const cuff = fillPath('M100 36 C112 42 140 41 152 34 C140 30 112 31 100 36Z', TAN, { stroke: INK, w: 1.2 }) +
    fillPath('M103 36.5 C116 40 138 39 149 35 C138 37 116 38 103 36.5Z', INK, { op: 0.35 });
  return solid(c, sock, {
    fill: PAPER, shade: GREY, light: [-8, -6], detail,
    hl: 'M107 76 C106 88 104 98 98 108 C102 98 104 88 104.5 76Z',
    over: cuff + darn,
  });
};

// 006 SMALL PIECE OF ERASER
ART['artifact-006'] = (c) => {
  ground(c, 124, 160, 72, 9);
  const T = 'translate(116 122) rotate(-7)';
  const sil = poly([[-64, 24], [50, 24], [68, 12], [68, -18], [-44, -18], [-66, -6]], [12, 2, 2, 2, 10, 12], 1, c.rand);
  const d = [18, -12];
  const band = (x1, x2, fill) =>
    `<path d="M${x1} 30L${x1} -6L${x1 + d[0]} ${-6 + d[1] - 4}L${x2 + d[0]} ${-6 + d[1] - 4}L${x2} -6L${x2} 30Z" fill="${fill}"/>`;
  const sleevePts = [[-10, 25.5], [52, 25.5], [69.5, 13], [69.5, -19.5], [10, -19.5]];
  let tear = [];
  for (let i = 0; i <= 8; i++) {
    const t = i / 8;
    tear.push([10 - 20 * t + (i % 2 ? 2.5 : -1.5) * (c.rand() + 0.4), -19.5 + 15 * t]);
  }
  for (let i = 1; i <= 6; i++) {
    const t = i / 6;
    tear.push([-10 + (i % 2 ? 3 : -1) * (c.rand() + 0.3) + 4 * t, -4.5 + 30 * t]);
  }
  const sleeve = 'M' + [...sleevePts, ...tear.slice(1)].map(pt).join('L') + 'Z';
  const faces =
    fillPath('M-60 -6 L50 -6 L68 -18 L-44 -18 Z', PAPER, { op: 1 }) +
    fillPath('M50 -6 L68 -18 L68 12 L50 24 Z', INK, { op: 0.14 });
  const edges = line('M-58 -6 L50 -6 L68 -18 M50 -6 L50 24', { w: 1.2 });
  const crumbs =
    fillPath(smooth([[44, 164], [52, 162], [55, 165], [48, 167]]), PAPER, { stroke: INK, w: 1.1 }) +
    fillPath(smooth([[33, 158], [38, 157], [39, 160], [34, 161]]), PAPER, { stroke: INK, w: 1.1 }) +
    fillPath(smooth([[58, 170], [61, 169], [62, 171], [59, 172]]), PAPER, { stroke: INK, w: 1 });
  return (
    solid(c, sil, { T, fill: CREAM, shade: GREY, light: [-5, -5], detail: inT(T, faces), inner: inT(T, edges),
      hl: 'M-52 -10 Q-40 -14.5 -24 -15 Q-40 -12 -50 -8Z' }) +
    solid(c, sleeve, {
      T, fill: BLUE, light: [-4, -4], shadeOpacity: 0.3,
      detail: inT(T, band(28, 39, PAPER) + band(39, 52, INK) + fillPath('M50 -6 L68 -18 L68 12 L50 24 Z', INK, { op: 0.3 })),
      inner: inT(T, line('M28 -6 L50 -6 L68 -18 M50 -6 L50 26', { w: 1.1, stroke: INK, op: 0.8 }) + line('M-4 -6 L26 -6', { w: 1, stroke: PAPER, op: 0.5 })),
    }) +
    crumbs
  );
};

// 007 EMPTY ENVELOPE
ART['artifact-007'] = (c) => {
  ground(c, 126, 192, 82, 8);
  const T = 'rotate(-4 120 120)';
  const pid = c.id('air');
  c.defs.push(
    `<pattern id="${pid}" patternUnits="userSpaceOnUse" width="18" height="18" patternTransform="rotate(45)"><rect x="0" y="0" width="4.5" height="18" fill="${VERM}"/><rect x="9" y="0" width="4.5" height="18" fill="${BLUE}"/></pattern>`
  );
  const body = poly([[40, 96], [200, 96], [200, 186], [40, 186]], 3, 1.2, c.rand);
  const flap = poly([[40, 96], [200, 96], [121, 40]], [3, 3, 5], 1, c.rand);
  const mouth = 'M41 97 L199 97 L120 128 Z';
  const border = `<path d="M40 96 H200 V186 H40Z M47 103 V179 H193 V103Z" fill="url(#${pid})" fill-rule="evenodd"/>`;
  const flapBits =
    `<path d="M40 96 L121 40 L200 96 L190 96 L121 49 L50 96Z" fill="url(#${pid})"/>` +
    `<path d="M54 96 L121 51 L186 96 L176 96 L121 59 L64 96Z" fill="${TAN}" opacity=".85"/>`;
  const inside =
    `<path d="${mouth}" fill="${TAN}"/><path d="${mouth}" fill="${INK}" opacity=".22"/><path d="${mouth}" fill="url(#h-${c.uid})"/>` +
    line('M41 186 Q90 150 120 134 Q150 150 199 186', { w: 1.2 }) +
    line('M41 97 L120 128 L199 97', { w: 1.2 }) +
    line('M120 128 L120 134', { w: 1, op: 0.4 });
  return (
    solid(c, flap, { T, fill: CREAM, light: [-4, -6], shade: GREY, detail: inT(T, flapBits) }) +
    solid(c, body, { T, fill: PAPER, shade: GREY, light: [-7, -6], detail: inT(T, border), inner: inT(T, inside) })
  );
};

// 008 FLATTENED PING-PONG BALL
ART['artifact-008'] = (c) => {
  ground(c, 128, 174, 64, 9);
  const ball = smooth(blob(120, 118, 64, 53, [1, 1.01, 1, 0.99, 1, 1.01, 1, 1, 1, 0.99, 1, 0.99, 0.97, 0.92, 0.9, 0.95]), true);
  const dent = smooth(blob(146, 92, 27, 17, [1, 1.08, 0.94, 1.05, 0.9, 1.04, 1.1, 0.95, 1.02], -32));
  const did = c.id('m');
  c.defs.push(`<mask id="${did}" maskUnits="userSpaceOnUse" x="0" y="0" width="240" height="240"><path d="${dent}" fill="#fff"/><g transform="translate(7 6)"><path d="${dent}" fill="#000"/></g></mask>`);
  const lit = c.id('m');
  c.defs.push(`<mask id="${lit}" maskUnits="userSpaceOnUse" x="0" y="0" width="240" height="240"><path d="${dent}" fill="#fff"/><g transform="translate(-5 -4)"><path d="${dent}" fill="#000"/></g></mask>`);
  const star = (x, y, r) => {
    const p = [];
    for (let i = 0; i < 10; i++) {
      const a = -Math.PI / 2 + (i * Math.PI) / 5, rr = i % 2 ? r * 0.45 : r;
      p.push([x + Math.cos(a) * rr, y + Math.sin(a) * rr]);
    }
    return fillPath('M' + p.map(pt).join('L') + 'Z', INK, { op: 0.4 });
  };
  const inner =
    `<path d="${dent}" fill="${GREY}" opacity=".55"/>` +
    `<g mask="url(#${did})"><rect width="240" height="240" fill="${GREY}"/><rect width="240" height="240" fill="url(#h-${c.uid})"/></g>` +
    `<g mask="url(#${lit})"><rect width="240" height="240" fill="${PAPER}"/></g>` +
    line(dent, { w: 0.9, op: 0.3 }) +
    line('M124 92 Q128 78 142 72 Q152 69 160 71', { w: 1.5 }) +
    line('M121 96 L114 99 M128 77 L122 72 M146 70 L145 63 M166 80 L172 76 M170 102 L177 104', { w: 0.9, op: 0.55 }) +
    line('M58 126 C80 146 150 150 182 120', { w: 1.2, op: 0.55 }) +
    line('M58 130 C80 150 150 154 182 124', { w: 0.8, op: 0.25 }) +
    star(80, 104, 4) + star(91, 99.5, 4) + star(102, 96.5, 4);
  return solid(c, ball, {
    fill: PAPER, shade: GREY, light: [-9, -8], inner,
    hl: smooth([[78, 86], [90, 77], [102, 74], [92, 80], [82, 92]]),
  });
};

// 009 ORPHANED REMOTE CONTROL
ART['artifact-009'] = (c) => {
  ground(c, 130, 190, 52, 8);
  const T = 'rotate(-14 120 116)';
  const body = 'M96 38 H142 Q150 38 150.5 46 L152.5 116 L149.5 186 Q149 194 141 194 H97 Q89 194 89 186 L86 116 L88 46 Q88.5 38 96 38 Z';
  let btn = '';
  const key = (x, y, w, h, fill, worn) =>
    `<rect x="${f(x - w / 2)}" y="${f(y - h / 2)}" width="${w}" height="${h}" rx="3.2" fill="${fill}" stroke="${INK}" stroke-width="1.2"/>` +
    (worn ? '' : `<path d="M${f(x - w / 2 + 2.5)} ${f(y - h / 2 + 2.2)} H${f(x + w / 2 - 4)}" stroke="${PAPER}" stroke-width="1.1" stroke-linecap="round" opacity=".7"/>`);
  for (let r = 0; r < 4; r++)
    for (let k = 0; k < 3; k++) {
      const worn = r === 0 && k === 1;
      btn += key(100 + k * 19, 114 + r * 15, 13, 9.5, worn ? TAN : STEEL, worn);
    }
  btn += key(103, 85, 9, 24, STEEL) + key(135, 85, 9, 24, STEEL);
  btn += key(103, 178, 11, 7, GREY) + key(119, 178, 11, 7, GREY) + key(135, 178, 11, 7, GREY);
  btn += `<circle cx="138" cy="56" r="6.2" fill="${VERM}" stroke="${INK}" stroke-width="1.2"/>` + line('M135.5 54 Q137 52.5 139 52.6', { w: 1, stroke: PAPER });
  btn += `<rect x="98" y="51" width="26" height="9" rx="2" fill="${INK}" opacity=".12" stroke="${INK}" stroke-width="1"/>`;
  btn += `<rect x="108" y="40.5" width="22" height="4" rx="2" fill="${INK}"/>`;
  return (
    solid(c, body, { T: `translate(6.5 4.5) ${T}`, fill: STEEL, shade: false, mis: false }) +
    solid(c, body, {
      T, fill: GREY, light: [-6, -5],
      hl: 'M93 50 Q93 46 96 45 L94 110 Q92.5 80 93 50Z',
      over: inT(T, btn),
    })
  );
};

// 010 NOTE SAYING DO NOT THROW AWAY
ART['artifact-010'] = (c) => {
  ground(c, 126, 186, 78, 8);
  const T = 'rotate(-5 120 118)';
  const top = [];
  for (let i = 0; i <= 24; i++) {
    const x = 46 + i * 6.1;
    top.push([x, 62 - i * 0.2 + (c.rand() * 2 - 1) * 2.8 + (i % 2 ? 1.2 : -1)]);
  }
  const right = [[197, 70], [195.5, 100], [198, 132], [196, 168]];
  const pts = [...top, ...right, [150, 170.5], [100, 169], [46, 172], [48.5, 120]];
  const scrap = 'M' + pts.map(pt).join('L') + 'Z';
  let ruled = '';
  for (let y = 84; y < 172; y += 14) ruled += line(`M40 ${y} Q120 ${y + 1.5} 204 ${y - 1}`, { w: 0.9, stroke: BLUE, op: 0.35 });
  ruled += line('M64 50 L62 178', { w: 0.9, stroke: VERM, op: 0.55 });
  ruled += `<path d="M121 50 L123 180 L204 180 L204 50Z" fill="${INK}" opacity=".06"/>`;
  const creases =
    line('M121 58 L122.5 174', { w: 0.9, op: 0.45 }) +
    line('M70 140 L96 112 M150 74 L172 98 M138 150 L176 140', { w: 0.7, op: 0.2 });
  const words =
    text(128, 130, '不要丟', { family: CJK, size: 34, fill: INK, op: 0.78, anchor: 'middle', T: 'rotate(-4 128 120)' }) +
    line('M84 141 Q110 137 134 140 T170 134', { w: 1.3, op: 0.6 });
  return solid(c, scrap, { T, fill: PAPER, shade: GREY, light: [-6, -5], detail: inT(T, ruled), inner: inT(T, creases + words) });
};

// 011 ORDINARY STONE
ART['artifact-011'] = (c) => {
  ground(c, 128, 166, 74, 10);
  const stone = smooth(blob(120, 124, 70, 39, [1, 1.02, 1.01, 0.97, 0.99, 1.0, 1.03, 1.02, 1.0, 0.97, 0.96, 0.99, 1.02, 1.01, 0.99, 0.97], -6));
  const inner =
    `<path d="M36 104 C72 126 150 100 210 124 L210 134 C150 112 76 138 36 116Z" fill="${PAPER}" opacity=".5"/>` +
    speckle(c, 120, 124, 60, 32, 26, (x, y, i) => `<circle cx="${f(x)}" cy="${f(y)}" r="${f(0.5 + c.rand() * 0.9)}" fill="${i % 4 ? INK : PAPER}" opacity="${i % 4 ? 0.35 : 0.9}"/>`) +
    fillPath('M150 99 l3 -1.2 l1.2 2.4 l-2.6 1Z', PAPER);
  return solid(c, stone, {
    fill: GREY, shade: STEEL, light: [-10, -9], inner,
    hl: smooth([[74, 104], [88, 96], [104, 94], [96, 99], [82, 104], [76, 110]]),
  });
};

// 012 BLANK CERTIFICATE
ART['artifact-012'] = (c) => {
  ground(c, 126, 190, 86, 8);
  const T = 'rotate(-3 120 116)';
  const sheet = poly([[34, 52], [206, 52], [206, 178], [34, 178]], 2, 1, c.rand);
  const wave = (x0, y0, x1, y1) => {
    const len = Math.hypot(x1 - x0, y1 - y0), n = Math.round(len / 6);
    const ux = (x1 - x0) / len, uy = (y1 - y0) / len;
    let d = `M${f(x0)} ${f(y0)}`;
    for (let i = 0; i < n; i++) {
      const s = ((i + 0.5) / n) * len, e = ((i + 1) / n) * len, k = i % 2 ? 2 : -2;
      d += `Q${f(x0 + ux * s - uy * k)} ${f(y0 + uy * s + ux * k)} ${f(x0 + ux * e)} ${f(y0 + uy * e)}`;
    }
    return d;
  };
  const orn = (x, y) =>
    `<g transform="translate(${x} ${y})"><circle cx="-2.6" cy="0" r="2.2" fill="${GREEN}"/><circle cx="2.6" cy="0" r="2.2" fill="${GREEN}"/><circle cx="0" cy="-2.6" r="2.2" fill="${GREEN}"/><circle cx="0" cy="2.6" r="2.2" fill="${GREEN}"/><circle cx="0" cy="0" r="1.2" fill="${PAPER}"/></g>`;
  const deco =
    `<rect x="41" y="59" width="158" height="112" fill="none" stroke="${GREEN}" stroke-width="1.4"/>` +
    `<rect x="51" y="69" width="138" height="92" fill="none" stroke="${GREEN}" stroke-width=".8"/>` +
    line(wave(46, 64, 194, 64) + wave(46, 166, 194, 166) + wave(46, 64, 46, 166) + wave(194, 64, 194, 166), { stroke: GREEN, w: 0.8 }) +
    orn(46, 64) + orn(194, 64) + orn(46, 166) + orn(194, 166) +
    text(120, 86, 'CERTIFICATE', { family: SERIF, size: 9.5, fill: GREEN, anchor: 'middle', ls: 2.4 }) +
    line('M96 92 H144', { stroke: GREEN, w: 0.8 }) + `<circle cx="120" cy="92" r="1.4" fill="${GREEN}"/>` +
    line('M62 150 H104 M136 150 H160', { w: 0.8, op: 0.55 });
  const sealPts = [];
  for (let i = 0; i < 28; i++) {
    const a = (i / 28) * Math.PI * 2, r = i % 2 ? 14.5 : 17;
    sealPts.push([174 + Math.cos(a) * r, 156 + Math.sin(a) * r]);
  }
  const ribbon =
    solid(c, poly([[168, 162], [176, 160], [166, 196], [161, 189], [156, 194]], 1.5), { T, fill: VERM, shade: false }) +
    solid(c, poly([[176, 160], [184, 164], [192, 192], [186, 188], [181, 194]], 1.5), { T, fill: VERM, shade: false });
  const seal = solid(c, 'M' + sealPts.map(pt).join('L') + 'Z', {
    T, fill: VERM, light: [-4, -4], shadeOpacity: 0.3, hatch: false,
    over: inT(T, `<circle cx="174" cy="156" r="10" fill="none" stroke="${PAPER}" stroke-width="1.1" opacity=".85"/><circle cx="174" cy="156" r="6.5" fill="none" stroke="${PAPER}" stroke-width=".7" stroke-dasharray="1.2 1.6" opacity=".85"/>` + line('M166 151 Q169 147 173.5 146.5', { stroke: PAPER, w: 1.2 })),
  });
  return solid(c, sheet, { T, fill: PAPER, shade: GREY, light: [-5, -5], detail: inT(T, deco) }) + ribbon + seal;
};

// 013 MINIATURE SAFE -- dark, small, immensely proud.
ART['artifact-013'] = (c) => {
  ground(c, 128, 188, 76, 9);
  const sil = poly([[54, 74], [86, 52], [186, 52], [186, 152], [154, 174], [54, 174]], [3, 3, 3, 3, 3, 3], 0.8, c.rand);
  const feet =
    solid(c, poly([[57, 171], [75, 171], [74, 184], [58, 184]], 3), { fill: BRASS, shade: false }) +
    solid(c, poly([[133, 171], [151, 171], [150, 184], [134, 184]], 3), { fill: BRASS, shade: false }) +
    solid(c, poly([[170, 152], [184, 150], [183, 162], [171, 163]], 3), { fill: BROWN, shade: false });
  const faces =
    `<path d="M54 74 L86 52 L186 52 L154 74 Z" fill="${PAPER}" opacity=".16"/>` +
    `<path d="M154 74 L186 52 L186 152 L154 174 Z" fill="${INK}" opacity=".38"/>` +
    `<g clip-path="url(#rs-${c.uid})"><rect width="240" height="240" fill="url(#h-${c.uid})"/></g>`;
  c.defs.push(`<clipPath id="rs-${c.uid}"><path d="M154 74 L186 52 L186 152 L154 174 Z"/></clipPath>`);
  const edges =
    line('M54 74 L154 74 L186 52 M154 74 L154 174', { w: 1.3 }) +
    line('M57 73 L153 73', { w: 1.1, stroke: BRASS, op: 0.9 }) +
    line('M156 72 L184 53', { w: 1, stroke: PAPER, op: 0.35 });
  let ticks = '';
  for (let i = 0; i < 24; i++) {
    const a = (i / 24) * Math.PI * 2, r1 = i % 6 ? 13.5 : 11.5;
    ticks += line(`M${f(96 + Math.cos(a) * r1)} ${f(124 + Math.sin(a) * r1)}L${f(96 + Math.cos(a) * 16)} ${f(124 + Math.sin(a) * 16)}`, { w: 0.8 });
  }
  const spoke = (a) => {
    const x = 132 + Math.cos(rad(a)) * 13, y = 124 + Math.sin(rad(a)) * 13;
    return `<path d="M132 124 L${f(x)} ${f(y)}" stroke="${INK}" stroke-width="5.2" stroke-linecap="round"/><path d="M132 124 L${f(x)} ${f(y)}" stroke="${BRASS}" stroke-width="2.6" stroke-linecap="round"/><circle cx="${f(x)}" cy="${f(y)}" r="3.6" fill="${BRASS}" stroke="${INK}" stroke-width="1.2"/>`;
  };
  const door =
    `<rect x="64" y="84" width="80" height="80" rx="2.5" fill="none" stroke="${INK}" stroke-width="1.4"/>` +
    `<rect x="66.5" y="86.5" width="75" height="75" rx="1.5" fill="none" stroke="${BRASS}" stroke-width=".9"/>` +
    `<rect x="59.5" y="92" width="6" height="11" rx="1.5" fill="${BRASS}" stroke="${INK}" stroke-width="1.1"/>` +
    `<rect x="59.5" y="145" width="6" height="11" rx="1.5" fill="${BRASS}" stroke="${INK}" stroke-width="1.1"/>` +
    `<circle cx="96" cy="124" r="17.5" fill="${BRASS}" stroke="${INK}" stroke-width="1.6"/>` + ticks +
    `<circle cx="96" cy="124" r="7" fill="${BROWN}" stroke="${INK}" stroke-width="1.2"/>` +
    line('M85 114 Q89 109.5 95 108.6', { w: 1.3, stroke: PAPER }) +
    `<path d="M96 104.5 L92.8 99.5 L99.2 99.5 Z" fill="${VERM}" stroke="${INK}" stroke-width=".9" stroke-linejoin="round"/>` +
    spoke(-90) + spoke(30) + spoke(150) +
    `<circle cx="132" cy="124" r="4.6" fill="${BRASS}" stroke="${INK}" stroke-width="1.2"/>` +
    `<rect x="84" y="148" width="40" height="9" rx="1.2" fill="${BRASS}" stroke="${INK}" stroke-width="1.1"/>` +
    line('M89 151.5 H119 M89 154 H110', { w: 0.6, stroke: BROWN });
  const sparkle = fillPath('M60 52 Q61 60 68 61 Q61 62 60 70 Q59 62 52 61 Q59 60 60 52Z', PAPER, { stroke: INK, w: 1 });
  return feet + solid(c, sil, {
    fill: GREEN, shade: false, detail: faces, inner: edges + door,
    over: sparkle,
  });
};

// 014 YESTERDAY'S AIR
ART['artifact-014'] = (c) => {
  ground(c, 126, 184, 64, 8);
  const jar = 'M86 70 C70 74 64 84 64 98 L64 166 Q64 180 78 180 L162 180 Q176 180 176 166 L176 98 C176 84 170 74 154 70 Z';
  const lid = poly([[82, 46], [158, 46], [158, 69], [82, 69]], 4, 0.6, c.rand);
  let ridges = '';
  for (let x = 88; x <= 152; x += 4.6) ridges += line(`M${f(x)} 52 V66`, { w: 0.8, op: 0.5 });
  const glass =
    line('M66 172 Q120 160 174 172', { w: 0.9, op: 0.35 }) +
    line('M88 74 Q120 80 152 74', { w: 0.9, op: 0.35 }) +
    `<path d="M73 100 Q74 90 80 85 L80 160 Q73 150 73 100Z" fill="${PAPER}" opacity=".85"/>` +
    `<path d="M86 96 L89.5 92 L89.5 106 L86 109Z" fill="${PAPER}" opacity=".8"/>` +
    `<path d="M166 104 Q168 128 165 152" fill="none" stroke="${PAPER}" stroke-width="1.6" stroke-linecap="round" opacity=".6"/>`;
  const label =
    solid(c, 'M82 114 Q120 118.5 158 114 L158 152 Q120 156.5 82 152 Z', {
      fill: PAPER, shade: GREY, light: [-4, -3], sw: 1.4,
      over:
        line('M88 124 Q120 127.5 152 124', { w: 0.8, stroke: VERM, op: 0.8 }) +
        text(120, 141, '24.11.2026', { size: 10.5, weight: 'bold', anchor: 'middle', ls: 0.4, op: 0.85 }) +
        line('M96 147 Q120 149 144 147', { w: 0.6, op: 0.4 }),
    });
  return (
    solid(c, jar, { fill: TEAL, fillOpacity: 0.4, shade: false, inner: glass }) +
    label +
    solid(c, lid, { fill: BRASS, shade: BROWN, light: [-5, -4], inner: ridges, hl: 'M86 50 H150 L148 52.5 H86Z' })
  );
};

// 015 TWO CENTIMETRES OF TUESDAY
ART['artifact-015'] = (c) => {
  ground(c, 126, 190, 64, 7);
  // 2 cm = 48 px on this plate; the ruler below is to the same scale.
  let top = 'M96 38';
  for (let x = 96; x < 144; x += 6) top += `L${x + 2.5} 38 A2 2 0 0 0 ${x + 6} 38`;
  const strip = top + 'L144 38 L144.5 160 L95.5 160.5 Z';
  const T = 'rotate(-2 120 100)';
  const page =
    `<rect x="86" y="38" width="70" height="17" fill="${VERM}"/>` +
    text(116, 50.5, 'NOVEMBER', { size: 9, weight: 'bold', fill: PAPER, anchor: 'middle', ls: 1.5 }) +
    `<path d="M106 87 C104 82.5 110 80.5 116 81.5 C132 82 150 80 176 78.5 L176 87.5 C150 88.5 132 90 114 91 C108.5 91.4 105.5 90.2 106 87 Z" fill="${INK}"/>` +
    `<path d="M60 121 C96 118 140 116.5 190 118 L190 130 C140 128 96 129 60 133 Z" fill="${INK}"/>` +
    text(130, 151, 'TUE', { size: 17, weight: 'bold', anchor: 'middle', ls: 1 }) +
    line('M92 64 H150', { w: 0.7, op: 0.4 });
  let ticks = '';
  for (let i = 0; i <= 36; i++) {
    const x = 96 + i * 2.4;
    const len = i % 10 === 0 ? 8 : i % 5 === 0 ? 5.5 : 3.5;
    ticks += line(`M${f(x)} 167 V${167 + len}`, { w: i % 10 === 0 ? 1 : 0.7 });
  }
  ticks += line('M96 167 V163 M144 167 V163', { w: 1, stroke: VERM });
  ticks += ['0', '1', '2', '3'].map((n, i) => text(96 + i * 24, 184, n, { size: 6.5, anchor: 'middle' })).join('');
  const ruler = poly([[66, 167], [186, 167], [186, 188], [66, 188]], 2.5, 0.6, c.rand);
  return (
    solid(c, strip, { T, fill: PAPER, shade: GREY, light: [-4, -3], detail: inT(T, page) }) +
    solid(c, ruler, { fill: TAN, shade: BROWN, light: [-3, -3], hatch: false, over: ticks })
  );
};

// 016 STRAIGHTENED PAPER CLIP
ART['artifact-016'] = (c) => {
  ground(c, 124, 170, 70, 7);
  const T = 'translate(122 118) rotate(-36)';
  const d = 'M-86 3 L-42 3 Q-36 3 -33 1.5 L14 -0.5 Q20 -1 24 0 L64 0 A8 8 0 0 0 64 -16 L42 -15.5 Q38 -15.5 36 -13';
  return wire(c, d, { T, w: 4.4, fill: GREY, glintDash: '28 6 50 8 200' });
};

// 017 DRIED-OUT BALLPOINT PEN
ART['artifact-017'] = (c) => {
  ground(c, 124, 172, 76, 8);
  const T = 'translate(120 116) rotate(-30)';
  const barrel = 'M-72 -3.6 L-58 -7.4 L58 -7.4 L58 7.4 L-58 7.4 L-72 3.6 Z';
  const tip = 'M-88 -1.4 L-72 -3.8 L-72 3.8 L-88 1.4 Z';
  let chew = [[46, -9.5], [80, -9.5], [83, -7], [80.5, -4.2], [84.5, -1.5], [81, 1.5], [84, 4.4], [80, 7], [81.5, 9.5], [46, 9.5]];
  const cap = poly(chew, [2, 1, 1, 1, 1, 1, 1, 1, 1, 2]);
  const clip = poly([[52, -9.5], [52, -13.5], [80, -13], [82, -11], [80, -9.5]], 1.5);
  const tube =
    `<rect x="-70" y="-1.8" width="118" height="3.6" rx="1.5" fill="${PAPER}" opacity=".55" stroke="${INK}" stroke-width=".8"/>` +
    `<rect x="-70" y="-1.8" width="3.2" height="3.6" fill="${BLUE}"/>` +
    line('M-56 -2.6 H56 M-56 2.6 H56', { w: 0.7, op: 0.25 }) +
    `<rect x="-52" y="-6" width="96" height="1.6" fill="${PAPER}" opacity=".85"/>`;
  return (
    solid(c, tip, { T, fill: BRASS, shade: false, over: inT(T, `<circle cx="-88.6" cy="0" r="1.8" fill="${STEEL}" stroke="${INK}" stroke-width="1"/>`) }) +
    solid(c, barrel, { T, fill: TEAL, fillOpacity: 0.45, light: [-2, -3], inner: inT(T, tube) }) +
    solid(c, cap, {
      T, fill: BLUE, light: [-2, -3], shadeOpacity: 0.3,
      inner: inT(T, line('M74 -9 L76 -3 M77 2 L75 8 M70 -9 L71 -5', { w: 1, op: 0.8 }) + line('M50 -6 H74', { w: 1.2, stroke: PAPER, op: 0.6 })),
    }) +
    solid(c, clip, { T, fill: BLUE, shade: false, sw: 1.6 })
  );
};

// 018 ONE BUTTON
ART['artifact-018'] = (c) => {
  ground(c, 126, 178, 62, 9);
  const face = smooth(blob(120, 112, 58, 50, [1, 1, 1.01, 1, 1, 0.99, 1, 1.01, 1, 1, 0.99, 1]));
  const edge = smooth(blob(120, 119, 58, 50, [1, 1, 1.01, 1, 1, 0.99, 1, 1.01, 1, 1, 0.99, 1]));
  const rim = 'M120 74 A44 37.5 0 1 0 120.1 74Z';
  const did = c.id('m');
  c.defs.push(`<mask id="${did}" maskUnits="userSpaceOnUse" x="0" y="0" width="240" height="240"><path d="${rim}" fill="#fff"/><g transform="translate(6 5)"><path d="${rim}" fill="#000"/></g></mask>`);
  const hole = (x, y) => `<ellipse cx="${x}" cy="${y}" rx="5.4" ry="4.8" fill="${INK}"/><path d="M${x - 4} ${y + 1.5} Q${x} ${y + 5} ${x + 4} ${y + 1.5}" fill="none" stroke="${BROWN}" stroke-width="1"/>`;
  const thread = 'M132 123.5 C136 136 146 146 150 160 C153 170 160 176 169 175';
  const inner =
    `<g mask="url(#${did})"><rect width="240" height="240" fill="${INK}" opacity=".22"/></g>` +
    line(rim, { w: 1.2 }) +
    line('M86 96 Q94 82 112 77', { w: 1.6, stroke: PAPER, op: 0.85 }) +
    hole(107, 103) + hole(133, 103) + hole(107, 123) + hole(133, 123) +
    line('M72 128 Q78 140 92 146 M150 84 Q160 90 164 100', { w: 0.8, op: 0.25 });
  const th =
    `<path d="${thread}" fill="none" stroke="${INK}" stroke-width="4" stroke-linecap="round"/>` +
    `<path d="${thread}" fill="none" stroke="${VERM}" stroke-width="2" stroke-linecap="round"/>` +
    line('M168 175 Q172 174.5 174.5 172 M168.5 175.5 Q172 177.5 175 177', { w: 1, stroke: VERM }) +
    `<circle cx="132.5" cy="123.5" r="2.2" fill="${VERM}" stroke="${INK}" stroke-width="1"/>`;
  return (
    solid(c, edge, { fill: BROWN, shade: false, detail: `<rect width="240" height="240" fill="${INK}" opacity=".3"/>` }) +
    solid(c, face, { fill: BROWN, light: [-7, -6], shadeOpacity: 0.22, inner, hl: 'M80 104 Q82 90 92 82 Q86 92 84 106Z', over: th })
  );
};

// 019 ONE RUBBER BAND
ART['artifact-019'] = (c) => {
  ground(c, 126, 172, 78, 8);
  const X = [122, 124];
  const P = [X, [108, 98], [84, 84], [57, 90], [45, 114], [55, 142], [86, 153], X, [149, 109], [174, 106], [194, 119], [191, 139], [168, 146], [143, 137]];
  const segs = crSegs(P, true);
  const all = segsToD(segs, true);
  const over = segsToD(segs.slice(6, 8), false);
  const mk = (d, cap) =>
    `<path d="${d}" fill="none" stroke="${INK}" stroke-width="8.6" stroke-linecap="${cap}" stroke-linejoin="round"/>` +
    `<path d="${d}" fill="none" stroke="${TAN}" stroke-width="5.2" stroke-linecap="${cap}" stroke-linejoin="round"/>` +
    `<g transform="translate(.9 1)"><path d="${d}" fill="none" stroke="${BROWN}" stroke-width="1.3" stroke-linecap="${cap}"/></g>`;
  c.back.push(`<g transform="${MIS}"><path d="${all}" fill="none" stroke="${TAN}" stroke-width="5.2"/></g>`);
  return mk(all, 'round') + mk(over, 'butt') +
    `<g transform="translate(-.8 -.9)"><path d="${segsToD(segs.slice(1, 3), false)}" fill="none" stroke="${PAPER}" stroke-width="1.1" stroke-linecap="round"/></g>` +
    `<g transform="translate(-.8 -.9)"><path d="${segsToD(segs.slice(8, 9), false)}" fill="none" stroke="${PAPER}" stroke-width="1.1" stroke-linecap="round"/></g>`;
};

// 020 APPLE CORE
ART['artifact-020'] = (c) => {
  ground(c, 126, 192, 52, 7);
  const P = [
    [80, 66], [88, 52], [106, 46], [120, 52], [134, 46], [152, 51], [160, 66],
    [153, 75], [147, 80], [146, 89], [141, 96], [141, 106], [138, 114], [140, 124], [143, 133], [146, 141], [152, 148], [160, 158],
    [162, 172], [152, 183], [134, 187], [120, 184], [106, 187], [88, 183], [78, 172],
    [80, 158], [88, 148], [93, 140], [97, 132], [99, 122], [102, 114], [99, 106], [98, 96], [94, 88], [92, 79], [86, 74],
  ];
  const core = smooth(P, true, 0.9);
  const topSkin = 'M60 30 L180 30 L180 68 C166 74 154 66 142 70 C130 76 112 70 100 74 C90 76 80 70 60 70 Z';
  const botSkin = 'M60 210 L180 210 L180 158 C166 162 152 154 140 160 C128 166 112 158 98 162 C86 165 76 156 60 160 Z';
  const detail =
    `<path d="${core}" fill="none" stroke="${TAN}" stroke-width="12"/>` +
    `<path d="${core}" fill="none" stroke="${OCHRE}" stroke-width="4.5"/>` +
    `<path d="${topSkin}" fill="${VERM}"/><path d="${botSkin}" fill="${VERM}"/>` +
    line('M60 70 C80 70 90 76 100 74 C112 70 130 76 142 70 C154 66 166 74 180 68', { w: 1.2 }) +
    line('M60 160 C76 156 86 165 98 162 C112 158 128 166 140 160 C152 154 166 162 180 158', { w: 1.2 });
  const seeds =
    line('M112 96 Q104 116 112 140 M128 96 Q136 116 128 140', { w: 0.8, stroke: BROWN, op: 0.6 }) +
    fillPath('M114 108 C110 112 110 120 115 123 C118 118 118 112 114 108Z', INK, { stroke: INK, w: 1 }) +
    fillPath('M126 113 C130 117 130 125 125 128 C122 123 122 117 126 113Z', BROWN, { stroke: INK, w: 1.1 }) +
    line('M113.3 112 Q112.5 115 113.5 118', { w: 0.8, stroke: PAPER, op: 0.8 });
  const stem = 'M120 52 C120 44 121 36 125 28';
  const top =
    solid(c, 'M124 37 C130 26 146 22 158 26 C150 36 136 41 124 37 Z', {
      fill: GREEN, light: [-3, -3], shadeOpacity: 0.35, hatch: false, sw: 1.8,
      over: line('M126 36 C136 31 146 28 154 27', { w: 0.9, stroke: TEAL }),
    }) +
    `<path d="${stem}" fill="none" stroke="${INK}" stroke-width="5.6" stroke-linecap="round"/><path d="${stem}" fill="none" stroke="${BROWN}" stroke-width="3" stroke-linecap="round"/>` +
    line('M115 186 L120 182 L125 186 M120 182 V188', { w: 1 });
  return solid(c, core, {
    fill: PAPER, light: [-7, -5], detail,
    inner: seeds +
      fillPath('M84 60 Q92 51 104 50 Q94 56 88 64Z', PAPER, { op: 0.9 }) +
      fillPath('M84 176 Q82 168 86 162 Q86 170 90 178Z', PAPER, { op: 0.8 }),
    over: top,
  });
};

// 021 SPARE KEY, PURPOSE UNKNOWN
ART['artifact-021'] = (c) => {
  ground(c, 124, 184, 70, 8);
  const T = 'rotate(-14 120 100)';
  const shaft = poly([[96, 94], [178, 94], [181, 97], [181, 124], [175, 124], [175, 116], [169, 116], [169, 124], [161, 124], [161, 102], [96, 102]], [1, 2, 2, 1, 1, 0.5, 0.5, 1, 1, 1, 1]);
  const bowPts = blob(72, 98, 24, 20, [1.02, 1, 0.97, 1, 1.01, 1, 0.98, 1, 1.02, 1, 0.99, 1]);
  const bow = smooth(bowPts) + ' M83 98 A11 8.5 0 1 0 61 98 A11 8.5 0 1 0 83 98Z';
  const collar = poly([[93, 91.5], [101, 91.5], [101, 104.5], [93, 104.5]], 1.5);
  const tagT = 'translate(74 158) rotate(16)';
  const tag = poly([[-27, -9], [-18, -16], [28, -16], [28, 16], [-18, 16], [-27, 9]], 2, 0.8, c.rand) + ' M-15 0 A3 3 0 1 0 -21 0 A3 3 0 1 0 -15 0Z';
  const string = 'M56 99 C46 106 50 118 52 126 C54 134 58 142 59 150';
  return (
    solid(c, shaft, { T, fill: BRASS, shade: BROWN, light: [-3, -3], hatch: false, hl: 'M100 95.6 H170 V97 H100Z' }) +
    solid(c, bow, { T, fill: BRASS, shade: BROWN, light: [-5, -5], rule: 'evenodd',
      inner: inT(T, line('M72 98 m-17.5 0 a17.5 14 0 1 0 35 0 a17.5 14 0 1 0 -35 0', { w: 0.9, op: 0.6 })),
      hl: 'M56 86 Q62 78 70 76.5 Q64 81 59 89Z' }) +
    solid(c, collar, { T, fill: BRASS, shade: BROWN, light: [-2, -2], hatch: false, sw: 1.6, over: inT(T, line('M97 92.5 V103.5', { w: 0.9 })) }) +
    `<path d="${string}" fill="none" stroke="${INK}" stroke-width="1.3" stroke-linecap="round"/>` +
    solid(c, tag, {
      T: tagT, fill: TAN, shade: BROWN, light: [-3, -3], rule: 'evenodd', hatch: false,
      inner: inT(tagT, `<circle cx="-18" cy="0" r="6.2" fill="${PAPER}" stroke="${INK}" stroke-width=".8"/>`),
      over: inT(tagT, `<circle cx="-18" cy="0" r="3" fill="none" stroke="${INK}" stroke-width="1.1"/>` + text(6, 9, '?', { family: SERIF, size: 26, anchor: 'middle', weight: 'bold' })),
    }) +
    `<path d="M59 150 Q56 156 57 158" fill="none" stroke="${INK}" stroke-width="1.3" stroke-linecap="round"/>`
  );
};

// 022 ONE BOTTLE CAP
ART['artifact-022'] = (c) => {
  ground(c, 126, 168, 66, 9);
  const T = 'rotate(-9 120 116)';
  const n = 22;
  const bot = [], topP = [];
  for (let i = 0; i <= n; i++) {
    const a = Math.PI * (i / n);
    const r = i % 2 ? 1 : 1.07;
    bot.push([120 + Math.cos(a) * 62 * r, 126 + Math.sin(a) * 31 * r]);
    topP.push([120 + Math.cos(a) * 55, 104 + Math.sin(a) * 28]);
  }
  const skirt = 'M175 104 ' + 'L' + pt(bot[0]) + smooth(bot, false, 0.8).replace(/^M[^C]+/, '') + 'L65 104 A55 28 0 0 0 175 104 Z';
  let flutes = '';
  for (let i = 1; i < n; i += 2) flutes += line(`M${pt(topP[i])}L${pt(bot[i])}`, { w: 1, op: 0.75 });
  const top = 'M65 104 A55 28 0 1 1 175 104 A55 28 0 1 1 65 104 Z';
  return (
    solid(c, skirt, { T, fill: VERM, light: [-6, -2], shadeOpacity: 0.3, inner: inT(T, flutes), hatch: true }) +
    solid(c, top, {
      T, fill: VERM, light: [-4, -4], shadeOpacity: 0.2, hatch: false,
      inner: inT(T,
        `<ellipse cx="120" cy="104" rx="38" ry="18.5" fill="none" stroke="${MUSTARD}" stroke-width="5"/>` +
        `<ellipse cx="120" cy="104" rx="38" ry="18.5" fill="none" stroke="${INK}" stroke-width=".8" opacity=".5"/>` +
        line('M98 94 Q124 104 146 116', { w: 1.1, op: 0.7 }) +
        line('M99 92.6 Q124 102 147 114', { w: 1, stroke: PAPER, op: 0.7 }) +
        `<circle cx="120" cy="104" r="3" fill="${MUSTARD}" stroke="${INK}" stroke-width=".8"/>`),
      hl: 'M78 96 Q86 85 104 80 Q90 87 82 98Z',
    })
  );
};

// 023 FADED RECEIPT
ART['artifact-023'] = (c) => {
  ground(c, 126, 186, 54, 8);
  const T = 'rotate(5 120 112)';
  let d = 'M86 36';
  for (let x = 86; x < 154; x += 4.25) d += `L${f(x + 2.1)} ${33 + (c.rand() * 1.2)} L${f(x + 4.25)} 36.5`;
  d += 'C152 70 156 110 153 150 C140 156 100 156 87 150 C84 110 89 70 86 36 Z';
  const curl = 'M87 150 C100 156 140 156 153 150 C156 158 154 166 150 168 C132 174 104 174 88 168 C84 164 84 156 87 150 Z';
  let ghosts = '';
  const rows = [[106, 134, 52, 0.42], [94, 140, 64, 0.38], [94, 122, 76, 0.32], [132, 146, 76, 0.32], [94, 126, 86, 0.28], [132, 146, 86, 0.26], [94, 116, 96, 0.24], [134, 146, 96, 0.22], [94, 146, 106, 0.16]];
  for (const [a, b, y, op] of rows) ghosts += line(`M${a} ${y} H${b}`, { w: 2.2, stroke: GREY, op: op * 2 });
  ghosts += text(94, 121, 'TOTAL', { size: 7.5, weight: 'bold', op: 0.16, ls: 0.8 }) + text(146, 121, '.00', { size: 7.5, weight: 'bold', op: 0.3, anchor: 'end' });
  ghosts += line('M94 132 H146', { w: 1, dash: '2 2', op: 0.14 }) + text(120, 142, 'THANK YOU', { size: 6, op: 0.1, anchor: 'middle', ls: 1.2 });
  return (
    solid(c, d, { T, fill: PAPER, shade: GREY, light: [-5, -4], detail: inT(T, ghosts) }) +
    solid(c, curl, { T, fill: TAN, shade: BROWN, light: [0, -4], hatch: true, hl: 'M94 162 Q120 166.5 146 162 Q120 164 94 162Z',
      inner: inT(T, line('M90 161 Q120 167 150 161', { w: 0.8, op: 0.4 })) })
  );
};

// 024 ONE TOOTHPICK
ART['artifact-024'] = (c) => {
  ground(c, 124, 164, 72, 7);
  const T = 'translate(120 112) rotate(-32)';
  const d = 'M-92 0 C-80 -2.4 -72 -5 -60 -5.2 L60 -5.2 C72 -5 80 -2.4 92 0 C80 2.4 72 5 60 5.2 L-60 5.2 C-72 5 -80 2.4 -92 0 Z';
  const grain = line('M-74 -2 L-20 -2.4 M-34 0.6 L40 0.4 M10 -2.6 L72 -2 M-66 2.6 L-30 2.8 M24 2.8 L66 2.4', { w: 0.8, stroke: BROWN, op: 0.9 });
  return solid(c, d, {
    T, fill: TAN, shade: BROWN, light: [-1.6, -2.4], hatch: false,
    inner: inT(T, grain + line('M-62 -3.6 L58 -3.6', { w: 1.1, stroke: PAPER, op: 0.85 })),
    over: inT(T, line('M76 -3.2 L84 -8.4', { w: 0.9 }) + line('M78 -3.4 L85.5 -5.2', { w: 0.7, op: 0.8 })),
  });
};

// 025 BREAD BAG CLIP
ART['artifact-025'] = (c) => {
  ground(c, 126, 182, 62, 8);
  const T = 'rotate(-8 120 116)';
  const clip = 'M76 64 H164 Q174 64 174 74 V158 Q174 168 164 168 H129 L123.5 136.5 A13 13 0 1 0 116.5 136.5 L111 168 H76 Q66 168 66 158 V74 Q66 64 76 64 Z';
  const teeth = line('M126.5 152 L123 151 M113.5 152 L117 151', { w: 1.1 });
  return (
    solid(c, clip, { T: `translate(5 5) ${T}`, fill: TEAL, shade: false, mis: false, detail: `<rect width="240" height="240" fill="${INK}" opacity=".32"/>` }) +
    solid(c, clip, {
      T, fill: TEAL, light: [-6, -5], shadeOpacity: 0.2,
      inner: inT(T, text(120, 96, '24 NOV', { size: 14, weight: 'bold', anchor: 'middle', ls: 1, op: 0.85 }) + teeth +
        line('M134.5 130 A15.5 15.5 0 0 0 108 112', { w: 1, stroke: PAPER, op: 0.7 })),
      hl: 'M72 72 Q72 68 77 68 H112 Q90 70 74 76Z',
    })
  );
};

// 026 BLANK FORTUNE SLIP
ART['artifact-026'] = (c) => {
  ground(c, 126, 168, 82, 9);
  const jag = 'L163 103 L171 110 L163.5 117 L172 123 L165 131';
  const cookie = 'M60 140 C47 127 49 103 67 87 C85 71 112 65 133 69 C151 73 165 83 171 96 ' + jag +
    'C159 141 148 144 139 142 C131 141 125 137 120 131 C111 142 99 150 83 150 C73 150 65 146 60 140 Z';
  const hollow = 'M171 96 ' + jag + 'C158 124 150 116 152 106 C154 99 162 95 171 96 Z';
  const fragment = poly([[170, 158], [176, 151], [171, 144], [180, 141], [198, 146], [207, 160], [199, 171], [180, 171]], [1, 1, 1, 4, 8, 8, 8, 4], 0.5, c.rand);
  const slipT = 'rotate(-26 158 112)';
  const slip = poly([[152, 106], [218, 106], [218, 118], [152, 118]], 1.2, 0.4, c.rand);
  return (
    solid(c, cookie, {
      fill: MUSTARD, shade: OCHRE, light: [-9, -8],
      inner:
        `<path d="M120 131 C111 118 96 111 79 114 C69 116 62 124 58 134 C66 146 76 150 84 150 C100 150 111 142 120 131Z" fill="${OCHRE}" opacity=".55"/>` +
        `<path d="${hollow}" fill="${BROWN}"/><path d="${hollow}" fill="url(#h-${c.uid})"/>` +
        line('M120 131 C111 118 96 111 79 114 C69 116 62 124 59 133', { w: 1.3 }) +
        line('M120 131 C127 119 138 113 152 111', { w: 1.3 }) +
        line('M66 140 Q76 147 88 148', { w: 1, stroke: RUST, op: 0.7 }),
      hl: smooth([[66, 100], [78, 86], [98, 77], [86, 87], [72, 102]]),
    }) +
    solid(c, slip, { T: slipT, fill: PAPER, shade: GREY, light: [-2, -3], hatch: false }) +
    solid(c, fragment, {
      fill: MUSTARD, shade: OCHRE, light: [-4, -4], hatch: false,
      inner: `<path d="M170 158 L176 151 L171 144 L180 141 C178 150 176 155 170 158Z" fill="${BROWN}"/>` + line('M182 168 Q192 158 199 148', { w: 0.9, op: 0.4 }),
    }) +
    solid(c, poly([[150, 164], [155, 162], [156, 166], [151, 167]], 1), { fill: MUSTARD, shade: false, sw: 1.2 }) +
    solid(c, poly([[54, 158], [58, 157], [58, 160.5], [54.5, 161]], 1), { fill: MUSTARD, shade: false, sw: 1.2 })
  );
};

// 027 ONE RETIREMENT SPEECH
ART['artifact-027'] = (c) => {
  ground(c, 126, 192, 66, 8);
  const T = 'rotate(-3 120 112)';
  const sheet = poly([[66, 34], [174, 34], [176, 85], [174, 136], [175, 188], [65, 188], [67, 136], [64, 85]], [2, 2, 0.5, 0.5, 2, 2, 0.5, 0.5], 0.6, c.rand);
  let cols = `<rect x="74" y="46" width="92" height="132" fill="none" stroke="${VERM}" stroke-width="1.2" opacity=".75"/>`;
  for (let x = 74 + 92 / 7; x < 165; x += 92 / 7) cols += line(`M${f(x)} 46 V178`, { stroke: VERM, w: 0.7, op: 0.6 });
  const panels =
    `<path d="M60 85 L180 85 L180 136 L60 136 Z" fill="${INK}" opacity=".07"/>` +
    line('M64 85 L176 85', { w: 1, op: 0.35 }) + line('M67 136 L174 136', { w: 1, op: 0.35 });
  return solid(c, sheet, {
    T, fill: PAPER, shade: GREY, light: [-6, -5], detail: inT(T, cols + panels),
    over: inT(T, text(120, 126, '好', { family: CJK, size: 40, anchor: 'middle', fill: INK }) + `<circle cx="133" cy="128" r="1.3" fill="${INK}" opacity=".7"/>`),
  });
};

// 028 DEAD BATTERY
ART['artifact-028'] = (c) => {
  ground(c, 126, 168, 80, 9);
  const T = 'rotate(-10 120 116)';
  const body = 'M48 94 L186 94 Q192 94 192 100 L192 132 Q192 138 186 138 L172 138 Q166 135.5 160 138 L48 138 Q42 138 42 132 L42 100 Q42 94 48 94 Z';
  const nub = poly([[190, 106], [199, 106], [199, 126], [190, 126]], 2.5);
  const detail =
    `<rect x="40" y="90" width="100" height="52" fill="${INK}"/>` +
    `<rect x="40" y="90" width="9" height="52" fill="${GREY}"/>` +
    line('M140 92 V140', { w: 1.2, stroke: PAPER, op: 0.9 }) +
    `<rect x="52" y="99" width="84" height="4" rx="2" fill="${PAPER}" opacity=".45"/>` +
    `<rect x="144" y="99" width="40" height="4" rx="2" fill="${PAPER}" opacity=".5"/>`;
  const over =
    text(94, 125, '1.5V', { size: 16, weight: 'bold', fill: PAPER, anchor: 'middle', ls: 0.6 }) +
    text(176, 124, '+', { size: 14, weight: 'bold', fill: INK, anchor: 'middle' }) +
    text(60, 124, '−', { size: 12, weight: 'bold', fill: PAPER, anchor: 'middle', op: 0.7 }) +
    fillPath('M161 136 Q166 131 171 136 Q166 133.5 161 136 Z', INK, { op: 0.55 }) +
    line('M160.5 131.5 Q166 127.6 172 131.5', { w: 0.9, stroke: PAPER, op: 0.8 }) +
    line('M49 95 V137', { w: 1.1 });
  return (
    solid(c, nub, { T, fill: GREY, shade: STEEL, light: [-2, -2], hatch: false, sw: 1.8 }) +
    solid(c, body, { T, fill: RUST, misFill: STEEL, light: [-4, -6], shadeOpacity: 0.3, detail: inT(T, detail), over: inT(T, over) })
  );
};

// 029 MISCARVED SEAL
ART['artifact-029'] = (c) => {
  ground(c, 90, 166, 46, 7);
  const knob = smooth(blob(82, 56, 17, 15, [1, 1.02, 1, 0.98, 1, 1.01, 1, 0.99]));
  const neck = 'M75 66 C76 80 71 90 66 99 L99 99 C94 90 89 80 89.5 66 Z';
  const top = poly([[50, 99], [60, 92], [120, 92], [110, 99]], 1.5);
  const front = poly([[50, 99], [110, 99], [110, 137], [50, 137]], 1.5);
  const side = poly([[110, 99], [120, 92], [120, 130], [110, 137]], 1.5);
  const rubber = poly([[52, 137], [108, 137], [107, 145], [53, 145]], 1.2);
  let grain = line('M54 108 Q80 106 106 109 M54 118 Q76 120 106 116 M58 128 Q84 126 104 129', { w: 0.8, stroke: BROWN, op: 0.7 });
  grain += `<rect x="64" y="110" width="32" height="16" fill="${PAPER}" stroke="${INK}" stroke-width=".9"/><rect x="74" y="113" width="10" height="10" fill="${VERM}"/>`;
  const sq = poly([[-27, -27], [27, -27], [27, 27], [-27, 27]], 1.5, 1.6, c.rand);
  const IT = 'translate(160 162) skewX(-22) scale(1 .66)';
  const glyphs =
    `<rect x="-23" y="-23" width="46" height="46" fill="none" stroke="${PAPER}" stroke-width="1.6"/>` +
    text(11, -3, '保', { family: CJK, size: 19, fill: PAPER, anchor: 'middle' }) +
    text(11, 19, '護', { family: CJK, size: 19, fill: PAPER, anchor: 'middle' }) +
    text(-11, -3, '扃', { family: CJK, size: 19, fill: PAPER, anchor: 'middle' }) +
    text(-11, 19, '印', { family: CJK, size: 19, fill: PAPER, anchor: 'middle' });
  const pencil = line('M-1 -10 C-2 -22 -20 -24 -22 -12 C-24 -2 -6 2 -1.5 -6 C0 -9 -0.5 -13 -3 -16', { w: 1.3, op: 0.75 });
  return (
    solid(c, sq, { T: IT, fill: VERM, shade: false, sw: 0, inner: inT(IT, glyphs), over: inT(IT, pencil) }) +
    solid(c, rubber, { fill: VERM, light: [0, -3], shadeOpacity: 0.45, hatch: false, sw: 1.8, detail: `<rect width="240" height="240" fill="${INK}" opacity=".25"/>` }) +
    solid(c, side, { fill: BROWN, shade: false, detail: `<rect width="240" height="240" fill="url(#h-${c.uid})"/>` }) +
    solid(c, front, { fill: TAN, shade: false, inner: grain }) +
    solid(c, top, { fill: TAN, shade: false, detail: `<rect width="240" height="240" fill="${PAPER}" opacity=".35"/>` }) +
    solid(c, neck, { fill: BROWN, light: [-4, -2], shadeOpacity: 0.3, hatch: false, hl: 'M77.5 70 Q78 82 74 92 L72 92 Q76 82 76 70Z' }) +
    solid(c, knob, { fill: BROWN, light: [-5, -5], shadeOpacity: 0.3, hl: smooth([[71, 51], [78, 45], [86, 44], [80, 48], [73, 55]]) })
  );
};

// 030 ONE FALLEN LEAF
ART['artifact-030'] = (c) => {
  ground(c, 126, 186, 66, 8);
  const keys = [[-90, 80, 1], [-63, 30, 0], [-36, 72, 1], [-12, 32, 0], [14, 54, 1], [90, 16, 0], [166, 54, 1], [192, 32, 0], [216, 72, 1], [243, 30, 0]];
  const cx = 120, cy = 116;
  const P = [];
  for (let i = 0; i < keys.length; i++) {
    const [a0, r0, tip0] = keys[i], [a1raw, r1] = keys[(i + 1) % keys.length];
    const a1 = a1raw < a0 ? a1raw + 360 : a1raw;
    P.push([cx + Math.cos(rad(a0)) * r0, cy + Math.sin(rad(a0)) * r0]);
    const steps = tip0 ? 3 : 3;
    for (let s = 1; s <= steps; s++) {
      const t = s / (steps + 1), a = a0 + (a1 - a0) * t;
      const r = r0 + (r1 - r0) * t;
      const out = s % 2 ? 1.1 : 0.96;
      P.push([cx + Math.cos(rad(a)) * r * out, cy + Math.sin(rad(a)) * r * out]);
    }
  }
  const T = 'rotate(10 120 116)';
  const leaf = poly(P, 1.6) + ' M92 128 C89 126 88 122 91.5 120.5 C95 119.5 97 123.5 96 126 C95 128 94 129 92 128 Z';
  const veins =
    [-90, -36, 14, 166, 216].map((a) => {
      const r = a === -90 ? 74 : a === 14 || a === 166 ? 48 : 66;
      return line(`M${cx} ${cy + 12}Q${f(cx + Math.cos(rad(a)) * r * 0.4)} ${f(cy + Math.sin(rad(a)) * r * 0.4 + 2)} ${f(cx + Math.cos(rad(a)) * r)} ${f(cy + Math.sin(rad(a)) * r)}`, { w: 1, stroke: BROWN });
    }).join('');
  const blotch =
    `<path d="${smooth(blob(150, 92, 30, 22, [1, 0.9, 1.1, 0.95, 1.05, 0.9, 1], 20))}" fill="${RUST}"/>` +
    `<path d="${smooth(blob(76, 128, 22, 16, [1, 1.1, 0.9, 1.05, 0.95, 1], -10))}" fill="${RUST}"/>` +
    `<path d="${smooth(blob(118, 54, 12, 16, [1, 0.9, 1.1, 1, 0.92], 0))}" fill="${RUST}" opacity=".8"/>`;
  const curl = fillPath('M178 72 C172 74 166 70 165 62 C171 62 176 66 178 72 Z', TAN, { stroke: INK, w: 1.3, T }) +
    line('M168 64 Q172 67 175 70', { w: 0.7, stroke: BROWN, T });
  const stem = 'M120 128 C121 146 120 162 126 178';
  return (
    solid(c, `${stem}`, { mis: false, shade: false, sw: 0, fill: 'none', T, over: inT(T, `<path d="${stem}" fill="none" stroke="${INK}" stroke-width="5.4" stroke-linecap="round"/><path d="${stem}" fill="none" stroke="${BROWN}" stroke-width="2.8" stroke-linecap="round"/>`) }) +
    solid(c, leaf, { T, rule: 'evenodd', fill: OCHRE, light: [-7, -6], detail: inT(T, blotch), inner: inT(T, veins), over: curl })
  );
};

// 031 ONE GRAIN OF RICE
ART['artifact-031'] = (c) => {
  ground(c, 126, 178, 86, 8);
  const T = 'rotate(-3 106 102)';
  const card = poly([[40, 58], [172, 58], [172, 146], [40, 146]], 2, 0.8, c.rand);
  const cardInner =
    `<rect x="47" y="65" width="118" height="74" fill="none" stroke="${INK}" stroke-width=".7" opacity=".6"/>` +
    line('M54 130 H86 M54 134.5 H76', { w: 0.8, op: 0.35 }) +
    `<ellipse cx="108" cy="103" rx="10" ry="2.6" fill="url(#e-${c.uid})" opacity=".4"/>`;
  const gT = 'translate(-10 -2) rotate(-22 116 98)';
  const grain = 'M105 98 C105 94 110 92.6 116 92.6 C123 92.6 128 94.4 128 98 C128 101.6 123 103.4 116 103.4 C110.5 103.4 105 102 105 98.6 Q106.8 98.3 105 98Z';
  // tweezers: two sprung steel arms meeting at the back
  const B = [210, 182];
  const armPts = (tip, side) => {
    const dx = tip[0] - B[0], dy = tip[1] - B[1], L = Math.hypot(dx, dy);
    const n = [-dy / L, dx / L];
    const S = [B[0] + n[0] * side * 3.6, B[1] + n[1] * side * 3.6];
    const M = [(S[0] + tip[0]) / 2 + n[0] * side * 3.5, (S[1] + tip[1]) / 2 + n[1] * side * 3.5];
    const w0 = 3.6, wm = 3, w1 = 1.3;
    return [
      [S[0] + n[0] * w0, S[1] + n[1] * w0], [M[0] + n[0] * wm, M[1] + n[1] * wm], [tip[0] + n[0] * w1, tip[1] + n[1] * w1],
      [tip[0] - n[0] * w1, tip[1] - n[1] * w1], [M[0] - n[0] * wm, M[1] - n[1] * wm], [S[0] - n[0] * w0, S[1] - n[1] * w0],
    ];
  };
  const armA = armPts([128, 126], 1), armB = armPts([133, 131.5], -1);
  const arm = (pts) => poly(pts, [2, 30, 1, 1, 30, 2]);
  const glint = (pts) => line(`M${pt([(pts[0][0] * 2 + pts[2][0]) / 3, (pts[0][1] * 2 + pts[2][1]) / 3 - 0.6])} L${pt([(pts[0][0] + pts[2][0] * 3) / 4, (pts[0][1] + pts[2][1] * 3) / 4 - 0.6])}`, { w: 1, stroke: PAPER, op: 0.85 });
  return (
    solid(c, card, { T, fill: PAPER, shade: GREY, light: [-5, -4], detail: inT(T, cardInner) }) +
    solid(c, grain, { T: gT, fill: CREAM, shade: GREY, light: [-2, -2], hatch: false, sw: 1.6, mis: false,
      over: line('M110 96.6 Q116 95.2 122 95.8', { w: 0.9, stroke: PAPER, T: gT }) + line('M106 97.4 Q107.4 98.4 106.2 99.6', { w: 0.8, op: 0.6, T: gT }) }) +
    solid(c, arm(armB), { fill: GREY, shade: STEEL, light: [-2, -2.5], hatch: false, sw: 1.8 }) +
    solid(c, arm(armA), { fill: GREY, shade: STEEL, light: [-2, -2.5], hatch: false, sw: 1.8, over: glint(armA) }) +
    solid(c, poly([[203, 176], [212, 176], [217, 184], [208, 188]], 2), { fill: STEEL, shade: false, sw: 1.6 })
  );
};

// 032 A JAR OF SILENCE
ART['artifact-032'] = (c) => {
  ground(c, 128, 184, 62, 8);
  const can = 'M72 60 A48 14 0 0 1 168 60 L168 166 A48 14 0 0 1 72 166 Z';
  const label = 'M72 88 A48 14 0 0 0 168 88 L168 146 A48 14 0 0 1 72 146 Z';
  const rims =
    line('M72 70 A48 14 0 0 0 168 70', { w: 1.1, op: 0.7 }) +
    line('M72 158 A48 14 0 0 0 168 158', { w: 1.1, op: 0.7 }) +
    `<path d="M80 94 L86 95 L86 154 L80 152Z" fill="${PAPER}" opacity=".8"/>`;
  let grid = '';
  for (let x = 88; x <= 152; x += 8) grid += line(`M${x} ${x === 120 ? 108 : 112} V${x === 120 ? 126 : 122}`, { w: 0.6, op: 0.35 });
  const labelArt =
    `<path d="M72 88 A48 14 0 0 0 168 88 L168 96 A48 14 0 0 1 72 96 Z" fill="${GREEN}"/>` +
    `<path d="M72 138 A48 14 0 0 0 168 138 L168 146 A48 14 0 0 1 72 146 Z" fill="${GREEN}"/>` +
    grid + line('M84 117.5 H156', { w: 1.8 }) + `<circle cx="84" cy="117.5" r="2" fill="${INK}"/>` + `<circle cx="156" cy="117.5" r="2" fill="${PAPER}" stroke="${INK}" stroke-width="1.2"/>`;
  const lid =
    `<ellipse cx="120" cy="60" rx="48" ry="14" fill="${GREY}" stroke="${INK}" stroke-width="1.6"/>` +
    `<ellipse cx="120" cy="60" rx="48" ry="14" fill="${PAPER}" opacity=".3"/>` +
    `<ellipse cx="120" cy="60.5" rx="42" ry="11.5" fill="none" stroke="${INK}" stroke-width=".9" opacity=".7"/>` +
    `<ellipse cx="120" cy="61" rx="34" ry="8.6" fill="none" stroke="${INK}" stroke-width=".7" opacity=".45"/>` +
    `<ellipse cx="128" cy="62" rx="9.5" ry="4" fill="${GREY}" stroke="${INK}" stroke-width="1.2"/><ellipse cx="128" cy="62" rx="5.5" ry="2" fill="${STEEL}"/>` +
    `<ellipse cx="120" cy="59" rx="2.4" ry="1.4" fill="${STEEL}" stroke="${INK}" stroke-width=".8"/>` +
    line('M84 54 Q100 49 118 48.5', { w: 1.2, stroke: PAPER });
  return (
    solid(c, can, { fill: GREY, shade: STEEL, light: [-9, -3], inner: rims }) +
    solid(c, label, { fill: PAPER, shade: GREY, light: [-9, -3], sw: 1.4, detail: labelArt }) +
    lid
  );
};

// ---------------------------------------------------------------- export

export const ART_IDS = Object.keys(ART);

const cleanUid = (uid) => String(uid).replace(/[^A-Za-z0-9_-]/g, '') || 'a';

export function artifactSVG(id, { uid = 'a' } = {}) {
  const u = cleanUid(uid);
  const draw = ART[id];
  if (!draw) {
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 240"><rect x="60" y="60" width="120" height="120" rx="3" fill="none" stroke="${INK}" stroke-width="2.2" stroke-dasharray="7 6" stroke-linecap="round"/></svg>`;
  }
  const c = { uid: u, defs: [], back: [], ground: '', n: 0, rand: rng(hash(id)) };
  c.id = (p) => `${p}${++c.n}-${u}`;
  const front = draw(c);
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 240">` +
    `<defs>${baseDefs(u)}${c.defs.join('')}</defs>` +
    c.ground +
    `<g>${c.back.join('')}</g>` +
    front +
    `</svg>`
  );
}
