// Everything around the canvas: paper rail and set popover, cut mode, texture, background, the shape tray.
import { NEUTRALS, PALETTES, TEXTURES } from "./data.js";
import { addPiece, render, selected, swapTo, swapping } from "./editor.js";
import { icon } from "./icons.js";
import { drawShapeThumb, textureTile } from "./paper.js";
import { currentColor, emit, onChange, paperColors, save, saveUI, snap, store } from "./store.js";
import { closePopover, colorPicker, confirmIcon, isNarrow, placePopover, togglePopover } from "./ui.js";
import { $, $$, h, onLongPress } from "./util.js";

let onPaperPicked = () => {};
export const setPaperPickedHook = (fn) => (onPaperPicked = fn);
let openPadFor = () => {};
export const setPadOpener = (fn) => (openPadFor = fn);

const TILT = [-6, 4, -3, 7, -5, 3, -4];

/* ---------- papers ---------- */

function renderSetButton() {
  const b = $("#setBtn");
  b.replaceChildren(...paperColors().map((c) => h("i", { style: { background: c } })));
}

function renderSheets() {
  const wrap = $("#sheets"),
    colors = paperColors();
  wrap.replaceChildren();
  const make = (c, i, neutral) =>
    h(
      "button",
      {
        class: "sheet-btn" + (neutral ? " neutral" : ""),
        role: "radio",
        "aria-checked": String(store.ui.paper === i),
        "aria-label": "Paper " + c,
        style: { "--c": c, "--r": TILT[i % TILT.length] + "deg" },
        onclick: () => pickPaper(i),
      },
      h("i"),
    );
  colors.forEach((c, i) => wrap.append(make(c, i)));
  wrap.append(h("span", { class: "sheet-sep" }));
  NEUTRALS.forEach((c, i) => wrap.append(make(c, 5 + i, true)));
  renderPadPapers();
}

export function renderPadPapers() {
  const wrap = $("#padPapers");
  if (!wrap) return;
  wrap.replaceChildren(
    ...paperColors().map((c, i) =>
      h(
        "button",
        {
          class: "sheet-btn",
          role: "radio",
          "aria-checked": String(store.ui.paper === i),
          "aria-label": "Paper " + c,
          style: { "--c": c, "--r": TILT[i] + "deg" },
          onclick: () => pickPaper(i, true),
        },
        h("i"),
      ),
    ),
  );
}

function pickPaper(i, fromPad = false) {
  store.ui.paper = i;
  saveUI();
  renderSheets();
  emit("paper");
  if (!fromPad) onPaperPicked();
}

/* ---------- set popover ---------- */

function renderSetPop() {
  const list = $("#setList");
  list.replaceChildren(
    ...PALETTES.map((p, si) => {
      const row = h(
        "div",
        {
          class: "set-row",
          role: "radio",
          tabindex: "0",
          "aria-checked": String(store.ui.set === si),
          "aria-label": p.label,
          onclick: (e) => {
            if (e.target.closest(".edit")) return;
            store.ui.set = si;
            if (store.ui.paper > 4) store.ui.paper = 0;
            saveUI();
            $("#cpWrap").hidden = true;
            renderAll();
          },
          onkeydown: (e) => (e.key === "Enter" || e.key === " ") && (e.preventDefault(), row.click()),
        },
        ...paperColors(si).map((c) => h("i", { style: { background: c } })),
      );
      if (p.id === "mine") {
        const edit = h("button", { class: "edit", "aria-label": "Edit colour", "aria-expanded": String(!$("#cpWrap").hidden), html: icon("drop") });
        edit.onclick = () => {
          store.ui.set = si;
          if (store.ui.paper > 4) store.ui.paper = 0;
          saveUI();
          const cp = $("#cpWrap");
          cp.hidden = !cp.hidden;
          if (!cp.hidden)
            colorPicker(cp, store.ui.mine[store.ui.paper], (hex) => {
              store.ui.mine[store.ui.paper] = hex;
              saveUI();
              renderSheets();
              renderSetButton();
              row.querySelectorAll("i")[store.ui.paper].style.background = hex;
              emit("paper");
            });
          renderAll();
          placePopover($("#setPop"), $("#setBtn"));
        };
        row.append(edit);
      }
      return row;
    }),
  );
  const tex = $("#texSeg");
  tex.replaceChildren(
    ...TEXTURES.map((t) => {
      const c = h("canvas", { width: 80, height: 60 }),
        ctx = c.getContext("2d");
      ctx.fillStyle = currentColor();
      ctx.fillRect(0, 0, 80, 60);
      const tile = textureTile(t);
      if (tile) {
        ctx.drawImage(tile, 0, 0, 256, 256, 0, 0, 160, 160);
        ctx.drawImage(tile, 0, 0, 256, 256, 0, 0, 160, 160);
      }
      return h(
        "button",
        {
          "aria-label": t + " paper",
          "aria-pressed": String(store.art?.texture === t),
          onclick: () => {
            if (!store.art || store.art.texture === t) return;
            snap();
            store.art.texture = t;
            save();
            renderSetPop();
            render();
            emit("art");
          },
        },
        c,
      );
    }),
  );
  $("#bgBtn").style.setProperty("--cur", currentColor());
}

