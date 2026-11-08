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

## 琴頸方向修正

使用者回報已於手機實測前一版操作正常。本次只反轉虛擬琴頸的空間方向：上端為 C3，靠近頭部的下端為 C6，百分比由上至下增加。

- Node 16 / 16 通過；桌面與 390px 尺寸瀏覽器各 77 / 77 通過。
- 新增三模型 × mouse / touch / pen × 上下端點檢查，共 18 項；觸控事件仍為合成事件。
- 實際滑鼠向下拖到琴頸靠近頭部的端點，正確顯示 C6 / 1046.5 Hz / 0 cents。
- 其餘既有圖表、音訊、水平滑桿與鍵盤回歸檢查皆通過。

## 專注演奏模式

- 在桌面與手機尺寸執行 93 項瀏覽器檢查：新增專注模式啟動、音訊自動啟用、圖表／標籤隱藏、僅顯示退出控制、viewport 無溢出、user-select:none、200 次連續滑音事件、釋放停止、矮橫向高度、退出同步數值、Esc 與快速切換。
- 新增模式測試中的觸控為合成 PointerEvent，仍不宣稱已在實體手機上測試本次新模式。使用者先前回報手機演奏正常。
- 專注模式會保留目前映射與位置；向下、靠近頭部仍是高音。
- Node 16 項測試維持通過；新模式由 src/focus.js 管理，完整保留可獨立維護的原始碼。
- 正式部署採內容 hash 的 bundle / CSS URL，解決曾實際觀察到的舊版腳本快取。

專注模式實際 viewport 檢查：390×844 的 scrollWidth / scrollHeight 恰為 390 / 844，滑鼠向下跨出琴頸可達 100%，放開後停止發聲表情；連續捲動後 scrollTop 仍為 0。844×390 橫向時 scrollHeight 為 390，角色臉完整位於 viewport 內。

## 專注演奏直連

直連：<https://yuuyuutube.github.io/tools/otama-lab/?mode=play>。

- 桌面與手機尺寸共 103 項瀏覽器檢查通過，Node 16 項通過。
- 確認載入時已進入專注模式但聲音開關仍關閉；第一次按住即啟動音訊與發聲表情，滑到靠近頭部可達 C6，放開停止。
- 確認 `?mode=play&keep=test#strip` 的其他 query 與 anchor 均保留；退出只移除 mode，並恢復最新音高讀值。
- 本機實際開啟 `/?mode=play` 已直接顯示琴頸與臉。音訊不依賴載入時的自動播放，仍遵守瀏覽器手勢要求。

## 專注模式聲音控制修正

