import { universe } from '../controllers/artwork.js';
import { palettes } from '../palettes/index.js';
import { createBloomRenderer } from './bloom.js';
import { drawSpiro } from './plot.js';
import { kaleidoStyles } from './kaleido-styles.js';
import { spiroStyles } from './spiro-styles.js';
import { opticalStyles } from './optical-styles.js';
import { fallbackEngines } from './fallback.js';
import { makeShaderRenderer } from './webgl.js';

const styleRenderers = { kaleido: kaleidoStyles, spiro: spiroStyles, optical: opticalStyles };

export class ArtworkRenderer {
  #canvas;
  #ctx;
  #snapshot = document.createElement('canvas');
  #shader;
  #seed;
  #seedValues;
  #lastFrame;
  #palette;
  #drawBloom = createBloomRenderer();

  constructor(canvas, invalidate) {
    this.#canvas = canvas;
    this.#ctx = canvas.getContext('2d', { alpha: false });
    try {
      this.#shader = makeShaderRenderer(invalidate);
    } catch (error) {
      console.warn('WebGL unavailable', error);
    }
  }

  get frame() {
    return this.#lastFrame;
  }

  holdPrint() {
    this.#snapshot.width = this.#canvas.width;
    this.#snapshot.height = this.#canvas.height;
    this.#snapshot.getContext('2d').drawImage(this.#canvas, 0, 0);
  }

  draw(state, { position, phase, transition, bloomProgress }) {
    const { clientWidth, clientHeight } = this.#canvas;
    if (!clientWidth || !clientHeight) return;
    // At most two device pixels per CSS pixel and 2.35 MP per frame.
    const scale = Math.min(devicePixelRatio || 1, 2, Math.sqrt(2350000 / (clientWidth * clientHeight)));
    const width = Math.max(1, Math.floor(clientWidth * scale));
    const height = Math.max(1, Math.floor(clientHeight * scale));
    if (this.#canvas.width !== width) this.#canvas.width = width;
    if (this.#canvas.height !== height) this.#canvas.height = height;

    if (this.#seed !== state.seed) {
      this.#seed = state.seed;
      this.#seedValues = universe(this.#seed);
    }
    if (!this.#palette || this.#palette.id !== state.palette) {
      this.#palette = palettes.find((entry) => entry.id === state.palette);
    }
    const frame = this.#lastFrame ?? {};
    frame.engine = state.engine;
    frame.seed = state.seed;
    frame.palette = state.palette;
    frame.position = position;
    frame.phase = phase;
    frame.bloomProgress = bloomProgress;
    frame.bloomStyle = state.bloomStyle;
    frame.patternStyle = state.patternStyle;
    const palette = this.#palette;
    const ctx = this.#ctx;
    const drawing = styleRenderers[frame.engine]?.[frame.patternStyle] ??
      (frame.engine === 'bloom' ? this.#drawBloom : frame.engine === 'spiro' ? drawSpiro : null);
    const result = drawing ? null : this.#shader?.draw(width, height, frame, palette, this.#seedValues);
    if (result) {
      ctx.drawImage(result, 0, 0);
    } else {
      const unit = Math.min(width, height);
      ctx.save();
      ctx.setTransform(unit, 0, 0, unit, width / 2, height / 2);
      const draw = drawing ?? fallbackEngines[frame.engine];
      draw(ctx, width / unit / 2, height / unit / 2, frame, palette, this.#seedValues);
      ctx.restore();
    }
    if (transition < 1 && this.#snapshot.width) {
      ctx.globalAlpha = 1 - transition;
      const cover = Math.max(width / this.#snapshot.width, height / this.#snapshot.height);
      const previousWidth = this.#snapshot.width * cover;
      const previousHeight = this.#snapshot.height * cover;
      ctx.drawImage(this.#snapshot, (width - previousWidth) / 2, (height - previousHeight) / 2,
        previousWidth, previousHeight);
      ctx.globalAlpha = 1;
    } else if (this.#snapshot.width) {
      this.#snapshot.width = 0;
    }
    this.#lastFrame = frame;
  }

  capture() {
    return new Promise((resolve, reject) => {
      this.#canvas.toBlob((blob) => {
        if (blob) resolve(blob);
        else reject(new Error('PNG encoding failed'));
      }, 'image/png');
    });
  }
}
