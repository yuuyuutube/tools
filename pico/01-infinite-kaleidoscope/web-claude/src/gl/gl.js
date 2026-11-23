// Minimal WebGL2 helpers.

export const FULLSCREEN_VS = `#version 300 es
void main() {
  vec2 p = vec2(float((gl_VertexID << 1) & 2), float(gl_VertexID & 2));
  gl_Position = vec4(p * 2.0 - 1.0, 0.0, 1.0);
}`;

// Shared fragment header: coordinates, palette, ink blending, noise.
export const COMMON_GLSL = `#version 300 es
precision highp float;
precision highp int;
uniform vec2 uRes;
uniform vec3 uPal[5]; // paper, key, a, b, c
uniform float uDark;
out vec4 outColor;

// Normalised space: the shorter side spans [-1, 1], y up.
vec2 screenPos() { return (gl_FragCoord.xy - 0.5 * uRes) / (0.5 * min(uRes.x, uRes.y)); }
float pixelSize() { return 2.0 / min(uRes.x, uRes.y); }

// Opaque screen-print ink.
vec3 laydown(vec3 base, vec3 ink, float cov) { return mix(base, ink, clamp(cov, 0.0, 1.0)); }
// Translucent overprint: multiply on light paper, screen on dark paper.
vec3 overprint(vec3 base, vec3 ink, float cov) {
  vec3 m = base * ink;
  vec3 s = 1.0 - (1.0 - base) * (1.0 - ink);
  return mix(base, mix(m, s, uDark), clamp(cov, 0.0, 1.0));
}
vec3 pal(int i) { return uPal[i]; }

float hash12(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}
float vnoise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  float a = hash12(i), b = hash12(i + vec2(1, 0)), c = hash12(i + vec2(0, 1)), d = hash12(i + vec2(1, 1));
  return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
}
float fbm(vec2 p) {
  float s = 0.0, a = 0.5;
  for (int i = 0; i < 4; i++) { s += a * vnoise(p); p = p * 2.03 + 17.1; a *= 0.5; }
  return s;
}
// Coverage of a line of half-width w at distance d, with pixel size px.
float lineCov(float d, float w, float px) {
  float c = clamp((w - d) / px + 0.5, 0.0, 1.0);
  return c * min(1.0, 2.0 * w / px);
}
`;

export function compile(gl, type, source) {
  const shader = gl.createShader(type);
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    const log = gl.getShaderInfoLog(shader);
    const numbered = source.split('\n').map((l, i) => `${i + 1}: ${l}`).join('\n');
    gl.deleteShader(shader);
    throw new Error(`${log}\n${numbered}`);
  }
  return shader;
}

export function createProgram(gl, fs, vs = FULLSCREEN_VS) {
  const program = gl.createProgram();
  gl.attachShader(program, compile(gl, gl.VERTEX_SHADER, vs));
  gl.attachShader(program, compile(gl, gl.FRAGMENT_SHADER, fs));
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(program));
  const uniforms = {};
  const n = gl.getProgramParameter(program, gl.ACTIVE_UNIFORMS);
  for (let i = 0; i < n; i++) {
    const info = gl.getActiveUniform(program, i);
    const name = info.name.replace(/\[0\]$/, '');
    uniforms[name] = gl.getUniformLocation(program, info.name);
  }
  return { program, uniforms };
}

export function createTarget(gl, width, height) {
  const tex = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, tex);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, width, height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
  const fb = gl.createFramebuffer();
  gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
  gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  return { fb, tex, width, height };
}

export function destroyTarget(gl, target) {
  if (!target) return;
  gl.deleteFramebuffer(target.fb);
  gl.deleteTexture(target.tex);
}

export function setPalette(gl, u, palette) {
  if (u.uPal) gl.uniform3fv(u.uPal, palette.colors.flat());
  if (u.uDark) gl.uniform1f(u.uDark, palette.dark);
}
