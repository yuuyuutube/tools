# M0.1 實作決策

本作品是 **現代復刻**，並非 Nokia 韌體或聲學模擬器。只實作 Composer，無 Studio、後端、登入或其他七個作品。

## 已核實與參考來源

以專案 COMPOSER_REFERENCE.md 為基準，本次另讀 2001 Issue 3 手冊轉錄的 Composer 段落（印刷頁 65–67），並交叉檢視原廠 2004 Issue 5 PDF（印刷頁 76–78）。後者是另一版手冊，不能據此推定所有韌體相同。

- [2001 手冊轉錄](https://www.somanuals.com/html/23/Nokia-3310-User-Manual.html)
- [原廠手冊 PDF，Issue 5](https://www.instructionsmanuals.com/sites/default/files/2019-05/Nokia-3310-en.pdf)
- helpdoc 來源本次回應 403，未用它補推任何新行為。

核實行為：1–7 = C–B、輸入試聽、預設四分、8 縮短／9 延長、長按音符增加一半長度、0 插入休止並沿用前一時值、* 設定新音符八度、# 升音且排除 E/B、左右游標、Clear 左刪除，以及播放／命名儲存／Tempo。畫面記法使用 `4c2`、`8.#f2`、`4-`。

## 暫定現代規則（不聲稱已由原機證實）

| 項目 | M0.1 決策與理由 |
| --- | --- |
| 技術 | TypeScript + Vite + 原生 DOM；沒有框架執行時，互動面小、易追蹤。Vitest 測試純邏輯及音訊生命週期；不引入 monorepo。 |
| 游標 | 插入點範圍 0…事件數；數字鍵永遠插入，8／9／#／附點修改游標左方事件。點音符選取它並放游標於右方。橘框與插入線同時表示焦點。 |
| 音符時值 | 時值為 1、2、4、8、16、32；8 往短、9 往長，邊界停住而不循環。新音符與休止沿用插入點左方分母，開頭為 4；新輸入不繼承附點或升音。 |
| 附點 | 單指 Pointer Events、pointer capture；按住 450ms 只輸入一次附點音，放開不重複。短按於放開時輸入；取消手勢、失焦、隱藏頁面或停止都取消待輸入。長按實體 1–7 用同一個計時流程並忽略 key repeat。另提供明確標示的「附點」按鈕與 `.` 快捷鍵（現代便利功能）。 |
| 八度 | 起始標籤 2，* 依 2→3→1→2 循環，只影響後續音符，不修改既有音。載入歌曲時 UI 八度重設為 2；它不是旋律資料。 |
| 升音 | # 切換左方音符 sharp；E、B 及休止保持原狀並提示。降音使用再按一次 #。 |
| BPM | 預設 120、整數 40–240。滑桿與數字欄同步；超界或非整數不改 canonical model。修改節奏會停止播放。 |
| 音高／音色 | Nokia 標籤 1、2、3 分別映射科學八度 4、5、6：c1 = C4 ≈ 261.626Hz、a1 = A4 = 440Hz。等律，方波，短 attack/release 與 0.13 預設主增益；不是原機揚聲器重建。 |
| 播放 | 用 AudioContext 時鐘＋25ms lookahead ticker、150ms 規劃窗；ticker 只補排程，不作節拍。rAF 對照音訊時鐘標示播放音符（含休止），背景停播。單事件依 BPM 算時長，尾端留短間隔。Stop 6ms 淡出、8ms 結束；重播起點在淡出之後。非同步 unlock 有世代號，Stop 後不復活舊播放。 |
| 超長旋律 | 現代實用上限 512 事件，非原機限制。LCD 自動換行、內部垂直捲動，編輯與播放各自標示並捲到當前事件；不移動整個頁面。 |
| 儲存 | canonical Melody schemaVersion 1，localStorage `beep-lab:library:v1` 另包 schemaVersion 1；UUID 辨認作品，重存覆寫同 id，新旋律／示範產生新 id。每次寫入前重新讀取，降低跨分頁誤覆蓋；不承諾並行原子寫入。歌曲標題 1–60 字元，顯示一律用 textContent。 |
| 壞資料 | 逐首驗證，單首壞資料／重複 id 略過，其他有效歌曲保留。整包非 JSON 或未知版本不覆寫原始資料，暫停寫入並提示。未來升版需先加顯式 migration，再接受舊版；目前不猜測未知 schema。 |
| 失敗／資料保護 | localStorage 讀寫例外顯示提示。新建／載入在未儲存時要求捨棄確認；刪收藏必須確認。刪除收藏仍保留編輯區內容，能再存回。刷新只恢復已儲存收藏，不提供未存草稿自動保存。 |
| 行動版與可及性 | 手機依序為 LCD／編輯／播放／數字鍵／BPM 與儲存；主操作至少 44px、數字鍵至少 60px。鍵盤焦點可見、狀態 aria-live、對話框焦點管理交給原生 dialog、尊重 reduced-motion。不攔截文字／數值輸入框的音符快捷鍵。 |
| 示範 | Little signals，專案自製短旋律，不取用官方鈴聲、字型、商標或音效。首頁空白可直接按音，提供明顯的載入示範按鈕。 |

## 暫未實作

Composer 文字 parser（只有 display formatter 及經驗證的 JSON parse/serialize）、Undo/Redo、RTTTL、音訊匯出、雲端、分享網址、其他七個作品。後續作品應讀取 music-core Melody，不能解析 UI DOM 當資料來源。

## M0.1 UI 修訂：工具優先

- 依使用者要求移除作品集式 hero、標語、作品編號、英文區塊眉題及頁尾；保留單一產品名稱、曲名、狀態、時長／八度、功能名稱、收藏及可展開說明。
- 圖示統一使用 `src/icons.ts` 自製 inline SVG；不使用 emoji 或 Unicode 字形當圖示。數字、`*`、`#` 與音符記法是輸入資料，不是 icon。
- 手機編曲仍使用頁面自製按鍵，旋律區非文字輸入框，不呼叫電話鍵盤。曲名使用一般文字鍵盤，BPM 明確提示 `inputmode="numeric"`。暫不增加原生／自製鍵盤切換，以免同一編曲器出現兩套不同操作規則。
- 原生 `inputmode="tel"` 可以提示顯示 0–9、*、#，但網站無法把作業系統鍵盤改成附有 C–B 標示的編曲器，也不能據此保證原生按鍵的按住／放開事件能觸發本工具的附點操作。這是保留自製鍵盤的互動設計判斷。[MDN inputmode](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Global_attributes/inputmode)
- favicon 使用相同的單音方波 SVG，提供 ICO／16px／32px PNG 與 180px Apple touch icon。OG 為 1200×630 的純圖形 PNG，附 SVG 原稿，不含任何文字。
- 所有資產可執行 `npm run assets` 重建（開發期使用 resvg；網站執行時不載入）。分享 meta 已加入；正式網域確定後，以 `SITE_URL=https://實際網域 npm run build` 產生絕對圖片 URL。沒有設定時保留同源路徑，不猜測部署網域、不宣稱已通過社群平台線上抓取驗證。

## 音訊重試與推版

- 保持預設可發聲、不在進站時自動播放。首次音符／播放手勢嘗試啟用 Web Audio。
- `resume()` 拒絕、回傳後仍 suspended，或 1500ms 未完成時，顯示「啟用聲音」SVG 按鈕。按下後停掉待播聲音並在新手勢內重試；成功收起入口，需再按音符／播放，不補播舊聲音。
- 手動靜音與瀏覽器阻擋分開處理：靜音時不顯示重試提示；取消靜音也會嘗試恢復 AudioContext。缺少 Web Audio 時顯示不支援提示，不提供無效重試入口。
- 音訊從 running 進入 suspended／interrupted 時停止原播放並提供恢復；舊請求延遲失敗不覆蓋新手勢的成功狀態。Stop 仍會阻止尚未完成的播放請求發聲。
- 依使用者本次明確授權提交及推送此工具。沿用現有 tools Git 靜態發佈方式，不建立 Sites 雲端專案。source 保留 `beep-lab-starter/`，`npm run release` 產出可直接服務的 `beep-lab/index.html`、assets 與圖示；只替換此工具生成的 assets 目錄。
- Vite 使用相對 base，支援 `/tools/beep-lab/` 子目錄；正式分享 URL 由 `.env.production` 提供，支援帶子路徑且以 `/` 結尾的 SITE_URL。正式站是否成功更新需另查 HTTP／部署狀態，不能以 push 成功代替上線驗證。

## 專注模式

Header 的 SVG 展開按鈕切換瀏覽器內的專注版面，不要求 Fullscreen API 權限。只保留 editor-panel 與 keypad-panel；退出按鈕放在 LCD 右上角，Esc 可退出並停止播放。退出還原頁面捲動位置與按鈕焦點，不更動旋律或收藏。

模式使用可視 viewport 高度與 safe-area；直向上下排列、橫向左右排列，鎖住整頁捲動，長旋律仍可在 LCD 內捲動但隱藏捲軸。手機版隱藏曲名輸入，避免原生鍵盤佔用編曲空間；曲名／速度／儲存可退出模式後操作。不宣稱隱藏手機瀏覽器自身的網址列或系統 UI。

## 選取音八度（現代擴充）

新增 LCD 內的「選取音八度」按鈕，作用於游標左方被選取的音符，依 1→2→3→1 循環，修改後試聽並沿用現有儲存流程。無選取音／休止符停用。音高類別、升音、附點與時值保持原值；UI「下一音」八度與 * 的歷史輸入規則保持獨立。這是使用者要求的現代擴充，並非宣稱原機有此按鈕。
