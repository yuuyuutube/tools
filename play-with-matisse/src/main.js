// App shell: intro → canvas size → paper → draw → collage → finish. Returning visitors land straight on the
// work table with their saved collage.
import { initAbout, openAbout } from "./about.js";
import { sizeById } from "./data.js";
import { initDesk, setPadOpener, setPaperPickedHook, setTray } from "./desk.js";
import { initPad, openPad } from "./drawpad.js";
import { afterHistory, initEditor, layout, render, select } from "./editor.js";
import { closeFinish, initFinish, openFinish } from "./finish.js";
import { playIntro } from "./intro.js";
import { openSizes, transformPieces } from "./sizes.js";
import { initStore, newArtwork, onChange, redo, save, saveUI, size, snap, store, undo } from "./store.js";
import { closePopover, confirmIcon, initTitles, modalOpen } from "./ui.js";
import { $ } from "./util.js";

function syncTop() {
  $("#undoBtn").disabled = !store.undo.length;
  $("#redoBtn").disabled = !store.redo.length;
  $("#doneBtn").disabled = !store.art?.pieces.length;
}

async function startNew(cancellable) {
  const r = await openSizes({ cancellable, fresh: true });
  if (!r) return false;
  newArtwork(r.size);
  select(null);
  layout();
  syncTop();
  if (!store.ui.seen) $("#papers").classList.add("pulse");
  return true;
}

function history(fn) {
  closePopover();
  if (fn()) afterHistory();
  syncTop();
}

async function changeSize() {
  closePopover();
  const r = await openSizes({ cancellable: true });
  if (!r || r.size === store.art.size) return;
  snap();
  store.art.pieces = transformPieces(store.art.pieces, size(), sizeById(r.size), r.mode);
  store.art.size = r.size;
  save();
  afterHistory();
  syncTop();
}

async function askNew() {
  closePopover();
  if (
    store.art?.pieces.length &&
    !(await confirmIcon("file", "New artwork", "開始一張新作品？目前這張會被清空，而且無法復原。想留下來的話，請先下載。你畫的形狀會留在素材盤裡。"))
  )
    return false;
  return startNew(true);
}

function boot() {
  initTitles();
  initStore();
  initDesk();
  initEditor();
  initPad();
  initAbout();
  initFinish({
    back: () => {
      closeFinish();
      layout();
    },
    another: async () => {
      if (await askNew()) closeFinish();
    },
  });
  setPadOpener(openPad);
  setPaperPickedHook(() => {
    $("#papers").classList.remove("pulse");
    // First visit only: the first paper you pick opens the drawing pad.
    if (!store.ui.seen && $("#pad").hidden && !store.art?.pieces.length) {
      store.ui.seen = true;
      saveUI();
      openPad();
    }
  });

  $("#aboutBtn").onclick = () => (closePopover(), openAbout());
  $("#introAbout").onclick = (e) => (e.stopPropagation(), openAbout());
  $("#newBtn").onclick = askNew;
  $("#sizeBtn").onclick = changeSize;
  $("#undoBtn").onclick = () => history(undo);
  $("#redoBtn").onclick = () => history(redo);
  $("#doneBtn").onclick = () => {
    closePopover();
    select(null);
    setTray(false);
    openFinish();
  };
  const draw = () => {
    closePopover();
    setTray(false);
    openPad();
  };
  $("#drawBtn").onclick = draw;
  $("#drawFab").onclick = draw;

  addEventListener("keydown", (e) => {
    if (modalOpen() || $("#desk").hidden || !$("#finish").hidden || !$("#intro").hidden) return;
    if (["INPUT", "TEXTAREA"].includes(e.target.tagName)) return;
    const mod = e.metaKey || e.ctrlKey,
      key = e.key.toLowerCase();
    if (mod && key === "z") {
      e.preventDefault();
      history(e.shiftKey ? redo : undo);
    } else if (mod && key === "y") {
      e.preventDefault();
      history(redo);
    }
  });
  onChange((w) => {
    if (w === "art" || w === "select" || w === "modal") syncTop();
    if (w === "modal") render();
  });

  $("#desk").hidden = false;
  if (store.art) {
    layout();
    syncTop();
    return;
  }
  playIntro().then(() => startNew(false));
}

boot();
