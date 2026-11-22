// About / tribute page, laid out as a small art booklet with a few original cut-paper shapes.
import { icon } from "./icons.js";
import { ringsToD } from "./intro.js";
import { emit, saveUI, store } from "./store.js";
import { $, $$ } from "./util.js";

const DECOR = [
  { id: "p:monstera", color: "#1F5A3A", pos: "right:-70px;top:-40px", w: 230, r: 200, wide: true },
  { id: "p:sun", color: "#F1C232", pos: "right:-24px;bottom:120px", w: 120, r: 12, wide: true },
  { id: "p:bloom", color: "#EC6A4C", pos: "right:56px;bottom:-14px", w: 92, r: -20 },
  { id: "p:wave", color: "#2552A3", pos: "left:-40px;bottom:-6px", w: 200, r: -8 },
];

function decorate() {
  const box = $("#bookletArt");
  if (box.children.length) return;
  for (const d of DECOR) {
    const a = store.presets[d.id];
    if (!a) continue;
    const vb = `${-a.w / 2 - 2} ${-a.h / 2 - 2} ${a.w + 4} ${a.h + 4}`;
    box.insertAdjacentHTML(
      "beforeend",
      `<svg viewBox="${vb}" class="${d.wide ? "wide" : ""}" style="${d.pos};width:${d.w}px;transform:rotate(${d.r}deg)"><path d="${ringsToD(a.rings)}" fill="${d.color}"/></svg>`,
    );
  }
}

function setLang(l) {
  for (const b of $$("#about [data-lang]")) b.setAttribute("aria-pressed", String(b.dataset.lang === l));
  for (const t of $$("#about [data-text]")) t.hidden = t.dataset.text !== l;
  store.ui.lang = l;
  saveUI();
}

export function openAbout() {
  decorate();
  setLang(store.ui.lang || (navigator.language?.startsWith("zh") ? "zh" : "en"));
  $("#about").hidden = false;
  emit("modal");
  requestAnimationFrame(() => $("#aboutClose").focus());
}

export function closeAbout() {
  $("#about").hidden = true;
  emit("modal");
}

export function initAbout() {
  $("#aboutClose").innerHTML = icon("close");
  $("#aboutClose").onclick = closeAbout;
  $("#about").addEventListener("pointerdown", (e) => e.target.id === "about" && closeAbout());
  for (const b of $$("#about [data-lang]")) b.onclick = () => setLang(b.dataset.lang);
  addEventListener("keydown", (e) => !$("#about").hidden && e.key === "Escape" && closeAbout());
}
