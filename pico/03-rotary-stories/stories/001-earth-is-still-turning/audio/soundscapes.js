// 第三章的「地球環境錄音」— all SYNTHESISED, no field recordings are used (see production-notes).
//
// Each recording is a deterministic function of absolute time: renderChunk(rec, t0, dur) returns
// the same samples for the same span every time, so a 12-minute recording can be played, paused
// and scrubbed anywhere while only a few seconds exist in memory. Every recording has an event
// timeline (waves, bells, drops, birds) computed once from its seed; layers read it by time.
import { mulberry32, Biquad, OnePole, PinkNoise, BrownNoise, valueNoise, modal, reverb } from '../../../src/audio/dsp.js';

export const SR = 32000;
const PREROLL = 0.35; // seconds of warm-up so filters settle before the chunk starts

// ---- event timelines --------------------------------------------------------------------------

function poisson(rand, rate, t0, t1, make) {
  const out = [];
  let t = t0;
  for (;;) {
    t += -Math.log(1 - rand()) / rate;
    if (t >= t1) break;
    out.push(make(t, rand));
  }
  return out;
}

// Westminster chime as Taiwanese school bells play it: mi-do-re-sol, sol-re-mi-do, twice through.
const CHIME = [
  [64, 60, 62, 55],
  [55, 62, 64, 60],
  [64, 62, 60, 55],
  [55, 62, 64, 60],
];

function chimeBuffer(seed) {
  const r = mulberry32(seed);
  const note = 0.62;
  const len = CHIME.length * 4 * note + 3.2;
  const out = new Float32Array(Math.round(len * SR));
  let t = 0;
  CHIME.forEach((phrase, pi) => {
    phrase.forEach((m, i) => {
      const f = 440 * Math.pow(2, (m - 69) / 12) * 2;
      const start = Math.round(t * SR);
      modal(out, start, SR, [
        { f, a: 0.32, d: 1.1 },
        { f: f * 2.0, a: 0.1, d: 0.6 },
        { f: f * 2.76, a: 0.06, d: 0.35 },
        { f: f * 5.4, a: 0.03, d: 0.15 },
        { f: f * 0.5, a: 0.05, d: 1.4 },
      ], 1, r);
      t += note * (i === 3 ? 1.6 : 1);
    });
    if (pi === 1) t += 0.3;
  });
  // Through a corridor loudspeaker into an open, tiled hall.
  const bp = new Biquad('bandpass', 1100, 0.45, SR);
  const sat = (x) => Math.tanh(x * 1.6) / 1.2;
  for (let i = 0; i < out.length; i++) out[i] = sat(bp.p(out[i]) * 1.4);
  const [L, R] = reverb(out, SR, { size: 1.6, decay: 0.84, damp: 0.3, wet: 0.55, dry: 0.6, predelay: 0.03 });
  return [L, R];
}

// ---- the recordings ---------------------------------------------------------------------------

