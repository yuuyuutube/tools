// The "ta-da" view: the artwork alone on a quiet wall, three output looks, download.
// Postcard is a preview only (white border, tilt, shadow live in CSS); its download is the plain artwork.
import { sizeById } from "./data.js";
import { MAT, downloadArtwork, renderOutput } from "./export.js";
import { icon } from "./icons.js";
import { store } from "./store.js";
import { segmented } from "./ui.js";
import { $, h } from "./util.js";

let mode = "original",
  onBack = () => {},
  onAnother = () => {};
const caption = { title: "", author: "" };

function fitFrame() {
  const S = sizeById(store.art.size),
    stage = $("#finishStage").getBoundingClientRect();
  const pad = mode === "postcard" ? 1.12 : 1;
  const k = Math.min((stage.width - 48) / (S.w * pad), (stage.height - 48) / (S.h * pad));
  const w = Math.max(40, Math.floor(S.w * k)),
    hh = Math.max(40, Math.floor(S.h * k));
  const cv = $("#finishCanvas"),
    dpr = Math.min(devicePixelRatio || 1, 2);
  const out = renderOutput(store.art, mode === "print" ? "print" : "original", caption, (w * dpr) / S.w);
  cv.width = out.width;
  cv.height = out.height;
  cv.getContext("2d").drawImage(out, 0, 0);
  cv.style.width = w + "px";
  cv.style.height = hh + "px";
  $("#finishFrame").classList.toggle("postcard", mode === "postcard");
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
}

export function openFinish() {
  $("#finish").hidden = false;
  mode = "original";
  $("#captionFields").hidden = true;
  renderModes();
  requestAnimationFrame(fitFrame);
}

export function closeFinish() {
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
  let busy = false;
  $("#downloadBtn").onclick = async () => {
    if (busy) return;
    busy = true;
    const b = $("#downloadBtn");
    b.disabled = true;
    try {
      await new Promise((r) => setTimeout(r, 30));
      await downloadArtwork(store.art, mode === "print" ? "print" : "original", caption);
      b.innerHTML = icon("check");
      setTimeout(() => (b.innerHTML = icon("download")), 1400);
    } catch (e) {
      console.error(e);
    } finally {
      busy = false;
      b.disabled = false;
    }
  };
  let t = 0;
  const typed = () => {
    caption.title = $("#artTitle").value;
    caption.author = $("#artAuthor").value;
    clearTimeout(t);
    t = setTimeout(fitFrame, 120);
  };
  $("#artTitle").addEventListener("input", typed);
  $("#artAuthor").addEventListener("input", typed);
  addEventListener("resize", () => !$("#finish").hidden && fitFrame());
  addEventListener("keydown", (e) => {
    if ($("#finish").hidden || e.target.tagName === "INPUT") return;
    if (e.key === "Escape") onBack();
  });
}
