// First-visit guide on the work table: a spotlight cut out over the real control, with a speech bubble
// next to it saying what it does. Steps whose control isn't on screen (desktop vs phone layout) are
// skipped. The "?" button in the top bar plays it again.
import { icon } from "./icons.js";
import { saveUI, store } from "./store.js";
import { $, $$, clamp, h, reduceMotion } from "./util.js";

// sel: one selector, or a list of alternatives (first visible wins); each alternative may be an array of
// selectors whose boxes are joined into one spotlight.
// Each step: [title, text] in 繁中 and in English. The language is shared with the About booklet.
const STEPS = [
  {
    sel: "#sheets",
    zh: ["選一張色紙", "接下來剪出的形狀，都會用這張紙的顏色。"],
    en: ["Pick a paper", "Every shape you cut next takes this paper’s colour."],
  },
  {
    sel: "#setBtn",
    zh: ["色紙組", "換一整組顏色、選紙的質感，也能把背景鋪成目前的色紙。"],
    en: ["Paper sets", "Switch to another set of colours, choose a paper texture, or fill the background with the current paper."],
  },
  {
    sel: ".cutmode",
    zh: ["剪，還是撕？", "剪刀是俐落的剪紙邊，另一個是毛毛的手撕邊。"],
    en: ["Snip or rip?", "Scissors give a clean cut edge. The other one gives a soft, torn edge."],
  },
  {
    sel: ["#drawBtn", "#drawFab"],
    zh: ["畫一個形狀", "隨手畫幾筆，就變成剪紙：葉片、枝條、花朵或自由形狀，每次都有三種變化。"],
    en: ["Draw a shape", "Draw a few lines and they turn into cut paper: a leaf, a branch, a flower or a free shape, each in three variations."],
  },
  {
    sel: ["#photoBtn", "#photoFab"],
    zh: ["拍下手稿", "在紙上畫好拍下來，也能變成剪紙形狀。"],
    en: ["Photograph a sketch", "Draw on real paper, take a photo, and it becomes a cut-paper shape too."],
  },
  {
    sel: ["#trayGrid", "#trayBtn"],
    zh: ["形狀素材盤", "點一下就放進畫布。你做的形狀也收在這裡，長按可以重新編輯。"],
    en: ["Shape tray", "Tap a shape to put it on the canvas. The shapes you make are kept here too; long-press one to edit it."],
  },
  {
    sel: "#art",
    zh: ["拼貼畫布", "拖曳紙片移動，拉角落的把手縮放、旋轉。點一下紙片，會出現複製、翻轉、換層等工具。"],
    en: ["Your collage", "Drag a piece to move it, and pull its corner handle to scale and rotate. Tap a piece for more: duplicate, flip, layers."],
  },
  {
    sel: [["#undoBtn", "#redoBtn"]],
    zh: ["復原／重做", "放錯了沒關係，退回上一步就好。"],
    en: ["Undo / redo", "Put something in the wrong place? Just step back."],
  },
  {
    sel: "#doneBtn",
    zh: ["完成作品", "拼好了按這裡：簽名、加標題，下載成 PNG。"],
    en: ["Finish", "When your collage is ready: sign it, add a title and download a PNG."],
  },
  {
    sel: "#helpBtn",
    zh: ["隨時再看一次", "忘了怎麼用，就按這個問號。"],
    en: ["See this again", "Forgot how something works? Tap the question mark."],
  },
];

const UI = {
  zh: { label: "操作導覽", skip: "略過", next: "下一步", last: "開始玩", prev: "上一步" },
  en: { label: "Guide", skip: "Skip", next: "Next", last: "Let’s play!", prev: "Previous step" },
};
const pickLang = () => store.ui.lang || (navigator.language?.startsWith("zh") ? "zh" : "en");

const PAD = 8, // space between the control and the spotlight's edge
  GAP = 14, // space between the spotlight and the bubble
  EDGE = 12; // bubble keeps this far from the window edge

let root = null,
  hole,
  bubble,
  steps = [],
  at = 0,
  lang = "zh",
  done = null;

function visible(el) {
  if (!el) return null;
  const r = el.getBoundingClientRect();
  if (r.width < 2 || r.height < 2) return null;
  if (r.right <= 0 || r.bottom <= 0 || r.left >= innerWidth || r.top >= innerHeight) return null;
  for (let e = el; e; e = e.parentElement) if (getComputedStyle(e).visibility === "hidden") return null;
  return r;
}