export const RECORDINGS = [
  {
    id: 'A-1', site: 'E-017', place: '北堤', what: '東北季風', date: '2073-12-20', dur: 12 * 60, seed: 101,
    card: `A-1　E-017　頭汕漁港北堤
錄音　2073-12-20　15:40–15:52
錄音者　蔡沛涵
天氣　陰，東北季風，陣風 9 級
內容　浪打堤腳、風聲、港內舢筏繫繩摩擦。

附註　開頭口述標記已剪除，轉寫如下：
「十二月二十號，北堤，三點四十。今天風有夠大，防風罩加兩層。」`,
    layers: { wind: { strength: 1.15, low: 300, gust: 0.16 }, waves: { kind: 'rubble', every: 7.5, amp: 1 }, creak: { rate: 0.12 } },
  },
  {
    id: 'A-2', site: 'E-017', place: '頭汕國小', what: '午後', date: '2073-06-23', dur: 12 * 60, seed: 202,
    card: `A-2　E-017　頭汕國小　川堂
錄音　2073-06-23　14:06–14:18
錄音者　蔡沛涵
天氣　晴，32°C
內容　台灣熊蟬。14:10 下課鐘聲。
　　　下課人聲依錄音規範降低處理。

附註　口述標記轉寫：
「六月二十三號，頭汕國小，兩點零六分，在川堂。鐘響前先錄四分鐘。蟬很大聲。」`,
    layers: { cicadas: { n: 7, level: 1 }, chime: { at: 240 }, murmur: { from: 246, to: 600 }, air: 0.2 },
  },
  {
    id: 'A-3', site: 'E-017', place: '蚵寮', what: '梅雨', date: '2073-06-09', dur: 15 * 60, seed: 303,
    card: `A-3　E-017　頭汕　蚵寮
錄音　2073-06-09　06:20–06:35
錄音者　蔡沛涵
天氣　雨，梅雨鋒面
內容　雨打鐵皮屋頂、簷溝滴水、遠處舢筏發動。

附註　口述標記轉寫：
「六月九號，蚵寮，早上六點二十。我爸的寮。雨應該會下到中午。」`,
    layers: { rain: { density: 260, level: 1 }, drip: { rate: 1.1 }, engine: { at: 360 } },
  },
  {
    id: 'A-4', site: 'E-031', place: '汕尾溪口', what: '退潮', date: '2073-10-28', dur: 15 * 60, seed: 404, gain: 1.5,
    card: `A-4　E-031　汕尾溪口
錄音　2073-10-28　16:30–16:45
錄音者　蔡沛涵
天氣　晴，北風，退潮
內容　泥灘退水的細碎聲、溪水流過沙洲、遠處水鳥。

附註　口述標記轉寫：
「十月二十八，汕尾溪口，四點半，退潮。」`,
    layers: { wind: { strength: 0.35, low: 420, gust: 0.1 }, mud: { rate: 28 }, trickle: 0.5, birds: { rate: 0.05, kinds: ['whistle'] } },
  },
  {
    id: 'B-1', site: 'E-017', place: '北堤', what: '東北季風', date: '2104-01-11', dur: 10 * 60, seed: 505, gain: 0.55,
    card: `B-1　E-017　頭汕漁港北堤
錄音　2104-01-11　15:00–15:10
錄音者　林子豪（觀測網）
天氣　陰，東北季風
內容　浪打海堤、風聲。
錄音條件比照 A-1（船上請求）。

目錄　蔡沛涵　第 31 年
附註　與 A-1 同季。錄音位置在北堤堤根，緊鄰 2094 年海堤加高段。
　　　浪聲較低、較短。港內舢筏聲少了。`,
    layers: { wind: { strength: 1.1, low: 300, gust: 0.16 }, waves: { kind: 'wall', every: 7.5, amp: 1 }, creak: { rate: 0.02 } },
  },
  {
    id: 'B-2', site: 'E-031', place: '汕尾溪口', what: '冬日清晨', date: '2118-12-14', dur: 15 * 60, seed: 606,
    card: `B-2　E-031　汕尾溪口
錄音　2118-12-14　07:10–07:25
錄音者　陳映彤（觀測網）
天氣　晴，微風，漲潮
內容　高蹺鴴、東方環頸鴴、小白鷺、海茄苳林間的風。

目錄　方雅文　第 48 年
附註　錄音者記：黑面琵鷺在錄音位置西南方約兩百公尺，錄音中未錄到。`,
    layers: { wind: { strength: 0.3, low: 500, gust: 0.12 }, leaves: 0.5, lap: 0.6, birds: { rate: 1.6, kinds: ['stilt', 'stilt', 'plover', 'plover', 'egret', 'whistle'] }, wings: 0.04 },
  },
  {
    id: 'B-3', site: 'E-017', place: '社區活動中心前庭', what: '午後', date: '2126-08-03', dur: 12 * 60, seed: 707,
    card: `B-3　E-017　頭汕社區活動中心　前庭
錄音　2126-08-03　14:00–14:12
錄音者　陳映彤（觀測網）
天氣　晴，午後雷陣雨
內容　台灣熊蟬、遠處雷聲、驟雨打在前庭鐵皮棚。

目錄　方雅文　第 56 年
附註　錄音位置與 A-2 相距約 15 公尺。`,
    layers: { cicadas: { n: 7, level: 1, duck: [380, 610] }, thunder: { at: [150, 300, 362] }, rain: { density: 340, level: 1.1, from: 375, to: 610, burst: true }, air: 0.15 },
  },
];

