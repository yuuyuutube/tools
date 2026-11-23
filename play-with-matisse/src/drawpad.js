// Draw a few strokes (or photograph a sketch) → pick a type and a variation → add the new paper piece
// to the tray and the collage.
import { renderPadPapers } from "./desk.js";
import { addPiece } from "./editor.js";
import { icon } from "./icons.js";
import { drawShapeThumb } from "./paper.js";
import { PHOTO_TYPES, cachedMask, loadPhoto, photoShape } from "./photo.js";
import { TYPES, VARIANTS, generate } from "./shapes.js";
import { currentColor, emit, onChange, save, store } from "./store.js";
import { segmented } from "./ui.js";
import { $, h, newSeed, uid } from "./util.js";

const N = 1000; // strokes are stored in a 0…1000 square, independent of the pad's on-screen size
let strokes = [],
  cur = null,
  type = "leaf",
  variant = 0,
  seed = newSeed(),
  results = [],
  gen = 0,
  regenTimer = 0,
  px = 300,
  dpr = 1;
// Photo mode: a traced sketch photo replaces the strokes until it is cleared.
let photo = null,
  photoType = "fill",
  level = 0.25,
  loading = 0;
let cv, ctx;

function sizePad() {
  const narrow = innerWidth < 900;
  const extra = photo ? 46 : 0;
  const room = narrow ? Math.min(innerWidth - 24, innerHeight - 380 - extra) : Math.min(440, innerHeight - 360 - extra);
  px = Math.max(200, Math.floor(room));
  dpr = Math.min(devicePixelRatio || 1, 2.5);
  cv.style.width = cv.style.height = px + "px";
  cv.width = cv.height = Math.round(px * dpr);
  drawStrokes();
}

// The photo, faded, with what will be cut from it laid over in ink.
function drawPhoto() {
  const W = cv.width,
    k = Math.min(W / photo.w, W / photo.h) * 0.94,
    dw = photo.w * k,
    dh = photo.h * k,
    dx = (W - dw) / 2,
    dy = (W - dh) / 2;
  ctx.globalAlpha = 0.3;
  ctx.imageSmoothingEnabled = true;
  ctx.drawImage(photo.view, dx, dy, dw, dh);
  ctx.globalAlpha = 1;
  const res = cachedMask(photo, photoType, level);
  if (!res) return;
  const c = document.createElement("canvas");
  c.width = res.w;
  c.height = res.h;
  const o = c.getContext("2d"),
    img = o.createImageData(res.w, res.h);
  for (let i = 0; i < res.mask.length; i++)
    if (res.mask[i]) {
      img.data[i * 4] = 36;
      img.data[i * 4 + 1] = 34;
      img.data[i * 4 + 2] = 31;
      img.data[i * 4 + 3] = 215;
    }
  o.putImageData(img, 0, 0);
  ctx.drawImage(c, dx, dy, dw, dh);
}

function drawStrokes() {
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, cv.width, cv.height);
  if (photo) return drawPhoto();
  const k = (px * dpr) / N;
  ctx.setTransform(k, 0, 0, k, 0, 0);
  // faint dot grid helps judge size without being decoration
  ctx.fillStyle = "rgba(36,34,31,.09)";
  for (let y = 100; y < N; y += 100) for (let x = 100; x < N; x += 100) ctx.fillRect(x - 3, y - 3, 6, 6);
  ctx.lineCap = ctx.lineJoin = "round";
  ctx.strokeStyle = "#24221F";
  ctx.fillStyle = "#24221F";
  ctx.lineWidth = 9;
  for (const s of strokes) {
    if (s.length === 1) {
      ctx.beginPath();
      ctx.arc(s[0][0], s[0][1], 6, 0, Math.PI * 2);
      ctx.fill();
      continue;
    }
    ctx.beginPath();
    s.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])));
    ctx.stroke();
  }
}

