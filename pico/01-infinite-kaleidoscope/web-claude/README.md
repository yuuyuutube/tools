# 鏡・墨・紋 — INFINITE KALEIDOSCOPE（Claude 版）

三種讓世界重複的方法：**反射、暈染、干涉**。
一顆實體旋鈕（Raspberry Pi Pico 2 WH + KY-040）就能操作的生成藝術作品。沒有硬體時也可以用滑鼠、觸控與鍵盤操作。

設計意圖的完整紀錄請見 [DESIGN.md](DESIGN.md)。

---

## 作品概念

萬花筒的本質不是花朵，而是「一個物件 + 一種不斷重複的轉換」。這件作品把萬花筒拆成三種物理現象，每一種都是獨立的演算法、構圖與材質：

| 模式 | 是什麼 | 旋鈕做什麼 |
|---|---|---|
| **鏡 REFLECT** | 三面鏡子圍成的雙曲三角形，在 Poincaré 圓盤裡無限鋪滿；透過圓形目鏡觀看。 | 在無限的鏡廊中前進／後退，同時讓晶格在正規、截角、截半、全截角之間變形。 |
| **墨 DIFFUSE** | 數學水拓（流し墨）：墨滴以 k 重對稱落在水面上，一圈圈推開彼此。 | 攪動水盆。往回轉就把墨攪回原狀（映射是可逆的）。 |
| **紋 INTERFERE** | 兩張印著細線的網屏，上面那張是可以轉動的圓形透明片。兩者的干涉條紋被分色印成色塊。 | 以 1:50 的減速比轉動透明片，每格 0.36°，干涉條紋大幅改變。 |

整件作品是一間「印刷工作室」：6 組油墨（朱藍、螢光孔版、岩彩、夜印、墨、藍曬），每組只有一張紙色加四色油墨；淺色紙用 multiply 疊印，深色紙用 screen。套色偏移、網點、紙纖維都是靜態的，不會閃爍。

---

## 啟動

不需要安裝任何套件（零依賴）。Node 14 以上即可：

```bash
cd tools/pico/01-infinite-kaleidoscope/web-claude
```

```bash
npm start
```

然後用 **Chrome** 開啟 http://localhost:5174/

也可以指定 port：`node serve.mjs 8080`。
（不能直接雙擊 `index.html` 用 `file://` 開啟：ES modules 與 Web Serial 都需要 http://localhost。）

執行測試（需要 Node 18 以上）：

```bash
npm test
```

---

## 桌面操作

| 操作 | 作用 |
|---|---|
| 滑鼠滾輪／觸控板 | 轉動旋鈕（主要參數） |
| 在畫面上左右拖曳 | 轉動旋鈕 |
| ← → （或 ↑ ↓） | 轉一格；按住 Shift 一次五格 |
| Space | 下一個模式（Shift+Space 上一個） |
| 1 / 2 / 3 | 直接切到 鏡 / 墨 / 紋 |
| R | 新宇宙（新的 seed） |
| C | 下一組油墨（Shift+C 上一組） |
| S | 保存 PNG |
| L | 複製分享連結 |
| M 或 P | 靜止／流動（減少動態） |
| F | 全螢幕 |
| H | 隱藏／顯示工具列 |
| Esc | 關閉油墨選單 |

工具列在滑鼠靜止約 3.5 秒後自動隱藏，移動滑鼠就會出現。工具列圖示由左至右：三個模式、油墨組、新宇宙、保存 PNG、分享連結、靜止／流動、全螢幕、Pico 旋鈕。

## 手機與平板操作

| 手勢 | 作用 |
|---|---|
| 左右滑動 | 轉動旋鈕；快速甩動會像有重量的旋鈕一樣慢慢停下 |
| 上下快速滑 | 切換模式（上滑＝下一個） |
| 按住約 0.65 秒 | 新宇宙 |
| 輕點畫面 | 顯示／隱藏工具列 |

整頁不會捲動，所以手勢不會和頁面捲動衝突。工具列在窄螢幕會折成兩列。保存 PNG 時，手機會開啟系統分享選單（可存到相簿），桌面則直接下載。

---

## 連接 Pico

Pico 已經安裝 `/main.py`，插上 USB 就會開始輸出旋鈕事件，**不需要重新燒錄或重新接線**。

1. 用 USB 把 Pico 接上 Mac。
2. 確認沒有其他程式占用它（見下方「Web Serial 使用限制」）。
3. 在 Chrome 開啟 http://localhost:5174/
4. 點工具列最右邊的**旋鈕圖示**，在 Chrome 的裝置選單中選擇 Pico（通常顯示為 *Board in FS mode* 或類似名稱），按「連線」。
5. 旋鈕圖示外圈變成實線綠色就是已連線。轉動旋鈕時，圖示上的刻痕也會跟著轉。

| 實體動作 | 作用 |
|---|---|
| 順時針／逆時針 | 轉動目前模式的旋鈕值。`delta` 可以是任意整數，會正確累加 |
| 短按 | 下一個模式（刮刀轉場） |
| 長按 | 新宇宙（墨滴暈開轉場）；長按之後不會再多觸發一次短按 |

旋鈕外圈的狀態：

- 灰色虛線：未連線
- 旋轉的虛線：連線中
- 綠色實線：已連線（再點一下中斷連線）
- 橘色旋轉虛線：Pico 被拔掉了。插回去後會自動重新連線
- 紅色並抖一下：無法開啟裝置，通常是被其他程式占用

