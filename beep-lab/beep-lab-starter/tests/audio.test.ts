import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AudioActivationError, AudioEngine } from '../src/audio-engine/player';
import { createMelody, type MusicEvent } from '../src/music-core/model';
const note: MusicEvent = { type: 'note', pitch: 'a', octave: 1, sharp: false, duration: 4, dotted: false };
class Param {
  value = 0;
  setValueAtTime = vi.fn(); linearRampToValueAtTime = vi.fn(); cancelAndHoldAtTime = vi.fn(); setTargetAtTime = vi.fn();
}
class Oscillator {
  frequency = new Param(); type = 'sine'; onended?: () => void;
  connect = vi.fn(); disconnect = vi.fn(); start = vi.fn(); stop = vi.fn();
}
class Context {
  static instances: Context[] = [];
  currentTime = 0; state = 'running'; destination = {};
  onstatechange: (() => void) | null = null;
  oscillators: Oscillator[] = [];
  resume = vi.fn(async () => { this.state = 'running'; });
  constructor() { Context.instances.push(this); }
  createGain() { return { gain: new Param(), connect: vi.fn(), disconnect: vi.fn() }; }
  createOscillator() { const oscillator = new Oscillator(); this.oscillators.push(oscillator); return oscillator; }
}
beforeEach(() => {
  Context.instances = []; vi.useFakeTimers();
  vi.stubGlobal('window', { AudioContext: Context });
  vi.stubGlobal('requestAnimationFrame', (callback: () => void) => setTimeout(callback, 16));
  vi.stubGlobal('cancelAnimationFrame', (id: number) => clearTimeout(id));
});
afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); });
describe('audio lifecycle', () => {
  it('previews the mapped pitch and stops prior voices before a new preview', async () => {
    const player = new AudioEngine();
    await player.previewNote(note, 120);
    const context = Context.instances[0];
    expect(context.oscillators[0].frequency.value).toBe(440);
    await player.previewNote(note, 120);
    expect(context.oscillators[0].stop).toHaveBeenLastCalledWith(0.008);
    expect(context.oscillators).toHaveLength(2);
    player.stop();
  });
  it('uses AudioContext times, schedules silence for rests and stops every voice on replay', async () => {
    const player = new AudioEngine(); const melody = createMelody();
    melody.events = [note, { type: 'rest', duration: 4, dotted: false }, note];
    await player.playMelody(melody);
    const context = Context.instances[0];
    expect(context.oscillators).toHaveLength(1);
    expect(context.oscillators[0].start).toHaveBeenCalledWith(0.04);
    context.currentTime = 0.6; vi.advanceTimersByTime(25);
    expect(context.oscillators).toHaveLength(1);
    context.currentTime = 1; vi.advanceTimersByTime(25);
    expect(context.oscillators[1].start).toHaveBeenCalledWith(1.04);
    await player.playMelody(melody);
    expect(context.oscillators[0].stop).toHaveBeenLastCalledWith(1.008);
    expect(context.oscillators[1].stop).toHaveBeenLastCalledWith(1.008);
    player.stop(); expect(player.isPlaying).toBe(false);
    const count = context.oscillators.length; vi.advanceTimersByTime(1000);
    expect(context.oscillators).toHaveLength(count);
  });
  it('cancels pending async Play and preview if Stop arrives before audio unlock finishes', async () => {
    const player = new AudioEngine(); const melody = createMelody(); melody.events = [note];
    const play = player.playMelody(melody); player.stop(); await play;
    expect(player.isPlaying).toBe(false); expect(Context.instances[0].oscillators).toHaveLength(0);
    const preview = player.previewNote(note, 120); player.stop(); await preview;
    expect(Context.instances[0].oscillators).toHaveLength(0);
  });
  it('ends playback, reports positions and clears its scheduler', async () => {
    const player = new AudioEngine(); player.onPosition = vi.fn(); player.onEnd = vi.fn();
    const melody = createMelody(); melody.events = [note]; await player.playMelody(melody);
    const context = Context.instances[0]; context.currentTime = 0.1; vi.advanceTimersByTime(20);
    expect(player.onPosition).toHaveBeenCalledWith(0);
    context.currentTime = 0.6; vi.advanceTimersByTime(20);
    expect(player.onEnd).toHaveBeenCalledOnce(); expect(player.isPlaying).toBe(false);
  });
  it('reports blocked audio and permits an explicit retry without replaying a failed note', async () => {
    const player = new AudioEngine(); player.onAvailability = vi.fn();
    await player.unlock();
    const context = Context.instances[0]; context.state = 'suspended';
    context.resume.mockRejectedValueOnce(new Error('NotAllowedError'));
    await expect(player.previewNote(note, 120)).rejects.toBeInstanceOf(AudioActivationError);
    expect(player.availability).toBe('blocked');
    expect(player.onAvailability).toHaveBeenLastCalledWith('blocked');
    expect(context.oscillators).toHaveLength(0);
    await player.unlock();
    expect(player.availability).toBe('ready');
    expect(context.oscillators).toHaveLength(0);
    await player.previewNote(note, 120);
    expect(context.oscillators).toHaveLength(1);
    player.stop();
  });
  it('exposes recovery if resume resolves but audio remains suspended', async () => {
    const player = new AudioEngine(); await player.unlock();
    const context = Context.instances[0]; context.state = 'suspended';
    context.resume.mockImplementationOnce(async () => {});
    await expect(player.unlock()).rejects.toMatchObject({ recoverable: true });
    expect(player.availability).toBe('blocked');
  });
  it('times out a pending resume, then allows a gesture retry without leftover timers or sound', async () => {
    const player = new AudioEngine(); await player.unlock();
    const context = Context.instances[0]; context.state = 'suspended';
    let resolveResume!: () => void;
    context.resume.mockImplementationOnce(() => new Promise(resolve => { resolveResume = resolve; }));
    const result = player.previewNote(note, 120).catch(error => error);
    await vi.advanceTimersByTimeAsync(1500);
    expect(await result).toMatchObject({ recoverable: true });
    expect(player.availability).toBe('blocked');
    expect(vi.getTimerCount()).toBe(0);
    await player.unlock(); resolveResume(); await Promise.resolve();
    expect(player.availability).toBe('ready');
    expect(context.oscillators).toHaveLength(0);
  });
  it('handles unsupported Web Audio without claiming that retry will fix it', async () => {
    vi.stubGlobal('window', {});
    const player = new AudioEngine();
    await expect(player.unlock()).rejects.toMatchObject({ recoverable: false });
    expect(player.availability).toBe('unavailable');
  });
  it('stops playback when the context becomes suspended and requires a fresh play after recovery', async () => {
    const player = new AudioEngine(); const melody = createMelody(); melody.events = [note];
    await player.playMelody(melody);
    const context = Context.instances[0]; context.state = 'suspended'; context.onstatechange?.();
    expect(player.isPlaying).toBe(false); expect(player.availability).toBe('blocked');
    expect(context.oscillators[0].stop).toHaveBeenLastCalledWith(0.008);
    await player.unlock();
    expect(player.isPlaying).toBe(false); expect(context.oscillators).toHaveLength(1);
  });
  it('ignores an older activation failure after a newer gesture has succeeded', async () => {
    const player = new AudioEngine(); await player.unlock();
    const context = Context.instances[0]; context.state = 'suspended';
    let rejectResume!: (error: Error) => void;
    context.resume.mockImplementationOnce(() => new Promise((_, reject) => { rejectResume = reject; }));
    const oldAttempt = player.unlock();
    await player.unlock(); rejectResume(new Error('late failure')); await oldAttempt;
    expect(player.availability).toBe('ready'); expect(vi.getTimerCount()).toBe(0);
  });

  it('offers retry when a supported AudioContext temporarily fails to initialize', async () => {
    const Constructor = vi.fn(function () { throw new Error('Temporary context failure'); });
    vi.stubGlobal('window', { AudioContext: Constructor });
    const player = new AudioEngine();
    await expect(player.unlock()).rejects.toMatchObject({ recoverable: true });
    expect(player.availability).toBe('blocked');
    vi.stubGlobal('window', { AudioContext: Context });
    await player.unlock();
    expect(player.availability).toBe('ready');
  });

});

it('reports continuous playback progress from the audio clock, including silence, and clears on Stop',async()=>{
  const player=new AudioEngine(),melody=createMelody();melody.events=[note,{type:'rest',duration:4,dotted:false},note];
  const progress=vi.fn();player.onProgress=progress;await player.playMelody(melody);
  expect(progress).toHaveBeenLastCalledWith(0,1.5);
  Context.instances[0].currentTime=.79;vi.advanceTimersByTime(20);expect(progress).toHaveBeenLastCalledWith(.75,1.5);
  player.stop();expect(progress).toHaveBeenLastCalledWith(null,0);
  const count=progress.mock.calls.length;vi.advanceTimersByTime(100);expect(progress).toHaveBeenCalledTimes(count);
});
