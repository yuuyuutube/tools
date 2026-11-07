import { createYin } from './yin.js';
const detectPitch = createYin();
self.onmessage = ({ data }) => {
  const result = detectPitch(new Float32Array(data.buffer), data.sampleRate);
  self.postMessage({ ...result, timestampMs: data.timestampMs, source: 'microphone' });
};
