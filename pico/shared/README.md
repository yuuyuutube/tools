# pico/shared — 共用旋鈕模組

`02-the-impossible-safe` 與 `03-rotary-stories` 實際引用這裡的同一份程式（不是複製）。只包含與作品世界觀無關的底層技術。

| 檔案 | 內容 | 保險箱 | 故事圖書館 |
|---|---|:---:|:---:|
| `rotary/protocol.js` | Pico USB CDC 協定：逐行 JSON、分段重組、過長行重新同步、驗證 | ✓ | ✓ |
| `rotary/serial-adapter.js` | Web Serial：選擇裝置、自動重連已授權的 Pico、DTR、拔除偵測、插回自動重連 | ✓ | ✓ |
| `rotary/rotary-hub.js` | 旋轉／按壓事件分派；短按／長按；Pico 方向反轉 | ✓（InputController 繼承） | ✓（KnobInput 繼承） |
| `rotary/rotary-navigation.js` | 旋轉速度估算（RateMeter）、轉盤齒輪比、選單加速 | ✓ | ✓（RateMeter 概念、速度） |
| `rotary/angle-tracker.js` | ±180° 角度展開、角度累加器、累積旋轉量／圈數／方向／反轉次數／速度（RotationTracker） | ✓ | ✓ |
| `rotary/pointer-dial.js` | 圓形觸控／拖曳（click wheel）：多圈、反向、中心點按＝短按、按住＝長按 | ✓ | ✓ |
| `rotary/dom-input.js` | 鍵盤、滑鼠滾輪（實體滾輪與觸控板）、按住連發、螢幕上的「按下」按鈕 | ✓ | ✓ |
| `dev-server.mjs` | 本機靜態伺服器：以 `pico/` 為根，`/` 轉到指定網站 | ✓ | ✓ |
| `tests/` | `node --test tests/` | | |

## 評估後沒有共用的部分

| 項目 | 原因 |
|---|---|
| 保險箱的 `InputController` 模式邏輯（dial／nav） | 這是保險箱的遊戲規則：轉盤刻度與選單步距。故事圖書館改用「旋鈕角度」作為共同單位，各設備自己換算 |
| 保險箱的選單鼓（`RotaryList`） | 與保險箱的 DOM 結構、CSS、紅色指標視覺綁定。圖書館的書架使用 `03-rotary-stories/src/interactions/models.js` 的 `DetentSelector`；兩者的彈簧手感相近，但抽出共用需要重寫保險箱的畫面，風險大於收益 |
| 音訊引擎 | 保險箱的 `AudioEngine` 是為它自己的聲音（限幅器、刻度聲限速）寫的；故事圖書館需要「每個場景一個可整批停止的 AudioScope」。兩者唯一真正相同的是「在使用者手勢後建立 AudioContext」，只有幾行，不值得一個共用模組 |
| 保險箱美術、解謎規則、藏品、世界觀 | 依需求不共用 |

## 部署

兩個網站都用相對路徑引用 `../shared/`（保險箱是 `../../shared/`，從 `src/` 起算）。只要 `pico/` 整個資料夾一起發布為靜態網站，本機與正式環境的路徑完全相同。不要單獨發布某一個網站資料夾。
