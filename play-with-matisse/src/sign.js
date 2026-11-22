// Signing on the finished artwork, anywhere on it. Like stamp-tour's signature: a black pen whose line gets
// thinner the faster you write, or a typed name (Latin in the original Kaiti letters, Chinese in Ming/Song). One or the other is kept, never both.
// While signing, the artwork canvas is drawn without the signature and this overlay shows the one being edited.
import { sizeById } from "./data.js";
import { icon } from "./icons.js";
import { SIGN_FONT, SIGN_WEIGHT, drawSignature, signFontReady } from "./paper.js";
import { emit, save, snap, store } from "./store.js";
import { segmented } from "./ui.js";
import { $, clamp, lerp } from "./util.js";

// Pen widths in the same units stamp-tour uses for a 440-unit card, scaled to the artwork's short side.
const CARD = 440,
  PEN_MIN = 0.9,
  PEN_MAX = 2.6;

let st = null, // { mode, strokes, text: { text, x, y, size } }
  hooks = null,
  k = 1,
  dpr = 1;

const art = () => store.art;
const S = () => sizeById(art().size);
const unit = () => Math.min(S().w, S().h) / CARD; // artwork px per card unit

export const isSigning = () => !!st;

function current() {
  if (!st) return null;
  if (st.mode === "pen") return st.strokes.length ? { type: "pen", strokes: st.strokes } : null;
  const t = st.text.text.trim();
  return t ? { type: "text", ...st.text, text: t } : null;
}

// Lay the overlay exactly over the artwork canvas.
export function layoutSign() {
  if (!st) return;
  const cv = $("#finishCanvas"),
    layer = $("#signLayer"),
    w = parseFloat(cv.style.width),
    hgt = parseFloat(cv.style.height);
  dpr = Math.min(devicePixelRatio || 1, 2);
  k = w / S().w;
  for (const el of [layer, $("#signCatch")]) {
    el.style.width = w + "px";
    el.style.height = hgt + "px";
  }
  layer.width = Math.round(w * dpr);
  layer.height = Math.round(hgt * dpr);
  redraw();
}

function textBox() {
  const ctx = $("#signLayer").getContext("2d"),
    t = st.text;
  ctx.font = `${SIGN_WEIGHT} ${t.size}px ${SIGN_FONT}`;
  const w = Math.max(t.size * 1.2, ctx.measureText(t.text || " ").width);
  return { x: t.x - w / 2, y: t.y - t.size * 0.62, w, h: t.size * 1.24 };
}

function redraw() {
  const layer = $("#signLayer"),
    ctx = layer.getContext("2d");
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, layer.width, layer.height);
  const base = new DOMMatrix([dpr * k, 0, 0, dpr * k, 0, 0]);
  drawSignature(ctx, current(), base);
  if (st.mode === "type") {
    // A dashed box shows where the typed name sits and that it can be dragged (editor only, never exported).
    const b = textBox(),
      pad = 8 / k;
    ctx.save();
    ctx.setTransform(base);
    ctx.setLineDash([6 / k, 5 / k]);
    ctx.lineWidth = 1.5 / k;
    ctx.strokeStyle = "rgba(255,255,255,.9)";
    ctx.strokeRect(b.x - pad, b.y - pad, b.w + pad * 2, b.h + pad * 2);
    ctx.lineDashOffset = 5.5 / k;
    ctx.strokeStyle = "#24221F";
    ctx.strokeRect(b.x - pad, b.y - pad, b.w + pad * 2, b.h + pad * 2);
    ctx.restore();
  }
}

function setMode(m) {
  st.mode = m;
  segmented($("#signMode"), m, setMode);
  $("#signField").hidden = m !== "type";
  $("#finish").dataset.sign = m;
  redraw();
  if (m === "type") requestAnimationFrame(() => $("#signText").focus());
  else $("#signText").blur();
}

export function startSign() {
  if (!art()) return;
  const sig = art().signature,
    s = S(),
    short = Math.min(s.w, s.h);
  st = {
    mode: sig?.type === "text" ? "type" : "pen",
    strokes: sig?.type === "pen" ? structuredClone(sig.strokes) : [],
    text: sig?.type === "text" ? { text: sig.text, x: sig.x, y: sig.y, size: sig.size } : { text: "", x: s.w * 0.74, y: s.h * 0.9, size: short * 0.065 },
  };
  $("#signText").value = st.text.text;
  $("#finish").classList.add("signing");
  hooks.redrawArt();
  layoutSign();
  setMode(st.mode);
  signFontReady.then(() => st && redraw());
}

