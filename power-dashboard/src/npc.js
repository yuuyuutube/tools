// NPC 台詞庫與全域排程器。每句台詞都有條件，條件只看真實（或明確標示的展示）資料狀態。
// 同時最多一段對話；一般對話間隔 18–34 秒；事件優先；同一句 15 分鐘內不重複。

const on = s => s === 'low' || s === 'normal' || s === 'high';

/** 角色設定（docs/ART_SPEC.md 有完整個性說明） */
export const CAST = {
  gas: { name: '球球', role: '燃氣廠的儲氣球' },
  coal: { name: '炭伯', role: '燃煤廠的老煤塊' },
  solar: { name: '小晴', role: '太陽能廠的向日葵' },
  wind: { name: '阿颯', role: '風力廠的風向袋' },
  hydro: { name: '滴滴', role: '水力廠小水滴工程師' },
  other: { name: '博士', role: '能源工坊發明家' },
};

/**
 * 回傳目前可以說的台詞。每筆：{ id, kind, weight, lines: [{ plant, text, mood }] }
 * kind：daily（日常）、data（資料）、tip（節電）、duo（跨廠）、event（事件）
 */
export function candidates(ctx) {
  const P = ctx.plants, out = [];
  const add = (id, kind, lines, weight = 1) => out.push({ id, kind, weight, lines: Array.isArray(lines[0]) ? lines.map(([plant, text, mood]) => ({ plant, text, mood })) : [{ plant: lines[0], text: lines[1], mood: lines[2] }] });
  const st = p => P[p]?.state;

  // 資料過期或缺失：大家照常工作，但不談數字
  if (ctx.fresh === 'stale' || ctx.fresh === 'gone') {
    add('stale-1', 'data', ['gas', '最新的數字還沒送來，我們先照常顧機器。', 'think']);
    add('stale-2', 'data', ['other', '資料快遞好像塞車了，等等再看看。', 'think']);
    add('stale-3', 'data', ['coal', '老規矩：沒收到新數字，就不亂報。', 'calm']);
    return out;
  }
  for (const p of Object.keys(P)) if (st(p) === 'missing') add(`missing-${p}`, 'data', [p, '我的數字暫時沒收到，先別當成零喔。', 'think']);

  // ---- 燃氣 ----
  if (on(st('gas'))) {
    add('gas-1', 'daily', ['gas', '今天也有好多工作要做呢！', 'happy']);
    add('gas-2', 'daily', ['gas', '呼～先把這一批電送出去！', 'happy']);
    add('gas-3', 'daily', ['gas', '渦輪轉得剛剛好，我來擦擦儀表。', 'calm']);
    if (P.gas.rank === 1) add('gas-r1', 'data', ['gas', '大家都在用電，我可不能偷懶！', 'happy'], 1.4);
    if (st('gas') === 'high') add('gas-h', 'data', ['gas', '機器全速運轉中，我的閥門都轉起來了！', 'happy'], 1.3);
    if (st('gas') === 'low') add('gas-l', 'data', ['gas', '今天比較輕鬆，我在管線旁邊滾一滾。', 'calm'], 1.2);
  }
  // ---- 燃煤 ----
  if (on(st('coal'))) {
    add('coal-1', 'daily', ['coal', '老機器也是很可靠的！', 'calm']);
    add('coal-2', 'daily', ['coal', '讓我看看今天的工作量……', 'think']);
    add('coal-3', 'daily', ['coal', '這個時代變化真快呀。', 'calm']);
    add('coal-4', 'daily', ['coal', '輸送帶的聲音，聽了幾十年還是很安心。', 'calm']);
    if (st('coal') === 'high') add('coal-h', 'data', ['coal', '今天機組幾乎都在線上，老骨頭也動起來了。', 'happy'], 1.2);
  }
  // ---- 太陽能 ----
  if (on(st('solar'))) {
    if (!ctx.night) add('solar-1', 'data', ['solar', '太陽出來啦！開工開工！', 'happy'], 1.3);
    add('solar-2', 'daily', ['solar', '我跟面板一起朝著太陽！', 'happy']);
    if (st('solar') === 'high') add('solar-h', 'data', ['solar', '我今天超有精神！', 'happy'], 1.4);
    // 只說「發電比較少」，不推測雲量：全台發電量不代表任何地點的天氣
    if (st('solar') === 'low' && !ctx.night && ctx.hour >= 10 && ctx.hour < 14) add('solar-l', 'data', ['solar', '中午了，這時段的發電比我想像的少一點呢。', 'think'], 1.2);
    if (ctx.hour >= 16 && st('solar') !== 'off') add('solar-eve', 'data', ['solar', '太陽慢慢下班了，我也快收工囉。', 'sleepy'], 1.2);
  }
  if (st('solar') === 'off') {
    if (ctx.night) {
      add('solar-n1', 'data', ['solar', '我今天下班了，明天見！', 'sleepy'], 1.5);
      add('solar-n2', 'data', ['solar', 'Zzz……花瓣收起來了……', 'sleep']);
    } else add('solar-o', 'data', ['solar', '現在先待命，太陽來了就開工。', 'calm']);
  }
  // ---- 風力 ----
  if (on(st('wind'))) {
    add('wind-1', 'daily', ['wind', '轉呀轉呀轉～', 'happy']);
    if (st('wind') === 'high') add('wind-h', 'data', ['wind', '今天風很賞臉呢！', 'happy'], 1.5);
    if (st('wind') === 'low') {
      add('wind-l1', 'data', ['wind', '風去哪裡了……', 'think'], 1.4);
      add('wind-l2', 'data', ['wind', '今天先慢慢來。', 'calm'], 1.2);
    }
    if (st('wind') === 'normal') add('wind-n', 'data', ['wind', '風車今天轉得剛剛好。', 'calm']);
  }
  if (st('wind') === 'off') add('wind-o', 'data', ['wind', '風車都在休息，我也垂下來發個呆。', 'calm']);
  // ---- 水力 ----
  if (on(st('hydro'))) {
    add('hydro-1', 'daily', ['hydro', '慢慢流，也可以很努力。', 'calm']);
    add('hydro-2', 'daily', ['hydro', '今天的工作很順利。', 'happy']);
    add('hydro-3', 'daily', ['hydro', '水流的節奏真舒服呀。', 'calm']);
    if (P.hydro.share !== null && P.hydro.share < .02) add('hydro-s', 'data', ['hydro', '我的份量不多，但隨時都能幫忙。', 'calm'], 1.1);
  }
  if (st('hydro') === 'off') add('hydro-o', 'data', ['hydro', '今天先待命，有需要我隨時上場。', 'calm']);
  // ---- 工坊 ----
  if (on(st('other'))) {
    add('other-1', 'daily', ['other', '除了那五位，我這裡還有不少幫手！', 'happy']);
    add('other-2', 'daily', ['other', '能源的世界可是很複雜的。', 'think']);
    add('other-3', 'daily', ['other', '今天來看看誰在工作吧！', 'happy']);
    if ((P.other.components?.storage?.mw ?? 0) > 50) add('other-st', 'data', ['other', '儲能罐正在放電，幫大家補一點！', 'happy'], 1.3);
    if ((P.other.components?.nuclear?.mw ?? 0) > 0) add('other-nu', 'data', ['other', '核能罐也在運轉喔。', 'calm'], 1.2);
  }
  if (ctx.charging) add('other-ch', 'data', ['other', '電池正在充電，晚一點再上場幫忙！', 'happy'], 1.3);

  // ---- 跨廠 ----
  if (st('solar') === 'high' && (st('wind') === 'low' || st('wind') === 'off')) add('duo-sw', 'duo', [['solar', '我今天超有精神！', 'happy'], ['wind', '真好……我這邊還在等風。', 'think']], 2);
  if (st('wind') === 'high' && st('solar') === 'off' && ctx.night) add('duo-ws', 'duo', [['wind', '晚上換我們撐場面！', 'happy'], ['gas', '風力那邊今晚好賣力。', 'happy']], 2);
  if (P.gas.rank === 1 && on(st('coal'))) add('duo-gc', 'duo', [['coal', '燃氣，你今天又是第一名啊。', 'calm'], ['gas', '沒辦法，大家都在用電嘛！', 'happy']], 1.5);
  if (on(st('solar')) && (P.solar.share ?? 0) > .15 && on(st('coal'))) add('duo-sc', 'duo', [['coal', '太陽能那邊一開工，我們也輕鬆一點。', 'calm'], ['solar', '炭伯，中午就交給我吧！', 'happy']], 1.5);
  if (st('hydro') === 'low' && (P.other.components?.storage?.mw ?? 0) > 50) add('duo-ho', 'duo', [['hydro', '今天我先慢慢流。', 'calm'], ['other', '沒關係，儲能罐這邊在幫忙。', 'happy']], 1.4);
  if (ctx.charging && on(st('solar'))) add('duo-ch', 'duo', [['other', '小晴，多出來的電我先存起來喔！', 'happy'], ['solar', '好！晚上就換你了。', 'happy']], 1.6);
  if (on(st('wind')) && on(st('hydro'))) add('duo-wh', 'duo', [['wind', '滴滴，你那邊水聲好好聽。', 'calm'], ['hydro', '你的風車也轉得很好看。', 'happy']]);

  // ---- 節電提醒：只依官方燈號決定語氣，不自己預測缺電 ----
  const light = ctx.light;
  if (light && !light.tight) {
    add('tip-1', 'tip', ['gas', '冷氣設定高一點點，也能省一些電喔！', 'happy']);
    add('tip-2', 'tip', ['coal', '沒用到的燈記得關掉！', 'calm']);
    add('tip-3', 'tip', ['hydro', '出門前，看看有沒有忘記關的電器！', 'calm']);
    add('tip-4', 'tip', ['other', '待機的電器，拔掉插頭也是一種發明。', 'think']);
  }
  if (light?.tight) {
    const hours = ctx.peakHours ? `${ctx.peakHours}` : '尖峰時段';
    add('tip-t1', 'tip', ['gas', `台電預估今天尖峰是「${light.label || light.code}」，${hours}可以的話少開幾樣電器。`, 'think'], 2);
    add('tip-t2', 'tip', ['coal', `官方燈號是「${light.label || light.code}」，尖峰時段大家一起省一點電吧。`, 'calm'], 2);
  }
  return out;
}

