import {describe,it,expect} from 'vitest';
import {firstRepairLevel,repairLevels,compareRepair} from '../src/music-core/archaeology';
import {noteFromStep} from '../src/music-core/studio';
import {isMelody} from '../src/music-core/model';
import {LAB_PAGES} from '../src/navigation';
describe('first ringtone repair level',()=>{
  it('starts with exactly one damaged pitch and an otherwise valid original melody',()=>{
    const {target,damaged,hints}=firstRepairLevel();expect(isMelody(target)).toBe(true);expect(isMelody(damaged)).toBe(true);expect(target.events).toHaveLength(13);
    expect(compareRepair(target,damaged)).toMatchObject({passed:false,pitchErrors:[2],rhythmErrors:[],countMismatch:false,tempoMismatch:false});expect(hints).toHaveLength(3);
  });
  it('passes only when the musical content is repaired, independent of local identity',()=>{
    const {target,damaged}=firstRepairLevel();damaged.events[2]=noteFromStep(6,damaged.events[2]);
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

describe('classic repair levels',()=>{
  it('ships the intended melodies, with independent, precisely scoped damage',()=>{
    const levels=repairLevels();expect(levels.map(value=>value.id)).toEqual(['nokia','ode-to-joy','fate','fur-elise','alla-turca','nachtmusik']);
    expect(levels.map(value=>compareRepair(value.target,value.damaged).pitchErrors)).toEqual([[2],[4,10],[],[1,3],[2],[0,10]]);
    expect(levels.map(value=>compareRepair(value.target,value.damaged).rhythmErrors)).toEqual([[],[],[0,4],[],[6],[]]);
    for(const value of levels){expect(isMelody(value.target)).toBe(true);expect(isMelody(value.damaged)).toBe(true);expect(compareRepair(value.target,structuredClone(value.target)).passed).toBe(true);expect(value.hints).toHaveLength(3);}
  });
  it('retains the fifth symphony opening rest, short-short-short and sustained ending',()=>{
    const fifth=repairLevels()[2].target.events;expect(fifth[0]).toEqual({type:'rest',duration:8,dotted:false});
    expect(fifth.slice(1,4).map(value=>value.duration)).toEqual([8,8,8]);expect(fifth[4].duration).toBe(2);expect(fifth.at(-1)).toMatchObject({duration:1,dotted:false});
  });
});

it('requires both corrections for the mixed Turkish March challenge',()=>{
  const value=repairLevels()[4];const candidate=structuredClone(value.damaged);candidate.events[2]=structuredClone(value.target.events[2]);
  expect(compareRepair(value.target,candidate)).toMatchObject({passed:false,pitchErrors:[],rhythmErrors:[6]});
  candidate.events[6]=structuredClone(value.target.events[6]);expect(compareRepair(value.target,candidate).passed).toBe(true);
});
it('changes only the intended octaves in Eine kleine Nachtmusik',()=>{
  const value=repairLevels()[5];for(const index of [0,10]){
    expect(value.target.events[index]).toMatchObject({duration:4,sharp:false});
    const correct=value.target.events[index],wrong=value.damaged.events[index];
    if(correct.type==='note'&&wrong.type==='note'){expect(correct.pitch).toBe(wrong.pitch);expect(correct.octave-wrong.octave).toBe(1);}else throw new Error('Expected notes');
  }
});
