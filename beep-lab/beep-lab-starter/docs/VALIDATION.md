# M0.1 驗證紀錄

日期：2026-11-07（Asia/Taipei）。本次沒有 commit、push 或部署。

## 自動化

- `npm test`：20 項通過，2 個測試檔。
- `npm run build`：TypeScript strict 檢查與 Vite production build 成功。
- `npm audit`：更新 Vitest 後正式查詢回報 **0 vulnerabilities**。
- 模型：格式顯示、合法性、版本化 JSON round-trip、BPM 時長、附點與休止、順序時間軸、獨立八度頻率映射。
- 編輯：1–7、0、插入／左刪除／游標、8／9 端點、* 未來音八度、# 限制、附點修改及 512 事件上限。
- 持久化：My First Beep 標題／144 BPM／事件與 metadata round-trip；單首壞資料、重複 id、整包損壞、未知 schema、讀寫失敗。有效歌曲不因壞紀錄一起消失。
- 音訊：以可控 AudioContext mock 驗證排程時間、休止不產生 oscillator、試聽替換、Stop／Replay 音源停止、停止計時器、音訊 unlock 競態取消與播放位置。這不是硬體聽感測試。

## 瀏覽器操作

| 環境 | 實際驗證 |
| --- | --- |
| Codex 內建瀏覽器，375×812 | 頁面與文件寬度均 375px，無水平溢出；12 個數字鍵高度至少 60px；LCD 內部捲動；手機版主操作與數字鍵在 BPM／收藏之前。 |
| 內建瀏覽器，1280×900 | 桌面雙欄、完整頁面渲染與截圖檢視。 |
| 內建瀏覽器，畫面點擊 | 1、2、3、4、5 產生五個對應四分音符；音訊啟用沒有錯誤提示。 |
| 內建瀏覽器，鍵盤 | 1–5、8、#、.、0、*、6 產生預期音名／時值／附點／升音／休止／八度。長按 1 約 650ms 只產生一個附點音。E 按 # 有限制提示。 |
| 內建瀏覽器，播放 | 播放位置顯示 PLAY 01；Stop 復歸 READY；快速 Play／Stop／Play／Stop 正常；console error/warn 查詢為空。 |
| 內建瀏覽器，保存還原 | 命名 My First Beep，設 144 BPM，儲存、刷新、重新載入，比對標題／BPM／所有事件一致（含附點、升音、休止與八度）。BPM 更新曾在初測暴露問題，已改即時處理並重驗成功。 |
| 內建瀏覽器，收藏與示範 | 刪除先顯示原生 dialog，取消後作品仍在；自製示範 Little signals 載入 12 個事件／132 BPM，能儲存。 |
| 桌面 Google Chrome（訪客視窗） | 實際畫面按 1–5，顯示五音；Play 顯示播放位置、分頁回報音訊播放中；Stop 正常。訪客模式測試資料不當永久收藏。 |
| 桌面 Safari | 實際畫面按 1–5，顯示五音；Play 顯示播放位置、Stop 復歸；成功 localStorage 儲存。 |

## 尚未手動驗證／不可過度宣稱

- **尚未拿真實 iPhone Safari、Android Chrome 觸控測試。** 375px 是桌面內建瀏覽器 viewport，不能當成行動 Safari 完整相容驗證。
- 指標長按的 native UI automation 未能可靠重現，因此只確認實體按鍵長按與附點等價按鈕；真機的 touch 長按、取消手勢、快速連點、多指、捲動中取消，留待實機驗收。
- 頁面隱藏／失焦／pagehide 有停止與取消待輸入處理，但尚未做真機切換 App、鎖屏、音訊中斷、藍牙耳機測試。
- 音訊產生與時序有模擬及瀏覽器狀態證據；未透過外部錄音或原機並排聽測，不宣稱聲學還原、無可聞爆音或所有平台完全無延遲。
- 故障 localStorage、配額不足以自動化 fake storage 驗證；未改動真實瀏覽器儲存注入壞資料。
- 刪除對話框與取消已操作；實際確認刪除的瀏覽器流程尚未手動執行。
- 512 事件上限由核心測試驗證；實機長歌曲的流暢度及耗電仍待測。

## 下一階段 M0.2

