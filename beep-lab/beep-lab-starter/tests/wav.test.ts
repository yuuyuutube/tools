import {describe,it,expect} from 'vitest';
import {createMelody,eventSeconds} from '../src/music-core/model';
import {noteFromStep} from '../src/music-core/studio';
import {MAX_WAV_SECONDS,renderWav,wavFilename,WAV_SAMPLE_RATE} from '../src/audio-engine/wav';
import {albumCoverStyle} from '../src/album-cover';
const song=()=>({...createMelody('第一首'),events:[noteFromStep(12,{duration:4,dotted:false}),{type:'rest' as const,duration:4 as const,dotted:false},noteFromStep(35,{duration:8,dotted:true})]});
describe('WAV export',()=>{
  it('creates standard mono PCM16 RIFF headers and exact tempo-derived duration',()=>{
    const melody=song(),buffer=renderWav(melody),view=new DataView(buffer);
    const text=(offset:number,size:number)=>String.fromCharCode(...new Uint8Array(buffer,offset,size));
    expect(text(0,4)).toBe('RIFF');expect(text(8,4)).toBe('WAVE');expect(text(12,4)).toBe('fmt ');expect(text(36,4)).toBe('data');expect(view.getUint16(20,true)).toBe(1);expect(view.getUint16(22,true)).toBe(1);expect(view.getUint16(34,true)).toBe(16);expect(view.getUint32(24,true)).toBe(WAV_SAMPLE_RATE);expect(view.getUint32(28,true)).toBe(WAV_SAMPLE_RATE*2);
    const seconds=melody.events.reduce((sum,event)=>sum+eventSeconds(event,melody.tempoBpm),0);
    expect(buffer.byteLength).toBe(44+Math.round(seconds*WAV_SAMPLE_RATE)*2);expect(view.getUint32(40,true)).toBe(buffer.byteLength-44);expect(view.getUint32(4,true)).toBe(buffer.byteLength-8);
  });
  it('contains audible notes, silent rests, and bounded samples without clipping',()=>{
    const buffer=renderWav(song()),pcm=new Int16Array(buffer,44);
    expect([...pcm.slice(200,1000)].some(value=>value!==0)).toBe(true);
    expect([...pcm.slice(Math.ceil(.5*WAV_SAMPLE_RATE),WAV_SAMPLE_RATE)].every(value=>value===0)).toBe(true);
    expect(Math.max(...pcm.slice(0,10000).map(value=>Math.abs(value)))).toBeLessThan(7000);expect(pcm[0]).toBe(0);expect(pcm.at(-1)).toBe(0);
  });
  it('renders all-rest melodies as complete silence',()=>{
    const buffer=renderWav({...createMelody(),events:[{type:'rest',duration:4,dotted:false}]});
    expect([...new Int16Array(buffer,44)].every(value=>value===0)).toBe(true);
  });
  it('exports deterministic audio independent of title and local identity',()=>{
    const melody=song();expect(renderWav({...melody,title:'renamed',id:'new'})).toEqual(renderWav(melody));
  });
  it('rejects invalid, empty and overly long compositions before allocation',()=>{
    expect(()=>renderWav(createMelody())).toThrow();expect(()=>renderWav({...song(),tempoBpm:0})).toThrow();
    expect(()=>renderWav({...song(),tempoBpm:40,events:Array.from({length:40},()=>noteFromStep(12,{duration:1,dotted:false}))})).toThrow('3 分鐘');expect(MAX_WAV_SECONDS).toBe(180);
  });
  it('preserves Unicode names while removing file-system control characters',()=>{
    expect(wavFilename('我的/第一首:*?')).toBe('我的 第一首.wav');expect(wavFilename(' / ')).toBe('beep.wav');
  });
});
describe('album covers',()=>{
  it('keeps cover style stable across save/load and renaming',()=>{
    const melody=song();expect(albumCoverStyle({...melody,id:'new',title:'another'})).toBe(albumCoverStyle(melody));
  });
});
