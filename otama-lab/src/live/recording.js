export const RECORDING_LIMIT_MS = 60000;
export const RECORDING_ROW_MS = 12000;

// Only derived pitch data is retained. No microphone samples or audio recording.
export class PitchRecording {
  constructor() { this.active = false; this.frames = []; }
  start(timestampMs) { this.startMs = timestampMs; this.frames = []; this.active = true; }
  elapsed(timestampMs) { return Math.max(0, Math.min(RECORDING_LIMIT_MS, timestampMs - this.startMs)); }
  add(frame) {
    if (!this.active) return;
    const timeMs = frame.timestampMs - this.startMs;
    if (!Number.isFinite(timeMs) || timeMs < 0 || timeMs > RECORDING_LIMIT_MS) return;
    if (this.frames.length && timeMs <= this.frames.at(-1).timeMs) return;
    this.frames.push({ timeMs, frequencyHz: Number.isFinite(frame.frequencyHz) && frame.frequencyHz > 0 ? frame.frequencyHz : null });
  }
  finish(timestampMs) {
    if (!this.active) return null;
    this.active = false;
    const durationMs = this.elapsed(timestampMs);
    const frames = this.frames.filter(frame => frame.timeMs <= durationMs).map(frame => Object.freeze({ ...frame }));
    this.frames = [];
    return Object.freeze({ durationMs, frames: Object.freeze(frames), hasPitch: frames.some(frame => frame.frequencyHz !== null) });
  }
}

export function recordingRows(recording) {
  const rows = [];
  for (let startMs = 0; startMs < Math.max(1, recording.durationMs); startMs += RECORDING_ROW_MS) {
    const endMs = Math.min(recording.durationMs, startMs + RECORDING_ROW_MS);
    const segments = []; let segment = null, previous = null;
    for (const frame of recording.frames) {
      if (frame.timeMs < startMs || frame.timeMs > endMs) continue;
      if (frame.frequencyHz === null) { segment = null; previous = null; continue; }
      if (!segment || frame.timeMs - previous.timeMs > 200) { segment = []; segments.push(segment); }
      segment.push(frame); previous = frame;
    }
    rows.push({ startMs, endMs, segments });
  }
  return rows;
}

export const recordingClock = elapsed => {
  const seconds = Math.floor(Math.max(0, Math.min(RECORDING_LIMIT_MS, elapsed)) / 1000);
  return `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
};
