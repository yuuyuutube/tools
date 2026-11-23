// Wiring:  Pico / Mouse / Touch / Keyboard -> input adapters -> ArtController -> engines -> Renderer
import { ArtController } from './core/controller.js';
import { MODES, decodeState, encodeState } from './core/state.js';
import { PALETTES, paletteVector, mixPalette } from './core/palettes.js';
import { randomSeed, seedToHex } from './core/prng.js';
import { Renderer } from './gl/renderer.js';
import { PicoSerial } from './input/serial.js';
import { attachPointer } from './input/pointer.js';
import { attachKeyboard } from './input/keyboard.js';
import { createToolbar } from './ui/toolbar.js';
import { ICONS } from './ui/icons.js';

const canvas = document.getElementById('art');
const uiRoot = document.getElementById('ui');
const hint = document.getElementById('hint');

const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
const fromUrl = decodeState(location.hash);
const controller = new ArtController({ seed: randomSeed(), ...fromUrl });
// Links made by "copy link" / "save PNG" carry f=1: they open frozen at that exact moment.
const frozenLink = new URLSearchParams(location.hash.slice(1)).get('f') === '1';
controller.motion = !reducedMotion && !frozenLink;
if (!fromUrl.dials) {
  const seed = controller.state.seed;
  controller.state.dials = [0, 4 + (seed % 9), ((seed >>> 8) % 7) - 3];
  controller.smooth = controller.state.dials.slice();
}

let renderer;
try {
  renderer = new Renderer(canvas);
} catch (err) {
  console.error(err);
  document.getElementById('fallback').hidden = false;
  uiRoot.remove();
  throw err;
}

// ---- palette crossfade ------------------------------------------------------
const vectors = PALETTES.map(paletteVector);
let paletteFade = null; // { from: vector, start }
let shownPalette = null; // what was last put on screen
const PALETTE_FADE = 0.75;

function currentPalette(now) {
  const to = vectors[controller.state.palette];
  let out = to;
  if (paletteFade) {
    const k = Math.min((now - paletteFade.start) / 1000 / PALETTE_FADE, 1);
    if (k >= 1) paletteFade = null;
    else out = mixPalette(paletteFade.from, to, k * k * (3 - 2 * k));
  }
  shownPalette = out;
  return out;
}

// ---- transitions ------------------------------------------------------------
let transition = null;
const calm = () => reducedMotion || !controller.motion;
const ease = {
  squeegee: (x) => (x < 0.5 ? 4 * x * x * x : 1 - (-2 * x + 2) ** 3 / 2),
  bloom: (x) => 1 - (1 - x) ** 2.2,
  fade: (x) => x * x * (3 - 2 * x),
};

controller.on('mode', ({ from, dir }) => {
  const angle = dir > 0 ? -0.18 : Math.PI + 0.18;
  transition = {
    kind: calm() ? 3 : 1,
    curve: calm() ? ease.fade : ease.squeegee,
    start: performance.now(),
    duration: calm() ? 0.5 : 1.25,
    dir: [Math.cos(angle), Math.sin(angle)],
    from: { kind: 'mode', mode: from, seed: controller.state.seed },
  };
  wake();
});

controller.on('universe', ({ before }) => {
  transition = {
    kind: calm() ? 3 : 2,
    curve: calm() ? ease.fade : ease.bloom,
    start: performance.now(),
    duration: calm() ? 0.6 : 1.9,
    from: { kind: 'universe', mode: before.mode, seed: before.seed, dial: before.dials[before.mode], t: before.t },
  };
  wake();
});

controller.on('palette', ({ from }) => {
  paletteFade = { from: shownPalette || vectors[from], start: performance.now() };
  ui.setPalette(controller.state.palette);
  wake();
});

controller.on('motion', ({ on }) => {
  ui.setMotion(on);
  wake();
});
controller.on('change', () => {
  ui.setMode(controller.state.mode);
  scheduleUrl();
  wake();
});

function viewNow(now) {
  const s = controller.state;
  return {
    mode: s.mode,
    seed: s.seed,
    dial: controller.smooth[s.mode],
    t: s.t,
    palette: currentPalette(now),
  };
}

