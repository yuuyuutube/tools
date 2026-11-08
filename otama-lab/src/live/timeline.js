import { pitchOf } from '../pitch.js';

export class PitchHistory {
  constructor(durationMs = 12000) { this.durationMs = durationMs; this.clear(); }
  clear() { this.points = []; this.time = 0; }
  add(frame) {
    this.time = frame.timestampMs;
    this.points.push({ time: frame.timestampMs, midi: frame.frequencyHz ? pitchOf(frame.frequencyHz).midi : null });
    this.points = this.points.filter(point => point.time >= this.time - this.durationMs);
  }
  segments() {
    const segments = []; let segment = null, previous = null;
    for (const point of this.points) {
      if (point.midi === null) { segment = null; previous = null; continue; }
      if (!segment || point.time - previous.time > 200) { segment = []; segments.push(segment); }
      segment.push(point); previous = point;
    }
    return segments;
  }
}

export class PitchTimeline {
  constructor(svg, empty) { this.svg = svg; this.empty = empty; this.history = new PitchHistory(); this.draw(); }
  clear() { this.history.clear(); this.draw(); }
  add(frame) { this.history.add(frame); this.draw(); }
  draw() {
    const history = this.history, width = Math.max(240, this.svg.clientWidth || 700), height = Math.max(100, this.svg.clientHeight || 310);
    const left = 44, right = width - 12, top = 18, bottom = height - 32;
    const voiced = history.points.filter(point => point.midi !== null);
    let low = 55, high = 86;
    if (voiced.length) {
      low = Math.floor(Math.min(...voiced.map(point => point.midi)) - 2);
      high = Math.ceil(Math.max(...voiced.map(point => point.midi)) + 2);
      if (high - low < 6) { const center = (high + low) / 2; low = Math.floor(center - 3); high = low + 6; }
    }
    const x = time => left + (1 - (history.time - time) / history.durationMs) * (right - left);
    const y = midi => bottom - (midi - low) / (high - low) * (bottom - top);
    const step = Math.max(1, Math.ceil((high - low) / 6));
    let grid = '';
    for (let midi = Math.ceil(low / step) * step; midi <= high; midi += step) {
      grid += `<line x1="${left}" x2="${right}" y1="${y(midi)}" y2="${y(midi)}"/><text x="${left - 8}" y="${y(midi) + 4}" text-anchor="end">${pitchOf(440 * 2 ** ((midi - 69) / 12)).note}</text>`;
    }
    for (let seconds = -12; seconds <= 0; seconds += 3) {
      const px = left + (seconds + 12) / 12 * (right - left);
      grid += `<text x="${px}" y="${height - 9}" text-anchor="${seconds === 0 ? 'end' : seconds === -12 ? 'start' : 'middle'}">${seconds === 0 ? '現在' : `${seconds}s`}</text>`;
    }
    const paths = history.segments().map(segment => segment.length === 1
      ? `<circle cx="${x(segment[0].time)}" cy="${y(segment[0].midi)}" r="2"/>`
      : `<path d="${segment.map((point, i) => `${i ? 'L' : 'M'}${x(point.time).toFixed(2)},${y(point.midi).toFixed(2)}`).join(' ')}"/>`).join('');
    const latest = history.points.at(-1);
    const dot = latest?.midi != null ? `<circle class="current-pitch" cx="${right}" cy="${y(latest.midi)}" r="4"/>` : '';
    this.svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
    this.svg.innerHTML = `<title>最近 12 秒的麥克風音高</title><desc>縱軸為半音等距音高，自動縮放；橫軸為秒。未偵測到音高時斷線。</desc><g class="timeline-grid">${grid}</g><g class="timeline-trace">${paths}${dot}</g>`;
    this.empty.hidden = voiced.length > 0;
  }
}
