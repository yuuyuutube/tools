// Walking into a cut-paper rainforest: leaves crowd in from every edge; on play they sway, then part in
// staggered layers while the view pushes forward, revealing the work table underneath.
import { icon } from "./icons.js";
import { glyphShape } from "./shapes.js";
import { store } from "./store.js";
import PIECES from "./intro-pieces.js";
import savedLayout from "./intro-layout.js";
import { $, TAU, hashStr, reduceMotion, rng } from "./util.js";

const NS = "http://www.w3.org/2000/svg";
// Mostly palm and fern fronds. Broad leaves (monstera, banana) only grow in the back layer, where they add
// weight without covering anything. Layers go from deep to light green so the forest reads as depth;
// colour accents are kept to a few small blossoms in front.
const BLOOMS = ["p:bloom", "p:daisy", "p:flower"];
// Colours the intro editor offers: the leaf greens, the deep paper tones and the blossom accents.
export const INTRO_PALETTE = ["#1E4D35", "#235A3D", "#2E7048", "#367C4C", "#5FA83F", "#2A9D9A", "#E8DECB", "#E4D9C4", "#EBE2D1", "#F1C232", "#EC6A4C", "#2552A3"];
const BROAD = new Set(["p:monstera", "p:banana"]);
const PAPER_TONES = ["#E8DECB", "#E4D9C4", "#EBE2D1"];
const LAYERS = [
  { n: 12, size: [0.85, 1.3], colors: ["#1E4D35", "#235A3D"], blooms: 0, leaves: ["p:monstera", "p:palm", "p:fern", "p:banana", "p:palm", "p:monstera", "p:fern"] },
  { n: 9, size: [0.65, 1.05], colors: ["#2E7048", "#367C4C"], blooms: 0, leaves: ["p:palm", "p:fern", "p:palm", "p:fern", "p:banana"] },
  { n: 7, size: [0.5, 0.9], colors: ["#5FA83F", "#5FA83F", "#2A9D9A"], blooms: 3, leaves: ["p:palm", "p:fern"] },
];
const TITLE = ["PLAY WITH", "MATISSE"];
// Papers that read on both the cream ground and the green leaves: no creams (they vanish where the ground
// shows) and no deep greens (they sink into the leaves); the one teal comes from the Tropical Jungle set.
const LETTER_COLORS = ["#EC6A4C", "#2552A3", "#F1C232", "#2A9D9A", "#D5312B", "#F08A3C"];

export const ringsToD = (rings) => rings.map((r) => "M" + r.map((p) => p[0].toFixed(1) + " " + p[1].toFixed(1)).join("L") + "Z").join("");

let items = [],
  letters = [];

function build() {
  const out = buildForest($("#forest"), innerWidth, innerHeight, $("#playBtn"));
  items = out.pieces;
  letters = out.letters;
}

