/* 原創動物插畫：大色塊、小圓點眼睛，Riso 油墨色；疊色處以相乘呈現（像兩色疊印）。
   每隻都畫在 200×200 的同一個框裡，視覺重心固定在中間偏下，換動物時畫面不會跳。
   可動的部位有 class，動畫寫在 CSS（海報輸出時不會動，也不需要 CSS）。 */
export const INK = '#24221F', PAPER = '#FBFAF6', BLUE = '#0078BF', PINK = '#FF48B0',
  YELLOW = '#FFE800', ORANGE = '#FF6C2F', GREEN = '#00A95C';

const M = 'style="mix-blend-mode:multiply"';
let uid = 0;

const DRAW = {
  whale: () => `
    <g class="a-spout">
      <circle cx="66" cy="50" r="4.5" fill="${BLUE}"/><circle cx="55" cy="40" r="3.5" fill="${BLUE}"/><circle cx="77" cy="39" r="3.5" fill="${BLUE}"/>
    </g>
    <g class="a-tail">
      <path d="M140 122 C156 114 166 102 170 88 C162 84 156 76 156 66 C165 69 171 75 175 82 C177 73 183 67 192 64 C191 75 185 84 178 90 C176 106 166 120 150 132 Z" fill="${BLUE}"/>
    </g>
    <path d="M28 118 C28 82 60 66 98 66 C136 66 156 90 160 112 C163 128 158 140 144 146 C118 156 70 156 46 148 C34 143 28 132 28 118 Z" fill="${BLUE}"/>
    <path d="M40 130 C62 146 118 150 152 132 C148 148 120 156 82 156 C60 155 44 146 40 130 Z" fill="${PINK}" ${M}/>
    <circle class="a-eye" cx="60" cy="108" r="3.4" fill="${INK}"/>
    <path d="M44 122 Q52 127 60 123" fill="none" stroke="${INK}" stroke-width="2.4" stroke-linecap="round"/>`,

  elephant: () => `
    <path d="M168 112 Q176 124 172 134" fill="none" stroke="${INK}" stroke-width="2.6" stroke-linecap="round"/>
    <path d="M64 160 L64 112 C64 86 86 72 114 72 C144 72 166 90 166 116 L166 160 L146 160 L146 140 L86 140 L86 160 Z" fill="${PINK}"/>
    <circle cx="62" cy="96" r="31" fill="${PINK}"/>
    <path d="M40 104 C30 122 30 142 40 152 C45 157 53 154 50 147 C43 136 46 122 54 112 Z" fill="${PINK}"/>
    <g class="a-ear"><path d="M74 72 C94 66 106 82 104 102 C102 120 88 128 76 118 Z" fill="${BLUE}" ${M}/></g>
    <circle class="a-eye" cx="52" cy="90" r="3.4" fill="${INK}"/>`,

  bear: () => `
    <circle cx="72" cy="62" r="13" fill="${ORANGE}"/><circle cx="128" cy="62" r="13" fill="${ORANGE}"/>
    <circle cx="72" cy="62" r="6" fill="${PINK}" ${M}/><circle cx="128" cy="62" r="6" fill="${PINK}" ${M}/>
    <ellipse cx="100" cy="138" rx="46" ry="26" fill="${ORANGE}"/>
    <circle cx="100" cy="94" r="38" fill="${ORANGE}"/>
    <ellipse cx="100" cy="142" rx="22" ry="15" fill="#F7EBDD"/>
    <ellipse cx="100" cy="106" rx="16" ry="12" fill="#F7EBDD"/>
    <ellipse cx="100" cy="100" rx="5" ry="3.6" fill="${INK}"/>
    <path d="M100 103 L100 108" stroke="${INK}" stroke-width="2.2" stroke-linecap="round"/>
    <g class="a-blink"><circle cx="85" cy="88" r="3.4" fill="${INK}"/><circle cx="115" cy="88" r="3.4" fill="${INK}"/></g>`,

  cat: () => `
    <path class="a-tail" d="M126 152 C150 152 160 130 148 114" fill="none" stroke="${YELLOW}" stroke-width="10" stroke-linecap="round"/>
    <path d="M70 160 C66 128 76 104 100 104 C124 104 134 128 130 160 Z" fill="${YELLOW}"/>
    <path class="a-ear-l" d="M74 72 L78 42 L98 60 Z" fill="${YELLOW}"/>
    <path class="a-ear-r" d="M126 72 L122 42 L102 60 Z" fill="${YELLOW}"/>
    <rect x="70" y="56" width="60" height="52" rx="26" fill="${YELLOW}"/>
    <path d="M80 62 L81 50 L90 59 Z" fill="${PINK}" ${M}/><path d="M120 62 L119 50 L110 59 Z" fill="${PINK}" ${M}/>
    <path d="M86 130 Q100 140 114 130 L114 160 L86 160 Z" fill="${ORANGE}" ${M}/>
    <g class="a-blink"><circle cx="89" cy="80" r="3.2" fill="${INK}"/><circle cx="111" cy="80" r="3.2" fill="${INK}"/></g>
    <path d="M96 88 L104 88 L100 93 Z" fill="${PINK}"/>`,

  bird: () => `
    <g class="a-hop">
      <path d="M94 142 L94 158 M106 142 L106 158" stroke="${INK}" stroke-width="2.6" stroke-linecap="round"/>
      <path d="M128 104 L158 90 L150 116 Z" fill="${BLUE}"/>
      <circle cx="100" cy="110" r="36" fill="${BLUE}"/>
      <path d="M68 104 L50 111 L68 118 Z" fill="${YELLOW}"/>
      <g class="a-wing"><path d="M96 112 C112 104 132 110 136 124 C120 132 104 128 96 112 Z" fill="${PINK}" ${M}/></g>
      <circle class="a-eye" cx="82" cy="100" r="3.4" fill="${INK}"/>
    </g>`,

  bee: () => {
    const id = 'bee' + (++uid);
    return `
    <g class="a-float">
      <path d="M78 92 Q72 76 62 72 M90 90 Q90 74 82 66" fill="none" stroke="${INK}" stroke-width="2.4" stroke-linecap="round"/>
      <g class="a-wing">
        <ellipse cx="96" cy="78" rx="15" ry="24" transform="rotate(-24 96 78)" fill="${BLUE}" opacity=".55" ${M}/>
        <ellipse cx="118" cy="80" rx="13" ry="21" transform="rotate(18 118 80)" fill="${BLUE}" opacity=".55" ${M}/>
      </g>
      <path d="M134 112 L148 112 L134 120 Z" fill="${INK}"/>
      <clipPath id="${id}"><ellipse cx="102" cy="114" rx="36" ry="27"/></clipPath>
      <ellipse cx="102" cy="114" rx="36" ry="27" fill="${YELLOW}"/>
      <g clip-path="url(#${id})" fill="${INK}"><rect x="96" y="80" width="10" height="70"/><rect x="116" y="80" width="10" height="70"/></g>
      <circle class="a-eye" cx="80" cy="108" r="3.4" fill="${INK}"/>
    </g>`;
  },

  mosquito: () => `
    <g class="a-buzz">
      <g class="a-wing">
        <ellipse cx="116" cy="84" rx="9" ry="28" transform="rotate(-30 116 84)" fill="${PINK}" opacity=".7" ${M}/>
        <ellipse cx="128" cy="88" rx="8" ry="24" transform="rotate(14 128 88)" fill="${PINK}" opacity=".7" ${M}/>
      </g>
      <path d="M96 116 Q88 136 80 156 M108 118 Q108 138 102 158 M120 118 Q130 138 132 158 M98 114 Q70 128 58 148" fill="none" stroke="${INK}" stroke-width="2.2" stroke-linecap="round"/>
      <ellipse cx="132" cy="110" rx="30" ry="10" transform="rotate(12 132 110)" fill="${GREEN}"/>
      <ellipse cx="102" cy="108" rx="13" ry="11" fill="${INK}"/>
      <circle cx="80" cy="100" r="11" fill="${INK}"/>
      <path d="M72 106 L50 122" stroke="${INK}" stroke-width="2.4" stroke-linecap="round"/>
      <circle cx="76" cy="97" r="2.6" fill="${PAPER}"/>
    </g>`,
};

