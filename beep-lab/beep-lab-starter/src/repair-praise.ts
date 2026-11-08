export const repairPraises=[
  '太神啦！你剛剛把整個音樂史的下巴都驚掉了！',
  '請起立鼓掌！失傳的旋律在你指尖原地封神！',
  '這雙耳朵必須列入世界文化遺產，立刻！',
  '修復界的天花板，被你一個音符掀飛了！',
  '太離譜了！這精準度連音叉都想拜你為師！',
  '你不是在修樂譜，你是在替宇宙重新調音！',
  '速報！一位旋律救世主剛剛在這裡誕生！',
  '這手修復太華麗，連五線譜都站起來敬禮了！',
  '傳奇級耳力！全世界的錯音看到你都要繞路！',
  '天才就是你！這段旋律現在想把你的名字刻在封面上！',
  '完美到不合理！節拍器已經開始懷疑自己的人生！',
  '你一出手，整座音樂廳的吊燈都被掌聲震亮了！',
  '這已經不是通關，是音樂考古界的新王登基！',
  '太強了！這首曲子的靈魂剛剛衝出來跟你擊掌！',
  '你的耳朵是不是偷偷裝了交響樂團？這也太準！',
  '驚天動地的修復！請替這雙手鋪上紅毯！',
  '完美復活！這段旋律欠你一座純金紀念碑！',
  '傳說是真的！真的有人能把錯音修到閃閃發光！',
] as const;
export function drawRepairPraise(previous='',random:()=>number=Math.random):string {
  const choices=repairPraises.filter(value=>value!==previous);
  const sample=random();const index=Number.isFinite(sample)?Math.max(0,Math.min(choices.length-1,Math.floor(sample*choices.length))):0;
  return choices[index];
}