// Cut-paper title, centred above the play button. It sits between the middle and front leaves, so the forest
// tucks under and over it. Returns the title group plus the zones the leaf tips stop short of.
function buildTitle(svg, vw, vh, play) {
  const R = rng(7031);
  const lines = TITLE.map((t, li) => [...t].map((ch, i) => (ch === " " ? { space: true, adv: 34 } : { ch, ...glyphShape(ch, 100 + li * 40 + i) })));
  const track = 4,
    width = (line) => line.reduce((w, g) => w + g.adv + track, -track);
  const titleW = Math.min(vw * 0.82, vh * 0.85, 760),
    sB = titleW / width(lines[1]),
    sA = sB * 0.5,
    capB = 72 * sB,
    capA = 72 * sA,
    gap = capB * 0.24,
    hasBtn = !play.hidden, // the OG render hides the button and centres the title alone
    btn = hasBtn ? 112 : 0,
    btnGap = hasBtn ? Math.max(26, capB * 0.32) : 0;
  const total = capA + gap + capB + btnGap + btn,
    top = Math.max(vh * 0.06, (vh - total) / 2);
  const defs = document.createElementNS(NS, "defs");
  defs.innerHTML = '<filter id="paperLift" x="-20%" y="-20%" width="140%" height="160%"><feDropShadow dx="0" dy="2.5" stdDeviation="3" flood-color="#1C2A1E" flood-opacity=".38"/></filter>';
  svg.append(defs);
  const group = document.createElementNS(NS, "g");
  group.setAttribute("filter", "url(#paperLift)");
  const letters = [];
  let ci = 0;
  [
    [lines[0], sA, top + capA],
    [lines[1], sB, top + capA + gap + capB],
  ].forEach(([line, s, baseline]) => {
    let x = vw / 2 - (width(line) * s) / 2;
    for (const g of line) {
      if (!g.space) {
        const k = s * (0.94 + R() * 0.12),
          lx = x + (g.adv * s) / 2,
          ly = baseline - 36 * s + (R() - 0.5) * 7 * s,
          rot = (R() - 0.5) * 11;
        const mover = document.createElementNS(NS, "g"),
          place = document.createElementNS(NS, "g"),
          path = document.createElementNS(NS, "path");
        mover.style.transformBox = "fill-box";
        mover.style.transformOrigin = "center";
        place.setAttribute("transform", `translate(${lx.toFixed(1)} ${ly.toFixed(1)}) rotate(${rot.toFixed(1)}) scale(${k.toFixed(4)})`);
        path.setAttribute("d", ringsToD(g.rings));
        path.setAttribute("transform", `translate(${(-g.adv / 2).toFixed(1)} 36)`);
        path.setAttribute("fill", LETTER_COLORS[ci++ % LETTER_COLORS.length]);
        place.append(path);
        mover.append(place);
        group.append(mover);
        letters.push({ el: mover, R: R() });
      }
      x += (g.adv + track) * s;
    }
  });
  const btnY = top + capA + gap + capB + btnGap + btn / 2,
    m = Math.min(vw, vh);
  play.style.top = btnY + "px";
  return {
    group,
    letters,
    // back and middle leaves only keep off the play button and may run under the title;
    // front leaves stay around the title, just touching its edges
    button: hasBtn
      ? { cx: vw / 2, cy: btnY, ax: btn / 2 + m * 0.06, ay: btn / 2 + m * 0.06 }
      : { cx: vw / 2, cy: top + (capA + gap + capB) / 2, ax: titleW * 0.28, ay: (capA + gap + capB) * 0.55 },
    core: { cx: vw / 2, cy: top + (capA + gap + capB) / 2, ax: titleW * 0.47, ay: (capA + gap + capB) * 0.62 },
  };
}

// Distance along a ray from (x, y) before it enters the ellipse e (Infinity if it never does).
function roomTo(e, x, y, ang) {
  const u = (x - e.cx) / e.ax,
    v = (y - e.cy) / e.ay,
    du = Math.cos(ang) / e.ax,
    dv = Math.sin(ang) / e.ay;
  const a = du * du + dv * dv,
    b = 2 * (u * du + v * dv),
    c = u * u + v * v - 1,
    disc = b * b - 4 * a * c;
  if (disc < 0) return Infinity;
  const t = (-b - Math.sqrt(disc)) / (2 * a);
  return t > 0 ? t : Infinity;
}

// Each piece draws from its own recorded list (then its own seeded stream if it ever needs more), so changing
// the screen size never changes which leaf a key is.
function pieceRand(key) {
  const rec = PIECES[key] || [],
    more = rng(hashStr(key) ^ 0x51ed);
  let i = 0;
  return () => (i < rec.length ? rec[i++] : more());
}

