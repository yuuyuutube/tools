// Web Serial adapter for the Pico + KY-040 (carried over from Weird Lab 01, Claude edition).
// Knows nothing about the game: it only turns bytes into validated events and reports a status.
import { LineDecoder, parseEvent } from './protocol.js';

const PICO_VENDOR = 0x2e8a; // Raspberry Pi

// status: unsupported | idle | connecting | connected | lost | error
export class PicoSerial {
  constructor({ onEvent, onStatus, serial } = {}) {
    this.onEvent = onEvent || (() => {});
    this.onStatus = onStatus || (() => {});
    this.serial = serial !== undefined ? serial : typeof navigator !== 'undefined' ? navigator.serial : undefined;
    this.unplugged = null;
    this.port = null;
    this.reader = null;
    this.loop = null;
    this.busy = false;
    this.lostInfo = null;
    this.status = this.serial ? 'idle' : 'unsupported';
    this.error = null;

    if (this.serial) {
      this.serial.addEventListener('disconnect', (e) => this.handleUnplug(e.target));
      this.serial.addEventListener('connect', (e) => this.handleReplug(e.target));
    }
    if (typeof window !== 'undefined' && window.addEventListener) {
      window.addEventListener('pagehide', () => this.disconnect());
    }
  }

  get supported() {
    return Boolean(this.serial);
  }

  // Re-open a Pico the user already granted on an earlier visit, without a chooser.
  async reconnectKnown() {
    if (!this.serial || this.busy || this.port || !this.serial.getPorts) return false;
    let ports = [];
    try {
      ports = await this.serial.getPorts();
    } catch {
      return false;
    }
    const pico = ports.find((p) => safeInfo(p).usbVendorId === PICO_VENDOR) || (ports.length === 1 ? ports[0] : null);
    if (!pico) return false;
    return this.open(pico);
  }

  setStatus(status, error = null) {
    this.status = status;
    this.error = error;
    this.onStatus(status, error);
  }

  // Opens the browser's device chooser. any=true shows every serial port, not just Picos.
  async connect({ any = false } = {}) {
    if (!this.serial || this.busy || this.port) return;
    this.busy = true;
    this.lostInfo = null;
    this.setStatus('connecting');
    let port;
    try {
      port = await this.serial.requestPort(any ? {} : { filters: [{ usbVendorId: PICO_VENDOR }] });
    } catch {
      // The user closed the chooser.
      this.busy = false;
      this.setStatus('idle');
      return;
    }
    await this.open(port);
  }

  async open(port) {
    this.busy = true;
    if (this.status !== 'connecting') this.setStatus('connecting');
    try {
      await port.open({ baudRate: 115200 });
    } catch (err) {
      this.busy = false;
      // Most common cause: another tab, VS Code MicroPico or a REPL already holds the port.
      this.setStatus('error', err);
      return false;
    }
    try {
      // MicroPython only writes to USB CDC while the host asserts DTR.
      await port.setSignals({ dataTerminalReady: true, requestToSend: true });
    } catch {
      /* not fatal */
    }
    this.port = port;
    this.unplugged = null;
    this.busy = false;
    this.setStatus('connected');
    this.loop = this.readLoop(port);
    return true;
  }

  async readLoop(port) {
    const lines = new LineDecoder();
    const decoder = new TextDecoder();
    let lost = false;
    while (this.port === port && this.unplugged !== port && port.readable && !lost) {
      const reader = port.readable.getReader();
      this.reader = reader;
      try {
        for (;;) {
          const { value, done } = await reader.read();
          if (done) break;
          if (!value) continue;
          for (const line of lines.push(decoder.decode(value, { stream: true }))) {
            const event = parseEvent(line);
            if (event) this.onEvent(event);
          }
        }
      } catch (err) {
        // Recoverable line errors keep the loop; anything else means the device went away.
        const recoverable = ['BufferOverrunError', 'FramingError', 'ParityError', 'BreakError'];
        if (!recoverable.includes(err && err.name)) lost = true;
        lines.reset();
      } finally {
        try {
          reader.releaseLock();
        } catch {
          /* already released */
        }
        if (this.reader === reader) this.reader = null;
      }
    }
    // Still ours: the device vanished rather than the user pressing disconnect.
    if (this.port === port) {
      this.port = null;
      this.lostInfo = safeInfo(port);
      try {
        await port.close();
      } catch {
        /* unplugged ports can refuse */
      }
      this.setStatus('lost');
    }
  }

  async disconnect() {
    this.lostInfo = null;
    const port = this.port;
    if (!port) {
      if (this.status === 'lost' || this.status === 'error') this.setStatus('idle');
      return;
    }
    this.port = null;
    try {
      if (this.reader) await this.reader.cancel();
    } catch {
      /* ignore */
    }
    try {
      await this.loop;
    } catch {
      /* ignore */
    }
    try {
      await port.close();
    } catch {
      /* ignore */
    }
    this.setStatus('idle');
  }

  handleUnplug(port) {
    if (port && port === this.port) {
      // Stop the read loop; it closes the port and reports "lost".
      this.unplugged = port;
      if (this.reader) this.reader.cancel().catch(() => {});
    }
  }

  handleReplug(port) {
    if (this.status !== 'lost' || !this.lostInfo || this.port || this.busy) return;
    const info = safeInfo(port);
    if (info.usbVendorId === this.lostInfo.usbVendorId && info.usbProductId === this.lostInfo.usbProductId) {
      // Give the board a moment to finish enumerating before opening.
      setTimeout(() => {
        if (this.status === 'lost' && !this.port) this.open(port);
      }, 600);
    }
  }
}

function safeInfo(port) {
  try {
    return port.getInfo();
  } catch {
    return {};
  }
}