/* ---------- cut mode ---------- */

function renderCutMode() {
  for (const seg of $$(".cutmode"))
    for (const b of seg.querySelectorAll("[data-v]")) {
      b.innerHTML = icon(b.dataset.v);
      b.setAttribute("aria-pressed", String(store.ui.mode === b.dataset.v));
      b.onclick = () => {
        store.ui.mode = b.dataset.v;
        saveUI();
        renderCutMode();
        emit("mode");
      };
    }
}

/* ---------- tray ---------- */

const thumbCache = new Map();
function thumb(asset) {
  const key = asset.id + currentColor() + store.ui.mode;
  if (thumbCache.has(key)) return thumbCache.get(key);
  const c = h("canvas", { width: 144, height: 144 });
  drawShapeThumb(c, asset, currentColor(), store.ui.mode, 7);
  if (thumbCache.size > 300) thumbCache.delete(thumbCache.keys().next().value);
  thumbCache.set(key, c);
  return c;
}

function trayItem(asset) {
  const b = h(
    "button",
    { class: "tray-item" + (asset.preset ? "" : " mine"), role: "listitem", "aria-label": asset.preset ? asset.id.slice(2) : "My shape" },
    thumb(asset),
  );
  b.addEventListener("click", () => {
    if (swapping && selected()) swapTo(asset.id);
    else addPiece(asset.id);
    if (isNarrow()) setTray(false);
  });
  if (!asset.preset) onLongPress(b, () => openItemPop(asset, b));
  return b;
}

let itemTarget = null;
function openItemPop(asset, anchor) {
  itemTarget = asset;
  $("#itemEdit").hidden = !asset.gen?.strokes?.length;
  togglePopover($("#itemPop"), anchor);
}

export function renderTray() {
  const grid = $("#trayGrid");
  const mine = store.custom.filter((a) => !a.hidden);
  const items = [...mine.map(trayItem)];
  if (mine.length) items.push(h("span", { class: "tray-sep", role: "presentation" }));
  for (const a of Object.values(store.presets)) items.push(trayItem(a));
  grid.replaceChildren(...items);
}

export function setTray(open) {
  if (!isNarrow()) open = false;
  $("#tray").classList.toggle("open", open);
  $("#trayScrim").hidden = !open;
  $("#trayBtn").setAttribute("aria-expanded", String(open));
}

/* ---------- glue ---------- */

export function renderAll() {
  renderSetButton();
  renderSheets();
  renderCutMode();
  renderSetPop();
  renderTray();
}

export function initDesk() {
  $("#aboutBtn").innerHTML = icon("info");
  $("#newBtn").innerHTML = icon("file");
  $("#sizeBtn").innerHTML = icon("aspect");
  $("#undoBtn").innerHTML = icon("undo");
  $("#redoBtn").innerHTML = icon("redo");
  $("#doneBtn").innerHTML = icon("check");
  $("#drawBtn").innerHTML = icon("pencil");
  $("#drawFab").innerHTML = icon("pencil");
  $("#trayBtn").innerHTML = icon("shapes");
  $("#bgBtn").innerHTML = icon("bg");
  $("#itemEdit").innerHTML = icon("pencil");
  $("#itemDel").innerHTML = icon("trash");
  const bar = $("#pieceBar");
  const ICON = { copy: "copy", flipH: "flipH", flipV: "flipV", front: "front", back: "back", recolor: "recolor", edge: "rip", swap: "swap", del: "trash" };
  for (const b of bar.querySelectorAll("[data-act]")) b.innerHTML = icon(ICON[b.dataset.act]);
  for (const t of bar.querySelectorAll("template")) t.innerHTML = icon(t.dataset.edge);

  $("#setBtn").onclick = () => {
    renderSetPop();
    togglePopover($("#setPop"), $("#setBtn"), () => ($("#cpWrap").hidden = true), isNarrow() ? undefined : "right");
  };
  $("#bgBtn").onclick = () => {
    if (!store.art || store.art.bg === currentColor()) return;
    snap();
    store.art.bg = currentColor();
    save();
    render();
    emit("art");
  };
  $("#trayBtn").onclick = () => setTray(!$("#tray").classList.contains("open"));
  $("#trayScrim").onclick = () => setTray(false);
  $("#itemDel").onclick = async () => {
    const a = itemTarget;
    closePopover();
    if (!a || !(await confirmIcon("trash", "Remove shape"))) return;
    a.hidden = true;
    save();
    renderTray();
  };
  $("#itemEdit").onclick = () => {
    const a = itemTarget;
    closePopover();
    if (a) openPadFor(a);
  };
  matchMedia("(max-width: 899px)").addEventListener("change", () => setTray(false));

  onChange((what) => {
    if (what === "paper" || what === "mode" || what === "assets") {
      renderTray();
      renderSetButton();
      if (what === "paper") renderSetPop();
    }
    if (what === "swap") {
      $("#tray").classList.toggle("swapping", swapping);
      if (swapping && isNarrow()) setTray(true);
    }
  });
  renderAll();
}
