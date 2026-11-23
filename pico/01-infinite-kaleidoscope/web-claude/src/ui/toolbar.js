// The toolbar: one quiet pill of icon buttons. No words on screen.
import { ICONS } from './icons.js';
import { PALETTES } from '../core/palettes.js';

const MODE_LABELS = ['鏡 反射', '墨 暈染', '紋 干涉'];
const MODE_ICONS = ['mirror', 'ink', 'moire'];

function button(icon, label, cls = '') {
  const b = document.createElement('button');
  b.type = 'button';
  b.className = `dot ${cls}`.trim();
  b.setAttribute('aria-label', label);
  b.title = label;
  b.innerHTML = ICONS[icon] || '';
  // Mouse clicks should not leave focus behind (Space would re-trigger the button).
  b.addEventListener('pointerup', (e) => {
    if (e.pointerType !== 'keyboard') setTimeout(() => b.blur(), 0);
  });
  return b;
}

function swatch(p) {
  const s = document.createElement('span');
  s.className = 'swatch';
  s.style.background = p.paper;
  s.innerHTML = `<i style="background:${p.a}"></i><i style="background:${p.b}"></i><i style="background:${p.key}"></i><i style="background:${p.c}"></i><b style="background:${p.paper}"></b>`;
  return s;
}

export function createToolbar(root, actions) {
  root.innerHTML = '';

  const inks = document.createElement('div');
  inks.className = 'inks closed';
  inks.setAttribute('role', 'radiogroup');
  inks.setAttribute('aria-label', '油墨組');
  const inkButtons = PALETTES.map((p, i) => {
    const b = button('', `油墨 ${i + 1}`);
    b.setAttribute('role', 'radio');
    b.appendChild(swatch(p));
    b.addEventListener('click', () => {
      actions.palette(i);
      setInksOpen(false);
    });
    inks.appendChild(b);
    return b;
  });

  const bar = document.createElement('div');
  bar.className = 'bar';

  const modes = document.createElement('div');
  modes.className = 'modes group';
  modes.setAttribute('role', 'radiogroup');
  modes.setAttribute('aria-label', '模式');
  const slider = document.createElement('span');
  slider.className = 'slider';
  modes.appendChild(slider);
  const modeButtons = MODE_ICONS.map((icon, i) => {
    const b = button(icon, MODE_LABELS[i]);
    b.setAttribute('role', 'radio');
    b.addEventListener('click', () => actions.mode(i));
    modes.appendChild(b);
    return b;
  });

  const paletteBtn = button('', '換色', 'palette');
  paletteBtn.setAttribute('aria-haspopup', 'true');
  paletteBtn.addEventListener('click', () => setInksOpen(inks.classList.contains('closed')));
  const universeBtn = button('universe', '新宇宙');
  universeBtn.addEventListener('click', () => actions.universe());
  const saveBtn = button('save', '保存 PNG');
  saveBtn.addEventListener('click', () => actions.save());
  const linkBtn = button('link', '複製分享連結');
  linkBtn.addEventListener('click', () => actions.link());
  const motionBtn = button('pause', '靜止／流動');
  motionBtn.addEventListener('click', () => actions.motion());
  const fullBtn = button('expand', '全螢幕');
  fullBtn.addEventListener('click', () => actions.fullscreen());
  const picoBtn = button('knob', '連接 Pico 旋鈕', 'pico');
  picoBtn.dataset.status = 'idle';
  picoBtn.addEventListener('click', (e) => actions.pico({ any: e.shiftKey || e.altKey }));

  const sep = (extra = '') => {
    const s = document.createElement('span');
    s.className = `sep ${extra}`.trim();
    return s;
  };
  const group = (...els) => {
    const g = document.createElement('div');
    g.className = 'group';
    els.forEach((el) => g.appendChild(el));
    return g;
  };

  bar.append(
    modes,
    sep(),
    group(paletteBtn, universeBtn),
    sep('wrap'),
    group(saveBtn, linkBtn),
    sep(),
    group(motionBtn, ...(document.fullscreenEnabled ? [fullBtn] : [])),
  );
  if (actions.picoSupported) bar.append(sep(), picoBtn);
  root.append(inks, bar);

  function setInksOpen(open) {
    inks.classList.toggle('closed', !open);
    paletteBtn.setAttribute('aria-expanded', String(open));
  }
  document.addEventListener('pointerdown', (e) => {
    if (!inks.classList.contains('closed') && !inks.contains(e.target) && !paletteBtn.contains(e.target)) {
      setInksOpen(false);
    }
  });

  let knobAngle = 0;
  const notch = picoBtn.querySelector('.notch');

  return {
    root,
    get inksOpen() {
      return !inks.classList.contains('closed');
    },
    closeInks: () => setInksOpen(false),
    setMode(i) {
      modeButtons.forEach((b, j) => {
        b.classList.toggle('on', i === j);
        b.setAttribute('aria-checked', String(i === j));
      });
      const target = modeButtons[i];
      if (!slider.dataset.placed) {
        slider.style.transition = 'none';
        slider.dataset.placed = '1';
        requestAnimationFrame(() => requestAnimationFrame(() => (slider.style.transition = '')));
      }
      slider.style.transform = `translateX(${target.offsetLeft}px)`;
    },
    setPalette(i) {
      paletteBtn.querySelector('.swatch')?.remove();
      paletteBtn.appendChild(swatch(PALETTES[i]));
      inkButtons.forEach((b, j) => {
        b.classList.toggle('on', i === j);
        b.setAttribute('aria-checked', String(i === j));
      });
    },
    setMotion(on) {
      motionBtn.innerHTML = on ? ICONS.pause : ICONS.play;
    },
    setFullscreen(on) {
      fullBtn.innerHTML = on ? ICONS.shrink : ICONS.expand;
    },
    setPico(status) {
      picoBtn.dataset.status = status;
      const labels = {
        idle: '連接 Pico 旋鈕',
        connecting: '連接中',
        connected: 'Pico 已連接（點一下中斷）',
        lost: 'Pico 已拔除，插回會自動重連',
        error: '無法開啟裝置（可能被其他程式占用）',
      };
      picoBtn.title = labels[status] || '';
      picoBtn.setAttribute('aria-label', picoBtn.title);
      if (status === 'error') {
        picoBtn.classList.remove('shake');
        void picoBtn.offsetWidth;
        picoBtn.classList.add('shake');
      }
    },
    // The notch turns with the dial: one detent = 18°, like a 20-step KY-040.
    setKnob(detents) {
      const a = detents * 18;
      if (Math.abs(a - knobAngle) < 0.2) return;
      knobAngle = a;
      if (notch) notch.style.transform = `rotate(${a}deg)`;
    },
    setBusy(name, on) {
      const b = { save: saveBtn }[name];
      if (b) b.classList.toggle('busy', on);
    },
    flash(name) {
      const b = { link: linkBtn, save: saveBtn }[name];
      if (!b) return;
      const original = name === 'link' ? ICONS.link : ICONS.save;
      b.innerHTML = ICONS.check;
      clearTimeout(b._flash);
      b._flash = setTimeout(() => (b.innerHTML = original), 1300);
    },
    contains: (el) => root.contains(el),
  };
}
