import { Animation } from './controllers/animation.js';
import { clamp, engines, initialArtwork, newSeed, restoreState, stateURL } from './controllers/artwork.js';
import { BLOOM_START, BLOOM_STYLES, changeBloomProgress } from './controllers/bloom.js';
import { createPalettePicker } from './controllers/palette-picker.js';
import { ArtworkRenderer } from './engines/renderer.js';
import { knobInput } from './hardware/protocol.js';
import { SerialConnection } from './hardware/serial.js';
import { palettes } from './palettes/index.js';

const byId = (id) => document.getElementById(id);
const gallery = byId('gallery');
const stage = byId('stage');
const canvas = byId('artwork');
const connectButton = byId('connect');
const engineButtons = document.querySelectorAll('[data-engine]');
const notice = byId('notice');
const guide = byId('guide');
const helpButton = byId('help-toggle');
const motionSwitch = byId('motion');
const demoSwitch = byId('demo');
const restoreInput = byId('restore-link');
const restoreFeedback = byId('restore-feedback');
const fullscreenButton = byId('fullscreen');
const bloomStyleControl = byId('bloom-style-control');
const stepBack = byId('back');
const stepForward = byId('forward');
const motionQuery = matchMedia('(prefers-reduced-motion: reduce)');

const readPreference = (key) => {
  try { return localStorage.getItem(key); } catch { return null; }
};
const savePreference = (key, value) => {
  try { localStorage.setItem(key, value); } catch { /* Private storage can be unavailable. */ }
};

const saved = restoreState(location.href, location.href);
let artwork = { ...BLOOM_START, ...(saved ?? initialArtwork) };
const animation = new Animation(artwork);
let motionPreference = readPreference('weird-lab-motion');
const playback = {
  reduced: motionPreference === null ? motionQuery.matches : motionPreference === 'reduced',
  demo: !saved,
};
if (playback.reduced) playback.demo = false;

let request = null;
let announcementTimer;
let wheel = 0;
let drag = null;
let serialStatus = 'idle';
let guideFocus = null;
let inPageExhibit = false;
const serialAPI = navigator.serial;
const serial = new SerialConnection(serialAPI, (event) => knobInput(event, dialActions), setSerialStatus);
const renderer = new ArtworkRenderer(canvas, schedule);

const palettePicker = createPalettePicker(byId('palette-control'), palettes, (id) => {
  if (artwork.palette !== id) transitionTo({ ...artwork, palette: id });
}, () => {
  toggleGuide(false);
  stylePicker.close();
});

const styles = BLOOM_STYLES.map((style) => ({
  ...style, colors: palettes.find(({ id }) => id === style.palette).colors,
}));
const stylePicker = createPalettePicker(bloomStyleControl, styles, (id) => controls.setBloomStyle(id), () => {
  toggleGuide(false);
  palettePicker.close();
}, 'Bloom style');

function schedule() {
  if (request === null && !document.hidden) request = requestAnimationFrame(render);
}

function render(now) {
  request = null;
  const moving = animation.step(now, artwork, playback);
  draw();
  if (moving) schedule();
  else animation.suspend();
}

function draw() {
  renderer.draw(artwork, animation);
}

function announce(text) {
  clearTimeout(announcementTimer);
  notice.textContent = text;
  notice.hidden = false;
  announcementTimer = setTimeout(() => { notice.hidden = true; }, 3600);
}

function syncControls() {
  for (const button of engineButtons) {
    button.setAttribute('aria-pressed', button.dataset.engine === artwork.engine);
  }
  const bloom = artwork.engine === 'bloom';
  const name = bloom ? 'Eternal Bloom' : artwork.engine[0].toUpperCase() + artwork.engine.slice(1);
  canvas.setAttribute('aria-label', name + ' generative artwork');
  byId('bloom-guide').hidden = !bloom;
  byId('pico-dial-guide').textContent = bloom
    ? 'Turn to bloom or retract, tap to switch patterns, hold to change Bloom style.'
    : 'Turn to evolve, tap to switch, hold to shuffle.';
  bloomStyleControl.hidden = !bloom;
  const stepGroup = stepBack.parentElement;
  stepGroup.setAttribute('aria-label', bloom ? 'Bloom progress' : 'Evolve artwork');
  setActionLabel(stepBack, bloom ? 'Retract Bloom' : 'Evolve backward');
  setActionLabel(stepForward, bloom ? 'Expand Bloom' : 'Evolve forward');
  palettePicker.select(artwork.palette);
  stylePicker.select(artwork.bloomStyle);
  syncPlayback();
}

