# BEEP LAB

**Tiny sounds, endless possibilities.**

一個以 Nokia 3310 時代的單音編曲樂趣為起點，延伸到音樂明信片、遊戲與生成藝術的前端創作系列。

## 開發原則

1. **創作成就感優先**：核心價值是用簡單操作還原腦中的旋律，再分享與轉化。
2. **每次只完成一個可玩的垂直切片**，不要同時產出八個空殼網站。
3. **史實與現代擴充清楚分離**：Classic 模式以可查證的 Nokia 3310 Composer 行為為準；新功能只進 Studio 或其他作品。
4. **美學品質高，但先驗證互動**：每個階段保有可操作、可測試的版本。
5. **不要求後端**：第一階段完全在瀏覽器運作，資料預設留在本機。

## 從哪裡開始

請先閱讀 `AGENTS.md`、`docs/PRODUCT_SPEC.md`、`docs/COMPOSER_REFERENCE.md`、`docs/ARCHITECTURE.md`、`docs/ROADMAP.md`。

第一個實作任務是 **M0 / Composer v0.1**，不是八個網站。Codex 應先檢查專案、簡短說明實施方案，再直接動手實作、測試，並回報結果。

## 文件

- `AGENTS.md`：Codex 的長期工作規範。
- `docs/PRODUCT_SPEC.md`：產品目標、互動、功能分期與驗收。
- `docs/COMPOSER_REFERENCE.md`：原始 Composer 已核實資訊／待查資訊與來源。
- `docs/ARCHITECTURE.md`：架構、資料格式、音訊與測試。
- `docs/ROADMAP.md`：八件作品與里程碑順序。
- `docs/CODEX_FIRST_TASK.md`：第一次交給 Codex 的可貼上任務。

## 法務與素材

本企劃為懷舊互動實驗，與 Nokia 無官方關聯；不要取用 Nokia 商標、官方字型、音效或受著作權保護的像素素材作為正式產品資產。作品可以描述靈感來源，但視覺／聲音資產應自行創作或確認授權。

## M0.1 已完成：BEEP COMPOSER

專案根目錄是 `tools/beep-lab/beep-lab-starter`。需要 Node.js **20.19+ 或 22.12+**（本次使用 24.12.0）。

```sh
cd /Users/yoyohuang/dev/yuuyuutube/tools/beep-lab/beep-lab-starter
npm ci
npm run dev
```

開啟終端顯示的 Local URL。要用同一個 Wi-Fi 的手機試玩，使用終端顯示的 Network URL；`dev` 已監聽區域網路。localStorage 依瀏覽器及 origin 分開，localhost、區網 IP、其他連接埠不會共用收藏；訪客模式關閉後收藏可能消失。

```sh
npm test       # 核心與音訊生命週期測試
npm run build  # TypeScript 檢查 + production bundle 至 dist/
npm run preview
```

### 操作

- 點畫面數字鍵，或使用實體鍵盤 `1–7` 輸入 C–B；新音符立即試聽。iPhone 需首次點擊音符／播放來啟用音訊，並確認媒體音量。
- `8` 縮短、`9` 延長游標左方事件。`0` 插入休止符，`*` 設定下一個音符八度，`#` 切換左方音符升音（E／B 除外）。
- 長按 `1–7` 450ms 建立一個附點音；亦可用「附點」按鈕或 `.` 切換左方音符附點。放開不會額外建立第二音。
- 左右箭頭移動插入點、Backspace 左刪除；點某個音符將游標放到它右方。新輸入永遠插入，橘框音符接受時值／升音／附點修改。
- 播放／停止，或空白鍵切換；Esc 停止。編輯與離開頁面會停止，快速重播不保留前次音源。可靜音，BPM 範圍 40–240。
- 先輸入音符，再點曲名命名，例如 `My First Beep`，按「儲存作品」。刷新後從「你的聲音收藏」載入。刪除會先確認。
- 「載入示範」提供自製 `Little signals`；「新旋律」開新作品。尚未儲存時切換會先確認。

這是現代復刻，並非原機完全模擬。長按門檻、八度序列、音高映射、音色、儲存容量、游標選取及附點便利按鈕等決策請見 [DECISIONS.md](docs/DECISIONS.md)。

### 主要檔案

| 路徑 | 責任 |
| --- | --- |
| `src/music-core/model.ts` | 共用 Melody、驗證、JSON、記法、頻率及時間計算 |
| `src/music-core/editor.ts` | 不依賴 DOM 的輸入、游標、編輯規則 |
| `src/music-core/storage.ts` | 版本化本機收藏、逐筆驗證及恢復 |
| `src/audio-engine/player.ts` | 手勢解鎖、單音試聽、精準排程、停止與重播 |
| `src/main.ts` / `src/style.css` | 響應式 Classic UI、長按、鍵盤、對話框、收藏 |
| `src/demo.ts` | 自製示範旋律 |
| `tests/` | 重要純邏輯及音訊生命週期回歸測試 |
| `docs/VALIDATION.md` | 本次實測、限制與後續驗收清單 |

下一階段建議是 M0.2：先在真實 iPhone Safari／Android Chrome 驗收觸控與聲音，再打磨 LCD、按鍵回饋與歷史規則。M0.1 未開發 Studio 或其他作品。

### 精簡工具介面與網站圖示

首頁直接進入編曲器；必要操作說明收在「操作說明」。圖示全為 SVG，不載入圖示字型或外部 CDN。手機按音符不會叫出電話鍵盤；只有曲名與 BPM 使用原生文字／數字輸入。

- `public/favicon.svg`：方波識別；另有 `favicon.ico`、16／32px PNG、`apple-touch-icon.png`。
- `public/og-image.png`：1200×630、圖內完全無文字；向量原稿為 `public/og-image.svg`。
- 修改 SVG 後執行 `npm run assets` 重建點陣資產。
- 正式上線時設定 `SITE_URL` 為實際網站 origin（例如 `https://你的實際網域`），再執行 `npm run build`；會輸出絕對 OG／Twitter 圖片 URL 及 og:url。本次只在本機測試，未部署。

本次 UI 已將「儲存作品」縮為「儲存」、「載入示範」縮為「示範」；前段操作流程不變。

### 音訊啟用失敗重試

如果瀏覽器阻擋音訊，或啟用超過 1.5 秒仍未完成，編曲器會顯示「啟用聲音」。點擊重試成功後，再按音符或播放；不會自動補播先前失敗的聲音。手動靜音仍由喇叭按鈕控制。

### 發佈到現有工具庫

```sh
npm test
npm run release
```

開發原始碼保留在 `beep-lab-starter/`；發佈指令將 production bundle 與圖示放到上一層 `beep-lab/`，使靜態主機可直接服務 `/tools/beep-lab/`。只會替換這個工具生成的 `assets/`，不動 source。`.env.production` 指定正式分享 URL，若更換網域或掛載路徑，更新 SITE_URL 後重新發佈。

測試頁 `tests/fixtures/audio-blocked.html`（dev server 專用）會故意阻擋前兩次啟用；加上 `?mode=pending` 可模擬音訊啟用無回應。它們不會被放入正式成品。

### 專注模式直連

分享 `https://yuuyuutube.github.io/tools/beep-lab/?focus=1`，開啟即進入專注模式。一般網址維持普通模式；手動切換會同步更新網址，退出會移除 focus 參數，保留其他 query 與 hash。連結只指定顯示模式，不會分享收藏，也不會自動播放聲音。
