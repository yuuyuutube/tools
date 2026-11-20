# 抽牌所｜TAROT DRAW

純前端塔羅抽牌工具：22 張大阿爾克那、單張／三張牌陣、逆位選項、洗牌翻牌動畫與 PNG 分享海報。
HTML、CSS、原生 ES modules；不需要建置或安裝執行套件。

## 現階段狀態（2026-11-19）

| 範圍 | 狀態 |
|---|---|
| 正式抽牌與海報 | 使用 22 張純插畫 WebP，搭配網頁 SVG 生成紙底、圖窗、框線、牌號、牌名及裝飾 |
| 原線稿加工 | 0–21 已有墨線、木刻陰影、平塗與套印輸出；6–21 採 ff36530 的最新修訂 |
| 預覽與圖鑑 | 分批階段圖、局部放大、全套總覽及圖鑑 AFTER 已同步；BEFORE 保留原 SVG 畫風 |
| Light Paint | 22 張 1024×1536 分層 JSON、純色版、透明墨線、色票與 ZIP 已重建 |
| 配色與版面 | 保留既有補色規則與圖窗；使用者尚未開始自行繪色版 |
| 驗收 | 檔案同步不等於美術核准；新陰影及原線稿象徵差異仍待使用者審閱 |

[整批同步紀錄](docs/tarot-sunburst/ink-sync-2026-11-19.md) · [墨線查核索引](docs/tarot-sunburst/ink-review-index.md) · [Light Paint 專案下載](docs/tarot-sunburst/light-paint/)

最新美術方向為「歐洲寓言、神秘、有一點擬真、木刻排線、四色套印」。角色要有可信的解剖與重量；不沿用早期圓頭點眼／細棍手腳的造型。`docs/prompt.md` 是歷史需求，遇到衝突以使用者最新指示與重畫計劃為準。

## 啟動與測試

```bash
npm run serve
# http://localhost:8000/
npm test
```

需要 Python 3 靜態伺服器與 Node.js 20 以上；ES modules 不能以 `file://` 直接開啟。

目前 `npm test` 的 38 項測試通過，包括抽牌順序、不重複、正逆位、亂數、原版 SVG 可生成性、新版指定符號、遮罩參照與固定框色。測試不驗證解剖、完整牌義敘事或瀏覽器海報，不能用測試通過代替美術驗收。

## 預覽頁

| 頁面 | 內容 |
|---|---|
| `index.html` | 正式抽牌工具 |
| `gallery.html` | 22 張原版 SVG 與最新 Sunburst 成圖逐張 Before／After，含新版篩選、下載與牌背收藏入口；支援 `?only=moon,sun`、`?w=360` |
| `sunburst-batch.html?view=all` | 全套成圖／墨線／黏墨切換總覽；點牌進入分批各階段與局部放大 |
| `colour-repair-review.html` | 補色前的歷史快照與最新平塗／套印對照 |
| `docs/tarot-sunburst/light-paint/` | 22 張分層修色專案與完整 ZIP |
| `window-editor.html` | 以最新完整圖面預覽圖窗與擺位 |
| `sample.html` | 歷史 SVG 樣張： 新版隱者；完整圖、印刷局部與縮圖 |
| `batch-b-sample.html` | 女祭司、皇后、皇帝、教皇、正義的整批總覽、舊新對照、120px、局部及下載；支援 `?only=empress` |
| `print-sample.html?card=strength` | 已登記新版正面與隱者並排；`card` 可換成其他新版 id |
| `strength-review.html` | 力量第二輪修訂前後、手部及四肢局部 |
| `symbol-review.html` | 本輪隱者與月亮符號修訂前後，含 PNG 下載；支援 `?only=hermit`／`?only=moon` |
| `compare.html` | Claude 初版隱者印刷樣張與已確認修訂版對照 |
| `moon-sample.html` | 原版月亮與新版試畫、120px 縮圖、動物局部、PNG 下載 |
| `moon-sample.html?reference=hermit` | 以已確認隱者作筆觸、框色與重量參照 |
| `back-sample.html` | 最初舊版 Before 與九款新版 After；各款可下載 PNG |
| `back-sample.html?only=legacy,celestial-eye` | 舊版／新版星芒之眼並排 |
| `back-sample.html?only=moon-flower,jade-maze` | 指定多款牌背；`only` 也支援單款 |

預覽頁在瀏覽器即時印製樣張；正式牌背載入預先輸出的 PNG，避免每次開啟網站都重新計算高解析印刷。