/** 事件 → 台詞（只在 detectEvents 實際偵測到時才說） */
export function eventLines(ev) {
  const T = {
    gas: '燃氣', coal: '燃煤', solar: '太陽能', wind: '風力', hydro: '水力', other: '工坊',
  };
  switch (ev.type) {
    case 'shareUp': return { id: ev.key, kind: 'event', lines: [{ plant: ev.plant, text: ({ gas: '這一小時我的份量變多了，加油！', coal: '最近一小時，老機器多扛了一點。', solar: '一小時內我的占比上升了！', wind: '風力占比上升中，轉呀轉～', hydro: '水力這一小時多出了一點力！', other: '工坊最近一小時忙起來了！' })[ev.plant], mood: 'happy', jump: true }] };
    case 'drop': return { id: ev.key, kind: 'event', lines: [{ plant: ev.plant, text: ev.plant === 'solar' ? '發電慢慢降下來了。' : '我這邊的發電量降下來了，依調度慢慢來。', mood: 'think' }] };
    case 'solarRest': return { id: ev.key, kind: 'event', lines: [{ plant: 'solar', text: '今天辛苦啦，太陽能收工！', mood: 'sleepy' }, { plant: 'wind', text: '小晴晚安～', mood: 'happy' }] };
    case 'solarWake': return { id: ev.key, kind: 'event', lines: [{ plant: 'solar', text: '早安！太陽能開工！', mood: 'happy', jump: true }] };
    case 'light': return { id: ev.key, kind: 'event', lines: [{ plant: 'other', text: '台電更新了今天的預估尖峰燈號，大家看一下上面的牌子！', mood: 'think', jump: true }] };
    case 'loadHigh': return { id: ev.key, kind: 'event', lines: [{ plant: 'gas', text: '目前用電是今天觀測以來最高的時候，大家辛苦了！', mood: 'happy', jump: true }] };
    default: return null;
  }
}

