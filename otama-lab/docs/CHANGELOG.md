# 本次修改清單

## 2026-11-07 · Phase 1

- 先閱讀與實際開啟 `otamatone-pitch-lab.html`；原檔未改動，新增正式 `index.html`。
- 保留原型角色臉型、眼睛、嘴巴、奶油／粉紅色、歪頭與發聲表情；沿用琴頸、萊姆手指、深綠視覺。
- 更新 OTAMA LAB 品牌、雙欄科學玩具版面、圖表資訊層次與桌面／手機響應式布局。
- 提供滑鼠、觸控 Pointer Events、pointer capture、鍵盤、連續位置與音高；加入半音位置刻線，沒有吸附行為。
- 分離 pitch / audio / instrument / visualization / app，保留 Phase 2–4 的來源、分析與儲存責任邊界。
- 發聲改為開關解鎖後按住才播放；release / cancel / lost capture / blur / pagehide / hidden / Esc / stop 均有停止路徑，防止晚到 resume 造成卡音；每次演奏的 oscillator 在短釋放後 stop 並 disconnect。
- 統一兩張 SVG 標尺與游標，使用完整精度來源；新增動態可讀描述、C3–C6 註記與基準點，窄螢幕使用更可讀的座標尺寸。
- 三種映射與公式均標示 Simulation；明示反比模型不是 DX 電路或實測資料。
- 新增基準音標記、頻率 ×2 八度實驗、相對音程與局部位移靈敏度。
- 新增 cents 游標、slider aria-orientation / aria-valuetext、音訊狀態、focus ring、skip link、reduced motion。
- 新增無第三方依賴的 Node 測試、瀏覽器整合檢查、建置腳本、GitHub Pages workflow 與部署文件。

建議 commit：`feat(otama-lab): ship phase 1 interactive pitch playground`

## 2026-11-07 · 拖曳修正與工具介面

- 重現綠色標記兩側落在 rail、無法拖曳的缺陷；改為整個 81px 琴頸負責接收事件，音高仍依黑色軌道的實際尺寸計算。
- 新增 window capture 階段的 pointermove / pointerup / pointercancel；捕捉失敗仍可繼續拖曳，第二指不會搶走操作，滑鼠遺失 release 也能停止。
- 水平 range 由相同輸入邏輯處理，統一滑鼠與觸控的端點和拖出行為；保留原生 input 的無障礙語意與 assistive input。
- 移除 hero、標語、實驗編號、琴頸側邊英文字、角色旁白、重複雙語標籤、品牌頁尾，只保留操作與科學資訊。
- 所有按鈕圖示改為 inline SVG；移除字元圖示及裝飾符號。
- 製作角色 favicon SVG、32px PNG、180px Apple icon，以及沒有文字的 1200×630 OG PNG / SVG，加入完整分享 metadata。
- 產生 classic script bundle，避免本機 file:// 載入 ES modules 導致整個工具失效；保留 src modules 供維護與測試。
- 本機 16 項 Node 檢查與 59 項瀏覽器檢查通過；實體手機仍待驗證。

## 2026-11-07 · 琴頸方向

- 依使用者實際樂器方向，改為琴頸上端低音、下端靠近頭部高音；同步反轉拖曳座標、綠色指示器、半音刻線、百分比與無障礙說明。
- 音高映射、圖表、音訊、水平滑桿與鍵盤功能不變。
- Node 16 / 16、桌面與 390px 尺寸瀏覽器各 77 / 77 通過。

## 2026-11-07 · 專注演奏模式

- Header 加入 SVG 音符按鈕；進入後自動開啟音訊，僅保留放大的琴頸、角色臉與 SVG 退出控制。
- 專注模式鎖定頁面捲動，依 visualViewport 調整高度，兼顧直向與矮橫向畫面；可按右上角或 Esc 退出。
- 快速演奏時不更新隱藏的圖表／數值，退出時同步最新位置；退出、取消與失焦仍正常停止發聲。
- 演奏介面與控制項加入 user-select:none / -webkit-user-select:none，保留公式和說明的文字複製。
- 加入 bundle / CSS 內容版本參數，避免方向修改或介面更新時讀到舊版快取。