// Build (once) the event timelines for a recording.
export function prepare(rec) {
  if (rec.events) return rec;
  const r = mulberry32(rec.seed);
  const L = rec.layers;
  const ev = {};
  if (L.waves) {
    ev.waves = [];
    let t = 1;
    while (t < rec.dur + 10) {
      ev.waves.push({ t, amp: L.waves.amp * (0.55 + r() * 0.6), pan: (r() - 0.5) * 0.6 });
      t += L.waves.every * (0.6 + r() * 0.8);
    }
  }
  if (L.creak) ev.creak = poisson(r, L.creak.rate, 0, rec.dur, (t, rr) => ({ t, len: 0.5 + rr() * 1.4, f: 22 + rr() * 30, amp: 0.4 + rr() * 0.6 }));
  if (L.cicadas) {
    ev.cicadas = [];
    for (let k = 0; k < L.cicadas.n; k++) {
      const fc = 4200 + r() * 1800;
      const pulse = 38 + r() * 22;
      const pan = (r() - 0.5) * 1.4;
      const dist = 0.35 + r() * 0.65;
      let t = r() * 8;
      while (t < rec.dur) {
        const len = 8 + r() * 22;
        ev.cicadas.push({ k, t, len, fc, pulse, pan, dist });
        t += len + 1 + r() * 9;
      }
    }
  }
  if (L.rain) ev.drops = null; // drops are dense: generated per chunk from a chunk seed
  if (L.drip) ev.drips = poisson(r, L.drip.rate, 0, rec.dur, (t, rr) => ({ t, f: 700 + rr() * 700, amp: 0.3 + rr() * 0.7 }));
  if (L.birds) {
    ev.birds = [];
    poisson(r, L.birds.rate, 0, rec.dur, (t, rr) => {
      const kind = L.birds.kinds[Math.floor(rr() * L.birds.kinds.length)];
      const n = kind === 'stilt' ? 3 + Math.floor(rr() * 6) : kind === 'plover' ? 1 + Math.floor(rr() * 3) : 1;
      const gap = kind === 'stilt' ? 0.16 + rr() * 0.06 : 0.3 + rr() * 0.3;
      const pan = (rr() - 0.5) * 1.6;
      const dist = kind === 'whistle' && rec.id === 'A-4' ? 0.15 + rr() * 0.2 : 0.3 + rr() * 0.7;
      const f = kind === 'stilt' ? 1900 + rr() * 500 : kind === 'plover' ? 3300 + rr() * 600 : kind === 'egret' ? 280 + rr() * 60 : 2400 + rr() * 900;
      for (let i = 0; i < n; i++) ev.birds.push({ t: t + i * gap, kind, pan, dist, f: f * (1 + (rr() - 0.5) * 0.03) });
      return null;
    });
    ev.birds.sort((a, b) => a.t - b.t);
  }
  if (L.wings) ev.wings = poisson(r, L.wings, 0, rec.dur, (t, rr) => ({ t, n: 4 + Math.floor(rr() * 8), rate: 6 + rr() * 3, pan: (rr() - 0.5) * 1.4 }));
  if (L.chime) ev.chime = { t: L.chime.at };
  if (L.engine) ev.engine = { t: L.engine.at };
  if (L.thunder) ev.thunder = L.thunder.at.map((t, i) => ({ t, amp: [0.5, 0.8, 1][i] || 0.8 }));
  rec.events = ev;
  return rec;
}

// ---- the renderer -----------------------------------------------------------------------------

const cache = new Map();
function chime(seed) {
  if (!cache.has(seed)) cache.set(seed, chimeBuffer(seed));
  return cache.get(seed);
}

function within(list, t0, t1, tail) {
  // Events whose influence overlaps [t0, t1].
  if (!list) return [];
  return list.filter((e) => e.t + (e.len || tail) >= t0 && e.t <= t1);
}

