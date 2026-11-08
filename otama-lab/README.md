# OTAMA LAB

用虛擬 Otamatone 比較琴頸位置、頻率、音名與音程，並在獨立的真琴分析頁用麥克風觀察實際演奏。純前端，沒有後端、第三方執行時依賴或 API key；虛擬演奏頁不要求麥克風。

## 開啟

- 正式網址：<https://yuuyuutube.github.io/tools/otama-lab/>
- 真琴分析：<https://yuuyuutube.github.io/tools/otama-lab/live.html>
- 本機可直接開啟 `index.html`，或建置後的 `dist/index.html`。
- 開發／執行瀏覽器測試時，在此資料夾啟動 HTTP server：

```sh
python3 -m http.server 4187 --bind 127.0.0.1
```

開啟 <http://127.0.0.1:4187/>。`app.bundle.js` 是已提交的傳統 script，無需載入 ES modules，因此開啟工具本身不依賴 HTTP server。瀏覽器的 file:// 安全限制依產品而異；本次測試宿主禁止 file://，未能直接實測雙擊開啟。

## 真琴分析（Phase 2）

獨立的 `live.html`，首頁右上角「真琴分析」可進入。按「開啟麥克風」並允許權限，再靠近麥克風演奏單音；按同一按鈕、Esc、離開頁面或切到背景均停止取音。權限等待中可取消，晚到的允許結果會立即關閉，錯誤後可重試。

- 顯示實際偵測的 Hz、最近音名／八度、cents、週期性訊號品質、音量、音高穩定度。
- 最近 12 秒的半音等距時間線自動縮放，保留連續滑音與顫音；無音高時斷線。關閉麥克風後保留當次軌跡，可按垃圾桶圖示清除；再次啟動開始新一輪。
- 自行實作 YIN 的差分、累積平均正規化、閾值與拋物線內插；約 60–2000 Hz，不套用虛擬琴的 G3–D6 範圍、不吸附標準音。未找到可信週期不回傳猜測值。
- 4096 samples（取樣率高於 60 kHz 時 8192），每個結果後約 40 ms 再分析；單一 Worker、最多一筆在途工作，避免累積延遲。FFT frame 是分析視窗，不表示以最大頻譜峰值判斷基頻。
- 品質為 `1 − CMND` 的週期性指標，不是準確率。穩定度要求至少 250 ms／5 個樣本，最近 600 ms 的音高全距 ≤25 cents 才標示穩定；滑音／顫音會顯示變動中，與品質分開。
- 只在記憶體保留音高歷史，不錄音、不上傳、不回播；沒有音訊連到喇叭。沒有 DX 位置量測或假實測資料。

