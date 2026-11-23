import assert from 'node:assert/strict';
import test from 'node:test';
import { EventDecoder, knobInput, readEvent } from '../web/src/hardware/protocol.js';
import { SerialConnection } from '../web/src/hardware/serial.js';

const bytes = (text) => new TextEncoder().encode(text);

test('decoder handles split UTF-8, CRLF, garbage, multiple packets, and oversized lines', () => {
  const events = [];
  const decoder = new EventDecoder((event) => events.push(event));
  const stream = bytes('MPY: 重啟\r\n{"type":"rotate","delta":2}\r\n{"type":"press","kind":"short"}\n');
  for (const byte of stream) decoder.push(new Uint8Array([byte]));
  decoder.push(bytes('oversize'.repeat(150)));
  decoder.push(bytes('{"type":"rotate","delta":1}\n{"type":"press","kind":"long"}\n'));
  assert.deepEqual(events, [
    { type: 'rotate', delta: 2 }, { type: 'press', kind: 'short' }, { type: 'press', kind: 'long' },
  ]);
  for (const bad of ['null', '{}', '{"type":"rotate","delta":0}', '{"type":"rotate","delta":"1"}',
    '{"type":"rotate","delta":1025}', '{"type":"rotate","delta":1.9}', '{"type":"press","kind":"double"}']) {
    assert.equal(readEvent(bad), null);
  }
});

test('hardware events use the public artwork controller actions', () => {
  const events = [];
  const controls = {
    rotate: (delta) => events.push(delta),
    cycleEngine: () => events.push('cycle'),
    newUniverse: () => events.push('new'),
  };
  knobInput({ type: 'rotate', delta: -5 }, controls);
  knobInput({ type: 'press', kind: 'short' }, controls);
  knobInput({ type: 'press', kind: 'long' }, controls);
  assert.deepEqual(events, [-5, 'cycle', 'new']);
});

class MockPort extends EventTarget {
  connected = true;

  async open(options) {
    assert.deepEqual(options, { baudRate: 115200 });
    this.createStream();
  }

  createStream() {
    this.readable = new ReadableStream({ start: (controller) => { this.controller = controller; } });
  }

  async close() {
    assert.equal(this.readable?.locked ?? false, false);
    this.readable = null;
  }

  send(text) {
    this.controller.enqueue(bytes(text));
  }

  unplug() {
    this.connected = false;
    this.controller.error(new Error('USB unplugged'));
    this.dispatchEvent(new Event('disconnect'));
  }
}

const waitTask = () => new Promise((resolve) => setImmediate(resolve));

test('serial recovers from framing errors, releases the port on unplug, and reconnects', async () => {
  let port = new MockPort();
  const statuses = [];
  const events = [];
  const serial = new SerialConnection({ requestPort: async () => port },
    (event) => events.push(event), (status) => statuses.push(status));
  await serial.connect();
  port.send('{"type":"rotate",');
  port.send('"delta":-1}\n');
  await waitTask();
  port.controller.error(new Error('Recoverable framing error'));
  port.createStream();
  await waitTask();
  port.send('{"type":"press","kind":"short"}\n');
  await waitTask();
  port.unplug();
  await waitTask();
  assert.equal(port.readable, null);
  assert.equal(statuses.at(-1), 'unplugged');

  port = new MockPort();
  await serial.connect();
  port.send('{"type":"press","kind":"long"}\n');
  await waitTask();
  await serial.disconnect();
  assert.equal(port.readable, null);
  assert.deepEqual(statuses, ['opening', 'connected', 'closing', 'unplugged', 'opening', 'connected', 'closing', 'idle']);
  assert.deepEqual(events, [
    { type: 'rotate', delta: -1 }, { type: 'press', kind: 'short' }, { type: 'press', kind: 'long' },
  ]);
});

test('cancelling the picker and a busy port both allow another connection attempt', async () => {
  const statuses = [];
  const busyPort = { open: async () => { throw new Error('Busy'); } };
  let attempt = 0;
  const serial = new SerialConnection({
    async requestPort() {
      if (!attempt++) throw new DOMException('Cancelled', 'NotFoundError');
      return busyPort;
    },
  }, () => {}, (status) => statuses.push(status));
  await serial.connect();
  await serial.connect();
  assert.deepEqual(statuses, ['opening', 'idle', 'opening', 'error']);
});
