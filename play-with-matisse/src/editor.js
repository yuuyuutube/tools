// The collage canvas: rendering, picking, move / scale / rotate (mouse, pen, one or two fingers),
// the floating piece toolbar and keyboard shortcuts. Gesture model follows puri-club's adjust tool
// (one corner handle for scale + rotate, two-finger pinch, quarter-turn snapping).
import { geometry, renderArtwork } from "./paper.js";
import { currentColor, emit, getAsset, save, size, snap, store } from "./store.js";
import { closePopover, isNarrow, modalOpen } from "./ui.js";
import { $, canvas, clamp, newSeed, uid } from "./util.js";

const QUARTER = Math.PI / 2,
  SNAP = (5 * Math.PI) / 180,
  PAD = 8;
const normAngle = (r) => r - 2 * Math.PI * Math.round(r / (2 * Math.PI));

let stage, cv, ctx, bar;
const hitCtx = canvas(1, 1).getContext("2d");
let k = 1,
  dpr = 1,
  selId = null,
  gesture = null,
  queued = false,
  wheelOpen = false,
  wheelTimer = 0;
export let swapping = false;
const pointers = new Map();

export const selected = () => (selId && store.art?.pieces.find((p) => p.id === selId)) || null;

export function select(id) {
  if (selId === id) return;
  selId = id;
  if (swapping) setSwapping(false);
  emit("select");
  requestRender();
}

export function setSwapping(v) {
  swapping = v;
  bar?.querySelector('[data-act="swap"]')?.setAttribute("aria-pressed", String(v));
  emit("swap");
}

/* ---------- layout & render ---------- */

export function layout() {
  if (!store.art || !stage) return;
  const S = size(),
    r = stage.getBoundingClientRect(),
    pad = isNarrow() ? 14 : 44;
  const avW = Math.max(40, r.width - pad * 2),
    avH = Math.max(40, r.height - pad * 2);
  const k0 = Math.min(avW / S.w, avH / S.h);
  const cw = Math.max(1, Math.round(S.w * k0)),
    ch = Math.max(1, Math.round(S.h * k0));
  dpr = Math.min(devicePixelRatio || 1, 2.5);
  if (cw * ch * dpr * dpr > 5e6) dpr = Math.sqrt(5e6 / (cw * ch));
  cv.style.width = cw + "px";
  cv.style.height = ch + "px";
  cv.width = Math.round(cw * dpr);
  cv.height = Math.round(ch * dpr);
  k = cw / S.w;
  render();
}

export function requestRender() {
  if (queued) return;
  queued = true;
  requestAnimationFrame(() => {
    queued = false;
    render();
  });
}

export function render() {
  if (!store.art || !ctx) return;
  const S = size();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, cv.width, cv.height);
  renderArtwork(ctx, store.art, new DOMMatrix([dpr * k, 0, 0, dpr * k, 0, 0]), S.w, S.h, getAsset);
  drawSelection();
  placeBar();
}

function frame(p) {
  const a = getAsset(p.a) || { w: 100, h: 100 },
    sc = p.s / 100;
  const hw = ((a.w / 2) * sc * k) + PAD,
    hh = ((a.h / 2) * sc * k) + PAD,
    cx = p.x * k,
    cy = p.y * k,
    c = Math.cos(p.r),
    s = Math.sin(p.r);
  const pt = (x, y) => [cx + x * c - y * s, cy + x * s + y * c];
  return { cx, cy, corners: [pt(-hw, -hh), pt(hw, -hh), pt(hw, hh), pt(-hw, hh)], handle: pt(hw, hh) };
}

function drawSelection() {
  const p = selected();
  if (!p) return;
  const f = frame(p),
    snapped = gesture?.snapped;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.beginPath();
  f.corners.forEach((c, i) => (i ? ctx.lineTo(c[0], c[1]) : ctx.moveTo(c[0], c[1])));
  ctx.closePath();
  ctx.lineWidth = 3;
  ctx.strokeStyle = "rgba(255,255,255,.9)";
  ctx.setLineDash([]);
  ctx.stroke();
  ctx.lineWidth = 1.5;
  ctx.setLineDash([6, 5]);
  ctx.strokeStyle = snapped ? "#FF48B0" : "#24221f";
  ctx.stroke();
  ctx.setLineDash([]);
  const [hx, hy] = f.handle;
  ctx.beginPath();
  ctx.arc(hx, hy, 11, 0, Math.PI * 2);
  ctx.fillStyle = "#fbfaf6";
  ctx.shadowColor = "rgba(40,30,10,.3)";
  ctx.shadowBlur = 6;
  ctx.fill();
  ctx.shadowColor = "transparent";
  ctx.lineWidth = 1.5;
  ctx.strokeStyle = "#24221f";
  ctx.stroke();
  // two little arcs = "turn / stretch"
  ctx.beginPath();
  ctx.arc(hx, hy, 5, -2.6, -0.6);
  ctx.moveTo(hx + 5 * Math.cos(0.5), hy + 5 * Math.sin(0.5));
  ctx.arc(hx, hy, 5, 0.5, 2.5);
  ctx.stroke();
}

