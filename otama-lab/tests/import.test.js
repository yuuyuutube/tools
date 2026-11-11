import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { pitchDocument, parsePitchDocument, embedPitchPng, extractPitchPng, importPitchFile, PITCH_FILE_LIMIT } from '../src/live/format.js';
import { pitchSegments, pitchAtPlayback, PitchPlayer } from '../src/live/playback.js';
import { recordingCursor } from '../src/live/export.js';

const take = { durationMs: 1500, frames: [{ timeMs: 100, frequencyHz: 445.123 }, { timeMs: 200, frequencyHz: 890.246 }, { timeMs: 300, frequencyHz: null }, { timeMs: 600, frequencyHz: 220 }, { timeMs: 640, frequencyHz: 230 }, { timeMs: 1200, frequencyHz: 330 }] };
const png = new Uint8Array(await readFile(new URL('../assets/favicon-32.png', import.meta.url)));
const source = JSON.parse(pitchDocument(take));
test('JSON and standard iTXt PNG round-trip exact continuous pitches, rests and time', async () => {
  const expected = parsePitchDocument(pitchDocument(take));
  assert.deepEqual(expected.frames, take.frames); assert.ok(Object.isFrozen(expected.frames));
  const embedded = embedPitchPng(png, take);
  assert.deepEqual(extractPitchPng(embedded), expected);
  assert.deepEqual(await importPitchFile(new File([embedded], 'renamed.anything')), expected);
  assert.deepEqual(await importPitchFile(new File([pitchDocument(take)], 'take.otama.json')), expected);
  assert.deepEqual(png.subarray(0, -12), embedded.subarray(0, png.length - 12), 'original image data remains byte-for-byte');
});
test('old, truncated, corrupted, duplicate-metadata PNG and oversized files fail clearly', async () => {
  assert.throws(() => extractPitchPng(png), /沒有演奏資料/);
  const embedded = embedPitchPng(png, take), damaged = embedded.slice(); damaged[50] ^= 1;
  assert.throws(() => extractPitchPng(damaged), /損壞/);
  assert.throws(() => extractPitchPng(embedded.subarray(0, -4)), /不完整/);
  assert.throws(() => extractPitchPng(embedPitchPng(embedded, take)), /無法讀取/);
  await assert.rejects(importPitchFile({ size: PITCH_FILE_LIMIT + 1, arrayBuffer() { throw new Error('must not read'); } }), /8 MB/);
  await assert.rejects(importPitchFile(new File(['<script>alert(1)</script>'], 'x.png')), /無法讀取/);
});
test('schema rejects unsupported versions, invalid duration, frequencies, ordering and large counts', () => {
  const reject = patch => assert.throws(() => parsePitchDocument(JSON.stringify({ ...source, ...patch })));
  for (const version of [0, 2, '1']) reject({ version });
  for (const durationMs of [-1, 0, 60001, '1500', null]) reject({ durationMs });
  reject({ tuningHz: 442 }); reject({ frames: new Array(6001).fill(null) });
  for (const frequencyHz of [0, -1, 20001, '440', {}, false]) reject({ frames: [{ timeMs: 0, frequencyHz }] });
  for (const frames of [[null], [{ timeMs: 1600, frequencyHz: 440 }], [{ timeMs: -1, frequencyHz: null }], [{ timeMs: 50, frequencyHz: 440 }, { timeMs: 50, frequencyHz: null }]]) reject({ frames });
  assert.equal(parsePitchDocument(JSON.stringify({ ...source, frames: [{ timeMs: 0, frequencyHz: null }] })).hasPitch, false);
});
test('replay interpolates in semitones, retains nonstandard pitch, and never bridges silence or long gaps', () => {
  const segments = pitchSegments(take);
  assert.equal(segments.length, 3);
  assert.equal(pitchAtPlayback(segments, 0), null);
  assert.equal(pitchAtPlayback(segments, 100), 445.123);
  assert.ok(Math.abs(pitchAtPlayback(segments, 150) - 445.123 * Math.sqrt(2)) < 1e-8);
  assert.equal(pitchAtPlayback(segments, 299), 890.246);
  for (const time of [300, 500, 740, 1000, 1300, 1500]) assert.equal(pitchAtPlayback(segments, time), null);
  assert.equal(pitchAtPlayback(segments, 1200), 330);
  assert.equal(recordingCursor({ durationMs: 60000 }, 60000).height, 1432);
  assert.equal(recordingCursor({ durationMs: 60000 }, 60000).x, 1400);
  assert.equal(recordingCursor({ durationMs: 25500 }, 25000).top, 584);
});
test('stop cancels a pending audio unlock, so closing a preview cannot create a late voice', async () => {
  let unlock, voices = 0;
  class Context {
    state = 'running'; addEventListener() {}
    resume() { return new Promise(resolve => { unlock = resolve; }); }
    createOscillator() { voices++; throw new Error('late voice'); }
  }
  const player = new PitchPlayer({ Context });
  const pending = player.play(take); player.stop(); unlock(); await pending;
  assert.equal(voices, 0); assert.equal(player.active, false);
});
