# Phase 1–4 路線圖

## Phase 1 — Virtual Pitch Lab（本次完成）

連續琴頸、三種 Simulation、Hz / 音名 / cents、同步頻率與半音圖、基準音與八度比較、局部靈敏度、按住才發聲、基本無障礙與 reduced motion。純靜態部署。

發行前裝置門檻：真實 iOS Safari / Android Chrome 觸控、分頁切換與背景中斷、VoiceOver / TalkBack；GitHub Pages production smoke test。

## Phase 2 — Live Sound Lab

新增 `src/input/microphone.js`（getUserMedia、權限、裝置與生命週期）及 `src/analysis/yin.js`（單音 fundamental frequency）。分析放 AudioWorklet / Worker，避免阻塞手指操作；權限僅在明確啟動後要求，關閉時 stop tracks。以 HTTPS / localhost 運作。

獨立的音高資料流契約（未實作）：

```js
// 每次分析結果，未量化、不吸附標準音；失敗用 null。
{ source: 'microphone', timestampMs, frequencyHz: null, confidence: 0, rms: 0, stable: false }
```

輸出可交給純函式 `pitchOf` 計算最近音名與 cents，原始頻率仍是主要資料。新增 confidence、訊號強度、穩定度、pitch timeline、glissando / vibrato；低訊號或不穩定時不顯示假的確定音高。以已知頻率正弦波、諧波、噪音、滑音與非標準音驗證，並以真實 DX 比較倍頻／半頻錯判。使用開源可靠 YIN 實作時須檢查授權與來源。

麥克風不經合成器回播，避免回授；mic 與 virtual source 明確分開。瀏覽器合成音與實際輸入資料使用不同 source 標籤。

## Phase 3 — DX Measurement Lab

新增 `src/measurement/store.js`（資料驗證、版本化 JSON / CSV、IndexedDB 或 localStorage 選型）與 `src/measurement/session.js`（測量步驟與穩定片段），不混進 pitch mapping。

工作流程：麥克風 → 使用者按住低黏性膠帶刻度 → 偵測穩定片段 → 輸入 cm → 確認記錄 → 散點圖 → 重測／刪除 → 匯入／匯出 → 比較理論。

每筆至少保存：`id, sessionId, source:'microphone', positionCm, frequencyHz, note, cents, confidence, stableDurationMs, frequencySpreadCents, timestamp, device/settings`。Hz 原始值為準，音名與 cents 可重新衍生；資料 schema 有版本、單位、量尺方向／零點與調音基準。儲存 note/cents 時一併記錄 A4 基準以便重現。

粗測：先低密度取樣定位形狀。精測：高敏感區縮小位置間距、延長穩定片段、重複量測估計離散度。讓使用者看到品質而非只記一個平均值。匯入檢查單位、範圍、欄位、重複與來源；刪除／重測可復原。散點只顯示真實資料；無資料時顯示空白狀態，絕不預填假 DX 數據。Simulation 與 Measurement 使用不同圖例、資料集合與視覺標籤。

完成門檻：實體 DX 一輪粗／精測、匯入匯出 round trip、不穩定／靜音不誤收、重測與刪除一致、模型比較不混淆來源。

## Phase 4 — Wah Lab

新增 `src/audio/wah.js`（近似濾波模型）與 `src/analysis/spectrum.js`（FFT、頻譜／聲譜圖）。合成音：oscillator → filter / Wah → gain → output；分析 tap 與嘴巴開合控制各自獨立。輸入模型不應為了模擬音色改寫 fundamental frequency。

以嘴巴開合操作濾波頻率與共振，標記為 **Approximate Wah Simulation**。分別顯示音高（f₀）和音色（頻譜能量分布）；麥克風比較真實 DX 開嘴／閉嘴，保存真實錄音來源與量測條件。對頻譜採樣率、FFT window、更新率與 dB 參考明確說明。

完成門檻：虛擬嘴巴改變頻譜但不改 oscillator frequency；真實 DX 開／閉嘴紀錄能比較；低音、倍頻與噪音下不把頻譜峰值誤稱為 fundamental；不宣稱完整重現 DX 聲學。
