// 每片海一組有限色盤：白天與夜晚完整定義，晨昏只換天空，其餘由日夜色混合後帶一點天光。
// 色相、明度、彩度各不相同，但都是低彩度大色塊加一個點綴色，放在一起像同一套印刷系列。
import { mix } from './util.js';

export const KEYS = ['sky', 'sky2', 'sun', 'cloud', 'far1', 'far2', 'far3', 'sea0', 'sea1', 'sea2', 'sea3', 'foam', 'glint',
  'land', 'land2', 'rock', 'rock2', 'plant', 'plant2', 'accent', 'accent2', 'text'];

const P = {
  // A：霧青綠 × 米白 × 陶土紅
  hualien: {
    day: { sky: '#ece5d6', sky2: '#e3dccb', sun: '#c8623f', cloud: '#f8f4ea', far1: '#bcc6ba', far2: '#93ab9f', far3: '#6e8c81', sea0: '#9fc0b8', sea1: '#7fa9a2', sea2: '#64928c', sea3: '#4e7d79', foam: '#f8f4ea', glint: '#f8f4ea', land: '#ddd1ba', land2: '#c7b89d', rock: '#8a8577', rock2: '#6f6a5f', plant: '#6f8c6c', plant2: '#506f56', accent: '#c8623f', accent2: '#e2a07c', text: '#26332f' },
    night: { sky: '#1f2f33', sky2: '#26383b', sun: '#efe6cf', cloud: '#34474a', far1: '#34484a', far2: '#2b3f41', far3: '#223537', sea0: '#2f4a4b', sea1: '#284243', sea2: '#213a3b', sea3: '#1b3233', foam: '#b9c9c2', glint: '#efe6cf', land: '#50574f', land2: '#434a43', rock: '#3a3e38', rock2: '#2f332e', plant: '#2e443a', plant2: '#24372f', accent: '#9a4d34', accent2: '#b56f52', text: '#efe6cf' },
    dusk: { sky: '#e8c6a9', sky2: '#df9f80', sun: '#c4483a', cloud: '#f2dccb' },
    dawn: { sky: '#e4dbd2', sky2: '#ebc4b0', sun: '#d77a55', cloud: '#f6ece4' },
  },
  // D：湖水綠 × 乳黃 × 深藍灰
  yilan: {
    day: { sky: '#f2eccb', sky2: '#e9e1b6', sun: '#e8a65a', cloud: '#fbf7e6', far1: '#5f7581', far2: '#3f5566', far3: '#8ea3aa', sea0: '#a3d5c9', sea1: '#82c3b7', sea2: '#61aea3', sea3: '#48978e', foam: '#fbf7e6', glint: '#fbf7e6', land: '#efdfae', land2: '#e0ca8e', rock: '#8c8a76', rock2: '#6e6c5c', plant: '#6aa384', plant2: '#4f8a6c', accent: '#3f5566', accent2: '#e8a65a', text: '#26394a' },
    night: { sky: '#1e2a38', sky2: '#253446', sun: '#f3ecd2', cloud: '#34465a', far1: '#141e29', far2: '#0f1822', far3: '#2b3a4a', sea0: '#24434a', sea1: '#1f3c43', sea2: '#1a343b', sea3: '#152d33', foam: '#a9c9c3', glint: '#f3ecd2', land: '#4f5446', land2: '#44493d', rock: '#34352e', rock2: '#2a2b25', plant: '#2a4538', plant2: '#213a2f', accent: '#0f1822', accent2: '#a7764a', text: '#f3ecd2' },
    dusk: { sky: '#efcaa4', sky2: '#e7a98a', sun: '#d8664a', cloud: '#f7e2c8' },
    dawn: { sky: '#e9e4cf', sky2: '#f2cdb2', sun: '#ec9a5e', cloud: '#fbf1e2' },
  },
  // C：粉灰 × 深酒紅 × 奶油白
  keelung: {
    day: { sky: '#eadcd7', sky2: '#e1cdc8', sun: '#f9f2e2', cloud: '#f7efdc', far1: '#c5b4b5', far2: '#9e8f97', far3: '#7f707b', sea0: '#a9abb6', sea1: '#9195a3', sea2: '#7a7f8f', sea3: '#656a7b', foam: '#f7efdc', glint: '#f7efdc', land: '#c2aaa1', land2: '#a98f88', rock: '#8b6f6c', rock2: '#6f5552', plant: '#7d8a72', plant2: '#5f6c58', accent: '#7a2e3a', accent2: '#f7efdc', text: '#4a1f27' },
    night: { sky: '#2a2230', sky2: '#33293a', sun: '#f7efdc', cloud: '#43384a', far1: '#3b3140', far2: '#2f2735', far3: '#251f2b', sea0: '#343345', sea1: '#2d2c3d', sea2: '#262535', sea3: '#1f1f2d', foam: '#b8b0b4', glint: '#f7efdc', land: '#4e4043', land2: '#43373a', rock: '#3a2f31', rock2: '#2e2527', plant: '#2f3a32', plant2: '#252f28', accent: '#6e2a35', accent2: '#e8dcc4', text: '#f7efdc' },
    dusk: { sky: '#e6c3bd', sky2: '#d9998f', sun: '#f6e6cf', cloud: '#f1d9cf' },
    dawn: { sky: '#e6dcd9', sky2: '#e9c8bf', sun: '#fbf1e1', cloud: '#f7ece6' },
  },
  // F：淡薰衣草紫 × 午夜藍 × 米色
  tamsui: {
    day: { sky: '#ddd5e6', sky2: '#d1c7dd', sun: '#efe2c6', cloud: '#f3eee6', far1: '#a3a1bd', far2: '#2f3a5e', far3: '#4a557a', sea0: '#b6b6d0', sea1: '#9c9ebe', sea2: '#8387ac', sea3: '#6d7299', foam: '#f3ece0', glint: '#efe2c6', land: '#cbc1a9', land2: '#b2a88f', rock: '#6f6a7a', rock2: '#575263', plant: '#5f6e5a', plant2: '#485744', accent: '#2f3a5e', accent2: '#e3b98f', text: '#26304f' },
    night: { sky: '#1b2140', sky2: '#222a4d', sun: '#efe2c6', cloud: '#333a5b', far1: '#2a3156', far2: '#12182f', far3: '#1b2240', sea0: '#262d4f', sea1: '#212847', sea2: '#1c223e', sea3: '#171c35', foam: '#a9a9c4', glint: '#efe2c6', land: '#4a4652', land2: '#3f3b47', rock: '#2f2c3a', rock2: '#25222f', plant: '#26332c', plant2: '#1e2a24', accent: '#0f1428', accent2: '#c99a6c', text: '#efe2c6' },
    dusk: { sky: '#d8bdd2', sky2: '#eab299', sun: '#e98d5c', cloud: '#f0dccf' },
    dawn: { sky: '#ddd3e3', sky2: '#ecd0c1', sun: '#f1c79c', cloud: '#f6eee9' },
  },
  // E：淺橄欖綠 × 炭黑 × 珊瑚粉
  tainan: {
    day: { sky: '#e9e7cd', sky2: '#dddcb9', sun: '#ee8a76', cloud: '#f5f3e2', far1: '#b9bd96', far2: '#2f302c', far3: '#8e936d', sea0: '#c4c8a0', sea1: '#abb389', sea2: '#939e75', sea3: '#7d8963', foam: '#f5f3e2', glint: '#f5f3e2', land: '#d9d0af', land2: '#c5ba95', rock: '#3a3a35', rock2: '#2a2a27', plant: '#6f7a4f', plant2: '#56613c', accent: '#2f302c', accent2: '#ee8a76', text: '#2a2b27' },
    night: { sky: '#23261f', sky2: '#2b2f26', sun: '#f1ead2', cloud: '#3a3e32', far1: '#3a3f31', far2: '#151612', far3: '#31362a', sea0: '#343a2c', sea1: '#2e3427', sea2: '#282d22', sea3: '#22271d', foam: '#b8bba0', glint: '#f1ead2', land: '#4c4b3e', land2: '#424135', rock: '#1d1d1a', rock2: '#151513', plant: '#2d3523', plant2: '#242b1c', accent: '#0d0d0b', accent2: '#c46e5e', text: '#f1ead2' },
    dusk: { sky: '#eccfb5', sky2: '#ecaa92', sun: '#e2604f', cloud: '#f6e2cf' },
    dawn: { sky: '#e6e3cf', sky2: '#efcdbb', sun: '#f09a85', cloud: '#f8f1e4' },
  },
  // B：灰紫 × 芥末黃 × 深墨綠
  penghu: {
    day: { sky: '#d7d1dc', sky2: '#cbc3d2', sun: '#d8b23e', cloud: '#efebf0', far1: '#a8a1b5', far2: '#716882', far3: '#51495f', sea0: '#729189', sea1: '#587c73', sea2: '#41685f', sea3: '#2e534c', foam: '#efebf0', glint: '#f1e3b0', land: '#bbb09e', land2: '#a59a88', rock: '#4a4552', rock2: '#383340', plant: '#c9a53a', plant2: '#a8862a', accent: '#d8b23e', accent2: '#2e534c', text: '#2c2733' },
    night: { sky: '#221f2b', sky2: '#2a2634', sun: '#efe7cc', cloud: '#393445', far1: '#3a3547', far2: '#2c2838', far3: '#221f2c', sea0: '#22332f', sea1: '#1d2d29', sea2: '#182723', sea3: '#13211e', foam: '#a7b2ad', glint: '#efe7cc', land: '#4a4640', land2: '#3f3b36', rock: '#26232c', rock2: '#1d1b22', plant: '#6a5a2a', plant2: '#574a22', accent: '#8a7330', accent2: '#1d3531', text: '#efe7cc' },
    dusk: { sky: '#dcc0c6', sky2: '#e3a88c', sun: '#d9873a', cloud: '#eedad4' },
    dawn: { sky: '#d9d3de', sky2: '#e5cbbf', sun: '#e2c060', cloud: '#f2ecee' },
  },
};

/** 某片海、某個天色的完整色盤；warm：海溫帶來的極小色偏（-1 冷 … 1 暖） */
export function palette(id, phase = 'day', warm = 0) {
  const p = P[id] || P.hualien;
  let out;
  if (phase === 'day' || phase === 'night') out = { ...p[phase] };
  else {
    const sky = p[phase];
    out = {};
    for (const k of KEYS) out[k] = mix(mix(p.day[k], p.night[k], phase === 'dusk' ? .28 : .2), sky.sky2, .1);
    Object.assign(out, sky);
    out.text = p.day.text;
  }
  out.seaA = mix(out.sea0, out.sea1, .5);       // 貼近地平線的一條過渡色帶
  // 海溫：最多 6% 往暖（陶土）或冷（藍灰）偏，只是一點溫度感，不是溫度圖
  if (warm) {
    const tint = warm > 0 ? '#c98a5a' : '#5a7a9a', a = Math.min(.06, Math.abs(warm) * .06);
    for (const k of ['sea0', 'seaA', 'sea1', 'sea2', 'sea3']) out[k] = mix(out[k], tint, a);
  }
  return out;
}

export const PALETTE_IDS = Object.keys(P);
