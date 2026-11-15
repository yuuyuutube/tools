# 小小相遇所｜台灣動物認養圖鑑

每一顆轉蛋裡，是一隻真正在台灣收容所等待被認識的動物。純靜態網站（原生 ES Modules，無建置步驟），資料來自農業部「動物認領養」開放資料。

## 啟動

```bash
python3 -m http.server 8765      # 在 tools/ 目錄下執行，開 http://localhost:8765/adopt-strays/
npm run sync                     # 抓官方全部資料，更新 data/ 快照（需 Node 18+）
npm test                         # 資料層單元測試
```

網址參數：`?demo=1` 展示模式、`?live` 略過快取直接抓官方 API、`?fail&nocache` 模擬 API 失敗。
推版時請改 `index.html` 裡的 `ENC_V`。

## 結構

| 檔案 | 內容 |
| --- | --- |
| `js/api.js` | Animal API Client（分頁、逾時、依編號查詢） |
| `js/normalize.js` | Data Normalizer（清理不可信文字、照片網址白名單、快照壓縮） |
| `js/eligibility.js` | Adoption Eligibility（open / upcoming / unknown / closed） |
| `js/selector.js` | Animal Selector（機率均等、同場不重複、無稀有度） |
| `js/search.js` | Animal Search（篩選、排序、分頁） |
| `js/favorites.js` | Favorites（LocalStorage，只存最少資訊） |
| `js/share.js` | Share Generator（1080×1350 PNG、分享連結） |
| `js/freshness.js` `js/data.js` `js/store.js` | Data Freshness、資料來源切換、IndexedDB 快取 |
| `js/demo.js` | Demo Mode 的虛構資料 |
| `js/art.js` | 轉蛋機、相遇所店員、圖鑑、小冊子、盆栽、替代插圖、相遇章的 SVG |
| `js/gacha.js` | 轉蛋演出（可跳過、支援 Reduced Motion） |
| `js/ui.js` | 自訂下拉、單選、勾選、確認／提示視窗 |
| `js/views.js` `js/main.js` `js/card.js` | 圖鑑、故事頁、小冊子、關於、大廳與相遇所店員 |
| `scripts/sync.mjs` | 每日同步快照（建議排程每天執行一次） |

## 完成狀態

- 已完成：大廳場景、轉蛋流程、相遇卡、圖鑑（篩選／排序／翻頁）、動物故事頁、收藏小冊子、分享圖與連結、相遇所店員、音效（預設靜音）、Demo Mode、資料失效處理。
- 使用真實資料：動物資訊與照片全部來自官方 API；照片皆為官方 `album_file` 原圖（縮圖經圖片代理縮小，內容相同）。
- 使用展示資料：只有 Demo Mode（`?demo=1`，或官方資料連不上且沒有任何快取時），畫面會標示「展示模式／非真實認養資料」。
- 未做：QR Code、匿名分析、後端。成功指標（探索、收藏、點擊收容所聯絡資訊等）目前沒有蒐集任何數據。

其他文件：[資料來源與限制](docs/data.md)、[美術設計規格](docs/art.md)、[測試結果](docs/tests.md)。

### 歡迎故事與大廳更新

- 桌巾改為奶油底藍粉腳印，圖樣來源為 `cloth.svg`。
- 角色職稱為「相遇所店員」，名字沿用「阿糰」；點角色可重看三段歡迎故事。
- 首次看新版會自動介紹相遇卡、收藏、領養與分享；完成或按關閉後記錄於 `enc.welcome.v2`。
- 故事末段提供轉蛋、圖鑑與網站分享入口。網站分享支援原生分享，不支援時複製介紹與網址。
