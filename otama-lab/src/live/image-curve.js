// Pixel-only fallback for the tool's complete, unrotated exported graph layout.
// All recovered samples are derived estimates, never microphone measurements.
export const CURVE_WIDTH = 1440;
export const curveInk = (r, g, b) => g > 85 && g - b > 22 && r - b > 12 && g > r * .85;

export function curveLayout(width, height) {
  if (!Number.isFinite(width) || !Number.isFinite(height) || width < 360 || width > 12000 || height < 60 || width * height > 16000000) throw new Error('圖片尺寸不適合辨識，請使用完整的音高軌跡匯出圖（寬度至少 360px）。');
  const canonical = height / width * CURVE_WIDTH, rows = Math.round((canonical - 32) / 280);
  if (rows < 1 || rows > 5 || Math.abs(canonical - (32 + rows * 280)) > Math.max(4, canonical * .012)) throw new Error('請使用完整、未裁切或旋轉的 OTAMA LAB 軌跡圖。');
  return { width: CURVE_WIDTH, height: 32 + rows * 280, rows };
}

function pixelAt(image, x, y) { return (Math.round(y) * image.width + Math.round(x)) * 4; }
function gridPixel(data, index) {
  const r = data[index], g = data[index + 1], b = data[index + 2];
  return g >= 30 && g <= 125 && g - r >= 3 && Math.abs(g - b) < 18;
}
export function curveGrid(image, row = 0) {
  const candidates = [], top = 24 + row * 280, bottom = top + 218;
  for (let y = top; y <= bottom; y++) {
    let count = 0, right = 100;
    for (let x = 100; x <= 1400; x++) if (gridPixel(image.data, pixelAt(image, x, y))) { count++; right = x; }
    if (count >= (row === 0 ? 650 : 35)) candidates.push({ y, count, right });
  }
  const groups = [];
  for (const candidate of candidates) {
    if (!groups.length || candidate.y - groups.at(-1).at(-1).y > 2) groups.push([]);
    groups.at(-1).push(candidate);
  }
  const lines = groups.map(group => ({ y: group.reduce((sum, point) => sum + point.y * point.count, 0) / group.reduce((sum, point) => sum + point.count, 0), right: Math.max(...group.map(point => point.right)) }));
  // Thin grid strokes can vanish under downsampling; bright note labels survive.
  const labelGroups = []; let current = null;
  for (let y = top - 18; y <= bottom + 14; y++) {
    let ink = 0;
    for (let x = 8; x <= 84; x++) {
      const i = pixelAt(image, x, y), r = image.data[i], g = image.data[i + 1], b = image.data[i + 2];
      if (g > 70 && Math.abs(g - r) < 50 && Math.abs(g - b) < 45) ink++;
    }
    if (ink < 2) continue;
    if (!current || y - current.at(-1).y > 2) { current = []; labelGroups.push(current); }
    current.push({ y, count: ink });
  }
  const labels = labelGroups.filter(group => group.at(-1).y - group[0].y >= 5 && group.at(-1).y - group[0].y < 30).map(group => {
    const y = (group[0].y + group.at(-1).y) / 2 + 1;
    const nearby = lines.find(line => Math.abs(line.y - y) < 8);
    return { y: nearby?.y ?? y, right: nearby?.right ?? 100 };
  });
  return labels.length >= 3 && labels.length <= 7 && labels.length > lines.length ? labels : lines;
}