## 美術檔案

### 新版正面

- `src/print/press.js`：逐像素套印引擎。紙紋、纖維、飛白、網點、滲墨與套色偏移都由種子決定。
- `src/print/hermit.js`：已確認隱者；`hermit-before.js` 保留其初版作對照。
- `src/print/moon.js`：月亮試畫與獨立色盤；`moon-before-refinement.js` 保留首次試畫。
- `src/print/frame.js`：與隱者一致的新版正面框與文字版式。
- `src/print/registry.js`：新版狀態、色版、色盤、種子與局部減噪。
- `src/print/engraving.js`：批次 B 的分層挖空與裁切排線工具；五張來源與符號驗收見 [批次 B 紀錄](docs/batch-b-review.md)。
- `assets/hermit-sample.png`：六芒星與抬燈修訂後的隱者（900 × 1500）。
- `assets/moon-sample.png`：最新月亮樣張（900 × 1500；seed 20261116）。

插畫可各有色盤；外框／牌號／牌名／裝飾固定用隱者的墨藍 `INKS.N` 與朱橘 `INKS.O`。月亮分成插畫四版及外框 FO／FN；`press.js` 可在預設四色後加入額外色版，`fixedRegistration` 固定墨線版套準。

`printCard()` 可傳入 `inks` 與 `quietAreas`；局部減噪用於小臉、手、燈等，不能整張消除手工印刷質地。

### 九款牌背

登記表：`src/print/back-catalog.js`。每款有獨立 id、名稱、說明、PNG 檔與印製函式。

| id／名稱 | 色版來源 | PNG |
|---|---|---|
| `celestial-eye` 星芒之眼 | `back.js` | `card-back.png` |
| `moth-garden` 夜蛾花園 | `back-moth.js` | `card-back-moth.png` |
| `tide-gate` 潮汐之門 | `back-tide.js` | `card-back-tide.png` |
| `pomegranate-garden` 石榴秘園 | `back-pomegranate.js` | `card-back-pomegranate.png` |
| `serpent-ring` 黑金蛇環 | `back-serpent.js` | `card-back-serpent.png` |
| `snow-fox` 雪境雙狐 | `back-fox.js` | `card-back-fox.png` |
| `vermilion-cranes` 朱砂雙鶴 | `back-crane.js` | `card-back-crane.png` |
| `moon-flower` 月白花窗 | `back-flower.js` | `card-back-flower.png` |
| `jade-maze` 翠玉迷宮 | `back-geometry.js` | `card-back-geometry.png` |

色版在 `src/print/`，PNG 在 `assets/`。各款可以有自己的配色、裝飾框與滿版背景；紙紋和排線語言保持一致。星芒之眼已更新花冠拱框，夜蛾花園已加花冠藤蔓框。

牌背先印出上半部，再旋轉 180° 得到下半部，包括紙紋、套色誤差也完全對稱；不透過背面洩漏正逆位。牌背固定 seed 20261115、scale 2.4，輸出 720 × 1200。改色版後從收藏頁下載 PNG 並更新對應資產。

最初版本來自 commit `4cd0212`，保存在 `src/print/back-legacy.js` 與 `assets/card-back-legacy.svg`，只供對照，不參與正式牌背登記。

## 正式網站結構與規則

```text
src/config.js          站名、牌陣、動畫設定
src/data/cards.js      22 張牌義與正逆位關鍵字
src/engine/            Web Crypto／Fisher–Yates／抽牌 session
src/art/               原版 SVG 備份、牌框及牌背；正式正面取 assets/faces 的 Sunburst 輸出
src/print/             新版可編輯印刷色版與引擎
src/ui/                抽牌流程、動畫、鍵盤／觸控、樣式
src/poster/            分享海報與 PNG 輸出
src/audio/             紙張與微風星光音效
```

洗牌時一次決定牌堆與每張正逆位；後續動畫不重新擲亂數。點選位置直接對應牌堆位置，三張模式依抽取順序放入牌陣，不重複。重抽／返回廢棄舊 session。設定僅 idle 可改，舊動畫由 run 編號失效以避免連點競態。

桌面可滑過抬牌、點選；手機支援拖曳牌扇，拖動超過 8px 不算點選。方向鍵、Home／End 移動，Enter／空白選牌，Esc 返回。尊重 `prefers-reduced-motion`；音效預設靜音。手機儲存走系統分享（支援時），桌面下載 1080 × 1620 海報。