const toPad = (e) => {
  const r = cv.getBoundingClientRect();
  return [Math.round(((e.clientX - r.left) / r.width) * N), Math.round(((e.clientY - r.top) / r.height) * N)];
};

function regen() {
  clearTimeout(regenTimer);
  regenTimer = setTimeout(() => {
    gen++;
    const make = photo ? (v) => photoShape(photo, photoType, v, level, seed) : (v) => generate(type, strokes, v, seed);
    results = photo || strokes.length ? VARIANTS.map((v, i) => {
      const s = make(v);
      return s ? { id: `tmp:${gen}:${i}`, ...s } : null;
    }) : [];
    if (photo) drawStrokes();
    renderVariants();
  }, 30);
}

function renderVariants() {
  const wrap = $("#padVariants");
  wrap.replaceChildren(
    ...VARIANTS.map((v, i) => {
      const a = results[i],
        b = h("button", { class: "variant" + (a ? "" : " empty"), role: "radio", "aria-checked": String(variant === i && !!a), "aria-label": v, disabled: !a });
      if (a) {
        const c = h("canvas", { width: 180, height: 180 });
        drawShapeThumb(c, a, currentColor(), store.ui.mode, seed);
        b.append(c);
        b.onclick = () => {
          variant = i;
          renderVariants();
        };
      }
      return b;
    }),
  );
  $("#padOk").disabled = !results[variant];
}

// Drawing offers every type; a photo is already a shape, so it is only filled in or kept as lines.
function renderTypes() {
  const wrap = $("#padTypes"),
    mode = photo ? "photo" : "draw";
  if (wrap.dataset.mode !== mode) {
    wrap.dataset.mode = mode;
    const list = photo ? PHOTO_TYPES : TYPES;
    wrap.replaceChildren(...list.map((t) => h("button", { "data-v": t, "aria-label": t, html: icon(t) })));
  }
  segmented(wrap, photo ? photoType : type, (t) => {
    if (photo) photoType = t;
    else type = t;
    renderTypes();
    regen();
  });
}

function renderMode() {
  $("#padLevel").hidden = !photo;
  $("#padUndo").hidden = !!photo;
  $("#padClear").setAttribute("aria-label", photo ? "Remove photo" : "Clear");
  cv.style.cursor = photo ? "default" : "";
  if (photo) $("#padLevelIn").value = String(Math.round((0.66 - level) * 100));
  renderTypes();
  sizePad();
}

async function usePhoto(src, saved) {
  const ticket = ++loading;
  $("#padBoard").classList.add("busy");
  try {
    const p = await loadPhoto(src);
    if (ticket !== loading) return;
    photo = p;
    level = saved?.level ?? p.auto;
    if (saved?.type) photoType = saved.type;
    if (!saved) {
      seed = newSeed();
      variant = 0;
    }
    renderMode();
    regen();
  } catch (e) {
    console.warn("photo failed", e);
  } finally {
    if (ticket === loading) $("#padBoard").classList.remove("busy");
  }
}

// Opens the camera / photo library. Must run inside a click so the browser allows the picker.
export function pickPhoto() {
  const input = $("#photoInput");
  input.value = "";
  input.click();
}

function confirm() {
  const a = results[variant];
  if (!a) return;
  const asset = {
    id: uid("c"),
    rings: a.rings,
    w: a.w,
    h: a.h,
    gen: photo
      ? { type: photoType, variant: VARIANTS[variant], seed, level, photo: photo.url }
      : { type, variant: VARIANTS[variant], seed, strokes: strokes.map((s) => s.map((p) => [p[0], p[1]])) },
  };
  store.custom.unshift(asset);
  save();
  emit("assets");
  close();
  addPiece(asset.id);
  strokes = [];
  results = [];
  photo = null;
  seed = newSeed();
  if (!store.ui.seen) {
    store.ui.seen = true;
    save();
  }
}