/* ---------- picking ---------- */

function pieceMatrix(p) {
  const sc = p.s / 100;
  return new DOMMatrix()
    .translate(p.x, p.y)
    .rotate((p.r * 180) / Math.PI)
    .scale(sc * (p.fx ? -1 : 1), sc * (p.fy ? -1 : 1));
}

function hitAt(x, y) {
  const list = store.art.pieces;
  for (let i = list.length - 1; i >= 0; i--) {
    const p = list[i],
      a = getAsset(p.a);
    if (!a) continue;
    const g = geometry(a, p.e, p.seed);
    hitCtx.setTransform(pieceMatrix(p));
    if (hitCtx.isPointInPath(g.rim || g.body, x, y)) return p;
  }
  return null;
}

// Exact hit first, then a few points around the finger so thin stems are still easy to grab.
function hit(x, y, touch) {
  const exact = hitAt(x, y);
  if (exact) return exact;
  const t = (touch ? 14 : 6) / k;
  for (const [dx, dy] of [[t, 0], [-t, 0], [0, t], [0, -t], [t * 0.7, t * 0.7], [-t * 0.7, -t * 0.7], [t * 0.7, -t * 0.7], [-t * 0.7, t * 0.7]]) {
    const p = hitAt(x + dx, y + dy);
    if (p) return p;
  }
  return null;
}

function toDesign(e) {
  const r = cv.getBoundingClientRect();
  return { x: (e.clientX - r.left) / k, y: (e.clientY - r.top) / k, cx: e.clientX - r.left, cy: e.clientY - r.top };
}

function nearHandle(p, q, touch) {
  const [hx, hy] = frame(p).handle;
  return Math.hypot(q.cx - hx, q.cy - hy) < (touch ? 26 : 18);
}

const clampSize = (s) => {
  const S = size();
  return clamp(s, Math.min(S.w, S.h) * 0.025, Math.max(S.w, S.h) * 3);
};

function touchGesture(g) {
  if (!g.changed) {
    snap();
    g.changed = true;
  }
}

function applyRotation(g, r, free) {
  const near = Math.round(r / QUARTER) * QUARTER,
    snapped = !free && Math.abs(r - near) < SNAP;
  g.o.r = normAngle(snapped ? near : r);
  if (snapped && !g.snapped) navigator.vibrate?.(8);
  g.snapped = snapped;
}

function down(e) {
  if (e.button > 0 || !store.art) return;
  e.preventDefault();
  closePopover();
  try {
    cv.setPointerCapture(e.pointerId);
  } catch {}
  const q = toDesign(e),
    touch = e.pointerType !== "mouse";
  pointers.set(e.pointerId, q);
  const sel = selected();
  if (pointers.size === 2) {
    if (!sel) return;
    const [a, b] = [...pointers.values()];
    gesture = {
      mode: "pinch",
      o: sel,
      start: { x: sel.x, y: sel.y, s: sel.s, r: sel.r },
      mid: { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 },
      dist: Math.hypot(b.x - a.x, b.y - a.y) || 1,
      angle: Math.atan2(b.y - a.y, b.x - a.x),
      changed: gesture?.changed || false,
    };
    requestRender();
    return;
  }
  if (pointers.size > 2) return;
  if (sel && nearHandle(sel, q, touch)) {
    gesture = {
      mode: "handle",
      id: e.pointerId,
      o: sel,
      start: { s: sel.s, r: sel.r },
      d0: Math.hypot(q.x - sel.x, q.y - sel.y) || 1,
      a0: Math.atan2(q.y - sel.y, q.x - sel.x),
      changed: false,
    };
    requestRender();
    return;
  }
  const p = hit(q.x, q.y, touch);
  if (swapping && !p) setSwapping(false);
  select(p ? p.id : null);
  gesture = p ? { mode: "move", id: e.pointerId, o: p, off: { x: q.x - p.x, y: q.y - p.y }, changed: false } : null;
  requestRender();
}

