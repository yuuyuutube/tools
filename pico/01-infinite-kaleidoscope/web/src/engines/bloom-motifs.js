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

const styles = { indian, nordic, japanese };

export function makeBloomMotif(ring, style) {
  const layers = { shape: new Path2D(), ink: new Path2D(), light: new Path2D(), thread: new Path2D() };
  styles[style][ring.family](layers, ring);
  return layers;
}
