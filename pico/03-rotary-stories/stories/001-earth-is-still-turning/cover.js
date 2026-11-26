// Cover and spine for RS 001. Pure SVG strings: no fonts are embedded, the page fonts are used.
//
// Four bands of the same horizon — the E-017 skyline seen in four seasons — inside a round
// window whose lower edge is still under the shutter. In the last band the water tower is gone.

const SEASONS = [
  { fill: '#A8C5B5', ink: '#5E7F70' }, // spring
  { fill: '#2E6F66', ink: '#173F3A' }, // summer
  { fill: '#C99A45', ink: '#7C5A22' }, // autumn
  { fill: '#A3A49F', ink: '#5F605B' }, // winter
];

function skyline(y, ink, { tower = true } = {}) {
  // Casuarina windbreak (bumpy), houses, the school block with its flagpole, the temple ridge.
  let p = `M40 ${y}`;
  for (let x = 40; x <= 140; x += 7) p += ` Q${x + 3.5} ${y - 10 - ((x * 7) % 5)} ${x + 7} ${y - 4}`;
  p += ` L140 ${y} Z`;
  const houses = [
    [150, 14], [166, 18], [184, 12], [232, 16], [246, 20], [262, 13], [300, 15], [316, 11],
  ]
    .map(([x, hgt]) => `<rect x="${x}" y="${y - hgt}" width="14" height="${hgt}"/>`)
    .join('');
  const school = `<rect x="196" y="${y - 24}" width="34" height="24"/><rect x="226" y="${y - 40}" width="1.4" height="40"/><path d="M227.4 ${y - 40} h6 v3.5 h-6z"/>`;
  const temple = `<path d="M274 ${y} v-9 h22 v9z M270 ${y - 9} Q276 ${y - 13} 285 ${y - 13} Q294 ${y - 13} 300 ${y - 9} Q303 ${y - 17} 305 ${y - 18} Q300 ${y - 12} 298 ${y - 9} Z M270 ${y - 9} Q267 ${y - 17} 265 ${y - 18} Q270 ${y - 12} 272 ${y - 9} Z"/>`;
  const wt = tower
    ? `<path d="M334 ${y} l3 -22 h1.4 l-2.5 22z M346 ${y} l-3 -22 h-1.4 l2.5 22z"/><rect x="333" y="${y - 31}" width="14" height="10" rx="1"/>`
    : '';
  return `<g fill="${ink}"><path d="${p}"/>${houses}${school}${temple}${wt}</g>`;
}

export function coverSVG({ id = 'rs001' } = {}) {
  const cx = 200;
  const cy = 255;
  const r = 150;
  const top = cy - r;
  const bandH = 70;
  let bands = '';
  let ghost = '';
  SEASONS.forEach((s, i) => {
    const y0 = top + i * bandH;
    bands += `<rect x="40" y="${y0}" width="320" height="${bandH + 1}" fill="${s.fill}"/>`;
    bands += skyline(y0 + bandH - 4, s.ink, { tower: i < 3 });
    // A second impression a hair out of register, as in stencil printing.
    ghost += `<rect x="40" y="${y0 + 1.6}" width="320" height="${bandH}" fill="${s.fill}" opacity="0.35"/>`;
  });
  const slats = [0, 1, 2]
    .map((k) => {
      const y = cy + r - 46 + k * 16;
      return `<rect x="40" y="${y}" width="320" height="15" fill="#2C2E2A"/><rect x="40" y="${y}" width="320" height="1.2" fill="#55584F"/>`;
    })
    .join('');
  return `<svg viewBox="0 0 400 600" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="地球仍有四季 封面">
  <defs>
    <filter id="${id}-grain" x="0" y="0" width="100%" height="100%">
      <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2" seed="7" result="n"/>
      <feColorMatrix in="n" type="matrix" values="0 0 0 0 0.25  0 0 0 0 0.22  0 0 0 0 0.18  0 0 0 0.09 0"/>
      <feComposite in2="SourceGraphic" operator="in"/>
    </filter>
    <clipPath id="${id}-win"><circle cx="${cx}" cy="${cy}" r="${r}"/></clipPath>
  </defs>
  <rect width="400" height="600" fill="#EAE3D3"/>
  <g clip-path="url(#${id}-win)">${ghost}${bands}${slats}</g>
  <circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="#1E1C19" stroke-width="1.2"/>
  <circle cx="${cx}" cy="${cy}" r="${r + 7}" fill="none" stroke="#1E1C19" stroke-width="0.5"/>
  <text x="34" y="40" font-family="IBM Plex Mono, monospace" font-size="11" letter-spacing="2" fill="#1E1C19">RS 001</text>
  <text x="366" y="40" font-family="IBM Plex Mono, monospace" font-size="9" letter-spacing="1.5" fill="#6B655B" text-anchor="end">SCIENCE FICTION</text>
  <text x="34" y="470" font-family="Cormorant Garamond, serif" font-style="italic" font-size="21" fill="#1E1C19">Earth is still turning</text>
  <text x="34" y="452" font-family="Noto Serif TC, serif" font-weight="900" font-size="38" letter-spacing="4" fill="#1E1C19">地球仍有四季</text>
  <line x1="34" y1="500" x2="366" y2="500" stroke="#1E1C19" stroke-width="0.6"/>
  <text x="34" y="522" font-family="Noto Serif TC, serif" font-size="11.5" letter-spacing="1" fill="#3B3731">移民船上的檔案員，在抵達前整理地球的照片。</text>
  <text x="34" y="568" font-family="IBM Plex Mono, monospace" font-size="9" letter-spacing="2.4" fill="#6B655B">ROTARY STORIES · WEIRD LAB / 03</text>
  <rect width="400" height="600" filter="url(#${id}-grain)"/>
</svg>`;
}

export function spineSVG() {
  return `<svg viewBox="0 0 44 600" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
  <rect width="44" height="600" fill="#E4DCCA"/>
  <text x="22" y="34" font-family="IBM Plex Mono, monospace" font-size="8" fill="#1E1C19" text-anchor="middle">RS</text>
  <text x="22" y="46" font-family="IBM Plex Mono, monospace" font-size="8" fill="#1E1C19" text-anchor="middle">001</text>
  ${SEASONS.map((s, i) => `<rect x="12" y="${70 + i * 10}" width="20" height="10" fill="${s.fill}"/>`).join('')}
  <text x="22" y="140" font-family="Noto Serif TC, serif" font-weight="900" font-size="19" fill="#1E1C19" writing-mode="tb" letter-spacing="4" text-anchor="start">地球仍有四季</text>
  <text x="22" y="560" font-family="IBM Plex Mono, monospace" font-size="6.5" fill="#6B655B" text-anchor="middle" letter-spacing="1">RS</text>
</svg>`;
}
