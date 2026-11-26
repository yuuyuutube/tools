# ROTARY STORIES　旋轉式故事圖書館

*Stories you don't just read, but turn.*　WEIRD LAB / 03

一座可以用實體旋鈕閱讀的互動文學圖書館。每一本書是一件獨立的作品；旋轉不只是翻頁，而是故事裡那台設備本來的操作方式：搖開遮光板、轉年份滾輪、倒帶重聽、對焦、拍照。

第一本書：**RS 001《地球仍有四季》**（科幻短篇，約 20 分鐘）。

> 移民船再過幾個月就要抵達新的行星。你是船上的檔案員，要在抵達前整理六十三年來收到的地球資料。教材裡那所海邊小學，在後來收到的照片上，掛著另一塊招牌。

---

## 啟動

不需要安裝任何套件。

```bash
cd tools/pico/03-rotary-stories
node serve.mjs
```

開啟 <http://localhost:5176/>（會轉到 `/03-rotary-stories/`）。可用 `node serve.mjs 8080` 指定埠號。

伺服器以 `pico/` 為根目錄，因為網站引用了 `../shared/rotary/` 的共用模組——正式部署時也是同樣的相對路徑，所以只要整個 `pico/`（或整個 repository）以靜態網站發布，本機與正式環境的載入方式完全一致。**只單獨部署 `03-rotary-stories/` 資料夾會缺少共用模組。**

專案根目錄的 `.claude/launch.json` 已加入 `rotary-stories`（5176）與 `impossible-safe`（5175）兩個設定。

測試：

```bash
node --test tests/
```

（Windows 上的 Node 20.0 不支援 `tests/*.test.js` 萬用字元，請用資料夾形式。）

---

## 操作

| 輸入 | 轉動 | 短按 | 長按 |
|---|---|---|---|
| Pico 旋鈕 | 轉 | 按 | 按住 |
| 滑鼠 | 滾輪；或在設備上沿圓周拖曳 | 點設備中心 | 按住設備中心 |
| 手機／平板 | 手指沿設備畫圈（像 click wheel）；滾輪型設備用滑動 | 點一下 | 按住；或螢幕按鈕 |
| 鍵盤 | ← → ↑ ↓（Shift 一次十格） | Enter／空白 | Esc／Backspace |

全作品一致：**短按往裡一層，長按回上一層。** 在章節最上層長按會出現「暫離」選單（繼續、前往下一處、回到圖書館、字幕、音量）。每一章都可以直接前往下一處，不要求完成任何事。

右上角三個圖示：連接旋鈕、聲音、設定（音量、字幕、減少動態、旋鈕方向、螢幕按鈕、署名）。署名會出現在終章的觀測紀錄上；不填則是「檔案員 07」。

瀏覽器只允許在使用者手勢後播放聲音。Pico 的按鍵不算手勢，所以如果頁面重新整理後自動連上了旋鈕，請先點一下畫面（聲音圖示會閃爍提醒）。

### 圖書館

| 操作 | 行為 |
|---|---|
| 轉動 | 沿著書架移動；轉得快會加速，一次跨好幾本 |
| 停止 | 當前封面靜靜展示，六秒後陰影開始極緩慢地變化 |
| 短按 | 取出書，看介紹與選項（開始／繼續／從頭開始／你的照片） |
| 長按 | 書頁回到書架 |

尚在寫作的書只露出書背，按下時顯示「這本書還在寫。」

---

## Pico 連線

使用 `01-infinite-kaleidoscope/firmware/main.py`（已裝在 Pico 上），**韌體與接線（GP16、GP17、GP18）都不需要更動**。協定：

```json
{"type":"rotate","delta":1}
{"type":"press","kind":"short"}
{"type":"press","kind":"long"}
```

