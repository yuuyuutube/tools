// 角落的 NPC：一顆頭加一個對話框。
// 原則：不擋流程。不用等它講完、不必點它才能繼續；講完自己收起來。
//   - 各站只呼叫 cue(事件名稱)，不需要知道是誰在講話；誰出場見 lines.js 的 CAST
//   - 手正按在紙上（拖網框、倒墨、刮印、攪墨）時不開口，放開後才講
//   - 操作的反應每一種只講一次；閒聊照順序講
//   - 點頭：正在講就跳下一句，沒在講就聊一句
//   - 發呆一陣子（沒碰畫面、也沒人講話），聊一句；每次進站最多一次
//   - 換站時同一個人還在：講到一半的話講完；換人：馬上收起來
import { LINES, CAST } from './lines.js';
import { faceSVG } from './faces.js';

const T = {
  enterDelay: 1200,   // 進站後多久開口 ms
  readBase: 1400,     // 一句話停留時間：基本
  readPerChar: 120,   //   每個字再加
  readMax: 6000,      //   最多
  afterPress: 450,    // 手放開後多久才開口
  hideAfter: 260,     // 最後一句講完，對話框淡出的時間（配合 npc.css）
  idle: 25000         // 發呆多久聊一句
};

let el = null, head, bubble, lineEl, moreEl;
let who = null, scene = null;    // 目前角落的角色、目前這一站
let entering = false, early = []; // 剛進站還沒開口時收到的反應，等進站的話講完再講
let queue = [];                  // 等著講的句子 { text, mood }
let speaking = false, held = false, pressing = false;
let timer = 0, mouthTimer = 0, enterTimer = 0, releaseTimer = 0;
let lastActive = performance.now(), idleDone = false;
const heard = new Set();         // 講過的：'enter:角色:站'、'cue:角色:事件'、'sequel:角色'
const chatAt = {};               // 每個角色講過幾段閒聊
const replayAt = {};             // 閒聊都講過之後，點頭重聽到第幾段

// scene：這句屬於哪一站（進站的話、操作的反應）；離開那一站就不講了。閒聊不分站，換站也會講完
const norm = (l, scene) => typeof l === 'string' ? { text: l, mood: '', scene } : { text: l.text, mood: l.mood || '', scene };
const readMs = s => Math.min(T.readMax, T.readBase + s.length * T.readPerChar);

export function mountNpc(parent = document.body) {
  el = document.createElement('div');
  el.className = 'npc';
  el.hidden = true;
  el.innerHTML = `
    <button class="npc-head" type="button"></button>
    <div class="npc-bubble" role="status" aria-live="polite"><span class="npc-line"></span><span class="npc-more" aria-hidden="true"></span></div>`;
  head = el.querySelector('.npc-head');
  bubble = el.querySelector('.npc-bubble');
  lineEl = el.querySelector('.npc-line');
  moreEl = el.querySelector('.npc-more');
  parent.appendChild(el);
  el.addEventListener('animationend', e => { if (e.animationName === 'npc-arrive') el.classList.remove('arrive'); });

  head.addEventListener('click', () => {
    if (!who) return;
    if (speaking && !held) { clearTimeout(timer); next(); }
    else if (!speaking) chat(true);
  });

  // 手按在紙上時先不講話
  window.addEventListener('pointerdown', e => {
    lastActive = performance.now();
    if (e.target.closest && e.target.closest('.sheet')) { pressing = true; clearTimeout(releaseTimer); }
  }, { capture: true, passive: true });
  window.addEventListener('keydown', () => { lastActive = performance.now(); }, { capture: true, passive: true });
  const release = () => {
    if (!pressing) return;
    pressing = false;
    if (held) { clearTimeout(releaseTimer); releaseTimer = setTimeout(() => { if (!pressing && held) { held = false; next(); } }, T.afterPress); }
  };
  window.addEventListener('pointerup', release, { capture: true, passive: true });
  window.addEventListener('pointercancel', release, { capture: true, passive: true });

  // 發呆：一陣子沒碰畫面、也沒人講話，就聊一句
  setInterval(() => {
    if (!who || speaking || idleDone || document.hidden) return;
    if (performance.now() - lastActive > T.idle) { idleDone = true; chat(false); }
  }, 1000);
}

