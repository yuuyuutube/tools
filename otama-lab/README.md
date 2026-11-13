# OTAMA LAB

用虛擬 Otamatone 比較琴頸位置、頻率、音名與音程，並在獨立的真琴分析頁用麥克風觀察實際演奏。純前端，沒有後端、第三方執行時依賴或 API key；虛擬演奏頁不要求麥克風。

## 開啟

- 正式網址：<https://yuuyuutube.github.io/tools/otama-lab/>
- 真琴分析：<https://yuuyuutube.github.io/tools/otama-lab/live.html>
- Wah Lab：<https://yuuyuutube.github.io/tools/otama-lab/wah.html>
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
- 只在記憶體保留音高歷史，不錄音、不上傳、不監聽回播；麥克風不連到喇叭，只有按下演奏結果的播放按鈕才輸出合成音。沒有 DX 位置量測或假實測資料。

麥克風頁需透過 **HTTPS 或 localhost** 開啟，不能依賴雙擊本機 HTML；以瀏覽器使用者手勢啟動 AudioContext。背景噪音、和弦、強泛音與設備處理都可能造成倍頻／半頻誤判，仍待實體 DX 和 iOS／Android 驗證。演算法依據 [YIN 原論文 DOI](https://doi.org/10.1121/1.1458024)，API 參考 [getUserMedia](https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getUserMedia) 與 [AnalyserNode](https://developer.mozilla.org/en-US/docs/Web/API/AnalyserNode)。

## 軌跡專注模式與錄製

在真琴分析頁的「音高軌跡」右上角，按四角圖示進入專注模式。畫面填滿可見 viewport，保留圖示麥克風開關、小音量條、錄製／停止與退出；沒有清除按鈕。手機直／橫向皆以可見高度調整，無頁面捲動或文字誤選。退出或 Esc 只切換視圖，麥克風與正在錄製的資料會繼續；一般模式的 Esc 仍關閉麥克風。

1. 開啟麥克風後，按圓點開始錄製音高軌跡。
2. 計時顯示 `00:18 / 01:00`；隨時可停止，滿 **60 秒**自動結束。
3. 預覽整段軌跡，可用合成音播放，並按「下載 PNG」、「JSON」或「分享」。每 12 秒一行，最多五行；共用同一組半音音高刻度、保留滑音／顫音與未偵測片段的斷線，最後一行在實際停止時間結束。
4. 關閉預覽會保留結果，可由圖片圖示重新開啟；「捨棄這段」釋放結果圖片。下一段完成後取代上一段，重新整理／關閉頁面不保留資料。

錄製保存的是衍生音高資料，**不錄製聲音**。畫面的最近 12 秒歷史與完整錄製資料分開，清除即時軌跡不會刪除錄製。關閉麥克風、裝置中斷或切到背景會停止錄製並保留當段；背景停止的結果可在回到頁面後按圖片圖示開啟。滿時自動停止錄製時，麥克風會繼續分析。

PNG 使用本機 Canvas 產生，1440px 寬、最多 1432px 高，只有音高與時間刻度及軌跡，沒有裝飾標語。沒有音高的錄製不產生假軌跡或空白下載。圖片在按分享之前已完成產生，以保留使用者手勢；依 [Web Share API](https://developer.mozilla.org/en-US/docs/Web/API/Navigator/share)／[canShare](https://developer.mozilla.org/en-US/docs/Web/API/Navigator/canShare) 檢查圖片分享支援，不支援時保留 PNG 下載。分享取消不會丟失結果。下載／分享選單的實際行為依瀏覽器與裝置而異。

### 匯入與合成音重播

音高軌跡控制列的「匯入演奏」（專注模式中為 SVG 圖示）接受本工具匯出的 **原始 PNG** 或 **`.otama.json` / `.json`**，不需要開麥克風。匯入後共用錄製結果視窗：播放／停止、進度拖曳、音名／Hz、對應行的游標、PNG／JSON 下載與圖片分享。剛錄製的結果也能直接重播。

- 新 PNG 以標準、未壓縮的 `iTXt` chunk（keyword `otama-lab.recording`）附帶同一份版本化 JSON；圖片像素與外觀不變。匯入時重新繪製經驗證的軌跡，不使用任意匯入圖片作為可信音高來源。
- JSON schema v1：`format: "otama-lab.pitch"`、`version: 1`、`tuningHz: 440`、`durationMs`、`frames: [{timeMs, frequencyHz}]`。時間與頻率保留原精度；`frequencyHz: null` 為無可信音高。音名／cents 不重複保存。
- 合成器使用 sawtooth + lowpass，依時間排程；音高以對數內插保留滑音、顫音和非標準音，null／超過 200ms 的缺口不連線。這是**音高重播，不是原始 DX 錄音或音色重現**。
- 重播前停止麥克風並釋放 tracks，避免喇叭再被錄進去；關閉預覽、捨棄、切到背景、離頁或音訊中斷會停止合成音。快速關閉、重開或取消尚未完成的音訊啟動不會晚到發聲。
- 檔案上限 8 MB、JSON 600,000 字元、最長 60 秒／6,000 筆。檢查 PNG 結構、CRC、版本、A4 基準、時間順序與頻率範圍（20–20,000 Hz）；匯入錯誤保留原有結果，錄製中不可匯入。麥克風偵測範圍仍維持 60–2000 Hz。
- 舊版 PNG／截圖沒有原始音高資料，本版不辨識圖片曲線；會提示改用新版原始 PNG 或 JSON。分享平台或圖片編輯器可能移除附帶資料，**保留原始 PNG，並下載 JSON 作為備份**。尚未加入 WAV 匯出。
- 所有讀寫、繪圖與合成音只在本機完成，沒有上傳。匯入會取代記憶體中的上一份結果；重新整理會清除，請先下載保存。

### 桌機音高跟隨琴頸

軌跡專注模式中，900px 以上且支援 hover／fine pointer 的桌機環境會顯示 SVG Otama 按鈕。預設收起，按下後在最左側留出一欄，顯示沿用原始臉部美術的小琴頸；手機／窄畫面會連同按鈕隱藏，回到桌機尺寸保留本次展開偏好。

固定 **G3–D6**，沿用虛擬演奏預設的反比靈感 **Simulation**（`positionAt(f, 'inverse', RANGES['g3-d6'])`）。上端為 G3，靠近頭部的下端為 D6；按實際偵測頻率連續移動，不吸附音符。這是音高視覺對照，不是 DX 的實測按壓位置，也不會發出聲音。

尚未偵測到音高時不預填指示器。有音高時張嘴；靜音、無可信音高或關閉麥克風時，嘴巴恢復、指示器留在最後一次音高。低於 G3／高於 D6 時只將小琴頸限制在兩端，端點與指示器以珊瑚色提示；主要 Hz、軌跡、錄製資料保持完整。收起後仍記住新音高，重新展開會顯示最新位置。

## Wah Lab（虛擬音色實驗）

獨立的 `wah.html`，虛擬演奏與真琴分析頁的 SVG 嘴巴按鈕可進入。沿用原始奶油色角色，固定 G3–D6 的反比靈感 Simulation，靠近頭部為高音；頁面填滿可見高度，不捲動、不誤選文字。

- 按住琴頸滑音，第一個演奏手勢會嘗試啟動聲音；放手即停止。
- 另一指按住臉，向下拖開嘴、向上拖閉嘴，放開閉嘴。兩指先後順序不限，各自追蹤 Pointer ID，不要求第二指為 `isPrimary`；額外手指不搶走控制。pointer capture 失敗仍有 window fallback。
- 桌機可開啟「持續發聲」，再用單一滑鼠改變音高與嘴巴；再按一次停止。下方嘴巴滑桿也能保留開合值。
- 琴頸方向鍵／Home／End／Page Up／Page Down；Shift 微調，Space／Enter 按住發聲。W 按住開嘴、放開閉嘴；嘴巴控制可用方向鍵及 Home／End。SVG 聲音開關可明確靜音／重試；使用者手動靜音後，普通琴頸手勢不會自動解除。
- Esc、blur、背景、離頁、音訊中斷及開啟說明時安全停止；已放手或取消後晚到的音訊啟動不建立 voice。開啟聲音開關只解鎖音訊，不會自行持續演奏。

音訊為獨立 **Approximate Wah Simulation**：一個鋸齒波振盪器，並聯兩組帶通共振與少量低通原始音，最後經包絡音量與 AnalyserNode 輸出。嘴巴只改共振中心（400→1000 Hz、850→3000 Hz），不改振盪器基頻；琴頸才改 Hz。這是趣味近似模型，不完整重現 DX 聲學，也不使用麥克風或真實錄音。

即時頻譜來自實際合成輸出，不使用預先畫好的曲線。4096 點 FFT、Blackman 窗、平滑 0.55、取樣率依 AudioContext，80–8000 Hz 對數軸、−96 至 −12 dBFS；160 個顯示頻帶各取實際 FFT bin 最大值。dB 為瀏覽器數位幅值參考，未校正成環境聲壓；峰值不等於基頻。珊瑚色虛線表示琴頸設定的 f₀，正常更新最多約 30fps，reduced-motion 為 8fps，停止時清空並取消動畫。FFT 參考 [W3C Web Audio AnalyserNode](https://www.w3.org/TR/webaudio-1.0/#fft-windowing-and-smoothing-over-time)。

本版不含聲譜圖或真琴開／閉嘴比較，後續仍可由獨立麥克風與頻譜模組擴充。

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
- `live/mini-otama.js`：桌機小琴頸的純位置映射、跟隨與顯示偏好，不介入音訊分析。
- `live/recording.js`：60 秒純音高資料與 12 秒分行，不保存音訊。
- `live/format.js`：版本化 JSON、PNG iTXt、CRC 與匯入驗證。
- `live/export.js` / `live/capture.js`：本機 PNG、匯入／錄製結果、下載與分享生命週期。
- `live/playback.js` / `live/replay.js`：連續音高與停頓的音訊排程、播放進度與游標。
- `wah/audio.js`：獨立振盪器、Wah 共振近似與音訊生命週期。
- `wah/input.js`：琴頸／嘴巴的獨立 pointer IDs 與鍵盤控制。
- `wah/spectrum.js`：真實 FFT 頻帶、SVG 圖與 reduced-motion 排程。
- `wah/app.js` / `wah/styles.css`：Wah 演奏頁、持續發聲、靜音／錯誤處理與手機 viewport。

`build` 依固定依賴順序將小型 modules 合成為 classic IIFE `app.bundle.js`、`live.bundle.js`、`wah.bundle.js` 與 `pitch-worker.js`，並為 bundle／Worker／CSS 加上內容版本參數；另產出 `dist/`（三頁 HTML、bundles、Worker、CSS、assets、.nojekyll）。所有路徑相對於頁面，可部署 Pages 子路徑。生成器只支援目前使用的 named relative imports 與具名宣告；加入其他 module 語法會明確失敗。對已快取的舊版演奏頁，程式會補齊缺少的音域元件。修改 `src/` 後務必重新 build，並提交更新的根目錄 bundles／Worker。

瀏覽器整合測試：開啟 `/tests/browser.html` 按 Run checks，會播放短暫合成音。測試頁本身使用 ES modules，因此需 HTTP。測試檔不進 dist。

Wah 測試：`/tests/wah-browser.html`，原生 Web Audio 輸出重新導向 MediaStream destination，不使用實體麥克風或喇叭；合成 pointer 測試雙指先後順序、取消、持續發聲、靜音與背景停止。以真實波形／FFT 驗證嘴巴改變泛音而基頻保持。

匯入測試：`/tests/import-browser.html`，以明確標示的合成音高驗證 PNG／JSON 往返、原生 Web Audio 音高／靜音、進度、重播與麥克風互斥、錯誤檔案、完整一分鐘五行、專注模式與窄畫面。合成音接到 MediaStream destination，不經喇叭；另有 `tests/synthetic-pitch.otama.json`（6 秒）與 `tests/synthetic-pitch.png`（60 秒）可手動選檔試玩，兩者皆為合成測試資料。

小琴頸測試：`/tests/mini-otama-browser.html`，依目前 viewport 檢查桌機跟隨或手機隱藏；以原生合成音訊通過正式偵測管線，不是 DX 實測。

軌跡錄製測試：`/tests/capture-browser.html`，包含短段完整流程及獨立的真實 60 秒自動停止檢查。使用原生合成音訊與 stub 分享 API，不存取實體麥克風或真的分享檔案。

真琴頁整合測試：`/tests/live-browser.html` 的 Run checks 以原生 Web Audio 產生的測試 MediaStream 通過正式控制器、Worker、YIN 與 UI；不存取實體麥克風，也不播放聲音。測試頁明確標示為合成訊號，不能當作 DX 實測。

## Favicon 與分享圖

`assets/favicon.svg` 為沿用角色臉部的原生向量圖；另有 32px PNG 與 180px Apple touch icon。`assets/og.svg` 為 1200×630 向量原稿，`assets/og.png` 為對應分享圖，兩者都沒有文字。OG / Twitter metadata 使用正式網址的絕對路徑。SVG 為可編輯來源，PNG 已產出，執行時不需影像套件。

## GitHub Pages

目前專案位於 `yuuyuutube/tools` repository 的 `otama-lab/`，三頁 HTML、四個生成的 JS、`src/styles.css`、`src/live/styles.css`、`src/wah/styles.css` 與 `assets/` 已能作為 Pages 子目錄直接發布。沿用 repository 原有的 Pages 設定，無需將 dist 放到根目錄、也不覆蓋其他工具。

若將此資料夾作為獨立 repository：在 Settings → Pages 選 GitHub Actions，使用本專案 `.github/workflows/pages.yml` 即可將 dist 部署成獨立網站。若保留 monorepo 結構，GitHub 不會執行這個巢狀 workflow；請沿用 repository 原有發布流程。換網址時需同步更新 canonical、og:url、og:image 與 twitter:image。

官方參考：[GitHub Pages custom workflows](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages)、[Web Audio best practices](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API/Best_practices)。

## 紀錄

- [原型檢查](docs/PROTOTYPE-AUDIT.md)
- [Phase 1–4 路線圖](docs/ROADMAP.md)
- [修改清單](docs/CHANGELOG.md)
- [測試結果與未驗證項目](docs/TEST-RESULTS.md)
