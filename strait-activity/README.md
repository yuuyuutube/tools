# 台海觀測所

公開歷史資料工具，提供每日數據、全年互動年曆、同期間比較、幾何資料重播及 PNG 匯出。純 HTML、CSS、ES modules；無前端依賴、無建置步驟。

## 執行

在此資料夾執行 `npm start`，開啟 http://127.0.0.1:4173 。不可直接以 file:// 開啟，因瀏覽器模組與資料載入限制。Node 16.14 以上可執行；排程建議 Node 22。

`npm test` 驗證資料與統計。`npm run update` 從來源完整同步；`node scripts/update.mjs --local` 僅重新解析已下載的 CSV。更新使用暫存 JSON 後更名，失敗保留快取；狀態另存 `data/status.json`。

## 部署與每日更新

分享圖片位於 `assets/og.png`（1200×630），favicon 同時提供 SVG 與 PNG，另附 Apple touch icon。`scripts/generate-assets.ps1` 可在 Windows 重新產生 PNG。頁面 canonical、OG 與 Twitter 圖片 URL 使用既有站點 `https://yuuyuutube.github.io/tools/strait-activity/`；若更換網域需同步修改 index.html。分享平台可能快取舊縮圖，發布後需於平台重新抓取。

可將整個資料夾放到既有靜態網站的 `/tools/strait-activity/`，所有資源使用相對路徑。沒有註冊或發布額外託管網站。

此工作區不是 Git checkout，因此不能直接啟用 GitHub Actions。已提供 `.github/workflows/update-data.yml` 範本：在正式 repository 將它複製到 **repository 根目錄** 的 `.github/workflows/`。範本假設專案保留 `tools/strait-activity` 路徑；若此資料夾本身是 repository 根目錄，需改 working-directory 與 git add 路徑。

Cron `0 6 * * *` 為台灣 14:00；GitHub 執行可能延遲。設定 Actions 可寫入 repository；若 branch protection 禁止 bot push，改用更新 PR。靜態主機需在提交後自動部署，或將提交的新資料同步至既有站點。**目前僅提供配置，尚未啟用遠端排程或公開部署。**

## 操作

- 觀測儀可切換「方塊／圖示」，共機與艦艇一起切換，預設圖示；上方一個標記代表 1 架次，底部一個標記代表 1 艘，切換保留日期及播放狀態，PNG 與分享連結沿用所選樣式。
- 每日折線及長條圖皆支援圖例開關，至少保留一個指標。平均線可開關，基準為最新公告之前 30 個有效觀測日，與顯示期間無關；隱藏指標也隱藏對應平均線。
- 點選圖表、資料表日期或拖動圖表日期滑桿，會同步更新選定日期標線及下方數據；「詳情」開啟當日面板。滑桿支援鍵盤方向鍵及手機觸碰。

- 年曆支援滑鼠停留、點擊、手機點按、Tab 與方向鍵；方向鍵上下移動一日、左右一週。手機採可橫向滑動的大格年曆。
- 日期查詢輸入 YYYY-MM-DD；詳情面板可用 Escape 關閉。
- 每日圖表可點擊，鍵盤可用下方資料表選日。
- 觀測儀可播放／暫停、拖曳日期、調整速度、切年與全螢幕；背景分頁暫停計時，尊重 reduced motion。
- PNG 以當前畫面類型、日期或年度產生；分享連結含年度、指標與重播日期，優先使用 Web Share，不支援時複製連結。

已完成自動資料測試與程式語法檢查。瀏覽器驗證受環境阻擋，尚未完成實機桌面／手機視覺及觸控驗收，詳見 DEVELOPMENT_LOG.md。
