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
  diamond({ shape, ink, light }, { breadth: w, bias }) {
    const seam = (bias - 0.5) * 0.22;
    diamond(shape, -0.49, 0.49, 0, w * 0.97, seam);
    polygon(ink, -0.49, 0, seam, -w * 0.97, 0.21, 0, seam, w * 0.97);
    diamond(light, -0.27, 0.36, 0, w * 0.47, seam + 0.02);
  },
  star({ shape, ink, light }, { breadth: w }) {
    polygon(shape, -0.49, 0, -0.14, -w * 0.31, -0.12, -w,
      0.14, -w * 0.48, 0.42, -w * 0.70, 0.32, 0,
      0.42, w * 0.70, 0.14, w * 0.48, -0.12, w, -0.14, w * 0.31);
    leaf(ink, -0.38, 0.39, w * 0.44);
    oval(light, -0.04, 0, 0.095, w * 0.15);
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
    // A pointed arch with an open interior and a single colored keystone.
    polygon(shape, -0.47, -w * 0.82, 0.04, -w * 0.82, 0.49, 0,
      0.04, w * 0.82, -0.47, w * 0.82);
    polygon(ink, -0.39, -w * 0.49, 0.01, -w * 0.49, 0.32, 0,
      0.01, w * 0.49, -0.39, w * 0.49);
    diamond(light, -0.24, 0.17, 0, w * 0.28);
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
  arc({ shape, ink, light }, { breadth: w, bias }) {
    // A pair of folk-art birds with a beak, a plump belly and a painted wing.
    for (const side of [-1, 1]) {
      const y = side * w;
      shape.moveTo(0.37, y * 0.12);
      shape.lineTo(0.28, y * 0.37);
      shape.bezierCurveTo(0.54, y * 0.67, 0.20, y * 0.93, 0.01, y * 0.78);
      shape.quadraticCurveTo(-0.14, y * 0.70, -0.29, y);
      shape.quadraticCurveTo(-0.49, y * 0.75, -0.42, y * 0.45);
      shape.bezierCurveTo(-0.27, y * 0.21, -0.04, y * 0.19, 0.18, y * 0.32);
      shape.closePath();
      oval(ink, -0.19, y * (0.46 + 0.10 * bias), 0.15, w * 0.12);
      oval(light, 0.25, y * 0.55, 0.045, w * 0.067);
    }
  },
  tessellation({ shape, ink, light }, { breadth: w }) {
    polygon(shape, -0.44, -w * 0.65, 0.07, -w * 0.65, 0.07, -w,
      0.49, 0, 0.07, w, 0.07, w * 0.65, -0.44, w * 0.65);
    polygon(ink, 0.10, -w * 0.62, 0.36, 0, 0.10, w * 0.62);
    polygon(light, -0.39, -w * 0.20, -0.11, -w * 0.20, -0.11, w * 0.20, -0.39, w * 0.20);
  },
  lace({ shape, ink, light, thread }, { breadth: w }) {
    // Spaced berry pairs around a single spruce-shaped silhouette.
    polygon(shape, -0.44, -w * 0.32, -0.20, -w * 0.32, -0.20, -w * 0.73,
      0.10, -w * 0.39, 0.10, -w * 0.58, 0.48, 0,
      0.10, w * 0.58, 0.10, w * 0.39, -0.20, w * 0.73, -0.20, w * 0.32, -0.44, w * 0.32);
    thread.moveTo(-0.44, 0);
    thread.lineTo(0.30, 0);
    oval(ink, 0.04, -w * 0.82, 0.11, w * 0.14);
    oval(ink, 0.04, w * 0.82, 0.11, w * 0.14);
    oval(light, 0.20, 0, 0.08, w * 0.13);
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
  diamond({ shape, ink, light }, { breadth: w, bias }) {
    const joint = -0.10 + bias * 0.16;
    diamond(shape, -0.49, 0.49, 0, w, joint);
    diamond(ink, -0.32, 0.31, 0, w * 0.63, joint);
    diamond(light, -0.23, 0.22, 0, w * 0.29, joint * 0.7);
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
    // An interlocking Shippo cell, painted as four generous curved lobes.
    oval(shape, 0, 0, 0.45, w * 0.86);
    oval(ink, -0.16, 0, 0.25, w * 0.42);
    oval(ink, 0.16, 0, 0.25, w * 0.42);
    oval(light, 0, -w * 0.34, 0.20, w * 0.35);
    oval(light, 0, w * 0.34, 0.20, w * 0.35);
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
