# 技術架構與音樂資料格式

## 技術決策

- TypeScript + Vite；初期使用原生 DOM / Web Components 或輕量 UI 框架均可，應以維護成本與執行效能做簡短說明。
- 初版只有 `composer` app。可以預留 `packages/music-core`、`packages/audio-engine`，**不要一開始搭過度複雜的 monorepo 工具鏈**。
- 無後端、無登入；瀏覽器內 `localStorage` 儲存少量歌曲，格式版本化、失敗可提示。擴充需要大量資料才評估 IndexedDB。
- Web Audio API：瀏覽器使用者點擊或按鍵後解鎖音訊；以 AudioContext 時鐘安排播放，避免 `setTimeout` 當成精準節拍引擎。
- 播放停止時停止／淡出所有活動聲音，避免 click 與爆音；頁面隱藏和重播時處理音源清理。

## 版本化 canonical melody model（建議介面，可適當調整）

```ts
type PitchClass = 'c' | 'd' | 'e' | 'f' | 'g' | 'a' | 'b';
type Duration = 1 | 2 | 4 | 8 | 16 | 32;
type MusicEvent =
  | { type: 'note'; pitch: PitchClass; octave: 1 | 2 | 3; sharp: boolean; duration: Duration; dotted: boolean }
  | { type: 'rest'; duration: Duration; dotted: boolean };

type Melody = {
  schemaVersion: 1;
  id: string;
  title: string;
  tempoBpm: number;
  events: MusicEvent[];
  createdAt: string;
  updatedAt: string;
};
```

- `sharp` 不可作用於 `e` 或 `b`；parser 與 UI 均驗證。
- 音符／休止符要使用離散事件，不使用播放秒數當主資料；秒數由 BPM 和時值算出。
- 單音聲軌不允許重疊；同一個事件的音高、長度、八度必須可還原。
- 編輯時的選取游標、未完成輸入、顯示模式屬 UI state，**不應寫進 canonical Melody**。
- 預留升級舊版儲存格式的策略；不得因一個壞資料導致整個頁面白屏。

## 音符時間

- 四分音符時長 `60 / BPM` 秒。
- 任意時值 `durationSeconds = (60 / BPM) * (4 / denominator) * (dotted ? 1.5 : 1)`。
- 休止符同規則，不發聲。
- 播放器透過獨立、明確文件記載的 octave-to-frequency mapping 轉換，避免將 Nokia 八度 1–3 直接誤認為科學音高 C1–C3。
- 包絡使用短 attack/release 防止爆音；合成音色以「單純、可辨識」為先，不聲稱完美複製原硬體。

## 模組契約（目標）

- `music-core`: create/validate/insert/delete/update/serialize/parse/display-format.
- `audio-engine`: previewNote, playMelody, stop, isPlaying, callbacks.
- `composer-ui`: Classic 鍵盤與螢幕、Options、保存/載入。
- 其他作品只透過資料模型與公開模組介面互動，不讀取 Composer UI DOM 解析旋律。

## 預期測試

1. Duration 與附點的秒數計算。
2. 1–7 音符輸入與 0 休止符。
3. 8/9 時值調整的邊界行為。
4. # 僅能作用 C/D/F/G/A；* 八度切換規則。
5. 插入、刪除、移動游標，不遺失事件。
6. Composer 字串的 parse/format round-trip（若 v0.1 已有 parser）。
7. Melody JSON 的 save/load round-trip；無效資料可恢復。
8. Play/Stop/Replay 不疊音；頁面隱藏時終止播放（可使用整合測試／手動測試）。
9. 手機觸控與桌機實體鍵盤的按鍵對應一致。

## 初版品質底線

- 不依賴外部帳號或付費服務。
- 支援手機窄螢幕，避免水平溢出。
- 音量有安全預設與靜音選項。
- 動態效果遵守 `prefers-reduced-motion`。
- 操作需可使用鍵盤、可辨識焦點、按鈕有可及名稱。

## M2.1 音樂盒與音訊檔

音樂盒為獨立 UI，共用同一 localStorage 收藏與 Melody schema。封面由 album-cover 的穩定風格選取及既有 SVG 模組產生。WAV 合成器與 UI／AudioContext 解耦，Worker 執行 renderWav，回傳 PCM16 RIFF ArrayBuffer；UI 負責 Blob 下載及狀態。song query 只讀取本機既有 ID 以更新原作品；分享 hash 則持續匯入新 ID。
