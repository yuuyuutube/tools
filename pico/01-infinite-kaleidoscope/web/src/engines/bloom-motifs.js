const TAU = 2 * Math.PI;

function polygon(path, ...points) {
  path.moveTo(points[0], points[1]);
  for (let index = 2; index < points.length; index += 2) {
    path.lineTo(points[index], points[index + 1]);
  }
  path.closePath();
}

function oval(path, x, y, rx, ry) {
  path.moveTo(x + rx, y);
  path.ellipse(x, y, rx, ry, 0, 0, TAU);
  path.closePath();
}

function diamond(path, left, right, y, width, joint = (left + right) / 2) {
  polygon(path, left, y, joint, y - width, right, y, joint, y + width);
}

function leaf(path, left, right, width) {
  path.moveTo(left, 0);
  path.bezierCurveTo(left + 0.25, -width, right - 0.22, -width, right, 0);
  path.bezierCurveTo(right - 0.22, width, left + 0.25, width, left, 0);
  path.closePath();
}

function turnMotif(angle, height) {
  const c = Math.cos(angle);
  const s = Math.sin(angle);
  return (x, y) => [c * x - s * y, height * (s * x + c * y)];
}

function lilyBell(path, x, y, width, drop) {
  path.moveTo(x - width * 0.36, y);
  path.bezierCurveTo(x - width * 0.06, y - drop * 0.15, x + width * 0.36, y - drop * 0.08,
    x + width * 0.48, y + drop * 0.24);
  path.quadraticCurveTo(x + width * 0.68, y + drop * 0.68, x + width, y + drop * 0.88);
  path.quadraticCurveTo(x + width * 0.79, y + drop * 1.16, x + width * 0.42, y + drop * 0.96);
  path.quadraticCurveTo(x + width * 0.04, y + drop * 1.29, x - width * 0.34, y + drop * 0.96);
  path.quadraticCurveTo(x - width * 0.74, y + drop * 1.15, x - width, y + drop * 0.88);
  path.quadraticCurveTo(x - width * 0.62, y + drop * 0.59, x - width * 0.36, y);
  path.closePath();
}

function tatewakuBand(path, breadth, inset, halfWidth) {
  const inner = (offset) => breadth * (offset - inset - halfWidth);
  const outer = (offset) => breadth * (offset - inset + halfWidth);
  path.moveTo(-0.44, inner(0.66));
  path.bezierCurveTo(-0.30, inner(0.66), -0.29, inner(0.26), -0.13, inner(0.26));
  path.bezierCurveTo(0.02, inner(0.26), 0.02, inner(0.66), 0.18, inner(0.66));
  path.bezierCurveTo(0.31, inner(0.66), 0.33, inner(0.34), 0.44, inner(0.31));
  path.quadraticCurveTo(0.49, breadth * (0.31 - inset), 0.44, outer(0.31));
  path.bezierCurveTo(0.32, outer(0.34), 0.31, outer(0.66), 0.18, outer(0.66));
  path.bezierCurveTo(0.02, outer(0.66), 0.02, outer(0.26), -0.13, outer(0.26));
  path.bezierCurveTo(-0.29, outer(0.26), -0.30, outer(0.66), -0.44, outer(0.66));
  path.quadraticCurveTo(-0.49, breadth * (0.66 - inset), -0.44, inner(0.66));
  path.closePath();
}

function hole(path, x, y, rx, ry) {
  // Counter-clockwise, so it cuts through whatever this layer already filled.
  path.moveTo(x + rx, y);
  path.ellipse(x, y, rx, ry, 0, 0, -TAU, true);
  path.closePath();
}

function arcAt(path, x, y, rx, ry, rot, a0, a1, ccw = false) {
  const c = Math.cos(rot), s = Math.sin(rot);
  const px = rx * Math.cos(a0), py = ry * Math.sin(a0);
  path.moveTo(x + c * px - s * py, y + s * px + c * py);
  path.ellipse(x, y, rx, ry, rot, a0, a1, ccw);
}

function streak(path, x0, y0, x1, y1, thick) {
  // A thin lens between two points.
  const dx = x1 - x0, dy = y1 - y0, len = Math.hypot(dx, dy) || 1;
  const nx = -dy / len * thick, ny = dx / len * thick;
  const mx = (x0 + x1) / 2, my = (y0 + y1) / 2;
  path.moveTo(x0, y0);
  path.quadraticCurveTo(mx + nx, my + ny, x1, y1);
  path.quadraticCurveTo(mx - nx, my - ny, x0, y0);
  path.closePath();
}

function sparkle(path, x, y, rx, ry, pinch = 0.12) {
  path.moveTo(x + rx, y);
  path.quadraticCurveTo(x + rx * pinch, y + ry * pinch, x, y + ry);
  path.quadraticCurveTo(x - rx * pinch, y + ry * pinch, x - rx, y);
  path.quadraticCurveTo(x - rx * pinch, y - ry * pinch, x, y - ry);
  path.quadraticCurveTo(x + rx * pinch, y - ry * pinch, x + rx, y);
  path.closePath();
}

function lanceLeaf(path, x0, y0, x1, y1, width) {
  // A pointed leaf, widest a third of the way from its base. Always wound the same way,
  // so overlapping leaves on one layer merge instead of cancelling.
  const dx = x1 - x0, dy = y1 - y0, len = Math.hypot(dx, dy);
  const nx = -dy / len * width, ny = dx / len * width;
  const cx = x0 + dx * 0.38, cy = y0 + dy * 0.38;
  path.moveTo(x0, y0);
  path.quadraticCurveTo(cx + nx, cy + ny, x1, y1);
  path.quadraticCurveTo(cx - nx, cy - ny, x0, y0);
  path.closePath();
}