export function renderChunk(recIn, t0, dur) {
  const rec = prepare(recIn);
  const L = rec.layers;
  const ev = rec.events;
  const pre = Math.min(PREROLL, t0);
  const start = t0 - pre;
  const n = Math.round((dur + pre) * SR);
  const outL = new Float32Array(n);
  const outR = new Float32Array(n);
  const chunkSeed = (rec.seed * 7919 + Math.floor(t0 * 10)) >>> 0;
  const r = mulberry32(chunkSeed);
  const add = (i, v, pan = 0) => {
    outL[i] += v * (1 - Math.max(0, pan)) * 0.9;
    outR[i] += v * (1 + Math.min(0, pan)) * 0.9;
  };

  // Wind: pink noise, low-passed, opening and closing with gusts. Stereo decorrelated.
  if (L.wind) {
    const { strength, low, gust } = L.wind;
    const pL = new PinkNoise(r);
    const pR = new PinkNoise(r);
    const fL = new Biquad('lowpass', low, 0.7, SR);
    const fR = new Biquad('lowpass', low, 0.7, SR);
    const whine = new Biquad('bandpass', 700, 4, SR);
    const g1 = valueNoise(rec.seed + 1, gust);
    const g2 = valueNoise(rec.seed + 2, gust * 3.3);
    for (let i = 0; i < n; i++) {
      const t = start + i / SR;
      const a = (0.3 + g1(t) * 0.7) * (0.75 + g2(t) * 0.25) * strength;
      if ((i & 63) === 0) {
        fL.set(low * (0.6 + a * 1.4));
        fR.set(low * (0.62 + a * 1.4));
        whine.set(420 + a * 520);
      }
      const x = pL.next();
      const y = pR.next();
      const w = whine.p(x) * a * a * 0.15;
      outL[i] += fL.p(x) * a * 0.9 + w;
      outR[i] += fR.p(y) * a * 0.9 + w * 0.8;
    }
  }

  // Waves on the breakwater. 'rubble': thump, a long wash, gravel dragged back.
  // 'wall' (the raised seawall): a slap and a boom, a short wash, no gravel.
  if (L.waves) {
    const kind = L.waves.kind;
    const active = within(ev.waves, start, start + n / SR, 8);
    const b = new BrownNoise(r);
    const lp = new Biquad('lowpass', kind === 'wall' ? 140 : 220, 0.8, SR);
    const wash = new Biquad('bandpass', kind === 'wall' ? 1400 : 1900, 0.5, SR);
    const grit = new Biquad('bandpass', 4200, 2, SR);
    const slap = new Biquad('bandpass', 1100, 1.2, SR);
    for (let i = 0; i < n; i++) {
      const t = start + i / SR;
      let eT = 0;
      let eW = 0;
      let eG = 0;
      let eS = 0;
      let pan = 0;
      for (const w of active) {
        const d = t - w.t;
        if (d < -0.3 || d > 8) continue;
        if (kind === 'rubble') {
          eT += d > 0 ? w.amp * Math.exp(-d * 3.5) * Math.min(1, d * 12) : 0;
          eW += w.amp * (d < 0 ? Math.max(0, 1 + d / 0.3) * 0.2 : Math.exp(-d * 0.6) * Math.min(1, d * 3 + 0.2));
          eG += d > 1.2 && d < 5.5 ? w.amp * Math.sin(((d - 1.2) / 4.3) * Math.PI) * 0.8 : 0;
        } else {
          eT += d > 0 ? w.amp * Math.exp(-d * 6) * Math.min(1, d * 30) * 1.3 : 0;
          eS += d > 0 && d < 0.4 ? w.amp * Math.exp(-d * 14) : 0;
          eW += d > 0 ? w.amp * Math.exp(-d * 1.4) * Math.min(1, d * 6) * 0.7 : 0;
        }
        pan = w.pan;
      }
      const x = b.next();
      const y = r() * 2 - 1;
      let v = lp.p(x) * eT * 1.6 + wash.p(y) * eW * 0.5;
      if (kind === 'rubble' && eG > 0) v += grit.p(r() < 0.06 ? (r() * 2 - 1) * 3 : 0) * eG * 0.6;
      if (eS > 0) v += slap.p(y) * eS * 1.2;
      add(i, v, pan);
    }
  }

  // Mooring lines rubbing on plastic pipe rafts: stick-slip pulse trains.
  if (L.creak) {
    const active = within(ev.creak, start, start + n / SR, 2);
    const bp = new Biquad('bandpass', 760, 6, SR);
    const bp2 = new Biquad('bandpass', 1310, 8, SR);
    for (const c of active) {
      let phase = 0;
      const s0 = Math.max(0, Math.round((c.t - start) * SR));
      const s1 = Math.min(n, Math.round((c.t + c.len - start) * SR));
      for (let i = s0; i < s1; i++) {
        const u = (i / SR + start - c.t) / c.len;
        const f = c.f * (0.7 + Math.sin(u * Math.PI) * 0.6);
        phase += f / SR;
        let imp = 0;
        if (phase >= 1) {
          phase -= 1;
          imp = (0.6 + r() * 0.4) * Math.sin(u * Math.PI) * c.amp;
        }
        add(i, bp.p(imp) * 1.6 + bp2.p(imp) * 0.9, 0.5);
      }
    }
  }

  // Cicadas (台灣熊蟬): band-limited noise chopped by a fast pulse, each singer swelling in and out.
  if (L.cicadas) {
    const singers = new Map();
    const active = within(ev.cicadas, start, start + n / SR, 0);
    for (const c of active) if (!singers.has(c.k)) singers.set(c.k, { bp: new Biquad('bandpass', c.fc, 5, SR), bp2: new Biquad('bandpass', c.fc * 1.5, 7, SR), ph: r() });
    const duck = L.cicadas.duck;
    for (const c of active) {
      const s = singers.get(c.k);
      const s0 = Math.max(0, Math.round((c.t - start) * SR));
      const s1 = Math.min(n, Math.round((c.t + c.len - start) * SR));
      for (let i = s0; i < s1; i++) {
        const t = start + i / SR;
        const u = (t - c.t) / c.len;
        let env = Math.min(1, u * 5) * Math.min(1, (1 - u) * 3);
        env *= 0.75 + 0.25 * Math.sin(t * 2.1 + c.k);
        if (duck) env *= t > duck[0] && t < duck[1] ? Math.max(0.12, 1 - Math.min(1, (t - duck[0]) / 6) * 0.88) * Math.max(0.12, Math.min(1, (duck[1] - t) / 20)) : 1;
        s.ph += c.pulse / SR;
        if (s.ph >= 1) s.ph -= 1;
        const gate = s.ph < 0.55 ? Math.sin((s.ph / 0.55) * Math.PI) : 0;
        const x = r() * 2 - 1;
        add(i, (s.bp.p(x) * 0.9 + s.bp2.p(x) * 0.35) * gate * env * c.dist * 1.9 * L.cicadas.level, c.pan);
      }
    }
  }

  // Open-air hiss (a hot afternoon has a sound too).
  if (L.air) {
    const p = new PinkNoise(r);
    const hp = new Biquad('highpass', 2500, 0.7, SR);
    for (let i = 0; i < n; i++) {
      const v = hp.p(p.next()) * L.air * 0.2;
      outL[i] += v;
      outR[i] += v * 0.95;
    }
  }

  // The school chime through the corridor speakers.
  if (ev.chime) {
    const [cL, cR] = chime(rec.seed);
    const off = Math.round((start - ev.chime.t) * SR);
    for (let i = 0; i < n; i++) {
      const j = off + i;
      if (j < 0 || j >= cL.length) continue;
      outL[i] += cL[j] * 0.55;
      outR[i] += cR[j] * 0.55;
    }
  }

  // Break-time voices, lowered and blurred on purpose (the catalogue says so).
  if (L.murmur) {
    const { from, to } = L.murmur;
    if (start + n / SR > from && start < to) {
      const voices = Array.from({ length: 6 }, (_, k) => ({ bp: new Biquad('bandpass', 380 + k * 160, 1.2, SR), am: valueNoise(rec.seed * 3 + k, 5 + k), pan: (k / 5 - 0.5) * 1.2 }));
      const lp = new OnePole(1600, SR);
      for (let i = 0; i < n; i++) {
        const t = start + i / SR;
        const fade = Math.min(1, (t - from) / 4) * Math.min(1, (to - t) / 20);
        if (fade <= 0) continue;
        const x = r() * 2 - 1;
        let v = 0;
        for (const vc of voices) v += vc.bp.p(x) * Math.pow(vc.am(t), 3);
        add(i, lp.lp(v) * fade * 0.22, 0);
      }
    }
  }

  // Rain on a tin roof: thousands of tiny pings over a broad hiss.
  if (L.rain) {
    const { density, level, from = -1, to = 1e9, burst } = L.rain;
    const t1 = start + n / SR;
    if (t1 > from && start < to) {
      const intensity = (t) => {
        if (!burst) return 1;
        const a = Math.min(1, Math.max(0, (t - from) / 3));
        const b = Math.min(1, Math.max(0, (to - t) / 90));
        return a * b * (0.85 + 0.15 * Math.sin(t * 0.3));
      };
      const hiss = new Biquad('bandpass', 3000, 0.4, SR);
      const low = new Biquad('lowpass', 500, 0.6, SR);
      const p = new PinkNoise(r);
      for (let i = 0; i < n; i++) {
        const t = start + i / SR;
        if (t < from || t > to) continue;
        const k = intensity(t);
        const x = p.next();
        add(i, (hiss.p(x) * 0.35 + low.p(x) * 0.25) * k * level, 0);
      }
      const drops = poisson(r, density, Math.max(start, from), Math.min(t1, to), (t, rr) => ({ t, f: 1800 + rr() * 4200, f2: 2600 + rr() * 3000, a: Math.pow(rr(), 2), pan: (rr() - 0.5) * 1.6 }));
      for (const d of drops) {
        const s = Math.round((d.t - start) * SR);
        const len = Math.min(n - s, Math.round(0.03 * SR));
        const k = intensity(d.t) * level;
        const w1 = (2 * Math.PI * d.f) / SR;
        const w2 = (2 * Math.PI * d.f2) / SR;
        for (let i = 0; i < len; i++) {
          const env = Math.exp(-i / (0.004 * SR));
          add(s + i, (Math.sin(w1 * i) + Math.sin(w2 * i) * 0.5) * env * d.a * 0.22 * k, d.pan);
        }
      }
    }
  }

  // Gutter drips into a bucket.
  if (ev.drips) {
    for (const d of within(ev.drips, start, start + n / SR, 0.3)) {
      const s = Math.round((d.t - start) * SR);
      for (let i = Math.max(0, -s); i < Math.round(0.25 * SR) && s + i < n; i++) {
        const tt = i / SR;
        const f = d.f * (1 + Math.min(1, tt / 0.02) * 0.9);
        add(s + i, Math.sin(2 * Math.PI * f * tt) * Math.exp(-tt * 28) * d.amp * 0.18, -0.5);
      }
    }
  }

  // An outboard motor across the harbour: two pulls, then it puts away into the distance.
  if (ev.engine) {
    const e0 = ev.engine.t;
    const t1 = start + n / SR;
    if (t1 > e0 && start < e0 + 120) {
      const lp = new Biquad('lowpass', 900, 0.8, SR);
      const body = new Biquad('bandpass', 95, 2, SR);
      let ph = 0;
      for (let i = 0; i < n; i++) {
        const t = start + i / SR;
        const u = t - e0;
        if (u < 0 || u > 120) continue;
        let rate = 0;
        let amp = 0;
        if (u < 0.8) [rate, amp] = [6, 0.5];
        else if (u < 2.4) [rate, amp] = [0, 0];
        else if (u < 3.3) [rate, amp] = [7, 0.6];
        else if (u < 5) [rate, amp] = [0, 0];
        else {
          rate = 9.5 + Math.min(2, (u - 5) * 0.2);
          amp = Math.exp(-(u - 8) / 30) * Math.min(1, (u - 5) * 2);
        }
        if (rate) {
          lp.set(Math.max(250, 900 - u * 5));
          ph += rate / SR;
          let v = 0;
          if (ph >= 1) {
            ph -= 1;
            v = 1;
          }
          const x = v * (0.8 + r() * 0.4) + (r() * 2 - 1) * 0.04;
          add(i, (lp.p(x) * 2 + body.p(x) * 3) * amp * 0.5, 0.6 - Math.min(1.2, u / 60));
        }
      }
    }
  }

  // Mudflat at low tide: tiny pops and crackles from burrows and draining water.
  if (L.mud) {
    const bp = new Biquad('bandpass', 3600, 1.5, SR);
    const clicks = poisson(r, L.mud.rate, start, start + n / SR, (t, rr) => ({ t, a: Math.pow(rr(), 2), pan: (rr() - 0.5) * 1.8, pop: rr() < 0.08, f: 300 + rr() * 500 }));
    const buf = new Float32Array(n);
    for (const c of clicks) {
      const s = Math.round((c.t - start) * SR);
      if (c.pop) {
        for (let i = 0; i < 0.04 * SR && s + i < n; i++) add(s + i, Math.sin((2 * Math.PI * c.f * (1 + i / SR * 20) * i) / SR) * Math.exp(-i / (0.008 * SR)) * c.a * 0.25, c.pan);
      } else buf[s] += (r() < 0.5 ? -1 : 1) * c.a;
    }
    for (let i = 0; i < n; i++) add(i, bp.p(buf[i]) * 0.9, 0);
  }
  if (L.trickle) {
    const bp = new Biquad('bandpass', 1500, 1.2, SR);
    const am = valueNoise(rec.seed + 9, 14);
    for (let i = 0; i < n; i++) {
      const t = start + i / SR;
      add(i, bp.p(r() * 2 - 1) * (0.3 + am(t) * 0.7) * L.trickle * 0.12, -0.6);
    }
  }
  if (L.leaves) {
    const hp = new Biquad('highpass', 3000, 0.7, SR);
    const am = valueNoise(rec.seed + 11, 0.5);
    const fl = valueNoise(rec.seed + 12, 9);
    for (let i = 0; i < n; i++) {
      const t = start + i / SR;
      const a = Math.pow(am(t), 2) * (0.6 + fl(t) * 0.4);
      add(i, hp.p(r() * 2 - 1) * a * L.leaves * 0.25, 0.3);
    }
  }
  if (L.lap) {
    const lp = new Biquad('lowpass', 700, 0.7, SR);
    const bpn = new Biquad('bandpass', 1800, 0.8, SR);
    for (let i = 0; i < n; i++) {
      const t = start + i / SR;
      const ph = (t / 2.6) % 1;
      const env = Math.pow(Math.sin(ph * Math.PI), 4);
      const x = r() * 2 - 1;
      add(i, (lp.p(x) * 0.5 + bpn.p(x) * 0.2) * env * L.lap * 0.4, -0.2);
    }
  }

  // Birds.
  if (ev.birds) {
    for (const bd of within(ev.birds, start, start + n / SR, 0.6)) {
      const s = Math.round((bd.t - start) * SR);
      const a = bd.dist * 0.5;
      if (bd.kind === 'stilt') {
        // A sharp, nasal "kek": a short harmonic burst.
        const len = Math.round(0.06 * SR);
        for (let i = Math.max(0, -s); i < len && s + i < n; i++) {
          const tt = i / SR;
          const env = Math.sin((Math.PI * i) / len) ** 0.6;
          let v = 0;
          for (let hN = 1; hN <= 5; hN++) v += Math.sin(2 * Math.PI * bd.f * hN * tt) / hN;
          add(s + i, v * env * a * 0.25, bd.pan);
        }
      } else if (bd.kind === 'plover') {
        const len = Math.round(0.05 * SR);
        for (let i = Math.max(0, -s); i < len && s + i < n; i++) {
          const tt = i / SR;
          const f = bd.f * (1 - tt * 3);
          add(s + i, Math.sin(2 * Math.PI * f * tt) * Math.sin((Math.PI * i) / len) * a * 0.3, bd.pan);
        }
      } else if (bd.kind === 'egret') {
        // A rough croak.
        const len = Math.round(0.35 * SR);
        const bp = new Biquad('bandpass', 900, 1.2, SR);
        let ph = 0;
        for (let i = Math.max(0, -s); i < len && s + i < n; i++) {
          ph += (bd.f * (1 - (i / len) * 0.2)) / SR;
          const saw = (ph % 1) * 2 - 1;
          const env = Math.min(1, i / (0.02 * SR)) * Math.exp(-i / (0.18 * SR));
          add(s + i, bp.p(saw + (r() * 2 - 1) * 0.6) * env * a * 0.9, bd.pan);
        }
      } else {
        // A clear rising-falling whistle, far away.
        const len = Math.round(0.45 * SR);
        let ph = 0;
        for (let i = Math.max(0, -s); i < len && s + i < n; i++) {
          const u = i / len;
          ph += (bd.f * (0.85 + Math.sin(u * Math.PI) * 0.3)) / SR;
          add(s + i, Math.sin(2 * Math.PI * ph) * Math.sin(u * Math.PI) * a * 0.22, bd.pan);
        }
      }
    }
  }
  if (ev.wings) {
    const bp = new Biquad('bandpass', 600, 0.9, SR);
    for (const w of within(ev.wings, start, start + n / SR, 2)) {
      for (let k = 0; k < w.n; k++) {
        const s = Math.round((w.t + k / w.rate - start) * SR);
        for (let i = 0; i < 0.05 * SR; i++) {
          if (s + i < 0 || s + i >= n) continue;
          add(s + i, bp.p(r() * 2 - 1) * Math.sin((Math.PI * i) / (0.05 * SR)) * (1 - k / w.n) * 0.35, w.pan);
        }
      }
    }
  }

  // Distant thunder: a slow brown-noise roll with a crack at its head.
  if (ev.thunder) {
    for (const th of ev.thunder) {
      const s0 = Math.round((th.t - start) * SR);
      const len = Math.round(9 * SR);
      if (s0 + len < 0 || s0 >= n) continue;
      const b = new BrownNoise(mulberry32(rec.seed + Math.round(th.t)));
      const lp = new Biquad('lowpass', 160, 0.7, SR);
      const roll = valueNoise(rec.seed + Math.round(th.t * 3), 3);
      // Warm up the generator to the chunk start so the roll is continuous across chunks.
      for (let i = 0; i < len; i++) {
        const x = b.next();
        const y = lp.p(x);
        const j = s0 + i;
        if (j < 0) continue;
        if (j >= n) break;
        const u = i / SR;
        const env = Math.min(1, u / 0.6) * Math.exp(-u / 3.2) * (0.5 + roll(u) * 0.8);
        add(j, y * env * th.amp * 2.2, -0.3);
      }
    }
  }

  // Per-recording level, so that switching tapes does not jump in loudness.
  const gain = rec.gain || 1;
  if (gain !== 1) for (let i = 0; i < n; i++) {
    outL[i] *= gain;
    outR[i] *= gain;
  }
  // Drop the pre-roll.
  const skip = Math.round(pre * SR);
  return [outL.subarray(skip), outR.subarray(skip)];
}

