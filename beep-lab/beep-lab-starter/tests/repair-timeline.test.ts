import {describe,it,expect} from 'vitest';
import {rhythmTimeline} from '../src/repair-timeline';
import {createMelody,type MusicEvent} from '../src/music-core/model';
import {certificatePraises,drawCertificatePraise} from '../src/certificate-praise';
const note:MusicEvent={type:'note',pitch:'c',octave:2,sharp:false,duration:4,dotted:false};
describe('quarter-note playback timeline',()=>{
  it('aligns notes, dotted durations and rests to cumulative quarter-note units',()=>{
    const layout=rhythmTimeline([note,{...note,duration:8,dotted:true},{type:'rest',duration:16,dotted:false},{...note,duration:2}],120);
    expect(layout.entries).toEqual([{start:0,beats:1,rest:false},{start:1,beats:.75,rest:false},{start:1.75,beats:.25,rest:true},{start:2,beats:2,rest:false}]);
    expect(layout.totalBeats).toBe(4);expect(layout.totalSeconds).toBe(2);
  });
  it('keeps grid spacing in musical units while tempo changes the duration',()=>{
    const events:MusicEvent[]=[note,{...note,duration:1}];const slow=rhythmTimeline(events,60),fast=rhythmTimeline(events,120);
    expect(slow.entries).toEqual(fast.entries);expect(slow.totalSeconds).toBe(2*fast.totalSeconds);
  });
  it('uses edited rhythm instead of the reference length',()=>{
    const source=createMelody();source.events=[note,note];const changed=[note,{...note,duration:2 as const}];
    expect(rhythmTimeline(source.events,120).totalBeats).toBe(2);expect(rhythmTimeline(changed,120).totalBeats).toBe(3);
  });
});
describe('certificate praise collection',()=>{
  it('provides at least thirty different certificate messages and excludes the previous draw',()=>{
    expect(new Set(certificatePraises).size).toBeGreaterThanOrEqual(30);
    for(const previous of certificatePraises)for(const sample of [0,.5,.999,1,-1,NaN]){const result=drawCertificatePraise(previous,()=>sample);expect(certificatePraises).toContain(result);expect(result).not.toBe(previous);}
  });
});