function ribbon(path, points, thick) {
  // A band of even width along a closed polyline, built from same-wound quads.
  const n = points.length;
  const off = points.map((_, i) => {
    const [ax, ay] = points[(i + n - 1) % n], [bx, by] = points[(i + 1) % n];
    const len = Math.hypot(bx - ax, by - ay) || 1;
    return [-(by - ay) / len * thick, (bx - ax) / len * thick];
  });
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    const [px, py] = points[i], [qx, qy] = points[j];
    polygon(path, px + off[i][0], py + off[i][1], qx + off[j][0], qy + off[j][1],
      qx - off[j][0], qy - off[j][1], px - off[i][0], py - off[i][1]);
  }
}

const indian = {
  petal({ shape, ink, light }, { breadth: w }) {
    shape.moveTo(-0.48, 0);
    shape.bezierCurveTo(-0.44, -w * 0.58, -0.03, -w * 0.96, 0.32, -w);
    shape.quadraticCurveTo(0.17, -w * 0.60, 0.27, -w * 0.34);
    shape.quadraticCurveTo(0.35, -w * 0.15, 0.49, 0);
    shape.quadraticCurveTo(0.35, w * 0.15, 0.27, w * 0.34);
    shape.quadraticCurveTo(0.17, w * 0.60, 0.32, w);
    shape.bezierCurveTo(-0.03, w * 0.96, -0.44, w * 0.58, -0.48, 0);
    shape.closePath();
    leaf(ink, -0.42, 0.40, w * 0.46);
    leaf(light, -0.29, 0.20, w * 0.18);
  },
  diamond({ shape, ink, light }, { breadth: w }) {
    // A shallow oil bowl with a curved rim and a tapered flame.
    shape.moveTo(-0.065, -w * 0.78);
    shape.quadraticCurveTo(-0.23, 0, -0.065, w * 0.78);
    shape.bezierCurveTo(-0.25, w * 0.62, -0.445, w * 0.34, -0.445, 0);
    shape.bezierCurveTo(-0.445, -w * 0.34, -0.25, -w * 0.62, -0.065, -w * 0.78);
    shape.closePath();
    ink.moveTo(-0.115, -w * 0.67);
    ink.quadraticCurveTo(-0.255, 0, -0.115, w * 0.67);
    ink.quadraticCurveTo(-0.315, 0, -0.115, -w * 0.67);
    ink.closePath();

    shape.moveTo(0.02, -w * 0.025);
    shape.bezierCurveTo(0.03, -w * 0.31, 0.23, -w * 0.34, 0.47, w * 0.09);
    shape.bezierCurveTo(0.295, w * 0.01, 0.25, w * 0.30, 0.12, w * 0.26);
    shape.quadraticCurveTo(0.025, w * 0.22, 0.02, -w * 0.025);
    shape.closePath();
    ink.moveTo(0.044, -w * 0.025);
    ink.bezierCurveTo(0.053, -w * 0.24, 0.23, -w * 0.24, 0.39, w * 0.058);
    ink.bezierCurveTo(0.25, w * 0.035, 0.23, w * 0.25, 0.12, w * 0.205);
    ink.quadraticCurveTo(0.05, w * 0.16, 0.044, -w * 0.025);
    ink.closePath();
    light.moveTo(0.064, -w * 0.01);
    light.quadraticCurveTo(0.085, -w * 0.158, 0.253, w * 0.025);
    light.quadraticCurveTo(0.176, w * 0.018, 0.14, w * 0.12);
    light.quadraticCurveTo(0.074, w * 0.15, 0.064, -w * 0.01);
    light.closePath();
    for (const y of [-0.20, 0, 0.20]) oval(light, -0.319, w * y, 0.021, w * 0.032);
  },
  star({ shape, ink }, { breadth: w }) {
    // The rounded shoulders overlap while the short, pointed roots stay apart.
    const unit = 0.017;
    const height = w * 0.94;
    for (let index = -2; index <= 2; index++) {
      const scale = Math.abs(index) === 1 ? 0.96 : 1;
      const turn = turnMotif(index * Math.PI * 31 / 180, height);
      const point = (x, y) => {
        const [radial, tangential] = turn((35 - scale * y) * unit, x * scale * unit);
        return [radial - 0.55, tangential];
      };
      shape.moveTo(...point(-6, 12));
      shape.bezierCurveTo(...point(-16, 1), ...point(-13, -17), ...point(0, -24));
      shape.bezierCurveTo(...point(13, -17), ...point(16, 1), ...point(6, 12));
      shape.lineTo(...point(0, 20));
      shape.closePath();

      // Reverse the eye contour so it cuts through to the actual background.
      shape.moveTo(...point(0, -13));
      shape.quadraticCurveTo(...point(-13, -4), ...point(0, 4));
      shape.quadraticCurveTo(...point(13, -4), ...point(0, -13));
      shape.closePath();
      const [x, y] = point(0, -4);
      const pupil = 3.15 * scale * unit;
      oval(ink, x, y, pupil, height * pupil);
    }
  },
  arc({ shape, ink, light }, { breadth: w, bias }) {
    for (const side of [-1, 1]) {
      const y = side * w;
      shape.moveTo(0.44, y * 0.66);
      shape.bezierCurveTo(0.13, y * (1.15 + bias * 0.15), -0.47, y * 0.88, -0.47, y * 0.48);
      shape.bezierCurveTo(-0.46, y * 0.08, -0.03, y * 0.12, 0.12, y * 0.37);
      shape.quadraticCurveTo(0.27, y * 0.70, 0.44, y * 0.66);
      shape.closePath();
      oval(ink, -0.25, y * 0.53, 0.14, w * 0.20);
      oval(light, -0.25, y * 0.52, 0.052, w * 0.08);
    }
  },
  tessellation({ shape, ink, light }, { breadth: w }) {
    // A pierced arch and an eight-point star with a diamond opening.
    shape.moveTo(-0.47, -w * 0.76);
    shape.lineTo(0.015, -w * 0.76);
    shape.quadraticCurveTo(0.25, -w * 0.76, 0.47, 0);
    shape.quadraticCurveTo(0.25, w * 0.76, 0.015, w * 0.76);
    shape.lineTo(-0.47, w * 0.76);
    shape.closePath();
    shape.moveTo(-0.35, -w * 0.59);
    shape.lineTo(-0.35, w * 0.59);
    shape.lineTo(0.01, w * 0.59);
    shape.quadraticCurveTo(0.19, w * 0.59, 0.345, 0);
    shape.quadraticCurveTo(0.19, -w * 0.59, 0.01, -w * 0.59);
    shape.closePath();

    const star = [];
    for (let index = 0; index < 16; index++) {
      const angle = index * TAU / 16;
      const radius = index % 2 === 0 ? 1 : 0.66;
      star.push(-0.045 + 0.275 * radius * Math.cos(angle), w * 0.47 * radius * Math.sin(angle));
    }
    polygon(ink, ...star);
    polygon(ink, -0.161, 0, -0.045, w * 0.20, 0.071, 0, -0.045, -w * 0.20);
    polygon(ink, -0.361, -w * 0.047, -0.273, -w * 0.047,
      -0.273, w * 0.047, -0.361, w * 0.047);
    polygon(ink, 0.195, -w * 0.047, 0.35, -w * 0.047,
      0.35, w * 0.047, 0.195, w * 0.047);
    for (const y of [-0.36, 0, 0.36]) oval(light, -0.41, w * y, 0.018, w * 0.035);
  },
  lace({ shape, ink, light, thread }, { breadth: w }) {
    thread.moveTo(-0.28, -w * 0.96);
    thread.quadraticCurveTo(0.47, 0, -0.28, w * 0.96);
    for (const y of [-w * 0.67, w * 0.67]) {
      oval(ink, -0.09, y, 0.15, w * 0.19);
    }
    oval(shape, 0.19, 0, 0.25, w * 0.34);
    oval(light, 0.19, 0, 0.106, w * 0.15);
  },
};

