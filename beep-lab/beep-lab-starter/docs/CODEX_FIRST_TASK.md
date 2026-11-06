# Codex — First Task (M0.1)

你現在是 BEEP LAB 的實作工程師。請先閱讀專案根目錄 `README.md`、`AGENTS.md`，以及 `docs/PRODUCT_SPEC.md`、`docs/COMPOSER_REFERENCE.md`、`docs/ARCHITECTURE.md`、`docs/ROADMAP.md`。

請**只實作 M0.1：可玩的 BEEP COMPOSER 功能性原型**。不要開始八個作品、不要做 Studio Mode，也不要只產出規格或靜態 mockup。

流程：
1. 檢視 repo 現況，列出極精簡的實作計畫。若是空 repo，建立 TypeScript + Vite 專案。合理技術細節請自行決定，不用逐項問我。
2. 建立與 UI 解耦的 melody model、Composer 記法 display formatter、音符／休止符編輯規則、Web Audio 播放器、localStorage 存取。
3. 實作手機優先的可用介面：數字按鍵與實體鍵盤操作、編輯游標、播放／停止、BPM、儲存／載入／刪除、預設示範旋律。
4. 原 Nokia 3310 手冊能確認的行為優先；手冊沒寫清楚的邊界，請在 `docs/DECISIONS.md` 清楚列出暫定規則與理由，**不要稱它為完全精準的模擬器**。
5. 對鍵盤長按與手機觸控的附點操作提出能穩定操作的方案；確保音訊有 user gesture 啟用與 Stop 清理。
6. 寫重要純邏輯測試，執行測試與 build；若環境支援，開啟瀏覽器做實際互動測試，包含至少 375px 手機寬度。
7. 最後用繁體中文回報：已完成的功能、主要檔案、如何啟動、測試／實測結果、哪些地方未經原機證實、下一步 M0.2 可做什麼。

重要限制：不使用付費 API、後端、登入、未授權 Nokia 素材；不要自行 `git push`，本次也不要 commit。禁止為後續 app 大量生成空殼檔案。

驗收核心：我能自己按出 5 個音，聽到單音，調整長短、播放整段、儲存，再重新載入。請以**真正可玩**為第一優先。
