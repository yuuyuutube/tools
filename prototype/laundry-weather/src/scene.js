import {composeScene} from './composition.js';
const clamp = (n, a, b) => Math.min(b, Math.max(a, n));
export class BalconyScene {
  async init(host) {
    const response = await fetch(new URL('../assets/balcony.svg', import.meta.url));
    if (!response.ok) throw new Error('插畫載入失敗');
    host.innerHTML = await response.text();
    this.svg = host.querySelector('svg'); this.host = host;
    this.clothes = [...host.querySelectorAll('[data-cloth]')];
    this.reduced = matchMedia('(prefers-reduced-motion: reduce)');
    this.mobile = matchMedia('(max-width: 760px), (max-width: 1000px) and (orientation: portrait)');
    this.wind = this.targetWind = 2.4; this.direction = this.targetDirection = .2;
    this.time = 0; this.last = 0;
    this.resize = () => composeScene(this.svg, host.clientWidth || 1440, host.clientHeight || 900, this.mobile.matches);
    this.observer = typeof ResizeObserver === 'function' ? new ResizeObserver(this.resize) : null;
    this.observer?.observe(host);
    this.visibility = () => { document.body.classList.toggle('paused', document.hidden); this.sync(); };
    this.motion = () => this.sync();
    this.mobile.addEventListener('change', this.resize);
    this.reduced.addEventListener('change', this.motion);
    document.addEventListener('visibilitychange', this.visibility);
    this.resize(); this.sync();
  }
  setWeather(weather, result) {
    document.body.dataset.scene = result.scene;
    document.body.dataset.night = String(weather.isNight === true);
    this.targetWind = clamp(weather.windSpeed ?? 1, 0, 15);
    this.targetDirection = weather.windDirection == null ? 0 : -Math.sin(weather.windDirection * Math.PI / 180);
    this.host.setAttribute('aria-label', `${result.sceneLabel}，陽台上的T-shirt、毛巾、長袖與襪子${this.reduced.matches ? '掛在晾衣繩上' : '隨風輕輕擺動'}，前景花貓正在休息。`);
  }
  sync() {
    cancelAnimationFrame(this.frame); this.last = 0;
    if (!document.hidden && !this.reduced.matches) this.frame = requestAnimationFrame(t => this.tick(t));
    else if (this.reduced.matches) this.clothes.forEach(g => { g.removeAttribute('transform'); g.querySelector('.fabric').removeAttribute('transform'); });
  }
  tick(now) {
    const delta = this.last ? Math.min((now - this.last) / 1000, .05) : 0;
    this.last = now; this.time += delta;
    const ease = 1 - Math.exp(-delta / 4);
    this.wind += (this.targetWind - this.wind) * ease;
    this.direction += (this.targetDirection - this.direction) * ease;
    // Limited to 30 updates/second; no UI re-renders. Frequencies stay gentle in strong wind.
    if (!this.drawn || now - this.drawn >= 32) {
      this.drawn = now;
      const amplitude = .12 + 5.5 * (1 - Math.exp(-this.wind / 4));
      this.clothes.forEach((g, i) => {
        const phase = i * 1.73, rate = [.81, .64, .72, 1.02, .96][i];
        const wave = Math.sin(this.time * rate + phase) * .76 + Math.sin(this.time * rate * .43 + phase * 2) * .24;
        const angle = amplitude * ([1, .65, .82, 1.15, 1.03][i] * wave + this.direction * .22);
        g.setAttribute('transform', `rotate(${angle.toFixed(3)} 0 0)`);
        const skew = Math.sin(this.time * rate - .45 + phase) * amplitude * .22;
        g.querySelector('.fabric').setAttribute('transform', `skewX(${skew.toFixed(3)}) scale(1 ${(1 - Math.abs(skew) * .002).toFixed(4)})`);
      });
    }
    this.frame = requestAnimationFrame(t => this.tick(t));
  }
  destroy() {
    cancelAnimationFrame(this.frame);
    this.observer?.disconnect();
    this.mobile.removeEventListener('change', this.resize); this.reduced.removeEventListener('change', this.motion);
    document.removeEventListener('visibilitychange', this.visibility);
  }
}
