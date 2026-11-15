/* 轉蛋演出：旋鈕 → 機器晃動 → 轉蛋滾出 → 跳到畫面中央 → 落地、搖晃 → 打開。
   約 3.5 秒；任何時候點一下、按 Enter／Esc 或按「跳過」都能直接看結果。Reduced Motion 時整段省略。 */
import { $, $$, el, reduced } from './util.js';
import { capsuleSVG, INK } from './art.js';
import { icon } from './icons.js';
import { sfx } from './sound.js';

export async function playGacha({ machine, color, onOpen }) {
  const layer = $('#gacha');
  layer.innerHTML = ''; layer.hidden = false;
  const scrim = layer.appendChild(el('div', { class: 'g-scrim' }));
  if (reduced()) { await onOpen(); layer.hidden = true; return; }

  let skipped = false;
  const anims = new Set(), waits = new Set();
  const A = (node, kf, opt) => {
    const an = node.animate(kf, { fill: 'forwards', ...opt });
    if (skipped) an.finish(); else anims.add(an);
    return an.finished.catch(() => {}).then(() => anims.delete(an));
  };
  const W = ms => (skipped ? Promise.resolve() : new Promise(res => {
    const done = () => { clearTimeout(t); waits.delete(done); res(); };
    const t = setTimeout(done, ms); waits.add(done);
  }));
  const skip = () => { if (skipped) return; skipped = true; anims.forEach(a => a.finish()); [...waits].forEach(f => f()); };
  const onKey = e => { if (['Escape', 'Enter', ' '].includes(e.key)) { e.preventDefault(); skip(); } };
  const skipBtn = layer.appendChild(el('button', { type: 'button', class: 'round g-skip', 'aria-label': '跳過動畫', html: icon('skip'), onclick: skip }));
  const arm = setTimeout(() => { layer.addEventListener('pointerdown', skip); document.addEventListener('keydown', onKey, true); }, 350);

  // 1. 旋鈕與機器
  const knob = $('.mc-knob', machine), svg = $('.mc', machine);
  sfx('knob');
  $$('.capj', machine).forEach((c, i) => A(c, [0, 1, 2, 3, 4].map(k => ({ transform: k === 4 ? 'none' : `translate(${(Math.sin(i * 7 + k * 3) * 5).toFixed(1)}px,${(-Math.abs(Math.cos(i * 5 + k * 2)) * 9).toFixed(1)}px) rotate(${(Math.sin(i + k) * 30).toFixed(0)}deg)` })), { duration: 900, easing: 'ease-in-out' }));
  A(svg, [{ transform: 'none' }, { transform: 'translateX(-3px) rotate(-.8deg)' }, { transform: 'translateX(3px) rotate(.8deg)' }, { transform: 'translateX(-2px) rotate(-.5deg)' }, { transform: 'translateX(2px) rotate(.4deg)' }, { transform: 'none' }], { duration: 900 });
  await A(knob, [{ transform: 'rotate(0deg)' }, { transform: 'rotate(205deg)', offset: 0.42 }, { transform: 'rotate(180deg)', offset: 0.55 }, { transform: 'rotate(372deg)', offset: 0.9 }, { transform: 'rotate(360deg)' }], { duration: 900, easing: 'ease-in-out' });
  await W(160);

  // 2. 轉蛋從出口滾出來
  const r = $('.mc-chute', machine).getBoundingClientRect();
  const S = Math.min(176, innerWidth * 0.46), s0 = (r.width * 0.66) / S;
  const cx0 = r.left + r.width / 2, cy0 = r.top + r.height / 2, tx = innerWidth / 2, ty = innerHeight * 0.45;
  const T = (x, y, rot, s) => `translate(${x - S / 2}px,${y - S / 2}px) rotate(${rot}deg) scale(${s})`;
  const cap = layer.appendChild(el('div', { class: 'g-cap', style: `width:${S}px;height:${S}px` }, el('div', { class: 'g-capin', html: capsuleSVG(color) })));
  const inner = cap.firstChild;
  sfx('drop');
  A(scrim, [{ opacity: 0 }, { opacity: 1 }], { duration: 700, delay: 200 });
  await A(cap, [{ transform: T(cx0, cy0 - 10, -30, s0), opacity: 0 }, { transform: T(cx0, cy0 + r.height * 0.1, 0, s0), opacity: 1, offset: 0.6 }, { transform: T(cx0, cy0 + r.height * 0.34, 20, s0), opacity: 1 }], { duration: 300, easing: 'ease-in' });
  await W(140);

  // 3. 跳到中央
  sfx('hop');
  await A(cap, [
    { transform: T(cx0, cy0 + r.height * 0.34, 20, s0), easing: 'cubic-bezier(.2,.7,.4,1)' },
    { transform: T((cx0 + tx) / 2, Math.min(cy0, ty) - innerHeight * 0.16, 200, (s0 + 1) / 2), easing: 'cubic-bezier(.6,0,.9,.5)' },
    { transform: T(tx, ty, 360, 1) }], { duration: 640 });
  sfx('land');
  await A(inner, [{ transform: 'scale(1.16,.84) translateY(8%)' }, { transform: 'scale(.93,1.07)' }, { transform: 'scale(1.03,.97)' }, { transform: 'none' }], { duration: 340, easing: 'ease-out' });

  // 4. 停一下，搖一搖
  await W(280);
  sfx('rattle');
  await A(inner, [{ transform: 'rotate(0)' }, { transform: 'rotate(-12deg)' }, { transform: 'rotate(11deg)' }, { transform: 'rotate(-7deg)' }, { transform: 'rotate(5deg)' }, { transform: 'rotate(0)' }], { duration: 560, easing: 'ease-in-out' });
  await W(200);

  // 5. 打開
  sfx('pop');
  const inks = [INK.pink, INK.blue, INK.yellow, INK.ink];
  for (let i = 0; i < 12; i++) {
    const ang = (i / 12) * Math.PI * 2 + 0.3, d = S * (0.75 + (i % 3) * 0.22), bit = layer.appendChild(el('i', { class: 'g-bit' + (i % 3 === 1 ? ' g-bit--sq' : ''), style: `left:${tx}px;top:${ty}px;background:${inks[i % 4]}` }));
    A(bit, [{ transform: 'translate(-50%,-50%) scale(.2)', opacity: 1 }, { transform: `translate(calc(-50% + ${Math.cos(ang) * d}px),calc(-50% + ${Math.sin(ang) * d}px)) scale(1) rotate(${i * 40}deg)`, opacity: 1, offset: 0.7 }, { transform: `translate(calc(-50% + ${Math.cos(ang) * d * 1.1}px),calc(-50% + ${Math.sin(ang) * d * 1.1 + 14}px)) scale(.6) rotate(${i * 60}deg)`, opacity: 0 }], { duration: 620, easing: 'cubic-bezier(.1,.8,.3,1)' });
  }
  A($('.cap-top', cap), [{ transform: 'none', opacity: 1 }, { transform: 'translateY(-78%) rotate(-26deg)', opacity: 0 }], { duration: 420, easing: 'cubic-bezier(.2,.8,.3,1)' });
  A($('.cap-bot', cap), [{ transform: 'none', opacity: 1 }, { transform: 'translateY(60%) rotate(8deg)', opacity: 0 }], { duration: 420, easing: 'cubic-bezier(.4,0,.8,.6)' });
  skipBtn.remove();
  await Promise.all([onOpen(skipped), W(640)]);

  clearTimeout(arm);
  layer.removeEventListener('pointerdown', skip); document.removeEventListener('keydown', onKey, true);
  layer.hidden = true; layer.innerHTML = '';
  [knob, svg, ...$$('.capj', machine)].forEach(n => n.getAnimations().forEach(a => a.cancel()));
}