## 後續工作與驗收範圍

- 原 [逐牌重畫計劃](docs/redraw-plan.md)屬早期 SVG 階段；目前 Sunburst 22 張已輸出，圖像符號、解剖與新版陰影仍須人工驗收。
- 抽牌、海報、圖鑑及分層專案已統一採用 Sunburst 輸出；後續修訂仍須同步各衍生圖，檢查方法見整批同步紀錄。
- 正式 UI 的九款牌背選擇、OG 分享縮圖與 PNG favicon 尚未完成。
- 原 README 記錄 Claude 曾測試桌面／手機／平板、單三張、連點／返回、鍵盤與海報；這是先前版本紀錄，並非本次全部重新執行。
- 實機 iOS／Android 分享面板、桌面 Safari／Firefox、實際 Reduce Motion 與音效聽感仍需驗證。

歷史紀錄・2026-11-16 符號修訂：隱者六芒星與抬燈，月亮右亮面、16＋16 光芒、十五露滴及犬狼仰望。修訂前保存在 `hermit-before-symbols.js`／`moon-before-symbols.js`；本輪尚待使用者確認。


## 正式牌面拆層（2026-11-19）

`assets/faces/*.webp` 只含插畫，654×870 對應牌面內的 218×290 圖窗，不含卡片外框、圖窗描邊、牌號、中文／英文牌名或框外裝飾。插畫中的圖像象徵文字（如女祭司卷軸）仍是插畫的一部分。

`src/art/frame.js` 使用 `sunburstFrameLayers()` 與共用圖窗幾何產生 SVG 介面；紙底與紙紋也由 SVG 生成。各部分有獨立 `data-card-layer`，可以分別加入微動態。翻牌後依序播放圖窗外框由底部中央展開（線寬固定、插畫不動）、橫線由中央伸展、中英文牌名浮現；支援減少動態設定。手機手指拖曳係數為 1.6，窄版面滑鼠 hover 不自動捲牌，按住拖曳採較慢速度。

抽牌與分享海報都透過同一個 `faceSVG(..., {printed:true})` 組版；海報會先將純插畫嵌入 data URL，再輸出合成 PNG。

匯出入口為 [純插畫資產](illustration-assets.html?batch=01)，批次 `00` 代表愚者、`01`～`07` 對應各批。PNG 母檔為 `batch-XX/N-illustration.png`（愚者為 `fool-pipeline/fool-illustration.png`）。`scripts/export-faces.py` 只讀這些純插畫母檔，不再從完整卡片縮圖產生 WebP。


### 翻牌音效試聽

`sound-preview.html` 可比較新版「微風與星光」與舊版「紙張與落點」。新版由 `src/audio/reveal.js` 合成：風聲慢慢升起，約 0.34 秒起接上緩起的低音量泛音，移除原本的低頻撞擊；尾韻約 1.5 秒。正式 `sfx.flip()` 與試聽頁共用同一份音效。洗牌、展牌、選牌及儲存音效維持原樣，試聽頁不更改正式網站的音效開關。

瀏覽器已用 OfflineAudioContext 產出有效 WAV，確認沒有非有限數值或數位削波，試聽音檔可正常載入，控制台無錯誤。預覽檔為 `docs/tarot-sunburst/flip-breeze-preview.wav`；實際聽感由使用者試聽判斷。


### 愚者：墨稿到彩色的翻牌試作

[fool-reveal-demo.html](fool-reveal-demo.html) 展示使用原始 Y／O／B／N 印版的套印翻牌。圖窗外框從墨稿階段就可見，展框、拉線、牌名與三色套印並行，整段約 1.6 秒；提供慢速、時間軸與墨稿／完成卡面切換。獨立試作頁尚未接入正式抽牌，其他牌待使用者完成上色後再製作。詳見 [試作紀錄](docs/tarot-sunburst/fool-reveal-demo.md)。


### 牌背日期印章設計預覽

[stamp-preview.html](stamp-preview.html) 提供九款與牌背呼應的單色日期章、各自的裝飾章框，以及單張／三張分享圖蓋章試看。可切換日期、牌面、缺墨程度，下載分享 PNG 或印章 SVG。正式抽牌的分享圖依這次使用的牌背蓋對應的章（`stampForBack()`）。日期數字是 `stamps.js` 內的線條字形，不依賴系統字型。可編輯來源為 `src/poster/stamps.js`，完整設計樣張在 [stamps](docs/tarot-sunburst/stamps/README.md)。
