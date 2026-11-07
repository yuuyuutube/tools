import { DEFAULT_RANGE, frequencyAt, positionAt, semitonesFrom, rangeMarkers } from './pitch.js';
const NS = 'http://www.w3.org/2000/svg';
function el(tag, attrs = {}, text) {
  const node = document.createElementNS(NS, tag);
  for (const [key, value] of Object.entries(attrs)) node.setAttribute(key, value);
  if (text != null) node.textContent = text;
  return node;
}
export class PitchPlot {
  constructor(svg, kind, range = DEFAULT_RANGE) {
    this.svg = svg; this.kind = kind; this.range = range;
    this.mount();
    this.observer = new ResizeObserver(() => {
      const width = this.svg.getBoundingClientRect().width < 500 ? 360 : 700;
      if (this.width === width) return;
      this.mount();
      if (this.model) this.setModel(this.model);
      if (this.last) this.update(...this.last);
    });
    this.observer.observe(svg);
  }
  mount() {
    const { svg, kind } = this;
    for (const child of [...svg.children]) if (!['title', 'desc'].includes(child.tagName)) child.remove();
    this.width = svg.getBoundingClientRect().width < 500 ? 360 : 700;
    this.X = x => 58 + x * (this.width - 78);
    svg.setAttribute('viewBox', `0 0 ${this.width} 245`);
    const maxHz = Math.ceil(this.range.top / 250) * 250;
    this.Y = value => 195 - value / (kind === 'frequency' ? maxHz : this.range.semitones) * 165;
    this.value = f => kind === 'frequency' ? f : semitonesFrom(f, this.range.base);
    this.grid = el('g', { 'aria-hidden': 'true' });
    this.octaves = el('g', { 'aria-hidden': 'true' });
    this.curve = el('path', { fill: 'none', stroke: kind === 'frequency' ? '#c8f16e' : '#7edcd2', 'stroke-width': 3, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' });
    this.cross = el('line', { y1: 30, y2: 195, stroke: '#ff997e', 'stroke-dasharray': '4 5' });
    this.horizontal = el('line', { x1: 58, x2: this.width - 20, stroke: '#ff997e', 'stroke-opacity': .35, 'stroke-dasharray': '3 5' });
    this.reference = el('circle', { r: 5, fill: '#0d1d1f', stroke: '#a3b8ae', 'stroke-width': 2 });
    this.dot = el('circle', { r: 6, fill: '#ff997e', stroke: '#0d1d1f', 'stroke-width': 2 });
    svg.append(el('rect', { x: 58, y: 30, width: this.width - 78, height: 165, rx: 6, fill: '#0d1d1f' }), this.grid, this.octaves, this.curve, this.cross, this.horizontal, this.reference, this.dot);
    const textStyle = { fill: '#a3b8ae', 'font-size': 12, 'font-family': 'system-ui, sans-serif' };
    const ticks = kind === 'frequency' ? Array.from({ length: maxHz / 250 + 1 }, (_, i) => i * 250) : rangeMarkers(this.range).map(marker => marker.semitones);
    for (const value of ticks) {
      const y = this.Y(value);
      this.grid.append(el('line', { x1: 58, x2: this.width - 20, y1: y, y2: y, stroke: '#30494a' }), el('text', { ...textStyle, x: 47, y: y + 4, 'text-anchor': 'end' }, value));
    }
    for (let i = 0; i <= 4; i++) {
      const x = this.X(i / 4);
      this.grid.append(el('line', { x1: x, x2: x, y1: 30, y2: 195, stroke: '#30494a', 'stroke-opacity': .6 }), el('text', { ...textStyle, x, y: 217, 'text-anchor': 'middle' }, `${i * 25}%`));
    }
    this.grid.append(el('text', { ...textStyle, x: 58, y: 14 }, kind === 'frequency' ? '頻率（Hz）' : `半音數（相對 ${this.range.lowNote}）`), el('text', { ...textStyle, x: (this.width + 38) / 2, y: 242, 'text-anchor': 'middle' }, '琴頸位置（%）'));
  }
  setModel(model, range = this.range) {
    if (this.range !== range) { this.range = range; this.mount(); }
    this.model = model;
    const points = Array.from({ length: 301 }, (_, i) => {
      const x = i / 300;
      return `${i ? 'L' : 'M'}${this.X(x).toFixed(3)},${this.Y(this.value(frequencyAt(x, model, this.range))).toFixed(3)}`;
    });
    this.curve.setAttribute('d', points.join(' '));
    this.octaves.replaceChildren();
    const markers = rangeMarkers(this.range);
    markers.forEach(({ frequency, note }, i) => {
      const x = this.X(positionAt(frequency, model, this.range)), y = this.Y(this.value(frequency));
      const last = i === markers.length - 1;
      this.octaves.append(el('line', { x1: x, x2: x, y1: y, y2: 195, stroke: '#79948a', 'stroke-dasharray': '2 5', 'stroke-opacity': .45 }), el('text', { x: x + (last ? -7 : 7), y: y - 8, fill: '#a3b8ae', 'font-size': 11, 'text-anchor': last ? 'end' : 'start' }, note));
    });
  }
  update(position, frequency, reference) {
    this.last = [position, frequency, reference];
    const x = this.X(position), y = this.Y(this.value(frequency));
    this.cross.setAttribute('x1', x); this.cross.setAttribute('x2', x);
    this.horizontal.setAttribute('y1', y); this.horizontal.setAttribute('y2', y);
    this.dot.setAttribute('cx', x); this.dot.setAttribute('cy', y);
    this.reference.setAttribute('cx', this.X(positionAt(reference, this.model, this.range)));
    this.reference.setAttribute('cy', this.Y(this.value(reference)));
    this.svg.dataset.range = this.range.id;
    this.svg.dataset.position = position;
    this.svg.dataset.frequency = frequency;
    this.svg.dataset.value = this.value(frequency);
    // Accessible dynamic summary is updated without a live region at drag rate.
    this.svg.querySelector('desc').textContent = `Simulation。琴頸位置 ${(position * 100).toFixed(1)}%，${this.kind === 'frequency' ? `${frequency.toFixed(2)} Hz，絕對頻率` : `${semitonesFrom(frequency, this.range.base).toFixed(2)} 半音，相對 ${this.range.lowNote}`}。空心圓是比較基準，珊瑚色圓點是目前位置。`;
  }
}