function syncPlayback() {
  demoSwitch.setAttribute('aria-checked', playback.demo);
  demoSwitch.disabled = playback.reduced;
  demoSwitch.hidden = artwork.engine === 'bloom';
  motionSwitch.setAttribute('aria-checked', playback.reduced);
}

function setActionLabel(button, label) {
  button.setAttribute('aria-label', label);
  button.dataset.tooltip = label;
}

function pauseDemo() {
  if (!playback.demo) return;
  playback.demo = false;
  syncPlayback();
}

function transitionTo(next) {
  playback.demo = false;
  if (!playback.reduced && renderer.frame) {
    renderer.holdPrint();
    animation.beginTransition();
  }
  artwork = next;
  syncControls();
  schedule();
}

const controls = {
  rotate(delta) {
    pauseDemo();
    if (artwork.engine === 'bloom') {
      artwork.bloomProgress = changeBloomProgress(artwork.bloomProgress, delta);
    } else {
      artwork.position = clamp(artwork.position + delta, -1e9, 1e9);
    }
    schedule();
  },
  setEngine(engine) {
    if (engine === artwork.engine) return;
    transitionTo({ ...artwork, engine, bloomProgress: animation.bloomProgress });
  },
  cycleEngine() {
    controls.setEngine(engines[(engines.indexOf(artwork.engine) + 1) % engines.length]);
  },
  setBloomStyle(id) {
    const style = BLOOM_STYLES.find((entry) => entry.id === id);
    if (artwork.bloomStyle !== id || artwork.palette !== style.palette) {
      transitionTo({ ...artwork, bloomStyle: id, palette: style.palette });
    }
  },
  longPress() {
    if (artwork.engine !== 'bloom') {
      controls.newUniverse();
      return;
    }
    const index = BLOOM_STYLES.findIndex(({ id }) => id === artwork.bloomStyle);
    controls.setBloomStyle(BLOOM_STYLES[(index + 1) % BLOOM_STYLES.length].id);
  },
  newUniverse() {
    const seed = newSeed();
    const palette = artwork.engine === 'bloom' ? artwork.palette : palettes[(seed >>> 16) % palettes.length].id;
    transitionTo({ ...artwork, seed, palette, position: 0, phase: 0, bloomProgress: BLOOM_START.bloomProgress });
    animation.reset(artwork);
  },
};

// The dial's long press uses the current mode; the shuffle button and R still always change Seed.
const dialActions = { ...controls, newUniverse: controls.longPress };

function setSerialStatus(status) {
  serialStatus = status;
  const messages = {
    idle: ['Connect Pico', 'Pico disconnected'],
    opening: ['Connecting…', 'Choose the Pico serial port'],
    connected: ['Disconnect Pico', 'Pico connected'],
    closing: ['Disconnecting…', 'Closing the serial port'],
    unplugged: ['Reconnect Pico', 'Pico unplugged'],
    error: ['Retry Pico', 'Serial port unavailable. Close MicroPico and try again.'],
    unsupported: ['Connect Pico', 'Use desktop Chrome on localhost to connect a Pico.'],
  };
  const [label, detail] = messages[status];
  connectButton.setAttribute('aria-label', label);
  connectButton.dataset.tooltip = label;
  byId('serial-status').textContent = detail;
  connectButton.dataset.status = status;
  connectButton.disabled = status === 'opening' || status === 'closing';
  if (status === 'error' || status === 'unplugged') announce(detail);
}

