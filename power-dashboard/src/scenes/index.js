// 建立一幅發電廠插畫：<svg viewBox="0 0 400 300">，slice 裁切，重要內容放在 x 40–360 的安全區。
import { el } from '../util.js';
import * as gas from './gas.js';
import * as coal from './coal.js';
import * as solar from './solar.js';
import * as wind from './wind.js';
import * as hydro from './hydro.js';
import * as other from './other.js';

const BUILDERS = { gas, coal, solar, wind, hydro, other };

export function createScene(container, plant) {
  const svg = el('svg', { viewBox: '0 0 400 300', preserveAspectRatio: 'xMidYMid slice', class: 'scene', 'aria-hidden': 'true', focusable: 'false' });
  container.appendChild(svg);
  const scene = BUILDERS[plant].build(svg);
  return { svg, plant, ...scene };
}
