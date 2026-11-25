// Base for every screen that is a turning list: rotate = move, short = select, long = back.
import { RotaryList } from './rotary-list.js';

export class ListPage {
  constructor() {
    this.mode = 'nav';
  }

  // Subclasses return { head, foot, items, index, render, cls, itemH }.
  build() {
    return { head: '', items: [], render: () => '' };
  }

  enter(params = {}, dir = 1) {
    this.params = params;
    const cfg = this.build(params);
    this.cfg = cfg;
    const page = this.game.page(`<div class="list-page ${cfg.cls || ''}">${cfg.head || ''}<div class="list-slot"></div>${cfg.foot || ''}</div>`, dir);
    this.pageEl = page;
    this.list = new RotaryList({
      items: cfg.items,
      index: cfg.index || 0,
      itemH: cfg.itemH || 58,
      render: cfg.render,
      onSelect: () => this.press('short', { source: 'pointer' }),
      onFocus: (i, item, d, fromPointer) => {
        if (fromPointer) {
          this.game.audio.menuTick(Math.sign(d));
          this.game.spinNav(d);
        }
        this.focusChanged && this.focusChanged(item, i, d);
      },
      onBump: () => this.game.audio.bump(),
    });
    this.list.onDragSteps = (steps) => this.rotate(steps, { source: 'touch' });
    page.querySelector('.list-slot').appendChild(this.list.el);
    this.focusChanged && this.focusChanged(this.list.current, this.list.index, 0);
    this.entered && this.entered(params);
  }

  rotate(units) {
    const moved = this.list.move(units);
    if (moved) {
      this.game.audio.menuTick(Math.sign(moved));
      this.game.spinNav(moved);
    }
  }

  press(kind) {
    if (kind === 'short') {
      const item = this.list.current;
      if (!item) return;
      this.select(item, this.list.index);
    } else this.back();
  }

  select() {}
  back() {}

  frame(dt) {
    if (this.list) this.list.frame(dt);
  }
}