const nordic = {
  petal({ shape, ink, light }, { breadth: w }) {
    // A tulip cup with rounded shoulders and one broad leaf.
    shape.moveTo(-0.44, 0);
    shape.bezierCurveTo(-0.40, -w * 0.73, 0.13, -w * 0.91, 0.42, -w * 0.76);
    shape.quadraticCurveTo(0.45, -w * 0.48, 0.20, -w * 0.26);
    shape.quadraticCurveTo(0.45, -w * 0.15, 0.48, 0);
    shape.quadraticCurveTo(0.45, w * 0.15, 0.20, w * 0.26);
    shape.quadraticCurveTo(0.45, w * 0.48, 0.42, w * 0.76);
    shape.bezierCurveTo(0.13, w * 0.91, -0.40, w * 0.73, -0.44, 0);
    shape.closePath();
    leaf(ink, -0.40, 0.31, w * 0.46);
    oval(light, -0.19, 0, 0.095, w * 0.13);
  },
  diamond({ shape, ink, light }, { breadth: w }) {
    diamond(shape, -0.47, 0.47, 0, w);
    polygon(ink, 0, -w, 0.47, 0, 0, w, -0.15, 0);
    diamond(light, -0.26, 0.26, 0, w * 0.48);
  },
  star({ shape, ink, light }, { breadth: w }) {
    polygon(shape, -0.49, 0, -0.14, -w * 0.27, 0, -w,
      0.14, -w * 0.27, 0.49, 0, 0.14, w * 0.27, 0, w, -0.14, w * 0.27);
    diamond(ink, -0.32, 0.32, 0, w * 0.51);
    diamond(light, -0.14, 0.14, 0, w * 0.23);
  },
  arc({ shape, ink, light }, { breadth: w }) {
    // A curved stem and two broad leaves hold three hanging bell flowers.
    shape.moveTo(-0.47, w * 0.44);
    shape.bezierCurveTo(-0.35, -w * 0.33, -0.05, -w * 0.69, 0.40, -w * 0.51);
    shape.lineTo(0.39, -w * 0.43);
    shape.bezierCurveTo(-0.02, -w * 0.58, -0.31, -w * 0.23, -0.42, w * 0.46);
    shape.closePath();
    shape.moveTo(-0.45, w * 0.39);
    shape.quadraticCurveTo(-0.51, w * 0.08, -0.43, -w * 0.24);
    shape.quadraticCurveTo(-0.25, w * 0.01, -0.45, w * 0.39);
    shape.closePath();
    ink.moveTo(-0.45, w * 0.41);
    ink.quadraticCurveTo(-0.32, w * 0.09, -0.17, w * 0.13);
    ink.quadraticCurveTo(-0.25, w * 0.43, -0.45, w * 0.41);
    ink.closePath();

    for (const [joint, top, x, y, width, drop] of [
      [-0.29, -0.13, -0.19, 0.00, 0.14, 0.36],
      [-0.11, -0.40, 0.03, -0.27, 0.136, 0.35],
      [0.16, -0.51, 0.30, -0.40, 0.115, 0.27],
    ]) {
      shape.moveTo(joint, top * w);
      shape.quadraticCurveTo(x, (top - 0.09) * w, x + 0.02, y * w);
      shape.lineTo(x - 0.035, y * w);
      shape.quadraticCurveTo(x - 0.05, top * w, joint, (top + 0.08) * w);
      shape.closePath();
      lilyBell(shape, x, y * w, width, drop * w);
      lilyBell(light, x, y * w, width, drop * w);
    }
  },
  tessellation({ shape, ink, light }, { breadth: w }) {
    // Six forked stitches radiate from a filled hexagonal center.
    const height = w * 1.17;
    const hub = [];
    for (let index = 0; index < 6; index++) {
      const turn = turnMotif(index * TAU / 6, height);
      polygon(shape, ...turn(0, -0.039), ...turn(0.255, -0.039), ...turn(0.332, -0.146),
        ...turn(0.391, -0.109), ...turn(0.340, -0.039), ...turn(0.472, -0.039),
        ...turn(0.472, 0.039), ...turn(0.340, 0.039), ...turn(0.391, 0.109),
        ...turn(0.332, 0.146), ...turn(0.255, 0.039), ...turn(0, 0.039));
      hub.push(...turn(0.123, 0));
    }
    polygon(ink, ...hub);
    oval(light, 0, 0, 0.039, height * 0.039);
  },
  lace({ shape, light }, { breadth: w }) {
    // Broad petals meet at a pale center with five cutouts for the stamens.
    const height = w * 1.25;
    oval(light, 0, 0, 0.133, height * 0.133);
    for (let index = 0; index < 5; index++) {
      const turn = turnMotif((index * TAU / 5) + Math.PI / 10, height);
      shape.moveTo(...turn(-0.07, 0.055));
      shape.bezierCurveTo(...turn(-0.36, -0.055), ...turn(-0.36, -0.33), ...turn(-0.18, -0.423));
      shape.quadraticCurveTo(...turn(-0.068, -0.480), ...turn(0, -0.402));
      shape.quadraticCurveTo(...turn(0.072, -0.478), ...turn(0.20, -0.412));
      shape.bezierCurveTo(...turn(0.36, -0.32), ...turn(0.28, -0.052), ...turn(0.07, 0.055));
      shape.closePath();

      const [x, y] = turn(0, -0.067);
      const stamen = 0.019;
      light.moveTo(x + stamen, y);
      light.ellipse(x, y, stamen, height * stamen, 0, 0, -TAU, true);
      light.closePath();
    }
  },
};

