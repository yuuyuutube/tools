// 翻牌：緩起的風聲，正面露出時接上柔和泛音。沒有低頻撞擊或尖銳敲擊。
// 同時供正式抽牌與試聽頁使用；不改變音效開關。
export function revealSound(c, noiseBuffer) {
  const t = c.currentTime;
  const air = c.createBufferSource(), high = c.createBiquadFilter();
  const low = c.createBiquadFilter(), band = c.createBiquadFilter(), breath = c.createGain();
  air.buffer = noiseBuffer; air.loop = true;
  high.type = 'highpass'; high.frequency.value = 420; high.Q.value = .5;
  low.type = 'lowpass'; low.frequency.value = 2400; low.Q.value = .5;
  band.type = 'bandpass'; band.Q.value = .55;
  band.frequency.setValueAtTime(750, t);
  band.frequency.exponentialRampToValueAtTime(1350, t + .48);
  band.frequency.exponentialRampToValueAtTime(950, t + .95);
  breath.gain.setValueAtTime(0, t);
  breath.gain.linearRampToValueAtTime(.038, t + .2);
  breath.gain.exponentialRampToValueAtTime(.012, t + .58);
  breath.gain.exponentialRampToValueAtTime(.0001, t + 1.05);
  breath.gain.linearRampToValueAtTime(0, t + 1.12);
  air.connect(high).connect(low).connect(band).connect(breath).connect(c.destination);
  air.onended = () => { air.disconnect(); high.disconnect(); low.disconnect(); band.disconnect(); breath.disconnect(); };
  air.start(t); air.stop(t + 1.14);

  // 低音量的八度與五度，慢慢亮起而非像鈴鐺被敲響。
  for (const [frequency, at, peak, duration] of [
    [783.99, .34, .013, 1.12],
    [1174.66, .42, .006, 1.04],
    [1567.98, .5, .003, .92],
  ]) {
    const o = c.createOscillator(), g = c.createGain(), start = t + at;
    o.type = 'sine'; o.frequency.value = frequency;
    g.gain.setValueAtTime(0, start);
    g.gain.linearRampToValueAtTime(peak, start + .2);
    g.gain.exponentialRampToValueAtTime(.0001, start + duration - .08);
    g.gain.linearRampToValueAtTime(0, start + duration);
    o.connect(g).connect(c.destination);
    o.onended = () => { o.disconnect(); g.disconnect(); };
    o.start(start); o.stop(start + duration + .02);
  }
}
