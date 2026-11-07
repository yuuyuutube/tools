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

## 2026-11-07 · 專注演奏直連

- 新增 `?mode=play`，開啟網址即顯示專注演奏畫面。
- 直連載入時不建立／啟動音訊；第一次按住琴頸或鍵盤才以使用者手勢解鎖並演奏，無需額外聲音按鈕。
- 手動進出模式會同步更新 query，保留其他參數及 anchor，方便複製網址與加入書籤。
- 新增直連、首次按住發聲、放開停止、退出網址與數值同步的回歸檢查。

## 2026-11-07 · 專注模式聲音開關

- 專注模式右上角加入純 SVG 喇叭按鈕，與一般介面共用聲音狀態；開啟時亮起，關閉時為靜音圖示，沒有額外可見文字。
- 手動靜音後滑動不再自動開啟聲音；等待解鎖時可直接點按按鈕以新的 click 手勢重試，無需先退出或先關再開。
- 檢查 AudioContext 確實為 running 才顯示啟用；監聽 interrupted / suspended 等狀態，停止聲音並更新按鈕，可在原模式重試。
- 音訊失敗時維持專注畫面，讓使用者直接透過喇叭重試，不自動離開模式。
- Node 19 項測試通過；瀏覽器新增同步開關、靜音保持、模式內重試等檢查。

## 2026-11-07 · 兩種可切換音域

- 一般模式加入音域選單，只有 G3–D6（預設）與 C3–C6，與三種映射模型獨立。
- 三模型公式改為使用選定的最低／最高頻率，移除固定 8 倍頻率與 36 半音假設。
- 同步更新琴頸刻線、音符標記、兩張圖的範圍／相對基準、cents、局部靈敏度與八度上限。
- 切換時保留手指位置、映射與音域內的比較基準；基準超出新音域時限制至端點。
- 新增 range=g3-d6 / range=c3-c6 網址參數，專注模式沿用所選音域，維持原有精簡畫面。
- 兩個選項均為模擬音域，不標為 DX 官方規格或實測。

- 正式站驗證重現舊 HTML 快取搭配新版 bundle 時缺少音域節點的錯誤；補上舊版標記的相容初始化，維持兩選項功能，並加入原始舊版 HTML 的回歸樣本。

## 2026-11-07 · Phase 2 真琴分析獨立頁

- 新增 live.html 與首頁 SVG 麥克風入口，沿用原角色、深綠與萊姆色，不改變琴頸演奏行為。
- 加入 getUserMedia、手勢 AudioContext、YIN 背景 Worker；約 60–2000 Hz，不限制虛擬琴音域或吸附音符。
- 即時顯示 Hz／音名／cents、週期性品質、輸入音量與獨立穩定度。
- 加入最近 12 秒的連續半音時間線、自動縮放、無音高斷線與清除；保留滑音與顫音。
- 權限等待可取消，晚到串流會關閉；拒絕、裝置中斷、音訊暫停、Worker 錯誤可重試；離頁／背景／Esc 釋放資源。
- 分析不接喇叭，不錄音、不上傳、不存假 DX 測量；測試合成訊號只存在明確標記的 QA 頁。
- 新增三取樣率音高／生命週期測試、原生 MediaStream 完整整合檢查，建置包含獨立 bundle 與內容版本 Worker。

Commit：`feat(otama-lab): add standalone live microphone pitch lab`
