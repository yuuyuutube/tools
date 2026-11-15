/* 少量原創合成音效；預設靜音，使用者自己打開才會有聲音 */
let ctx = null, on = false;
try { on = localStorage.getItem('enc.sound') === '1'; } catch { /* ignore */ }
export const soundOn = () => on;
export function setSound(v) {
  on = !!v;
  try { localStorage.setItem('enc.sound', on ? '1' : '0'); } catch { /* ignore */ }
  if (on) { ctx ||= new (window.AudioContext || window.webkitAudioContext)(); ctx.resume?.(); }
}
function tone(f0, f1, dur, { type = 'sine', vol = 0.12, at = 0 } = {}) {
  const t = ctx.currentTime + at, o = ctx.createOscillator(), g = ctx.createGain();
  o.type = type; o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
  g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.008); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(ctx.destination); o.start(t); o.stop(t + dur + 0.02);
}
function noise(dur, { vol = 0.08, at = 0, hp = 800 } = {}) {
  const t = ctx.currentTime + at, n = Math.floor(ctx.sampleRate * dur), buf = ctx.createBuffer(1, n, ctx.sampleRate), d = buf.getChannelData(0);
  for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n);
  const s = ctx.createBufferSource(), g = ctx.createGain(), f = ctx.createBiquadFilter();
  f.type = 'highpass'; f.frequency.value = hp; g.gain.value = vol; s.buffer = buf;
  s.connect(f).connect(g).connect(ctx.destination); s.start(t);
}
const FX = {
  blip: () => tone(660, 880, 0.07, { type: 'triangle', vol: 0.06 }),
  knob: () => { for (let i = 0; i < 5; i++) { tone(210, 150, 0.04, { type: 'square', vol: 0.05, at: i * 0.15 }); noise(0.03, { vol: 0.04, at: i * 0.15, hp: 2000 }); } },
  drop: () => tone(300, 90, 0.16, { vol: 0.16 }),
  hop: () => tone(240, 520, 0.22, { type: 'triangle', vol: 0.07 }),
  land: () => { tone(160, 70, 0.14, { vol: 0.18 }); noise(0.05, { vol: 0.05, hp: 400 }); },
  rattle: () => { for (let i = 0; i < 4; i++) noise(0.04, { vol: 0.05, at: i * 0.12, hp: 3000 }); },
  pop: () => { noise(0.08, { vol: 0.12, hp: 1200 }); tone(520, 1040, 0.12, { type: 'triangle', vol: 0.1, at: 0.02 }); tone(780, 1560, 0.16, { type: 'triangle', vol: 0.07, at: 0.1 }); },
  stamp: () => { tone(120, 50, 0.16, { vol: 0.22 }); noise(0.06, { vol: 0.07, hp: 300 }); },
  page: () => noise(0.16, { vol: 0.05, hp: 1800 }),
};
export function sfx(name) { if (on && ctx && FX[name]) { try { FX[name](); } catch { /* ignore */ } } }
