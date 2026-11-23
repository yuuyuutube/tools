export const vertex = `#version 300 es
void main() {
  vec2 p = vec2(float((gl_VertexID << 1) & 2), float(gl_VertexID & 2));
  gl_Position = vec4(p * 2.0 - 1.0, 0.0, 1.0);
}
`;

export const fragment = `#version 300 es
precision highp float;

uniform vec2 uSize;
uniform vec4 uSeed;
uniform vec3 uInk[5];
uniform float uPosition;
uniform float uPhase;
uniform vec3 uFamily;
uniform int uEngine;
out vec4 outColor;

const float PI = 3.14159265359;
const float TAU = 6.28318530718;

mat2 rotate(float a) {
  return mat2(cos(a), sin(a), -sin(a), cos(a));
}

float edge(float distance) {
  float aa = max(0.0006, 1.15 / min(uSize.x, uSize.y));
  return 1.0 - smoothstep(-aa, aa, distance);
}

vec3 printInk(vec3 ground, vec3 ink, float distance) {
  return mix(ground, ink, edge(distance));
}

// In a folded wedge, x follows the radius and y measures across the sector.
vec2 wedge(vec2 p, float folds, float angle) {
  float stepAngle = TAU / folds;
  float a = mod(atan(p.y, p.x + 1e-8) + angle + stepAngle * 0.5, stepAngle) - stepAngle * 0.5;
  return length(p) * vec2(cos(a), abs(sin(a)));
}

float lozenge(vec2 p, vec2 radius, float skew) {
  return (abs(p.x) / radius.x + abs(p.y - p.x * skew) / radius.y - 1.0) * radius.y;
}

float oval(vec2 p, vec2 radius) {
  return (length(p / radius) - 1.0) * min(radius.x, radius.y);
}

vec3 kaleidoGround(vec2 p) {
  float paper = length(p * vec2(0.5, 0.9));
  vec3 ground = mix(uInk[0], uInk[3], 0.075 * exp(-2.5 * paper * paper));
  vec2 screen = rotate(0.28) * p;
  float ruled = abs(fract(screen.y * 23.0 + 0.5) - 0.5) / 23.0;
  ground = mix(ground, uInk[3], 0.11 * edge(ruled - 0.0008));
  // A faint registration grid carries the composition out to the edge of the print.
  vec2 grid = abs(fract(p * 7.0 + 0.5) - 0.5) / 7.0;
  ground = mix(ground, uInk[1], 0.22 * edge(length(grid) - 0.0018));

  float aspect = uSize.x / uSize.y;
  vec2 satellite = mix(vec2(0.235, 0.39), vec2(min(aspect * 0.370, 0.78), 0.23),
    smoothstep(0.92, 1.30, aspect));
  vec2 offset = p - satellite;
  offset = length(offset) < length(p + satellite) ? offset : p + satellite;
  float r = length(offset);
  float a = atan(offset.y, offset.x + 1e-8);
  ground = mix(ground, uInk[3], 0.48 * edge(abs(r - 0.083) - 0.0008));
  ground = mix(ground, uInk[1], 0.57 * edge(abs(r - 0.066) - 0.0008));
  float ticks = abs(sin(a * 12.0));
  ground = mix(ground, uInk[3], 0.70 * edge(max(abs(r - 0.096) - 0.004, (ticks - 0.18) * 0.04)));
  vec2 local = rotate(0.72) * offset;
  ground = mix(ground, uInk[4], 0.84 * edge(lozenge(local, vec2(0.031, 0.018), 0.0)));
  ground = printInk(ground, uInk[0], length(offset) - 0.008);
  return ground;
}

vec3 medallion(vec2 p, vec3 ground, float folds) {
  float progress = uPosition * 0.077;
  float turn = 0.16 + (uSeed.y - 0.5) * 1.1 + progress * 0.25 + uPhase * 0.023;
  float swell = sin(progress + uSeed.z * TAU + uPhase * 0.074);
  float twist = sin(progress * 0.79 + uSeed.w * TAU - uPhase * 0.04);
  float scale = mix(0.85, 1.0, smoothstep(0.58, 1.2, uSize.x / uSize.y));
  p /= scale * (1.0 + 0.040 * swell);
  float r = length(p);
  float sectorScale = folds / 8.0;
  vec2 f = wedge(p, folds, turn + (r - 0.16) * (0.32 + 0.6 * twist));
  f.y *= sectorScale;
  vec2 between = wedge(p, folds, turn + PI / folds - r * 0.45 * twist);
  between.y *= sectorScale;

  // Hard-edged ink plates, each cut from the same reflected wedge.
  float frame = abs(r - 0.419) - 0.0011;
  vec3 color = mix(ground, uInk[3], 0.56 * edge(frame));
  vec2 stitch = f - vec2(0.42, 0.026);
  color = printInk(color, uInk[4], lozenge(stitch, vec2(0.028, 0.008), 0.38));

  float wing = lozenge(f - vec2(0.262 + 0.010 * swell, 0.0), vec2(0.137, 0.107), 0.29 + 0.22 * twist);
  wing = max(wing, 0.171 - r);
  float pane = oval(between - vec2(0.289, 0.013), vec2(0.076, 0.070));
  pane = max(pane, 0.218 - r - 0.013 * swell);
  color = printInk(color, uInk[3], pane);
  color = printInk(color, uInk[2], wing);
  float cut = lozenge(f - vec2(0.309, 0.041 + 0.010 * twist), vec2(0.084, 0.047), 0.73);
  color = printInk(color, uInk[1], max(wing, cut));
  float vein = abs(f.y - 0.025 - (f.x - 0.28) * (0.38 + 0.17 * twist)) - 0.0015;
  color = printInk(color, uInk[0], max(vein, wing + 0.003));
  float window = lozenge(between - vec2(0.239, 0.022), vec2(0.063, 0.028), -0.43);
  color = printInk(color, uInk[0], window);
  color = printInk(color, uInk[4], lozenge(between - vec2(0.24, 0.023), vec2(0.046, 0.016), -0.43));

  float collar = lozenge(between - vec2(0.153 + 0.014 * swell, 0.023), vec2(0.078, 0.080), -0.18 - 0.25 * twist);
  color = printInk(color, uInk[1], collar);
  color = printInk(color, uInk[0], oval(between - vec2(0.15, 0.018), vec2(0.038, 0.019)));
  color = printInk(color, uInk[3], lozenge(f - vec2(0.095, 0.0), vec2(0.069, 0.052), 0.24));
  color = printInk(color, uInk[4], lozenge(f - vec2(0.071, 0.007), vec2(0.052, 0.027), -0.2));
  color = printInk(color, uInk[0], r - 0.035 - 0.005 * swell);
  color = printInk(color, uInk[2], lozenge(rotate(turn * 0.8) * p, vec2(0.019, 0.012), 0.0));
  return color;
}

vec3 optical(vec2 p, float family) {
  float progress = uPosition * 0.052;
  float breathing = sin(uPhase * 0.065 + progress * 0.7);
  vec2 q = rotate(0.16 + 0.38 * sin(progress * 0.64 + uSeed.x * 5.0)) * p;
  vec3 ink = uInk[1];
  float field;
  float accent;
  if (family < 0.5) {
    // A cylindrical fold compresses the lines toward two offset foci.
    float bend = exp(-6.0 * dot(q - vec2(-0.13, 0.17), q - vec2(-0.13, 0.17)));
    float counter = exp(-8.0 * dot(q - vec2(0.35, -0.26), q - vec2(0.35, -0.26)));
    float stripes = (q.x + (0.24 + 0.08 * breathing) * bend - 0.20 * counter) *
      (16.0 + 4.0 * sin(progress + uSeed.z * TAU));
    field = abs(fract(stripes) - 0.5) - 0.21;
    accent = 0.77 * exp(-33.0 * dot(q - vec2(0.18, -0.04), q - vec2(0.18, -0.04)));
  } else if (family < 1.5) {
    // The displacement field moves the dot centers and changes apparent depth.
    vec2 warp = q + 0.10 * vec2(sin(4.7 * q.y + breathing), sin(4.2 * q.x - breathing));
    vec2 cells = warp * (23.0 + 5.0 * sin(progress * 0.83));
    vec2 dotCenter = fract(cells) - 0.5;
    float depth = sin(length(warp * vec2(0.85, 1.2)) * 14.0 + breathing + uSeed.y * TAU);
    field = length(dotCenter) - (0.23 + 0.13 * depth);
    accent = 0.9 * exp(-17.0 * dot(q + vec2(0.13, -0.13), q + vec2(0.13, -0.13)));
  } else {
    // Two fans of concentric arcs meet along a moving seam.
    vec2 a = q - vec2(-0.36, -0.14);
    vec2 b = q - vec2(0.38, 0.14);
    float seam = q.x + sin(q.y * 6.0 + breathing) * 0.13;
    float arcs = mix(length(a * vec2(0.84, 1.15)), length(b * vec2(1.08, 0.82)), step(0.0, seam));
    field = abs(fract(arcs * (27.0 + 4.0 * sin(progress)) + breathing * 0.12) - 0.5) - 0.24;
    accent = 0.67 * exp(-105.0 * seam * seam);
  }
  float aa = clamp(fwidth(field) * 0.7, 0.014, 0.29);
  return mix(uInk[0], mix(ink, uInk[2], accent), 1.0 - smoothstep(-aa, aa, field));
}

void main() {
  vec2 p = (gl_FragCoord.xy - 0.5 * uSize) / min(uSize.x, uSize.y);
  vec3 color;
  if (uEngine == 0) {
    vec3 ground = kaleidoGround(p);
    // As the structure evolves, the single plate separates into a diagonal pair.
    float drift = sin(uPosition * 0.044 + uSeed.x * 1.8 + uPhase * 0.021);
    float split = smoothstep(0.76, 0.99, abs(drift));
    float wide = smoothstep(1.05, 1.45, uSize.x / uSize.y);
    vec2 shift = mix(vec2(0.13, 0.17), vec2(0.21, 0.07), wide) * drift * split;
    if (split > 0.001) {
      vec2 second = (p + shift * 1.82) / 0.52;
      vec3 impression = medallion(rotate(0.45) * second, ground, 6.0);
      ground = mix(ground, impression, split * 0.92);
    }
    vec2 first = (p - shift) / (1.0 - split * 0.21);
    color = medallion(first, ground, uFamily.x);
    if (uFamily.z > 0.001) color = mix(color, medallion(first, ground, uFamily.y), uFamily.z);
  } else {
    color = optical(p, uFamily.x);
    if (uFamily.z > 0.001) color = mix(color, optical(p, uFamily.y), uFamily.z);
  }

  // Stable paper tooth. It stays pinned to the print during animated motion.
  vec2 grain = floor(gl_FragCoord.xy * (780.0 / min(uSize.x, uSize.y)));
  float noise = fract(52.9829189 * fract(dot(grain, vec2(0.06711056, 0.00583715))));
  color = clamp(color + (noise - 0.50) * (uEngine == 0 ? 0.064 : 0.034), 0.0, 1.0);
  outColor = vec4(color, 1.0);
}
`;
