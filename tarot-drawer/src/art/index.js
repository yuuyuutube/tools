// 插畫登記表：牌的 artwork → 窗格底色與畫法
import { P, N, O, Y, B, O2, Y2, B2, K2 } from './kit.js';
import { fool, magician, highPriestess, empress, emperor, hierophant, lovers, chariot } from './cards-a.js';
import { strength, hermit, wheel, justice, hangedMan, death, temperance } from './cards-b.js';
import { devil, tower, starCard, moon, sun, judgement, world } from './cards-c.js';

export const ART = {
  'fool': { bg: Y2, draw: fool },
  'magician': { bg: O2, draw: magician },
  'high-priestess': { bg: B, draw: highPriestess },
  'empress': { bg: Y, draw: empress },
  'emperor': { bg: O, draw: emperor },
  'hierophant': { bg: P, draw: hierophant },
  'lovers': { bg: K2, draw: lovers },
  'chariot': { bg: B2, draw: chariot },
  'strength': { bg: Y2, draw: strength },
  'hermit': { bg: N, draw: hermit },
  'wheel-of-fortune': { bg: B, draw: wheel },
  'justice': { bg: O2, draw: justice },
  'hanged-man': { bg: P, draw: hangedMan },
  'death': { bg: B2, draw: death },
  'temperance': { bg: Y2, draw: temperance },
  'devil': { bg: O, draw: devil },
  'tower': { bg: N, draw: tower },
  'star': { bg: B, draw: starCard },
  'moon': { bg: N, draw: moon },
  'sun': { bg: B2, draw: sun },
  'judgement': { bg: Y, draw: judgement },
  'world': { bg: P, draw: world },
};