// 換站：換人（或收起來），進站的台詞
export function npcScene(name) {
  if (!el) return;
  clearTimeout(enterTimer);
  scene = name;
  queue = queue.filter(l => !l.scene);   // 上一站的話不用講了
  idleDone = false;
  lastActive = performance.now();
  const next = CAST[name] || null;
  if (next !== who) {
    stop();
    who = next;
    el.hidden = !who;
    if (who) {
      head.innerHTML = faceSVG(who);
      head.setAttribute('aria-label', LINES[who].name);
      el.dataset.who = who;
      el.classList.remove('arrive'); void el.offsetWidth; el.classList.add('arrive');
    }
  }
  if (!who) return;
  const set = LINES[who];
  entering = true;
  early = [];
  enterTimer = setTimeout(() => {
    entering = false;
    const id = `enter:${who}:${name}`, sq = set.sequel;
    if (set.enter?.[name] && !heard.has(id)) { heard.add(id); speak(set.enter[name], name); }
    else if (sq && sq.scene === name && (chatAt[who] || 0) >= sq.after && !heard.has('sequel:' + who)) {
      heard.add('sequel:' + who); speak(sq.lines, name);
    }
    for (const lines of early) speak(lines, name);
    early = [];
  }, T.enterDelay);
}

// 各站的事件。'idle'：站裡有等待的空檔（例如等乾），可以閒聊；有聊到才回傳 true
export function cue(key) {
  if (!el || !who) return false;
  if (key === 'idle') {
    if (speaking || entering) return false;
    const before = chatAt[who] || 0;
    chat(false);
    return (chatAt[who] || 0) > before;
  }
  let c = LINES[who].cues?.[key];
  if (!c) return;
  if (!Array.isArray(c)) {
    if (c.after && !heard.has(`cue:${who}:${c.after}`)) return;
    c = c.lines;
  }
  const id = `cue:${who}:${key}`;
  if (heard.has(id)) return;
  heard.add(id);
  if (entering) early.push(c); else speak(c, scene);
}

// 閒聊：照順序講。自己開口的只講還沒講過的；點頭的話，講完一輪再從頭
function chat(asked) {
  const list = LINES[who].chat || [];
  const n = chatAt[who] || 0;
  if (n < list.length) { chatAt[who] = n + 1; speak(list[n]); return; }
  if (!asked) return;
  if (!list.length) { hop(); return; }
  replayAt[who] = ((replayAt[who] ?? -1) + 1) % list.length;
  speak(list[replayAt[who]]);
}

function speak(lines, from = null) {
  queue.push(...lines.map(l => norm(l, from)));
  if (!speaking) { speaking = true; next(); }
}

function next() {
  clearTimeout(timer);
  if (!queue.length) { finish(); return; }
  if (pressing) { held = true; return; }
  const l = queue.shift();
  lineEl.textContent = l.text;
  moreEl.hidden = !queue.length;
  el.dataset.mood = l.mood;
  bubble.classList.remove('in'); void bubble.offsetWidth; bubble.classList.add('in');
  hop();
  head.classList.add('talking');
  clearTimeout(mouthTimer);
  mouthTimer = setTimeout(() => head.classList.remove('talking'), 260 + l.text.length * 70);
  timer = setTimeout(next, readMs(l.text));
}

function finish() {
  speaking = false;
  lastActive = performance.now();   // 剛講完話，發呆從現在算
  bubble.classList.remove('in');
  timer = setTimeout(() => { if (!speaking) el.dataset.mood = ''; }, T.hideAfter);
}

function stop() {
  clearTimeout(timer); clearTimeout(enterTimer); clearTimeout(mouthTimer); clearTimeout(releaseTimer);
  queue = []; early = []; speaking = false; held = false; entering = false;
  if (!el) return;
  bubble.classList.remove('in');
  head.classList.remove('talking');
  el.dataset.mood = '';
}

function hop() {
  head.classList.remove('hop'); void head.offsetWidth; head.classList.add('hop');
}