裝置選單預設只列出 Raspberry Pi 的裝置（USB VID `0x2E8A`）。如果你的板子沒有出現，按住 **Shift**（或 Option）再點旋鈕圖示，就會列出所有序列埠。

## Web Serial 使用限制

- 只支援桌面版 **Chrome / Edge**。Safari、Firefox 與手機瀏覽器沒有 Web Serial；在這些瀏覽器上旋鈕圖示不會出現，其他功能照常可用。
- 必須從 `http://localhost` 或 https 開啟。
- **同一時間只有一個程式能占用 Pico。** 請先關閉：
  - VS Code 的 MicroPico REPL／終端機（或按 Disconnect）
  - Thonny、`mpremote`、`screen` 等序列埠工具
  - **Codex 版本的萬花筒網站**：如果它正連著 Pico，請先在那個分頁按 Disconnect（或關閉分頁），這個網站才能連線。反之亦然。

---

## 截圖與分享

- **保存 PNG**（工具列下載圖示或按 S）：以至少 2 倍解析度重新算繪當下的畫面（最長邊 4096 px），不包含任何介面元素。檔名包含模式、seed、油墨組與時間，例如 `kaleidoscope-mirror-0badf00d-riso-t83.20.png`。
- **分享連結**（鏈結圖示或按 L）：網址列的 `#` 後面會記錄完整狀態並複製到剪貼簿：

  ```
  #m=mirror&s=0badf00d&p=1&d=3,10,-2&t=83.2
  ```

  `m` 模式、`s` seed、`p` 油墨組、`d` 三個模式各自的旋鈕值、`t` 作品時間（秒）。
- 作品是這些數值的純函數：同一組 seed、旋鈕值與時間，一定得到同一張靜態畫面。保存 PNG 的同時，網址也會更新成與那張圖完全相同的狀態。
- 分享連結與保存 PNG 時的網址會多一個 `&f=1`：打開這種連結時畫面會**停在截圖的那一刻**；按播放鍵（或 M）才會繼續流動。

---

## 已知問題

- **墨** 模式是三者中最吃 GPU 的（每個像素都要倒推約 300 個水拓操作），因此以 0.72 倍內部解析度算繪。若電腦較慢，網站會自動降低解析度以維持流暢。
- **墨** 的水盆大小固定，在很寬或很長的螢幕上，四個角落會露出紙色與逐漸溶解的墨痕。這是刻意保留的「水盆邊緣」。
- **紋** 的線條在很小的螢幕或縮圖上會細於一個像素，此時會自動淡成平網，干涉色塊仍然可見。
- 手機上的 PNG 透過系統分享選單保存；若瀏覽器不支援分享檔案，會改為下載。
- iPhone 的 Safari 不支援全螢幕 API，所以全螢幕按鈕不會出現。
- 實體 Pico 的連線、拔除與重連流程已用模擬的序列埠測試，但尚未在這台 Mac 上以實機驗證（見下方）。

---

## 技術架構

```
Pico / Mouse / Touch / Keyboard
               ↓
        Input Adapters        src/input/serial.js · pointer.js · keyboard.js
               ↓
        Art Controller        src/core/controller.js（唯一的狀態與輸入入口）
               ↓
        Art Engines           src/art/mirror.js · ink.js · moire.js
               ↓
          Renderer            src/gl/renderer.js（轉場、紙張質感、PNG 匯出）
```

- 純 WebGL2 + GLSL，無任何第三方套件。每個模式是一個全螢幕 fragment shader。
- 藝術引擎完全不知道 Web Serial 的存在；Pico 事件只會呼叫 `controller.rotate()` 與 `controller.press()`，和滑鼠、鍵盤走同一條路。
- `src/input/protocol.js`：以換行切分、處理任意分段的 JSON，並驗證四種事件格式。
- `src/art/hyperbolic.js`：雙曲幾何（三角鏡群、Wythoff 構造、等距映射的閉式合成、可無限前進且可重現的攝影機路徑）。
- 所有隨機都來自 seed → `hash32` → `mulberry32`，畫面不使用 `Math.random()`。
- 高 DPI：裝置像素比上限 2，總像素預算約 320 萬，並依實際影格時間動態調整解析度。
- 靜止且沒有任何變化時不重繪；分頁隱藏時暫停。
- 減少動態：系統設定為「減少動態效果」時預設靜止，轉場改為短淡入淡出；工具列的靜止／流動按鈕可隨時切換。

```
web-claude/
├── index.html
├── styles.css
├── serve.mjs            零依賴靜態伺服器
├── package.json         npm start / npm test
├── DESIGN.md            設計意圖
├── README.md
├── src/
│   ├── main.js          組裝：輸入 → 控制器 → 算繪
│   ├── core/            controller · state（網址狀態）· palettes · prng
│   ├── input/           serial · protocol · pointer · keyboard
│   ├── art/             mirror · hyperbolic · ink · moire
│   ├── gl/              gl（共用 GLSL）· renderer
│   └── ui/              toolbar · icons
└── tests/               hyperbolic · input · core · art
```

這個資料夾與 Codex 版本（`../web/`）完全獨立，沒有共用任何程式碼；Web Serial Adapter 是重新撰寫的。