function move(e) {
  if (!store.art) return;
  const q = toDesign(e);
  if (!gesture) {
    if (e.pointerType === "mouse" && !pointers.size) {
      const sel = selected();
      cv.style.cursor = sel && nearHandle(sel, q, false) ? "nwse-resize" : hit(q.x, q.y, false) ? "move" : "";
    }
    return;
  }
  if (!pointers.has(e.pointerId)) return;
  pointers.set(e.pointerId, q);
  const g = gesture,
    o = g.o,
    S = size();
  if (g.mode === "move" && e.pointerId === g.id) {
    touchGesture(g);
    o.x = clamp(q.x - g.off.x, 0, S.w);
    o.y = clamp(q.y - g.off.y, 0, S.h);
  } else if (g.mode === "handle" && e.pointerId === g.id) {
    touchGesture(g);
    o.s = clampSize((g.start.s * Math.hypot(q.x - o.x, q.y - o.y)) / g.d0);
    applyRotation(g, g.start.r + Math.atan2(q.y - o.y, q.x - o.x) - g.a0, e.shiftKey);
  } else if (g.mode === "pinch") {
    const [a, b] = [...pointers.values()];
    if (!b) return;
    touchGesture(g);
    o.x = clamp(g.start.x + (a.x + b.x) / 2 - g.mid.x, 0, S.w);
    o.y = clamp(g.start.y + (a.y + b.y) / 2 - g.mid.y, 0, S.h);
    o.s = clampSize((g.start.s * Math.hypot(b.x - a.x, b.y - a.y)) / g.dist);
    applyRotation(g, g.start.r + Math.atan2(b.y - a.y, b.x - a.x) - g.angle, false);
  } else return;
  requestRender();
}

function up(e) {
  if (!pointers.delete(e.pointerId)) return;
  if (gesture && (gesture.mode === "pinch" || gesture.id === e.pointerId)) {
    if (gesture.changed) {
      save();
      emit("art");
    }
    gesture = null;
    requestRender();
  }
}

function wheel(e) {
  const s = selected();
  if (!s) return;
  e.preventDefault();
  if (!wheelOpen) {
    snap();
    wheelOpen = true;
  }
  clearTimeout(wheelTimer);
  wheelTimer = setTimeout(() => {
    wheelOpen = false;
    save();
    emit("art");
  }, 400);
  if (e.shiftKey || e.altKey) s.r = normAngle(s.r + (e.deltaY || e.deltaX) * 0.004);
  else s.s = clampSize(s.s * Math.exp(-e.deltaY * (e.ctrlKey ? 0.01 : 0.0015)));
  requestRender();
}

/* ---------- piece toolbar ---------- */

function placeBar() {
  const s = selected();
  if (!s || gesture || modalOpen()) {
    bar.hidden = true;
    return;
  }
  bar.hidden = false;
  bar.style.setProperty("--cur", currentColor());
  const next = s.e === "rip" ? "snip" : "rip",
    edgeBtn = bar.querySelector('[data-act="edge"]');
  if (edgeBtn.dataset.next !== next) {
    edgeBtn.dataset.next = next;
    edgeBtn.innerHTML = bar.querySelector(`template[data-edge="${next}"]`).innerHTML;
    edgeBtn.setAttribute("aria-label", next === "rip" ? "Switch to rip" : "Switch to snip");
  }
  const f = frame(s),
    ys = f.corners.map((c) => c[1]);
  const cr = cv.getBoundingClientRect(),
    sr = stage.getBoundingClientRect();
  const ox = cr.left - sr.left,
    oy = cr.top - sr.top,
    bw = bar.offsetWidth,
    bh = bar.offsetHeight;
  let top = oy + Math.min(...ys) - bh - 16;
  if (top < 6) {
    top = oy + Math.max(...ys) + 16;
    if (top + bh > sr.height - 6) top = 6;
  }
  const left = clamp(ox + f.cx - bw / 2, 6, Math.max(6, sr.width - bw - 6));
  bar.style.transform = `translate(${Math.round(left)}px, ${Math.round(top)}px)`;
}