- 使用者回報手機初次演奏可能靜音；尚未在同一實體手機重現，沒有假定已確認裝置原因。增加模式內的顯性 click 音訊開關，並保留原本首次操作自動嘗試啟動。
- Node 19 / 19 通過，新增：resume 後仍 interrupted 不標示成功、播放途中中斷會停止且可重試、新 click enable 請求可取代未完成的首次 resume。
- 瀏覽器 112 項檢查包含：專注模式聲音按鈕只有 SVG 且有可讀名稱、與一般開關同步、手動靜音後拖曳維持靜音、中斷不離開專注、在模式內重新啟動、直連模式直接開關聲音。
- 已在本機 390px viewport 實際點擊喇叭一次，兩個開關均為 aria-pressed=true、圖示切換為 volume，畫面高度與 scrollHeight 同為 844。
- 音訊啟用規則參考 [WebKit user activation](https://webkit.org/blog/13862/the-user-activation-api/) 與 [AudioContext state](https://developer.mozilla.org/en-US/docs/Web/API/BaseAudioContext/state)。此規則是可能原因，並非對使用者手機的診斷。

## G3–D6 / C3–C6 雙音域

- 預設 G3–D6（195.99771799–1174.65907167 Hz、31 半音），另一個選項 C3–C6（130.81278265–1046.50226120 Hz、36 半音），沒有其他或自訂選項。
- Node 28 項：兩音域 × 三模型的端點、各 1001 個位置單調／反算、倍頻八度、靈敏度數值導數、音符標記與無效 query fallback；保留音訊與分享圖檢查。
- 瀏覽器 154 項：選單僅兩項、每一音域與模型的讀值／雙圖一致、31／36 半音上下限、標記數與圖例、比較基準跨音域的端點限制、網址保存、專注直連保留音域，以及既有演奏／音訊回歸。
- 三模型均依所選 f₀ / f₁ 計算；等距半音不再固定 36，反比模型不再固定 0.875。
- 專注模式不增加音域控制項，沿用一般模式選擇；`?mode=play&range=c3-c6` 可直接開啟舊音域，未提供 range 則使用 G3–D6。
- 這些是網站的模擬演奏範圍，並非宣稱 DX 的官方固定音域或實測曲線。

快取相容補充：正式站初次載入曾取得 7bee75b 舊版 HTML，搭配新 bundle 後缺少 range 節點而失敗，重新整理才恢復。現在會補齊新音域的 DOM hooks；`tests/cached-page.html` 保存該舊格式，新增 3 項確認預設讀值、僅兩個選項與無需 reload 即可切換音域。完整瀏覽器檢查增為 154 項。

## Phase 2 · 獨立真琴分析頁（2026-11-07）

- 建置成功，dist 包含 live.html、live.bundle.js、pitch-worker.js 與版本化樣式，使用相對 URL，可放在 GitHub Pages 子目錄；沒有新增第三方套件。
- Node 42 / 42：原有音高與合成器回歸，加上 44.1／48／96 kHz 的 60–2000 Hz 正弦與泛音、+37 cents、非標準音、DC、弱音、固定 seed 噪音、滑音／顫音、品質、穩定度、12 秒歷史與斷線。
- 麥克風生命週期測試：取消後晚到的 stream、權限拒絕後重試、resume 失敗後晚到 stream、track ended、AudioContext interruption、Worker 錯誤與 timeout、停止後不接受晚到結果，均確認資源釋放。
- Live 瀏覽器桌面與 320px viewport 各 31 / 31 通過（iframe 內容約 288px）；另檢查 390×844 完整頁面無水平溢出。完整流程：原生 Web Audio → 原生 MediaStream → 正式麥克風控制器 → 真正 Worker → YIN → Hz／note／cents／tuner／timeline。包含 440 Hz、+37 cents、82.41 Hz、1900 Hz、滑音、5 Hz／35 cents 顫音、靜音、取消與拒絕權限、重新啟動及離頁停止。
- QA 的 getUserMedia 由測試頁替換為明確標記的原生合成串流，無實體麥克風或喇叭輸出。此結果不能當成實際 DX 或實際麥克風準確率。
- 既有虛擬演奏瀏覽器 154 / 154 回歸通過，包含拖曳、雙音域／三映射、專注直連與聲音控制；原本角色與演奏 bundle 未改動。
- 瀏覽器測試曾發現原生 timer receiver 綁定問題及極窄版面的四位數 Hz 溢出，已修正並重測。
- 瀏覽器測試宿主偶有不屬於本專案的 MutationObserver.observe 錯誤（專案沒有使用 MutationObserver）；正式頁需另檢查 console。QA PASS／FAIL 保存在 docs/qa/live-*.txt。

尚未驗證：真實 DX 演奏、真實麥克風與背景環境的倍頻／半頻誤判、iOS Safari／Android Chrome 的實際權限與背景中斷、實體觸控裝置、VoiceOver／TalkBack。本次窄螢幕檢查是瀏覽器 viewport，不宣稱為真實手機測試。下一步優先用 DX 實測調整偵測條件，再進 Phase 3 位置量測。

## 2026-11-08 · 軌跡專注模式、60 秒錄製與 PNG

- 使用者已以真琴回報既有音高軌跡與靈敏度合適。本次 `src/analysis/yin.js`、`src/input/microphone.js`、`src/analysis/stability.js`、pitch-worker.js 與虛擬演奏 bundle 無變更，保持原分析參數。
- Node 47 / 47：60 秒全段保留（1501 個 40ms 樣本）、拒絕開始前／重複／逆序／超時資料、非標準音與空白片段、12 秒分行及末行實際停止時間、不可變快照、新舊錄製獨立、60 秒計時上限、分享能力 fallback、圖片刻度與五行輸出。
- 瀏覽器短段流程：桌面、320px 與 844×390 各 24 / 24 通過。涵蓋：麥克風共用、專注模式無捲動、可用高度、SVG／user-select、Esc 保留分析、音量與 clipping、開始／停止與計時、真實 PNG bytes／尺寸／檔名、分享與取消（stub）、重開／捨棄、無訊號不產生假圖、關閉麥克風及背景中斷時保留結果。
- 真實 60 秒測試 17 / 17：未加速計時，確認自動停止、顯示 60.0 秒、麥克風與專注狀態保留、1440×1432 五行 PNG，並逐行檢查軌跡像素存在。這是原生 Web Audio 合成 MediaStream 經正式 Worker／YIN 的測試，不是 DX 實測。
- 原本 Live Lab 的 31 項音高追蹤檢查維持，另以舊 HTML 搭配新 bundle 檢查快取相容；舊頁缺少新按鈕時仍能分析，重新整理 HTML 後才顯示新功能。
- 實際 viewport：390×844 的 scrollWidth / scrollHeight 為 390 / 844、圖表高度 748px；捲動嘗試後 scrollY=0。844×390 橫向高度 390、控制列底部 382、viewBox 820×310，沒有溢出。320px 尺寸也執行完整錄製流程。
- 匯出 PNG 的實際下載與視覺檢查使用 top-level tests/export-browser.html，範例 docs/qa/synthetic-pitch-export.png 已明確標示合成測試來源，不是 DX 測量。測試宿主不支援 embedded iframe 的 Blob media download，因此 iframe 中另以 PNG 簽名、解碼、尺寸與連結驗證；top-level PNG media 下載成功。
- 測試宿主偶有不屬於專案的 MutationObserver.observe 訊息；產品程式沒有使用 MutationObserver。瀏覽器 PASS 紀錄與預覽保存於 docs/qa/capture-*。

尚未驗證：本次新介面在實體 iOS／Android 的觸控、背景行為及原生分享選單；真實分享未向任何第三方傳送檔案。圖片分享測試以 stub 驗證 File 與取消行為，不宣稱已完成手機原生分享。錄製只保存衍生音高，不錄製聲音。
