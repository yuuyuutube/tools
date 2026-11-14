import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { curveLayout, curveGrid, curveGlyph, curveGlyphScore, traceCurvePixels } from '../src/live/image-curve.js';
import { pitchRasterDimensions, importPlayablePitch, recoverPitchImage } from '../src/live/image-import.js';
import { pitchDocument, parsePitchDocument, embedPitchPng } from '../src/live/format.js';

function graph() {
  const image = { width: 1440, height: 312, data: new Uint8ClampedArray(1440 * 312 * 4) };
  for (let i = 0; i < image.data.length; i += 4) image.data.set([12, 23, 25, 255], i);
  const pixel = (x, y, color) => image.data.set([...color, 255], (y * 1440 + x) * 4);
  for (const y of [24, 68, 112, 156, 200, 242]) for (let x = 100; x <= 1400; x++) pixel(x, y, [48, 73, 74]);
  for (let x = 100; x <= 1400; x++) if (x < 600 || x > 900) for (let y = 168; y <= 170; y++) pixel(x, y, [200, 241, 110]);
  return image;
}
test('pixel fallback bounds full graph dimensions before browser decoding', async () => {
  assert.deepEqual(curveLayout(720, 156), { width: 1440, height: 312, rows: 1 });
  assert.equal(curveLayout(720, 716).rows, 5);
  for (const [w, h] of [[32, 32], [1440, 600], [20000, 4320], [5000, 5000]]) assert.throws(() => curveLayout(w, h));
  const png = new Uint8Array(24); png.set([137, 80, 78, 71]); const view = new DataView(png.buffer); view.setUint32(16, 20000); view.setUint32(20, 20000);
  assert.deepEqual(pitchRasterDimensions(png), { width: 20000, height: 20000 });
  await assert.rejects(recoverPitchImage({}, png), /尺寸/);
  const jpeg = new Uint8Array([255,216,255,192,0,8,8,0,156,2,208,0]); assert.deepEqual(pitchRasterDimensions(jpeg), { width: 720, height: 156 });
  assert.equal(pitchRasterDimensions(new Uint8Array([1, 2, 3])), null);
});
test('image curve keeps continuous pitch and blank gaps and marks estimates', () => {
  const image = graph(); assert.equal(curveGrid(image).length, 6);
  const recording = traceCurvePixels(image, { rows: 1, pitchAxis: { midiAtTop: 72, semitonesPerPixel: -12 / 218 }, singleRowMs: 2200 });
  assert.equal(recording.durationMs, 2200); assert.equal(recording.frames.length, 651);
  assert.ok(recording.frames.some(frame => frame.frequencyHz === null));
  const expected = 440 * 2 ** ((72 - 145 * 12 / 218 - 69) / 12);
  assert.ok(Math.abs(recording.frames[10].frequencyHz - expected) < .001);
  assert.deepEqual(recording.reconstruction, { method: 'image-curve', pitchScale: 'axis', timeScale: 'axis' });
  const assumed = traceCurvePixels(image, { rows: 1 }); assert.equal(assumed.durationMs, 12000); assert.equal(assumed.reconstruction.pitchScale, 'assumed'); assert.equal(assumed.reconstruction.timeScale, 'assumed');
  assert.ok(Object.isFrozen(recording.frames));
});
test('empty, absent grid and broad green regions do not become invented melodies', () => {
  const empty = graph(); for (let i = 0; i < empty.data.length; i += 4) if (empty.data[i] === 200) empty.data.set([12, 23, 25, 255], i);
  assert.throws(() => traceCurvePixels(empty, { rows: 1 }), /辨識不到/);
  assert.throws(() => traceCurvePixels({ width: 1440, height: 312, data: new Uint8Array(1440 * 312 * 4) }, { rows: 1 }), /刻度/);
  const broad = graph();
  for (let y = 90; y < 150; y++) for (let x = 100; x <= 1400; x++) broad.data.set([200, 241, 110, 255], (y * 1440 + x) * 4);
  assert.throws(() => traceCurvePixels(broad, { rows: 1 }), /辨識不到/);
});
test('glyph comparison distinguishes shape while identical glyphs have no error', () => {
  const image = graph();
  for (let y = 10; y <= 20; y++) for (let x = 10; x <= 16; x++) image.data.set([163, 184, 174, 255], (y * 1440 + x) * 4);
  const glyph = curveGlyph(image, { x: 8, y: 8, width: 20, height: 20 });
  assert.ok(glyph); assert.equal(curveGlyphScore(glyph, glyph), 0); assert.equal(curveGlyphScore(glyph, null), 2);
});
test('approximate provenance survives PNG / JSON v2 and never downgrades to original v1', async () => {
  const recording = traceCurvePixels(graph(), { rows: 1, singleRowMs: 2200 });
  const text = pitchDocument(recording); assert.equal(JSON.parse(text).version, 2);
  assert.deepEqual(parsePitchDocument(text).reconstruction, recording.reconstruction);
  const png = new Uint8Array(await readFile(new URL('../assets/favicon-32.png', import.meta.url)));
  assert.deepEqual((await importPlayablePitch(new File([embedPitchPng(png, recording)], 'data.png'))).reconstruction, recording.reconstruction);
  assert.throws(() => parsePitchDocument(JSON.stringify({ ...JSON.parse(text), version: 1 })), /版本 2/);
  assert.throws(() => parsePitchDocument(JSON.stringify({ ...JSON.parse(text), reconstruction: {} })), /標記/);
  const original = { durationMs: 1000, frames: [{ timeMs: 0, frequencyHz: 440 }] };
  assert.equal(JSON.parse(pitchDocument(original)).version, 1);
  assert.equal((await importPlayablePitch(new File([embedPitchPng(png, original)], 'tiny.png'))).frames[0].frequencyHz, 440, 'embedded data wins without image decode, even for an otherwise unsupported image layout');
});