export function act(name) {
  const s = selected();
  if (!s) return;
  const list = store.art.pieces,
    i = list.indexOf(s),
    S = size();
  if (name === "swap") return setSwapping(!swapping);
  snap();
  switch (name) {
    case "copy": {
      const c = { ...s, id: uid("k"), x: clamp(s.x + S.w * 0.04, 0, S.w), y: clamp(s.y + S.h * 0.04, 0, S.h) };
      list.push(c);
      selId = c.id;
      break;
    }
    case "flipH": s.fx = !s.fx; break;
    case "flipV": s.fy = !s.fy; break;
    case "front": if (i < list.length - 1) [list[i], list[i + 1]] = [list[i + 1], list[i]]; break;
    case "back": if (i > 0) [list[i], list[i - 1]] = [list[i - 1], list[i]]; break;
    case "recolor": s.c = currentColor(); break;
    case "edge":
      s.e = s.e === "rip" ? "snip" : "rip";
      s.seed ||= newSeed();
      break;
    case "del":
      list.splice(i, 1);
      selId = null;
      break;
  }
  save();
  emit("art");
  emit("select");
  requestRender();
}

/* ---------- adding / swapping ---------- */

export function addPiece(assetId) {
  if (!store.art || !getAsset(assetId)) return;
  const S = size(),
    short = Math.min(S.w, S.h);
  snap();
  const p = {
    id: uid("k"),
    a: assetId,
    x: Math.round(S.w / 2 + (Math.random() - 0.5) * S.w * 0.2),
    y: Math.round(S.h / 2 + (Math.random() - 0.5) * S.h * 0.2),
    s: Math.round(short * (0.3 + Math.random() * 0.12)),
    r: (Math.random() - 0.5) * 0.6,
    fx: false,
    fy: false,
    c: currentColor(),
    e: store.ui.mode,
    seed: newSeed(),
  };
  store.art.pieces.push(p);
  selId = p.id;
  save();
  emit("art");
  emit("select");
  requestRender();
}

export function swapTo(assetId) {
  const s = selected();
  if (!s || !getAsset(assetId)) return;
  snap();
  s.a = assetId;
  setSwapping(false);
  save();
  emit("art");
  requestRender();
}

export function afterHistory() {
  if (selId && !selected()) selId = null;
  emit("select");
  layout();
}

/* ---------- init ---------- */

export function initEditor() {
  stage = $("#stage");
  cv = $("#art");
  ctx = cv.getContext("2d");
  bar = $("#pieceBar");
  cv.addEventListener("pointerdown", down);
  cv.addEventListener("pointermove", move);
  for (const n of ["pointerup", "pointercancel", "lostpointercapture"]) cv.addEventListener(n, up);
  cv.addEventListener("wheel", wheel, { passive: false });
  // Tapping the empty desk around the canvas deselects.
  stage.addEventListener("pointerdown", (e) => {
    if (e.target === stage) select(null);
  });
  bar.addEventListener("click", (e) => {
    const b = e.target.closest("[data-act]");
    if (b) act(b.dataset.act);
  });
  new ResizeObserver(() => layout()).observe(stage);
  addEventListener("keydown", (e) => {
    if (modalOpen() || !store.art || $("#desk").hidden) return;
    if (["INPUT", "TEXTAREA"].includes(e.target.tagName)) return;
    const s = selected(),
      mod = e.metaKey || e.ctrlKey,
      S = size();
    if (mod && e.key.toLowerCase() === "d" && s) {
      e.preventDefault();
      act("copy");
    } else if ((e.key === "Delete" || e.key === "Backspace") && s) {
      e.preventDefault();
      act("del");
    } else if (e.key === "Escape" && s) {
      select(null);
    } else if (s && e.key.startsWith("Arrow") && !mod) {
      e.preventDefault();
      const step = (e.shiftKey ? 0.05 : 0.01) * Math.min(S.w, S.h);
      const d = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }[e.key];
      snap();
      s.x = clamp(s.x + d[0] * step, 0, S.w);
      s.y = clamp(s.y + d[1] * step, 0, S.h);
      save();
      requestRender();
    } else if (s && (e.key === "[" || e.key === "]")) {
      act(e.key === "]" ? "front" : "back");
    } else if (s && (e.key === "," || e.key === ".")) {
      snap();
      s.r = normAngle(s.r + (e.key === "." ? 1 : -1) * (Math.PI / 12));
      save();
      requestRender();
    }
  });
}
