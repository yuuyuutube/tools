import { eventSeconds, frequency, isMelody, type Melody } from '../music-core/model';
export const WAV_SAMPLE_RATE=22050;
export const MAX_WAV_SECONDS=180;
export function wavFilename(title:string) {
  return (title.replace(/[\x00-\x1f\x7f/\\:*?"<>|]/g,' ').trim().slice(0,80)||'beep')+'.wav';
}
export function renderWav(melody:Melody,sampleRate=WAV_SAMPLE_RATE):ArrayBuffer {
  if(!isMelody(melody)||!melody.events.length)throw new Error('旋律沒有可匯出的音符。');
  if(!Number.isInteger(sampleRate)||sampleRate<8000||sampleRate>48000)throw new Error('取樣率無效。');
  const seconds=melody.events.reduce((sum,event)=>sum+eventSeconds(event,melody.tempoBpm),0);
  if(seconds>MAX_WAV_SECONDS)throw new Error('WAV 下載目前支援 3 分鐘內的旋律，請縮短旋律或提高速度後再試。');
  const samples=Math.round(seconds*sampleRate),buffer=new ArrayBuffer(44+samples*2),view=new DataView(buffer);
  const text=(offset:number,value:string)=>{for(let i=0;i<value.length;i++)view.setUint8(offset+i,value.charCodeAt(i));};
  text(0,'RIFF');view.setUint32(4,buffer.byteLength-8,true);text(8,'WAVE');text(12,'fmt ');view.setUint32(16,16,true);view.setUint16(20,1,true);view.setUint16(22,1,true);view.setUint32(24,sampleRate,true);view.setUint32(28,sampleRate*2,true);view.setUint16(32,2,true);view.setUint16(34,16,true);text(36,'data');view.setUint32(40,samples*2,true);
  let offset=0;
  for(const event of melody.events) {
    const duration=eventSeconds(event,melody.tempoBpm),start=Math.round(offset*sampleRate);offset+=duration;const end=Math.round(offset*sampleRate);
    if(event.type==='rest')continue;
    const hz=frequency(event),harmonics=Math.min(15,Math.floor(sampleRate*.45/hz));
    const attack=Math.min(.005,duration/4),soundEnd=duration-Math.min(.025,duration*.1),release=Math.min(.008,soundEnd/3);
    for(let sample=start;sample<end;sample++) {
      const time=(sample-start)/sampleRate;if(time>=soundEnd)break;
      const envelope=Math.min(1,time/attack,(soundEnd-time)/release);const phase=2*Math.PI*hz*time;let wave=0;
      // Band-limited odd harmonics retain the monophonic square-wave character.
      for(let harmonic=1;harmonic<=harmonics;harmonic+=2)wave+=Math.sin(phase*harmonic)/harmonic;
      view.setInt16(44+sample*2,Math.round(Math.max(-1,Math.min(1,wave*4/Math.PI*.13*envelope))*32767),true);
    }
  }
  return buffer;
}
