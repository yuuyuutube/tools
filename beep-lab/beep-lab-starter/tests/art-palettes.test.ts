import {describe,it,expect} from 'vitest';
import {createMelody} from '../src/music-core/model';
import {noteFromStep} from '../src/music-core/studio';
import {cardArtStyles,type CardArtStyle} from '../src/art-styles';
import {artPalettes,defaultTone,drawTone,parseTone,resolveTone,toneColorMap,paletteName,weavePalettes,melodySeed} from '../src/art-palettes';
import {albumCoverStyle,albumCoverTone} from '../src/album-cover';
import {shareUrl,editUrl,createShareSnapshot} from '../src/music-core/share';

const sample=(seed=0)=>({...createMelody('palette'),events:[noteFromStep(seed%36,{duration:4,dotted:false}),{type:'rest' as const,duration:8 as const,dotted:false},noteFromStep((seed+7)%36,{duration:8,dotted:true})]});
const sources=import.meta.glob<string>('../src/*.ts',{query:'?raw',import:'default',eager:true});
const rendererFile:Record<CardArtStyle,string>={weave:'art-palettes',stars:'card-art',rhythm:'card-art',terrain:'terrain-art',letterpress:'letterpress-art',specimen:'specimen-art',windows:'window-art'};

describe('card art palettes',()=>{
  it('gives every style its originals plus two new palettes, one valid hex per role',()=>{
    for(const style of cardArtStyles) {
      const {roles,palettes}=artPalettes[style];
      expect(palettes).toHaveLength(style==='weave'?6:3);
      expect(new Set(palettes.map(p=>p.name)).size).toBe(palettes.length);
      for(const palette of palettes){expect(palette.colors).toHaveLength(roles.length);for(const hex of palette.colors)expect(hex).toMatch(/^#[0-9a-f]{6}$/);}
    }
  });
  it('matches the colours each renderer actually paints, so recolouring reaches every role',()=>{
    for(const style of cardArtStyles) {
      const source=sources[`../src/${rendererFile[style]}.ts`].toLowerCase();
      const originals=style==='weave'?artPalettes.weave.palettes.slice(0,weavePalettes.length):[artPalettes[style].palettes[0]];
      for(const palette of originals)for(const hex of palette.colors)expect(source,`${style} ${hex}`).toContain(hex);
    }
  });
  it('keeps old links unchanged: weave defaults to its hashed palette, others to their original',()=>{
    const melody=sample(3);
    expect(defaultTone(melody,'weave')).toBe(melodySeed(melody)%4);
    expect(defaultTone(melody,'terrain')).toBe(0);
    expect(resolveTone(null,'stars',melody)).toBe(0);
    expect(resolveTone('2','stars',melody)).toBe(2);
    expect([...toneColorMap(melody,'terrain',0)].every(([from,to])=>from===to)).toBe(true);
    expect(toneColorMap(melody,'terrain',1).get('#4e716c')).toBe('#6b5a3f');
  });
  it('rejects malformed or out-of-range tones',()=>{
    for(const value of ['3','-1','1.5','x','',' 1','999'])expect(parseTone(value,'terrain')).toBeUndefined();
    expect(parseTone('5','weave')).toBe(5);expect(parseTone('6','weave')).toBeUndefined();
  });
  it('draws bounded random palettes and never repeats the excluded one',()=>{
    expect(drawTone('rhythm',()=>0)).toBe(0);expect(drawTone('rhythm',()=>.999)).toBe(2);expect(drawTone('rhythm',()=>NaN)).toBe(0);
    for(const sample of [0,.4,.99])expect(drawTone('rhythm',()=>sample,1)).not.toBe(1);
    expect(paletteName('stars',drawTone('stars',()=>.5,0))).toBe('梅夜');
  });
  it('gives each album a stable style and palette based only on its notes',()=>{
    for(let seed=0;seed<40;seed++) {
      const melody=sample(seed),tone=albumCoverTone(melody);
      expect(tone).toBeGreaterThanOrEqual(0);expect(tone).toBeLessThan(artPalettes[albumCoverStyle(melody)].palettes.length);
      expect(albumCoverTone({...melody,id:'other',title:'other'})).toBe(tone);
    }
  });
});

describe('palettes in shared links',()=>{
  it('keeps a valid tone with its art, drops invalid ones and tones on random art',()=>{
    const url=new URL(shareUrl(sample(),'https://example.com/?art=terrain&tone=2&focus=1'));
    expect(url.search).toBe('?view=card&art=terrain&tone=2');
    expect(new URL(editUrl(sample(),url.href)).searchParams.get('tone')).toBe('2');
    expect(new URL(shareUrl(sample(),'https://example.com/?art=terrain&tone=7')).searchParams.has('tone')).toBe(false);
    expect(new URL(shareUrl(sample(),'https://example.com/?tone=1')).searchParams.has('tone')).toBe(false);
    expect(new URL(shareUrl(sample(),'https://example.com/?art=random&tone=1')).searchParams.has('tone')).toBe(false);
  });
  it('shares the current palette, defaulting old links to their original colours',()=>{
    const current=createShareSnapshot(sample(),'https://example.com/?view=card&art=specimen&tone=1','current');
    expect(current).toMatchObject({style:'specimen',tone:1});expect(new URL(current.url).searchParams.get('tone')).toBe('1');
    expect(createShareSnapshot(sample(),'https://example.com/?view=card&art=windows','current').tone).toBe(0);
    const melody=sample(5);expect(createShareSnapshot(melody,'https://example.com/','current').tone).toBe(defaultTone(melody,'weave'));
  });
  it('random surprise draws a style and a palette together, written into the link',()=>{
    const result=createShareSnapshot(sample(),'https://example.com/?art=terrain&tone=0','random',()=>.95);
    expect(result).toMatchObject({style:'windows',tone:2});
    const url=new URL(result.url);expect(url.searchParams.get('art')).toBe('windows');expect(url.searchParams.get('tone')).toBe('2');
  });
});
