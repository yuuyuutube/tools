// Custom dialogs, popovers and the colour picker — no native confirm/alert/select/inputs of type color.
import { icon } from "./icons.js";
import { $, clamp, h } from "./util.js";

/* ---------- confirm: a big icon, an optional sentence on what will happen, cancel / ok ---------- */
export function confirmIcon(name, label, message = "") {
  return new Promise((resolve) => {
    const prev = document.activeElement;
    const done = (v) => {
      wrap.classList.add("out");
      removeEventListener("keydown", key, true);
      setTimeout(() => wrap.remove(), 180);
      prev?.focus?.();
      resolve(v);
    };
    const key = (e) => {
      if (e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation();
        done(false);
      } else if (e.key === "Enter") {
        e.preventDefault();
        e.stopPropagation();
        done(true);
      }
    };
    const ok = h("button", { class: "dot ink big", "aria-label": "OK", html: icon("check"), onclick: () => done(true) });
    const wrap = h(
      "div",
      { class: "modal confirm", role: "alertdialog", "aria-modal": "true", "aria-label": label, onpointerdown: (e) => e.target === wrap && done(false) },
      h(
        "div",
        { class: "confirm-card" },
        h("div", { class: "confirm-icon", html: icon(name) }),
        message ? h("p", { class: "confirm-text" }, message) : null,
        h("div", { class: "confirm-row" }, h("button", { class: "dot big", "aria-label": "Cancel", html: icon("close"), onclick: () => done(false) }), ok),
      ),
    );
    document.body.append(wrap);
    addEventListener("keydown", key, true);
    requestAnimationFrame(() => ok.focus());
  });
}

/* ---------- popovers ---------- */
let openPop = null;
export function closePopover() {
  if (!openPop) return;
  const p = openPop;
  openPop = null;
  p.el.hidden = true;
  p.anchor?.setAttribute("aria-expanded", "false");
  p.onClose?.();
}
export function togglePopover(el, anchor, onClose, side) {
  if (openPop?.el === el) return closePopover();
  closePopover();
  openPop = { el, anchor, onClose, side };
  el.hidden = false;
  anchor?.setAttribute("aria-expanded", "true");
  placePopover(el, anchor, side);
}
export function placePopover(el, anchor, side = openPop?.side) {
  if (!anchor) return;
  const a = anchor.getBoundingClientRect(),
    vw = innerWidth,
    vh = innerHeight;
  el.style.left = el.style.top = el.style.bottom = "";
  const r = el.getBoundingClientRect();
  if (side === "right" && a.right + 12 + r.width < vw) {
    el.style.left = a.right + 12 + "px";
    el.style.top = clamp(a.top, 12, vh - r.height - 12) + "px";
    return;
  }
  let left = a.left + a.width / 2 - r.width / 2;
  left = clamp(left, 12, vw - r.width - 12);
  let top = a.bottom + 10;
  if (top + r.height > vh - 12) top = a.top - r.height - 10;
  if (top < 12) {
    // Not enough room above or below: sit beside the anchor.
    top = clamp(a.top, 12, vh - r.height - 12);
    left = a.right + 10 + r.width < vw ? a.right + 10 : a.left - r.width - 10;
  }
  el.style.left = left + "px";
  el.style.top = top + "px";
}
addEventListener(
  "pointerdown",
  (e) => {
    if (!openPop) return;
    if (openPop.el.contains(e.target) || openPop.anchor?.contains(e.target)) return;
    closePopover();
  },
  true,
);
addEventListener("keydown", (e) => e.key === "Escape" && closePopover());
addEventListener("resize", () => closePopover());