export const ANIMALS = Object.keys(DRAW);

export function animalSVG(id, { size, xmlns = false, box = '0 0 200 200', w, h } = {}) {
  const wh = size ? ` width="${size}" height="${size}"` : (w ? ` width="${w}" height="${h}"` : '');
  const ns = xmlns ? ' xmlns="http://www.w3.org/2000/svg"' : '';
  return `<svg class="animal a-${id}" viewBox="${box}"${wh}${ns} aria-hidden="true" focusable="false"><g class="body">${DRAW[id]()}</g></svg>`;
}

/* 實際畫到的範圍（海報用來把每隻動物放到一樣的大小） */
const boxes = {};
export function animalBox(id) {
  if (boxes[id]) return boxes[id];
  const holder = document.createElement('div');
  holder.style.cssText = 'position:absolute;left:-9999px;top:0;width:200px;height:200px;visibility:hidden';
  holder.innerHTML = animalSVG(id, { size: 200 });
  document.body.appendChild(holder);
  const b = holder.querySelector('.body').getBBox();
  holder.remove();
  return (boxes[id] = { x: b.x, y: b.y, w: b.width, h: b.height });
}

/* 白旗：網站的核心識別 */
export function flagSVG({ size = 24, color = INK, cloth = PAPER, xmlns = false } = {}) {
  const ns = xmlns ? ' xmlns="http://www.w3.org/2000/svg"' : '';
  return `<svg class="flag" viewBox="0 0 24 24" width="${size}" height="${size}"${ns} aria-hidden="true" focusable="false">
    <path d="M5 2.5 V22" stroke="${color}" stroke-width="2" stroke-linecap="round"/>
    <path class="flag-cloth" d="M6 4 C9 2.6 11.5 5.4 14.5 4 C16.5 3.1 18 3 19.5 3.6 V12.6 C18 12 16.5 12.1 14.5 13 C11.5 14.4 9 11.6 6 13 Z" fill="${cloth}" stroke="${color}" stroke-width="1.6" stroke-linejoin="round"/>
  </svg>`;
}