function toggleGuide(open, focus = false) {
  if (open === !guide.hidden) return;
  if (open) {
    palettePicker.close();
    stylePicker.close();
    guideFocus = document.activeElement;
  }
  const returnFocus = !open && focus && guide.contains(document.activeElement);
  guide.hidden = !open;
  helpButton.setAttribute('aria-expanded', open);
  if (open && focus) byId('close-guide').focus();
  if (returnFocus) (guideFocus instanceof HTMLButtonElement ? guideFocus : helpButton).focus();
  if (!open) guideFocus = null;
}

function updateMotion() {
  playback.reduced = motionPreference === null ? motionQuery.matches : motionPreference === 'reduced';
  if (playback.reduced) pauseDemo();
  syncPlayback();
  schedule();
}

function syncExhibit() {
  const active = inPageExhibit || document.fullscreenElement === gallery;
  gallery.classList.toggle('exhibit', active);
  fullscreenButton.setAttribute('aria-label', active ? 'Exit fullscreen' : 'Enter fullscreen');
  fullscreenButton.dataset.tooltip = active ? 'Exit fullscreen' : 'Fullscreen';
  fullscreenButton.querySelector('use').setAttribute('href', './icons.svg#' + (active ? 'shrink' : 'fullscreen'));
  schedule();
}

async function fullscreen() {
  if (inPageExhibit) {
    inPageExhibit = false;
    syncExhibit();
    return;
  }
  try {
    if (document.fullscreenElement === gallery) await document.exitFullscreen();
    else await gallery.requestFullscreen();
  } catch {
    inPageExhibit = document.fullscreenElement !== gallery;
    syncExhibit();
  }
}

function printFrame() {
  // A transition is a blend of two states. Commit to its destination before recording it.
  if (animation.transition < 1) animation.finishTransition();
  draw();
  return renderer.frame ? { ...renderer.frame } : null;
}

async function copyPrint() {
  const frame = printFrame();
  if (!frame) return;
  const url = stateURL(frame, location.href).href;
  try {
    await navigator.clipboard.writeText(url);
    announce('Link copied');
  } catch {
    toggleGuide(true);
    restoreInput.value = url;
    showRestoreError('');
    restoreInput.focus();
    restoreInput.select();
    announce('Copy the selected link.');
  }
}

async function savePrint() {
  const frame = printFrame();
  if (!frame) return;
  try {
    const blob = await renderer.capture();
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const name = frame.engine === 'bloom' ? frame.engine + '-' + frame.bloomStyle : frame.engine;
    link.download = 'weird-lab-' + name + '-' + frame.seed + '.png';
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 30000);
    announce('PNG ready');
  } catch {
    announce('The PNG could not be encoded. Try again.');
  }
}

for (const button of engineButtons) button.addEventListener('click', () => controls.setEngine(button.dataset.engine));
stepBack.addEventListener('click', () => controls.rotate(-1));
stepForward.addEventListener('click', () => controls.rotate(1));
byId('regenerate').addEventListener('click', controls.newUniverse);
byId('copy').addEventListener('click', copyPrint);
byId('save').addEventListener('click', savePrint);
fullscreenButton.addEventListener('click', fullscreen);
document.addEventListener('fullscreenchange', syncExhibit);

helpButton.addEventListener('click', () => toggleGuide(guide.hidden, true));
byId('close-guide').addEventListener('click', () => toggleGuide(false, true));
document.addEventListener('pointerdown', (event) => {
  if (!guide.contains(event.target) && !helpButton.contains(event.target)) toggleGuide(false);
});
connectButton.addEventListener('click', () => {
  if (!serialAPI) announce('Use desktop Chrome on localhost to connect a Pico.');
  else if (serialStatus === 'connected') void serial.disconnect();
  else void serial.connect();
});
demoSwitch.addEventListener('click', () => {
  playback.demo = !playback.demo;
  syncPlayback();
  schedule();
});
motionSwitch.addEventListener('click', () => {
  motionPreference = playback.reduced ? 'full' : 'reduced';
  savePreference('weird-lab-motion', motionPreference);
  updateMotion();
});
motionQuery.addEventListener('change', updateMotion);

