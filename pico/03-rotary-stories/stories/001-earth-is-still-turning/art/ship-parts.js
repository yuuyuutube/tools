// Hardware aboard the ship, drawn as SVG / HTML so it stays crisp at any size.
import { esc } from '../../../src/engine/dom.js';

// The shutter handwheel: six spokes, a rubber-wrapped rim worn bright where hands go,
// a hub with the ratchet pawl. The rotor group turns; the pawl and bracket do not.
export function handwheelSVG() {
  const spokes = [0, 60, 120, 180, 240, 300]
    .map((a) => `<g transform="rotate(${a} 100 100)"><path d="M96 100 L97.5 32 h5 L104 100z" fill="url(#hw-steel)"/><path d="M97.5 32 h5 l-0.6 40 h-3.8z" fill="rgba(255,255,255,0.08)"/></g>`)
    .join('');
  const grip = Array.from({ length: 36 }, (_, i) => `<line x1="100" y1="17" x2="100" y2="25" transform="rotate(${i * 10} 100 100)" />`).join('');
  return `<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <radialGradient id="hw-steel" cx="40%" cy="35%" r="80%"><stop offset="0" stop-color="#8b8a82"/><stop offset="0.6" stop-color="#5b5b55"/><stop offset="1" stop-color="#33332f"/></radialGradient>
    <radialGradient id="hw-rim" cx="50%" cy="50%" r="50%"><stop offset="0.82" stop-color="#262624"/><stop offset="0.9" stop-color="#3a3936"/><stop offset="1" stop-color="#1b1b19"/></radialGradient>
    <radialGradient id="hw-hub" cx="40%" cy="35%" r="70%"><stop offset="0" stop-color="#a39f92"/><stop offset="1" stop-color="#45443f"/></radialGradient>
  </defs>
  <circle cx="100" cy="100" r="99" fill="rgba(0,0,0,0.25)"/>
  <g class="hw-bracket"><rect x="88" y="100" width="24" height="96" rx="3" fill="#2f312d"/><rect x="88" y="100" width="24" height="2" fill="rgba(255,255,255,0.08)"/></g>
  <g class="hw-rotor">
    <circle cx="100" cy="100" r="85" fill="none" stroke="url(#hw-rim)" stroke-width="16"/>
    <circle cx="100" cy="100" r="85" fill="none" stroke="#1c1c1a" stroke-width="16" opacity="0.55"/>
    <g stroke="rgba(255,255,255,0.07)" stroke-width="1.2">${grip}</g>
    <path d="M40 40 A85 85 0 0 1 100 15" fill="none" stroke="rgba(220,214,196,0.22)" stroke-width="3" stroke-linecap="round"/>
    ${spokes}
    <circle cx="100" cy="100" r="26" fill="url(#hw-hub)"/>
    <circle cx="100" cy="100" r="26" fill="none" stroke="rgba(0,0,0,0.5)"/>
    ${Array.from({ length: 24 }, (_, i) => `<path d="M100 70 l3 -5 h-6z" fill="#3c3b36" transform="rotate(${i * 15} 100 100)"/>`).join('')}
    <circle cx="100" cy="100" r="7" fill="#24231f"/>
    <rect x="98.5" y="77" width="3" height="10" fill="#d8cfb4" opacity="0.6"/>
  </g>
  <g class="hw-pawl"><path d="M148 46 L124 66 l-4 -3 l26 -21z" fill="#6b685e"/><circle cx="148" cy="46" r="4.5" fill="#2a2a27" stroke="#77736a"/></g>
  <circle class="hw-beckon" cx="100" cy="100" r="94" fill="none" stroke="rgba(236,230,218,0.5)" stroke-width="1.2" stroke-dasharray="4 10"/>
</svg>`;
}

// An engraved metal plate. Lines keep their full-width spacing.
export function plateHTML(text) {
  return `<div class="plate-face"><i class="screw s1"></i><i class="screw s2"></i><pre>${esc(text)}</pre></div>`;
}

// A clipboard with a ruled sign-in sheet. Each row is written by a different hand.
export function logHTML(title, head, rows) {
  const hands = ['h1', 'h2', 'h3', 'h4', 'h5'];
  const body = rows
    .map((r, i) => `<tr class="${r[1] ? hands[i % hands.length] : 'blank'}">${r.map((c, j) => `<td class="c${j}">${esc(c)}</td>`).join('')}</tr>`)
    .join('');
  return `<div class="clip"></div><div class="sheet"><div class="sheet-title">${esc(title)}</div><table><thead><tr>${head.map((c) => `<th>${esc(c)}</th>`).join('')}</tr></thead><tbody>${body}</tbody></table></div>`;
}