// First element matching the selector that is actually on screen (the snip / rip toggle exists twice:
// in the paper rail on desktop and in the bottom dock on a phone).
const onScreen = (sel) => $$(sel).find(visible) || null;

// The spotlight box for a step (viewport coordinates, clipped to the window), or null if not on screen.
function target(step) {
  for (const alt of [].concat(step.sel)) {
    const els = [].concat(alt).map(onScreen);
    if (!els.length || els.some((e) => !e)) continue;
    const boxes = els.map(visible);
    let x0 = Math.min(...boxes.map((b) => b.left)) - PAD,
      y0 = Math.min(...boxes.map((b) => b.top)) - PAD,
      x1 = Math.max(...boxes.map((b) => b.right)) + PAD,
      y1 = Math.max(...boxes.map((b) => b.bottom)) + PAD;
    x0 = Math.max(x0, 4);
    y0 = Math.max(y0, 4);
    x1 = Math.min(x1, innerWidth - 4);
    y1 = Math.min(y1, innerHeight - 4);
    // Round controls get a round spotlight; everything else a soft rectangle.
    const r = els.length === 1 ? parseFloat(getComputedStyle(els[0]).borderTopLeftRadius) || 0 : 0;
    const radius = Math.min(r + PAD, (x1 - x0) / 2, (y1 - y0) / 2, 40);
    return { x: x0, y: y0, w: x1 - x0, h: y1 - y0, radius: Math.max(radius, 12) };
  }
  return null;
}

function place(box) {
  Object.assign(hole.style, { left: box.x + "px", top: box.y + "px", width: box.w + "px", height: box.h + "px", borderRadius: box.radius + "px" });
  const bw = bubble.offsetWidth,
    bh = bubble.offsetHeight,
    cx = box.x + box.w / 2,
    cy = box.y + box.h / 2;
  const room = {
    bottom: innerHeight - (box.y + box.h) - GAP - EDGE >= bh,
    top: box.y - GAP - EDGE >= bh,
    right: innerWidth - (box.x + box.w) - GAP - EDGE >= bw,
    left: box.x - GAP - EDGE >= bw,
  };
  // Tall controls (the paper rail) read better with the bubble beside them; wide ones above or below.
  const order = box.h > box.w * 1.4 ? ["right", "left", "bottom", "top"] : ["bottom", "top", "right", "left"];
  const side = order.find((s) => room[s]) || "inside";
  let x, y;
  if (side === "bottom" || side === "top") {
    x = clamp(cx - bw / 2, EDGE, innerWidth - bw - EDGE);
    y = side === "bottom" ? box.y + box.h + GAP : box.y - GAP - bh;
  } else if (side === "left" || side === "right") {
    x = side === "right" ? box.x + box.w + GAP : box.x - GAP - bw;
    y = clamp(cy - bh / 2, EDGE, innerHeight - bh - EDGE);
  } else {
    // The control fills most of the screen (the canvas on a phone): sit on top of it, near its bottom.
    x = clamp(cx - bw / 2, EDGE, innerWidth - bw - EDGE);
    y = clamp(box.y + box.h - bh - 24, EDGE, innerHeight - bh - EDGE);
  }
  bubble.style.left = Math.round(x) + "px";
  bubble.style.top = Math.round(y) + "px";
  bubble.dataset.side = side;
  const arrow = bubble.querySelector(".tour-arrow");
  arrow.style.left = side === "top" || side === "bottom" ? clamp(cx - x, 22, bw - 22) + "px" : "";
  arrow.style.top = side === "left" || side === "right" ? clamp(cy - y, 22, bh - 22) + "px" : "";
}

