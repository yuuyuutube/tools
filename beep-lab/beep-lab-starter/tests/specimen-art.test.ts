import {describe,it,expect} from 'vitest';
import {createMelody} from '../src/music-core/model';
import {noteFromStep} from '../src/music-core/studio';
import {buildSpecimen} from '../src/specimen-art';
import {shareUrl} from '../src/music-core/share';
describe('botanical specimens',()=>{
  it('splits phrases at rests, preserves note identity and uses rhythm and pitch in leaves',()=>{
    const melody={...createMelody(),events:[noteFromStep(0,{duration:4,dotted:false}),{type:'rest' as const,duration:8 as const,dotted:false},noteFromStep(23,{duration:2,dotted:true})]};
    const sprigs=buildSpecimen(melody);expect(sprigs).toHaveLength(2);
    expect(sprigs.flatMap(s=>s.leaves).map(l=>l.index)).toEqual([0,2]);expect(sprigs[1].leaves[0].length).toBeGreaterThan(sprigs[0].leaves[0].length);expect(sprigs[1].leaves[0].dotted).toBe(true);
    expect(buildSpecimen({...melody,id:'new',title:'new'})).toEqual(sprigs);
    expect(new URL(shareUrl(melody,'https://example.com/?art=specimen')).searchParams.get('art')).toBe('specimen');
  });
  it('keeps dense compositions bounded and includes each note exactly once',()=>{
    const events=Array.from({length:512},(_,i)=>noteFromStep(i%36,{duration:32,dotted:!!(i%2)}));
    const sprigs=buildSpecimen({...createMelody(),events});const leaves=sprigs.flatMap(s=>s.leaves);expect(leaves).toHaveLength(512);expect(new Set(leaves.map(l=>l.index)).size).toBe(512);
    for(const leaf of leaves){expect(Number.isFinite(leaf.x+leaf.y+leaf.scale)).toBe(true);expect(leaf.x).toBeGreaterThan(44);expect(leaf.x).toBeLessThan(556);expect(leaf.y).toBeGreaterThan(40);expect(leaf.y).toBeLessThan(556);}
    expect(buildSpecimen(createMelody())).toEqual([]);expect(buildSpecimen({...createMelody(),events:[{type:'rest',duration:4,dotted:false}]})).toEqual([]);
  });
});
