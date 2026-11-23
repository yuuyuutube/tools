import { clamp, mod, smooth } from '../controllers/artwork.js';
import { BLOOM_RING_LIMIT, bloomRadius, bloomRingWindow, generateBloomRing } from './bloom-rings.js';
import { makeBloomMotif } from './bloom-motifs.js';

const TAU = Math.PI * 2;

function paintRing(ctx, ring, palette, inner, outer, formation, opacity) {
  const { symmetry, rotation, stretch, paths, primary, secondary, highlight } = ring;
  const span = outer - inner;
  const middle = (inner + outer) * 0.5;
  const sector = TAU / symmetry;
  const spread = middle * ring.wedge * (0.76 + formation * 0.24);
  const colors = palette.colors;
  const inkOpacity = opacity * smooth(clamp((formation - 0.14) / 0.58, 0, 1));
  const detailOpacity = opacity * smooth(clamp((formation - 0.32) / 0.68, 0, 1));

  ctx.save();
  ctx.beginPath();
  ctx.arc(0, 0, outer - span * 0.018, 0, TAU);
  ctx.lineWidth = clamp(span * 0.017, 0.0009, 0.0026);
  ctx.globalAlpha = opacity * 0.25;
  ctx.strokeStyle = colors[primary];
  ctx.stroke();

  ctx.rotate(rotation);
  for (let sectorIndex = 0; sectorIndex < symmetry; sectorIndex++) {
    ctx.save();
    ctx.translate(middle, 0);
    ctx.scale(span * (0.82 + formation * 0.18) * stretch, spread);
    ctx.globalAlpha = opacity;
    ctx.fillStyle = colors[primary];
    ctx.fill(paths.shape);
    if (inkOpacity > 0) {
      ctx.globalAlpha = inkOpacity;
      ctx.fillStyle = colors[secondary];
      ctx.fill(paths.ink);
    }
    if (detailOpacity > 0) {
      ctx.globalAlpha = detailOpacity;
      ctx.fillStyle = colors[highlight];
      ctx.fill(paths.light);
      if (ring.hasThread) {
        ctx.strokeStyle = colors[ring.threadInk];
        ctx.lineWidth = 0.048;
        ctx.stroke(paths.thread);
      }
    }
    ctx.restore();
    ctx.rotate(sector);
  }
  ctx.restore();
}

export function createBloomRenderer() {
  const slots = new Array(BLOOM_RING_LIMIT);
  const frame = { newest: 0, oldest: 0, scale: 1 };
  let lastSeed;
  let lastStyle;

  function getRing(seed, index, style) {
    const slot = mod(index, BLOOM_RING_LIMIT);
    let ring = slots[slot];
    if (ring?.index === index) return ring;
    ring = generateBloomRing(seed, index);
    ring.paths = makeBloomMotif(ring, style);
    ring.wedge = Math.tan(Math.PI / ring.symmetry) * 0.96;
    ring.hasThread = ring.family === 'lace' || (ring.family === 'arc' && style === 'japanese');
    ring.threadInk = style === 'nordic' ? 0 : ring.primary === 3 ? 1 : 3;
    slots[slot] = ring;
    return ring;
  }

  return function drawBloom(ctx, aspectX, aspectY, state, palette) {
    const { seed, bloomStyle: style, bloomProgress: progress } = state;
    if (lastSeed !== seed || lastStyle !== style) {
      lastSeed = seed;
      lastStyle = style;
      slots.fill(undefined);
    }

    const corner = Math.hypot(aspectX, aspectY);
    bloomRingWindow(progress, corner, frame);
    for (let slot = 0; slot < slots.length; slot++) {
      const cached = slots[slot];
      if (cached && (cached.index < frame.oldest || cached.index > frame.newest)) slots[slot] = undefined;
    }

    ctx.fillStyle = palette.colors[0];
    ctx.fillRect(-aspectX, -aspectY, aspectX * 2, aspectY * 2);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    for (let index = frame.oldest; index <= frame.newest; index++) {
      const age = progress - index;
      const inner = bloomRadius(age - 1) * frame.scale;
      const outer = bloomRadius(age) * frame.scale;
      if (outer - inner < 0.002) continue;
      const formation = smooth(clamp(age / 0.94, 0, 1));
      const perimeter = smooth(clamp((inner / corner - 0.64) / 0.36, 0, 1));
      paintRing(ctx, getRing(seed, index, style), palette, inner, outer, formation,
        (0.16 + formation * 0.84) * (1 - perimeter * 0.37));
    }

    // The tiny ink center bridges the outgoing and the newly forming ring.
    const heart = 0.003 + 0.0018 * Math.sin((progress - frame.newest) * Math.PI);
    ctx.fillStyle = palette.colors[1];
    ctx.beginPath();
    ctx.arc(0, 0, heart, 0, TAU);
    ctx.fill();
  };
}
