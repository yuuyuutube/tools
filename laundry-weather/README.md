# 晾晾日和 · Laundry Weather

今天適合曬衣服嗎？一幅由天氣吹動的陽台插畫。原生 HTML／CSS／SVG／ES modules，加上一個零依賴的 Node 氣象代理，沒有安裝與建置步驟。

## 啟動

需要 Node.js 22 以上。

```sh
cd tools/laundry-weather
npm start          # http://127.0.0.1:4317
npm test           # 20 項，Node 內建測試工具
```

沒有金鑰時是**展示模式**：畫面標示「展示資料」，右下四個圖示可切換晴朗／多雲／潮濕／下雨。

夜晚：有即時資料時由伺服器依臺灣時間（18–06 時）判定；展示模式依現在的臺灣時間，也可以按月亮圖示手動切換。

預覽用的網址參數：`?night=1`／`?night=0` 強制夜晚或白天；`?wear=sweater,skirt,pants,shorts` 指定要掛的衣物（`tee`、`socks`、`towel`、`shirt`、`sweater`、`shorts`、`pants`、`skirt`），不足四樣時隨機補上。

小鳥（五種，一次一到三隻）與蝴蝶只在白天、沒下雨、風不大時出現；螢火蟲只在晚上。想立刻看，在瀏覽器主控台輸入 `laundry.callBirds()` 或 `laundry.callButterfly()`。

## 氣象署金鑰

1. 到 [中央氣象署開放資料平台](https://opendata.cwa.gov.tw/) 申請授權碼。
2. 複製 `.env.example` 為 `.env`，填入 `CWA_API_KEY=`。
3. 重新啟動，並執行 `npm run verify:live` 檢查官方回應。

金鑰只由 `server/` 讀取，不進前端。2026-11-15 已用真實金鑰驗證：臺北市中正區的鄉鎮預報（F-D0047-061）與臺北測站觀測（O-A0001-001）都正常解析並顯示在頁面上；其他縣市、缺測與上游失敗的情況仍只用合成資料測過，見 [docs/data-sources.md](docs/data-sources.md)。

## 靜態主機（GitHub Pages）

沒有 Node 代理時，前端偵測不到 `/api` 會自動改用展示資料並在資料說明中註明，不會假裝是即時天氣。要顯示真實天氣必須另外部署 `server/`（或移植成 Serverless），並與頁面同源。

## 結構

```text
index.html           頁面與圖示
src/scene.js         SVG 插畫、排版（直式只掛兩樣衣物）、衣物與盆栽的隨機組合、動畫迴圈
src/garments.js      衣物、花貓、小鳥的造型與配色組合
src/wind.js          風速風向 → 擺動（純數學，可測試）
src/app.js           介面、資料請求、輪詢、浮層
src/style.css        場景配色與轉場、介面樣式
src/score.js         晾衣適宜度（docs/laundry-score.md）
src/locations.js     縣市資料集、GPS 匹配、地點儲存
src/demo.js          固定展示資料
server/              HTTP 伺服器、氣象署請求與快取、資料正規化
tests/               評分、正規化、定位、HTTP、擺動
```

## 天氣如何驅動畫面

| 資料 | 畫面 |
| --- | --- |
| 風速 | 擺動幅度與節奏（有飽和上限，強風不會亂甩） |
| 風向 | 衣服與雲往哪邊偏 |
| 濕度／降雨 | 場景配色、霧帶、雨絲，濕衣服擺得較沉 |
| 天氣現象 | 雲量與太陽是否被遮（藝術化呈現，不是實測雲量） |
| 日夜 | 臺灣時間 06–18 時以外為夜色與月亮 |
| 晾衣等級 | 主要結論文字 |

數值變化以數秒的時間常數緩慢過渡。分頁在背景時停止動畫與輪詢；`prefers-reduced-motion` 時停在靜態插畫。

## 限制

- GPS 以最近的鄉鎮預報座標匹配，不是行政區邊界判定；精確座標不儲存。
- 展示模式每縣市只有一個代表地點。
- 不預測晾乾時間；分數是本站自訂的初始啟發式規則。
