// Orchestrates the three engines, the transitions between them and the paper finish.
import { COMMON_GLSL, createProgram, createTarget, destroyTarget, setPalette } from './gl.js';
import { createMirror } from '../art/mirror.js';
import { createInk } from '../art/ink.js';
import { createMoire } from '../art/moire.js';

const FINISH_FS = COMMON_GLSL + `
uniform sampler2D uA;      // outgoing (or only) image
uniform sampler2D uB;      // incoming image
uniform vec2 uScaleA;      // engines may fill only part of their target
uniform vec2 uScaleB;
uniform int uKind;         // 0 none, 1 squeegee, 2 ink bloom, 3 fade
uniform float uProgress;   // 0..1, eased
uniform vec2 uDir;         // squeegee travel direction
uniform float uGrain;
uniform float uTooth;     // per-pixel tooth + dither; off for exports (keeps PNGs small)

void main() {
  vec2 uv = gl_FragCoord.xy / uRes;
  vec2 p = screenPos();
  float px = pixelSize();
  vec2 uvA = min(uv * uScaleA, uScaleA - 0.5 / uRes);
  vec2 uvB = min(uv * uScaleB, uScaleB - 0.5 / uRes);
  vec3 a = texture(uA, uvA).rgb;
  vec3 col = a;

  if (uKind == 1) {
    vec3 b = texture(uB, uvB).rgb;
    vec2 half_ = 0.5 * uRes / (0.5 * min(uRes.x, uRes.y));
    float reach = abs(uDir.x) * half_.x + abs(uDir.y) * half_.y + 0.2;
    float s = dot(p, uDir);
    float along = dot(p, vec2(-uDir.y, uDir.x));
    float edge = mix(-reach, reach, uProgress) + 0.006 * (vnoise(vec2(along * 18.0, 3.0)) - 0.5);
    float behind = clamp((edge - s) / px + 0.5, 0.0, 1.0);
    col = mix(a, b, behind);
    // The ink bead riding on the squeegee blade, and the shadow it throws ahead.
    float ahead = s - edge;
    float bead = lineCov(abs(ahead - 0.008), 0.007, px);
    float shade = smoothstep(0.09, 0.0, ahead) * step(0.0, ahead);
    col *= 1.0 - 0.07 * shade;
    col = overprint(col, pal(1), bead * 0.85);
  } else if (uKind == 2) {
    vec3 b = texture(uB, uvB).rgb;
    vec2 half_ = 0.5 * uRes / (0.5 * min(uRes.x, uRes.y));
    float reach = length(half_) + 0.25;
    float ang = atan(p.y, p.x);
    float wob = fbm(vec2(cos(ang), sin(ang)) * 2.2 + 5.0) - 0.5;
    float R = uProgress * reach * (1.0 + 0.16 * wob);
    float r = length(p);
    float inside = clamp((R - r) / px + 0.5, 0.0, 1.0);
    col = mix(a, b, inside);
    // A darker tide line at the spreading edge, gone by the end.
    float tide = lineCov(abs(r - R + 0.012), 0.01, px) * (1.0 - uProgress);
    col = overprint(col, pal(1), tide * 0.7);
  } else if (uKind == 3) {
    col = mix(a, texture(uB, uvB).rgb, uProgress);
  }

  // Paper: long fibres plus a fine static tooth. Nothing here animates.
  vec2 q = p * vec2(1.0, 0.18);
  float fibre = fbm(q * 90.0) - 0.5;
  float tooth = hash12(floor(gl_FragCoord.xy)) - 0.5;
  col *= 1.0 + uGrain * (fibre * 0.06 + tooth * 0.045 * uTooth);
  col += uTooth * (hash12(gl_FragCoord.xy + 71.0) - 0.5) / 255.0;
  outColor = vec4(col, 1.0);
}
`;

export class Renderer {
  constructor(canvas) {
    const gl = canvas.getContext('webgl2', {
      antialias: false,
      alpha: false,
      depth: false,
      stencil: false,
      premultipliedAlpha: false,
      preserveDrawingBuffer: false,
      powerPreference: 'high-performance',
    });
    if (!gl) throw new Error('webgl2');
    this.gl = gl;
    this.canvas = canvas;
    this.vao = gl.createVertexArray();
    this.engines = [createMirror(gl), createInk(gl), createMoire(gl)];
    this.finish = createProgram(gl, FINISH_FS);
    this.targets = [null, null];
    this.size = [1, 1];
    this.renderSize = [1, 1];
    this.quality = 1;
    this.maxTexture = gl.getParameter(gl.MAX_TEXTURE_SIZE);
  }