// Builds the whole forest into `svg` for a vw × vh screen. Every piece has a stable key (leaves "L<layer>-<i>",
// blossoms "B<i>") so hand-tuned colours and stacking from intro-layout.js (made in scripts/intro-editor.html)
// land on the same piece every time. Returns the pieces, the title letters and the stacking order.
export function buildForest(svg, vw, vh, play, layout = savedLayout) {
  const m = Math.min(vw, vh),
    cx = vw / 2,
    cy = vh / 2;
  svg.setAttribute("viewBox", `0 0 ${vw} ${vh}`);
  svg.replaceChildren();
  const pieces = [];
  const bg = document.createElementNS(NS, "rect");
  bg.setAttribute("width", vw);
  bg.setAttribute("height", vh);
  bg.setAttribute("fill", "#F4EEE1");
  bg.id = "forestBg";
  svg.append(bg);
  const perim = 2 * (vw + vh);
  const layersEl = document.createElementNS(NS, "g");
  svg.append(layersEl);
  const title = buildTitle(svg, vw, vh, play);
  const edgePoint = (u) => {
    u = ((u % 1) + 1) % 1;
    let d = u * perim;
    if (d < vw) return [d, 0, 0];
    d -= vw;
    if (d < vh) return [vw, d, 1];
    d -= vh;
    if (d < vw) return [vw - d, vh, 2];
    d -= vw;
    return [0, vh - d, 3];
  };
  const rightPalms = [],
    order = []; // default stacking, back to front
  LAYERS.forEach((L, li) => {
    if (li === 2) order.push("title");
    const off = pieceRand("off" + li)();
    for (let i = 0; i < L.n; i++) {
      const R = pieceRand(`L${li}-${i}`);
      const [ex, ey, side] = edgePoint(off + (i + R() * 0.3) / L.n);
      const toC = Math.atan2(cy - ey, cx - ex),
        ang = toC + (R() - 0.5) * 0.4;
      const id = L.leaves[Math.floor(R() * L.leaves.length)],
        a = store.presets[id];
      if (!a) continue;
      // Length in px of the leaf; keep the title and play button clear.
      let len = m * (L.size[0] + R() * (L.size[1] - L.size[0])) * (vw < vh ? 1.15 : 1);
      // Leaves that would reach the middle are cut back by a random amount, so neighbours never end up the same length.
      const room = Math.min(roomTo(title.button, ex, ey, ang), li === 2 ? roomTo(title.core, ex, ey, ang) : Infinity);
      len = Math.min(len, Math.max(m * 0.24, room * (0.72 + R() * 0.28)));
      // Every leaf roots well off-screen, pushed straight out past its edge (and grows a little to make up for
      // it), so no stems show and the rows don't look planted along the edge.
      len *= 1.12;
      const s = len / a.h,
        out = len * 0.16,
        [nx, ny] = [[0, -1], [1, 0], [0, 1], [-1, 0]][side];
      const bx = ex - Math.cos(ang) * len * 0.06 + nx * out,
        by = ey - Math.sin(ang) * len * 0.06 + ny * out;
      const green = L.colors[Math.floor(R() * L.colors.length)];
      let color = green;
      // Broad leaves, back-row leaves that reach into the title and middle-row leaves that run deep into it, are
      // cut from paper just darker than the ground: they keep the forest full without fighting the letters.
      const reaches = li < 2 && roomTo(title.core, bx, by, ang) < len * (li === 0 ? 0.95 : 0.72);
      const paper = PAPER_TONES[Math.floor(R() * PAPER_TONES.length)]; // always drawn, so later values never shift
      if (BROAD.has(id) || reaches) color = paper;
      const item = addLeaf(`L${li}-${i}`, a, bx, by, ang, s, color, li, R, cx);
      pieces.push(item);
      order.push(item.key);
      if (reaches && !BROAD.has(id) && id === "p:palm" && bx > cx) rightPalms.push({ item, green, depth: len - roomTo(title.core, bx, by, ang) });
    }
    // a few blossoms tucked between the front leaves, spread around the edge
    for (let i = 0; i < L.blooms; i++) {
      const R = pieceRand(`B${i}`);
      const [ex, ey] = edgePoint(off + (i + 0.5 + (R() - 0.5) * 0.3) / L.blooms);
      const t = 0.06 + R() * 0.1,
        x = ex + (cx - ex) * t,
        y = ey + (cy - ey) * t;
      const a = store.presets[BLOOMS[Math.floor(R() * BLOOMS.length)]];
      const z = title.core;
      if (!a || ((x - z.cx) / (z.ax * 1.4)) ** 2 + ((y - z.cy) / (z.ay * 1.6)) ** 2 < 1) continue;
      const s = (m * (0.07 + R() * 0.1)) / 100;
      const col = ["#F1C232", "#EC6A4C", "#2552A3"][i % 3];
      const item = addLeaf(`B${i}`, a, x, y, R() * TAU, s, col, li, R, cx, true);
      pieces.push(item);
      order.push(item.key);
    }
  });
  // Keep a green palm or two on the right, so that side doesn't fade out entirely. The ones that only just
  // reach the letters go back to green; palms running deep behind the title stay paper.
  rightPalms
    .sort((p, q) => p.depth - q.depth)
    .slice(0, 2)
    .forEach((p) => (p.item.color = p.green));

  // Hand-tuned colours, then stacking: every piece (and the title) gets a rank; saved ranks win.
  for (const p of pieces) {
    p.color = layout.colors?.[p.key] || p.color;
    p.path.setAttribute("fill", p.color);
  }
  const nodes = { title: title.group };
  for (const p of pieces) nodes[p.key] = p.el;
  const rank = (k, i) => layout.z?.[k] ?? i * 10;
  const stack = order.map((k, i) => ({ k, z: rank(k, i), i })).sort((a, b) => a.z - b.z || a.i - b.i).map((e) => e.k);
  for (const k of stack) layersEl.append(nodes[k]);
  return { pieces, letters: title.letters, stack, title: title.group };
}