export function openPad(fromAsset, file) {
  const g = fromAsset?.gen;
  if (g?.photo) {
    seed = g.seed;
    variant = Math.max(0, VARIANTS.indexOf(g.variant));
    usePhoto(g.photo, g);
  } else if (g?.strokes) {
    loading++;
    photo = null;
    strokes = g.strokes.map((s) => s.map((p) => [p[0], p[1]]));
    type = g.type;
    seed = g.seed;
    variant = Math.max(0, VARIANTS.indexOf(g.variant));
  }
  if (file) usePhoto(file);
  $("#pad").hidden = false;
  renderMode();
  renderPadPapers();
  regen();
  renderVariants();
  emit("modal");
}

export function close() {
  $("#pad").hidden = true;
  cur = null;
  emit("modal");
}

export function initPad() {
  cv = $("#padCanvas");
  ctx = cv.getContext("2d");
  $("#padUndo").innerHTML = icon("undo");
  $("#padClear").innerHTML = icon("eraser");
  $("#padDice").innerHTML = icon("dice");
  $("#padPhoto").innerHTML = icon("camera");
  $("#padLevelLo").innerHTML = icon("lineBold");
  $("#padLevelHi").innerHTML = icon("lineFaint");
  $("#padPhoto").onclick = pickPhoto;
  $("#photoInput").addEventListener("change", (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if ($("#pad").hidden) openPad(null, f);
    else usePhoto(f);
  });
  $("#padLevelIn").addEventListener("input", (e) => {
    level = Math.round(66 - +e.target.value) / 100;
    regen();
  });
  $("#padClose").innerHTML = icon("close");
  $("#padOk").innerHTML = icon("check");
  cv.addEventListener("pointerdown", (e) => {
    if (e.button > 0 || photo) return;
    e.preventDefault();
    try {
      cv.setPointerCapture(e.pointerId);
    } catch {}
    cur = { id: e.pointerId, pts: [toPad(e)] };
    strokes.push(cur.pts);
    drawStrokes();
  });
  cv.addEventListener("pointermove", (e) => {
    if (!cur || cur.id !== e.pointerId) return;
    const evs = e.getCoalescedEvents ? e.getCoalescedEvents() : [e];
    for (const ev of evs.length ? evs : [e]) {
      const p = toPad(ev),
        last = cur.pts[cur.pts.length - 1];
      if (Math.hypot(p[0] - last[0], p[1] - last[1]) >= 4 && cur.pts.length < 2000) cur.pts.push(p);
    }
    drawStrokes();
  });
  const end = (e) => {
    if (!cur || cur.id !== e.pointerId) return;
    cur = null;
    if (strokes.length > 24) strokes.shift();
    regen();
  };
  for (const n of ["pointerup", "pointercancel", "lostpointercapture"]) cv.addEventListener(n, end);
  $("#padUndo").onclick = () => {
    strokes.pop();
    drawStrokes();
    regen();
  };
  $("#padClear").onclick = () => {
    if (photo) {
      loading++;
      photo = null;
      renderMode();
      regen();
      return;
    }
    strokes = [];
    drawStrokes();
    regen();
  };
  $("#padDice").onclick = () => {
    seed = newSeed();
    regen();
  };
  $("#padClose").onclick = close;
  $("#padOk").onclick = confirm;
  $("#pad").addEventListener("pointerdown", (e) => e.target.id === "pad" && close());
  addEventListener("keydown", (e) => {
    if ($("#pad").hidden) return;
    if (e.key === "Escape") close();
    else if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "z") {
      e.preventDefault();
      $("#padUndo").click();
    } else if (e.key === "Enter" && !$("#padOk").disabled && document.activeElement?.tagName !== "BUTTON") confirm();
  });
  addEventListener("resize", () => !$("#pad").hidden && sizePad());
  onChange((w) => {
    if ($("#pad").hidden) return;
    if (w === "paper" || w === "mode") {
      renderPadPapers();
      renderVariants();
    }
  });
}