function stop(keep) {
  if (!st) return;
  if (keep) {
    const next = current();
    if (JSON.stringify(next) !== JSON.stringify(art().signature || null)) {
      snap();
      art().signature = next;
      save();
      emit("art");
    }
  }
  st = null;
  $("#signText").blur();
  $("#finish").classList.remove("signing");
  delete $("#finish").dataset.sign;
  hooks.redrawArt();
  hooks.changed();
}
export const finishSign = () => stop(true);
export const cancelSign = () => stop(false);

export function initSign(h) {
  hooks = h;
  $("#signBtn").innerHTML = icon("signature");
  $("#signClear").innerHTML = icon("eraser");
  $("#signDone").innerHTML = icon("check");
  $("#signTextIc").innerHTML = icon("signature");
  for (const b of $("#signMode").querySelectorAll("[data-v]")) b.innerHTML = icon(b.dataset.v === "pen" ? "pencil" : "keyboard");
  $("#signDone").onclick = finishSign;
  $("#signClear").onclick = () => {
    st.strokes = [];
    st.text.text = "";
    $("#signText").value = "";
    redraw();
    if (st.mode === "type") $("#signText").focus();
  };
  $("#signText").addEventListener("input", () => {
    st.text.text = $("#signText").value;
    redraw();
  });
  $("#signText").addEventListener("keydown", (e) => e.key === "Enter" && finishSign());

  const catcher = $("#signCatch"),
    pointers = new Map();
  let cur = null,
    last = null,
    drag = null,
    pinch = null;
  const toArt = (e) => {
    const r = catcher.getBoundingClientRect();
    return [(e.clientX - r.left) / k, (e.clientY - r.top) / k];
  };
  catcher.addEventListener("pointerdown", (e) => {
    if (!st || e.button > 0) return;
    e.preventDefault();
    try {
      catcher.setPointerCapture(e.pointerId);
    } catch {}
    const [x, y] = toArt(e);
    pointers.set(e.pointerId, [x, y]);
    if (st.mode === "pen") {
      if (cur) return; // one pen at a time
      const u = unit(),
        w = PEN_MAX * 0.8 * u;
      cur = { id: e.pointerId, s: [[x, y, w]] };
      st.strokes.push(cur.s);
      last = { x, y, t: performance.now(), w };
    } else if (pointers.size === 2) {
      const [a, b] = [...pointers.values()];
      pinch = { d: Math.hypot(b[0] - a[0], b[1] - a[1]) || 1, size: st.text.size };
      drag = null;
    } else {
      const b = textBox(),
        inside = x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h;
      drag = { id: e.pointerId, dx: inside ? st.text.x - x : 0, dy: inside ? st.text.y - y : 0 };
      if (!inside) {
        st.text.x = x;
        st.text.y = y;
      }
    }
    redraw();
  });
  catcher.addEventListener("pointermove", (e) => {
    if (!st || !pointers.has(e.pointerId)) return;
    const [x, y] = toArt(e);
    pointers.set(e.pointerId, [x, y]);
    const s = S();
    if (st.mode === "pen" && cur?.id === e.pointerId) {
      const u = unit(),
        now = performance.now(),
        d = Math.hypot(x - last.x, y - last.y);
      if (d < 0.35 * u) return;
      // Faster strokes come out thinner, as with a real pen.
      const speed = d / u / Math.max(1, now - last.t),
        w = lerp(last.w, clamp(PEN_MAX - speed * 2.2, PEN_MIN, PEN_MAX) * u, 0.4);
      cur.s.push([x, y, w]);
      last = { x, y, t: now, w };
    } else if (st.mode === "type" && pinch && pointers.size === 2) {
      const [a, b] = [...pointers.values()];
      st.text.size = clamp((pinch.size * Math.hypot(b[0] - a[0], b[1] - a[1])) / pinch.d, Math.min(s.w, s.h) * 0.02, Math.min(s.w, s.h) * 0.3);
    } else if (st.mode === "type" && drag?.id === e.pointerId) {
      st.text.x = clamp(x + drag.dx, 0, s.w);
      st.text.y = clamp(y + drag.dy, 0, s.h);
    } else return;
    redraw();
  });
  const end = (e) => {
    if (!pointers.delete(e.pointerId)) return;
    if (cur?.id === e.pointerId) cur = null;
    if (drag?.id === e.pointerId) drag = null;
    if (pointers.size < 2) pinch = null;
  };
  for (const n of ["pointerup", "pointercancel", "lostpointercapture"]) catcher.addEventListener(n, end);
  catcher.addEventListener(
    "wheel",
    (e) => {
      if (!st || st.mode !== "type") return;
      e.preventDefault();
      const s = S();
      st.text.size = clamp(st.text.size * Math.exp(-e.deltaY * 0.002), Math.min(s.w, s.h) * 0.02, Math.min(s.w, s.h) * 0.3);
      redraw();
    },
    { passive: false },
  );
}