const japanese = {
  petal({ shape, ink, light }, { breadth: w }) {
    // One blossom petal with the shallow notch of a cherry flower.
    shape.moveTo(-0.48, 0);
    shape.bezierCurveTo(-0.28, -w * 0.47, -0.04, -w * 0.93, 0.29, -w * 0.88);
    shape.quadraticCurveTo(0.57, -w * 0.83, 0.43, -w * 0.32);
    shape.quadraticCurveTo(0.41, -w * 0.15, 0.29, 0);
    shape.quadraticCurveTo(0.41, w * 0.15, 0.43, w * 0.32);
    shape.quadraticCurveTo(0.57, w * 0.83, 0.29, w * 0.88);
    shape.bezierCurveTo(-0.04, w * 0.93, -0.28, w * 0.47, -0.48, 0);
    shape.closePath();
    leaf(ink, -0.43, 0.19, w * 0.48);
    oval(light, -0.21, 0, 0.10, w * 0.11);
  },
  diamond({ shape, ink, light }, { breadth: w }) {
    // The neck rises from the chest and folds down into the beak in one silhouette.
    polygon(shape, -0.49, -w * 0.31, -0.24, -w * 0.14, -0.36, -w * 0.80,
      -0.02, -w * 0.31, 0.13, -w * 0.15, 0.31, -w * 0.79,
      0.49, -w * 0.55, 0.34, -w * 0.61, 0.29, -w * 0.085,
      0.21, w * 0.17, -0.035, w * 0.81, -0.20, w * 0.24, -0.27, w * 0.23);
    polygon(ink, -0.36, -w * 0.80, -0.02, -w * 0.31, -0.24, -w * 0.14);
    polygon(ink, 0.13, -w * 0.15, 0.31, -w * 0.79, 0.34, -w * 0.61,
      0.29, -w * 0.085, 0.21, w * 0.17);
    polygon(light, -0.20, w * 0.24, 0.21, w * 0.17, -0.035, w * 0.81);
    polygon(light, 0.31, -w * 0.79, 0.49, -w * 0.55, 0.34, -w * 0.61);
  },
  star({ shape, ink, light }, { breadth: w }) {
    // Hemp-leaf facets with one open seam down the center.
    for (const side of [-1, 1]) {
      const y = side * w;
      polygon(shape, -0.49, y * 0.015, -0.03, y, 0.48, y * 0.015, 0, y * 0.21);
      polygon(ink, -0.31, y * 0.09, -0.03, y * 0.77, 0, y * 0.28);
      polygon(light, 0.02, y * 0.32, -0.03, y * 0.88, 0.30, y * 0.12);
    }
  },
  arc({ shape, ink, light, thread }, { breadth: w }) {
    // Three nested wave crests, sharing a flat break at the foot.
    shape.moveTo(-0.43, -w);
    shape.bezierCurveTo(0.74, -w, 0.74, w, -0.43, w);
    shape.closePath();
    ink.moveTo(-0.43, -w * 0.72);
    ink.bezierCurveTo(0.43, -w * 0.72, 0.43, w * 0.72, -0.43, w * 0.72);
    ink.closePath();
    light.moveTo(-0.43, -w * 0.39);
    light.bezierCurveTo(0.06, -w * 0.39, 0.06, w * 0.39, -0.43, w * 0.39);
    light.closePath();
    thread.moveTo(-0.43, -w * 0.86);
    thread.bezierCurveTo(0.57, -w * 0.86, 0.57, w * 0.86, -0.43, w * 0.86);
  },
  tessellation({ shape, ink, light }, { breadth: w }) {
    // Opposing S-curves alternate between a narrow waist and an open center.
    for (const side of [-w, w]) {
      tatewakuBand(shape, side, 0, 0.064);
      tatewakuBand(ink, side, 0.18, 0.031);
    }
    light.moveTo(0.08, 0);
    light.quadraticCurveTo(0.16, -w * 0.145, 0.24, 0);
    light.quadraticCurveTo(0.16, w * 0.145, 0.08, 0);
    light.closePath();
  },
  lace({ shape, ink, light, thread }, { breadth: w, bias }) {
    // A tied fan with three pleats and a single pearl at its hinge.
    shape.moveTo(-0.44, 0);
    shape.lineTo(0.13, -w);
    shape.quadraticCurveTo(0.68, 0, 0.13, w);
    shape.closePath();
    ink.moveTo(-0.24, 0);
    ink.lineTo(0.16, -w * 0.66);
    ink.quadraticCurveTo(0.46 + bias * 0.15, 0, 0.16, w * 0.66);
    ink.closePath();
    for (const y of [-w * 0.47, 0, w * 0.47]) {
      thread.moveTo(-0.31, 0);
      thread.lineTo(0.28, y);
    }
    oval(light, -0.29, 0, 0.075, w * 0.12);
  },
};

