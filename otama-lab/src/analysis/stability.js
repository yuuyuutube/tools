// Describe recent pitch movement separately from the detector's periodicity.
export class PitchStability {
  constructor() { this.reset(); }
  reset() { this.points = []; }
  update({ frequencyHz, timestampMs }) {
    if (!frequencyHz) { this.reset(); return { stable: false, spreadCents: null, label: '—' }; }
    this.points.push({ time: timestampMs, cents: 1200 * Math.log2(frequencyHz / 440) });
    this.points = this.points.filter(point => timestampMs - point.time <= 600);
    const cents = this.points.map(point => point.cents);
    const spreadCents = Math.max(...cents) - Math.min(...cents);
    const ready = this.points.length >= 5 && timestampMs - this.points[0].time >= 250;
    return { stable: ready && spreadCents <= 25, spreadCents, label: !ready ? '偵測中' : spreadCents <= 25 ? '穩定' : '變動中' };
  }
}
