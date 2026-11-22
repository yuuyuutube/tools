// Walking into a cut-paper rainforest: leaves crowd in from every edge; on play they sway, then part in
// staggered layers while the view pushes forward, revealing the work table underneath.
import { icon } from "./icons.js";
import { store } from "./store.js";
import { $, TAU, reduceMotion, rng } from "./util.js";

const NS = "http://www.w3.org/2000/svg";
const LEAVES = ["p:monstera", "p:banana", "p:palm", "p:fern", "p:round", "p:slim", "p:sprout", "p:monstera", "p:palm"];
const BLOOMS = ["p:bloom", "p:daisy", "p:flower", "p:sun", "p:dot", "p:sparkle"];
const LAYERS = [
  { n: 15, size: [0.78, 1.05], colors: ["#1F5A3A", "#2A6B48", "#2A9D9A", "#1E4F3A"] },
  { n: 13, size: [0.62, 0.9], colors: ["#5FA83F", "#2A9D9A", "#1F5A3A", "#78A63A", "#3F8F5A"] },
  { n: 11, size: [0.5, 0.75], colors: ["#5FA83F", "#2A9D9A", "#1F5A3A", "#5FA83F", "#EC6A4C", "#F1C232", "#2552A3", "#2A9D9A"] },
];

export const ringsToD = (rings) => rings.map((r) => "M" + r.map((p) => p[0].toFixed(1) + " " + p[1].toFixed(1)).join("L") + "Z").join("");

let items = [];

function build() {
  const svg = $("#forest"),
    vw = innerWidth,
    vh = innerHeight,
    m = Math.min(vw, vh),
    cx = vw / 2,
    cy = vh / 2;
  svg.setAttribute("viewBox", `0 0 ${vw} ${vh}`);
  svg.replaceChildren();
  items = [];
  const bg = document.createElementNS(NS, "rect");
  bg.setAttribute("width", vw);
  bg.setAttribute("height", vh);
  bg.setAttribute("fill", "#F4EEE1");
  bg.id = "forestBg";
  svg.append(bg);
  const R = rng(20251122),
    perim = 2 * (vw + vh),
    clear = m * 0.2;
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
  LAYERS.forEach((L, li) => {
    const layer = document.createElementNS(NS, "g");
    svg.append(layer);
    const off = R();
    for (let i = 0; i < L.n; i++) {
      const [ex, ey] = edgePoint(off + (i + R() * 0.6) / L.n);
      const toC = Math.atan2(cy - ey, cx - ex),
        ang = toC + (R() - 0.5) * 1.1;
      const D = Math.hypot(cx - ex, cy - ey);
      const id = LEAVES[Math.floor(R() * LEAVES.length)],
        a = store.presets[id];
      if (!a) continue;
      // Length in px of the leaf; keep the centre clear for the play button.
      let len = m * (L.size[0] + R() * (L.size[1] - L.size[0])) * (vw < vh ? 1.15 : 1);
      len = Math.min(len, Math.max(m * 0.25, D - clear));
      const s = len / a.h;
      const bx = ex - Math.cos(ang) * len * 0.06,
        by = ey - Math.sin(ang) * len * 0.06;
      items.push(addLeaf(layer, a, bx, by, ang, s, L.colors[Math.floor(R() * L.colors.length)], li, R));
    }
    // a few blossoms and dots tucked between the leaves
    const extra = li === 0 ? 3 : li === 1 ? 4 : 5;
    for (let i = 0; i < extra; i++) {
      const [ex, ey] = edgePoint(R());
      const t = 0.08 + R() * 0.16,
        x = ex + (cx - ex) * t,
        y = ey + (cy - ey) * t;
      const a = store.presets[BLOOMS[Math.floor(R() * BLOOMS.length)]];
      if (!a) continue;
      const s = (m * (0.07 + R() * 0.1)) / 100;
      const col = ["#F1C232", "#EC6A4C", "#EE9DB3", "#2552A3", "#F5ECD9"][Math.floor(R() * 5)];
      items.push(addLeaf(layer, a, x, y, R() * TAU, s, col, li, R, true));
    }
  });
}

function addLeaf(layer, a, bx, by, ang, s, color, depth, R, centred = false) {
  const mover = document.createElementNS(NS, "g"),
    place = document.createElementNS(NS, "g"),
    sway = document.createElementNS(NS, "g"),
    path = document.createElementNS(NS, "path");
  mover.style.transformOrigin = `${bx}px ${by}px`;
  place.setAttribute("transform", `translate(${bx.toFixed(1)} ${by.toFixed(1)}) rotate(${(((ang * 180) / Math.PI) + 90).toFixed(1)})`);
  sway.setAttribute("class", "sway");
  sway.style.setProperty("--d", (4.5 + R() * 4).toFixed(2) + "s");
  sway.style.setProperty("--dl", (-R() * 6).toFixed(2) + "s");
  sway.style.setProperty("--a", (0.8 + R() * 1.8).toFixed(2) + "deg");
  path.setAttribute("d", ringsToD(a.rings));
  path.setAttribute("fill", color);
  path.setAttribute("transform", centred ? `scale(${s.toFixed(3)})` : `translate(0 ${(-a.h / 2) * s}) scale(${s.toFixed(3)})`);
  sway.append(path);
  place.append(sway);
  mover.append(place);
  layer.append(mover);
  return { el: mover, bx, by, depth, side: Math.sign(bx - innerWidth / 2) || 1, R: R() };
}

export function playIntro() {
  return new Promise((resolve) => {
    const intro = $("#intro"),
      play = $("#playBtn");
    play.innerHTML = icon("play");
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
    requestAnimationFrame(() => play.focus({ preventScroll: true }));
  });
}
