import {describe,it,expect} from 'vitest';
import {createMelody} from '../src/music-core/model';
import {noteFromStep} from '../src/music-core/studio';
import {buildWindows} from '../src/window-art';
import {shareUrl} from '../src/music-core/share';
describe('sound windows',()=>{
  it('uses duration for glass division, pitch for color and rests for clear panes',()=>{
    const melody={...createMelody(),events:[noteFromStep(0,{duration:4,dotted:false}),{type:'rest' as const,duration:8 as const,dotted:false},noteFromStep(23,{duration:8,dotted:true})]};
    const windows=buildWindows(melody);expect(windows).toHaveLength(1);const panes=windows[0].panes;
    expect(panes[0].height/panes[2].height).toBeCloseTo(4/3);expect(panes[1].rest).toBe(true);expect(panes[2].dotted).toBe(true);expect(panes[0].color).not.toBe(panes[2].color);
    expect(buildWindows({...melody,title:'new',id:'new'})).toEqual(windows);
    expect(new URL(shareUrl(melody,'https://example.com/?art=windows')).searchParams.get('art')).toBe('windows');
  });
  it('includes every event once with contiguous panes inside each window',()=>{
    for(const count of [1,6,7,12,13,17,512]){
      const melody={...createMelody(),events:Array.from({length:count},(_,i)=>noteFromStep(i%36,{duration:i%2?32:1,dotted:!!(i%3)}))};
      const windows=buildWindows(melody),panes=windows.flatMap(w=>w.panes);expect(panes).toHaveLength(count);expect(new Set(panes.map(p=>p.index)).size).toBe(count);
      for(const window of windows){expect(window.x).toBeGreaterThanOrEqual(76);expect(window.x+window.width).toBeLessThanOrEqual(524.001);expect(window.panes.reduce((sum,p)=>sum+p.height,0)).toBeCloseTo(window.height);for(const pane of window.panes){expect(pane.height).toBeGreaterThan(0);expect(pane.y+pane.height).toBeLessThanOrEqual(520.001);}}
    }
    expect(buildWindows(createMelody())).toEqual([]);
  });
});