// A rough loudness profile for the timeline drawing (one value per `step` seconds), from events.
export function profile(recIn, step = 5) {
  const rec = prepare(recIn);
  const n = Math.ceil(rec.dur / step);
  const out = new Float32Array(n);
  const L = rec.layers;
  const ev = rec.events;
  for (let i = 0; i < n; i++) {
    const t = i * step;
    let v = 0.2;
    if (L.wind) v += 0.3 * L.wind.strength * (0.5 + valueNoise(rec.seed + 1, L.wind.gust)(t) * 0.5);
    if (ev.waves) v += ev.waves.filter((w) => w.t >= t && w.t < t + step).reduce((a, w) => a + w.amp * 0.2, 0);
    if (ev.cicadas) v += ev.cicadas.filter((c) => c.t < t + step && c.t + c.len > t).length * 0.07;
    if (ev.chime && t >= ev.chime.t - step && t < ev.chime.t + 14) v += 0.4;
    if (L.rain) {
      const { from = -1, to = 1e9 } = L.rain;
      if (t >= from && t <= to) v += 0.35;
    }
    if (ev.engine && t >= ev.engine.t && t < ev.engine.t + 60) v += 0.3 * Math.exp(-(t - ev.engine.t) / 30);
    if (ev.birds) v += ev.birds.filter((b) => b.t >= t && b.t < t + step).length * 0.015;
    if (ev.thunder) v += ev.thunder.filter((th) => t >= th.t - step && t < th.t + 8).length * 0.4;
    out[i] = Math.min(1, v);
  }
  return out;
}

