import { describe, expect, it } from 'vitest';
import { createMelody, durations, MAX_EVENTS, type Melody } from '../src/music-core/model';
import { noteFromStep } from '../src/music-core/studio';
import { decodeShare, editUrl, encodeShare, MAX_SHARE_URL_LENGTH, readSharedMelody, shareUrl } from '../src/music-core/share';
const pack=(value:unknown)=>'1.'+btoa(JSON.stringify(value)).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
function sample():Melody {
  return {...createMelody('雨天的小曲 <3 & "朋友"'),tempoBpm:173,events:[noteFromStep(0,{duration:32,dotted:true}),noteFromStep(35,{duration:1,dotted:false}),{type:'rest',duration:8,dotted:true}]};
}
describe('versioned share links',()=>{
  it('round trips Unicode titles, BPM, all pitches, rhythms, dots and rests',()=>{
    const song=sample();
    song.events=durations.flatMap(duration=>[false,true].flatMap(dotted=>[
      ...Array.from({length:36},(_,step)=>noteFromStep(step,{duration,dotted})),{type:'rest' as const,duration,dotted}
    ]));
    const decoded=decodeShare(encodeShare(song));
    expect(decoded.title).toBe(song.title);expect(decoded.tempoBpm).toBe(song.tempoBpm);expect(decoded.events).toEqual(song.events);
  });
  it('imports a new local identity and never transmits source identifiers or timestamps',()=>{
    const song=sample(); const decoded=decodeShare(encodeShare(song));
    expect(decoded.id).not.toBe(song.id);expect(encodeShare({...song,id:'another-source',createdAt:'2020-01-01',updatedAt:'2021-01-01'})).toBe(encodeShare(song));
    const second=decodeShare(encodeShare(song));expect(second.id).not.toBe(decoded.id);
  });
  it('keeps a maximum-length melody and Chinese title within the URL budget',()=>{
    const song={...sample(),title:'旋'.repeat(60),events:Array.from({length:MAX_EVENTS},()=>noteFromStep(22,{duration:32,dotted:true}))};
    const url=shareUrl(song,'https://yuuyuutube.github.io/tools/beep-lab/?focus=1');
    expect(url.length).toBeLessThanOrEqual(MAX_SHARE_URL_LENGTH);expect(readSharedMelody(new URL(url).hash).events).toEqual(song.events);
  });
  it('preserves the deployment subdirectory and removes unrelated query settings',()=>{
    const url=new URL(shareUrl(sample(),'https://example.com/tools/beep-lab/?focus=1#old'));
    expect(url.pathname).toBe('/tools/beep-lab/');expect(url.search).toBe('?view=card');expect(url.hash.startsWith('#melody=1.')).toBe(true);
    expect(new URL(editUrl(sample(),url.href)).search).toBe('?edit=1');
  });
  it('shares a snapshot independent of later edits',()=>{
    const song=sample(); const payload=encodeShare(song);song.title='changed';song.events=[];
    expect(decodeShare(payload).title).not.toBe('changed');expect(decodeShare(payload).events).toHaveLength(3);
  });
  it.each(['','2.abc','1.???','1.'+'A'.repeat(3000),pack(['title',120,'']),pack(['title',39,'AA']),pack(['title',241,'AA']),pack(['title',120.5,'AA']),pack(['',120,'AA']),pack(['x'.repeat(61),120,'AA']),pack(['title',120,'A']),pack(['title',120,'_A']),pack(['title',120,'AG']),pack(['title',120,'AQ']),pack(['title',120,'AA'.repeat(MAX_EVENTS+1)]),pack(['title',120,'AA','extra'])])('rejects invalid or unsupported payload %s',payload=>{
    expect(()=>decodeShare(payload)).toThrow('分享網址');
  });
  it('rejects empty compositions, invalid model data, missing fragments, and excessive full URLs',()=>{
    expect(()=>encodeShare(createMelody())).toThrow();expect(()=>encodeShare({...sample(),tempoBpm:0})).toThrow();
    expect(()=>readSharedMelody('#other=x')).toThrow();expect(()=>shareUrl(sample(),'https://example.com/'+'a'.repeat(2048))).toThrow('太長');
  });
});
