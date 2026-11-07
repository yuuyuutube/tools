import {describe,it,expect} from 'vitest';
import {createMelody} from '../src/music-core/model';
import {noteFromStep} from '../src/music-core/studio';
import {buildLetterpress} from '../src/letterpress-art';
import {shareUrl} from '../src/music-core/share';
describe('melody letterpress',()=>{
  it('uses glyphs, octave rotation, dotted overprinting and rhythmic spacing without printing rests',()=>{
    const melody={...createMelody(),events:[noteFromStep(0,{duration:4,dotted:false}),{type:'rest' as const,duration:8 as const,dotted:false},noteFromStep(23,{duration:8,dotted:true})]};
    const stamps=buildLetterpress(melody);expect(stamps).toHaveLength(2);expect(stamps[0]).toMatchObject({index:0,glyph:0,rotation:0,dotted:false});expect(stamps[1]).toMatchObject({index:2,glyph:6,rotation:90,dotted:true});
    expect(buildLetterpress({...melody,id:'new',title:'new'})).toEqual(stamps);
    expect(new URL(shareUrl(melody,'https://example.com/?art=letterpress')).searchParams.get('art')).toBe('letterpress');
  });
  it('handles dense and sparse melodies with finite, bounded stamps',()=>{
    for(const events of [[],[noteFromStep(35,{duration:1,dotted:true})],Array.from({length:512},(_,i)=>noteFromStep(i%36,{duration:i%2?32:1,dotted:!!(i%3)}))]) {
      const stamps=buildLetterpress({...createMelody(),events});expect(stamps).toHaveLength(events.length);
      for(const stamp of stamps){expect(stamp.x).toBeGreaterThan(55);expect(stamp.x).toBeLessThan(545);expect(stamp.y).toBeGreaterThan(55);expect(stamp.y).toBeLessThan(545);expect(stamp.size).toBeGreaterThan(0);expect(stamp.size).toBeLessThanOrEqual(82);}
    }
    expect(buildLetterpress({...createMelody(),events:[{type:'rest',duration:4,dotted:false}]})).toEqual([]);
    expect(buildLetterpress({...createMelody(),events:[noteFromStep(0,{duration:4,dotted:false})]})[0]).toMatchObject({x:300,y:300});
  });
});