  // Canvas size in device pixels; render size scaled by quality and a pixel budget.
  resize(width, height) {
    const w = Math.max(1, Math.round(width));
    const h = Math.max(1, Math.round(height));
    if (this.canvas.width !== w || this.canvas.height !== h) {
      this.canvas.width = w;
      this.canvas.height = h;
    }
    this.size = [w, h];
    const budget = 3.2e6;
    const fit = Math.min(1, Math.sqrt(budget / (w * h)));
    const s = fit * this.quality;
    const rw = Math.max(1, Math.round(w * s));
    const rh = Math.max(1, Math.round(h * s));
    if (rw !== this.renderSize[0] || rh !== this.renderSize[1] || !this.targets[0]) {
      this.renderSize = [rw, rh];
      for (let i = 0; i < 2; i++) {
        destroyTarget(this.gl, this.targets[i]);
        this.targets[i] = createTarget(this.gl, rw, rh);
      }
    }
  }

  setQuality(q) {
    const next = Math.min(1, Math.max(0.45, q));
    if (Math.abs(next - this.quality) < 0.01) return false;
    this.quality = next;
    this.resize(this.size[0], this.size[1]);
    return true;
  }

  // Returns the fraction of the target the engine filled.
  drawEngine(view, target, full = false) {
    const gl = this.gl;
    const engine = this.engines[view.mode];
    const res = full ? 1 : engine.resolution || 1;
    const w = Math.max(1, Math.round(target.width * res));
    const h = Math.max(1, Math.round(target.height * res));
    gl.bindFramebuffer(gl.FRAMEBUFFER, target.fb);
    gl.viewport(0, 0, w, h);
    engine.draw({ ...view, width: w, height: h });
    return [w / target.width, h / target.height];
  }

  drawFinish(texA, texB, transition, palette, width, height, fb = null, scaleA = [1, 1], scaleB = [1, 1]) {
    const gl = this.gl;
    const { program, uniforms: u } = this.finish;
    gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
    gl.viewport(0, 0, width, height);
    gl.useProgram(program);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, texA);
    gl.uniform1i(u.uA, 0);
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, texB || texA);
    gl.uniform1i(u.uB, 1);
    gl.uniform2f(u.uRes, width, height);
    gl.uniform2f(u.uScaleA, scaleA[0], scaleA[1]);
    gl.uniform2f(u.uScaleB, scaleB[0], scaleB[1]);
    setPalette(gl, u, palette);
    gl.uniform1i(u.uKind, transition ? transition.kind : 0);
    gl.uniform1f(u.uProgress, transition ? transition.progress : 0);
    const dir = transition && transition.dir ? transition.dir : [1, 0];
    gl.uniform2f(u.uDir, dir[0], dir[1]);
    gl.uniform1f(u.uGrain, 1);
    gl.uniform1f(u.uTooth, fb ? 0 : 1);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }

  // view: { mode, seed, dial, t, palette }. transition: { kind, progress, dir, from: view }.
  render(view, transition = null) {
    const gl = this.gl;
    gl.bindVertexArray(this.vao);
    const [w, h] = this.size;
    if (transition && transition.from) {
      const sa = this.drawEngine(transition.from, this.targets[0]);
      const sb = this.drawEngine(view, this.targets[1]);
      this.drawFinish(this.targets[0].tex, this.targets[1].tex, transition, view.palette, w, h, null, sa, sb);
    } else {
      const sa = this.drawEngine(view, this.targets[0]);
      this.drawFinish(this.targets[0].tex, null, null, view.palette, w, h, null, sa, sa);
    }
  }

  // Render a still at print resolution and return PNG bytes. The UI is never in it.
  async exportPNG(view, width, height) {
    const gl = this.gl;
    const limit = Math.min(this.maxTexture, 8192);
    const k = Math.min(1, limit / Math.max(width, height));
    const w = Math.round(width * k);
    const h = Math.round(height * k);
    gl.bindVertexArray(this.vao);
    const art = createTarget(gl, w, h);
    const out = createTarget(gl, w, h);
    try {
      this.drawEngine(view, art, true);
      this.drawFinish(art.tex, null, null, view.palette, w, h, out.fb);
      const pixels = new Uint8Array(w * h * 4);
      gl.bindFramebuffer(gl.FRAMEBUFFER, out.fb);
      gl.readPixels(0, 0, w, h, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      // WebGL rows start at the bottom.
      const flipped = new Uint8ClampedArray(w * h * 4);
      const row = w * 4;
      for (let y = 0; y < h; y++) flipped.set(pixels.subarray((h - 1 - y) * row, (h - y) * row), y * row);
      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      canvas.getContext('2d').putImageData(new ImageData(flipped, w, h), 0, 0);
      return await new Promise((resolve, reject) =>
        canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('png'))), 'image/png'),
      );
    } finally {
      destroyTarget(gl, art);
      destroyTarget(gl, out);
    }
  }
}