麥克風頁需透過 **HTTPS 或 localhost** 開啟，不能依賴雙擊本機 HTML；以瀏覽器使用者手勢啟動 AudioContext。背景噪音、和弦、強泛音與設備處理都可能造成倍頻／半頻誤判，仍待實體 DX 和 iOS／Android 驗證。演算法依據 [YIN 原論文 DOI](https://doi.org/10.1121/1.1458024)，API 參考 [getUserMedia](https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getUserMedia) 與 [AnalyserNode](https://developer.mozilla.org/en-US/docs/Web/API/AnalyserNode)。

## 軌跡專注模式與錄製

在真琴分析頁的「音高軌跡」右上角，按四角圖示進入專注模式。畫面填滿可見 viewport，保留圖示麥克風開關、小音量條、錄製／停止與退出；沒有清除按鈕。手機直／橫向皆以可見高度調整，無頁面捲動或文字誤選。退出或 Esc 只切換視圖，麥克風與正在錄製的資料會繼續；一般模式的 Esc 仍關閉麥克風。

1. 開啟麥克風後，按圓點開始錄製音高軌跡。
2. 計時顯示 `00:18 / 01:00`；隨時可停止，滿 **60 秒**自動結束。
3. 預覽整段軌跡，按「下載 PNG」或「分享」。每 12 秒一行，最多五行；共用同一組半音音高刻度、保留滑音／顫音與未偵測片段的斷線，最後一行在實際停止時間結束。
4. 關閉預覽會保留結果，可由圖片圖示重新開啟；「捨棄這段」釋放結果圖片。下一段完成後取代上一段，重新整理／關閉頁面不保留資料。

錄製保存的是衍生音高資料，**不錄製聲音**。畫面的最近 12 秒歷史與完整錄製資料分開，清除即時軌跡不會刪除錄製。關閉麥克風、裝置中斷或切到背景會停止錄製並保留當段；背景停止的結果可在回到頁面後按圖片圖示開啟。滿時自動停止錄製時，麥克風會繼續分析。

PNG 使用本機 Canvas 產生，1440px 寬、最多 1432px 高，只有音高與時間刻度及軌跡，沒有裝飾標語。沒有音高的錄製不產生假軌跡或空白下載。圖片在按分享之前已完成產生，以保留使用者手勢；依 [Web Share API](https://developer.mozilla.org/en-US/docs/Web/API/Navigator/share)／[canShare](https://developer.mozilla.org/en-US/docs/Web/API/Navigator/canShare) 檢查圖片分享支援，不支援時保留 PNG 下載。分享取消不會丟失結果。下載／分享選單的實際行為依瀏覽器與裝置而異。

## 音域

一般模式的「音域」只有兩個選項，與映射模型分開設定：

| 音域 | 頻率 | 跨度 |
| --- | --- | --- |
| G3–D6（預設） | 196.00–1174.66 Hz | 31 半音 |
| C3–C6 | 130.81–1046.50 Hz | 36 半音 |

切換時保留目前琴頸位置與映射模型，停止正在演奏的音；同步更新雙圖、音符刻線、相對半音與靈敏度。標記的基準頻率會保留，若超出新音域則限制到新端點。這是音樂音域預設，不是 DX 官方固定音域或實測資料。沒有自訂音域欄位。

## 專注演奏直連

- G3–D6：<https://yuuyuutube.github.io/tools/otama-lab/?mode=play&range=g3-d6>
- C3–C6：<https://yuuyuutube.github.io/tools/otama-lab/?mode=play&range=c3-c6>

未提供 range 的原有 `?mode=play` 直連使用預設 G3–D6。專注模式沿用選定音域，不額外顯示音域控制項。一般模式切換音域時會將 range 寫入網址，未知 range 值會安全使用預設。

開啟後直接顯示專注演奏畫面，第一次按住琴頸或按鍵時會嘗試啟動聲音；若手機沒有立即發聲，可直接點右上角喇叭按鈕啟動或重試，不需要退出。頁面載入本身不嘗試自動播放，遵守瀏覽器手勢限制。從 header 進出模式會同步更新網址，保留其他參數與 anchor，可直接複製網址或加入書籤。

## 操作

- 滑鼠／觸控：整個奶油色琴頸與綠色指示器都是操作區；向下、靠近頭部提高音高。可滑出琴頸，放開即停止。
- 下方水平滑桿也可拖曳。滑軌與滑桿使用一致的 Pointer Events 與停止處理，操作時不應滾動頁面。
- Header 的 SVG 音符「專注演奏」按鈕可切換滿版演奏模式，自動開啟聲音；只顯示琴頸、臉、聲音與退出圖示。手機畫面鎖定捲動並隨可見 viewport／旋轉調整高度，右上角或 Esc 可退出，退出會停止目前發聲。
- 專注模式喇叭圖示與一般介面的聲音開關同步：亮起代表已啟動，斜線代表關閉；手動關閉後拖曳不會自動解除靜音。音訊若被中斷，可直接再點喇叭重新啟動。
- 演奏介面與控制項禁止文字選取，避免快速拖曳時誤選；公式與展開的模擬說明仍可複製。
- 先按「開啟聲音」，再按住琴頸、滑桿或鍵盤發聲。聲音開關本身不會持續播放。
- 方向鍵移動 1%；Shift + 方向鍵微調 0.1%；Page Up / Down 移動 10%；Home / End 到端點。Space / Enter 按住發聲。
- 放開、取消、失去捕捉、視窗失焦或分頁隱藏會停止。Esc／停止按鈕同時關閉聲音開關。
- 位置連續變化，沒有音符吸附。音名是最近的標準音，不會改變實際演奏頻率。
- 標記基準音後可比較兩倍頻率；超出目前音域上限時停用倍頻按鈕。切換模型時保留基準頻率、重新計算其位置。

## 數學

所有映射均為 **Simulation**，不是 DX 實測或電路說明。合成音為 sawtooth + 固定 lowpass，不是 Otamatone 原音色。

x ∈ [0,1]，由低到高（琴頸上端至靠近頭部的下端）；f₀、f₁ 為所選音域的最低與最高頻率。

| 模型 | f(x) | 音程靈敏度 |
| --- | --- | --- |
| Linear frequency／等距 Hz | f₀ + (f₁ − f₀)x | 高音端較低 |
| Equal semitone spacing／等距半音 | f₀ × (f₁/f₀)ˣ | 固定 31 或 36 cents / 1% |
| Inverse-length-inspired／反比靈感 | f₀ / [1 − (1 − f₀/f₁)x] | 高音端較高 |

`MIDI = 69 + 12 log₂(f / 440)`；nearest = round(MIDI)；cents = 100 × (MIDI − nearest)。十二平均律、A4=440 Hz、C4 為中央 C。畫面顯示 Hz 1 位、半音 2 位、cents 整數；圖表及音訊使用完整精度頻率。半音圖為 `12 log₂(f / f₀)`。靈敏度是局部導數，以 cents / 1% 位移表示。

## 開發與建置

Node.js 20+，無需 npm install：

```sh
npm run build
npm test
```

`src/` 是各自可測試的 ES modules：

- `pitch.js`：兩個音域預設、映射、反算、音名、cents、靈敏度。
- `instrument.js`：琴頸／滑桿 Pointer Events、鍵盤、安全停止。
- `audio.js`：Web Audio 合成、手勢啟動、非同步競態防護。
- `visualization.js`：雙 SVG 圖表、響應式座標、基準點。
- `app.js`：介面與狀態協調。
- `focus.js`：專注演奏的視圖切換、viewport 高度與返回位置。
- `styles.css`：保留角色美術、響應式布局、reduced motion。
- `input/microphone.js`：麥克風權限、使用者手勢、分析串流、競態與資源釋放。
- `analysis/yin.js` / `pitch-worker.js`：純音高偵測與背景 Worker。
- `analysis/stability.js`：獨立的音高穩定度，不改寫原始 Hz。
- `live/timeline.js` / `live/app.js` / `live/styles.css`：12 秒歷史與獨立真琴分析頁。
- `live/focus.js`：軌跡專注模式、可見 viewport 與返回位置。
- `live/recording.js`：60 秒純音高資料與 12 秒分行，不保存音訊。
- `live/export.js` / `live/capture.js`：本機 Canvas PNG、預覽、下載與檔案分享生命週期。

`build` 依固定依賴順序將小型 modules 合成為 classic IIFE `app.bundle.js`、`live.bundle.js` 與 `pitch-worker.js`，並為 bundle／Worker／CSS 加上內容版本參數；另產出 `dist/`（兩頁 HTML、bundles、Worker、CSS、assets、.nojekyll）。所有路徑相對於頁面，可部署 Pages 子路徑。生成器只支援目前使用的 named relative imports 與具名宣告；加入其他 module 語法會明確失敗。對已快取的舊版演奏頁，程式會補齊缺少的音域元件。修改 `src/` 後務必重新 build，並提交更新的根目錄 bundles／Worker。

瀏覽器整合測試：開啟 `/tests/browser.html` 按 Run checks，會播放短暫合成音。測試頁本身使用 ES modules，因此需 HTTP。測試檔不進 dist。

軌跡錄製測試：`/tests/capture-browser.html`，包含短段完整流程及獨立的真實 60 秒自動停止檢查。使用原生合成音訊與 stub 分享 API，不存取實體麥克風或真的分享檔案。

真琴頁整合測試：`/tests/live-browser.html` 的 Run checks 以原生 Web Audio 產生的測試 MediaStream 通過正式控制器、Worker、YIN 與 UI；不存取實體麥克風，也不播放聲音。測試頁明確標示為合成訊號，不能當作 DX 實測。

## Favicon 與分享圖

`assets/favicon.svg` 為沿用角色臉部的原生向量圖；另有 32px PNG 與 180px Apple touch icon。`assets/og.svg` 為 1200×630 向量原稿，`assets/og.png` 為對應分享圖，兩者都沒有文字。OG / Twitter metadata 使用正式網址的絕對路徑。SVG 為可編輯來源，PNG 已產出，執行時不需影像套件。

## GitHub Pages

目前專案位於 `yuuyuutube/tools` repository 的 `otama-lab/`，兩頁 HTML、三個生成的 JS、`src/styles.css`、`src/live/styles.css` 與 `assets/` 已能作為 Pages 子目錄直接發布。沿用 repository 原有的 Pages 設定，無需將 dist 放到根目錄、也不覆蓋其他工具。

若將此資料夾作為獨立 repository：在 Settings → Pages 選 GitHub Actions，使用本專案 `.github/workflows/pages.yml` 即可將 dist 部署成獨立網站。若保留 monorepo 結構，GitHub 不會執行這個巢狀 workflow；請沿用 repository 原有發布流程。換網址時需同步更新 canonical、og:url、og:image 與 twitter:image。

官方參考：[GitHub Pages custom workflows](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages)、[Web Audio best practices](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API/Best_practices)。

## 紀錄

- [原型檢查](docs/PROTOTYPE-AUDIT.md)
- [Phase 1–4 路線圖](docs/ROADMAP.md)
- [修改清單](docs/CHANGELOG.md)
- [測試結果與未驗證項目](docs/TEST-RESULTS.md)