function transitionFrame(now, view) {
  if (!transition) return null;
  const x = Math.min((now - transition.start) / 1000 / transition.duration, 1);
  if (x >= 1) {
    transition = null;
    return null;
  }
  const f = transition.from;
  const from =
    f.kind === 'mode'
      ? { ...view, mode: f.mode, dial: controller.smooth[f.mode] }
      : { ...view, mode: f.mode, seed: f.seed, dial: f.dial, t: f.t + view.t };
  return { kind: transition.kind, progress: transition.curve(x), dir: transition.dir, from };
}

// ---- sizing & quality --------------------------------------------------------
function resize() {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  renderer.resize(window.innerWidth * dpr, window.innerHeight * dpr);
  wake(true);
}
window.addEventListener('resize', resize);
matchMedia('(resolution: 1dppx)').addEventListener?.('change', resize);

let perf = { frames: 0, time: 0, since: performance.now() };
function tuneQuality(dt, now) {
  // Throttled background tabs deliver frames ~1/s; those say nothing about the GPU.
  if (dt > 0.2) return;
  perf.frames++;
  perf.time += dt;
  if (now - perf.since < 1200) return;
  const avg = perf.time / perf.frames;
  if (perf.frames >= 6 && document.visibilityState === 'visible') {
    if (avg > 0.026) renderer.setQuality(renderer.quality * 0.85);
    else if (avg < 0.0175 && renderer.quality < 1) renderer.setQuality(renderer.quality * 1.06);
  }
  perf = { frames: 0, time: 0, since: now };
}

// ---- main loop ----------------------------------------------------------------
let running = false;
let dirty = true;
let last = performance.now();

function frame(now) {
  const dt = Math.min((now - last) / 1000, 0.1);
  last = now;
  const moving = controller.update(dt);
  const view = viewNow(now);
  const t = transitionFrame(now, view);
  const active = moving || Boolean(t) || Boolean(paletteFade) || dirty;
  if (active) {
    renderer.render(view, t);
    dirty = false;
    if (moving || t) tuneQuality(dt, now);
  }
  ui.setKnob(controller.smooth[controller.state.mode]);
  if (active || transition || paletteFade) requestAnimationFrame(frame);
  else running = false;
}

function wake(force = false) {
  if (force) dirty = true;
  if (running) return;
  running = true;
  last = performance.now();
  requestAnimationFrame(frame);
}

document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') wake(true);
});
canvas.addEventListener('webglcontextlost', (e) => e.preventDefault());
canvas.addEventListener('webglcontextrestored', () => location.reload());

// ---- url ------------------------------------------------------------------------
let urlTimer = 0;
function writeUrl() {
  history.replaceState(null, '', `#${encodeState(controller.snapshot())}`);
}
function scheduleUrl() {
  clearTimeout(urlTimer);
  urlTimer = setTimeout(writeUrl, 700);
}

// ---- export & share --------------------------------------------------------------
let saving = false;
async function savePNG() {
  if (saving) return;
  saving = true;
  ui.setBusy('save', true);
  try {
    const snap = controller.snapshot();
    const view = { mode: snap.mode, seed: snap.seed, dial: snap.dials[snap.mode], t: snap.t, palette: vectors[snap.palette] };
    const scale = Math.max(window.devicePixelRatio || 1, 2);
    let w = window.innerWidth * scale;
    let h = window.innerHeight * scale;
    const k = Math.min(1, 4096 / Math.max(w, h));
    w = Math.round(w * k);
    h = Math.round(h * k);
    const blob = await renderer.exportPNG(view, w, h);
    const name = `kaleidoscope-${MODES[snap.mode]}-${seedToHex(snap.seed)}-${PALETTES[snap.palette].id}-t${snap.t.toFixed(2)}.png`;
    history.replaceState(null, '', `#${encodeState(snap)}&f=1`);
    await deliver(blob, name);
    ui.flash('save');
  } catch (err) {
    console.error(err);
  } finally {
    saving = false;
    ui.setBusy('save', false);
    wake(true);
  }
}

