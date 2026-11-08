import { createMelody,isMelody,type Melody } from './model';
import { noteFromStep,noteStep } from './studio';
export function firstRepairLevel() {
  const target=createMelody('回聲小徑');target.tempoBpm=112;
  target.events=[noteFromStep(12,{duration:4,dotted:false}),noteFromStep(16,{duration:8,dotted:false}),noteFromStep(19,{duration:8,dotted:false}),noteFromStep(16,{duration:4,dotted:false}),{type:'rest',duration:8,dotted:false},noteFromStep(14,{duration:8,dotted:false}),noteFromStep(12,{duration:4,dotted:false}),noteFromStep(7,{duration:2,dotted:false})];
  const damaged=structuredClone(target);damaged.id=createMelody().id;damaged.events[2]=noteFromStep(17,damaged.events[2]);
  return {target,damaged,hints:['先比較第 3 個音。','原曲的第 3 個音，比目前版本高兩個半音。','把第 3 個音調成 G2，時值維持 1/8。']};
}
export function compareRepair(target:Melody,candidate:Melody) {
  if(!isMelody(target)||!isMelody(candidate))throw new Error('旋律資料無效。');
  const pitchErrors:number[]=[],rhythmErrors:number[]=[];
  target.events.forEach((event,index)=>{const actual=candidate.events[index];if(!actual)return;if(noteStep(event)!==noteStep(actual))pitchErrors.push(index);if(event.duration!==actual.duration||event.dotted!==actual.dotted)rhythmErrors.push(index);});
  const countMismatch=target.events.length!==candidate.events.length,tempoMismatch=target.tempoBpm!==candidate.tempoBpm;
  return {passed:!countMismatch&&!tempoMismatch&&!pitchErrors.length&&!rhythmErrors.length,pitchErrors,rhythmErrors,countMismatch,tempoMismatch};
}
