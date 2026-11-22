// Intro editor. The forest is built by the same buildForest() the site uses, with a working copy of the layout
// overrides; every change rebuilds it. Order changes rewrite the whole stack as ranks, so the saved file fully
// describes what you saw. Click a piece to select it; click the same spot again to reach the piece underneath.
import { icon } from "../src/icons.js";
import { INTRO_PALETTE, buildForest, cutPlayButton } from "../src/intro.js";
import savedLayout from "../src/intro-layout.js";
import { initStore } from "../src/store.js";
import { confirmIcon, initTitles, segmented } from "../src/ui.js";
import { $, $$, h } from "../src/util.js";

const SIZES = { phone: [390, 844], tablet: [820, 1080], desktop: [1440, 900] };
let size = "desktop",
  layout = structuredClone({ colors: {}, z: {}, ...savedLayout }),
  saved = JSON.stringify(layout),
  sel = null,
  built = null;

function fit() {
  const [w, hgt] = SIZES[size],
    st = $("#stage").getBoundingClientRect(),
    pad = innerWidth < 900 ? 24 : 48,
    k = Math.min((st.width - pad) / w, (st.height - pad) / hgt, 1);
  $("#frame").style.width = w + "px";
  $("#frame").style.height = hgt + "px";
  $("#frame").style.transform = `scale(${k})`;
  $("#box").style.width = w * k + "px";
  $("#box").style.height = hgt * k + "px";
}

function render() {
  const [w, hgt] = SIZES[size];
  built = buildForest($("#edForest"), w, hgt, $("#edPlay"), layout);
  if (sel && !built.pieces.some((p) => p.key === sel)) sel = null;
  for (const p of built.pieces) p.el.classList.toggle("sel", p.key === sel);
  sync();
}

function sync() {
  const piece = built?.pieces.find((p) => p.key === sel);
  $("#pieceCard").classList.toggle("off", !piece);
  for (const b of $$("#order button")) b.disabled = !piece;
  for (const b of $$("#swatches button")) b.setAttribute("aria-pressed", String(!!piece && piece.color.toUpperCase() === b.dataset.c));
  $("#resetPiece").disabled = !piece || !(sel in layout.colors || sel in layout.z);
  const dirty = JSON.stringify(layout) !== saved;
  $("#saveBtn").disabled = !dirty;
  $("#saveBtn").querySelector(".ed-dirty")?.remove();
  if (dirty) $("#saveBtn").append(h("i", { class: "ed-dirty" }));
}

function move(dir) {
  if (!sel) return;
  const stack = [...built.stack],
    i = stack.indexOf(sel);
  if (i < 0) return;
  stack.splice(i, 1);
  const j = { back: 0, front: stack.length, down: Math.max(0, i - 1), up: Math.min(stack.length, i + 1) }[dir];
  stack.splice(j, 0, sel);
  layout.z = Object.fromEntries(stack.map((k, r) => [k, r * 10]));
  render();
}

function pick(e) {
  const keys = [];
  for (const el of document.elementsFromPoint(e.clientX, e.clientY)) {
    const k = el.closest?.("[data-key]")?.dataset.key;
    if (k && !keys.includes(k)) keys.push(k);
  }
  if (!keys.length) sel = null;
  else if (sel && keys.includes(sel)) sel = keys[(keys.indexOf(sel) + 1) % keys.length];
  else sel = keys[0];
  for (const p of built.pieces) p.el.classList.toggle("sel", p.key === sel);
  sync();
}

async function save() {
  const b = $("#saveBtn");
  b.disabled = true;
  try {
    const r = await fetch("/__save/intro-layout", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(layout) });
    const out = await r.json();
    if (!out.ok) throw new Error(out.error);
    saved = JSON.stringify(layout);
    b.innerHTML = icon("check", "big");
  } catch (err) {
    console.error("save failed", err);
    b.innerHTML = icon("close");
    b.disabled = false;
  }
  setTimeout(() => {
    b.innerHTML = icon("download");
    sync();
  }, 1400);
}

initStore();
initTitles();
$("#edPlay").innerHTML = cutPlayButton();
for (const b of $$("#sizes button")) b.innerHTML = icon(b.dataset.v);
const ORDER_ICON = { back: "toBack", down: "back", up: "front", front: "toFront" };
for (const b of $$("#order button")) {
  b.innerHTML = icon(ORDER_ICON[b.dataset.o]);
  b.onclick = () => move(b.dataset.o);
}
$("#swatches").append(
  ...INTRO_PALETTE.map((c) =>
    h("button", {
      "data-c": c.toUpperCase(),
      "aria-label": "Colour " + c,
      style: { "--c": c },
      onclick: () => {
        if (!sel) return;
        layout.colors[sel] = c.toUpperCase();
        render();
      },
    }),
  ),
);
$("#resetPiece").innerHTML = icon("undo");
$("#resetAll").innerHTML = icon("eraser");
$("#saveBtn").innerHTML = icon("download");
$("#resetPiece").onclick = () => {
  if (!sel) return;
  delete layout.colors[sel];
  delete layout.z[sel];
  render();
};
$("#resetAll").onclick = async () => {
  if (!(await confirmIcon("eraser", "Reset all", "把所有葉子的顏色和前後順序都還原成預設？要按儲存才會寫進網站。"))) return;
  layout = { colors: {}, z: {} };
  render();
};
$("#saveBtn").onclick = save;
$("#edForest").addEventListener("click", pick);
const setSize = (v) => {
  size = v;
  segmented($("#sizes"), size, setSize);
  fit();
  render();
};
setSize(innerWidth < 900 ? "phone" : "desktop");
addEventListener("resize", fit);
addEventListener("keydown", (e) => {
  if (document.querySelector(".modal")) return;
  if (e.key === "Escape") {
    sel = null;
    render();
  } else if (e.code === "BracketLeft" || e.code === "BracketRight") {
    e.preventDefault();
    move(e.code === "BracketRight" ? (e.shiftKey ? "front" : "up") : e.shiftKey ? "back" : "down");
  } else if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "s") {
    e.preventDefault();
    if (!$("#saveBtn").disabled) save();
  }
});