function addLeaf(key, a, bx, by, ang, s, color, depth, R, cx, centred = false) {
  const mover = document.createElementNS(NS, "g"),
    place = document.createElementNS(NS, "g"),
    sway = document.createElementNS(NS, "g"),
    path = document.createElementNS(NS, "path");
  mover.style.transformOrigin = `${bx}px ${by}px`;
  mover.dataset.key = key;
  place.setAttribute("transform", `translate(${bx.toFixed(1)} ${by.toFixed(1)}) rotate(${(((ang * 180) / Math.PI) + 90).toFixed(1)})`);
  sway.setAttribute("class", "sway");
  sway.style.setProperty("--d", (4.5 + R() * 4).toFixed(2) + "s");
  sway.style.setProperty("--dl", (-R() * 6).toFixed(2) + "s");
  sway.style.setProperty("--a", (0.8 + R() * 1.8).toFixed(2) + "deg");
  path.setAttribute("d", ringsToD(a.rings));
  path.setAttribute("fill", color);
  // Each leaf gets its own width and is mirrored at random, so repeats of one shape don't look stamped.
  const sx = centred ? s : s * (0.78 + R() * 0.44) * (R() < 0.5 ? -1 : 1);
  path.setAttribute("transform", centred ? `scale(${s.toFixed(3)})` : `translate(0 ${(-a.h / 2) * s}) scale(${sx.toFixed(3)} ${s.toFixed(3)})`);
  sway.append(path);
  place.append(sway);
  mover.append(place);
  return { key, el: mover, path, color, bx, by, depth, side: Math.sign(bx - cx) || 1, R: R() };
}

// The play button as cut paper: an uneven cream disc with a coral triangle on top. Its keyboard focus ring
// is a third, darker cut disc behind it instead of a drawn outline.
export function cutPlayButton() {
  const R = rng(4242),
    cutDisc = (n, r0, r1) => {
      const out = [];
      for (let i = 0; i < n; i++) {
        const a = ((i + (R() - 0.5) * 0.5) / n) * TAU,
          r = r0 + R() * (r1 - r0);
        out.push([60 + Math.cos(a) * r, 60 + Math.sin(a) * r]);
      }
      return out;
    };
  const disc = cutDisc(14, 52, 57),
    ring = cutDisc(15, 61, 65);
  const tri = [
    [45 + R() * 3, 35 + R() * 3],
    [44 + R() * 3, 85 - R() * 3],
    [87 - R() * 3, 59 + R() * 3],
  ];
  const pts = (list) => list.map((p) => p[0].toFixed(1) + "," + p[1].toFixed(1)).join(" ");
  return `<svg viewBox="-7 -7 134 134" aria-hidden="true"><polygon points="${pts(ring)}" fill="#24221F" class="ring"/><polygon points="${pts(disc)}" fill="#FBF7EE"/><polygon points="${pts(tri)}" fill="#EC6A4C" class="tri"/></svg>`;
}