/* ---------- colour helpers ---------- */
export function hexToHsv(hex) {
  const n = parseInt(hex.slice(1), 16),
    r = ((n >> 16) & 255) / 255,
    g = ((n >> 8) & 255) / 255,
    b = (n & 255) / 255;
  const max = Math.max(r, g, b),
    min = Math.min(r, g, b),
    d = max - min;
  let hh = 0;
  if (d) {
    if (max === r) hh = ((g - b) / d) % 6;
    else if (max === g) hh = (b - r) / d + 2;
    else hh = (r - g) / d + 4;
    hh *= 60;
    if (hh < 0) hh += 360;
  }
  return { h: hh, s: max ? d / max : 0, v: max };
}
export function hsvToHex({ h: hh, s, v }) {
  const f = (n) => {
    const k = (n + hh / 60) % 6;
    return v - v * s * Math.max(0, Math.min(k, 4 - k, 1));
  };
  return "#" + [f(5), f(3), f(1)].map((x) => Math.round(x * 255).toString(16).padStart(2, "0")).join("").toUpperCase();
}

// Saturation/value square + hue strip, driven by pointer events (mouse, pen, touch).
export function colorPicker(container, initial, onInput) {
  let hsv = hexToHsv(initial);
  container.replaceChildren();
  const sv = h("div", { class: "cp-sv", role: "slider", "aria-label": "Colour", tabindex: "0" }, h("i", { class: "cp-knob" }));
  const hue = h("div", { class: "cp-hue", role: "slider", "aria-label": "Hue", tabindex: "0" }, h("i", { class: "cp-knob" }));
  container.append(sv, hue);
  const paint = () => {
    sv.style.background = `linear-gradient(to top,#000,transparent),linear-gradient(to right,#fff,hsl(${hsv.h},100%,50%))`;
    const k1 = sv.firstChild,
      k2 = hue.firstChild;
    k1.style.left = hsv.s * 100 + "%";
    k1.style.top = (1 - hsv.v) * 100 + "%";
    k1.style.background = hsvToHex(hsv);
    k2.style.left = (hsv.h / 360) * 100 + "%";
    k2.style.background = `hsl(${hsv.h},100%,50%)`;
  };
  const drag = (el, fn) => {
    const move = (e) => {
      const r = el.getBoundingClientRect();
      fn(clamp((e.clientX - r.left) / r.width, 0, 1), clamp((e.clientY - r.top) / r.height, 0, 1));
      paint();
      onInput(hsvToHex(hsv));
    };
    el.addEventListener("pointerdown", (e) => {
      e.preventDefault();
      el.setPointerCapture(e.pointerId);
      move(e);
      const up = () => {
        el.removeEventListener("pointermove", move);
        el.removeEventListener("pointerup", up);
        el.removeEventListener("pointercancel", up);
      };
      el.addEventListener("pointermove", move);
      el.addEventListener("pointerup", up);
      el.addEventListener("pointercancel", up);
    });
  };
  drag(sv, (x, y) => {
    hsv.s = x;
    hsv.v = 1 - y;
  });
  drag(hue, (x) => (hsv.h = x * 359.9));
  const keys = (el, fn) =>
    el.addEventListener("keydown", (e) => {
      const d = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }[e.key];
      if (!d) return;
      e.preventDefault();
      fn(d[0] * 0.03, d[1] * 0.03);
      paint();
      onInput(hsvToHex(hsv));
    });
  keys(sv, (dx, dy) => {
    hsv.s = clamp(hsv.s + dx, 0, 1);
    hsv.v = clamp(hsv.v - dy, 0, 1);
  });
  keys(hue, (dx) => (hsv.h = clamp(hsv.h + dx * 360, 0, 359.9)));
  paint();
  return { set: (hex) => ((hsv = hexToHsv(hex)), paint()) };
}

export function segmented(root, value, onPick) {
  for (const b of root.querySelectorAll("[data-v]")) {
    b.setAttribute("aria-pressed", String(b.dataset.v === value));
    b.onclick = () => onPick(b.dataset.v);
  }
}

export const isNarrow = () => matchMedia("(max-width: 899px)").matches;
export const modalOpen = () => !!$(".modal:not([hidden])");