// Compact, font-template matching, restricted to note labels and 0.1–12 s.
// Normalizing glyph crops makes moderate JPEG loss / resizing tolerable.
export function curveGlyph(image, rect, template = false) {
  const { data, width } = image;
  let left = rect.x + rect.width, right = rect.x, top = rect.y + rect.height, bottom = rect.y, peak = 0;
  const intensity = (x, y) => {
    const i = (y * width + x) * 4;
    return template ? data[i] / 255 : Math.max(0, (data[i + 1] - 23) / 161);
  };
  for (let y = rect.y; y < rect.y + rect.height; y++) for (let x = rect.x; x < rect.x + rect.width; x++) peak = Math.max(peak, intensity(x, y));
  for (let y = rect.y; y < rect.y + rect.height; y++) for (let x = rect.x; x < rect.x + rect.width; x++) {
    const value = intensity(x, y);
    if (value < peak * .2) continue;
    left = Math.min(left, x); right = Math.max(right, x); top = Math.min(top, y); bottom = Math.max(bottom, y);
  }
  if (right - left < 2 || bottom - top < 4 || peak <= 0) return null;
  const aspect = (right - left + 1) / (bottom - top + 1), targetWidth = Math.min(116, Math.max(2, Math.round(aspect * 24)));
  const pixels = new Uint8Array(120 * 24);
  for (let y = 0; y < 24; y++) for (let x = 0; x < targetWidth; x++) {
    const sx = Math.min(right, left + Math.floor((x + .5) / targetWidth * (right - left + 1)));
    const sy = Math.min(bottom, top + Math.floor((y + .5) / 24 * (bottom - top + 1)));
    pixels[y * 120 + x + 2] = Math.round(Math.min(1, intensity(sx, sy) / peak) * 255);
  }
  return { pixels, aspect };
}
export function curveGlyphScore(a, b) {
  if (!a || !b) return 2;
  let intersection = 0, union = 0;
  for (let i = 0; i < a.pixels.length; i++) { intersection += Math.min(a.pixels[i], b.pixels[i]); union += Math.max(a.pixels[i], b.pixels[i]); }
  return 1 - intersection / Math.max(1, union) + .25 * Math.abs(Math.log(a.aspect / b.aspect));
}

export function curvePitchAxis(image, grid, templates) {
  if (grid.length < 3 || grid.length > 7) return null;
  const scores = grid.map(line => {
    const glyph = curveGlyph(image, { x: 0, y: Math.max(0, Math.round(line.y) - 15), width: 86, height: 29 });
    const map = new Map();
    for (const template of templates) map.set(template.value, Math.min(map.get(template.value) ?? 2, curveGlyphScore(glyph, template.glyph)));
    return map;
  });
  const fits = [];
  for (let highMidi = 12; highMidi <= 132; highMidi++) for (let step = 1; step <= 24; step++) {
    if (highMidi - step * (grid.length - 1) < 12) continue;
    const score = scores.reduce((sum, map, index) => sum + (map.get(highMidi - step * index) ?? 2), 0) / grid.length;
    fits.push({ highMidi, step, score });
  }
  fits.sort((a, b) => a.score - b.score);
  const first = fits[0];
  if (!first || first.score > .64) return null;
  // When tiny octave digits are ambiguous, prefer the microphone's plausible
  // label range, but explicitly preserve that this required an estimate.
  const best = fits.find(fit => fit.score <= first.score + .03 && fit.highMidi <= 100 && fit.highMidi - fit.step * (grid.length - 1) >= 30) || first;
  const estimated = best !== first || fits.some(fit => fit !== best && Math.abs(fit.score - best.score) < .008);
  const slope = -best.step * (grid.length - 1) / (grid.at(-1).y - grid[0].y);
  return { midiAtTop: best.highMidi + (24 - grid[0].y) * slope, semitonesPerPixel: slope, estimated };
}
export function curveSingleRowTime(image, templates) {
  const groups = []; let current = null;
  for (let x = 96; x <= 1403; x++) {
    let ink = false;
    for (let y = 250; y <= 278; y++) { const i = pixelAt(image, x, y); if (image.data[i + 1] > 65) { ink = true; break; } }
    if (!ink) continue;
    if (!current || x - current.right > 18) { current = { left: x, right: x }; groups.push(current); }
    current.right = x;
  }
  if (groups.length < 2 || groups.length > 6) return null;
  const scores = groups.map(group => {
    const glyph = curveGlyph(image, { x: group.left, y: 248, width: group.right - group.left + 1, height: 32 });
    const map = new Map();
    for (const template of templates) map.set(template.value, Math.min(map.get(template.value) ?? 2, curveGlyphScore(glyph, template.glyph)));
    return map;
  });
  const fits = [];
  for (let durationMs = 100; durationMs <= 12000; durationMs += 100) {
    const tick = durationMs <= 3000 ? 1000 : durationMs <= 6000 ? 2000 : 3000, ticks = [];
    for (let time = 0; time <= durationMs; time += tick) ticks.push(time);
    if (durationMs - ticks.at(-1) > durationMs * .07) ticks.push(durationMs);
    else if (ticks.length > 1) ticks[ticks.length - 1] = durationMs;
    if (ticks.length !== groups.length) continue;
    let score = 0;
    for (let i = 0; i < ticks.length; i++) {
      score += scores[i].get(ticks[i]) ?? 2;
      if (i > 0 && i < ticks.length - 1) score += Math.abs((groups[i].left + groups[i].right) / 2 - (100 + ticks[i] / durationMs * 1300)) * .004;
    }
    fits.push({ durationMs, score: score / ticks.length });
  }
  fits.sort((a, b) => a.score - b.score);
  return fits[0] && fits[0].score <= .8 ? fits[0].durationMs : null;
}

