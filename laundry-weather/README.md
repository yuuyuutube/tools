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

GitHub Pages 現在會讀取下方「GitHub Pages 即時資料」所述的官方資料快照，無需在 Pages 執行 Node。其他純靜態主機未設定資料來源時仍會使用明確標示的展示資料。

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

## GitHub Pages 即時資料

Pages 前端讀取 `weather-data` 分支的官方天氣快照，金鑰由 repository secret `CWA_API_KEY` 提供給 `.github/workflows/laundry-weather.yml`，不放入前端或公開資料。

Actions 約每 20 分鐘更新全臺鄉鎮，預報原始資料快取最多 6 小時以減少流量，觀測每次重新取得。GitHub 排程可能延遲；超過 45 分鐘的快照或超過 2 小時的觀測會標為較舊資料。原始資料時間在 24 小時內且必要數值齊全時，仍顯示參考建議、數值與插畫；超過一天才停止建議。降雨時段過期仍可作上次預報參考，資訊面板會顯示日期與歷史時段，不當成目前預報。手動重新整理讀取最新已發布資料，並不強制呼叫氣象署。

GPS 在瀏覽器以完整預報座標匹配，座標不傳到 GitHub 或第三方。正式 API 對應的即時觀測仍是鄰近測站，並非陽台實況。