// Captions: which sounds are happening at time t (for the 字幕 setting).
export function soundsAt(recIn, t) {
  const rec = prepare(recIn);
  const L = rec.layers;
  const ev = rec.events;
  const out = [];
  if (L.wind && L.wind.strength > 0.8) out.push('［強風］');
  if (ev.waves && ev.waves.some((w) => t >= w.t && t < w.t + 1.5)) out.push(L.waves.kind === 'wall' ? '［浪打海堤］' : '［浪打堤腳］');
  if (ev.creak && ev.creak.some((c) => t >= c.t && t < c.t + c.len)) out.push('［繫繩摩擦］');
  if (ev.cicadas && ev.cicadas.some((c) => t >= c.t && t < c.t + c.len)) out.push(L.cicadas.duck && t > L.cicadas.duck[1] - 10 && t < L.cicadas.duck[1] + 30 ? '［蟬鳴又起］' : '［蟬鳴］');
  if (ev.chime && t >= ev.chime.t && t < ev.chime.t + 14) out.push('［下課鐘聲］');
  if (L.murmur && t >= L.murmur.from && t < L.murmur.to) out.push('［遠處人聲，已降低］');
  if (L.rain && t >= (L.rain.from ?? -1) && t <= (L.rain.to ?? 1e9)) out.push(rec.id === 'B-3' ? '［驟雨打在鐵皮棚］' : '［雨打鐵皮屋頂］');
  if (ev.drips && ev.drips.some((d) => Math.abs(t - d.t) < 0.6)) out.push('［滴水］');
  if (ev.engine && t >= ev.engine.t && t < ev.engine.t + 60) out.push('［遠處引擎發動］');
  if (L.mud) out.push('［泥灘退水］');
  if (L.trickle) out.push('［溪水］');
  if (ev.birds && ev.birds.some((b) => Math.abs(t - b.t) < 1)) out.push(rec.id === 'B-2' ? '［許多水鳥鳴叫］' : '［遠處鳥叫］');
  if (ev.wings && ev.wings.some((w) => t >= w.t && t < w.t + 1.5)) out.push('［振翅］');
  if (L.leaves) out.push('［風吹過樹葉］');
  if (L.lap) out.push('［漲潮］');
  if (ev.thunder && ev.thunder.some((th) => t >= th.t && t < th.t + 6)) out.push('［遠處雷聲］');
  return out;
}