function show(i, dir = 1, keepFocus = false) {
  // Skip steps whose control isn't on screen right now, in the direction of travel.
  while (i >= 0 && i < steps.length && !target(steps[i])) i += dir;
  if (i < 0 || i >= steps.length) {
    if (dir > 0) return end();
    return show(0, 1);
  }
  at = i;
  const step = steps[i],
    last = !steps.slice(i + 1).some(target);
  const shown = steps.filter((s, k) => k <= i && target(s)).length,
    total = steps.filter(target).length;
  const ui = UI[lang],
    [title, text] = step[lang];
  bubble.lang = lang === "zh" ? "zh-Hant" : "en";
  bubble.setAttribute("aria-label", ui.label);
  bubble.querySelector(".tour-count").textContent = `${shown} / ${total}`;
  bubble.querySelector(".tour-title").textContent = title;
  bubble.querySelector(".tour-text").textContent = text;
  bubble.querySelector(".tour-skip").textContent = ui.skip;
  for (const b of bubble.querySelectorAll("[data-lang]")) b.setAttribute("aria-pressed", String(b.dataset.lang === lang));
  const prevBtn = bubble.querySelector(".tour-prev");
  prevBtn.disabled = shown === 1;
  prevBtn.setAttribute("aria-label", ui.prev);
  const next = bubble.querySelector(".tour-next");
  next.textContent = last ? ui.last : ui.next;
  if (!keepFocus) {
    bubble.classList.remove("in");
    void bubble.offsetWidth;
    bubble.classList.add("in");
  }
  place(target(step));
  if (!keepFocus) next.focus({ preventScroll: true });
}

function setLang(l) {
  lang = l;
  store.ui.lang = l;
  saveUI();
  show(at, 1, true);
}

const next = () => show(at + 1, 1),
  prev = () => show(at - 1, -1);

function reflow() {
  if (!root) return;
  const box = target(steps[at]);
  if (box) place(box);
  else show(at, 1);
}

function onKey(e) {
  if (!root) return;
  const k = e.key;
  if (k === "Escape") end();
  else if (k === "Enter" || k === " ") {
    const a = document.activeElement;
    if (a && bubble.contains(a) && a.tagName === "BUTTON") a.click();
    else next();
  } else if (k === "ArrowRight") next();
  else if (k === "ArrowLeft") prev();
  else if (k !== "Tab") return;
  if (k === "Tab") {
    // keep focus inside the bubble
    const btns = [...bubble.querySelectorAll("button:not(:disabled)")];
    const i = btns.indexOf(document.activeElement);
    const j = (i + (e.shiftKey ? -1 : 1) + btns.length) % btns.length;
    btns[j]?.focus();
  }
  e.preventDefault();
  e.stopImmediatePropagation();
}

function end() {
  if (!root) return;
  store.ui.toured = true;
  saveUI();
  removeEventListener("keydown", onKey, true);
  removeEventListener("resize", reflow);
  const r = root;
  root = null;
  r.classList.add("out");
  setTimeout(() => r.remove(), reduceMotion() ? 0 : 220);
  $("#helpBtn")?.focus({ preventScroll: true });
  done?.();
  done = null;
}

export const touring = () => !!root;

// Returns a promise that settles when the guide is closed.
export function startTour() {
  if (root) return Promise.resolve();
  steps = STEPS;
  lang = pickLang();
  if (!steps.some(target)) return Promise.resolve();
  hole = h("div", { class: "tour-hole" });
  const langBtn = (l, label, title) => h("button", { type: "button", "data-lang": l, lang: l === "zh" ? "zh-Hant" : "en", title, onclick: () => setLang(l) }, label);
  bubble = h(
    "div",
    { class: "tour-bubble", role: "dialog", "aria-modal": "true" },
    h("i", { class: "tour-arrow", "aria-hidden": "true" }),
    h(
      "div",
      { class: "tour-head" },
      h("span", { class: "tour-count" }),
      h("div", { class: "tour-lang", role: "group", "aria-label": "Language" }, langBtn("en", "EN", "English"), langBtn("zh", "中文", "繁體中文")),
      h("button", { class: "tour-skip", type: "button", onclick: end }),
    ),
    h("strong", { class: "tour-title", "aria-live": "polite" }),
    h("p", { class: "tour-text" }),
    h(
      "div",
      { class: "tour-nav" },
      h("button", { class: "dot tour-prev", type: "button", "aria-label": "Previous step", html: icon("arrowLeft"), onclick: prev }),
      h("button", { class: "tour-next", type: "button", onclick: next }),
    ),
  );
  root = h("div", { class: "tour", id: "tour" }, hole, bubble);
  // Clicks on the dimmed area or the spotlight do nothing; only the bubble's buttons move the guide.
  root.addEventListener("pointerdown", (e) => !bubble.contains(e.target) && e.preventDefault());
  document.body.append(root);
  addEventListener("keydown", onKey, true);
  addEventListener("resize", reflow);
  return new Promise((res) => {
    done = res;
    // first placement jumps straight there; later steps glide
    root.classList.add("still");
    show(0, 1);
    requestAnimationFrame(() => requestAnimationFrame(() => root?.classList.remove("still")));
  });
}
