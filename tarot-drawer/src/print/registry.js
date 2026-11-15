// 新版正面登記表：哪幾張已經重畫、各自的色版、色盤、印刷種子與狀態。
// 狀態：sample（試畫，待確認）→ approved（畫風與符號都確認）→ integrated（已接上抽牌與海報）
// 沒有列在這裡的牌仍是舊版（legacy）。
import { INKS } from './press.js';
import { hermitPlates } from './hermit.js';
import { moonPlates, MOON_INKS } from './moon.js';
import { foolPlates, FOOL_INKS, FOOL_QUIET } from './fool.js';
import { magicianPlates, MAGICIAN_INKS, MAGICIAN_QUIET } from './magician.js';
import { strengthPlates, STRENGTH_INKS, STRENGTH_QUIET } from './strength.js';
import { hangedManPlates, HANGED_MAN_INKS, HANGED_MAN_QUIET } from './hanged-man.js';
import { highPriestessPlates, HIGH_PRIESTESS_INKS, HIGH_PRIESTESS_QUIET } from './high-priestess.js';
import { empressPlates, EMPRESS_INKS, EMPRESS_QUIET } from './empress.js';
import { emperorPlates, EMPEROR_INKS, EMPEROR_QUIET } from './emperor.js';
import { hierophantPlates, HIEROPHANT_INKS, HIEROPHANT_QUIET } from './hierophant.js';
import { justicePlates, JUSTICE_INKS, JUSTICE_QUIET } from './justice.js';

export const PRINTS = {
  'high-priestess': {status:'approved', plates:highPriestessPlates, inks:HIGH_PRIESTESS_INKS, seed:20261121, quietAreas:HIGH_PRIESTESS_QUIET},
  'empress': {status:'approved', plates:empressPlates, inks:EMPRESS_INKS, seed:20261122, quietAreas:EMPRESS_QUIET},
  'emperor': {status:'approved', plates:emperorPlates, inks:EMPEROR_INKS, seed:20261123, quietAreas:EMPEROR_QUIET},
  'hierophant': {status:'approved', plates:hierophantPlates, inks:HIEROPHANT_INKS, seed:20261124, quietAreas:HIEROPHANT_QUIET},
  'justice': {status:'approved', plates:justicePlates, inks:JUSTICE_INKS, seed:20261125, quietAreas:JUSTICE_QUIET},
  'fool': {
    status: 'sample', plates: foolPlates, inks: FOOL_INKS, seed: 20261118, quietAreas: FOOL_QUIET,
  },
  'magician': {
    status: 'sample', plates: magicianPlates, inks: MAGICIAN_INKS, seed: 20261119, quietAreas: MAGICIAN_QUIET,
  },
  'strength': {
    status: 'approved', plates: strengthPlates, inks: STRENGTH_INKS, seed: 20261120, quietAreas: STRENGTH_QUIET,
  },
  'hermit': {
    status: 'approved', plates: hermitPlates, inks: INKS, seed: 20261115,
    quietAreas: [{ x: 153, y: 175, rx: 24, ry: 34 }, { x: 106, y: 260, rx: 25, ry: 30 }, { x: 219, y: 236, rx: 15, ry: 16 }],
  },
  'moon': {
    status: 'sample', plates: moonPlates, inks: MOON_INKS, seed: 20261116,
    quietAreas: [{ x: 150, y: 127, rx: 47, ry: 47 }, { x: 110, y: 279, rx: 26, ry: 20 }, { x: 219, y: 257, rx: 30, ry: 30 }],
  },
  'hanged-man': {
    status: 'sample', plates: hangedManPlates, inks: HANGED_MAN_INKS, seed: 20261117, quietAreas: HANGED_MAN_QUIET,
  },
};
