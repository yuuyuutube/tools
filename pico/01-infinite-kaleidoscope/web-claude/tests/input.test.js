import test from 'node:test';
import assert from 'node:assert/strict';
import { LineDecoder, parseEvent } from '../src/input/protocol.js';
import { PicoSerial } from '../src/input/serial.js';

test('line decoder handles chunks split anywhere, CRLF and blank lines', () => {
  const d = new LineDecoder();
  const text = '{"type":"rotate","delta":1}\r\n\n{"type":"press","kind":"short"}\n{"type":"rot';
  const lines = [];
  for (const ch of text) lines.push(...d.push(ch));
  assert.deepEqual(lines, ['{"type":"rotate","delta":1}', '{"type":"press","kind":"short"}']);
  assert.deepEqual(d.push('ate","delta":-3}\n'), ['{"type":"rotate","delta":-3}']);
});

test('line decoder drops an over-long line and resyncs on the next newline', () => {
  const d = new LineDecoder(32);
  assert.deepEqual(d.push('x'.repeat(40)), []);
  assert.deepEqual(d.push('yyy\n{"type":"press","kind":"long"}\n'), ['{"type":"press","kind":"long"}']);
});

test('parseEvent accepts the four protocol events and integer deltas of any size', () => {
  assert.deepEqual(parseEvent('{"type":"rotate","delta":1}'), { type: 'rotate', delta: 1 });
  assert.deepEqual(parseEvent('{"type":"rotate","delta":-1}'), { type: 'rotate', delta: -1 });
  assert.deepEqual(parseEvent('{"type":"rotate","delta":7}'), { type: 'rotate', delta: 7 });
  assert.deepEqual(parseEvent('{"type":"rotate","delta":-12}'), { type: 'rotate', delta: -12 });
  assert.deepEqual(parseEvent('{"type":"press","kind":"short"}'), { type: 'press', kind: 'short' });
  assert.deepEqual(parseEvent('{"type":"press","kind":"long"}'), { type: 'press', kind: 'long' });
});

test('parseEvent rejects malformed or foreign lines', () => {
  for (const bad of [
    '', 'MicroPython v1.29.0 on 2026-01-01', '>>> ', '{"type":"rotate","delta":1.5}', '{"type":"rotate","delta":"1"}',
    '{"type":"rotate","delta":0}', '{"type":"press","kind":"double"}', '{"type":"hello"}', '{broken', 'null', '[1]',
  ]) assert.equal(parseEvent(bad), null, bad);
});

// ---- Web Serial adapter against a fake port -------------------------------------
function fakeSerial() {
  const listeners = {};
  const enc = new TextEncoder();
  let push, fail;
  const port = {
    opened: 0,
    closed: 0,
    signals: null,
    readable: null,
    async open() {
      this.opened++;
      this.readable = new ReadableStream({
        start(c) {
          push = (t) => c.enqueue(enc.encode(t));
          fail = () => c.error(Object.assign(new Error('lost'), { name: 'NetworkError' }));
        },
      });
    },
    async setSignals(s) { this.signals = s; },
    async close() { this.closed++; this.readable = null; },
    getInfo: () => ({ usbVendorId: 0x2e8a, usbProductId: 5 }),
  };
  const serial = {
    requests: 0,
    async requestPort(opts) { this.requests++; this.lastFilter = opts; return port; },
    addEventListener(type, fn) { listeners[type] = fn; },
    emit(type) { listeners[type] && listeners[type]({ target: port }); },
  };
  return { serial, port, push: (t) => push(t), fail: () => fail() };
}
const tick = () => new Promise((r) => setTimeout(r, 5));

test('serial adapter connects once, decodes split packets and disconnects cleanly', async () => {
  const f = fakeSerial();
  const events = [];
  const statuses = [];
  const pico = new PicoSerial({ serial: f.serial, onEvent: (e) => events.push(e), onStatus: (s) => statuses.push(s) });
  await Promise.all([pico.connect(), pico.connect()]); // a double click must not open twice
  assert.equal(f.serial.requests, 1);
  assert.equal(f.port.opened, 1);
  assert.deepEqual(f.serial.lastFilter, { filters: [{ usbVendorId: 0x2e8a }] });
  assert.equal(f.port.signals.dataTerminalReady, true);
  f.push('{"type":"rot');
  f.push('ate","delta":3}\n{"type":"press","kind":"long"}\n');
  await tick();
  assert.deepEqual(events, [{ type: 'rotate', delta: 3 }, { type: 'press', kind: 'long' }]);
  await pico.disconnect();
  assert.equal(f.port.closed, 1);
  assert.equal(pico.status, 'idle');
  assert.deepEqual(statuses, ['connecting', 'connected', 'idle']);
});

test('serial adapter survives the device being unplugged', async () => {
  const f = fakeSerial();
  const pico = new PicoSerial({ serial: f.serial });
  await pico.connect();
  f.fail();
  await tick();
  assert.equal(pico.status, 'lost');
  assert.equal(pico.port, null);
  await pico.connect(); // reconnect through the chooser works afterwards
  assert.equal(pico.status, 'connected');
  await pico.disconnect();
});

test('unsupported browsers report it instead of throwing', async () => {
  const pico = new PicoSerial({ serial: null });
  assert.equal(pico.supported, false);
  assert.equal(pico.status, 'unsupported');
  await pico.connect();
});
