# Phase 1 驗證結果

日期：2026-11-07（Asia/Taipei）。本機 macOS / Codex IAB 真實瀏覽器；Node v24.22.1。沒有使用實體手機或實體 DX。

## 自動化檢查

- **Node 16 / 16 通過**：`node --test tests/pitch.test.js tests/audio.test.js tests/build.test.js`（與 npm test 相同測試）。
- 三種模型各 1001 個位置：端點、單調性、frequency / position 反算、圖表半音與 MIDI 一致。
- C3 / A4 / A5 / C6、+23 / −37 cents、最近音符邊界、連續頻率、倍頻八度、局部導數。
- 音訊單元測試使用 fake AudioContext，涵蓋 enable 不發聲、滑音、release、重複 stop、resume 晚到、enable/disable 競態、重疊 play、失敗重試。
- **瀏覽器 59 / 59 通過**：`tests/browser.html`；在桌面與 390px viewport 執行。完整逐項結果在 [qa/browser-results.txt](qa/browser-results.txt)。
- 測試真實 DOM 的三模型讀值、游標數據、cents、基準頻率、八度、超出音域停用、鍵盤微調、ARIA 與 touch-action。
- Pointer mouse / touch / pen 為合成事件，用來驗證拖曳／取消／停止邏輯。因合成事件不在瀏覽器的 active pointer registry，這部分測試暫時 stub capture，**不能當成原生 pointer capture 或實體手機測試**；真實滑鼠捕捉另行操作驗證。
- 瀏覽器測試另以**真實 Web Audio Context + AnalyserNode**，確認：按住鍵盤產生非零波形、frequency 由 440 滑至 450 Hz、release 後 voice 清除且波形歸零；pointerup / pointercancel / lostpointercapture / window blur 與停止均清除實際合成器 voice。輸入事件為合成事件，AudioNode 與波形為原生。

## 實際瀏覽器操作

| 項目 | 結果與驗證方式 |
| --- | --- |
| 先執行既有原型 | 已開啟原型，確認角色與 Home / End 讀值、音訊按鈕；原檔保留 |
| 桌面滑鼠 | 已點擊琴頸；從琴頸內拖到外部，游標到達 C6，放開後回到待機；原生滑桿拖曳可改變讀值 |
| 鍵盤 | 琴頸 Home / End、原生 range 的 Home 與 Shift+ArrowRight 已操作；後者正確移動 0.1% |
| 三模型、Hz / 半音一致 | DOM 整合檢查通過；手機版另切換 Equal semitone spacing，圖表曲線與公式同步 |
| 音訊啟動與停止 | 實際點擊開關可啟用；開關本身不持續發聲；原生波形與釋放測試通過 |
| 響應式 | 檢查 320×740、390×844、1280×1000 viewport；document scrollWidth = clientWidth，無水平溢出 |
| 圖表重排 | 手機 viewBox 為 360×245、桌面 700×245；跨尺寸後雙圖仍保留相同 frequency / position |
| 部署產物 | `node scripts/build.mjs` 成功；classic bundle 可作為傳統 script 解析；dist 的 HTML、bundle、CSS、assets 與來源一致，含 .nojekyll |
| GitHub Pages 子路徑 | 瀏覽器開啟 `/dist/index.html`、`/dist/`，CSS、module、圖表及操作正常 |
| Console | 乾淨的正式頁面分頁，在載入、鍵盤、滑桿、重載、resize 後 logs 無 warning / error |
| 角色 | 奶油臉、原眼睛／嘴巴造型、歪頭、發聲表情保留，見截圖 |
| Reduced motion | CSS 明確停用 transition / animation；未實際切換 OS 偏好進行測試 |
| 螢幕閱讀器 | AX tree 可見 slider 方向／值／音名／cents、圖表描述與狀態；未操作 VoiceOver / TalkBack |

瀏覽器整合測試的 iframe 分頁曾記錄兩筆沒有來源 URL 的 `MutationObserver.observe` 錯誤；專案原始碼並未使用 MutationObserver。另開乾淨的正式頁面分頁未重現。尚未定位測試分頁的這兩筆錯誤來源，因此不宣稱整個測試宿主零錯誤。

