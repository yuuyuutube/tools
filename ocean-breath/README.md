# 海洋呼吸觀測所 · Ocean Breath

一系列由臺灣真實潮汐與海象資料驅動的動態海景。原生 HTML／CSS／SVG／ES modules，加上一個零依賴的 Node 資料代理，沒有安裝與建置步驟。

## 啟動

需要 Node.js 22 以上。

```sh
cd tools/ocean-breath
npm start          # http://127.0.0.1:4318
npm test           # 17 項，Node 內建測試工具
```

沒有金鑰時是**展示模式**：畫面標示「展示模式」，資訊卡下方可切換漲潮／退潮／接近滿潮／接近乾潮、平靜／大浪、白天／夜晚。

## 氣象署金鑰

1. 到 [中央氣象署開放資料平台](https://opendata.cwa.gov.tw/) 申請授權碼。
2. 複製 `.env.example` 為 `.env`，填入 `CWA_API_KEY=`。
3. 重新啟動，執行 `npm run verify:live` 檢查每片海的官方回應。

金鑰只由 `server/` 讀取，不進前端、不寫進錯誤訊息。

## GitHub Pages

Pages 前端讀取 `weather-data` 分支的官方資料快照（`ocean-breath.json` 與累積 30 天的 `ocean-breath-history.json`），由 `.github/workflows/ocean-breath.yml` 每 30 分鐘以 repository secret `CWA_API_KEY` 產生。沒有快照或讀取失敗時進入展示模式。

## 操作

| 操作 | 方式 |
| --- | --- |
| 切換海岸 | 左上地名（圖鑑）、左右滑動畫面（手指或滑鼠拖曳）、鍵盤 ←／→ |
| 收藏、預設海岸 | 圖鑑卡片右上的星星與小屋 |
| 純觀賞模式 | 眼睛鈕：只留海景與地名 |
| 時間軸 | 時鐘鈕：拖曳刻度尺，30 秒回放今天，切換 3 天／30 天 |
| 分享 | 分享鈕：橫式或直式海報 PNG、系統分享（支援時）、複製連結 |
| 全螢幕 | 全螢幕後 4 秒沒動作，按鈕自動收起 |

網址參數：`?coast=hualien|yilan|keelung|tamsui|tainan|penghu`、`?timeline` 打開時間軸、`?shot` 截分享圖用。主控台 `ocean.bird()` 立刻叫一隻海鳥。

## 結構

```text
index.html             頁面與圖示（SVG symbol，沒有 emoji）
src/coasts.js          Station Registry：海岸、預報地點、潮位／波浪／海溫／風測站
src/tide.js            Tide State：事件清理、漲退潮、下一次潮汐、視覺水位插值
src/marine.js          Marine Observation：測站挑選、新鮮度、時間軸的歷史取樣
src/visual.js          Ocean Visual State：資料 → 動畫參數（有上下限）
src/scene.js           Scene Renderer：天空、日月、雲、海面分層、浪花、潮線、海鳥
src/art/*.js           六片海各自的插畫與微動態
src/palettes.js        六組色盤 × 晨昏日夜
src/sun.js、moon.js    太陽位置、日出日落、月相
src/timeline.js        潮汐刻度尺與拖曳
src/share.js           分享海報（重新排版，不拉伸）
src/api.js             本機代理／Pages 快照／展示模式
src/app.js             UI
server/                HTTP 伺服器、氣象署請求與快取、資料正規化
scripts/               Pages 快照發布、真實金鑰檢查、分享圖產生
tests/                 資料、伺服器測試與官方格式樣本
docs/                  資料來源、測站對應、視覺系統、開發紀錄
```

## 文件

- [docs/DATA_SOURCES.md](docs/DATA_SOURCES.md)：官方資料、欄位、單位、更新頻率、潮高基準
- [docs/STATION_MAPPING.md](docs/STATION_MAPPING.md)：每片海的預報地點與測站
- [docs/OCEAN_VISUAL_SYSTEM.md](docs/OCEAN_VISUAL_SYSTEM.md)：美術語言、色彩、構圖、動畫與資料映射
- [docs/DEVELOPMENT_LOG.md](docs/DEVELOPMENT_LOG.md)：完成情況、技術決策、已知限制

本網站為海象資料視覺化作品，海岸活動安全請以中央氣象署及相關主管機關最新公告為準。
