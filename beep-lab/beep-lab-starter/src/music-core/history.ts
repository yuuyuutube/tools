import type { EditorState } from './editor';
export class EditHistory {
  private past: EditorState[] = [];
  private future: EditorState[] = [];
  get canUndo() { return this.past.length > 0; }
  get canRedo() { return this.future.length > 0; }
  private group?: string;
  breakGroup() { this.group = undefined; }
  record(before: EditorState, after: EditorState, group?: string) {
    const content = (state: EditorState) => JSON.stringify([state.melody.id, state.melody.title, state.melody.tempoBpm, state.melody.events]);
    if (content(before) === content(after)) return;
    if (!group || group !== this.group || !this.past.length) this.past.push(structuredClone(before));
    this.group = group;
    if (this.past.length > 100) this.past.shift();
    this.future = [];
  }
  undo(current: EditorState): EditorState {
    this.breakGroup();
    const previous = this.past.pop();
    if (!previous) return current;
    this.future.push(structuredClone(current));
    return structuredClone(previous);
  }
  redo(current: EditorState): EditorState {
    this.breakGroup();
    const next = this.future.pop();
    if (!next) return current;
    this.past.push(structuredClone(current));
    return structuredClone(next);
  }
  clear() { this.breakGroup(); this.past = []; this.future = []; }
}
