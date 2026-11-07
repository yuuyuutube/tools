export const cardArtNames={weave:'旋律織紋',stars:'聲音星圖',rhythm:'節奏構成',terrain:'聲音地形',letterpress:'旋律活版',specimen:'音符標本',windows:'聲音窗景'} as const;
export type CardArtStyle=keyof typeof cardArtNames;
export const cardArtStyles=Object.keys(cardArtNames) as CardArtStyle[];
export function resolveArtStyle(value:string|null,random=Math.random):CardArtStyle {
  return value==='random'?cardArtStyles[Math.min(cardArtStyles.length-1,Math.max(0,Math.floor(random()*cardArtStyles.length)))]:cardArtStyles.includes(value as CardArtStyle)?value as CardArtStyle:'weave';
}
