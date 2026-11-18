// NPC 頭像（手寫 SVG，原稿在 prototype/npc-faces/）。
// 動態由 npc.css 控制：.npc-eyes 眨眼；說話時 .npc-mouth-open / -closed 交替；開心時換成 .npc-happy。

// 隔壁桌常客：03A 原版（雙眼露出、微捲長髮、粉紅針織帽）
const regular = `
  <path d="M31 25 C20 24 14 32 18 41 C11 45 13 53 17 57
    C10 64 14 73 17 77 C10 85 14 94 21 97 C15 105 23 112 31 108
    C35 116 46 112 49 104 L73 104 C77 114 87 115 91 107
    C101 110 109 102 103 95 C111 89 107 80 103 76 C109 68 105 61 102 57
    C108 49 104 40 98 37 C101 28 91 21 84 25 C70 14 47 13 31 25 Z" fill="#302C29"/>
  <path d="M45 29 H75 Q94 29 94 48 V83 Q94 102 75 102
    H45 Q26 102 26 83 V48 Q26 29 45 29 Z" fill="#F3E3CF"/>
  <path d="M29 35 C36 29 46 31 49 38 C49 44 44 47 39 44
    C34 43 34 49 36 53 C29 54 25 47 29 42 C24 40 25 37 29 35 Z" fill="#302C29"/>
  <path d="M79 34 C87 29 96 34 94 41 C99 45 96 53 90 55
    C87 51 90 47 88 44 C84 47 79 44 80 40 C82 39 83 36 79 34 Z" fill="#302C29"/>
  <g fill="none" stroke="#62554E" stroke-width="1.8" stroke-linecap="round">
    <path d="M22 62 C18 68 25 71 21 77 C18 82 22 87 25 88"/>
    <path d="M98 62 C103 69 96 73 100 79 C104 85 98 90 96 93"/>
    <path d="M29 97 Q25 103 31 104"/>
    <path d="M86 102 Q90 107 94 102"/>
  </g>
  <path d="M27 31 Q25 12 42 10 L69 8 Q88 9 91 29 L93 38 L28 40 Z" fill="#D95A89"/>
  <path d="M25 28 Q57 23 94 29 L95 40 Q61 35 25 41 Z" fill="#FF8AB5"/>
  <g fill="none" stroke="#D95A89" stroke-width="2" stroke-linecap="round">
    <path d="M32 31 L32 36"/><path d="M39 30 L39 35"/><path d="M46 29 L46 34"/>
    <path d="M53 29 L53 34"/><path d="M60 29 L60 34"/>
  </g>
  <path d="M75 27 L84 29 L82 38 L73 36 Z" fill="#F7F4EE"/>
  <path d="M77 30 L81 31 L80 34 L76 33 Z" fill="#FFE800"/>
  <g fill="none" stroke="#24221F" stroke-width="2" stroke-linecap="round">
    <path d="M45 49 Q50 46 54 48"/>
    <path d="M66 48 Q71 46 75 49"/>
  </g>
  <g class="npc-eyes">
    <circle cx="50" cy="58" r="2.8" fill="#24221F"/>
    <circle cx="70" cy="58" r="2.8" fill="#24221F"/>
  </g>
  <g class="npc-happy" fill="none" stroke="#24221F" stroke-width="2.4" stroke-linecap="round">
    <path d="M46 60 Q50 54.5 54 60"/><path d="M66 60 Q70 54.5 74 60"/>
  </g>
  <path class="npc-mouth-closed" d="M55 72 Q61 77 67 70" fill="none" stroke="#24221F" stroke-width="2.4" stroke-linecap="round"/>
  <path class="npc-mouth-open" d="M54.5 71 Q60 83 65.5 71 Z" fill="#24221F"/>`;

// 絹印師傅：群青工作帽、花白鬢角、小灰鬍子（沒有嘴巴，說話時鬍子動）、臉頰一小塊藍墨
const master = `
  <path d="M20 70 C20 40 38 26 60 26 C82 26 100 40 100 70 C100 94 84 104 60 104 C36 104 20 94 20 70 Z" fill="#F3E3CF"/>
  <path d="M22 48 Q23 33 33 30 L32 46 L24 57 Z" fill="#A09E92"/>
  <path d="M88 30 Q98 35 98 48 L96 57 L88 46 Z" fill="#A09E92"/>
  <path d="M25 34 L29 20 Q32 9 57 9 Q82 7 89 20 L94 35 Z" fill="#253A80"/>
  <path d="M26 29 Q59 23 93 29 L94 40 Q60 35 25 41 Z" fill="#304CA6"/>
  <path d="M36 29 L38 34 L42 32 L41 27 Z" fill="#FF48B0"/>
  <path d="M79 31 L83 32 L82 36 L78 34 Z" fill="#FFE800"/>
  <path d="M84 75 Q89 72 92 76 L90 82 Q85 84 83 80 Z" fill="#304CA6"/>
  <circle cx="80" cy="84" r="1.5" fill="#304CA6"/>
  <g fill="none" stroke="#767366" stroke-width="2" stroke-linecap="round"><path d="M46 50 L54 50"/><path d="M66 50 L74 50"/></g>
  <g class="npc-eyes">
    <circle cx="50" cy="58" r="2.8" fill="#24221F"/>
    <circle cx="70" cy="58" r="2.8" fill="#24221F"/>
  </g>
  <g class="npc-happy" fill="none" stroke="#24221F" stroke-width="2.4" stroke-linecap="round">
    <path d="M46 60 Q50 54.5 54 60"/><path d="M66 60 Q70 54.5 74 60"/>
  </g>
  <g class="npc-moustache" fill="#8A877A">
    <path d="M59 69 C55 67 52 71 49 74 C53 77 58 76 59 72 Z"/>
    <path d="M61 69 C65 67 68 71 71 74 C67 77 62 76 61 72 Z"/>
  </g>`;

const FACES = { regular, master };

export function faceSVG(who) {
  return `<svg class="npc-face" viewBox="8 4 104 114" aria-hidden="true" focusable="false">${FACES[who] || ''}</svg>`;
}
