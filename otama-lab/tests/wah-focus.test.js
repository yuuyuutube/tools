import test from 'node:test';
import assert from 'node:assert/strict';
import { bindWahMouthKey } from '../src/wah/keyboard.js';
import { bindWahFocus } from '../src/wah/focus.js';
function key(target, type, props = {}) { const event = new Event(type, { cancelable: true }); Object.assign(event, { key: 'w', code: 'KeyW', ...props }); target.dispatchEvent(event); return event; }
test('hold W works from buttons/ranges and releases across focus changes, without auto-repeat toggling', () => {
  const doc = new EventTarget(), win = new EventTarget(), changes = [];
  const binding = bindWahMouthKey({ documentTarget: doc, windowTarget: win, onChange: value => changes.push(value) });
  key(doc, 'keydown'); key(doc, 'keydown', { repeat: true }); assert.equal(binding.held, true); assert.deepEqual(changes, [true]);
  key(doc, 'keyup'); assert.deepEqual(changes, [true, false]);
  key(doc, 'keydown', { key: 'ㄊ' }); assert.equal(binding.held, true);
  win.dispatchEvent(new Event('blur')); assert.equal(binding.held, false);
  key(doc, 'keydown', { repeat: true }); assert.equal(binding.held, false);
  key(doc, 'keyup'); key(doc, 'keydown'); doc.hidden = true; doc.dispatchEvent(new Event('visibilitychange')); assert.equal(binding.held, false);
  doc.hidden = false; key(doc, 'keydown'); binding.stop(); key(doc, 'keyup'); assert.equal(binding.held, false);
});
test('W does not steal browser shortcuts, text entry, IME composition or dialog input', () => {
  const doc = new EventTarget(), win = new EventTarget(); let dialog = false;
  const binding = bindWahMouthKey({ documentTarget: doc, windowTarget: win, isDialogOpen: () => dialog, onChange() {} });
  for (const props of [{ ctrlKey: true }, { metaKey: true }, { altKey: true }, { isComposing: true }]) { const event = key(doc, 'keydown', props); assert.equal(binding.held, false); assert.equal(event.defaultPrevented, false); }
  dialog = true; key(doc, 'keydown'); assert.equal(binding.held, false); dialog = false;
  doc.closest = () => ({}); key(doc, 'keydown'); assert.equal(binding.held, false);
  doc.closest = () => null; key(doc, 'keydown'); assert.equal(binding.held, true); key(doc, 'keyup');
});
test('focus mode stops before reflow, preserves URL parameters, exits with Escape and tolerates cached HTML', () => {
  const oldDoc = globalThis.document, oldWin = globalThis.window;
  class Target extends EventTarget {
    attrs = {}; focused = false;
    setAttribute(k, v) { this.attrs[k] = v; }
    querySelector() { return this; }
    focus() { this.focused = true; }
  }
  const doc = globalThis.document = new Target(), button = new Target(), neck = new Target(), calls = [];
  let rootActive = false, dialogOpen = false;
  doc.documentElement = { classList: { toggle: (_, state) => { rootActive = state; } } }; doc.querySelector = () => dialogOpen;
  const win = globalThis.window = { location: { href: 'https://example.com/tools/otama-lab/wah.html?keep=yes#neck' }, history: { state: null, replaceState(_, __, url) { win.location.href = String(url); } } };
  try {
    const focus = bindWahFocus({ button, neck, onChange: value => calls.push({ value, beforeReflow: rootActive }) });
    focus.enter(); assert.equal(focus.active, true); assert.equal(rootActive, true); assert.equal(neck.focused, true);
    assert.equal(new URL(win.location.href).searchParams.get('mode'), 'play'); assert.equal(new URL(win.location.href).searchParams.get('keep'), 'yes'); assert.equal(new URL(win.location.href).hash, '#neck');
    assert.deepEqual(calls[0], { value: true, beforeReflow: false });
    dialogOpen = true; key(doc, 'keydown', { key: 'Escape', code: 'Escape' }); assert.equal(focus.active, true);
    dialogOpen = false; key(doc, 'keydown', { key: 'Escape', code: 'Escape' }); assert.equal(focus.active, false); assert.equal(button.focused, true);
    assert.equal(new URL(win.location.href).searchParams.has('mode'), false);
    assert.equal(bindWahFocus({ button: null }).active, false);
  } finally { globalThis.document = oldDoc; globalThis.window = oldWin; }
});
