import { cardArtStyles, resolveArtStyle, type CardArtStyle } from '../art-styles';
import { drawTone, parseTone, resolveTone } from '../art-palettes';
import { createMelody, durations, isMelody, MAX_EVENTS, MAX_TITLE, MAX_BPM, MIN_BPM, type Melody } from './model';
import { noteFromStep, noteStep } from './studio';
const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';
export const MAX_SHARE_URL_LENGTH = 2048;
const invalid = () => new Error('分享網址不完整或格式不支援，請向分享者取得新的網址。');
export function encodeShare(melody: Melody): string {
  if (!isMelody(melody) || !melody.events.length) throw new Error('請先輸入旋律與曲名再分享。');
  const events = melody.events.map(event => alphabet[noteStep(event) ?? 36] + alphabet[durations.indexOf(event.duration) + (event.dotted ? 8 : 0)]).join('');
  const bytes = new TextEncoder().encode(JSON.stringify([melody.title, melody.tempoBpm, events]));
  return '1.' + btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
export function decodeShare(payload: string): Melody {
  try {
    if (payload.length > MAX_SHARE_URL_LENGTH || !/^1\.[A-Za-z0-9_-]+$/.test(payload)) throw invalid();
    const raw = atob(payload.slice(2).replace(/-/g, '+').replace(/_/g, '/'));
    const value: unknown = JSON.parse(new TextDecoder('utf-8', {fatal:true}).decode(Uint8Array.from(raw, c => c.charCodeAt(0))));
    if (!Array.isArray(value) || value.length !== 3) throw invalid();
    const [title, bpm, events] = value;
    if (typeof title !== 'string' || !title.trim() || title.length > MAX_TITLE || !Number.isInteger(bpm) || bpm < MIN_BPM || bpm > MAX_BPM
      || typeof events !== 'string' || !events.length || events.length % 2 || events.length > MAX_EVENTS * 2) throw invalid();
    const melody = createMelody(title);
    melody.tempoBpm = bpm;
    for (let i=0;i<events.length;i+=2) {
      const step = alphabet.indexOf(events[i]); const rhythm = alphabet.indexOf(events[i+1]);
      if (step < 0 || step > 36 || rhythm < 0 || (rhythm & ~15) || (rhythm & 7) > 5) throw invalid();
      const timing = {duration:durations[rhythm & 7], dotted:!!(rhythm & 8)};
      melody.events.push(step===36 ? {type:'rest',...timing} : noteFromStep(step,timing));
    }
    if (!isMelody(melody)) throw invalid();
    return melody;
  } catch { throw invalid(); }
}
export function shareUrl(melody: Melody, base: string): string {
  const url = new URL(base); const art=url.searchParams.get('art'); const tone=url.searchParams.get('tone'); url.search = '?view=card';
  if(art==='random')url.searchParams.set('art',art);
  else if(cardArtStyles.includes(art as CardArtStyle)) {
    url.searchParams.set('art',art!);
    if(parseTone(tone,art as CardArtStyle)!==undefined)url.searchParams.set('tone',tone!);
  }
  url.hash = `melody=${encodeShare(melody)}`;
  if (url.href.length > MAX_SHARE_URL_LENGTH) throw new Error('分享網址太長，請縮短曲名或旋律後再試。');
  return url.href;
}
export function readSharedMelody(hash: string): Melody {
  if (!hash.startsWith('#melody=')) throw invalid();
  return decodeShare(hash.slice(8));
}
export function editUrl(melody: Melody, base: string): string {
  const url = new URL(shareUrl(melody,base)); url.searchParams.delete('view');url.searchParams.set('edit','1'); return url.href;
}

/** Concrete art + palette for a share link. Random draws a new style (never `exclude`) and a random palette for it. */
export function createShareSnapshot(melody:Melody,base:string,mode:'current'|'random',random=Math.random,exclude?:CardArtStyle) {
  const source=new URL(base);
  const choices=cardArtStyles.filter(style=>style!==exclude);
  const art=source.searchParams.get('art');
  const style=mode==='random'?choices[Math.min(choices.length-1,Math.max(0,Math.floor(random()*choices.length)))]:resolveArtStyle(art,random);
  const tone=mode==='random'||art==='random'?drawTone(style,random):resolveTone(source.searchParams.get('tone'),style,melody);
  source.searchParams.set('art',style);source.searchParams.set('tone',String(tone));
  return {style,tone,url:shareUrl(melody,source.href)};
}
