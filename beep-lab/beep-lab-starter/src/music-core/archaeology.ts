import { createMelody,isMelody,type Melody,type MusicEvent,type Duration,type Octave,type PitchClass } from './model';
import { noteFromStep,noteStep } from './studio';
export type RepairLevel={id:string;target:Melody;damaged:Melody;kind:'pitch'|'rhythm'|'mixed';attribution:string;mission:string;difference:string;hints:string[]};
function score(text:string):MusicEvent[]{return text.trim().split(/\s+/).map(token=>{
  const match=/^(1|2|4|8|16|32)(\.?)(#?)(?:([a-g])([123])|(-))$/.exec(token);
  if(!match)throw new Error(`Invalid repair score: ${token}`);
  const timing={duration:Number(match[1]) as Duration,dotted:!!match[2]};
  return match[6]?{type:'rest',...timing}:{type:'note',pitch:match[4] as PitchClass,octave:Number(match[5]) as Octave,sharp:!!match[3],...timing};
});}
function level(id:string,title:string,bpm:number,notes:string,details:Omit<RepairLevel,'id'|'target'|'damaged'>,damage:(events:MusicEvent[])=>void):RepairLevel{
  const target=createMelody(title);target.tempoBpm=bpm;target.events=score(notes);
  if(!isMelody(target))throw new Error('Invalid repair level');
  const damaged=structuredClone(target);damaged.id=createMelody().id;damage(damaged.events);
  return {id,target,damaged,...details};
}
export function repairLevels():RepairLevel[]{return [
  level('nokia','Nokia Tune',156,'8e2 8d2 4#f1 4#g1 8#c2 8b1 4d1 4e1 8b1 8a1 4#c1 4e1 2a1',{
    kind:'pitch',attribution:'塔雷加《Gran Vals》旋律片段 · 單音鈴聲改編',
    difference:'有一個音高和原曲不同',mission:'找出並修好一個錯音，節奏先不用改。',
    hints:['先比較第 3 個音。','原曲的第 3 個音，比目前版本高一個半音。','把第 3 個音調成 F#1，時值維持 1/4。'],
  },events=>{events[2]=noteFromStep(5,events[2]);}),
  level('ode-to-joy','歡樂頌',112,'4e2 4e2 4f2 4g2 4g2 4f2 4e2 4d2 4c2 4c2 4d2 4e2 4.e2 8d2 2d2',{
    kind:'pitch',attribution:'貝多芬《第九號交響曲》主題 · C 大調單音改編',
    difference:'有兩個音高和原曲不同',mission:'找出並修好兩個錯音，時值與附點不用改。',
    hints:['兩個錯音分別在第 5 音與第 11 音。','第 5 音應和第 4 音相同；第 11 音應和第 8 音相同。','把第 5 音調成 G2、第 11 音調成 D2，兩個都維持 1/4。'],
  },events=>{events[4]=noteFromStep(21,events[4]);events[10]=noteFromStep(16,events[10]);}),
  level('fate','第五號交響曲',108,'8- 8g1 8g1 8g1 2#d1 8- 8f1 8f1 8f1 1d1',{
    kind:'rhythm',attribution:'貝多芬《第五號交響曲》開頭 · 延長記號採固定時值',
    difference:'有兩個地方的長短和原曲不同',mission:'修好一個休止符與一個長音的時值，音高先不用改。',
    hints:['先比較第 1 格的休止符，以及第 5 音的長音。','開頭要短暫停頓；第 5 音要比三個短音長得多。','第 1 格休止符設成 1/8，第 5 音設成 1/2，兩個都不加附點。'],
  },events=>{events[0].duration=4;events[4].duration=4;}),
  level('fur-elise','給愛麗絲',72,'16e2 16#d2 16e2 16#d2 16e2 16b1 16d2 16c2 8a1 16- 16c1 16e1 16a1 8b1 16- 16e1 16#g1 16b1 8c2',{
    kind:'pitch',attribution:'貝多芬《給愛麗絲》開頭 · 右手旋律節選',
    difference:'有兩個音高和原曲不同',mission:'修好開頭半音交替中的兩個錯音，節奏不用改。',
    hints:['留意開頭第 2 音與第 4 音。','它們都應比前一個 E2 低一個半音，而不是一個全音。','把第 2 音與第 4 音都調成 D#2，時值維持 1/16。'],
  },events=>{events[1]=noteFromStep(14,events[1]);events[3]=noteFromStep(14,events[3]);}),
  level('alla-turca','土耳其進行曲',112,'16b1 16a1 16#g1 16a1 8c2 8- 16d2 16c2 16b1 16c2 8e2 8- 16f2 16e2 16#d2 16e2 16b2 16a2 16#g2 16a2 16b2 16a2 16#g2 16a2 4c3 8a2 8c3',{
    kind:'mixed',attribution:'莫札特《土耳其進行曲》開頭 · 單音慢速節選',
    difference:'有一個音高與一個時值和原曲不同',mission:'修好一個錯音，並把一個被拉長的短音改回來。',
    hints:['音高問題在第 3 音；時值問題在第 7 音。','第 3 音應比 A1 低一個半音；第 7 音應和旁邊的音一樣短。','第 3 音調成 G#1；第 7 音的時值調成 1/16，不加附點。'],
  },events=>{events[2]=noteFromStep(7,events[2]);events[6].duration=8;}),
  level('nachtmusik','弦樂小夜曲',132,'4g2 8- 8d2 4g2 8- 8d2 8g2 8d2 8g2 8b2 4d3 4- 4c3 8- 8a2 4c3 8- 8a2 8c3 8a2 8#f2 8a2 4d2 4-',{
    kind:'pitch',attribution:'莫札特《G 大調弦樂小夜曲》開頭 · 第一小提琴旋律',
    difference:'有兩個音的八度和原曲不同',mission:'找出兩個八度偏低的音，保留音名與時值，把它們升高一個八度。',
    hints:['比較第 1 音與第 11 音的高低。','第 1 音應與第 4 音同高；第 11 音應比目前版本高一個八度。','把第 1 音調成 G2、第 11 音調成 D3，兩個都維持 1/4。'],
  },events=>{events[0]=noteFromStep(7,events[0]);events[10]=noteFromStep(14,events[10]);}),
];}
export function firstRepairLevel(){return repairLevels()[0];}
export function compareRepair(target:Melody,candidate:Melody) {
  if(!isMelody(target)||!isMelody(candidate))throw new Error('旋律資料無效。');
  const pitchErrors:number[]=[],rhythmErrors:number[]=[];
  target.events.forEach((event,index)=>{const actual=candidate.events[index];if(!actual)return;if(noteStep(event)!==noteStep(actual))pitchErrors.push(index);if(event.duration!==actual.duration||event.dotted!==actual.dotted)rhythmErrors.push(index);});
  const countMismatch=target.events.length!==candidate.events.length,tempoMismatch=target.tempoBpm!==candidate.tempoBpm;
  return {passed:!countMismatch&&!tempoMismatch&&!pitchErrors.length&&!rhythmErrors.length,pitchErrors,rhythmErrors,countMismatch,tempoMismatch};
}
