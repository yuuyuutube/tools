import { describe, it, expect } from 'vitest';
import { createMelody, parseMelody, serializeMelody } from '../src/music-core/model';
import { edit, type EditorState } from '../src/music-core/editor';
import { EditHistory } from '../src/music-core/history';
import { appendStudioEvent, noteFromStep, noteStep, updateSelected } from '../src/music-core/studio';
const initial = (): EditorState => ({melody:createMelody(),cursor:0,octave:2});
describe('shared Studio editing',()=>{
  it('changes pitch and rhythm of the selected event without inserting or modifying other events',()=>{
    const start=edit(edit(initial(),'1').state,'2').state;
    const next=updateSelected(start,noteFromStep(30,{duration:8,dotted:true})).state;
    expect(next.melody.events).toHaveLength(2);
    expect(next.melody.events[0]).toEqual(start.melody.events[0]);
    expect(next.melody.events[1]).toMatchObject({pitch:'f',sharp:true,octave:3,duration:8,dotted:true});
    expect(start.melody.events[1]).toMatchObject({pitch:'d',octave:2});
    expect(parseMelody(serializeMelody(next.melody))).toEqual(next.melody);
  });
  it('maps all 36 pitch positions, including sharp notes, in both directions',()=>{
    for(let i=0;i<36;i++)expect(noteStep(noteFromStep(i,{duration:4,dotted:false}))).toBe(i);
  });
  it('takes rhythm only when converting an existing note or rest to a new pitch',()=>{
    const old=noteFromStep(1,{duration:8,dotted:true});
    expect(noteFromStep(24,old)).toMatchObject({type:'note',pitch:'c',sharp:false,octave:3,duration:8,dotted:true});
    expect(noteFromStep(12,{type:'rest',duration:4,dotted:false} as typeof old)).toMatchObject({type:'note',pitch:'c',octave:2});
  });
  it('inserts a rest at the same cursor used by Classic, and rejects invalid updates',()=>{
    const start=edit(initial(),'1').state;
    const next=appendStudioEvent({...start,cursor:0},{type:'rest',duration:8,dotted:false}).state;
    expect(next.cursor).toBe(1); expect(next.melody.events[0].type).toBe('rest');
    expect(updateSelected(initial(),noteFromStep(0,{duration:4,dotted:false})).state.melody.events).toHaveLength(0);
    expect(updateSelected(start,{type:'note',pitch:'e',sharp:true,octave:2,duration:4,dotted:false}).state).toBe(start);
  });
});
describe('shared undo/redo',()=>{
  it('restores Classic insertion, Studio changes, deletion, tempo and title in order',()=>{
    const history=new EditHistory(); let current=initial(); const snapshots=[structuredClone(current)];
    const record=(next:EditorState)=>{history.record(current,next);current=next;snapshots.push(structuredClone(next));};
    record(edit(current,'1').state);
    record(updateSelected(current,noteFromStep(29,{duration:8,dotted:true})).state);
    record({...current,melody:{...current.melody,title:'My Studio',tempoBpm:144}});
    record(edit(current,'Backspace').state);
    for(let i=snapshots.length-2;i>=0;i--){current=history.undo(current);expect(current).toEqual(snapshots[i]);}
    expect(history.canUndo).toBe(false);
    for(let i=1;i<snapshots.length;i++){current=history.redo(current);expect(current).toEqual(snapshots[i]);}
    expect(history.canRedo).toBe(false);
  });
  it('discards redo after a new edit, ignores timestamp-only changes and coalesces title typing',()=>{
    const history=new EditHistory(); const start=initial();
    history.record(start,{...start,melody:{...start.melody,updatedAt:'2026-01-01T00:00:00.000Z'}});
    expect(history.canUndo).toBe(false);
    const one={...start,melody:{...start.melody,title:'A'}};
    const two={...one,melody:{...one.melody,title:'AB'}};
    history.record(start,one,'title');history.record(one,two,'title');
    const restored=history.undo(two);expect(restored).toEqual(start);
    history.record(restored,edit(restored,'2').state);expect(history.canRedo).toBe(false);
    history.clear();expect(history.canUndo).toBe(false);
  });
  it('retains only the latest 100 edits',()=>{
    const history=new EditHistory();let state=initial();
    for(let i=0;i<110;i++){const next={...state,melody:{...state.melody,title:`song ${i}`}};history.record(state,next);state=next;}
    let count=0;while(history.canUndo){state=history.undo(state);count++;}expect(count).toBe(100);
  });
});

describe('duration resizing',()=>{
  it('snaps dragging to supported durations and keeps dots, pitch and octave',async()=>{
    const {resizeRhythm}=await import('../src/music-core/studio');
    const note=noteFromStep(30,{duration:4,dotted:true});
    expect(resizeRhythm(note,60)).toEqual({...note,duration:8});
    expect(resizeRhythm(note,-100)).toMatchObject({duration:32,dotted:true});
    expect(resizeRhythm(note,10000)).toMatchObject({duration:1,dotted:true});
    expect(resizeRhythm(note,NaN)).toEqual(note);
    expect(resizeRhythm({type:'rest',duration:4,dotted:false},160)).toEqual({type:'rest',duration:2,dotted:false});
  });
  it('commits a resize as one undoable edit',async()=>{
    const {resizeRhythm}=await import('../src/music-core/studio');
    const history=new EditHistory();const before=edit(initial(),'1').state;
    const preview=resizeRhythm(before.melody.events[0],180);
    const after=updateSelected(before,preview).state;
    history.record(before,after);
    expect(after.melody.events[0].duration).toBe(2);
    expect(history.undo(after)).toEqual(before);expect(history.canUndo).toBe(false);
    expect(history.redo(before)).toEqual(after);
  });
});

describe('event swapping and append column',()=>{
  it('swaps entire events without losing rhythm, keeps other events, and is undoable',async()=>{
    const {swapStudioEvents}=await import('../src/music-core/studio');
    let before=initial(); before=edit(edit(edit(before,'1').state,'2').state,'0').state;
    before.melody.events[0]={...noteFromStep(30,{duration:8,dotted:true})};
    const after=swapStudioEvents(before,0,2).state;
    expect(after.melody.events).toEqual([before.melody.events[2],before.melody.events[1],before.melody.events[0]]);
    expect(after.cursor).toBe(3);expect(before.melody.events[0].type).toBe('note');
    const history=new EditHistory();history.record(before,after);expect(history.undo(after)).toEqual(before);expect(history.redo(before)).toEqual(after);
    for(const [a,b] of [[0,0],[-1,1],[0,3],[0,1.5]])expect(swapStudioEvents(before,a,b).state).toBe(before);
  });
  it('appends from the next column even when the editing cursor is at the beginning',()=>{
    const before=edit(initial(),'1').state;
    const after=appendStudioEvent({...before,cursor:before.melody.events.length},noteFromStep(24,{duration:4,dotted:false})).state;
    expect(after.melody.events[0]).toEqual(before.melody.events[0]);expect(after.melody.events[1]).toMatchObject({pitch:'c',octave:3});
    expect(after.cursor).toBe(2);
  });
});