function showRestoreError(message) {
  restoreFeedback.textContent = message;
  if (message) restoreInput.setAttribute('aria-invalid', 'true');
  else restoreInput.removeAttribute('aria-invalid');
}

byId('restore-form').addEventListener('submit', (event) => {
  event.preventDefault();
  const value = restoreInput.value.trim();
  const state = value && restoreState(value, location.href);
  if (!state) {
    showRestoreError(value ? 'Enter a valid pattern link.' : 'Paste a pattern link.');
    restoreInput.focus();
    return;
  }
  showRestoreError('');
  animation.reset(state);
  transitionTo({ ...BLOOM_START, ...state });
  history.replaceState(null, '', stateURL(state, location.href));
  toggleGuide(false, true);
  announce('Pattern restored');
});
restoreInput.addEventListener('input', () => showRestoreError(''));

canvas.addEventListener('wheel', (event) => {
  if (event.ctrlKey || event.metaKey) return;
  event.preventDefault();
  const units = event.deltaMode === 1 ? event.deltaY * 16 : event.deltaMode === 2 ? event.deltaY * 100 : event.deltaY;
  wheel += clamp(units, -220, 220);
  const steps = Math.trunc(wheel / 38);
  if (steps) {
    wheel -= steps * 38;
    controls.rotate(steps);
  }
}, { passive: false });

canvas.addEventListener('pointerdown', (event) => {
  if (!event.isPrimary || event.button !== 0) return;
  drag = { id: event.pointerId, x: event.clientX, y: event.clientY, current: 0, axis: null };
  canvas.setPointerCapture(event.pointerId);
});
canvas.addEventListener('pointermove', (event) => {
  if (!drag || drag.id !== event.pointerId) return;
  const dx = event.clientX - drag.x;
  const dy = drag.y - event.clientY;
  if (!drag.axis && Math.max(Math.abs(dx), Math.abs(dy)) > 10) {
    drag.axis = Math.abs(dx) >= Math.abs(dy) ? 'x' : 'y';
  }
  if (!drag.axis) return;
  const steps = Math.trunc((drag.axis === 'x' ? dx : dy) / 17);
  if (steps !== drag.current) {
    controls.rotate(steps - drag.current);
    drag.current = steps;
  }
});
for (const type of ['pointerup', 'pointercancel', 'lostpointercapture']) {
  canvas.addEventListener(type, (event) => { if (drag?.id === event.pointerId) drag = null; });
}

document.addEventListener('keydown', (event) => {
  if (event.defaultPrevented) return;
  if (event.key === 'Escape') {
    if (!guide.hidden) toggleGuide(false, true);
    else if (inPageExhibit) void fullscreen();
    return;
  }
  if (event.ctrlKey || event.altKey || event.metaKey || event.isComposing ||
      event.target.isContentEditable || event.target.closest('input, textarea, [role="listbox"]') ||
      (event.code === 'Space' && event.target.closest('button, a'))) return;
  const key = event.key.toLowerCase();
  if (event.key === 'ArrowLeft') controls.rotate(-1);
  else if (event.key === 'ArrowRight') controls.rotate(1);
  else if (!event.repeat && event.code === 'Space') controls.cycleEngine();
  else if (!event.repeat && key === 'r') controls.newUniverse();
  else if (!event.repeat && key === 'h') toggleGuide(guide.hidden, true);
  else if (!event.repeat && key === 'f') void fullscreen();
  else return;
  event.preventDefault();
});

document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    if (request !== null) cancelAnimationFrame(request);
    request = null;
    animation.suspend();
  } else {
    schedule();
  }
});
new ResizeObserver(schedule).observe(stage);
window.addEventListener('resize', schedule);

setSerialStatus(serialAPI ? 'idle' : 'unsupported');
syncControls();
schedule();
