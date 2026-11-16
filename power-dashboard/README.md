# 台灣發電中！· POWER POWER!

六座由台電即時資料驅動的虛擬發電廠：燃氣、燃煤、太陽能、風力、水力，和一間收集其他能源的小工坊。原生 HTML／CSS／SVG／ES modules，加上一個零依賴的 Node 資料代理，沒有安裝與建置步驟。

## 啟動

需要 Node.js 22 以上。

```sh
cd tools/power-dashboard
npm start          # http://127.0.0.1:4319
npm test           # 21 項，Node 內建測試工具
npm run verify:live
```

台電資料是公開檔案，**不需要金鑰**。`DEMO_MODE=true npm start` 只回傳展示資料。

## 操作

| 操作 | 方式 |
| --- | --- |
| 看單座發電廠 | 點格子（或 Tab 到格子按 Enter）；× 或 Esc 返回 |
| 讓角色說話 | 點角色 |
| 觀賞模式 | 眼睛鈕：收起次要資訊與按鈕，只留插畫、名稱、數值與整體供電狀態 |
| 全螢幕 | 全螢幕後 4 秒沒動作，按鈕自動收起 |
| 資料說明、切換展示資料、重新取得 | ⓘ 鈕 |
| 展示情境 | 展示模式時右上：白天、夜間、風大、風小、模擬燈號吃緊、模擬連線失敗 |

網址參數：`?demo`、`?demo=night|windy|calm|tight|offline`。主控台：`power.say('wind')` 讓某位角色說話。

## GitHub Pages

台電端點沒有 CORS 標頭，Pages 前端改讀 `weather-data` 分支的 `power-dashboard.json`，由 `.github/workflows/power-dashboard.yml` 約每 10 分鐘以 `scripts/publish-power.js` 產生，歷史點從上一份接續。讀不到時自動進入標示清楚的展示資料。

## 結構

```text
index.html            頁面與圖示（SVG symbol，沒有 emoji）
src/classify.js       機組 → 六座發電廠（互斥、去小計、缺值不當 0）
src/supply.js         今日電力資訊、民國年時間、官方燈號
src/history.js        快照歷史、涵蓋範圍、今日觀測是否完整
src/state.js          PowerData → AnimationState
src/events.js         事件偵測（占比、下降、燈號、今日新高）
src/npc.js            台詞庫與全域排程器
src/scenes/*.js       六座發電廠插畫與動畫；kit.js 是共用背景、齒輪與 NPC
src/app.js            UI、輪詢、動畫迴圈、詳細頁、說明
src/demo.js           展示資料
server/               HTTP 伺服器、台電請求與快取
scripts/              Pages 快照發布、真實端點檢查
tests/                分類、單位、狀態、事件、台詞、伺服器；fixtures 是 2026-11-16 的真實台電檔
docs/DATA_SOURCES.md  端點、欄位、分類對照、新鮮度與限制
docs/ART_SPEC.md      美術、構圖、動畫三層、NPC 角色與台詞規則
```

## 已知限制

- Pages 資料受 GitHub Actions 排程延遲影響，可能比官方晚 10–20 分鐘。
- 「最近變化」需要累積：本機伺服器從啟動開始存，Pages 從工作流程第一次執行開始存。
- 分享圖與 PNG 圖示由 `scripts/og.sh` 以 headless Chrome 截圖產生（`?shot` 模式）。
