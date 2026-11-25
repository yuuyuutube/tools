// Versioned local save. Unknown fields are kept, missing ones are filled from defaults,
// so adding missions, artifacts or settings later never invalidates an old file.

export const SAVE_KEY = 'bureau-of-unnecessary-protection/save';
export const SAVE_VERSION = 1;

export const DEFAULT_SETTINGS = {
  volume: 0.8, // 0..1
  ambient: false,
  sensitivity: 'standard', // precise | standard | swift
  invert: false, // flips the knob direction for encoders wired the other way
  visualAssist: false, // labels resonance on the strip chart, blinks the index lamp
  reducedMotion: false,
  shortReveal: 'auto', // auto (long first time, short after) | always-long | always-short
  haptics: true,
};

export function defaultSave(now = Date.now()) {
  return {
    format: 'bup-save',
    version: SAVE_VERSION,
    createdAt: now,
    updatedAt: now,
    employeeNo: String(1000 + (now % 9000)).padStart(4, '0'),
    settings: { ...DEFAULT_SETTINGS },
    missions: {}, // id -> { completedAt, attempts, failures }
    artifacts: {}, // id -> { firstAt, count, log: [{ at, source }] }
    daily: { date: null, done: [], overtime: 0 },
    stats: { opened: 0, failures: 0, graduations: 0, fastSpins: 0 },
    seenIntro: false,
    seenReveal: {}, // artifact id -> true once the long ceremony has played
  };
}

const isObj = (v) => v && typeof v === 'object' && !Array.isArray(v);

// Bring any older or partial save up to the current shape.
export function migrate(raw, now = Date.now()) {
  const base = defaultSave(now);
  if (!isObj(raw) || raw.format !== 'bup-save') return base;
  const out = { ...base, ...raw };
  out.settings = { ...DEFAULT_SETTINGS, ...(isObj(raw.settings) ? raw.settings : {}) };
  out.missions = isObj(raw.missions) ? { ...raw.missions } : {};
  out.artifacts = {};
  if (isObj(raw.artifacts)) {
    for (const [id, rec] of Object.entries(raw.artifacts)) {
      if (!isObj(rec)) continue;
      const count = Number.isInteger(rec.count) && rec.count > 0 ? rec.count : 1;
      out.artifacts[id] = {
        firstAt: Number.isFinite(rec.firstAt) ? rec.firstAt : now,
        count,
        log: Array.isArray(rec.log) ? rec.log.slice(-50) : [],
      };
    }
  }
  out.daily = { ...base.daily, ...(isObj(raw.daily) ? raw.daily : {}) };
  if (!Array.isArray(out.daily.done)) out.daily.done = [];
  out.stats = { ...base.stats, ...(isObj(raw.stats) ? raw.stats : {}) };
  out.seenReveal = isObj(raw.seenReveal) ? { ...raw.seenReveal } : {};
  // Future versions migrate step by step here: if (out.version < 2) { ... }
  out.version = SAVE_VERSION;
  return out;
}

export class SaveManager {
  constructor({ storage } = {}) {
    this.storage = storage !== undefined ? storage : safeStorage();
    this.data = this.load();
    this.listeners = new Set();
  }

  load() {
    if (!this.storage) return defaultSave();
    try {
      const text = this.storage.getItem(SAVE_KEY);
      return text ? migrate(JSON.parse(text)) : defaultSave();
    } catch {
      return defaultSave();
    }
  }

  persist() {
    this.data.updatedAt = Date.now();
    if (!this.storage) return;
    try {
      this.storage.setItem(SAVE_KEY, JSON.stringify(this.data));
    } catch {
      /* storage full or blocked: the game keeps running from memory */
    }
    for (const fn of this.listeners) fn(this.data);
  }

  onChange(fn) {
    this.listeners.add(fn);
  }

  get settings() {
    return this.data.settings;
  }

  setSetting(key, value) {
    this.data.settings[key] = value;
    this.persist();
  }

  isComplete(missionId) {
    return Boolean(this.data.missions[missionId] && this.data.missions[missionId].completedAt);
  }

  recordAttempt(missionId, failed) {
    const m = (this.data.missions[missionId] ||= { completedAt: null, attempts: 0, failures: 0 });
    if (failed) {
      m.failures += 1;
      this.data.stats.failures += 1;
    }
    this.persist();
  }

  completeMission(missionId, now = Date.now()) {
    const m = (this.data.missions[missionId] ||= { completedAt: null, attempts: 0, failures: 0 });
    m.attempts += 1;
    if (!m.completedAt) m.completedAt = now;
    this.data.stats.opened += 1;
    this.persist();
  }

  // Returns { count, first } — first is true the first time an artifact enters the archive.
  addArtifact(id, source, now = Date.now()) {
    const rec = this.data.artifacts[id];
    if (rec) {
      rec.count += 1;
      rec.log.push({ at: now, source });
      if (rec.log.length > 50) rec.log.shift();
      this.persist();
      return { count: rec.count, first: false };
    }
    this.data.artifacts[id] = { firstAt: now, count: 1, log: [{ at: now, source }] };
    this.persist();
    return { count: 1, first: true };
  }

  artifactCount(id) {
    return this.data.artifacts[id] ? this.data.artifacts[id].count : 0;
  }

  get distinctArtifacts() {
    return Object.keys(this.data.artifacts).length;
  }

  get totalArtifacts() {
    return Object.values(this.data.artifacts).reduce((n, r) => n + r.count, 0);
  }

  exportJSON() {
    return JSON.stringify(this.data, null, 2);
  }

  // Returns true when the text was a Bureau save and has replaced the current one.
  importJSON(text) {
    let raw;
    try {
      raw = JSON.parse(text);
    } catch {
      return false;
    }
    if (!isObj(raw) || raw.format !== 'bup-save') return false;
    this.data = migrate(raw);
    this.persist();
    return true;
  }

  reset() {
    const settings = { ...this.data.settings };
    this.data = defaultSave();
    this.data.settings = settings; // the employee keeps their chair adjustments
    this.persist();
  }
}

function safeStorage() {
  try {
    const s = globalThis.localStorage;
    if (!s) return null;
    const k = '__bup_probe__';
    s.setItem(k, '1');
    s.removeItem(k);
    return s;
  } catch {
    return null;
  }
}