const tarot = {
  petal({ shape, ink, light }, { breadth: w }) {
    // Pomegranate: a round fruit crowned by its calyx, split open to show the seeds.
    oval(shape, -0.07, 0, 0.38, w * 0.70);
    polygon(shape, 0.20, -w * 0.26, 0.47, -w * 0.42, 0.37, -w * 0.14, 0.49, 0,
      0.37, w * 0.14, 0.47, w * 0.42, 0.20, w * 0.26);
    leaf(ink, -0.37, 0.21, w * 0.44);
    for (const [x, y] of [[-0.25, 0], [-0.14, -0.19], [-0.14, 0.19], [-0.08, 0],
      [0.01, -0.16], [0.01, 0.16], [0.09, 0]]) oval(light, x, y * w, 0.03, w * 0.052);
  },
  arc({ shape, ink, light }, { breadth: w }) {
    // Lily: the Magician card lily drawn as a three-petal fleur-de-lis.
    leaf(shape, -0.12, 0.49, w * 0.26);
    for (const s of [-1, 1]) {
      shape.moveTo(-0.04, s * w * 0.06);
      shape.bezierCurveTo(0.10, s * w * 0.10, 0.38, s * w * 0.40, 0.30, s * w * 0.84);
      shape.bezierCurveTo(0.24, s * w * 0.60, 0.10, s * w * 0.38, -0.04, s * w * 0.28);
      shape.closePath();
      shape.moveTo(-0.15, s * w * 0.10);
      shape.quadraticCurveTo(-0.30, s * w * 0.42, -0.45, s * w * 0.32);
      shape.quadraticCurveTo(-0.30, s * w * 0.24, -0.15, s * w * 0.24);
      shape.closePath();
    }
    polygon(shape, -0.15, -w * 0.12, -0.15, w * 0.12, -0.42, 0);
    polygon(shape, -0.16, -w * 0.32, -0.04, -w * 0.32, -0.04, w * 0.32, -0.16, w * 0.32);
    leaf(ink, 0.00, 0.40, w * 0.11);
    polygon(light, -0.135, -w * 0.29, -0.065, -w * 0.29, -0.065, w * 0.29, -0.135, w * 0.29);
  },
  lace({ shape, ink, light }, { breadth: w }) {
    // Infinity: a two-tone ribbon in a figure eight, a small star in each loop.
    const pts = [];
    for (let i = 0; i < 120; i++) {
      const t = i * TAU / 120, d = 1 + Math.sin(t) ** 2;
      pts.push([0.85 * Math.sin(t) * Math.cos(t) / d, w * 0.84 * Math.cos(t) / d]);
    }
    ribbon(shape, pts, 0.07);
    ribbon(ink, pts, 0.024);
    for (const s of [-1, 1]) sparkle(light, 0, s * w * 0.50, 0.06, w * 0.10, 0.14);
  },
  diamond({ shape, ink, light }, { breadth: w }) {
    // Chalice: a flat silhouette with a rim line, a jewel and a knotted stem.
    shape.moveTo(0.47, -w * 0.52);
    shape.bezierCurveTo(0.22, -w * 0.52, 0.12, -w * 0.26, 0.10, -w * 0.07);
    for (const [x, y] of [[-0.30, -0.06], [-0.40, -0.36], [-0.47, -0.38],
      [-0.47, 0.38], [-0.40, 0.36], [-0.30, 0.06], [0.10, 0.07]]) shape.lineTo(x, y * w);
    shape.bezierCurveTo(0.12, w * 0.26, 0.22, w * 0.52, 0.47, w * 0.52);
    shape.closePath();
    oval(shape, -0.08, 0, 0.045, w * 0.12);
    polygon(ink, 0.47, -w * 0.52, 0.47, w * 0.52, 0.40, w * 0.51, 0.40, -w * 0.51);
    polygon(ink, -0.47, -w * 0.38, -0.43, -w * 0.37, -0.43, w * 0.37, -0.47, w * 0.38);
    oval(light, 0.24, 0, 0.045, w * 0.10);
    oval(light, -0.08, 0, 0.022, w * 0.05);
  },
  star({ shape, ink, light }, { breadth: w }) {
    // Sun: straight rays alternate with wavy ones around a bright disc.
    const h = w * 1.05;
    oval(shape, 0, 0, 0.22, h * 0.22);
    for (let i = 0; i < 16; i++) {
      const t = turnMotif(i * TAU / 16, h);
      if (i % 2 === 0) {
        polygon(shape, ...t(0.15, -0.055), ...t(0.49, 0), ...t(0.15, 0.055));
      } else {
        shape.moveTo(...t(0.15, -0.045));
        shape.bezierCurveTo(...t(0.23, -0.10), ...t(0.29, 0.06), ...t(0.41, 0));
        shape.bezierCurveTo(...t(0.29, 0.10), ...t(0.23, -0.04), ...t(0.15, 0.045));
        shape.closePath();
      }
    }
    oval(ink, 0, 0, 0.175, h * 0.175);
    oval(light, 0, 0, 0.13, h * 0.13);
  },
  tessellation({ shape, ink, light }, { breadth: w }) {
    // All-seeing eye: an eye inside a triangle, with twelve rays behind it.
    const h = w * 1.05;
    for (let i = 0; i < 12; i++) {
      const t = turnMotif(i * TAU / 12 + TAU / 24, h);
      polygon(shape, ...t(0.12, -0.028), ...t(i % 2 ? 0.40 : 0.49, 0), ...t(0.12, 0.028));
    }
    const tri = (r) => [0, 1, 2].flatMap((k) => turnMotif(k * TAU / 3, h)(r, 0));
    polygon(shape, ...tri(0.36));
    polygon(ink, ...tri(0.28));
    light.moveTo(-0.04, -h * 0.16);
    light.quadraticCurveTo(0.07, 0, -0.04, h * 0.16);
    light.quadraticCurveTo(-0.15, 0, -0.04, -h * 0.16);
    light.closePath();
    hole(light, -0.04, 0, 0.032, h * 0.05);
  },
};

