// Pico USB CDC protocol: newline-delimited JSON.
//   {"type":"rotate","delta":<int>}
//   {"type":"press","kind":"short"|"long"}
// This module is pure so it can be tested without a browser.

const MAX_LINE = 512;
const MAX_DELTA = 10000;

export class LineDecoder {
  constructor(maxLine = MAX_LINE) {
    this.buffer = '';
    this.maxLine = maxLine;
    this.overflow = false;
  }

  // Feed decoded text. Returns the complete lines found so far.
  push(text) {
    const lines = [];
    this.buffer += text;
    let start = 0;
    for (;;) {
      const nl = this.buffer.indexOf('\n', start);
      if (nl < 0) break;
      const line = this.buffer.slice(start, nl).replace(/\r$/, '');
      start = nl + 1;
      if (this.overflow) {
        // The tail of a line that was too long: drop it, resync on the next newline.
        this.overflow = false;
        continue;
      }
      if (line.length) lines.push(line);
    }
    this.buffer = this.buffer.slice(start);
    if (this.buffer.length > this.maxLine) {
      this.buffer = '';
      this.overflow = true;
    }
    return lines;
  }

  reset() {
    this.buffer = '';
    this.overflow = false;
  }
}

export function parseEvent(line) {
  const text = typeof line === 'string' ? line.trim() : '';
  if (!text.startsWith('{') || !text.endsWith('}')) return null;
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    return null;
  }
  if (!data || typeof data !== 'object') return null;
  if (data.type === 'rotate') {
    const delta = data.delta;
    if (!Number.isInteger(delta) || delta === 0 || Math.abs(delta) > MAX_DELTA) return null;
    return { type: 'rotate', delta };
  }
  if (data.type === 'press') {
    if (data.kind === 'short' || data.kind === 'long') return { type: 'press', kind: data.kind };
    return null;
  }
  return null;
}