async function deliver(blob, name) {
  const file = new File([blob], name, { type: 'image/png' });
  const touch = matchMedia('(pointer: coarse)').matches;
  if (touch && navigator.canShare && navigator.canShare({ files: [file] })) {
    try {
      await navigator.share({ files: [file] });
      return;
    } catch (err) {
      if (err && err.name === 'AbortError') return;
    }
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}

async function copyLink() {
  clearTimeout(urlTimer);
  history.replaceState(null, '', `#${encodeState(controller.snapshot())}&f=1`);
  try {
    await navigator.clipboard.writeText(location.href);
  } catch {
    /* the address bar already holds the same link */
  }
  ui.flash('link');
}

function toggleFullscreen() {
  if (!document.fullscreenEnabled) return;
  if (document.fullscreenElement) document.exitFullscreen();
  else document.documentElement.requestFullscreen().catch(() => {});
}
document.addEventListener('fullscreenchange', () => ui.setFullscreen(Boolean(document.fullscreenElement)));

// ---- Pico ---------------------------------------------------------------------------
const pico = new PicoSerial({
  onEvent(ev) {
    if (ev.type === 'rotate') controller.rotate(ev.delta, 'pico');
    else if (ev.type === 'press') controller.press(ev.kind, 'pico');
    dismissHint(); // the physical knob never pops the toolbar over the art
  },
  onStatus(status) {
    ui.setPico(status);
  },
});

function picoAction({ any }) {
  if (pico.status === 'connected') pico.disconnect();
  else if (pico.status !== 'connecting') pico.connect({ any });
}

// ---- toolbar visibility -------------------------------------------------------------
let hideTimer = 0;
let uiHidden = false;
function showUI() {
  uiHidden = false;
  uiRoot.classList.remove('hidden');
  document.body.classList.remove('idle');
}
function hideUI() {
  if (ui.inksOpen || uiRoot.matches(':hover') || uiRoot.contains(document.activeElement)) {
    armHide();
    return;
  }
  uiHidden = true;
  uiRoot.classList.add('hidden');
  document.body.classList.add('idle');
}
function armHide(ms = 3600) {
  clearTimeout(hideTimer);
  hideTimer = setTimeout(hideUI, ms);
}
function activity() {
  dismissHint();
  if (matchMedia('(pointer: coarse)').matches) return;
  showUI();
  armHide();
}

// ---- first-run hint --------------------------------------------------------------------
let hinted = false;
hint.innerHTML = ICONS.drag;
const hintTimer = setTimeout(() => {
  if (hinted) return;
  hint.classList.add('show');
  setTimeout(dismissHint, 4200);
}, 2200);
function dismissHint() {
  if (hinted) return;
  hinted = true;
  clearTimeout(hintTimer);
  hint.classList.remove('show');
}

// ---- assemble ------------------------------------------------------------------------------
const ui = createToolbar(uiRoot, {
  mode: (i) => controller.setMode(i, i > controller.state.mode ? 1 : -1, 'ui'),
  palette: (i) => controller.setPalette(i),
  universe: () => controller.press('long', 'ui'),
  save: savePNG,
  link: copyLink,
  motion: () => controller.setMotion(!controller.motion),
  fullscreen: toggleFullscreen,
  pico: picoAction,
  picoSupported: pico.supported,
});
uiRoot.addEventListener('pointerdown', () => {
  clearTimeout(hideTimer);
  dismissHint();
});
uiRoot.addEventListener('pointerleave', () => armHide());

attachPointer(canvas, controller, {
  onActivity: activity,
  onTap: () => {
    dismissHint();
    if (uiHidden) {
      showUI();
      armHide(6000);
    } else hideUI();
  },
});
attachKeyboard(controller, {
  activity,
  save: savePNG,
  link: copyLink,
  fullscreen: toggleFullscreen,
  motion: () => controller.setMotion(!controller.motion),
  toggleUI: () => (uiHidden ? showUI() : hideUI()),
  escape: () => ui.closeInks(),
});

window.addEventListener('hashchange', () => {
  const next = decodeState(location.hash);
  if (next.seed !== undefined && next.seed !== controller.state.seed) {
    Object.assign(controller.state, next);
    controller.smooth = controller.state.dials.slice();
    ui.setMode(controller.state.mode);
    ui.setPalette(controller.state.palette);
    wake(true);
  }
});

ui.setMode(controller.state.mode);
ui.setPalette(controller.state.palette);
ui.setMotion(controller.motion);
ui.setPico(pico.status);
resize();
armHide(5000);
if (!frozenLink) writeUrl();

// Debug / test hook: lets the console (and automated checks) drive the same controller.
window.kaleidoscope = { controller, renderer, pico, savePNG };
