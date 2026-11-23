const maxLineLength = 192;

export function readEvent(line) {
  let data;
  try {
    data = JSON.parse(line);
  } catch {
    return null;
  }
  if (data?.type === 'rotate' && Number.isInteger(data.delta) &&
      data.delta !== 0 && Math.abs(data.delta) <= 1024) {
    return { type: 'rotate', delta: data.delta };
  }
  if (data?.type === 'press' && (data.kind === 'short' || data.kind === 'long')) {
    return { type: 'press', kind: data.kind };
  }
  return null;
}

export class EventDecoder {
  #partial = '';
  #discard = false;
  #utf8 = new TextDecoder();

  constructor(receive) {
    this.receive = receive;
  }

  push(bytes) {
    const text = this.#utf8.decode(bytes, { stream: true });
    let start = 0;
    while (start < text.length) {
      const newline = text.indexOf('\n', start);
      const end = newline === -1 ? text.length : newline;
      if (!this.#discard) {
        if (this.#partial.length + end - start > maxLineLength) {
          this.#partial = '';
          this.#discard = true;
        } else {
          this.#partial += text.slice(start, end);
        }
      }
      if (newline === -1) break;
      if (!this.#discard) {
        const event = readEvent(this.#partial);
        if (event) this.receive(event);
      }
      this.#partial = '';
      this.#discard = false;
      start = newline + 1;
    }
  }
}

// Every input device talks to the same controller actions as the keyboard and mouse.
export function knobInput(event, controls) {
  if (event.type === 'rotate') controls.rotate(event.delta);
  else if (event.kind === 'short') controls.cycleEngine();
  else if (event.kind === 'long') controls.newUniverse();
}
