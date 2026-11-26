# 新增一本故事

ROTARY STORIES 的引擎刻意做得很小：它只管輸入、章節、存檔與清理。故事自己決定要用什麼技術、什麼旋轉模型、什麼聲音。不要為了新故事去擴大引擎，先在故事自己的資料夾裡做；第二本、第三本都需要同一個東西時，再把它移到 `src/`。

## 1. 先寫，再做

複製 `stories/001-earth-is-still-turning/design/` 的檔案結構，先完成：

1. `world-bible.md` — 世界的規則。劇本與它衝突時，改劇本或先改它。
2. `timeline.md`、`characters.md`
3. `screenplay.md` — 所有玩家會看到的文字都用 ```text 區塊寫出來。
4. `interaction-design.md` — 每一個旋轉設備「本來為什麼是旋鈕」。答不出來的設備，換掉它。
5. 審核：交給沒有參與寫作的人（或代理）做邏輯審核與文學編輯，把結果與處理方式記在 `narrative-audit.md`。

## 2. 資料夾

```text
stories/00X-your-story/
├── manifest.js      必要：章節清單
├── cover.js         必要：coverSVG()、spineSVG()
├── keepsake.js      選用：讀完後留下的東西
├── narrative/text.js
├── scenes/          每章一個模組
├── art/ audio/ data/ styles/
└── design/
```

## 3. manifest

```js
import * as text from './narrative/text.js';
const base = new URL('./', import.meta.url).href;

export default {
  id: '00X-your-story',
  slug: 'yourslug',              // 用在 CSS class：.story-yourslug
  text,                          // 必須有 text.book：title、titleEn、meta、blurb、done、keepsakeLabel…
  stylesheet: `${base}styles/story.css`,
  keepsake,                      // 選用：{ photo(), caption(), download(), store() }
  chapters: [
    { id: 'ch1', card: { num: '一', title: '…', en: '…', when: '…' }, load: () => import('./scenes/ch1.js') },
    { id: 'end', card: { …, prelude: ['第一行', '第二行'] }, final: true, load: () => import('./scenes/end.js') },
  ],
};
```

`final: true` 的章節沒有「前往下一處」。`prelude` 會在章名前，以黑底一行一行出現。

## 4. 登記到書目

`src/library/registry.js`：

```js
import { coverSVG as cover00X, spineSVG as spine00X } from '../../stories/00X-your-story/cover.js';
{ id: '00X-your-story', number: 'RS 00X', title: '…', titleEn: '…', genre: '…', length: '約 10 分鐘',
  status: 'ready', cover: cover00X, spine: spine00X, load: () => import('../../stories/00X-your-story/manifest.js') },
```

還在寫的書用 `status: 'draft'`，只顯示書背。

## 5. 場景

```js
import { Scene } from '../../../src/engine/scene.js';
import { Handwheel } from '../../../src/interactions/models.js';
import { attachKnobSurface } from '../../../src/interactions/knob-surface.js';

export default class MyScene extends Scene {
  async enter() {
    this.model = new Handwheel({ turns: 3 });
    this.root.append(/* 你的 DOM / Canvas */);
    this.d.add(attachKnobSurface(deviceEl, this.ctx.knob));   // 觸控／滑鼠畫圈
    this.d.on(window, 'resize', () => this.layout());          // 一律透過 this.d 登記
  }
  rotate(deg, info) {            // deg：旋鈕角度，順時針為正；info.speed：°/s
    for (const e of this.model.turn(deg)) { /* 事件 → 聲音、字幕 */ }
  }
  press(kind) {                  // 'short' | 'long'；回傳 true 表示已處理
    if (kind === 'short') { this.next(); return true; }
    return false;                // 未處理的長按 → 暫離選單
  }
  frame(dt) { this.model.update(dt); /* 繪製 */ }
  saveState() { return { open: this.model.target }; }   // 小 JSON
}
```

場景可用的 `this.ctx`：`knob`、`core`（AudioCore）、`audio`（本場景的 AudioScope）、`text`、`state`（上次存的）、`shared`／`saveShared()`（整本書共用）、`settings`、`reduced()`、`hint(text)`、`caption(text)`、`next()`、`finish(patch)`、`toLibrary()`。

### 規則

- 聲音只用 `this.audio.play()`／`loop()`；離開場景時會自動淡出停止。
- 事件與計時器只用 `this.d`；離開時自動移除。
- 有聲音資訊的地方，同時呼叫 `this.caption('［…］')`。
- 不要讓故事依賴某一種輸入。用 `KnobInput` 給的角度，不要直接讀滑鼠或鍵盤。
- 不要把大型圖片或音訊存進 `localStorage`。

## 6. 旋轉模型

| 模型 | 適合 |
|---|---|
| `Handwheel` | 艙門、閘門、捲簾：有限的多圈行程，重的負載跟在手後面 |
| `DetentSelector` | 年份、錄音帶、選單：離散的位置，可跳過空格，快轉加速 |
| `BoundedDial` | 對焦、收音機頻率、音量：有限連續參數 |
| `CyclicDial` | 方位、望遠鏡：無盡頭的角度 |
| `Flywheel` | 長捲軸、清單：有重量、甩動後會滑行 |

需要別的（例如會自然衰減的發條、瓦斯爐的明確開關狀態），在故事自己的資料夾寫一個新的模型；它應該是不依賴 DOM 的純類別，方便寫測試。

## 7. 測試

在 `tests/` 加上故事自己的測試。至少檢查：世界觀的數字（`tests/story001.test.js` 的光行時間檢查是一個例子）、以及 `text.js` 的文件與 `screenplay.md` 一致。
