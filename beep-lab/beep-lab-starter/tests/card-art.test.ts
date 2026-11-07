import { describe,it,expect } from 'vitest';
import { createMelody } from '../src/music-core/model';
import { noteFromStep } from '../src/music-core/studio';
import { buildWeave } from '../src/card-art';
const sample=()=>({...createMelody(),events:[noteFromStep(12,{duration:4,dotted:false}),{type:'rest' as const,duration:8 as const,dotted:false},noteFromStep(23,{duration:8,dotted:true})]});
describe('melody weave',()=>{
  it('uses musical content only, independent of title, identity and timestamps',()=>{
    const melody=sample();
    const reordered={...melody,events:melody.events.map(event=>Object.fromEntries(Object.entries(event).reverse()))} as typeof melody;
    expect(buildWeave(reordered)).toEqual(buildWeave(melody));
    expect(buildWeave(melody)).toEqual(buildWeave({...melody,id:'new',title:'another',createdAt:'2020',updatedAt:'2021'}));
  });
  it('maps rhythms proportionally and leaves rests empty in all six bands',()=>{
    const art=buildWeave(sample());expect(art.tiles).toHaveLength(12);expect(art.tiles.some(tile=>tile.index===1)).toBe(false);
    expect(art.tiles[0].width/art.tiles[1].width).toBeCloseTo(4/3,1);
  });
  it('responds to pitch, rhythm and tempo changes',()=>{
    const melody=sample();const original=buildWeave(melody);
    expect(buildWeave({...melody,events:[noteFromStep(3,{duration:4,dotted:false})]})).not.toEqual(original);
    expect(buildWeave({...melody,tempoBpm:240}).spacing).not.toBe(original.spacing);
    expect(buildWeave({...melody,events:[noteFromStep(12,{duration:2,dotted:false}),...melody.events.slice(1)]}).tiles).not.toEqual(original.tiles);
  });
  it('keeps maximum-length compositions and single notes inside the artwork',()=>{
    for(const events of [[noteFromStep(0,{duration:1,dotted:false})],Array.from({length:512},(_,i)=>noteFromStep(i%36,{duration:32,dotted:!!(i%2)}))]) {
      const art=buildWeave({...createMelody(),events});expect(art.tiles.length).toBeLessThanOrEqual(3072);
      for(const tile of art.tiles){expect(tile.x).toBeGreaterThanOrEqual(47.99);expect(tile.x+tile.width).toBeLessThanOrEqual(552.01);expect(tile.y).toBeGreaterThan(40);expect(tile.y+tile.height).toBeLessThan(558);}
    }
  });
  it('handles silence and empty input without invalid coordinates',()=>{
    expect(buildWeave({...createMelody(),events:[{type:'rest',duration:4,dotted:false}]}).tiles).toEqual([]);
    expect(buildWeave(createMelody()).tiles).toEqual([]);
  });
});

import {buildStars,resolveArtStyle} from '../src/card-art';
describe('sound constellation',()=>{
  it('uses cumulative duration, pitch height and duration size, leaving gaps at rests',()=>{
    const melody=sample();const points=buildStars(melody);
    expect(points).toHaveLength(2);expect(points[1].connected).toBe(false);expect(points[1].x).toBeGreaterThan(points[0].x);expect(points[1].y).toBeLessThan(points[0].y);expect(points[0].radius).toBeGreaterThan(points[1].radius);
    expect(buildStars({...melody,title:'new'})).toEqual(points);
  });
  it('resolves explicit styles, safe defaults and all six random outcomes',()=>{
    expect(resolveArtStyle('stars')).toBe('stars');expect(resolveArtStyle('unknown')).toBe('weave');expect(resolveArtStyle('random',()=>.1)).toBe('weave');expect(resolveArtStyle('random',()=>.3)).toBe('stars');expect(resolveArtStyle('random',()=>.4)).toBe('rhythm');expect(resolveArtStyle('random',()=>.6)).toBe('terrain');expect(resolveArtStyle('random',()=>.75)).toBe('letterpress');expect(resolveArtStyle('random',()=>.95)).toBe('specimen');
  });
});

import {buildRhythm} from '../src/card-art';
describe('rhythm composition',()=>{
  it('maps note height and rhythm width, leaving rests blank',()=>{
    const blocks=buildRhythm(sample());expect(blocks).toHaveLength(2);expect(blocks[0].index).toBe(0);expect(blocks[1].index).toBe(2);
    expect(blocks[1].height).toBeGreaterThan(blocks[0].height);expect(blocks[0].width).toBeGreaterThan(blocks[1].width);expect(blocks[1].dotted).toBe(true);
  });
  it('is deterministic and keeps dense or extreme rhythms bounded',()=>{
    const melody={...sample(),events:Array.from({length:512},(_,i)=>noteFromStep(i%36,{duration:i===511?32:1,dotted:false}))};
    const blocks=buildRhythm(melody);expect(buildRhythm({...melody,title:'new'})).toEqual(blocks);
    for(const block of blocks){expect(block.width).toBeGreaterThan(0);expect(block.x+block.width).toBeLessThanOrEqual(544.001);expect(block.y).toBeGreaterThanOrEqual(118);expect(block.y+block.height).toBe(468);}
    expect(buildRhythm({...sample(),events:[{type:'rest',duration:4,dotted:false}]})).toEqual([]);
  });
});