1. 先中斷其他頁面（萬花筒、保險箱）的 Pico 連線，並關閉 VS Code 的 MicroPico，否則序列埠會被占用。
2. 用 Chrome 或 Edge 開啟，按右上角插頭圖示，選擇 Pico。按住 Shift 再點插頭可列出所有序列埠。
3. 之後重新整理會自動重新開啟曾授權過的 Pico。
4. 方向相反時，在設定把「旋鈕方向」改為「反轉」。

`delta` 若是累積的整數（例如 3），會換算成 54° 一次送進場景，不會丟失任何一格：手輪的每一個棘齒、年份滾輪的每一年都會逐一發出聲音。拔除後顯示中斷，插回同一塊板子會自動重連；斷線期間可以直接改用滑鼠、觸控或鍵盤。Safari、Firefox 不支援 Web Serial，但可以完整閱讀。

---

## 架構

```text
Pico / Mouse / Touch / Keyboard
            │
            ▼
pico/shared/rotary/          serial-adapter · protocol · rotary-hub · angle-tracker
            │                pointer-dial · dom-input · rotary-navigation
            ▼
src/engine/knob-input.js     一切輸入 → 旋鈕角度（Pico 一格 = 18°）＋ 短按／長按
            │
            ▼
src/main.js → 目前頁面       LibraryPage · BookPage · StoryPlayer
            │
            ▼
StoryPlayer → Scene          章名卡、暫離選單、存檔、場景生命週期
            │
     ┌──────┼──────────┬───────────────┐
     ▼      ▼          ▼               ▼
 Handwheel  DetentSelector  BoundedDial / CyclicDial  Flywheel     src/interactions/models.js
     │      │          │               │
     ▼      ▼          ▼               ▼
 Canvas／SVG／DOM 各自渲染        Web Audio（AudioCore → 每個場景一個 AudioScope）
```

```text
03-rotary-stories/
├── index.html · serve.mjs · package.json
├── src/
│   ├── engine/        knob-input · story-player · scene · disposer · ui · dom
│   ├── interactions/  models（Handwheel、DetentSelector、BoundedDial、CyclicDial、Flywheel）· knob-surface
│   ├── audio/         audio-core（context、buses、scopes）· dsp（離線合成工具）
│   ├── storage/       progress（localStorage）· photo-store（IndexedDB）
│   ├── library/       registry（書目）· library（書架）· book（書頁）· sounds
│   └── styles/
├── stories/001-earth-is-still-turning/
│   ├── manifest.js · cover.js · keepsake.js
│   ├── design/        world-bible · timeline · characters · screenplay · interaction-design
│   │                  narrative-audit · art-direction · production-notes
│   ├── narrative/     text.js（所有玩家看得到的文字）
│   ├── scenes/        ch1 … ch5、fin（每章一個模組）
│   ├── art/           earth · planet · micro · sky · ship-parts
│   ├── audio/         soundscapes（地球錄音）· ship-sounds（設備與環境聲）
│   ├── data/          archive（影像、紀錄、光行時間模型、接收總帳）
│   └── styles/story.css
├── docs/adding-a-story.md
└── tests/
```

### 場景生命週期

每個場景繼承 `Scene`：`enter()` 建立畫面與聲音、`rotate(deg, info)`、`press(kind)`（回傳 `true` 表示已處理；未處理的長按會開啟暫離選單）、`frame(dt)`、`saveState()`、`beforeNext()`（選用，例如第一章離開前自動關回遮光板）、`leave()`。

場景透過 `this.d`（Disposer）登記事件、計時器；聲音一律由 `this.audio`（這個場景專屬的 AudioScope）播放。離開場景時，Disposer 依反序拆除所有東西，AudioScope 把所有聲音淡出停止，所以換章、回圖書館、換書都不會留下上一個場景的控制或聲音。

不同場景使用不同技術：第一章 Canvas＋SVG、第二章分層 Canvas 繪圖、第三章 Web Audio 分段合成、第四章多焦平面 Canvas、第五章 DOM 清單＋Canvas、終章 Canvas 全景相機。

### 存檔