export function traceCurvePixels(image, { rows, pitchAxis = null, singleRowMs = null }) {
  const grid = curveGrid(image);
  if (grid.length < 3 || grid.length > 7) throw new Error('沒有找到可辨識的音高刻度，請使用完整的軌跡匯出圖。');
  const pitchScale = pitchAxis && !pitchAxis.estimated ? 'axis' : 'assumed';
  const axis = pitchAxis || { midiAtTop: 86, semitonesPerPixel: -31 / 218 };
  const finalGrid = rows > 1 ? curveGrid(image, rows - 1) : grid;
  const endpoints = finalGrid.map(line => line.right).filter(x => x > 102).sort((a, b) => a - b);
  const finalRight = endpoints.length ? endpoints[Math.floor(endpoints.length / 2)] : null;
  const geometryTime = finalRight !== null && finalRight > 102 ? Math.min(12000, Math.max(20, (finalRight - 100) / 1300 * 12000)) : null;
  const lastMs = rows === 1 ? singleRowMs || 12000 : geometryTime || 12000;
  const durationMs = Math.min(60000, (rows - 1) * 12000 + lastMs), spanMs = rows === 1 ? lastMs : 12000;
  const timeScale = rows === 1 ? singleRowMs ? 'axis' : 'assumed' : geometryTime ? 'axis' : 'assumed';
  const frames = []; let voiced = 0, thick = 0;
  for (let row = 0; row < rows; row++) {
    const top = 24 + row * 280, endMs = row === rows - 1 ? lastMs : 12000;
    const right = 100 + endMs / spanMs * 1300;
    for (let x = 100; x <= right + .01; x += 2) {
      const timeMs = row * 12000 + (x - 100) / 1300 * spanMs;
      if (frames.length && timeMs <= frames.at(-1).timeMs) continue;
      const ink = [];
      for (let y = top; y <= top + 218; y++) {
        let weight = 0;
        for (let dx = -1; dx <= 1; dx++) {
          const index = pixelAt(image, x + dx, y), r = image.data[index], g = image.data[index + 1], b = image.data[index + 2];
          if (curveInk(r, g, b)) weight += g - b;
        }
        if (weight) ink.push({ y, weight });
      }
      let frequencyHz = null;
      if (ink.length) {
        voiced++; if (ink.length > 35) thick++;
        const total = ink.reduce((sum, point) => sum + point.weight, 0); let weight = 0, y = ink[0].y;
        for (const point of ink) { weight += point.weight; if (weight >= total / 2) { y = point.y; break; } }
        const midi = axis.midiAtTop + (y - top) * axis.semitonesPerPixel;
        frequencyHz = Math.max(20, Math.min(20000, 440 * 2 ** ((midi - 69) / 12)));
      }
      frames.push(Object.freeze({ timeMs, frequencyHz }));
    }
  }
  if (voiced < 3 || thick > voiced * .2) throw new Error('辨識不到清楚的綠色軌跡，請換較清晰的完整圖片。');
  return Object.freeze({ durationMs, frames: Object.freeze(frames), hasPitch: true, reconstruction: Object.freeze({ method: 'image-curve', pitchScale, timeScale }) });
}
