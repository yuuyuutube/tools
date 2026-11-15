/* 聲音引擎：只負責發聲，不碰畫面。
   同一時間只會有一個聲音；任何新聲音都會先把舊的淡出。
   增益固定為 CONFIG.GAIN，任何情況都不會自動加大。 */
import { CONFIG } from './config.js';

let ctx = null;
let voice = null;      // { osc, g, timer }
let sweep = null;      // { t0, f0, f1, dur }
let pulseTimer = 0;

export async function unlock() {
  try {
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return false;
      try { if (navigator.audioSession) navigator.audioSession.type = 'playback'; } catch (_) {}
      ctx = new AC();
    }
    if (ctx.state !== 'running') await Promise.race([ctx.resume(), new Promise(r => setTimeout(r, 800))]);
    return ctx.state === 'running';
  } catch (_) { return false; }
}

export const ready = () => !!ctx && ctx.state === 'running';
export const nyquist = () => (ctx ? ctx.sampleRate / 2 : 22050);
export const playing = () => !!voice;

function hush(v, now = ctx.currentTime) {
  if (!v) return;
  clearTimeout(v.timer);
  const g = v.g.gain;
  if (g.cancelAndHoldAtTime) g.cancelAndHoldAtTime(now);
  else { const cur = g.value; g.cancelScheduledValues(now); g.setValueAtTime(cur, now); }
  g.linearRampToValueAtTime(0, now + CONFIG.FADE_OUT);
  try { v.osc.stop(now + CONFIG.FADE_OUT + 0.03); } catch (_) {}
  v.osc.onended = () => { try { v.osc.disconnect(); v.g.disconnect(); } catch (_) {} };
}

function open(f) {
  const now = ctx.currentTime;
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(f, now);
  g.gain.setValueAtTime(0, now);
  g.gain.linearRampToValueAtTime(CONFIG.GAIN, now + CONFIG.FADE_IN);
  osc.connect(g).connect(ctx.destination);
  osc.start(now);
  return { osc, g, timer: 0 };
}

/** 停止一切聲音（淡出） */
export function stop() {
  clearTimeout(pulseTimer); pulseTimer = 0;
  if (!ctx) return;
  hush(voice); voice = null;
  if (sweep) sweep.stopped = ctx.currentTime;
}

/** 從 f0 掃到 f1（對數式），時間依比例：dur 秒。onEnd 在到達終點並淡出後呼叫 */
export function startSweep(f0, f1, dur, onEnd) {
  stop();
  const v = open(f0), now = ctx.currentTime;
  v.osc.frequency.exponentialRampToValueAtTime(f1, now + dur);
  v.g.gain.setValueAtTime(CONFIG.GAIN, now + dur - CONFIG.FADE_OUT);
  v.g.gain.linearRampToValueAtTime(0, now + dur);
  v.osc.stop(now + dur + 0.03);
  v.osc.onended = () => { try { v.osc.disconnect(); v.g.disconnect(); } catch (_) {} };
  voice = v;
  sweep = { t0: now, f0, f1, dur, stopped: 0 };
  v.timer = setTimeout(() => { if (voice === v) { voice = null; onEnd && onEnd(); } }, dur * 1000 + 40);
}

/** 掃頻目前（或停止當下）的頻率 */
export function sweepHz() {
  if (!sweep || !ctx) return CONFIG.F_MIN;
  const t = Math.min(sweep.dur, (sweep.stopped || ctx.currentTime) - sweep.t0);
  return sweep.f0 * Math.pow(sweep.f1 / sweep.f0, Math.max(0, t) / sweep.dur);
}

/** 固定長度的單一測試音 */
export function tone(f, sec, onEnd) {
  stop();
  const v = open(f), now = ctx.currentTime;
  v.g.gain.setValueAtTime(CONFIG.GAIN, now + sec - CONFIG.FADE_OUT);
  v.g.gain.linearRampToValueAtTime(0, now + sec);
  v.osc.stop(now + sec + 0.03);
  v.osc.onended = () => { try { v.osc.disconnect(); v.g.disconnect(); } catch (_) {} };
  voice = v;
  v.timer = setTimeout(() => { if (voice === v) { voice = null; onEnd && onEnd(); } }, sec * 1000 + 40);
}

/** 音量確認：一聲一聲重複，直到 stop() */
export function pulse(f) {
  stop();
  const beat = () => {
    tone(f, CONFIG.REF_ON);
    pulseTimer = setTimeout(beat, (CONFIG.REF_ON + CONFIG.REF_GAP) * 1000);
  };
  beat();
}