/* ---------- hover titles (繁中) ---------- */
// Buttons keep English aria-labels; a hover title in Traditional Chinese is derived from them, including
// buttons that are created later (tray, variants, size sheets…).
const TITLES = {
  About: "關於", "New artwork": "新畫布", "Canvas size": "畫布尺寸", Undo: "復原", Redo: "重做", Finish: "完成作品",
  "Paper set": "色紙組", Snip: "剪紙模式", Rip: "撕紙模式",
  Duplicate: "複製", "Flip horizontal": "水平翻轉", "Flip vertical": "垂直翻轉", "Bring forward": "往前一層", "Send backward": "往後一層",
  "Use current paper colour": "換成目前色紙的顏色", "Switch to snip": "改成剪紙邊", "Switch to rip": "改成撕紙邊", "Swap shape": "換一個形狀", Delete: "刪除",
  "Draw a shape": "畫一個形狀", Shapes: "形狀素材", "Fill background with current paper": "用目前色紙當背景",
  "Edit drawing": "重新編輯這張畫", "Remove from tray": "從素材盤移除", "Edit colour": "自訂我的顏色",
  "Back to edit": "回去編輯", "Make another": "再做一張", "Download PNG": "下載 PNG",
  "Original artwork": "原始作品", "Art print": "藝術海報", "Postcard preview": "明信片預覽",
  Close: "關閉", OK: "確定", Cancel: "取消", "Let’s Play!": "開始玩",
  "Undo stroke": "復原一筆", Clear: "清除重畫", "New variations": "換一批變化", "Add to collage": "加入拼貼",
  "Fit artwork": "等比縮放作品", "Keep size": "維持素材大小",
  leaf: "葉片", branch: "枝條", flower: "花朵", organic: "有機形狀", free: "自由剪",
  original: "原始", soft: "柔和", bold: "大膽",
  "smooth paper": "平滑紙", "textured paper": "紋理紙", "fibrous paper": "纖維紙",
  "Tropical Jungle": "熱帶雨林", "Ocean Garden": "海洋花園", "Autumn Leaves": "秋日植物", "Colourful Cut-outs": "繽紛剪紙", "My Colours": "我的顏色",
  "Square 1:1": "正方形 1:1", "Portrait 4:5": "直式 4:5", "Story 9:16": "限時動態 9:16", "Landscape 16:9": "橫式 16:9",
  "Postcard 100 × 150 mm": "明信片・直式 100 × 150 mm", "Postcard 150 × 100 mm": "明信片・橫式 150 × 100 mm",
  "A4 210 × 297 mm": "A4・直式 210 × 297 mm", "A4 297 × 210 mm": "A4・橫式 297 × 210 mm",
  "My shape": "我的形狀（長按可編輯或移除）",
  monstera: "龜背芋", banana: "香蕉葉", palm: "棕櫚葉", fern: "羽狀葉", round: "圓葉", slim: "細長葉", sprout: "小枝芽",
  daisy: "雛菊", bloom: "盛開的花", lemon: "檸檬", fruit: "果實", sun: "太陽", moon: "月亮", star: "星芒", sparkle: "閃光",
  blob: "色塊", pebble: "卵石", wave: "波浪", swirl: "漩渦", drop: "水滴", dot: "圓點",
};
const zhTitle = (label) => (label.startsWith("Paper #") ? "色紙" : label.startsWith("Edit paper") ? "調這張色紙" : TITLES[label] || "");

function applyTitle(el) {
  const t = zhTitle(el.getAttribute("aria-label") || "");
  if (t && el.title !== t) el.title = t;
}
export function initTitles() {
  const SEL = "button[aria-label], [role=radio][aria-label]";
  document.querySelectorAll(SEL).forEach(applyTitle);
  new MutationObserver((list) => {
    for (const m of list) {
      if (m.type === "attributes") {
        if (m.target.matches?.(SEL)) applyTitle(m.target);
        continue;
      }
      for (const n of m.addedNodes) {
        if (n.nodeType !== 1) continue;
        if (n.matches(SEL)) applyTitle(n);
        n.querySelectorAll(SEL).forEach(applyTitle);
      }
    }
  }).observe(document.body, { subtree: true, childList: true, attributes: true, attributeFilter: ["aria-label"] });
}
