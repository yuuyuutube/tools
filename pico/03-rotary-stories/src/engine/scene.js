// Base class for a story scene. A scene owns its DOM, its rendering technique (CSS, SVG,
// Canvas, WebGL — whatever suits it), its interaction models and its sounds.
//
// Lifecycle (driven by StoryPlayer):
//   enter()            build DOM, start ambience; this.state holds what saveState() returned last time
//   rotate(deg, info)  knob degrees, clockwise positive; info = { source, speed, continuous?, detents? }
//   press(kind)        'short' | 'long'; return true when handled. An unhandled long press opens the pause menu
//   frame(dt, t)       once per animation frame while the scene is on screen
//   saveState()        small JSON needed to resume this scene
//   beforeNext()       optional async step before the player moves on (e.g. closing a shutter)
//   leave()            tear down; the Disposer removes listeners, timers and sounds automatically
import { Disposer } from './disposer.js';

export class Scene {
  constructor(ctx) {
    this.ctx = ctx;
    this.d = new Disposer();
    this.audio = ctx.audio; // AudioScope owned by this scene
    this.state = ctx.state || {};
    this.root = ctx.root;
    this.d.add(() => this.audio.dispose(0.5));
  }

  get reduced() {
    return this.ctx.reduced();
  }

  async enter() {}
  rotate() {}
  press() {
    return false;
  }
  frame() {}
  saveState() {
    return this.state;
  }
  resize() {}

  hint(text) {
    this.ctx.hint(text);
  }

  caption(text, hold) {
    this.ctx.caption(text, hold);
  }

  next() {
    this.ctx.next();
  }

  leave() {
    this.d.run();
  }
}
