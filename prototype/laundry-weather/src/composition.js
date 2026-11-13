// Keep every object undistorted while filling any viewport. All positions share
// the same rope equation, so the clothespins remain on the curved line.
export function composeScene(svg, width, height, mobile) {
  const w = mobile ? 480 : 1440;
  const h = w * height / width;
  const fit = Math.min(1, h / (mobile ? 900 : 800));
  svg.setAttribute('viewBox', `0 0 ${w} ${h}`);
  const set = (selector, name, value) => svg.querySelector(selector)?.setAttribute(name, value);
  set('#ink-grain', 'patternTransform', `scale(${w / width})`);
  const position = (selector, x, y, scale = 1, angle = 0) =>
    set(selector, 'transform', `translate(${x} ${y}) rotate(${angle}) scale(${scale})`);
  const rope = (selector, start, middle, end) => {
    const x0 = mobile ? -40 : -100, x1 = w / 2, x2 = w - x0;
    set(selector, 'd', `M${x0} ${start}Q${x1} ${middle} ${x2} ${end}`);
    return x => {
      const t = (x - x0) / (x2 - x0), u = 1 - t;
      const y = u * u * start + 2 * u * t * middle + t * t * end;
      const slope = 2 * (u * (middle - start) + t * (end - middle)) / (x2 - x0);
      return {y, angle: Math.atan(slope) * 180 / Math.PI};
    };
  };
  const garment = (selector, x, line, scale) => {
    const {y, angle} = line(x);
    position(selector, x, y, scale, angle);
  };
  position('.sky-field', 0, 0);
  set('.sky-field', 'transform', `scale(1 ${h / 900})`);
  set('.foreground-field', 'transform', mobile ? `translate(-950 ${h * .08}) scale(1 ${h / 900})` : `scale(1 ${h / 900})`);
  if (mobile) {
    const first = rope('.rope-one', h * .31, h * .46, h * .32);
    const second = rope('.rope-two', h * .58, h * .72, h * .59);
    garment('.tee-layout', 132, first, .76 * fit);
    garment('.sock-layout', 350, first, .78 * fit);
    garment('.towel-layout', 125, second, .71 * fit);
    garment('.long-layout', 354, second, .71 * fit);
    position('.sun-layout', 399, h * .17, .5);
    position('.moon-layout', 399, h * .17, .5);
    position('.cloud-one', 397, h * .23, .48);
    position('.cloud-extra', 310, h * .19, .8);
    position('.cat-layout', 213, h * .94, .66 * fit);
    position('.ledge-layout', 0, h * .94);
    set('.rain-layer', 'transform', `scale(.34 ${h / 900})`);
  } else {
    const line = rope('.rope-one', h * .3, h * .63, h * .32);
    garment('.tee-layout', 300, line, 1.27 * fit);
    garment('.sock-layout', 645, line, 1.18 * fit);
    garment('.towel-layout', 930, line, 1.16 * fit);
    garment('.long-layout', 1230, line, 1.14 * fit);
    position('.sun-layout', 1200, h * .21, 1.05);
    position('.moon-layout', 1200, h * .21, 1.05);
    position('.cloud-one', 1165, h * .32, 1.12);
    position('.cloud-extra', 1090, h * .27, 1.6);
    position('.cat-layout', 425, h * .94, 1.1 * fit);
    position('.ledge-layout', 0, h * .94);
    set('.rain-layer', 'transform', `scale(1 ${h / 900})`);
  }
}
