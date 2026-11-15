# 小小塔羅印刷所｜THE LITTLE TAROT PRESS

純前端塔羅抽牌工具：22 張大阿爾克那、單張／三張牌陣、逆位選項、洗牌翻牌動畫與 PNG 分享海報。
HTML、CSS、原生 ES modules；不需要建置或安裝執行套件。

## 現階段狀態（2026-11-16）

| 範圍 | 狀態 |
|---|---|
| 正式抽牌與海報 | 仍使用原版 22 張 SVG 正面 |
| 隱者新版 | 已確認的歐洲寓言木刻樣張；寬袖、側身遮擋修訂保留 |
| 月亮新版 | 試畫；已修狼、弦月側臉、木刻陰影、十五露滴及固定框色 |
| 新版牌背 | 九款，含可編輯色版與 PNG；正式牌堆預設使用新版星芒之眼 |
| 牌背收藏頁 | 可看九款與最初舊版 Before／After；正式抽牌的多牌背選擇器尚未加入 |
| A 批正面 | 愚者、魔術師、倒吊人為試畫；力量兩輪結構修訂已確認 |
| B 批正面 | 女祭司、皇后、皇帝、教皇、正義五張新版修訂已確認，含可編輯色版與 PNG |
| 其餘正面 | [重畫計劃](docs/redraw-plan.md)中的 C／D／E 共十一張尚未繪製 |

最新美術方向為「歐洲寓言、神秘、有一點擬真、木刻排線、四色套印」。角色要有可信的解剖與重量；不沿用早期圓頭點眼／細棍手腳的造型。`docs/prompt.md` 是歷史需求，遇到衝突以使用者最新指示與重畫計劃為準。

## 啟動與測試

```bash
npm run serve
# http://localhost:8000/
npm test
```

需要 Python 3 靜態伺服器與 Node.js 20 以上；ES modules 不能以 `file://` 直接開啟。

目前 `npm test` 的 28 項測試通過，包括抽牌順序、不重複、正逆位、亂數、原版 SVG 可生成性、新版指定符號、遮罩參照與固定框色。測試不驗證解剖、完整牌義敘事或瀏覽器海報，不能用測試通過代替美術驗收。

## 預覽頁

| 頁面 | 內容 |
|---|---|
| `index.html` | 正式抽牌工具 |
| `gallery.html` | 22 張原版與 11 張新版逐張 Before／After，含新版篩選、下載與牌背收藏入口；支援 `?only=moon,sun`、`?w=360` |
| `sample.html` | 新版隱者；完整圖、印刷局部與縮圖 |
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
src/art/               正式抽牌仍使用的原版正面 SVG、牌框及牌背資產入口
src/print/             新版可編輯印刷色版與引擎
src/ui/                抽牌流程、動畫、鍵盤／觸控、樣式
src/poster/            分享海報與 PNG 輸出
src/audio/             紙張音效
```

洗牌時一次決定牌堆與每張正逆位；後續動畫不重新擲亂數。點選位置直接對應牌堆位置，三張模式依抽取順序放入牌陣，不重複。重抽／返回廢棄舊 session。設定僅 idle 可改，舊動畫由 run 編號失效以避免連點競態。

桌面可滑過抬牌、點選；手機支援拖曳牌扇，拖動超過 8px 不算點選。方向鍵、Home／End 移動，Enter／空白選牌，Esc 返回。尊重 `prefers-reduced-motion`；音效預設靜音。手機儲存走系統分享（支援時），桌面下載 1080 × 1620 海報。

## 後續工作與驗收範圍

- 依 [逐牌重畫計劃](docs/redraw-plan.md)確認 A／B 批樣張，繼續 C／D／E 共十一張；圖像符號與解剖須人工驗收。
- 新版隱者／月亮仍需統一整合到抽牌、圖鑑與海報來源；不能只改樣張就聲稱正式完成。
- 正式 UI 的九款牌背選擇、OG 分享縮圖與 PNG favicon 尚未完成。
- 原 README 記錄 Claude 曾測試桌面／手機／平板、單三張、連點／返回、鍵盤與海報；這是先前版本紀錄，並非本次全部重新執行。
- 實機 iOS／Android 分享面板、桌面 Safari／Firefox、實際 Reduce Motion 與音效聽感仍需驗證。

2026-11-16 符號修訂：隱者六芒星與抬燈，月亮右亮面、16＋16 光芒、十五露滴及犬狼仰望。修訂前保存在 `hermit-before-symbols.js`／`moon-before-symbols.js`；本輪尚待使用者確認。