## 未驗證與發行前手動檢查

- **實體 iPhone / iPad Safari、Android Chrome**：連續觸控、第二手指干擾、滑出琴頸、系統取消、橫豎切換、拖琴頸不滾頁、在琴頸以外仍能正常滾頁。
- 目前只有手機尺寸預覽、合成 touch / pen 事件與 CSS touch-action 檢查；不能宣稱已完成真實手機觸控驗收。
- 真實裝置切換分頁／鎖屏／來電、音訊裝置變動、低電量或背景節流。
- 外接鍵盤、多瀏覽器（獨立 Safari / Chrome / Firefox）、VoiceOver / TalkBack 與 OS reduced motion。
- 耳機／喇叭的主觀聽感、延遲與音量；本次以數位波形確認音訊，不代表所有硬體輸出已聆聽驗證。
- 分享平台各自的 OG 預覽快取與顯示尚未逐一測試；實際 PNG 與 favicon 公開網址已驗證 HTTP 200。

## 畫面證據

- [桌面完整畫面](qa/desktop.jpg)
- [手機尺寸完整畫面](qa/mobile.jpg)

## 重現

```sh
python3 -m http.server 4187 --bind 127.0.0.1
# 開啟 /，及 /tests/browser.html 後按 Run checks。
# 有 Node.js 20+ 的環境：
npm test
npm run build
# 再開啟 /dist/。
```

本次環境 node 不在 shell 預設 PATH，使用 Codex bundled Node 執行相同測試與建置腳本，沒有新增 runtime dependency。

## 本次拖曳修正回歸

- 已重現舊版：從綠色標記左側拖曳，命中 `rail` 而非互動 strip，位置不變。
- 新版互動目標為整個 81px 琴頸；從相同標記邊緣拖曳，35% 可連續移動至 92.76%。
- 手機尺寸 390×844 下實際滑鼠拖曳標記可移至 97.15%，頁面 scrollTop 保持 0。這是手機版面下的滑鼠驗證，並非實體觸控。
- 59 項整合測試新增：標記邊緣命中、水平滑桿 mouse / touch 兩端、捕捉失敗時跨區拖曳、釋放、第二指、失去捕捉，以及 SVG 圖示／分享 metadata。
- 桌面與 390px 瀏覽器測試結果分別位於 `qa/browser-results.txt` 與 `qa/browser-results-mobile.txt`。
- 新增 classic script 解析與 PNG 格式／尺寸、SVG 無文字資產檢查，共 16 項 Node 測試。
- 新版已去除宣傳標語、實驗編號、角色旁白與裝飾性雙語；保留操作說明、數值、科學標示。
- Favicon：SVG + 32px PNG；Apple touch icon：180px；OG 圖：1200×630 PNG（向量原稿亦保留），圖中無文字。
- file:// 的 ES modules 已改為預先生成的 classic script；IAB 的 URL 安全政策禁止開啟 file://，因此只完成傳統 script 解析檢查與 HTTP 下的功能測試，沒有宣稱已實測雙擊 HTML。

## GitHub Pages 正式站驗證

功能 commit：`19d0318006074cd769d7d9e14ac89410958ccae1`，已推送 origin/main。

- 既有 Pages source 為 main /；[此次 workflow](https://github.com/yuuyuutube/tools/actions/runs/42340945013) 的 build、report-build-status、deploy 均成功。
- 正式頁 <https://yuuyuutube.github.io/tools/otama-lab/> 已由 404 更新為完整工具。
- 實際從標記邊緣拖出琴頸，位置由 35% 移至 95.83%；切換等距 Hz 模型後，顯示 1008.3 Hz，雙圖均使用 1008.3485329293906 Hz。
- 正式頁測試期間 console 無 warning / error。
- 正式 OG PNG 與 SVG favicon 均回應 HTTP 200，Content-Type 分別為 image/png、image/svg+xml。
- 實體手機觸控仍未驗證；上述手機版測試為 390px viewport、合成觸控事件及滑鼠拖曳。
