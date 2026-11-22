// Canvas size picker: sheets of paper at their real proportions. Changing size mid-work offers
// "fit artwork" or "keep size", each shown as a live preview of the result.
import { SIZES, sizeById } from "./data.js";
import { icon } from "./icons.js";
import { renderArtwork } from "./paper.js";
import { getAsset, store } from "./store.js";
import { $, h } from "./util.js";

// fit: the old canvas scales to sit wholly inside the new one, so nothing is lost.
// keep: pieces keep their size relative to the paper (by area); the canvas edges move and may crop.
const scaleFor = (from, to, mode) => (mode === "fit" ? Math.min(to.w / from.w, to.h / from.h) : Math.sqrt((to.w * to.h) / (from.w * from.h)));

export function transformPieces(pieces, from, to, mode) {
  const s = scaleFor(from, to, mode);
  return pieces.map((p) => ({ ...p, x: to.w / 2 + (p.x - from.w / 2) * s, y: to.h / 2 + (p.y - from.h / 2) * s, s: p.s * s }));
}

function preview(c, sizeId, mode) {
  const to = sizeById(sizeId),
    from = sizeById(store.art.size),
    max = 400,
    k = max / Math.max(to.w, to.h);
  c.width = Math.round(to.w * k);
  c.height = Math.round(to.h * k);
  const art = { ...store.art, size: sizeId, pieces: transformPieces(store.art.pieces, from, to, mode) };
  renderArtwork(c.getContext("2d"), art, new DOMMatrix([k, 0, 0, k, 0, 0]), to.w, to.h, getAsset, { shadow: false });
  c.style.aspectRatio = to.w + " / " + to.h;
}

export function openSizes({ cancellable, fresh = false }) {
  return new Promise((resolve) => {
    const modal = $("#sizes"),
      grid = $("#sizeGrid"),
      fit = $("#fitRow"),
      close = $("#sizesClose");
    const cur = fresh ? null : store.art?.size;
    const L = Math.min(128, Math.floor((Math.min(760, innerWidth - 32) - 32 - 3 * 18) / 4) - 6);
    const finish = (v) => {
      modal.hidden = true;
      removeEventListener("keydown", key);
      resolve(v);
    };
    const key = (e) => cancellable && e.key === "Escape" && finish(null);
    close.innerHTML = icon("close");
    close.hidden = !cancellable;
    close.onclick = () => finish(null);
    modal.onpointerdown = (e) => cancellable && e.target === modal && finish(null);
    fit.hidden = true;
    grid.style.setProperty("--L", L + "px");
    grid.replaceChildren(
      ...SIZES.map((s) => {
        const k = L / Math.max(s.w, s.h);
        const b = h(
          "button",
          {
            class: "size-opt " + s.id.split("-")[0] + (s.card ? " card" : "") + (s.a4 ? " a4" : ""),
            role: "radio",
            "aria-checked": String(s.id === cur),
            "aria-label": s.label,
          },
          h("span", { class: "sheet", style: { width: Math.round(s.w * k) + "px", height: Math.round(s.h * k) + "px" } }),
        );
        b.onclick = () => {
          const from = sizeById(cur);
          const same = Math.abs(scaleFor(from, s, "fit") / scaleFor(from, s, "keep") - 1) < 0.02;
          if (fresh || !store.art || !store.art.pieces.length || s.id === cur || same) return finish(s.id === cur && cancellable ? null : { size: s.id, mode: "fit" });
          for (const o of grid.children) o.setAttribute("aria-checked", String(o === b));
          fit.hidden = false;
          for (const opt of fit.querySelectorAll(".fit-opt")) {
            preview(opt.querySelector("canvas"), s.id, opt.dataset.fit);
            opt.onclick = () => finish({ size: s.id, mode: opt.dataset.fit });
          }
          fit.scrollIntoView({ block: "nearest", behavior: "smooth" });
        };
        return b;
      }),
    );
    modal.hidden = false;
    addEventListener("keydown", key);
    requestAnimationFrame(() => (grid.querySelector('[aria-checked="true"]') || grid.firstChild)?.focus());
  });
}