1. 先以實機完成上述觸控、音訊及背景行為矩陣。
2. 使用原機／可靠錄影逐項確認游標、八度、時值邊界；保持史實與擴充標示。
3. 打磨 LCD 層次、觸控回饋、手機可視範圍與播放狀態，避免犧牲可讀性與焦點辨識。
4. 暫不加入 Studio、匯出、分享或其他七個作品。

## UI 精簡與圖示修訂驗證

- 20 項原有核心／音訊測試通過；本次不為文案或樣式建立鏡像測試。
- `npm run assets` 成功產生 SVG／PNG／ICO，實際檢視 OG PNG，圖中沒有文字。
- 預設 production build 與設定 SITE_URL 的 build 均成功；後者的 OG image、Twitter image 與 og:url 會變成指定 origin 的絕對 URL。測試 origin 不留在交付的預設 dist。
- 內建瀏覽器已實測五鍵輸入、SVG 靜音／取消靜音切換、播放／停止，音符資料及控制功能保持正常。
- 375×812 驗證：文件寬度 375px、無水平溢出，數字鍵最小高度 60px，整組數字鍵底部約在頁面 y=701，主編曲區較原版更早可操作。
- 檢查所有編輯／播放／儲存按鈕均包含 SVG；未提供 type=tel 輸入。手機原生鍵盤的實際外觀仍待真機驗證。
- 已移除裝飾標語、作品編號與重複品牌文案，收藏與說明保留必要功能文字。

## 音訊重試與首版推送驗證

本節為使用者後續授權推版的更新，前述「未 commit／push」是先前里程碑交付時的狀態。

- 測試新增拒絕、仍 suspended、1500ms 無回應、缺少 Web Audio、播放中音訊被中斷，以及舊請求延遲失敗等情境，目前 **27 項測試通過**。
- 內建瀏覽器以 `tests/fixtures/audio-blocked.html` 故意阻擋前兩次 resume：輸入仍保留音符，重試入口出現，點擊成功後收起，模式維持就緒、沒有重播或多插音符。
- `?mode=pending` 模擬 resume 永不完成：逾時後出現入口；以鍵盤 Space 啟用按鈕可恢復，且不誤觸播放。
- 375px 故障狀態沒有水平溢出，所有圖示仍為 SVG。此為故障注入測試，不代表真機 Safari 已完成驗收。
- `npm run release` 包含 TypeScript strict 檢查、production build 與靜態檔案整理。正式成品在 source 資料夾外的 `beep-lab/`，不包含測試注入頁、node_modules 或 TypeScript 原始碼。

- 另外覆蓋 AudioContext 暫時初始化失敗後可重試，不將暫時性失敗誤認為完全不支援。production 靜態成品在本機 `/beep-lab/` 實測五音輸入、播放／停止、favicon 與絕對 OG URL 正常，console 無 error／warn。

## M0.3 驗收

- 使用者已接受目前 Classic 體驗為本階段完成，進入 Studio；這項接受不代表先前列出的手機真機測試已全部完成。
- `npm test`：36 項通過（3 檔），含新增 Studio 更新／插入、36 半音對照、音高與節奏隔離、無效升音驗證、共用 JSON round-trip、Undo／Redo 全序列、redo 分支清除、100 步邊界、時間戳 no-op 與輸入合併測試。
- `npm run release`：TypeScript strict 檢查、Vite build、靜態發佈成品整理成功。
- 內建瀏覽器實測 Classic 輸入兩音、Studio 改第二音為 F#3／附點八分、切回 Classic 顯示 `8.#f3`；復原與重做正確，console 沒有 error／warn。
- 儲存 Studio QA、刷新載入後再修改／復原，音符完整保留，回到保存內容時顯示已儲存；Studio 播放位置與 Stop 正常。
- 375px Studio 無水平溢出；專注模式 320×480 無整頁溢出，transport 底部 261px、keypad 起點 269px，沒有控制區互相遮擋。退出專注會恢復 Studio。
- 音塊提供 44px 高的命中區與完整 aria 名稱，表單欄位可精確選音高／時值。圖形背景格點的觸控精準度及真實行動裝置仍待手動驗收，不宣稱已通過 iPhone／Android 真機測試。
