import { durations, formatEvent, type MusicEvent } from './music-core/model';
import { noteFromStep, noteStep, pitchSteps } from './music-core/studio';
import type { EditorState } from './music-core/editor';
export function createStudio(container: HTMLElement, actions: {
  select: (cursor: number) => void; update: (event: MusicEvent) => void;
  insert: (event: MusicEvent) => void; remove: () => void;
}) {
  container.innerHTML = `<p class="studio-help">點音符選取；點該欄其他位置調整音高。音塊越寬，時值越長；欄間留白方便點選。</p>
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
    if ((event.target as HTMLElement).closest('.roll-note')) return;
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
      current = state;
      const previousScroll = scroll.scrollLeft;
      roll.replaceChildren(); columns=[];
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
        roll.append(button); left+=width;
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
