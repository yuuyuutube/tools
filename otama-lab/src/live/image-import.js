import { pitchOf } from '../pitch.js';
import { importPitchFile, PITCH_FILE_LIMIT } from './format.js';
import { curveLayout, curveGrid, curveGlyph, curvePitchAxis, curveSingleRowTime, traceCurvePixels } from './image-curve.js';

export function pitchRasterDimensions(bytes) {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  if (bytes.length >= 24 && bytes[0] === 137 && bytes[1] === 80 && bytes[2] === 78 && bytes[3] === 71) return { width: view.getUint32(16), height: view.getUint32(20) };
  if (bytes.length < 4 || bytes[0] !== 255 || bytes[1] !== 216 || bytes[2] !== 255) return null;
  let offset = 2, count = 0;
  while (offset + 4 <= bytes.length && count++ < 4096) {
    if (bytes[offset++] !== 255) return null;
    while (bytes[offset] === 255) offset++;
    const marker = bytes[offset++];
    if (marker === 217 || marker === 218) return null;
    if (marker === 1 || (marker >= 208 && marker <= 215)) continue;
    if (offset + 2 > bytes.length) return null;
    const length = view.getUint16(offset);
    if (length < 2 || offset + length > bytes.length) return null;
    if ([192, 193, 194, 195, 197, 198, 199, 201, 202, 203, 205, 206, 207].includes(marker)) {
      if (length < 8) return null;
      return { width: view.getUint16(offset + 5), height: view.getUint16(offset + 3) };
    }
    offset += length;
  }
  return null;
}

let curveTemplates = null;
let curveTemplateScale = null;
function makeCurveTemplates(inputScale = 1) {
  const scale = Math.max(.25, Math.min(1, inputScale));
  if (curveTemplates && curveTemplateScale === scale) return curveTemplates;
  const canvas = document.createElement('canvas'); canvas.width = 144; canvas.height = 48;
  const context = canvas.getContext('2d', { willReadFrequently: true });
  if (!context) throw new Error('此瀏覽器無法辨識圖片。');
  const small = document.createElement('canvas'); small.width = Math.round(144 * scale); small.height = Math.round(48 * scale);
  const smallContext = small.getContext('2d');
  const notes = [], times = [];
  const make = (text, font, phase, time = false) => {
    context.fillStyle = '#0c1719'; context.fillRect(0, 0, canvas.width, canvas.height);
    context.fillStyle = '#a3b8ae'; context.font = `18px ${font}`; context.textAlign = 'right'; context.textBaseline = 'alphabetic'; context.fillText(text, time ? 104 : 82, (time ? 32 : 30) + phase);
    if (scale < 1) { smallContext.drawImage(canvas, 0, 0, small.width, small.height); context.drawImage(small, 0, 0, canvas.width, canvas.height); }
    return curveGlyph(context.getImageData(0, 0, canvas.width, canvas.height), { x: 0, y: 0, width: canvas.width, height: canvas.height });
  };
  const phases = scale === 1 ? [0] : [0, .25 / scale, .5 / scale, .75 / scale];
  for (const phase of phases) {
    for (const font of ['system-ui, sans-serif', 'Arial, sans-serif', 'Verdana, sans-serif']) for (let midi = 12; midi <= 132; midi++) notes.push({ value: midi, glyph: make(pitchOf(440 * 2 ** ((midi - 69) / 12)).note, font, phase) });
    for (const font of ['ui-monospace, monospace', 'monospace', 'Arial, sans-serif']) for (let tenth = 0; tenth <= 120; tenth++) times.push({ value: tenth * 100, glyph: make(`${Number((tenth / 10).toFixed(1))} s`, font, phase, true) });
  }
  curveTemplateScale = scale;
  curveTemplates = { notes, times }; return curveTemplates;
}

export async function recoverPitchImage(file, bytes) {
  const dimensions = pitchRasterDimensions(bytes);
  if (!dimensions) throw new Error('請選擇 OTAMA LAB 的 PNG、JPEG 或演奏 JSON。');
  const layout = curveLayout(dimensions.width, dimensions.height); // Bound pixels before decoding.
  const url = URL.createObjectURL(file); let bitmap = null;
  try {
    const image = await new Promise((resolve, reject) => {
      const img = new Image(); img.onload = () => resolve(img); img.onerror = () => reject(new Error('圖片無法解碼，請重新儲存成 PNG 或 JPEG。')); img.src = url;
    });
    bitmap = image;
    curveLayout(image.naturalWidth, image.naturalHeight);
    const canvas = document.createElement('canvas'); canvas.width = layout.width; canvas.height = layout.height;
    const context = canvas.getContext('2d', { willReadFrequently: true });
    if (!context) throw new Error('此瀏覽器無法辨識圖片。');
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    const pixels = context.getImageData(0, 0, canvas.width, canvas.height), grid = curveGrid(pixels);
    const templates = makeCurveTemplates(dimensions.width / 1440);
    const pitchAxis = curvePitchAxis(pixels, grid, templates.notes);
    const singleRowMs = layout.rows === 1 ? curveSingleRowTime(pixels, templates.times) : null;
    return traceCurvePixels(pixels, { rows: layout.rows, pitchAxis, singleRowMs });
  } finally { if (bitmap) bitmap.src = ''; URL.revokeObjectURL(url); }
}

export async function importPlayablePitch(file) {
  if (!file || file.size > PITCH_FILE_LIMIT) throw new Error('請選擇 8 MB 以內的 PNG、JPEG 或 JSON。');
  const bytes = new Uint8Array(await file.arrayBuffer());
  if (bytes.length > PITCH_FILE_LIMIT) throw new Error('檔案過大。');
  if (bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255) return recoverPitchImage(file, bytes);
  try { return await importPitchFile(file); }
  catch (error) {
    // Never silently downgrade corrupt or unsupported embedded data / JSON.
    if (error.code !== 'NO_PITCH_DATA') throw error;
    return recoverPitchImage(file, bytes);
  }
}
