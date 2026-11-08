import {describe,it,expect} from 'vitest';
import {firstRepairLevel,compareRepair} from '../src/music-core/archaeology';
import {noteFromStep} from '../src/music-core/studio';
import {isMelody} from '../src/music-core/model';
import {LAB_PAGES} from '../src/navigation';
describe('first ringtone repair level',()=>{
  it('starts with exactly one damaged pitch and an otherwise valid original melody',()=>{
    const {target,damaged,hints}=firstRepairLevel();expect(isMelody(target)).toBe(true);expect(isMelody(damaged)).toBe(true);expect(target.events).toHaveLength(8);
    expect(compareRepair(target,damaged)).toMatchObject({passed:false,pitchErrors:[2],rhythmErrors:[],countMismatch:false,tempoMismatch:false});expect(hints).toHaveLength(3);
  });
  it('passes only when the musical content is repaired, independent of local identity',()=>{
    const {target,damaged}=firstRepairLevel();damaged.events[2]=noteFromStep(19,damaged.events[2]);
    expect(compareRepair(target,{...damaged,id:'my-copy',title:'my title'}).passed).toBe(true);
    damaged.events[0].dotted=true;expect(compareRepair(target,damaged)).toMatchObject({passed:false,rhythmErrors:[0]});
  });
  it('reports rests, octave, durations, extra/missing events and tempo mismatches',()=>{
    const {target}=firstRepairLevel();const copy=structuredClone(target);copy.events[4]=noteFromStep(0,copy.events[4]);copy.events[0]=noteFromStep(0,copy.events[0]);copy.events[1].duration=1;
    expect(compareRepair(target,copy)).toMatchObject({passed:false,pitchErrors:[0,4],rhythmErrors:[1]});
    expect(compareRepair(target,{...target,events:target.events.slice(1)}).countMismatch).toBe(true);
    expect(compareRepair(target,{...target,events:[...target.events,target.events[0]]}).countMismatch).toBe(true);
    expect(compareRepair(target,{...target,tempoBpm:120})).toMatchObject({passed:false,tempoMismatch:true});
  });
  it('provides fresh copies, so editing a repair never mutates the target or next playthrough',()=>{
    const level=firstRepairLevel(),original=structuredClone(level.target);level.damaged.events[0].dotted=true;
    expect(level.target).toEqual(original);expect(firstRepairLevel().damaged.events[0].dotted).toBe(false);
    expect(()=>compareRepair(level.target,{...level.damaged,tempoBpm:0})).toThrow('無效');
  });
});
describe('cross-page navigation',()=>{
  it('connects every page to all four tools with paths valid in the deployment subdirectory',()=>{
    expect(LAB_PAGES.map(page=>page.id)).toEqual(['composer','card','box','archaeology']);
    for(const source of LAB_PAGES)for(const destination of LAB_PAGES){
      const base=new URL(source.href,'https://yuuyuutube.github.io/tools/beep-lab/');const url=new URL(destination.href,base);
      expect(url.pathname).toBe('/tools/beep-lab/');expect(url.hash).toBe('');
      expect(url.searchParams.get('view')).toBe(destination.id==='composer'?null:destination.id);
    }
    const card=new URL(LAB_PAGES.find(page=>page.id==='card')!.href,'https://example.com/tools/beep-lab/');expect(card.searchParams.get('demo')).toBe('birthday');
  });
});
