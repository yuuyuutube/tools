# 晾晾日和 · Laundry Weather

一幅由天氣吹動的陽台插畫。原生 HTML、CSS、SVG、ES modules，加上一個零第三方依賴的 Node 氣象代理。無安裝與建置步驟。

## 啟動

需要 **Node.js 22 或以上**（開發與測試使用 24.12.0）。

```sh
cd /Users/yoyohuang/dev/yuuyuutube/tools/prototype/laundry-weather
npm start
```

開啟 http://127.0.0.1:4317 。第一次會嘗試定位，拒絕或失敗會提供手動地點選擇。沒填金鑰即可欣賞四種展示天氣；每個展示場景都是明確標示的固定資料。

若目前終端找不到 `node` / `npm`，這台電腦已安裝的版本可這樣使用：

```sh
export PATH="/Users/yoyohuang/.nvm/versions/node/v24.12.0/bin:$PATH"
npm start
```

`npm run dev` 會監看後端檔案並重新啟動。前端檔案修改後重新整理瀏覽器即可。可用 `.env` 的 `PORT` 更改埠號。

## 設定氣象署金鑰

1. 在中央氣象署開放資料平台申請授權碼。
2. 複製 `.env.example` 成 `.env`。
3. 填入 `CWA_API_KEY=你的授權碼`，保留 `DEMO_MODE=false`。
4. 重新啟動伺服器。
5. 執行 `npm run verify:live` 檢查臺北市中正區預報與參考觀測。

`.env` 已排除版本控制。金鑰只由伺服器讀取，不放入前端、不回傳給瀏覽器、不印出上游錯誤網址。官方資料未取得時會顯示缺漏、較舊快取或明確標記的展示資料。

**本次沒有提供 CWA_API_KEY，因此尚未完成正式授權 API 的端到端驗證。** 官方來源與文件已研究；解析器以文件的現行欄位結構實作，測試使用人工合成的資料結構，不能當成真實 API 成功證據。`verify:live` 缺金鑰會以 exit 2 結束。

## 已實作

- 原創 SVG：奶油色花朵 T-shirt、朱橘翻領外套、雙波浪毛巾、拼色長襪、日輪與前景熟睡花貓。
- 晴朗、多雲、潮濕、雨／高降雨風險的套色與緩慢轉場；真實資料模式也有概略日夜配色。
- 風速與風向驅動各衣物的支點旋轉、慣性過渡、不同頻率／相位與微小布料變形。
- 桌面一條晾衣繩、手機兩條晾衣繩的獨立構圖，包含平板斷點。
- GPS 鄰近鄉鎮預報區匹配、22 縣市選單、正式模式的完整鄉鎮選單；展示模式各縣市提供一個代表地點。
- 四級生活參考分數（移入資料說明）、降雨時段、資料時間、欄位來源與參考測站揭露。
- 全螢幕、資訊隱藏、重新整理、原生對話框、鍵盤焦點與 Escape 關閉。
- Reduced Motion、背景分頁停止動畫及輪詢、清理事件與計時器、API 快取與請求合併。

## 測試

```sh
npm test
npm run verify:live  # 必須先設定金鑰；會向官方發送請求
```

`npm test` 使用 Node 內建測試工具，不需要安裝套件。涵蓋正規化、分數、時段、缺值、快取、定位、HTTP 代理、私有檔案保護與動畫生命週期。HTTP 整合測試需要可開啟本機迴路介面連接埠的環境。

本次瀏覽器驗證範圍、實際截圖與未驗證項目見 [驗證紀錄](docs/verification.md)。一小時動畫測試是**模擬時間**，不是實際連續運行一小時或記憶體洩漏證明。

## 結構

```text
assets/balcony.svg    完整原創向量插畫與圖層
src/scene.js         風與畫面動畫；可單獨清理
src/composition.js   依畫面比例重排剪紙構圖與晾衣繩支點
src/app.js           UI、資料請求、取消、輪詢與錯誤狀態
src/locations.js     縣市資料集、GPS 與僅城市的儲存
src/demo.js          固定展示資料
src/score.js         生活參考指標（前後端獨立於插畫）
server/index.js      原生 HTTP 伺服器與受限制的公開檔案
server/cwa.js        官方請求、快取、並行控制與區域／測站匹配
server/normalize.js  現行氣象署資料結構與時間區間正規化
tests/              可執行的測試與合成 fixture
scripts/verify-live.js  有金鑰時的正式驗證入口
```

閱讀 [資料來源](docs/data-sources.md)、[計分規則](docs/laundry-score.md)、[美術與動態](docs/art-direction.md)。

## 部署與限制

正式天氣需要持續運行的 Node 服務，或另外移植相同代理邏輯至 Serverless。這一版可直接部署至支援 Node 22+ 的主機；設 `HOST=0.0.0.0`，透過 HTTPS 反向代理對外提供服務。伺服器的工作目錄必須為本專案，讓啟動指令讀取這裡的 `.env`。

GPS 需要 HTTPS 或 localhost。前端 `/api/*` 與代理必須同源。若放在 `/tools/laundry-weather/` 子路徑，由反向代理移除此前綴並將 `/api/*` 導向此 Node 服務。

**GitHub Pages 只有靜態託管，不能執行此 Node 代理。** 靜態檔案可以展示插畫；缺少代理時會明確顯示展示資料與連線提示，不能宣稱有即時天氣。此任務只在指定資料夾建立本機專案，未發布外部網站。

GPS 使用鄰近預報座標，不是行政區多邊形判定；附近測站也不能精確代表某個陽台。日夜為臺灣時間 06–18 時的藝術近似。衣物乾燥不提供分鐘數預測。
