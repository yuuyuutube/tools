// The "ta-da" view: the artwork alone on a quiet wall, three output looks, download.
// Postcard is a preview only (white border, tilt, shadow live in CSS); its download is the plain artwork.
import { sizeById } from "./data.js";
import { MAT, buildArtworkFile, canShareFiles, renderOutput, saveFile, shareFile } from "./export.js";
import { icon } from "./icons.js";
import { cancelSign, finishSign, initSign, isSigning, layoutSign, startSign } from "./sign.js";
import { store } from "./store.js";
import { segmented } from "./ui.js";
import { $, h } from "./util.js";

let mode = "original",
  onBack = () => {},
  onAnother = () => {};
const caption = { title: "", author: "" };

// The PNG is encoded ahead of time, so tapping share opens the sheet straight away: browsers (Safari above all)
// only allow the share sheet right after a tap, and a big render can take longer than that.
let prepared = null;
const outMode = () => (mode === "print" ? "print" : "original");
const fileKey = () => outMode() + (outMode() === "print" ? "|" + caption.title + "|" + caption.author : "");
function prepare() {
  const key = fileKey();
  if (prepared?.key === key) return prepared.promise;
  const entry = { key, file: null };
  entry.promise = new Promise((r) => setTimeout(r, 120)).then(() => buildArtworkFile(store.art, outMode(), caption));
  entry.promise.then((f) => (entry.file = f), () => {});
  prepared = entry;
  return entry.promise;
}
const fileNow = () => (prepared?.key === fileKey() && prepared.file ? Promise.resolve(prepared.file) : prepare());

function fitFrame() {
  const S = sizeById(store.art.size),
    stage = $("#finishStage").getBoundingClientRect();
  const pad = mode === "postcard" ? 1.12 : 1;
  const k = Math.min((stage.width - 48) / (S.w * pad), (stage.height - 48) / (S.h * pad));
  const w = Math.max(40, Math.floor(S.w * k)),
    hh = Math.max(40, Math.floor(S.h * k));
  const cv = $("#finishCanvas"),
    dpr = Math.min(devicePixelRatio || 1, 2);
  // While signing, the signature being edited lives on the overlay, so the artwork is drawn without it.
  const art = isSigning() ? { ...store.art, signature: null } : store.art;
  const out = renderOutput(art, mode === "print" ? "print" : "original", caption, (w * dpr) / S.w);
  cv.width = out.width;
  cv.height = out.height;
  cv.getContext("2d").drawImage(out, 0, 0);
  cv.style.width = w + "px";
  cv.style.height = hh + "px";
  $("#finishFrame").classList.toggle("postcard", mode === "postcard");
  layoutSign();
}

function modeThumb(m) {
  const S = sizeById(store.art.size),
    k = 104 / Math.max(S.w, S.h);
  const c = h("canvas", { width: 120, height: 104 }),
    ctx = c.getContext("2d");
  const art = renderOutput(store.art, m === "print" ? "print" : "original", m === "print" ? { title: " ", author: " " } : {}, k);
  const x = (120 - art.width) / 2,
    y = (104 - art.height) / 2;
  if (m === "postcard") {
    ctx.translate(60, 52);
    ctx.rotate(-0.06);
    ctx.translate(-60, -52);
    ctx.fillStyle = "#fff";
    ctx.shadowColor = "rgba(40,30,10,.35)";
    ctx.shadowBlur = 6;
    ctx.shadowOffsetY = 2;
    const b = Math.max(art.width, art.height) * 0.06;
    ctx.fillRect(x - b + 6, y - b + 6, art.width + 2 * b - 12, art.height + 2 * b - 12);
    ctx.shadowColor = "transparent";
    ctx.drawImage(art, x + 6, y + 6, art.width - 12, art.height - 12);
  } else {
    if (m === "print") {
      ctx.fillStyle = MAT;
      ctx.fillRect(x, y, art.width, art.height);
    }
    ctx.drawImage(art, x, y);
  }
  return c;
}

function renderModes() {
  const wrap = $("#finishModes");
  wrap.replaceChildren(...["original", "print", "postcard"].map((m) => h("button", { "data-v": m, "aria-label": { original: "Original artwork", print: "Art print", postcard: "Postcard preview" }[m] }, modeThumb(m))));
  segmented(wrap, mode, pick);
}

function pick(m) {
  mode = m;
  segmented($("#finishModes"), mode, pick);
  $("#captionFields").hidden = mode !== "print";
  fitFrame();
  prepare();
}

export function openFinish() {
  $("#finish").hidden = false;
  mode = "original";
  $("#captionFields").hidden = true;
  renderModes();
  prepared = null;
  requestAnimationFrame(() => {
    fitFrame();
    prepare();
  });
}

export function closeFinish() {
  if (isSigning()) finishSign();
  $("#finish").hidden = true;
}

export function initFinish(hooks) {
  onBack = hooks.back;
  onAnother = hooks.another;
  $("#backEdit").innerHTML = icon("pencil");
  $("#makeAnother").innerHTML = icon("file");
  $("#downloadBtn").innerHTML = icon("download");
  $("#titleIc").innerHTML = icon("title");
  $("#authorIc").innerHTML = icon("person");
  $("#backEdit").onclick = () => onBack();
  $("#makeAnother").onclick = () => onAnother();
  initSign({
    redrawArt: fitFrame,
    changed: () => {
      renderModes();
      prepared = null;
      prepare();
    },
  });
  // Signing happens on the plain artwork, so switch to it first.
  $("#signBtn").onclick = () => {
    if (mode !== "original") pick("original");
    startSign();
  };
  $("#shareBtn").innerHTML = icon("share");
  $("#shareBtn").hidden = !canShareFiles();
  const run = (btn, after) => async () => {
    if (btn.disabled) return;
    btn.disabled = true;
    try {
      const done = await after(await fileNow());
      if (done !== "cancelled") {
        const was = btn.innerHTML;
        btn.innerHTML = icon("check");
        setTimeout(() => (btn.innerHTML = was), 1400);
      }
    } catch (e) {
      console.error(e);
    } finally {
      btn.disabled = false;
    }
  };
  $("#downloadBtn").onclick = run($("#downloadBtn"), (f) => saveFile(f));
  $("#shareBtn").onclick = run($("#shareBtn"), (f) => shareFile(f));
  let t = 0;
  const typed = () => {
    caption.title = $("#artTitle").value;
    caption.author = $("#artAuthor").value;
    clearTimeout(t);
    t = setTimeout(() => {
      fitFrame();
      prepare();
    }, 300);
  };
  $("#artTitle").addEventListener("input", typed);
  $("#artAuthor").addEventListener("input", typed);
  addEventListener("resize", () => !$("#finish").hidden && fitFrame());
  addEventListener("keydown", (e) => {
    if ($("#finish").hidden) return;
    if (isSigning()) {
      if (e.key === "Escape") cancelSign();
      return;
    }
    if (e.target.tagName === "INPUT") return;
    if (e.key === "Escape") onBack();
  });
}
