// Reading progress and settings. Small JSON in localStorage; never images.
// Photos live in IndexedDB (photo-store.js) and can always be re-rendered from the
// parameters saved here, so losing the blob store loses nothing.

const KEY = 'rotary-stories.v1';

const DEFAULT_SETTINGS = {
  volume: 0.8,
  captions: false,
  reducedMotion: null, // null = follow the system
  invert: false,
  buttons: null, // on-screen knob buttons; null = automatic (touch screens)
  name: '', // signature for observation records; empty = role code
};

export class Progress {
  constructor(storage = safeStorage()) {
    this.storage = storage;
    this.data = this.load();
  }

  load() {
    let raw = null;
    try {
      raw = JSON.parse(this.storage.getItem(KEY) || 'null');
    } catch {
      raw = null;
    }
    const data = raw && typeof raw === 'object' ? raw : {};
    return {
      settings: { ...DEFAULT_SETTINGS, ...(data.settings || {}) },
      stories: data.stories && typeof data.stories === 'object' ? data.stories : {},
      lastStory: typeof data.lastStory === 'string' ? data.lastStory : null,
    };
  }

  save() {
    try {
      this.storage.setItem(KEY, JSON.stringify(this.data));
    } catch {
      /* private mode or full: progress simply is not kept */
    }
  }

  get settings() {
    return this.data.settings;
  }

  setSetting(k, v) {
    this.data.settings[k] = v;
    this.save();
  }

  story(id) {
    return this.data.stories[id] || null;
  }

  // A story's record: { started, chapter, scenes: {chapterId: state}, completed, completedAt, keepsake }
  updateStory(id, patch) {
    const cur = this.data.stories[id] || { started: Date.now(), chapter: 0, scenes: {}, completed: false };
    this.data.stories[id] = { ...cur, ...patch, scenes: { ...cur.scenes, ...(patch.scenes || {}) } };
    this.data.lastStory = id;
    this.save();
    return this.data.stories[id];
  }

  // Start again from the first chapter but keep what the reader made (the keepsake).
  restartStory(id) {
    const cur = this.data.stories[id];
    this.data.stories[id] = { started: Date.now(), chapter: 0, scenes: {}, completed: cur ? cur.completed : false, completedAt: cur && cur.completedAt, keepsake: cur && cur.keepsake };
    this.save();
    return this.data.stories[id];
  }

  sceneState(id, chapterId) {
    const s = this.story(id);
    return (s && s.scenes && s.scenes[chapterId]) || null;
  }
}

function safeStorage() {
  try {
    const s = globalThis.localStorage;
    const probe = '__rs_probe__';
    s.setItem(probe, '1');
    s.removeItem(probe);
    return s;
  } catch {
    const mem = new Map();
    return { getItem: (k) => (mem.has(k) ? mem.get(k) : null), setItem: (k, v) => mem.set(k, String(v)), removeItem: (k) => mem.delete(k) };
  }
}
