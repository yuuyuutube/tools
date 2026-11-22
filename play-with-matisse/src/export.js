// Final output: the artwork itself, or an art print (same paper size, artwork set in a mat with an
// optional title and artist). Print sizes get a real 300 DPI pHYs chunk, not just a claim in the UI.
import { DPI, sizeById } from "./data.js";
import { renderArtwork } from "./paper.js";
import { getAsset } from "./store.js";
import { canvas } from "./util.js";

export const MAT = "#FBF8F1";

export function renderOutput(art, mode, { title = "", author = "" } = {}, scale = 1) {
  const S = sizeById(art.size),
    W = Math.round(S.w * scale),
    H = Math.round(S.h * scale);
  const c = canvas(W, H),
    ctx = c.getContext("2d");
  if (mode !== "print") {
    renderArtwork(ctx, art, new DOMMatrix([scale, 0, 0, scale, 0, 0]), S.w, S.h, getAsset);
    return c;
  }
  ctx.fillStyle = MAT;
  ctx.fillRect(0, 0, W, H);
  const short = Math.min(W, H),
    m = short * 0.085,
    hasCap = !!(title.trim() || author.trim()),
    cap = hasCap ? short * 0.085 : 0;
  const availW = W - 2 * m,
    availH = H - 2 * m - cap,
    k = Math.min(availW / S.w, availH / S.h);
  const aw = S.w * k,
    ah = S.h * k,
    ax = (W - aw) / 2,
    ay = m + (availH - ah) / 2;
  renderArtwork(ctx, art, new DOMMatrix([k, 0, 0, k, ax, ay]), S.w, S.h, getAsset);
  if (hasCap) {
    const fs = Math.max(10, short * 0.022),
      y = ay + ah + cap * 0.55;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = "#3A3733";
    ctx.textBaseline = "middle";
    ctx.font = `italic 400 ${fs}px Georgia, "Times New Roman", "Songti TC", serif`;
    ctx.textAlign = "left";
    ctx.fillText(title.trim(), ax, y, aw * 0.62);
    ctx.font = `400 ${fs * 0.86}px "Helvetica Neue", Helvetica, "PingFang TC", Arial, sans-serif`;
    ctx.textAlign = "right";
    ctx.fillText(author.trim(), ax + aw, y, aw * 0.36);
  }
  return c;
}

/* ---------- PNG pHYs ---------- */

const CRC = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();
function crc32(bytes) {
  let c = 0xffffffff;
  for (const b of bytes) c = CRC[(c ^ b) & 255] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

export function withDpi(buf, dpi) {
  const src = new Uint8Array(buf);
  const ppm = Math.round(dpi / 0.0254);
  const chunk = new Uint8Array(21),
    dv = new DataView(chunk.buffer);
  dv.setUint32(0, 9);
  chunk.set([0x70, 0x48, 0x59, 0x73], 4); // "pHYs"
  dv.setUint32(8, ppm);
  dv.setUint32(12, ppm);
  chunk[16] = 1; // unit: metre
  dv.setUint32(17, crc32(chunk.subarray(4, 17)));
  // Insert right after IHDR (8-byte signature + 25-byte IHDR chunk), dropping any existing pHYs.
  const out = [src.subarray(0, 33), chunk];
  let i = 33;
  while (i < src.length) {
    const len = new DataView(src.buffer, src.byteOffset + i).getUint32(0);
    const type = String.fromCharCode(...src.subarray(i + 4, i + 8));
    if (type !== "pHYs") out.push(src.subarray(i, i + 12 + len));
    i += 12 + len;
  }
  return new Blob(out, { type: "image/png" });
}

export async function downloadArtwork(art, mode, caption) {
  const S = sizeById(art.size),
    c = renderOutput(art, mode, caption);
  const blob = await new Promise((r) => c.toBlob(r, "image/png"));
  if (!blob) throw new Error("PNG encode failed");
  const out = S.print ? withDpi(await blob.arrayBuffer(), DPI) : blob;
  const d = new Date(),
    stamp = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}-${String(d.getHours()).padStart(2, "0")}${String(d.getMinutes()).padStart(2, "0")}`;
  const name = `play-with-matisse-${S.id}${mode === "print" ? "-print" : ""}-${stamp}.png`;
  const url = URL.createObjectURL(out);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
  return { name, w: c.width, h: c.height, bytes: out.size };
}
