import { durations, formatEvent, type MusicEvent } from './music-core/model';
import { noteFromStep, noteStep, pitchSteps, resizeRhythm } from './music-core/studio';
import type { EditorState } from './music-core/editor';
export function createStudio(container: HTMLElement, actions: {
  beginEdit: () => void;
  select: (cursor: number) => void; update: (event: MusicEvent) => void;
  insert: (event: MusicEvent) => void; remove: () => void;
}) {
  container.innerHTML = `<p class="studio-help">點音符選取；虛線框預覽點擊後的音高。拖曳選取音右側把手調整時值，放開套用；Esc 取消。</p>
    <div class="roll-scroll" tabindex="0" aria-label="音高編輯區，可上下左右捲動"><div class="piano-roll"></div></div>
    <div class="studio-fields"><label>音高<select id="studio-pitch"></select></label><label>時值<select id="studio-duration">${durations.map(d => `<option value="${d}">1/${d}</option>`).join('')}</select></label><label class="studio-dot"><input id="studio-dot" type="checkbox"/>附點</label></div>
    <div class="studio-actions"><button id="studio-add">新增音符</button><button id="studio-rest">新增休止</button><button id="studio-delete">刪除選取</button></div>`;
  const roll = container.querySelector<HTMLElement>('.piano-roll')!;
  const scroll = container.querySelector<HTMLElement>('.roll-scroll')!;
  const pitch = container.querySelector<HTMLSelectElement>('#studio-pitch')!;
  const duration = container.querySelector<HTMLSelectElement>('#studio-duration')!;
  const dot = container.querySelector<HTMLInputElement>('#studio-dot')!;
  pitch.innerHTML = '<option value="rest">休止符</option>' + Array.from({length:36},(_,step)=>`<option value="${step}">${pitchSteps[step%12].toUpperCase()}${Math.floor(step/12)+1}</option>`).join('');
  let current: EditorState;
  let columns: {left:number;width:number}[] = [];
  const ghost = document.createElement('div'); ghost.className = 'roll-hover'; ghost.hidden = true;
  const hint = document.createElement('span'); hint.className = 'roll-hover-hint'; ghost.append(hint);
  let drag: { pointerId: number; startX: number; startScroll: number; original: MusicEvent; next: MusicEvent; handle: HTMLButtonElement; label: HTMLElement; width: number; left: string } | undefined;
  let suppressClickUntil = 0;
  function clearDrag(commit: boolean) {
    const pending = drag; if (!pending) return;
    drag = undefined; roll.classList.remove('resizing'); ghost.hidden = true;
    pending.label.style.width = `${Math.max(8,pending.width-4)}px`;
    pending.label.textContent = formatEvent(pending.original);
    pending.handle.style.left = pending.left;
    pending.handle.title='拖曳調整時值；方向鍵縮短／延長';
    if (pending.handle.hasPointerCapture(pending.pointerId)) pending.handle.releasePointerCapture(pending.pointerId);
    suppressClickUntil = performance.now() + 250;
    if (commit) actions.update(pending.next);
  }
  roll.onpointermove = event => {
    if (drag) {
      if (event.pointerId !== drag.pointerId) return;
      const width = Math.max(1,drag.width + event.clientX-drag.startX + scroll.scrollLeft-drag.startScroll);
      drag.next = resizeRhythm(drag.original,width);
      const size = 320/drag.next.duration*(drag.next.dotted?1.5:1);
      drag.label.style.width = `${Math.max(8,size-4)}px`; drag.label.textContent = formatEvent(drag.next);
      drag.handle.style.left = `${parseFloat(drag.label.parentElement!.style.left)+Math.max(8,size-4)-10}px`;
      drag.handle.title=`預覽 ${formatEvent(drag.next)}，放開套用`;
      return;
    }
    if (event.pointerType === 'touch' || (event.target as HTMLElement).closest('.roll-note, .roll-resize')) { ghost.hidden=true; return; }
    const rect=roll.getBoundingClientRect(); const x=event.clientX-rect.left-42;
    const index=columns.findIndex(c=>x>=c.left && x<c.left+c.width);
    const row=Math.floor((event.clientY-rect.top)/24);
    if(index<0 || row<0 || row>36){ghost.hidden=true;return;}
    ghost.hidden=false; ghost.style.left=`${42+columns[index].left}px`; ghost.style.top=`${row*24}px`; ghost.style.width=`${columns[index].width-4}px`;
    hint.style.bottom=row===0?'auto':'25px'; hint.style.top=row===0?'25px':'auto';
    hint.textContent=row===36?'休止符':`${pitchSteps[(35-row)%12].toUpperCase()}${Math.floor((35-row)/12)+1}`;
  };
  roll.onpointerleave = () => { if(!drag) ghost.hidden=true; };
  scroll.addEventListener('scroll',()=>{ghost.hidden=true;});
  window.addEventListener('blur',()=>clearDrag(false));
  document.addEventListener('visibilitychange',()=>{if(document.hidden)clearDrag(false);});
  document.addEventListener('keydown',event=>{if(event.key==='Escape' && drag){event.preventDefault();clearDrag(false);}});
  function selected() { return current.melody.events[current.cursor - 1]; }
  function fieldEvent(): MusicEvent {
    const rhythm = { duration: Number(duration.value) as MusicEvent['duration'], dotted: dot.checked };
    return pitch.value === 'rest' ? { type:'rest', ...rhythm } : noteFromStep(Number(pitch.value), rhythm);
  }
  pitch.onchange = duration.onchange = dot.onchange = () => { if (selected()) actions.update(fieldEvent()); };
  container.querySelector<HTMLButtonElement>('#studio-add')!.onclick = () => actions.insert(noteFromStep(noteStep(selected() ?? {type:'rest',duration:4,dotted:false}) ?? 12, {duration:4,dotted:false}));
  container.querySelector<HTMLButtonElement>('#studio-rest')!.onclick = () => actions.insert({type:'rest',duration:4,dotted:false});
  container.querySelector<HTMLButtonElement>('#studio-delete')!.onclick = () => actions.remove();
  roll.onclick = event => {
    if (performance.now()<suppressClickUntil || (event.target as HTMLElement).closest('.roll-note, .roll-resize')) return;
    const rect = roll.getBoundingClientRect();
    const x = event.clientX - rect.left - 42;
    const index = columns.findIndex(c => x >= c.left && x < c.left+c.width);
    const row = Math.floor((event.clientY - rect.top)/24);
    if (index < 0 || row < 0 || row > 36) return;
    const original = current.melody.events[index];
    actions.select(index+1);
    actions.update(row === 36 ? {type:'rest',duration:original.duration,dotted:original.dotted} : noteFromStep(35-row,original));
  };
  return {
    render(state: EditorState) {
      clearDrag(false);
      current = state;
      const previousScroll = scroll.scrollLeft;
      roll.replaceChildren(ghost); ghost.hidden=true; columns=[];
      for(let row=0;row<37;row++) {
        const label=document.createElement('span'); label.className='roll-pitch'; label.style.top=`${row*24}px`;
        label.textContent=row===36?'休止':`${pitchSteps[(35-row)%12].toUpperCase()}${Math.floor((35-row)/12)+1}`;
        roll.append(label);
      }
      let left=0;
      state.melody.events.forEach((event,index)=>{
        const width=Math.max(56, 80*4/event.duration*(event.dotted?1.5:1));
        columns.push({left,width});
        const step=noteStep(event);
        const button=document.createElement('button'); button.className='roll-note';
        button.dataset.index=String(index); button.classList.toggle('selected',index===state.cursor-1);
        button.style.left=`${42+left}px`; button.style.top=`${(step===null?36:35-step)*24-10}px`;
        button.style.width=`${Math.max(20,width-6)}px`;
        const label=document.createElement('span'); label.className='roll-note-label'; label.textContent=formatEvent(event); label.style.width=`${Math.max(8,80*4/event.duration*(event.dotted?1.5:1)-4)}px`; button.append(label); button.setAttribute('aria-label',`選取第 ${index+1} 音 ${formatEvent(event)}`);
        button.setAttribute('aria-pressed',String(index===state.cursor-1));
        button.onclick=()=>actions.select(index+1);
        roll.append(button);
        if(index===state.cursor-1) {
          const handle=document.createElement('button'); handle.className='roll-resize';
          const barWidth=320/event.duration*(event.dotted?1.5:1);
          handle.style.left=`${42+left+Math.max(8,barWidth-4)-10}px`; handle.style.top=button.style.top;
          handle.setAttribute('aria-label',`拖曳調整第 ${index+1} 音時值，方向鍵亦可調整`);
          handle.title='拖曳調整時值；方向鍵縮短／延長';
          handle.innerHTML='<svg width="12" height="20" viewBox="0 0 12 20" aria-hidden="true"><path d="M4 5v10m4-10v10" fill="none" stroke="currentColor" stroke-width="1.5"/></svg>';
          handle.onpointerdown=pointer=>{
            if(pointer.button!==0 || !pointer.isPrimary)return;
            pointer.preventDefault();pointer.stopPropagation();actions.beginEdit();
            handle.setPointerCapture(pointer.pointerId); ghost.hidden=true; roll.classList.add('resizing');
            drag={pointerId:pointer.pointerId,startX:pointer.clientX,startScroll:scroll.scrollLeft,original:{...event},next:{...event},handle,label,width:barWidth,left:handle.style.left};
          };
          handle.onpointerup=pointer=>{if(drag?.pointerId===pointer.pointerId){pointer.preventDefault();clearDrag(true);}};
          handle.onpointercancel=()=>clearDrag(false);handle.onlostpointercapture=()=>clearDrag(false);
          handle.onclick=click=>{click.preventDefault();click.stopPropagation();};
          handle.onkeydown=key=>{
            if(!['ArrowLeft','ArrowRight','Home','End'].includes(key.key))return;
            key.preventDefault();key.stopPropagation();
            const values=[1,2,4,8,16,32] as const;const at=values.indexOf(event.duration);
            const next=key.key==='Home'?32:key.key==='End'?1:values[Math.max(0,Math.min(5,at+(key.key==='ArrowLeft'?1:-1)))];
            actions.update({...event,duration:next});
            roll.querySelector<HTMLButtonElement>('.roll-resize')?.focus({preventScroll:true});
          };
          roll.append(handle);
        }
        left+=width;
      });
      roll.style.width=`${Math.max(300,left+48)}px`;
      const event=selected(); const step=event?noteStep(event):null;
      pitch.disabled=duration.disabled=dot.disabled=!event;
      container.querySelector<HTMLButtonElement>('#studio-delete')!.disabled=!event;
      pitch.value=step===null?'rest':String(step); duration.value=String(event?.duration??4); dot.checked=event?.dotted??false;
      scroll.scrollLeft=previousScroll;
    },
    reveal() {
      const index=current.cursor-1, event=selected(); if(!event) {scroll.scrollTop=400;return;}
      const row=noteStep(event); scroll.scrollTop=Math.max(0,(row===null?36:35-row)*24-scroll.clientHeight/2);
      const col=columns[index]; if(col && (col.left<scroll.scrollLeft || col.left+col.width>scroll.scrollLeft+scroll.clientWidth-42)) scroll.scrollLeft=col.left;
    },
    position(index: number|null) {
      roll.querySelectorAll('.sounding').forEach(e=>e.classList.remove('sounding'));
      if(index!==null) {
        const node=roll.querySelector<HTMLElement>(`[data-index="${index}"]`); if(!node)return;
        node.classList.add('sounding'); scroll.scrollTop=Math.max(0,node.offsetTop-scroll.clientHeight/2);
        if(node.offsetLeft<scroll.scrollLeft+42 || node.offsetLeft+node.offsetWidth>scroll.scrollLeft+scroll.clientWidth) scroll.scrollLeft=Math.max(0,node.offsetLeft-42);
      }
    },
  };
}
