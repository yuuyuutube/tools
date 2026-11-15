// 很輕的紙張音效，全部用 Web Audio 即時合成，不載入任何音檔。預設靜音，開關狀態存在瀏覽器裡
const KEY = 'tarot-sound';
let on = false, ctx = null, noiseBuf = null;
try { on = localStorage.getItem(KEY) === '1'; } catch { /* 私密模式 */ }

export const soundOn = () => on;
export function setSound(v) {
  on = !!v;
  try { localStorage.setItem(KEY, on ? '1' : '0'); } catch { /* 存不了就算了 */ }
  if (on) audio();
}

function audio() {
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
    noiseBuf = ctx.createBuffer(1, ctx.sampleRate * .5, ctx.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}

// 一小段濾過的雜訊：紙張摩擦
function swish(at, dur, freq, gain, q = .8) {
  const c = audio(); if (!c) return;
  const t = c.currentTime + at, src = c.createBufferSource(), bp = c.createBiquadFilter(), g = c.createGain();
  src.buffer = noiseBuf; src.loop = true;
  bp.type = 'bandpass'; bp.frequency.setValueAtTime(freq, t); bp.frequency.exponentialRampToValueAtTime(freq * 1.6, t + dur); bp.Q.value = q;
  g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(gain, t + dur * .25); g.gain.exponentialRampToValueAtTime(.0001, t + dur);
  src.connect(bp).connect(g).connect(c.destination);
  src.start(t, Math.random() * .3); src.stop(t + dur + .02);
}

// 很短的低頻一下：牌落到桌上、印章蓋下
function thud(at, freq, gain) {
  const c = audio(); if (!c) return;
  const t = c.currentTime + at, o = c.createOscillator(), g = c.createGain();
  o.type = 'sine'; o.frequency.setValueAtTime(freq, t); o.frequency.exponentialRampToValueAtTime(freq * .5, t + .09);
  g.gain.setValueAtTime(gain, t); g.gain.exponentialRampToValueAtTime(.0001, t + .11);
  o.connect(g).connect(c.destination); o.start(t); o.stop(t + .13);
}

const play = fn => (...a) => { if (on) { try { fn(...a); } catch { /* 音效失敗不影響抽牌 */ } } };

export const sfx = {
  shuffle: play((rounds = 2) => {
    for (let r = 0; r < rounds; r++) {
      const base = r * .46;
      swish(base, .16, 2600, .05);
      for (let i = 0; i < 9; i++) swish(base + .2 + i * .022, .05, 3400 + i * 120, .035, 1.4);
      thud(base + .42, 150, .05);
    }
  }),
  spread: play(() => swish(0, .5, 1900, .045)),
  slide: play(() => swish(0, .22, 2400, .05)),
  flip: play(() => { swish(0, .2, 1500, .05); thud(.34, 170, .06); }),
  stamp: play(() => { thud(0, 110, .12); swish(0, .06, 900, .04); }),
};
