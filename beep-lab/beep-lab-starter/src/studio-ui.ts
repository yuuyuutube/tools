import { durations, formatEvent, type MusicEvent } from './music-core/model';
import { noteFromStep, noteStep, pitchSteps, resizeRhythm } from './music-core/studio';
import type { EditorState } from './music-core/editor';
export function createStudio(container: HTMLElement, actions: {
  beginEdit: () => void;
  select: (cursor: number) => void; update: (event: MusicEvent) => void;
  append: (event: MusicEvent) => void; swap: (from: number, to: number) => void;
  insert: (event: MusicEvent) => void; remove: () => void;
}) {
  container.innerHTML = `<p class="studio-help">每格直線間距為四分音符。最後一欄點擊新增音符；底部固定列可加入休止。拖曳音塊交換位置，右側把手調整時值；Esc 取消。</p>
    <div class="roll-scroll" tabindex="0" aria-label="音高編輯區，可上下左右捲動"><div class="piano-roll"></div></div><div class="rest-viewport"><span class="rest-caption">休止</span><div class="rest-lane"></div></div>
    <div class="studio-fields"><label>音高<select id="studio-pitch"></select></label><label>時值<select id="studio-duration">${durations.map(d => `<option value="${d}">1/${d}</option>`).join('')}</select></label><label class="studio-dot"><input id="studio-dot" type="checkbox"/>附點</label></div>
    <div class="studio-actions"><button id="studio-add">新增音符</button><button id="studio-rest">新增休止</button><button id="studio-delete">刪除選取</button></div>`;
  const roll = container.querySelector<HTMLElement>('.piano-roll')!;
  const scroll = container.querySelector<HTMLElement>('.roll-scroll')!;
  const restLane = container.querySelector<HTMLElement>('.rest-lane')!;
  const nextColumn = document.createElement('div'); nextColumn.className='next-column';
  const nextCaption = document.createElement('span'); nextCaption.textContent='下一個音符'; nextColumn.append(nextCaption);
  const restGhost = document.createElement('div'); restGhost.className='rest-hover'; restGhost.hidden=true;
  const pitch = container.querySelector<HTMLSelectElement>('#studio-pitch')!;
  const duration = container.querySelector<HTMLSelectElement>('#studio-duration')!;
  const dot = container.querySelector<HTMLInputElement>('#studio-dot')!;
  pitch.innerHTML = '<option value="rest">休止符</option>' + Array.from({length:36},(_,step)=>`<option value="${step}">${pitchSteps[step%12].toUpperCase()}${Math.floor(step/12)+1}</option>`).join('');
  let current: EditorState;
  let columns: {left:number;width:number}[] = [];
  const rowHighlight = document.createElement('div'); rowHighlight.className='roll-row-hover'; rowHighlight.hidden=true;
  function highlightRow(row: number | null) {
    rowHighlight.hidden=row===null;
    if(row!==null)rowHighlight.style.top=`${row*24}px`;
    roll.querySelectorAll<HTMLElement>('.roll-pitch').forEach(label=>label.classList.toggle('hovered',Number(label.dataset.row)===row));
  }
  const ghost = document.createElement('div'); ghost.className = 'roll-hover'; ghost.hidden = true;
  const hint = document.createElement('span'); hint.className = 'roll-hover-hint'; ghost.append(hint);
  let drag: { pointerId: number; startX: number; startScroll: number; original: MusicEvent; next: MusicEvent; handle: HTMLButtonElement; label: HTMLElement; width: number; left: string } | undefined;
  let move: { pointerId:number; index:number; target:number; startX:number; startY:number; button:HTMLButtonElement; active:boolean } | undefined;
  function clearMove(commit:boolean) {
    const pending=move; if(!pending)return; move=undefined;
    pending.button.classList.remove('moving');
    container.querySelectorAll('.swap-target').forEach(node=>node.classList.remove('swap-target'));
    if(pending.button.hasPointerCapture(pending.pointerId))pending.button.releasePointerCapture(pending.pointerId);
    if(pending.active){suppressClickUntil=performance.now()+250;if(commit)actions.swap(pending.index,pending.target);}
  }
  function attachMove(button:HTMLButtonElement,index:number) {
    button.onpointerdown=event=>{
      if(event.button!==0||!event.isPrimary)return;
      button.setPointerCapture(event.pointerId);
      move={pointerId:event.pointerId,index,target:index,startX:event.clientX,startY:event.clientY,button,active:false};
    };
    button.onpointermove=event=>{
      if(!move||event.pointerId!==move.pointerId)return;
      const dx=event.clientX-move.startX,dy=event.clientY-move.startY;
      if(!move.active){if(Math.abs(dx)<6 || Math.abs(dx)<Math.abs(dy))return;actions.beginEdit();move.active=true;button.classList.add('moving');}
      ghost.hidden=true;restGhost.hidden=true;
      const x=event.clientX-roll.getBoundingClientRect().left-42;
      const target=columns.findIndex(col=>x>=col.left&&x<col.left+col.width);
      move.target=target>=0&&target<current.melody.events.length?target:move.index;
      container.querySelectorAll('.swap-target').forEach(node=>node.classList.remove('swap-target'));
      container.querySelector<HTMLElement>(`.roll-note[data-index="${move.target}"]`)?.classList.add('swap-target');
    };
    button.onpointerup=event=>{if(move?.pointerId===event.pointerId)clearMove(true);};
    button.onpointercancel=()=>clearMove(false);button.onlostpointercapture=()=>clearMove(false);
    button.onkeydown=event=>{
      if(event.altKey && ['ArrowLeft','ArrowRight'].includes(event.key)){
        event.preventDefault();event.stopPropagation();const target=index+(event.key==='ArrowLeft'?-1:1);actions.swap(index,target);container.querySelector<HTMLElement>(`.roll-note[data-index="${Math.max(0,Math.min(current.melody.events.length-1,target))}"]`)?.focus({preventScroll:true});
      }
    };
  }
  let suppressClickUntil = 0;
  function clearDrag(commit: boolean) {
    const pending = drag; if (!pending) return;
    drag = undefined; roll.classList.remove('resizing'); ghost.hidden = true;
    pending.label.style.width = `${Math.max(1,pending.width-2)}px`;
    pending.label.textContent = formatEvent(pending.original);
    pending.label.parentElement!.style.width = `${pending.width}px`;
    pending.handle.style.width = `${Math.min(24,pending.width)}px`;
    pending.handle.style.left = pending.left;
    pending.handle.title='拖曳調整時值；方向鍵縮短／延長';
    if (pending.handle.hasPointerCapture(pending.pointerId)) pending.handle.releasePointerCapture(pending.pointerId);
    suppressClickUntil = performance.now() + 250;
    if (commit) actions.update(pending.next);
  }
  roll.onpointermove = event => {
    if(move?.active){highlightRow(null);return;}
    if (drag) {
      highlightRow(null);
      if (event.pointerId !== drag.pointerId) return;
      const width = Math.max(1,drag.width + event.clientX-drag.startX + scroll.scrollLeft-drag.startScroll);
      drag.next = resizeRhythm(drag.original,width);
      const size = 320/drag.next.duration*(drag.next.dotted?1.5:1);
      drag.label.parentElement!.style.width = `${size}px`;
      drag.label.style.width = `${Math.max(1,size-2)}px`; drag.label.textContent = formatEvent(drag.next);
      drag.handle.style.left = `${parseFloat(drag.label.parentElement!.style.left)+size-Math.min(24,size)}px`;
      drag.handle.style.width=`${Math.min(24,size)}px`;
      drag.handle.title=`預覽 ${formatEvent(drag.next)}，放開套用`;
      return;
    }
    if(event.pointerType==='touch'){ghost.hidden=true;highlightRow(null);return;}
    const hovered=(event.target as HTMLElement).closest<HTMLElement>('.roll-note, .roll-resize');
    if(hovered){
      const eventIndex=hovered.classList.contains('roll-resize')?current.cursor-1:Number(hovered.dataset.index);
      const step=current.melody.events[eventIndex]?noteStep(current.melody.events[eventIndex]):null;
      highlightRow(step===null?null:35-step);ghost.hidden=true;return;
    }
    const rect=roll.getBoundingClientRect(); const x=event.clientX-rect.left-42;
    const index=columns.findIndex(c=>x>=c.left && x<c.left+c.width);
    const row=Math.floor((event.clientY-rect.top)/24);
    highlightRow(row>=0&&row<36?row:null);
    if(index<0 || row<0 || row>35){ghost.hidden=true;return;}
    ghost.hidden=false; ghost.style.left=`${42+columns[index].left}px`; ghost.style.top=`${row*24}px`; ghost.style.width=`${columns[index].width-4}px`;
    hint.style.bottom=row===0?'auto':'25px'; hint.style.top=row===0?'25px':'auto';
    hint.textContent=row===36?'休止符':`${pitchSteps[(35-row)%12].toUpperCase()}${Math.floor((35-row)/12)+1}`;
  };
  roll.onpointerleave = () => { if(!drag) ghost.hidden=true; highlightRow(null); };
  scroll.addEventListener('scroll',()=>{highlightRow(null);restLane.parentElement!.classList.remove('is-hovered');ghost.hidden=true;restGhost.hidden=true;restLane.style.transform=`translateX(${-scroll.scrollLeft}px)`;nextCaption.style.top=`${scroll.scrollTop+4}px`;});
  window.addEventListener('blur',()=>{clearDrag(false);clearMove(false);});
  document.addEventListener('visibilitychange',()=>{if(document.hidden){clearDrag(false);clearMove(false);}});
  document.addEventListener('keydown',event=>{if(event.key==='Escape' && (drag||move)){event.preventDefault();clearDrag(false);clearMove(false);}});
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
    if (index < 0 || row < 0 || row > 35) return;
    const original = current.melody.events[index];
    if(!original){actions.append(noteFromStep(35-row,{duration:4,dotted:false}));return;}
    actions.select(index+1);
    actions.update(noteFromStep(35-row,original));
  };
  restLane.onpointermove=event=>{
    restLane.parentElement!.classList.toggle('is-hovered',event.pointerType!=='touch'&&!drag&&!move?.active);
    if(drag){roll.onpointermove?.call(roll,event);return;}
    if(event.pointerType==='touch'||drag||move?.active||(event.target as HTMLElement).closest('.roll-note,.roll-resize,.rest-next')){restGhost.hidden=true;return;}
    const x=event.clientX-restLane.getBoundingClientRect().left-42;
    const index=columns.findIndex(col=>x>=col.left&&x<col.left+col.width);
    restGhost.hidden=index<0;
    if(index>=0){restGhost.style.left=`${42+columns[index].left}px`;restGhost.style.width=`${columns[index].width-4}px`;}
  };
  restLane.onpointerleave=()=>{restGhost.hidden=true;restLane.parentElement!.classList.remove('is-hovered');};
  restLane.onclick=event=>{
    if(performance.now()<suppressClickUntil||(event.target as HTMLElement).closest('.roll-note,.roll-resize,.rest-next'))return;
    const x=event.clientX-restLane.getBoundingClientRect().left-42;
    const index=columns.findIndex(col=>x>=col.left&&x<col.left+col.width);
    if(index<0)return;
    const original=current.melody.events[index];
    if(!original)return;
    actions.select(index+1);actions.update({type:'rest',duration:original.duration,dotted:original.dotted});
  };
  return {
    render(state: EditorState) {
      clearDrag(false); clearMove(false);
      current = state;
      const previousScroll = scroll.scrollLeft;
      restLane.replaceChildren(restGhost); restGhost.hidden=true;
      roll.replaceChildren(rowHighlight,ghost,nextColumn); highlightRow(null); ghost.hidden=true; columns=[];
      for(let row=0;row<36;row++) {
        const label=document.createElement('span'); label.className='roll-pitch'; label.dataset.row=String(row); label.style.top=`${row*24}px`;
        label.textContent=row===36?'休止':`${pitchSteps[(35-row)%12].toUpperCase()}${Math.floor((35-row)/12)+1}`;
        roll.append(label);
      }
      let left=0;
      state.melody.events.forEach((event,index)=>{
        const width=320/event.duration*(event.dotted?1.5:1);
        columns.push({left,width});
        const step=noteStep(event);
        const button=document.createElement('button'); button.className='roll-note';
        button.dataset.index=String(index); button.classList.toggle('selected',index===state.cursor-1);
        button.style.left=`${42+left}px`; button.style.top=step===null?'4px':`${(35-step)*24-10}px`;
        button.style.width=`${width}px`;
        const label=document.createElement('span'); label.className='roll-note-label'; label.textContent=formatEvent(event); label.style.width=`${Math.max(1,width-2)}px`; button.append(label); button.setAttribute('aria-label',`選取第 ${index+1} 音 ${formatEvent(event)}`);
        button.setAttribute('aria-pressed',String(index===state.cursor-1));
        button.onclick=()=>{if(performance.now()>=suppressClickUntil)actions.select(index+1);};
        attachMove(button,index);
        const lane=step===null?restLane:roll;
        lane.append(button);
        if(index===state.cursor-1) {
          const handle=document.createElement('button'); handle.className='roll-resize';
          const barWidth=320/event.duration*(event.dotted?1.5:1);
          handle.style.left=`${42+left+barWidth-Math.min(24,barWidth)}px`; handle.style.top=`${parseFloat(button.style.top)+24}px`; handle.style.width=`${Math.min(24,barWidth)}px`;
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
            container.querySelector<HTMLButtonElement>('.roll-resize')?.focus({preventScroll:true});
          };
          lane.append(handle);
        }
        left+=width;
      });
      columns.push({left,width:112});
      nextColumn.style.left=`${42+left}px`;nextColumn.style.width='112px';nextCaption.style.top=`${scroll.scrollTop+4}px`;
      const totalWidth=`${Math.max(300,left+176)}px`;
      roll.style.width=restLane.style.width=totalWidth;
      restLane.style.transform=`translateX(${-previousScroll}px)`;
      const addRest=document.createElement('button');addRest.className='rest-next';addRest.textContent='新增休止';addRest.setAttribute('aria-label','在下一音欄新增休止');
      addRest.style.left=`${42+left}px`;addRest.onclick=event=>{event.stopPropagation();actions.append({type:'rest',duration:4,dotted:false});};restLane.append(addRest);
      const event=selected(); const step=event?noteStep(event):null;
      pitch.disabled=duration.disabled=dot.disabled=!event;
      container.querySelector<HTMLButtonElement>('#studio-delete')!.disabled=!event;
      pitch.value=step===null?'rest':String(step); duration.value=String(event?.duration??4); dot.checked=event?.dotted??false;
      scroll.scrollLeft=previousScroll;
    },
    reveal() {
      const index=current.cursor-1, event=selected(); if(!event) {scroll.scrollTop=400;return;}
      const row=noteStep(event); if(row!==null)scroll.scrollTop=Math.max(0,(35-row)*24-scroll.clientHeight/2);
      const col=columns[index];
      if(col && index===current.melody.events.length-1 && col.width<=scroll.clientWidth-42)scroll.scrollLeft=Math.max(0,col.left+col.width+170-scroll.clientWidth);
      else if(col && (col.left<scroll.scrollLeft || col.left+col.width>scroll.scrollLeft+scroll.clientWidth-42))scroll.scrollLeft=col.left;
    },
    position(index: number|null) {
      container.querySelectorAll('.sounding').forEach(e=>e.classList.remove('sounding'));
      if(index!==null) {
        const node=container.querySelector<HTMLElement>(`[data-index="${index}"]`); if(!node)return;
        node.classList.add('sounding'); if(node.parentElement===roll)scroll.scrollTop=Math.max(0,node.offsetTop-scroll.clientHeight/2);
        if(node.offsetLeft<scroll.scrollLeft+42 || node.offsetLeft+node.offsetWidth>scroll.scrollLeft+scroll.clientWidth) scroll.scrollLeft=Math.max(0,node.offsetLeft-42);
      }
    },
  };
}