const dimsum = {
  petal({ shape, ink, light }, { breadth: w }) {
    // Xiaolongbao: a plump bun whose pleats swirl into a twisted knot.
    shape.moveTo(-0.42, 0);
    shape.bezierCurveTo(-0.47, -w * 0.82, 0.08, -w * 0.98, 0.32, -w * 0.30);
    shape.quadraticCurveTo(0.40, -w * 0.14, 0.48, -w * 0.05);
    shape.quadraticCurveTo(0.50, 0, 0.48, w * 0.05);
    shape.quadraticCurveTo(0.40, w * 0.14, 0.32, w * 0.30);
    shape.bezierCurveTo(0.08, w * 0.98, -0.47, w * 0.82, -0.42, 0);
    shape.closePath();
    for (const k of [-2, -1, 0, 1, 2]) {
      const sx = 0.41, sy = k * 0.025 * w;
      const ex = -0.06 + Math.abs(k) * 0.065, ey = k * 0.27 * w;
      const mx = (sx + ex) / 2, my = (sy + ey) / 2 + w * 0.10;
      const d = w * 0.035;
      ink.moveTo(sx, sy);
      ink.quadraticCurveTo(mx, my - d, ex, ey);
      ink.quadraticCurveTo(mx, my + d, sx, sy);
      ink.closePath();
    }
  },
  diamond({ shape, ink, light }, { breadth: w }) {
    // Bamboo leaves: five slender leaves fanning from one short twig, two tones alternating.
    polygon(shape, -0.48, -w * 0.035, -0.36, -w * 0.03, -0.36, w * 0.03, -0.48, w * 0.035);
    const x0 = -0.38;
    for (const [deg, len, layer] of [[0, 0.86, shape], [62, 0.70, shape], [-62, 0.70, shape],
      [30, 0.80, ink], [-30, 0.80, ink]]) {
      const a = deg * Math.PI / 180;
      lanceLeaf(layer, x0, 0, x0 + len * Math.cos(a), w * len * Math.sin(a), 0.14);
    }
    streak(light, -0.30, 0, 0.36, 0, w * 0.012);
  },
  star({ shape, ink, light }, { breadth: w }) {
    // Star anise: eight boat-shaped pods, each holding one glossy seed.
    const h = w * 1.12;
    oval(shape, 0, 0, 0.09, h * 0.09);
    for (let i = 0; i < 8; i++) {
      const t = turnMotif(i * TAU / 8, h);
      shape.moveTo(...t(0.04, -0.05));
      shape.quadraticCurveTo(...t(0.26, -0.19), ...t(0.49, 0));
      shape.quadraticCurveTo(...t(0.26, 0.19), ...t(0.04, 0.05));
      shape.closePath();
      ink.moveTo(...t(0.15, 0));
      ink.quadraticCurveTo(...t(0.29, -0.085), ...t(0.44, 0));
      ink.quadraticCurveTo(...t(0.29, 0.085), ...t(0.15, 0));
      ink.closePath();
      const [x, y] = t(0.28, 0);
      oval(light, x, y, 0.032, h * 0.032);
    }
    oval(ink, 0, 0, 0.055, h * 0.055);
  },
  arc({ shape, ink, light }, { breadth: w }) {
    // Mooncake from above: a scalloped edge around a pressed flower pattern.
    const h = w * 1.05, n = 12;
    const at = (a, r) => [r * Math.cos(a), h * r * Math.sin(a)];
    shape.moveTo(...at(0, 0.44));
    for (let i = 0; i < n; i++) {
      shape.quadraticCurveTo(...at((i + 0.5) * TAU / n, 0.53), ...at((i + 1) * TAU / n, 0.44));
    }
    shape.closePath();
    oval(ink, 0, 0, 0.36, h * 0.36);
    oval(light, 0, 0, 0.32, h * 0.32);
    hole(light, 0, 0, 0.285, h * 0.285);
    for (let i = 0; i < 8; i++) {
      const t = turnMotif(i * TAU / 8 + TAU / 16, h);
      light.moveTo(...t(0.05, 0));
      light.quadraticCurveTo(...t(0.14, -0.075), ...t(0.23, 0));
      light.quadraticCurveTo(...t(0.14, 0.075), ...t(0.05, 0));
      light.closePath();
    }
    oval(light, 0, 0, 0.035, h * 0.035);
  },
  tessellation({ shape, ink, light }, { breadth: w }) {
    // Chopsticks: a tapered pair, tips toward the center, resting on a small rest.
    for (const s of [-1, 1]) {
      polygon(shape, -0.47, s * w * 0.035, -0.47, s * w * 0.085,
        0.47, s * w * 0.37, 0.47, s * w * 0.23);
      for (const x of [0.22, 0.28]) {
        const c = 0.06 + 0.24 * (x + 0.47) / 0.94;
        const half = 0.025 + 0.045 * (x + 0.47) / 0.94;
        polygon(light, x - 0.012, s * w * (c - half - 0.004), x + 0.012, s * w * (c - half),
          x + 0.012, s * w * (c + half + 0.004), x - 0.012, s * w * (c + half));
      }
    }
    // The rest shows only in the gaps, so the sticks read as lying on top of it.
    polygon(ink, -0.16, -w * 0.08, -0.04, -w * 0.08, -0.04, w * 0.08, -0.16, w * 0.08);
    for (const s of [-1, 1]) {
      polygon(ink, -0.16, s * w * 0.24, -0.04, s * w * 0.25, -0.04, s * w * 0.38, -0.16, s * w * 0.38);
      oval(ink, -0.10, s * w * 0.38, 0.06, w * 0.06);
    }
  },
  lace({ shape, ink, light }, { breadth: w }) {
    // Teacup as a flat side silhouette: straight rim, painted rim line and band, flared foot.
    shape.moveTo(0.40, -w * 0.64);
    shape.bezierCurveTo(0.18, -w * 0.62, -0.14, -w * 0.44, -0.24, -w * 0.26);
    shape.lineTo(-0.25, -w * 0.20);
    shape.lineTo(-0.44, -w * 0.24);
    shape.lineTo(-0.44, w * 0.24);
    shape.lineTo(-0.25, w * 0.20);
    shape.lineTo(-0.24, w * 0.26);
    shape.bezierCurveTo(-0.14, w * 0.44, 0.18, w * 0.62, 0.40, w * 0.64);
    shape.closePath();
    polygon(ink, 0.40, -w * 0.64, 0.40, w * 0.64, 0.331, w * 0.63, 0.331, -w * 0.63);
    polygon(light, 0.03, -w * 0.49, 0.03, w * 0.49, -0.03, w * 0.455, -0.03, -w * 0.455);
  },
};

