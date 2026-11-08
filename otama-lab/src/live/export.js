import { pitchOf } from '../pitch.js';
import { recordingRows, RECORDING_ROW_MS } from './recording.js';

export function drawPitchRecording(recording, canvas) {
  const rows = recordingRows(recording), width = 1440, rowHeight = 280;
  canvas.width = width; canvas.height = 32 + rows.length * rowHeight;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('無法產生圖片，請重新開啟錄製結果再試一次。');
  context.fillStyle = '#0c1719'; context.fillRect(0, 0, canvas.width, canvas.height);
  const midis = recording.frames.filter(frame => frame.frequencyHz !== null).map(frame => pitchOf(frame.frequencyHz).midi);
  let low = midis.length ? Math.floor(Math.min(...midis) - 2) : 55;
  let high = midis.length ? Math.ceil(Math.max(...midis) + 2) : 86;
  if (high - low < 6) { low = Math.floor((high + low) / 2 - 3); high = low + 6; }
  const left = 100, right = width - 40;
  const spanMs = Math.min(RECORDING_ROW_MS, Math.max(1, recording.durationMs));
  for (const [rowIndex, row] of rows.entries()) {
    const top = 24 + rowIndex * rowHeight, bottom = top + 218;
    const x = timeMs => left + (timeMs - row.startMs) / spanMs * (right - left);
    const y = frequency => bottom - (pitchOf(frequency).midi - low) / (high - low) * (bottom - top);
    const endX = x(row.endMs), step = Math.max(1, Math.ceil((high - low) / 5));
    context.font = '18px system-ui, sans-serif';
    for (let midi = Math.ceil(low / step) * step; midi <= high; midi += step) {
      const frequency = 440 * 2 ** ((midi - 69) / 12), py = y(frequency);
      context.strokeStyle = '#30494a'; context.lineWidth = 1;
      context.beginPath(); context.moveTo(left, py); context.lineTo(endX, py); context.stroke();
      context.fillStyle = '#a3b8ae'; context.textAlign = 'right';
      context.fillText(pitchOf(frequency).note, left - 18, py + 6);
    }
    const tickMs = spanMs <= 3000 ? 1000 : spanMs <= 6000 ? 2000 : 3000;
    const ticks = [];
    for (let timeMs = row.startMs; timeMs <= row.endMs; timeMs += tickMs) ticks.push(timeMs);
    if (!ticks.length || row.endMs - ticks.at(-1) > spanMs * .07) ticks.push(row.endMs);
    else if (ticks.length > 1) ticks[ticks.length - 1] = row.endMs;
    context.fillStyle = '#a3b8ae'; context.font = '18px ui-monospace, monospace';
    for (const timeMs of ticks) {
      context.textAlign = timeMs === row.startMs ? 'left' : timeMs === row.endMs ? 'right' : 'center';
      context.fillText(`${Number((timeMs / 1000).toFixed(1))} s`, x(timeMs), bottom + 30);
    }
    // A short final row ends at the actual stop time, with no invented silence.
    context.save(); context.beginPath(); context.rect(left - 3, top - 3, Math.max(6, endX - left + 6), bottom - top + 6); context.clip();
    context.strokeStyle = context.fillStyle = '#c8f16e'; context.lineWidth = 3;
    context.lineCap = context.lineJoin = 'round';
    for (const segment of row.segments) {
      if (segment.length === 1) {
        context.beginPath(); context.arc(x(segment[0].timeMs), y(segment[0].frequencyHz), 2.5, 0, 2 * Math.PI); context.fill();
      } else {
        context.beginPath();
        segment.forEach((point, index) => context[index ? 'lineTo' : 'moveTo'](x(point.timeMs), y(point.frequencyHz)));
        context.stroke();
      }
    }
    context.restore();
  }
  return canvas;
}

export async function pitchRecordingPng(recording) {
  const canvas = drawPitchRecording(recording, document.createElement('canvas'));
  return new Promise((resolve, reject) => canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error('圖片產生失敗，請重新開啟錄製結果再試一次。')), 'image/png'));
}

export function canSharePitchFile(file, nav = navigator) {
  try { return typeof nav.share === 'function' && typeof nav.canShare === 'function' && nav.canShare({ files: [file] }); }
  catch { return false; }
}
