import test from 'node:test';
import assert from 'node:assert/strict';
import { PitchRecording, recordingRows, recordingClock } from '../src/live/recording.js';
import { canSharePitchFile, drawPitchRecording } from '../src/live/export.js';

test('recording retains the full 60 seconds, never just the live 12-second window', () => {
  const recording = new PitchRecording(); recording.start(1000);
  for (let time = 0; time <= 61000; time += 40) recording.add({ timestampMs: 1000 + time, frequencyHz: 440 * 2 ** (Math.sin(time / 1000) / 12) });
  const snapshot = recording.finish(65000);
  assert.equal(snapshot.durationMs, 60000); assert.equal(snapshot.frames.length, 1501);
  assert.equal(snapshot.frames[0].timeMs, 0); assert.equal(snapshot.frames.at(-1).timeMs, 60000);
  assert.equal(snapshot.hasPitch, true); assert.equal(recording.finish(66000), null);
  assert.equal(recordingRows(snapshot).length, 5);
  assert.ok(Object.isFrozen(snapshot.frames));
});
test('recording rejects stale, duplicate and out-of-order frames and preserves non-standard pitch and gaps', () => {
  const recording = new PitchRecording(); recording.start(100);
  for (const [timestampMs, frequencyHz] of [[50, 440], [100, 445.123], [100, 440], [90, 440], [140, null], [180, 445], [500, 446], [700, Infinity]]) recording.add({ timestampMs, frequencyHz });
  const snapshot = recording.finish(800);
  assert.equal(snapshot.frames[0].frequencyHz, 445.123);
  assert.equal(snapshot.frames.length, 5);
  assert.equal(recordingRows(snapshot)[0].segments.length, 3);
  assert.equal(snapshot.frames.at(-1).frequencyHz, null);
});
test('partial final row, exact row boundary, empty recording, and a new take are independent', () => {
  const recording = new PitchRecording(); recording.start(0);
  for (const time of [0, 12000, 24000, 25500]) recording.add({ timestampMs: time, frequencyHz: 440 });
  const snapshot = recording.finish(25500), rows = recordingRows(snapshot);
  assert.equal(rows.length, 3); assert.equal(rows.at(-1).endMs, 25500);
  assert.equal(rows[0].segments.at(-1)[0].timeMs, 12000);
  recording.start(50000);
  const empty = recording.finish(50100); assert.equal(empty.hasPitch, false); assert.equal(empty.frames.length, 0);
  assert.equal(snapshot.frames.length, 4);
  recording.start(60000); assert.equal(recording.elapsed(60123), 123);
  assert.equal(recording.elapsed(130000), 60000);
});
test('clock has a fixed 01:00 cap and file sharing degrades safely', () => {
  assert.equal(recordingClock(0), '00:00'); assert.equal(recordingClock(18200), '00:18');
  assert.equal(recordingClock(61000), '01:00');
  assert.equal(canSharePitchFile({}, {}), false);
  assert.equal(canSharePitchFile({}, { share() {}, canShare: () => true }), true);
  assert.equal(canSharePitchFile({}, { share() {}, canShare() { throw new Error(); } }), false);
});
test('PNG drawing uses five equal pitch scales, real stop time and discontinuous paths without decorative labels', () => {
  const texts = [], lines = []; let strokes = 0;
  const context = new Proxy({ fillText: (...args) => texts.push(args[0]), lineTo: (...args) => lines.push(args), stroke: () => strokes++ }, { get: (target, key) => key in target ? target[key] : () => {} });
  const canvas = { getContext: () => context };
  const recording = new PitchRecording(); recording.start(0);
  for (let time = 0; time <= 60000; time += 40) recording.add({ timestampMs: time, frequencyHz: time % 500 < 100 ? null : 440 * 2 ** (.3 * Math.sin(time / 80) / 12) });
  drawPitchRecording(recording.finish(60000), canvas);
  assert.equal(canvas.width, 1440); assert.equal(canvas.height, 1432);
  assert.ok(texts.includes('60 s')); assert.ok(!texts.some(text => /OTAMA|LAB|Simulation|錄製/.test(text)));
  assert.ok(lines.length > 1000); assert.ok(strokes > 20);
});