/** 一句話要停留多久：中文字數 × 0.2 秒，至少 3.8 秒 */
export const readTime = text => Math.max(3800, [...text].length * 200 + 1600);

export class Scheduler {
  constructor({ now = () => Date.now(), random = Math.random, gap = [18000, 34000], cooldown = 15 * 60000 } = {}) {
    this.now = now; this.random = random; this.gap = gap; this.cooldown = cooldown;
    this.said = new Map(); this.queue = []; this.current = null; this.next = now() + 6000; this.recentPlants = [];
  }
  /** 事件優先，插到佇列最前；同一事件只說一次 */
  push(dialog) { if (dialog && !this.said.has(dialog.id) && !this.queue.some(d => d.id === dialog.id)) this.queue.push(dialog); }
  /** 立即讓某位角色說話（點擊角色時）；仍然遵守「同時一段」 */
  poke(plant, list) {
    const pool = list.filter(d => d.lines.length === 1 && d.lines[0].plant === plant);
    // 使用者主動點的：都說過了就挑最久以前說的那句，不讓角色沒反應
    const pick = this.choose(pool) || pool.sort((a, b) => (this.said.get(a.id) ?? 0) - (this.said.get(b.id) ?? 0))[0] || null;
    if (!pick) return null;
    this.current = null; this.said.set(pick.id, this.now());
    return pick;
  }
  choose(pool) {
    const t = this.now();
    const fresh = pool.filter(d => !(t - (this.said.get(d.id) ?? -Infinity) < this.cooldown));
    const list = fresh.length ? fresh : [];
    if (!list.length) return null;
    // 避免同一位角色連續說話
    const weighted = list.map(d => ({ d, w: d.weight * (this.recentPlants.includes(d.lines[0].plant) ? .35 : 1) * (d.kind === 'tip' ? .5 : 1) }));
    let r = this.random() * weighted.reduce((s, x) => s + x.w, 0);
    for (const x of weighted) { r -= x.w; if (r <= 0) return x.d; }
    return weighted[weighted.length - 1].d;
  }
  /** 每次呼叫回傳應該開始的對話（或 null）。busy 時（上一段還沒說完）回傳 null */
  tick(list, busy) {
    const t = this.now();
    // 事件不必等完整的間隔，但仍要等上一段說完後 3 秒
    const ready = t >= this.next || (this.queue.length && t >= (this.endAt ?? 0) + 3000);
    if (busy || !ready) return null;
    const pick = this.queue.shift() || this.choose(list);
    if (!pick) { this.next = t + 8000; return null; }
    this.said.set(pick.id, t);
    for (const l of pick.lines) { this.recentPlants.unshift(l.plant); }
    this.recentPlants = this.recentPlants.slice(0, 2);
    const talk = pick.lines.reduce((s, l) => s + readTime(l.text) + 600, 0);
    this.endAt = t + talk;
    this.next = t + talk + this.gap[0] + this.random() * (this.gap[1] - this.gap[0]);
    return pick;
  }
}
