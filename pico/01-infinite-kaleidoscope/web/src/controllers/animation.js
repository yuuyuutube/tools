import { clamp, smooth } from './artwork.js';
import { BLOOM_START } from './bloom.js';

function approach(current, target, seconds, response) {
  const next = current + (target - current) * (1 - Math.exp(-seconds * response));
  return Math.abs(target - next) < 0.0005 ? target : next;
}

export class Animation {
  position;
  phase;
  bloomProgress;
  transition = 1;
  #lastTime = null;
  #elapsed = 0.72;

  constructor(state) {
    this.reset(state);
  }

  reset(state) {
    this.position = state.position;
    this.phase = state.phase;
    this.bloomProgress = state.bloomProgress ?? BLOOM_START.bloomProgress;
  }

  beginTransition() {
    this.#elapsed = 0;
    this.transition = 0;
  }

  finishTransition() {
    this.#elapsed = 0.72;
    this.transition = 1;
  }

  suspend() {
    this.#lastTime = null;
  }

  step(now, state, { demo, reduced }) {
    const seconds = this.#lastTime === null ? 0 : clamp((now - this.#lastTime) / 1000, 0, 0.05);
    this.#lastTime = now;
    const bloom = state.engine === 'bloom';
    const bloomTarget = state.bloomProgress ?? BLOOM_START.bloomProgress;
    const playing = !bloom && demo && !reduced;
    if (playing) {
      state.position += seconds * (0.28 + 0.11 * Math.sin(this.phase * 0.071));
      this.phase += seconds;
    }
    this.position = reduced ? state.position : approach(this.position, state.position, seconds, 14);
    if (bloom) {
      this.bloomProgress = reduced ? bloomTarget : approach(this.bloomProgress, bloomTarget, seconds, 28);
    }
    this.#elapsed += seconds;
    this.transition = reduced ? 1 : smooth(Math.min(1, this.#elapsed / 0.72));
    const moving = bloom ? this.bloomProgress !== bloomTarget : this.position !== state.position;
    return this.transition < 1 || moving || playing;
  }
}
