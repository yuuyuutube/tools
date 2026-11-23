import { fragment, vertex } from '../shaders/prints.js';
import { kaleidoParameters, opticalParameters } from '../controllers/parameters.js';

function compile(gl, kind, source) {
  const shader = gl.createShader(kind);
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    const error = gl.getShaderInfoLog(shader);
    gl.deleteShader(shader);
    throw new Error(error);
  }
  return shader;
}

function link(gl) {
  const program = gl.createProgram();
  const vs = compile(gl, gl.VERTEX_SHADER, vertex);
  const fs = compile(gl, gl.FRAGMENT_SHADER, fragment);
  gl.attachShader(program, vs);
  gl.attachShader(program, fs);
  gl.linkProgram(program);
  gl.deleteShader(vs);
  gl.deleteShader(fs);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    throw new Error(gl.getProgramInfoLog(program));
  }
  gl.useProgram(program);
  return program;
}

export function makeShaderRenderer(invalidate) {
  const canvas = document.createElement('canvas');
  const gl = canvas.getContext('webgl2', {
    alpha: false, depth: false, stencil: false, antialias: false, powerPreference: 'low-power',
  });
  if (!gl) return null;
  let uniforms;
  function setup() {
    const program = link(gl);
    uniforms = Object.fromEntries(['Size', 'Seed', 'Ink[0]', 'Position', 'Phase', 'Family', 'Engine']
      .map((name) => [name, gl.getUniformLocation(program, 'u' + name)]));
  }
  function restore() {
    try {
      setup();
    } catch (error) {
      uniforms = null;
      console.warn('WebGL restore failed', error);
    }
    invalidate();
  }
  setup();
  canvas.addEventListener('webglcontextlost', (event) => {
    event.preventDefault();
    invalidate();
  });
  canvas.addEventListener('webglcontextrestored', restore);
  return {
    draw(width, height, state, palette, seed) {
      if (!uniforms || gl.isContextLost()) return null;
      if (canvas.width !== width) canvas.width = width;
      if (canvas.height !== height) canvas.height = height;
      const kaleido = state.engine === 'kaleido';
      const family = (kaleido ? kaleidoParameters : opticalParameters)(state.position, seed);
      gl.viewport(0, 0, width, height);
      gl.uniform2f(uniforms.Size, width, height);
      gl.uniform4fv(uniforms.Seed, seed);
      gl.uniform3fv(uniforms['Ink[0]'], palette.rgb);
      gl.uniform1f(uniforms.Position, state.position);
      gl.uniform1f(uniforms.Phase, state.phase);
      gl.uniform3f(uniforms.Family, family.first, family.second, family.mix);
      gl.uniform1i(uniforms.Engine, kaleido ? 0 : 1);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      return canvas;
    },
  };
}
