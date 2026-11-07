import {describe,it,expect} from 'vitest';
import {createMelody} from '../src/music-core/model';
import {noteFromStep} from '../src/music-core/studio';
import {buildTerrain} from '../src/terrain-art';
import {shareUrl} from '../src/music-core/share';
describe('sound terrain',()=>{
  it('uses pitch for elevation, rhythm for width, and rests for valleys',()=>{
    const melody={...createMelody(),events:[noteFromStep(0,{duration:4,dotted:false}),{type:'rest' as const,duration:8 as const,dotted:false},noteFromStep(35,{duration:8,dotted:true})]};
    const segments=buildTerrain(melody);expect(segments[1].y).toBeNull();expect(segments[2].y!).toBeLessThan(segments[0].y!);expect(segments[0].width/segments[2].width).toBeCloseTo(4/3);
    expect(buildTerrain({...melody,title:'new',id:'new'})).toEqual(segments);
    expect(new URL(shareUrl(melody,'https://example.com/?art=terrain')).searchParams.get('art')).toBe('terrain');
  });
  it('handles empty, silent and maximum-length compositions within bounds',()=>{
    expect(buildTerrain(createMelody())).toEqual([]);
    const events=Array.from({length:512},(_,i)=>i%5?noteFromStep(i%36,{duration:32,dotted:true}):{type:'rest' as const,duration:1 as const,dotted:false});
    const segments=buildTerrain({...createMelody(),events});expect(segments).toHaveLength(512);
    for(const segment of segments){expect(segment.x).toBeGreaterThanOrEqual(44);expect(segment.x+segment.width).toBeLessThanOrEqual(556.001);expect(segment.width).toBeGreaterThan(0);if(segment.y!==null){expect(segment.y).toBeGreaterThan(100);expect(segment.y+176+22).toBeLessThan(520);}}
  });
});