export function playIntro() {
  return new Promise((resolve) => {
    const intro = $("#intro"),
      play = $("#playBtn");
    play.innerHTML = cutPlayButton();
    $("#introAbout").innerHTML = icon("info");
    intro.hidden = false;
    build();
    let started = false,
      done = false,
      anims = [];
    const onResize = () => !started && build();
    addEventListener("resize", onResize);
    const finish = () => {
      if (done) return;
      done = true;
      anims.forEach((a) => a.cancel());
      intro.hidden = true;
      intro.classList.remove("go");
      removeEventListener("resize", onResize);
      removeEventListener("keydown", key);
      resolve();
    };
    const start = () => {
      if (started) return finish(); // second tap skips
      started = true;
      intro.classList.add("go");
      if (reduceMotion()) {
        anims.push(intro.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 350, fill: "forwards" }));
        anims[0].onfinish = finish;
        return;
      }
      const cx = innerWidth / 2,
        cy = innerHeight / 2,
        far = Math.hypot(cx, cy);
      let last = 0;
      for (const it of items) {
        const dx = it.bx - cx,
          dy = it.by - cy,
          d = Math.hypot(dx, dy) || 1;
        const push = far * (0.9 + it.R * 0.5),
          tx = (dx / d) * push,
          ty = (dy / d) * push;
        const spin = (it.side * (18 + it.R * 30)).toFixed(1);
        const delay = [360, 200, 40][it.depth] + it.R * 220,
          dur = 1150 + it.R * 350;
        last = Math.max(last, delay + dur);
        anims.push(
          it.el.animate(
            [
              { transform: "translate(0,0) rotate(0deg)", offset: 0 },
              { transform: `translate(${(-tx * 0.015).toFixed(1)}px,${(-ty * 0.015).toFixed(1)}px) rotate(${(-spin * 0.12).toFixed(1)}deg)`, offset: 0.2 },
              { transform: `translate(${tx.toFixed(1)}px,${ty.toFixed(1)}px) rotate(${spin}deg)`, offset: 1 },
            ],
            { duration: dur, delay, easing: "cubic-bezier(.55,0,.25,1)", fill: "forwards" },
          ),
        );
      }
      letters.forEach((l, i) => {
        const dy = -(30 + l.R * 50),
          rot = (l.R - 0.5) * 50;
        anims.push(
          l.el.animate([{ transform: "none", opacity: 1 }, { transform: `translate(0px, ${dy.toFixed(0)}px) rotate(${rot.toFixed(0)}deg) scale(1.15)`, opacity: 0 }], {
            duration: 520,
            delay: 40 + i * 28,
            easing: "cubic-bezier(.5,0,.75,0)",
            fill: "forwards",
          }),
        );
      });
      anims.push($("#forest").animate([{ transform: "scale(1)" }, { transform: "scale(1.22)" }], { duration: last, easing: "cubic-bezier(.4,0,.2,1)", fill: "forwards" }));
      anims.push($("#forestBg").animate([{ opacity: 1 }, { opacity: 1, offset: 0.35 }, { opacity: 0 }], { duration: last * 0.75, fill: "forwards" }));
      setTimeout(finish, last + 60);
    };
    const key = (e) => {
      if (e.key === "Escape" && started) finish();
      else if ((e.key === "Enter" || e.key === " ") && !started && document.activeElement?.tagName !== "BUTTON") {
        e.preventDefault();
        start();
      }
    };
    addEventListener("keydown", key);
    intro.onclick = (e) => {
      if (e.target.closest("#introAbout")) return;
      start();
    };
    // Focus for Enter/Space, without drawing the keyboard focus ring on load.
    requestAnimationFrame(() => play.focus({ preventScroll: true, focusVisible: false }));
  });
}
