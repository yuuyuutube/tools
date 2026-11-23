> 2026-11-23 發布更新：本頁 JSON／ZIP 已同步目前 Photoshop 平塗、補字、符號色層與月亮光芒。22份專案內嵌圖層均與最新PNG相符，見 current-project-validation.json。舊 validation.json／pixel-validation.json 是原始匯出時的歷史驗證，不代表此次修圖後的墨線仍與原批次相同。

# Light Paint 塔羅分層修色專案

0～21 號共 22 張；每張都是 1024 × 1536，從目前已匯出的 Y/O/B/N 色版製作，包含最近一次修色結果與 2026-11-19 的墨線修訂（來源 ff36530）。

本次重建的是網站發佈用專案；使用者尚未開始手繪上色。瀏覽器個人草稿不會被這個動作更動。

## 開啟

1. 在本目錄的 `index.html` 下載全部專案 ZIP，或下載所需牌的 `NN-card-id.light-paint.json`。
2. 開啟 Light Paint，按「載入專案」選取 JSON。不要用「匯入圖層」載入 JSON。
3. 尺寸、圖層與色票會一起載入，不必新建畫布。

## 圖層

- 上層「墨線・參考用，請勿上色」：透明背景的墨藍色墨線，保留現有輪廓、木刻排線與抗鋸齒。沒有把網點、紙紋或套印黏墨烘進去。透明鎖定只限制繪圖範圍，並非防止改動的完整圖層鎖；請保持選取底層。
- 下層「色版・在這層修色」：不含黑色輪廓的純平塗，包含本來的深色衣物、雲層、岩面等色塊。專案預選此層，筆刷預設硬圓筆、100% 不透明度、關閉筆壓大小。

每張另附 `-colour.png` 純平塗、`-ink-transparent.png` 透明墨線，以及低解析預覽 PNG。這些 PNG 和 JSON 內的兩層完全相同。沒有牌框、牌名及牌號；插畫本身的符號與文字仍保留在墨線。

畫布是原始完整圖面，不是卡片外框比例。網站會按目前既有的圖窗和位置裁切，這次不修改圖窗。完整圖面下方可能有延伸色塊或留空，請保持畫布尺寸與圖案位置。

## 修改

1. 選下層「色版」，按 I 從正確的同類物件取色，或點專案色票。
2. 用硬圓筆補色。上層墨線會照常蓋在顏色上，不會被底層筆刷蓋掉。
3. Light Paint 的 G 填色只參照目前圖層，不跨圖層讀取墨線。相同顏色若跨越墨線連在一起，填色會一起修改；遇到此情況請復原，改用筆刷。兩層分開並不會自動增加跨圖層填色能力。
4. 原始墨線下方也保留原色，以免邊緣產生白縫；不要擦掉顏色後留下透明孔洞。

## 交回與匯出

- 按「保存專案」，保留包含兩層的 JSON。建議自行改名為 `06-lovers-edited.light-paint.json`，以辨識牌號。
- 需要純色版 PNG 時，先點上層墨線的可見按鈕，隱藏墨線，再按「輸出 PNG」。建議命名 `06-lovers-colour-edited.png`。保持 1024 × 1536，不縮放、不裁切。
- 要看合成效果，可再顯示墨線；需另存合成 PNG 時另取檔名，避免混淆。
- 交回 JSON 和／或純色版 PNG 後，再將修改接入色版來源並重新分色、產生網點與套印圖。這批是編輯用專案，尚未新增自動讀回手繪色版的網站功能；不會因下載或修改 JSON 就自動覆蓋正式網站。

## 來源與重建

`manifest.json` 記錄每張使用的來源印版雜湊及匯出資訊。愚者來源為 `fool-pipeline/fool-*-source.png`，其餘來源為 `batch-XX/N-*-source.png`。

色版層按 Y/O/B 的色密度與 N 的深色色塊通道合成；N 的結構墨線通道單獨轉為透明墨線。彩色實色標記也納入平塗。墨線遮住的像素會由最近的非墨線色塊向內延伸，清除原始標籤在墨線底下的碎色；這不改動透明墨線。PNG 印版密度已量化為 8 位元，所以和管線內浮點平塗相比可能有個別色階的取整差異。

在 tarot-drawer 根目錄執行：

```sh
swiftc -O scripts/export-light-paint.swift -o /tmp/export-light-paint
/tmp/export-light-paint "$PWD"
swiftc -O scripts/validate-light-paint.swift -o /tmp/validate-light-paint
/tmp/validate-light-paint "$PWD"
python3 scripts/package-light-paint.py
```

此命令重建本目錄的發佈副本。請把自己改過的專案另存於其他位置，避免重建時覆蓋。

產出後可執行 `python3 scripts/package-light-paint.py` 驗證檔案並打包全部專案 ZIP。逐像素墨線透明度比對結果另見 `pixel-validation.json`。