`localStorage` 只存小 JSON：目前章節、各場景狀態、故事共用狀態、設定、是否讀完、紀念照片的參數（方位、焦距、對焦、時間）。照片 PNG 另存在 IndexedDB；即使被清除，也能由參數重新繪出同一張照片。

---

## 《地球仍有四季》

| 章 | 場所 | 旋轉 |
|---|---|---|
| 一　觀測艙 | C-2 觀測艙 | 搖手輪打開遮光板；第一次用肉眼看窗外 |
| 二　影像檔案室 | 影像閱覽機 | 轉年份滾輪，看同一個漁村、同一個河口六十年 |
| 三　聲音資料庫 | 音訊閱覽機 | 選錄音、倒帶重聽 |
| 四　植物培育室 | 落射式顯微鏡 | 對焦一片活的海茄苳葉子 |
| 五　通訊站 | 接收總帳、正式版整理 | 捲過六十三年的接收紀錄；把矛盾分段歸檔 |
| 終　第一張照片 | 新殖民地觀測站 001 | 同一型手輪；桅桿相機的方位、焦距、對焦；按下快門 |

劇本、世界觀與審核紀錄在 `stories/001-earth-is-still-turning/design/`。審核分三輪：編劇自審、由另一個代理獨立進行的邏輯審核與文學編輯（20 項問題，逐項處理）、實作後通讀。

### 紀念品

讀完後，書頁上的「你的照片」可以下載：

- `environmental-image-001.png`：原始照片（2400 × 1600）
- `environmental-record-001.png`：附觀測紀錄的紀錄卡

沒有稀有度、獎章或通關時間。

---

## 共用技術

與 `02-the-impossible-safe` 實際共用同一份程式（`pico/shared/rotary/`），兩個網站都直接 import。詳見 `../shared/README.md`。

---

## 實際測試結果

| 項目 | 結果 |
|---|---|
| `03-rotary-stories` 自動測試 | 22 項全數通過（互動模型、輸入換算、光行時間與日期、接收總帳、劇本與程式文字一致性、合成錄音的確定性與接縫、存檔） |
| `shared` 自動測試 | 8 項全數通過 |
| `02-the-impossible-safe` 回歸測試 | 改為引用共用模組後，原有 45 項全數通過 |
| 保險箱瀏覽器回歸 | 本機伺服器開啟無錯誤；共用模組正確載入；鍵盤、螢幕按鈕、轉盤拖曳正常 |
| 圖書館與六章 | 在內建瀏覽器中逐章操作：書架、書頁、第一章開窗與關窗、第二章年份與附註、第三章目錄與播放器、第四章顯微鏡擷取、第五章簽收、分段、提交、正式版、終章拍照與歸檔、紀念品檢視 |
| 手機版面 | 375 × 812：書頁、第一章版面、螢幕按鈕 |

## 已知限制與待使用者驗證

**以下項目沒有親自驗證，請不要視為已通過：**

1. **Pico 實機操作**。沒有接上實體旋鈕測試；序列埠與協定處理沿用保險箱已實機驗證過的同一份程式（現在是共用模組），但本網站的手感參數（每一章的靈敏度、慣性）需要實機調整。
2. **聲音的實際聽感**。所有聲音只做了數值檢查（音量平衡、峰值、片段接縫），沒有人耳逐卷試聽。蟬、雨、浪、鳥是否可信，請戴耳機確認。特別是西敏寺鐘聲第三、四句的音序。
3. **實體觸控**。圓形手勢以滑鼠與程式模擬測試；在真實手機上的手感（尤其是在小設備上畫圈）需要實機確認。
4. **iOS Safari**。未測試；Web Audio 解鎖與 IndexedDB 的行為可能不同。
5. **效能**。第二章快速轉動時，每格會即時繪製影像（每幀最多兩張）；在低階手機上可能短暫延遲。
6. **字幕**涵蓋了所有有意義的聲音，但沒有由聽障讀者實際試用。
7. 背景分頁中瀏覽器會降低動畫更新頻率，這是瀏覽器行為，不是錯誤。
