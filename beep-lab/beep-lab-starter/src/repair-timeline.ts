import { eventSeconds,type MusicEvent,type Melody } from './music-core/model';
export function rhythmTimeline(events:MusicEvent[],bpm:number){
  let totalBeats=0;
  const entries=events.map(event=>{const beats=4/event.duration*(event.dotted?1.5:1),start=totalBeats;totalBeats+=beats;return {start,beats,rest:event.type==='rest'};});
  return {entries,totalBeats,totalSeconds:events.reduce((sum,event)=>sum+eventSeconds(event,bpm),0)};
}
export function createRepairTimeline(element:HTMLElement){
  element.className='repair-timeline';element.hidden=true;
  element.innerHTML='<div class="repair-timeline-label"><span>每格 ＝ 1 個四分音符</span><span class="repair-time" aria-hidden="true"></span></div><div class="repair-timeline-viewport"><div class="repair-timeline-track" role="progressbar" aria-label="旋律播放進度" aria-valuemin="0"><div class="repair-playhead" aria-hidden="true"></div></div></div>';
  const track=element.querySelector<HTMLElement>('.repair-timeline-track')!,viewport=element.querySelector<HTMLElement>('.repair-timeline-viewport')!,time=element.querySelector<HTMLElement>('.repair-time')!,playhead=element.querySelector<HTMLElement>('.repair-playhead')!;
  let lastTenth=-1;
  return {
    prepare(melody:Melody){
      const layout=rhythmTimeline(melody.events,melody.tempoBpm);track.replaceChildren(playhead);track.style.width=`${Math.max(1,layout.totalBeats)*20}px`;track.style.backgroundSize=`${100/Math.max(1,layout.totalBeats)}% 100%`;
      for(let beat=0;beat<=layout.totalBeats;beat++){const tick=document.createElement('span');tick.className='repair-beat-tick';tick.textContent=String(beat);tick.style.left=`${beat/layout.totalBeats*100}%`;if(beat===0)tick.classList.add('first');if(beat===layout.totalBeats)tick.classList.add('last');tick.setAttribute('aria-hidden','true');track.append(tick);}
      layout.entries.forEach(entry=>{const block=document.createElement('span');block.className=`repair-time-note${entry.rest?' rest':''}`;block.style.left=`${entry.start/layout.totalBeats*100}%`;block.style.width=`${entry.beats/layout.totalBeats*100}%`;block.setAttribute('aria-hidden','true');track.append(block);});
      track.setAttribute('aria-valuemax',String(layout.totalSeconds));lastTenth=-1;viewport.scrollLeft=0;
    },
    update(seconds:number|null,total:number){
      if(seconds===null||total<=0){element.hidden=true;return;}
      element.hidden=false;const fraction=Math.max(0,Math.min(1,seconds/total));playhead.style.left=`${fraction*100}%`;
      const tenth=Math.floor(seconds*10);if(tenth!==lastTenth){lastTenth=tenth;track.setAttribute('aria-valuenow',String(seconds));time.textContent=`${seconds.toFixed(1)} / ${total.toFixed(1)} 秒`;}
      const x=fraction*track.clientWidth;if(x<viewport.scrollLeft||x>viewport.scrollLeft+viewport.clientWidth-12)viewport.scrollLeft=Math.max(0,x-viewport.clientWidth*.7);
    },
  };
}
