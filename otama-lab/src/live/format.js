import { RECORDING_LIMIT_MS } from './recording.js';

// Versioned pitch-only interchange. Image recovery is a separate, pixel-only
// fallback; this reader remains strict about embedded data and JSON versions.
export const PITCH_FILE_LIMIT = 8 * 1024 * 1024;
const PITCH_TEXT_LIMIT = 600000;
const pitchKeyword = 'otama-lab.recording';
const pngSignature = [137, 80, 78, 71, 13, 10, 26, 10];
const pitchEncoder = new TextEncoder();
const pitchDecoder = new TextDecoder('utf-8', { fatal: true });

export function parsePitchDocument(text) {
  if (typeof text !== 'string' || text.length > PITCH_TEXT_LIMIT) throw new Error('演奏資料過大。');
  let data;
  try { data = JSON.parse(text); } catch { throw new Error('無法讀取演奏資料，請選擇 OTAMA LAB 匯出的 PNG 或 JSON。'); }
  if (data?.format !== 'otama-lab.pitch' || ![1, 2].includes(data.version) || data.tuningHz !== 440) throw new Error('不支援這份演奏資料的格式或版本。');
  let reconstruction;
  if (data.version === 2) {
    const source = data.reconstruction;
    if (source?.method !== 'image-curve' || !['axis', 'assumed'].includes(source.pitchScale) || !['axis', 'assumed'].includes(source.timeScale)) throw new Error('圖片辨識資料的來源標記無效。');
    reconstruction = Object.freeze({ method: 'image-curve', pitchScale: source.pitchScale, timeScale: source.timeScale });
  } else if (data.reconstruction !== undefined) throw new Error('圖片辨識資料必須使用版本 2。');
  if (!Number.isFinite(data.durationMs) || data.durationMs <= 0 || data.durationMs > RECORDING_LIMIT_MS || !Array.isArray(data.frames) || data.frames.length > 6000) throw new Error('演奏資料必須在 60 秒內，且包含有效的音高軌跡。');
  let previous = -1;
  const frames = data.frames.map(frame => {
    if (!frame || !Number.isFinite(frame.timeMs) || frame.timeMs < 0 || frame.timeMs > data.durationMs || frame.timeMs <= previous || !(frame.frequencyHz === null || (Number.isFinite(frame.frequencyHz) && frame.frequencyHz >= 20 && frame.frequencyHz <= 20000))) throw new Error('演奏資料含有無效的時間或頻率。');
    previous = frame.timeMs;
    return Object.freeze({ timeMs: frame.timeMs, frequencyHz: frame.frequencyHz });
  });
  return Object.freeze({ durationMs: data.durationMs, frames: Object.freeze(frames), hasPitch: frames.some(frame => frame.frequencyHz !== null), ...(reconstruction ? { reconstruction } : {}) });
}

export function pitchDocument(recording) {
  const text = JSON.stringify({ format: 'otama-lab.pitch', version: recording.reconstruction ? 2 : 1, tuningHz: 440, durationMs: recording.durationMs, frames: recording.frames, ...(recording.reconstruction ? { reconstruction: recording.reconstruction } : {}) });
  parsePitchDocument(text);
  return text;
}

export function pngCrc(bytes) {
  let crc = 0xffffffff;
  for (const byte of bytes) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit++) crc = (crc >>> 1) ^ ((crc & 1) ? 0xedb88320 : 0);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function pitchPngChunks(bytes) {
  if (bytes.length > PITCH_FILE_LIMIT || !pngSignature.every((byte, i) => bytes[i] === byte)) throw new Error('不是有效的 PNG 圖片。');
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength), chunks = [];
  let offset = 8, ended = false, imageData = false;
  while (offset + 12 <= bytes.length) {
    const length = view.getUint32(offset), end = offset + 12 + length;
    if (end > bytes.length || chunks.length > 10000) throw new Error('PNG 圖片不完整或過於複雜。');
    const type = String.fromCharCode(...bytes.subarray(offset + 4, offset + 8));
    if (!/^[A-Za-z]{4}$/.test(type) || pngCrc(bytes.subarray(offset + 4, end - 4)) !== view.getUint32(end - 4)) throw new Error('PNG 資料已損壞，請使用原始檔案。');
    if (!chunks.length && (type !== 'IHDR' || length !== 13)) throw new Error('PNG 缺少圖片標頭。');
    if (type === 'IDAT') imageData = true;
    chunks.push({ type, offset, end, data: bytes.subarray(offset + 8, end - 4) });
    offset = end;
    if (type === 'IEND') { ended = length === 0; break; }
  }
  if (!ended || !imageData || offset !== bytes.length) throw new Error('PNG 圖片不完整。');
  return chunks;
}

export function embedPitchPng(bytes, recording) {
  const chunks = pitchPngChunks(bytes);
  const payload = pitchEncoder.encode(`${pitchKeyword}\0\0\0\0\0${pitchDocument(recording)}`);
  const chunk = new Uint8Array(payload.length + 12), view = new DataView(chunk.buffer);
  view.setUint32(0, payload.length); chunk.set(pitchEncoder.encode('iTXt'), 4); chunk.set(payload, 8);
  view.setUint32(chunk.length - 4, pngCrc(chunk.subarray(4, chunk.length - 4)));
  const end = chunks.at(-1).offset, result = new Uint8Array(bytes.length + chunk.length);
  result.set(bytes.subarray(0, end)); result.set(chunk, end); result.set(bytes.subarray(end), end + chunk.length);
  return result;
}

export function extractPitchPng(bytes) {
  let documentText = null;
  for (const chunk of pitchPngChunks(bytes)) {
    if (chunk.type !== 'iTXt') continue;
    const data = chunk.data, separator = data.indexOf(0);
    if (separator < 0 || String.fromCharCode(...data.subarray(0, Math.min(separator, 80))) !== pitchKeyword) continue;
    if (documentText !== null || data.length > PITCH_TEXT_LIMIT + 100 || data[separator + 1] !== 0 || data[separator + 2] !== 0) throw new Error('PNG 的演奏資料無法讀取。');
    const languageEnd = data.indexOf(0, separator + 3), translatedEnd = data.indexOf(0, languageEnd + 1);
    if (languageEnd < 0 || translatedEnd < 0) throw new Error('PNG 的演奏資料不完整。');
    try { documentText = pitchDecoder.decode(data.subarray(translatedEnd + 1)); } catch { throw new Error('PNG 的演奏資料文字已損壞。'); }
  }
  if (documentText === null) {
    const error = new Error('這張 PNG 沒有演奏資料。'); error.code = 'NO_PITCH_DATA'; throw error;
  }
  return parsePitchDocument(documentText);
}

export async function importPitchFile(file) {
  if (!file || file.size > PITCH_FILE_LIMIT) throw new Error('請選擇 8 MB 以內的 PNG 或 JSON。');
  const bytes = new Uint8Array(await file.arrayBuffer());
  if (bytes.length > PITCH_FILE_LIMIT) throw new Error('檔案過大。');
  if (pngSignature.every((byte, i) => bytes[i] === byte)) return extractPitchPng(bytes);
  if (bytes.length > PITCH_TEXT_LIMIT) throw new Error('JSON 演奏資料過大。');
  let text;
  try { text = pitchDecoder.decode(bytes); } catch { throw new Error('請選擇 OTAMA LAB 匯出的 PNG 或 JSON。'); }
  return parsePitchDocument(text);
}
