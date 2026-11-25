// The hub. Input arrives as units or presses; the current screen decides what they mean.
//
//   Input Adapter → GameController → Screen (UI state) / Lock (inside the unlock screen)
//                                  → SafeStage (renderer) / AudioEngine / Dispatch
//
// Screens are plain objects: { mode, dialSize?, enter(params), exit(), rotate(units, info),
// press(kind, info), frame(dt, t) }. Exactly one is active.

import { LINES, pickLine, CHIEF } from '../game/dialogue.js';

export class GameController {
  constructor({ stage, sheet, dispatch, audio, save, input, serial, toast, controls }) {
    Object.assign(this, { stage, sheet, dispatch, audio, save, input, serial, toast, controls });
    this.screens = {};
    this.screen = null;
    this.screenName = null;
    this.dialAbs = 0; // where the dial visually rests, in graduations of the current dial
    this.busy = false; // true while a ceremony runs and input should be ignored
    this.lineTimer = null;
    this.lastFastLine = 0;
    this.reducedMotion =
      save.settings.reducedMotion || (globalThis.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);
    input.onRotate((units, info) => this.handleRotate(units, info));
    input.onPress((kind, info) => this.handlePress(kind, info));
  }

  register(name, screen) {
    screen.game = this;
    this.screens[name] = screen;
  }

  go(name, params = {}, dir = 1) {
    const next = this.screens[name];
    if (!next) return;
    if (this.screen && this.screen.exit) this.screen.exit();
    this.screen = next;
    this.screenName = name;
    this.input.setMode(next.mode === 'nav' ? 'nav' : 'dial', next.dialSize || this.stage.size);
    this.navDir = dir;
    next.enter(params, dir);
    this.controls.dataset.screen = name;
  }

  // Swap the dossier page with a short slide. dir > 0 goes deeper, dir < 0 comes back.
  page(html, dir = this.navDir || 1, cls = '') {
    const el = document.createElement('div');
    el.className = `page ${cls}`;
    el.innerHTML = html;
    const old = this.sheet.querySelector('.page:not(.leaving)');
    if (old && !this.reducedMotion) {
      old.classList.add('leaving', dir > 0 ? 'to-up' : 'to-down');
      setTimeout(() => old.remove(), 260);
    } else if (old) old.remove();
    el.classList.add(dir > 0 ? 'from-down' : 'from-up');
    this.sheet.appendChild(el);
    this.sheet.scrollTop = 0;
    requestAnimationFrame(() => el.classList.add('in'));
    return el;
  }

  handleRotate(units, info) {
    if (!this.screen || this.busy) return;
    if (info.source !== 'pointer' && Math.abs(units) >= 3 && this.screen.mode !== 'nav') this.noteSpeed();
    this.screen.rotate(units, info);
  }

  handlePress(kind, info) {
    this.audio.unlock();
    if (!this.screen) return;
    if (this.busy && !this.screen.pressWhileBusy) return;
    this.screen.press(kind, info);
  }

  // The dial follows menu travel: one menu detent = a tenth of a revolution.
  spinNav(steps) {
    this.dialAbs += steps * (this.stage.size / 10);
  }

  frame(dt, t) {
    if (this.screen && this.screen.frame) this.screen.frame(dt, t);
    const unit = this.input.mode === 'dial' ? 1 : this.stage.size / 10;
    this.stage.setDial(this.dialAbs + this.input.fraction * unit);
    this.stage.frame(dt, this.reducedMotion);
  }

  // ---- the chief speaks ---------------------------------------------------------------

  say(lines, { hold = false } = {}) {
    if (!Array.isArray(lines)) lines = [lines];
    const text = lines.filter(Boolean).join('　');
    clearInterval(this.lineTimer);
    const d = this.dispatch;
    d.innerHTML = `<span class="who">${CHIEF.title}　${CHIEF.name}</span><span class="line"></span>`;
    const lineEl = d.querySelector('.line');
    if (this.reducedMotion) {
      lineEl.textContent = text;
      return;
    }
    let i = 0;
    this.lineTimer = setInterval(() => {
      i += 1;
      lineEl.textContent = text.slice(0, i);
      if (i >= text.length) clearInterval(this.lineTimer);
    }, 26);
    this.lineHeld = hold;
  }

  sayFrom(key, seed) {
    this.say(pickLine(LINES[key], seed));
  }

  noteSpeed() {
    const now = performance.now();
    if (now - this.lastFastLine < 9000) return;
    this.lastFastLine = now;
    this.save.data.stats.fastSpins += 1;
    this.say(pickLine(LINES.fast));
  }

  notify(text) {
    const t = this.toast;
    t.textContent = text;
    t.classList.remove('show');
    void t.offsetWidth;
    t.classList.add('show');
    clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(() => t.classList.remove('show'), 2600);
  }

  // Context used by missions that read the player's archive (safe 000).
  archiveContext() {
    return {
      distinct: this.save.distinctArtifacts,
      opened: this.save.data.stats.opened,
      potatoes: this.save.artifactCount('artifact-001'),
    };
  }
}
