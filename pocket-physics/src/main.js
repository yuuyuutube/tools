import { SingingLiquid } from './liquid.js';
import { liquidMarkup, liquidNotes } from './liquid-view.js';
import { ReverseHourglass } from './hourglass.js';
import { UnbreakableBubble } from './bubble.js';
import { bubbleMarkup, bubbleNotes } from './bubble-view.js';
import { FourthDimensionMirror } from './mirror.js';
import { mirrorMarkup, mirrorNotes } from './mirror-view.js';

const shell = document.querySelector('.app-shell');
const originalRoom = document.querySelector('#exhibit-room'), originalFooter = document.querySelector('.footer');
const notesBody = document.querySelector('.notes-body');
const hourglassNotes = notesBody.innerHTML;
const initialSurface = document.createElement('section');
initialSurface.className = 'exhibit-surface';
shell.append(initialSurface); initialSurface.append(originalRoom, originalFooter);

// One retained surface and independent controller per exhibit. Only the active surface is attached.
const exhibits = new Map([
  ['hourglass', { title: '反重力沙漏', theme: '#f4f5f8', notes: hourglassNotes, create: root => new ReverseHourglass(root), surface: initialSurface }],
  ['bubble', { title: '不破的泡泡', theme: '#eef8f5', notes: bubbleNotes, markup: bubbleMarkup, create: root => new UnbreakableBubble(root) }],
  ['mirror', { title: '四維鏡子', theme: '#263462', notes: mirrorNotes, markup: mirrorMarkup, create: root => new FourthDimensionMirror(root) }],
  ['liquid', { title: '聲音液體', theme: '#edf6fc', notes: liquidNotes, markup: liquidMarkup, create: root => new SingingLiquid(root) }]
]);
const cache = new Map();
let current, currentId;
const nextExhibit = id => { const ids=[...exhibits.keys()];return ids[(ids.indexOf(id)+1)%ids.length]; };

function selectExhibit(id, push = false) {
  if (!exhibits.has(id)) id = 'hourglass';
  if (id === currentId) return;
  const config = exhibits.get(id);
  current?.controller.setActive(false); current?.surface.remove();
  if (!cache.has(id)) {
    const surface = config.surface || document.createElement('section');
    surface.className = 'exhibit-surface';
    if (config.markup) surface.innerHTML = config.markup;
    shell.append(surface);
    try {
      const controller = config.create(surface);
      controller.mount(); cache.set(id, { surface, controller });
    } catch (error) {
      const message = document.createElement('p'); message.className = 'canvas-error';
      message.textContent = '目前無法啟動藏品，請更新瀏覽器後重新整理。';
      surface.querySelector('#artwork').append(message); console.error(error); return;
    }
  }
  current = cache.get(id); currentId = id;
  shell.append(current.surface);
  document.documentElement.dataset.exhibit = id;
  document.title = `Pocket Physics — ${config.title}`;
  document.querySelector('meta[name="theme-color"]').content = config.theme;
  notesBody.innerHTML = config.notes;
  document.querySelectorAll('button[data-exhibit]').forEach(entry => {
    if (entry.dataset.exhibit === id) entry.setAttribute('aria-current', 'page'); else entry.removeAttribute('aria-current');
  });
  document.querySelector('#next-exhibit').setAttribute('aria-label', `切換至${exhibits.get(nextExhibit(id)).title}`);
  if (push) history.pushState(null, '', `#${id}`);
  current.controller.setActive(!document.querySelector('dialog[open]'));
}

initialSurface.remove();
selectExhibit(location.hash.slice(1) || 'hourglass');
window.addEventListener('hashchange', () => selectExhibit(location.hash.slice(1)));
document.querySelector('#next-exhibit').addEventListener('click', () => selectExhibit(nextExhibit(currentId), true));
for (const [triggerId, dialogId] of [['notes-open', 'notes-dialog'], ['collection-open', 'collection-dialog']]) {
  const trigger = document.getElementById(triggerId), dialog = document.getElementById(dialogId);
  trigger.addEventListener('click', () => { current?.controller.setActive(false); dialog.showModal(); });
  dialog.querySelector('[data-close]').addEventListener('click', () => dialog.close());
  dialog.addEventListener('click', event => {
    if (event.target !== dialog) return;
    const r = dialog.getBoundingClientRect();
    if (event.clientX < r.left || event.clientX > r.right || event.clientY < r.top || event.clientY > r.bottom) dialog.close();
  });
  dialog.addEventListener('close', () => { current?.controller.setActive(true); trigger.focus({ preventScroll: true }); });
}
document.querySelectorAll('.exhibit-entry').forEach(entry => entry.addEventListener('click', () => {
  selectExhibit(entry.dataset.exhibit, true); document.getElementById('collection-dialog').close();
}));
window.addEventListener('pagehide', () => current?.controller.setActive(false));
window.addEventListener('pageshow', () => current?.controller.setActive(!document.querySelector('dialog[open]')));
window.addEventListener('beforeunload', () => { for (const entry of cache.values()) entry.controller.dispose(); }, { once: true });

if (new URLSearchParams(location.search).has('qa') && current) {
  const file = currentId === 'liquid' ? '../dev/liquid-checks.js' : currentId === 'mirror' ? '../dev/mirror-checks.js' : currentId === 'bubble' ? '../dev/bubble-checks.js' : '../dev/browser-checks.js';
  import(file).then(module => module.runBrowserChecks(current.controller, { selectExhibit, cache, getCurrent: () => current }));
}