const cosmos = {
  petal({ shape, ink, light }, { breadth: w }) {
    // Alien head: a pointed chin, a wide dome and two tilted almond eyes.
    shape.moveTo(-0.47, 0);
    shape.bezierCurveTo(-0.30, -w * 0.22, -0.12, -w * 0.86, 0.18, -w * 0.84);
    shape.bezierCurveTo(0.44, -w * 0.82, 0.49, -w * 0.36, 0.49, 0);
    shape.bezierCurveTo(0.49, w * 0.36, 0.44, w * 0.82, 0.18, w * 0.84);
    shape.bezierCurveTo(-0.12, w * 0.86, -0.30, w * 0.22, -0.47, 0);
    shape.closePath();
    for (const s of [-1, 1]) {
      ink.moveTo(-0.10, s * w * 0.10);
      ink.bezierCurveTo(-0.03, s * w * 0.58, 0.20, s * w * 0.74, 0.31, s * w * 0.63);
      ink.bezierCurveTo(0.29, s * w * 0.34, 0.06, s * w * 0.12, -0.10, s * w * 0.10);
      ink.closePath();
      oval(light, 0.19, s * w * 0.52, 0.03, w * 0.06);
    }
    oval(ink, -0.31, 0, 0.012, w * 0.06);
  },
  diamond({ shape, ink, light }, { breadth: w }) {
    // Rocket: nose cone outward, three fins and a round porthole.
    const h = w * 1.1;
    shape.moveTo(0.49, 0);
    shape.quadraticCurveTo(0.36, -w * 0.30, 0.14, -w * 0.30);
    for (const [x, y] of [[-0.10, -0.30], [-0.45, -0.72], [-0.38, -0.26], [-0.47, -0.16],
      [-0.47, 0.16], [-0.38, 0.26], [-0.45, 0.72], [-0.10, 0.30], [0.14, 0.30]]) {
      shape.lineTo(x, y * w);
    }
    shape.quadraticCurveTo(0.36, w * 0.30, 0.49, 0);
    shape.closePath();
    ink.moveTo(0.49, 0);
    ink.quadraticCurveTo(0.398, -w * 0.213, 0.264, -w * 0.275);
    ink.lineTo(0.264, w * 0.275);
    ink.quadraticCurveTo(0.398, w * 0.213, 0.49, 0);
    ink.closePath();
    for (const s of [-1, 1]) polygon(ink, -0.10, s * w * 0.30, -0.45, s * w * 0.72, -0.38, s * w * 0.26);
    polygon(ink, -0.44, -w * 0.045, -0.12, -w * 0.045, -0.12, w * 0.045, -0.44, w * 0.045);
    oval(ink, 0.07, 0, 0.10, h * 0.10);
    oval(light, 0.07, 0, 0.066, h * 0.066);
  },
  star({ shape, ink, light }, { breadth: w }) {
    // Twinkle: a long four-point star crossed by a shorter diagonal one.
    sparkle(shape, 0, 0, 0.48, w * 0.90, 0.12);
    ink.moveTo(0.27, w * 0.48);
    ink.quadraticCurveTo(0, w * 0.07, -0.27, w * 0.48);
    ink.quadraticCurveTo(-0.04, 0, -0.27, -w * 0.48);
    ink.quadraticCurveTo(0, -w * 0.07, 0.27, -w * 0.48);
    ink.quadraticCurveTo(0.04, 0, 0.27, w * 0.48);
    ink.closePath();
    sparkle(light, 0, 0, 0.13, w * 0.24, 0.14);
    sparkle(light, 0.38, -w * 0.74, 0.07, w * 0.13, 0.14);
    sparkle(light, -0.38, w * 0.74, 0.07, w * 0.13, 0.14);
  },
  arc({ shape, ink, light }, { breadth: w }) {
    // Saturn: the front half of the ring passes over the planet; the back half hides behind it.
    const h = w * 1.05, tilt = Math.PI / 2 - 0.32;
    oval(shape, 0, 0, 0.27, h * 0.27);
    arcAt(shape, 0, 0, w * 0.94, 0.13, tilt, 0, TAU);
    shape.closePath();
    arcAt(shape, 0, 0, w * 0.78, 0.075, tilt, 0, -TAU, true);
    shape.closePath();
    arcAt(ink, 0, 0, 0.27, h * 0.27, 0, -Math.PI / 2, Math.PI / 2);
    ink.ellipse(0, 0, 0.11, h * 0.27, 0, Math.PI / 2, -Math.PI / 2, true);
    ink.closePath();
    arcAt(light, 0, 0, w * 0.94, 0.13, tilt, 0, Math.PI);
    light.ellipse(0, 0, w * 0.78, 0.075, tilt, Math.PI, 0, true);
    light.closePath();
    oval(light, 0.37, -w * 0.70, 0.04, w * 0.075);
  },
  tessellation({ shape, ink, light }, { breadth: w }) {
    // Satellite: a boxy body, two gridded solar wings and a dish facing outward.
    polygon(shape, -0.16, -w * 0.20, 0.16, -w * 0.20, 0.16, w * 0.20, -0.16, w * 0.20);
    polygon(shape, 0.15, -w * 0.035, 0.27, -w * 0.035, 0.27, w * 0.035, 0.15, w * 0.035);
    shape.moveTo(0.38, -w * 0.30);
    shape.quadraticCurveTo(0.12, 0, 0.38, w * 0.30);
    shape.lineTo(0.41, w * 0.25);
    shape.quadraticCurveTo(0.22, 0, 0.41, -w * 0.25);
    shape.closePath();
    polygon(shape, 0.28, -w * 0.02, 0.45, -w * 0.02, 0.45, w * 0.02, 0.28, w * 0.02);
    oval(shape, 0.455, 0, 0.032, w * 0.06);
    for (const s of [-1, 1]) {
      polygon(shape, -0.03, s * w * 0.20, 0.03, s * w * 0.20, 0.03, s * w * 0.32, -0.03, s * w * 0.32);
      polygon(shape, -0.16, s * w * 0.32, 0.16, s * w * 0.32, 0.16, s * w * 0.97, -0.16, s * w * 0.97);
      for (const [c0, c1] of [[-0.13, -0.015], [0.015, 0.13]]) {
        for (let r = 0; r < 3; r++) {
          const y0 = (0.35 + r * 0.205) * w, y1 = y0 + 0.18 * w;
          polygon(ink, c0, s * y0, c1, s * y0, c1, s * y1, c0, s * y1);
        }
      }
    }
    polygon(ink, -0.11, -w * 0.14, 0.11, -w * 0.14, 0.11, w * 0.14, -0.11, w * 0.14);
    oval(light, 0, 0, 0.055, w * 0.085);
    oval(light, 0.455, 0, 0.016, w * 0.03);
  },
  lace({ shape, ink, light, thread }, { breadth: w }) {
    // Flying saucer: glass dome outward, a ring of lights, a tractor beam toward the center.
    for (const y of [-0.58, 0, 0.58]) {
      thread.moveTo(-0.13, y * 0.42 * w);
      thread.lineTo(-0.46, y * w);
    }
    arcAt(shape, 0.04, 0, 0.36, w * 0.38, 0, -Math.PI / 2, Math.PI / 2);
    shape.closePath();
    oval(shape, 0.02, 0, 0.13, w * 0.93);
    arcAt(ink, 0.06, 0, 0.31, w * 0.32, 0, -Math.PI / 2, Math.PI / 2);
    ink.closePath();
    oval(ink, -0.01, 0, 0.045, w * 0.84);
    arcAt(light, 0.08, 0, 0.25, w * 0.25, 0, -Math.PI / 2, Math.PI / 2);
    light.closePath();
    hole(light, 0.22, -w * 0.10, 0.03, w * 0.06);
    for (const y of [-0.62, -0.31, 0, 0.31, 0.62]) oval(light, -0.01, y * w, 0.024, w * 0.045);
  },
};

const styles = { indian, nordic, japanese, tarot, dimsum, cosmos };

export function makeBloomMotif(ring, style) {
  const layers = { shape: new Path2D(), ink: new Path2D(), light: new Path2D(), thread: new Path2D() };
  styles[style][ring.family](layers, ring);
  return layers;
}
