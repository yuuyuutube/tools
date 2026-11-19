// 濕式倍率以舊版輕暈墨為 1；乾式三項強度為 0～1，零值停用。
export const INK_SETTINGS_KEY = 'tarot-ink-bleed-v1';
export const ORIGINAL_INK_BLEED = Object.freeze({line:1,text:1,fine:1,tooth:0,edge:0,dry:0,stick:0});
export const DEFAULT_INK_BLEED = Object.freeze({line:1.5,text:2,fine:1.8,tooth:0,edge:.7,dry:0,stick:0});
export const DRY_INK_PRESET = Object.freeze({line:0,text:0,fine:0,tooth:.55,edge:.5,dry:.18,stick:0});
export function normalizeInkBleed(value={}){
 return Object.fromEntries(Object.entries(DEFAULT_INK_BLEED).map(([key,fallback])=>{
  const n=value?.[key];
  return [key,typeof n==='number'&&Number.isFinite(n)?Math.max(0,Math.min(['tooth','edge','dry','stick'].includes(key)?1:6,n)):fallback];
 }));
}
export function readInkBleed(){
 try{return normalizeInkBleed(JSON.parse(globalThis.localStorage.getItem(INK_SETTINGS_KEY)||'null'));}
 catch{return {...DEFAULT_INK_BLEED};}
}
export function saveInkBleed(value){
 const settings=normalizeInkBleed(value);
 globalThis.localStorage.setItem(INK_SETTINGS_KEY,JSON.stringify(settings));
 return settings;
}

// 舊版只有三種濕式倍率；新編輯頁首次開啟時先展示乾式提案。
export function hasSavedPrintTexture(){
 try{const raw=JSON.parse(globalThis.localStorage.getItem(INK_SETTINGS_KEY)||'null');return ['tooth','edge','dry'].every(k=>typeof raw?.[k]==='number');}
 catch{return false;}
}
