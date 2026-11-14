# Phase 1–4 路線圖

## Phase 1 — Virtual Pitch Lab（本次完成）

連續琴頸、三種 Simulation、Hz / 音名 / cents、同步頻率與半音圖、基準音與八度比較、局部靈敏度、按住才發聲、基本無障礙與 reduced motion。純靜態部署。

發行前裝置門檻：真實 iOS Safari / Android Chrome 觸控、分頁切換與背景中斷、VoiceOver / TalkBack；GitHub Pages production smoke test。

## Phase 2 — Live Sound Lab（核心已實作）

獨立 `live.html`，首頁提供入口。`src/input/microphone.js` 管理權限、手勢啟動、串流與生命週期；`src/analysis/yin.js` 自行實作 YIN，透過背景 Worker 分析。頁面提供 Hz、音名、cents、週期性品質、音量、穩定度、12 秒 pitch timeline；滑音與顫音保留連續音高，無可信音高時斷線。

實際資料流：

```js
// Worker 結果：失敗為 null，不量化、不吸附；音訊不保存。
{ source: 'microphone', timestampMs, frequencyHz: null, confidence: 0, rms: 0, clipped: false }
// PitchStability 另外推導，不改寫原始頻率。
{ stable: false, spreadCents: null, label: '—' }
```

明確啟動後才要求權限；等待可取消，停止／背景／離頁釋放 tracks、AudioContext、Worker 與 timer。麥克風不經合成器回播，以 HTTPS / localhost 運作；虛擬演奏與真實輸入分頁。

已以三種取樣率、非標準音、泛音、噪音、滑音／顫音與原生合成 MediaStream 驗證完整流程。這些是測試資料，不是 DX 實測。尚待：實體 DX、不同嘴型與強泛音的倍頻／半頻比較；真實 iOS Safari／Android Chrome 麥克風權限、背景與中斷；VoiceOver／TalkBack。

使用者已以真實 DX 回報靈敏度適當，本次保持 YIN、閾值與更新排程不變。新增軌跡專注模式、簡化音量條與 60 秒衍生音高錄製，輸出每 12 秒一行的 PNG，依瀏覽器能力分享；不錄製音訊。新增 PNG 內附音高資料、版本化 JSON 匯入／匯出、合成音重播與進度控制（2026-11-11）。下一輪仍先收集實機回報，不加入裝置選擇或測量流程。

後續趣味擴充：舊 PNG 的曲線辨識作為有誤差的近似重播，必須與附帶原始資料的精確匯入區分；WAV 僅輸出合成聲。兩者本次未實作。

## Phase 3 — DX Measurement Lab

新增 `src/measurement/store.js`（資料驗證、版本化 JSON / CSV、IndexedDB 或 localStorage 選型）與 `src/measurement/session.js`（測量步驟與穩定片段），不混進 pitch mapping。

工作流程：麥克風 → 使用者按住低黏性膠帶刻度 → 偵測穩定片段 → 輸入 cm → 確認記錄 → 散點圖 → 重測／刪除 → 匯入／匯出 → 比較理論。

每筆至少保存：`id, sessionId, source:'microphone', positionCm, frequencyHz, note, cents, confidence, stableDurationMs, frequencySpreadCents, timestamp, device/settings`。Hz 原始值為準，音名與 cents 可重新衍生；資料 schema 有版本、單位、量尺方向／零點與調音基準。儲存 note/cents 時一併記錄 A4 基準以便重現。

粗測：先低密度取樣定位形狀。精測：高敏感區縮小位置間距、延長穩定片段、重複量測估計離散度。讓使用者看到品質而非只記一個平均值。匯入檢查單位、範圍、欄位、重複與來源；刪除／重測可復原。散點只顯示真實資料；無資料時顯示空白狀態，絕不預填假 DX 數據。Simulation 與 Measurement 使用不同圖例、資料集合與視覺標籤。

完成門檻：實體 DX 一輪粗／精測、匯入匯出 round trip、不穩定／靜音不誤收、重測與刪除一致、模型比較不混淆來源。

## Phase 4 — Wah Lab（虛擬 Wah／即時頻譜已實作）

2026-11-14：新增 Wah 專注演奏（含 `?mode=play` 直連）、跨演奏控制的 W 按住開嘴／放開閉嘴與安全停止；一般／專注模式共用音訊及雙指輸入。

2026-11-14：獨立 `wah.html` 已完成原角色捏嘴、雙指琴頸／嘴巴、持續發聲、近似共振音色與原生即時 FFT 頻譜。`src/wah/audio.js`、`src/wah/input.js`、`src/wah/spectrum.js`、`src/wah/app.js` 分開負責音訊、輸入、視覺與介面。嘴巴不改基頻；靜音／取消／背景與 late resume 有安全停止。

尚待：聲譜圖、真實 DX 麥克風開嘴／閉嘴比較與保存量測條件，可由共用分析模組擴充。合成音：oscillator → filter / Wah → gain → output；分析 tap 與嘴巴開合控制各自獨立。輸入模型不應為了模擬音色改寫 fundamental frequency。

以嘴巴開合操作濾波頻率與共振，標記為 **Approximate Wah Simulation**。分別顯示音高（f₀）和音色（頻譜能量分布）；麥克風比較真實 DX 開嘴／閉嘴，保存真實錄音來源與量測條件。對頻譜採樣率、FFT window、更新率與 dB 參考明確說明。

完成門檻：虛擬嘴巴改變頻譜但不改 oscillator frequency；真實 DX 開／閉嘴紀錄能比較；低音、倍頻與噪音下不把頻譜峰值誤稱為 fundamental；不宣稱完整重現 DX 聲學。
