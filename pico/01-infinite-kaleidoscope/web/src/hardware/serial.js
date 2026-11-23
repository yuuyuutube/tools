import { EventDecoder } from './protocol.js';

export class SerialConnection {
  #serial;
  #port;
  #reader;
  #reading;
  #closing;
  #receive;
  #status;
  #pending = false;
  #unplugged = false;
  #onUnplug = () => {
    this.#unplugged = true;
    void this.#close('unplugged');
  };

  constructor(serial, receive, status) {
    this.#serial = serial;
    this.#receive = receive;
    this.#status = status;
  }

  async connect() {
    if (!this.#serial || this.#pending || this.#port || this.#closing) return;
    this.#pending = true;
    this.#status('opening');
    let port;
    try {
      // Call directly from the click handler so the browser retains user activation.
      port = await this.#serial.requestPort();
      await port.open({ baudRate: 115200 });
      this.#port = port;
      this.#unplugged = false;
      port.addEventListener('disconnect', this.#onUnplug);
      this.#status('connected');
      const reading = this.#read(port);
      this.#reading = reading;
      void reading.then((status) => {
        if (!this.#closing && this.#port === port) void this.#close(status);
      });
    } catch (error) {
      this.#status(error.name === 'NotFoundError' && !port ? 'idle' : 'error');
    } finally {
      this.#pending = false;
    }
  }

  disconnect() {
    return this.#close('idle');
  }

  #close(status) {
    if (this.#closing) return this.#closing;
    const port = this.#port;
    if (!port) return Promise.resolve();
    this.#status('closing');

    this.#closing = (async () => {
      try {
        await this.#reader?.cancel().catch(() => {});
        await this.#reading;
        await port.close();
      } catch {
        if (status === 'idle' && port.connected !== false) status = 'error';
      } finally {
        port.removeEventListener('disconnect', this.#onUnplug);
        this.#port = null;
        this.#reading = null;
        this.#closing = null;
        this.#status(this.#unplugged || port.connected === false ? 'unplugged' : status);
      }
    })();
    return this.#closing;
  }

  async #read(port) {
    let stream = port.readable;
    while (stream) {
      const decode = new EventDecoder(this.#receive);
      let ended = false;
      try {
        this.#reader = stream.getReader();
        for (;;) {
          const { value, done } = await this.#reader.read();
          if (done) { ended = true; break; }
          decode.push(value);
        }
      } catch {
        // Chrome can create a replacement stream after a recoverable framing error.
      } finally {
        this.#reader?.releaseLock();
        this.#reader = null;
      }
      const replacement = port.readable;
      if (ended || this.#closing || replacement === stream) break;
      stream = replacement;
    }
    return port.connected === false ? 'unplugged' : 'error';
  }
}
