// Collects everything a scene or page sets up, so leaving it tears all of it down:
// event listeners, timers, animation frames, audio nodes, object URLs, child disposers.

export class Disposer {
  constructor() {
    this.items = [];
    this.done = false;
  }

  add(fn) {
    if (this.done) {
      fn();
      return fn;
    }
    this.items.push(fn);
    return fn;
  }

  on(target, type, fn, opts) {
    target.addEventListener(type, fn, opts);
    return this.add(() => target.removeEventListener(type, fn, opts));
  }

  timeout(fn, ms) {
    const id = setTimeout(fn, ms);
    this.add(() => clearTimeout(id));
    return id;
  }

  interval(fn, ms) {
    const id = setInterval(fn, ms);
    this.add(() => clearInterval(id));
    return id;
  }

  child() {
    const d = new Disposer();
    this.add(() => d.run());
    return d;
  }

  run() {
    if (this.done) return;
    this.done = true;
    const items = this.items.splice(0);
    for (let i = items.length - 1; i >= 0; i--) {
      try {
        items[i]();
      } catch (err) {
        console.warn('dispose failed', err);
      }
    }
  }
}
