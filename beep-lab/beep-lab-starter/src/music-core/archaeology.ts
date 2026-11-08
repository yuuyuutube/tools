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
  level('can-can','康康舞曲',144,'4g1 4g1 8a1 8c2 8b1 8a1 4d2 4d2 8d2 8e2 8b1 8c2 4a1 4a1 8a1 8c2 8b1 8a1',{
    kind:'rhythm',attribution:'奧芬巴哈《康康舞曲》主題 · G 大調單音節選',
    difference:'有兩個音的長短和原曲不同',mission:'修好一個太短的音與一個太長的音，音高不用改。',
    hints:['比較第 1 音與第 3 音的長短。','第 1 音應和第 2 音一樣長；第 3 音應和後面的短音一樣短。','第 1 音設成 1/4，第 3 音設成 1/8，兩個都不加附點。'],
  },events=>{events[0].duration=8;events[2].duration=4;}),
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
  level('spring','四季・春',132,'8e2 8#g2 8#g2 8#g2 16#f2 16e2 4.b2 16b2 16a2 8#g2 8#g2 8#g2 16#f2 16e2 4.b2 16b2 16a2 8#g2 16a2 16b2 8a2 8#g2 8#f2 8#d2 8b1 8e2',{
    kind:'rhythm',attribution:'韋瓦第《四季・春》開頭 · E 大調單音節選',
    difference:'有三個地方的節奏和原曲不同',mission:'修好一個被拉長的短音，並找回兩個長音遺失的附點。',
    hints:['比較第 2 音的長短，以及第 7、15 音的延長感。','第 2 音應和後面兩個音一樣短；兩次出現的 B2 長音都少了附點。','第 2 音設成 1/8、不加附點；第 7、15 音維持 1/4，勾選附點。'],
  },events=>{events[1].duration=4;events[6].dotted=false;events[14].dotted=false;}),
  level('william-tell','威廉泰爾',112,'16d1 16d1 8d1 16d1 16d1 8d1 16d1 16d1 8g1 8a1 8b1 16d1 16d1 8d1 16d1 16d1 8g1 8b1 8a1 8#f1 8d1 16d1 16d1',{
    kind:'mixed',attribution:'羅西尼《威廉泰爾序曲》快板 · G 大調單音改編',
    difference:'有兩個音高與一個時值和原曲不同',mission:'最後挑戰：修好兩個錯音，並找回開頭短音的節奏。',
    hints:['時值問題在第 1 音；音高問題在第 9、20 音。','開頭兩個 D1 應同樣短；第 9 音應和第 17 音同高，第 20 音比 F1 高半音。','第 1 音設成 1/16、不加附點；第 9 音調成 G1，第 20 音調成 F#1。'],
  },events=>{events[0].duration=8;events[8]=noteFromStep(5,events[8]);events[19]=noteFromStep(5,events[19]);}),
  level('mountain-king','山魔王的宮殿',138,'8b1 8#c2 8d2 8e2 8#f2 8d2 4#f2 8f2 8#c2 4f2 8e2 8c2 4e2 8b1 8#c2 8d2 8e2 8#f2 8d2 8#f2 8b2 8a2 8#f2 8d2 8#f2 2a2',{
    kind:'mixed',attribution:'葛利格《山魔王的宮殿》主題 · 升高音域、固定速度單音節選',
    difference:'有兩個音高與一個時值和原曲不同',mission:'修好兩個半音陷阱，並找回結尾長音的時值。',
    hints:['音高問題在第 5、9 音，長短問題在最後的第 26 音。','第 5 音應和第 7 音同高；第 9 音應和第 2 音同高；最後一音要持續兩拍。','第 5 音調成 F#2、第 9 音調成 C#2；第 26 音設成 1/2、不加附點。'],
  },events=>{events[4]=noteFromStep(17,events[4]);events[8]=noteFromStep(12,events[8]);events[25].duration=4;}),
];}
export function firstRepairLevel(){return repairLevels()[0];}
export function compareRepair(target:Melody,candidate:Melody) {
  if(!isMelody(target)||!isMelody(candidate))throw new Error('旋律資料無效。');
  const pitchErrors:number[]=[],rhythmErrors:number[]=[];
  target.events.forEach((event,index)=>{const actual=candidate.events[index];if(!actual)return;if(noteStep(event)!==noteStep(actual))pitchErrors.push(index);if(event.duration!==actual.duration||event.dotted!==actual.dotted)rhythmErrors.push(index);});
  const countMismatch=target.events.length!==candidate.events.length,tempoMismatch=target.tempoBpm!==candidate.tempoBpm;
  return {passed:!countMismatch&&!tempoMismatch&&!pitchErrors.length&&!rhythmErrors.length,pitchErrors,rhythmErrors,countMismatch,tempoMismatch};
}
