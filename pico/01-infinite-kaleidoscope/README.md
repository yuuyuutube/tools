# Weird Lab / 001 · Infinite Kaleidoscope

把一顆旋鈕當成生成藝術樂器。**KALEIDO** 用鏡射扇形重組色版。**SPIRO** 疊印逐段生長的數學曲線。**OPTICAL** 用條紋、點陣和同心弧改變空間感。**ETERNAL BLOOM** 從花芯持續長出新幾何環。四種引擎共用 13 組色盤，接上 Pico 前就可以用瀏覽器玩。

## 本機啟動

在本資料夾 `01-infinite-kaleidoscope` 開終端機，執行：

```sh
python3 -m http.server 8000 --bind 127.0.0.1 --directory web
```

在瀏覽器開啟 [http://localhost:8000](http://localhost:8000)。若 `localhost` 解析失敗，可開啟 [http://127.0.0.1:8000](http://127.0.0.1:8000)。硬體連線使用桌面 Google Chrome，其他瀏覽器也可使用網頁控制。若連接埠 8000 已占用，可換成 8001 並調整網址。回到終端機按 `Ctrl+C` 可停止伺服器。

### 網頁操作

| 想做什麼 | 操作 |
| --- | --- |
| 改變構圖 | 在畫布拖曳滑鼠、滾動滾輪或觸控板、用手指滑動、按方向鍵 `←`／`→`，或點 `−`／`+` |
| 選擇引擎 | 點下方工具列的四個圖案圖示，或按 `Space` 依序切換 |
| 生成新宇宙 | 點雙箭頭的隨機圖示，或按 `R` |
| 更換色盤 | 點工具列的色票，選擇一組色盤 |
| 展覽播放 | 按 `F` 或點右上角的全螢幕圖示，依瀏覽器權限使用全螢幕或填滿分頁 |
| 查看操作和設定 | 點右上的問號或按 `H` |
| 自動演化 | 在 KALEIDO、SPIRO 或 OPTICAL 點問號並開啟 **Demo mode** |
| 減少動態 | 點問號並開啟 **Reduce motion**。首次依循系統偏好，開啟時停用 Demo 和過場 |
| 保存作品 | 下載圖示只匯出畫布，檔名含引擎與 Seed |
| 分享或還原 | 點連結圖示複製網址，貼到瀏覽器或問號面板的還原欄位 |

色票選單末尾有五組新配色，四個引擎都能使用。

| 風格 | 色盤 |
| --- | --- |
| 可愛 | **Candy Picnic**，葡萄紫、草莓粉、薄荷綠與奶油黃 |
| 優雅神秘 | **Velvet Eclipse**，墨藍、煙紫、孔雀綠與古金 |
| 印度風 | **Marigold Peacock**，深孔雀藍、胭脂紅、青柚綠與萬壽菊黃 |
| 北歐風 | **Lingonberry Wool**，雲杉綠、越橘紅、冬霧藍與暖亞麻白 |
| 日系 | **Persimmon Ink**，墨灰、柿紅、抹茶綠與淡青瓷 |

作品連結包含演算法版本、引擎、Seed、位置、色盤與目前的動畫時間。開啟連結會停在同一個動畫時刻。切換引擎、色盤或 Seed 時若立即保存，會先完成過場，保存過場的目的畫面。使用相同版號、渲染模式和畫布比例可重現構圖，輸出解析度依畫布與渲染預算而定。本機網址可在同一台電腦開啟，或貼到另一台已啟動同版本作品的還原欄位。

### 風格選單

四種模式都可點右上角的疊層圖示選風格，或長按 Pico 旋鈕依選單順序輪換三款風格。切換模式再回來會記得這次開啟頁面時選過的風格。分享連結記住目前的風格，PNG 會以當下的樣子匯出。

| 模式 | 預設 | 新風格 |
| --- | --- | --- |
| KALEIDO | Chromatic Fold | Enamel Window 琺瑯花窗，Folded Star 折紙星 |
| SPIRO | Plotter Plate | Ribbon Orbit 緞帶軌道，Celestial Etching 天體蝕刻 |
| OPTICAL | Kinetic Field | Tidal Relief 潮汐浮雕，Moiré Weave 莫列織紋 |
| ETERNAL BLOOM | Indian | Nordic 北歐風，Japanese 日系 |

前三種模式切換風格時保留現有色盤和旋鈕位置。Bloom 切換風格時套用搭配的色盤。

### Eternal Bloom

選第四個花瓣圖示進入 Eternal Bloom。順時針轉動 KY-040、點 `+` 或向右拖曳會向外綻放，反向會向花芯收回。也可用滾輪或左右方向鍵操作。每格推進或回退四分之一環，停手後畫面收在最後一格，等下一次操作。

點右上的疊層圖示可直接選 **Indian**、**Nordic**、**Japanese**。長按 Pico 旋鈕會依這個順序循環切換，保有目前的 Seed 和綻放位置。印度風有蓮瓣、小油燈、孔雀尾羽、雙彎勾紋、鏤空石窗和珠串，北歐風有鬱金香、拼色菱形、四角冬星、鈴蘭、編織雪花和野玫瑰，日系有淺凹櫻瓣、紙鶴、麻葉折面、青海波、立涌和折扇。各風格都有六套輪廓。選風格會套用搭配的色盤，仍可用原本的色盤選單更換。

每個新環用 Seed 和生成序號建立扇形向量路徑。外輪廓先形成，內色塊與細節隨後顯現。每六個生成槽包含六個家族各一次。相鄰層交替配置顏色與輪廓，各環保有由 Seed 決定的共同對稱軸。

生長進度的整數部分是最新生成序號，小數部分是新環年齡。各環由其年齡換算半徑，向外滑出畫面後便釋放路徑快取。初次進入時也會重建較早的外層，讓作品立即有完整構圖。更換 Seed 時，現有的畫面轉場會淡入新序列。色盤與隨機圖示在 Bloom 模式下保留既有播放狀態。

分享網址另存 `b` 生長進度和 `style` 風格。舊連結的 `r` 速率參數會忽略。Seed 與生長進度決定生成序號和軸數，再用指定風格重建輪廓。還原後可從同一畫面繼續轉動。PNG 直接取自同一個畫布，檔名包含風格與 Seed。

## 硬體與接線

- Raspberry Pi Pico 2 WH，已安裝 MicroPython，例如本實驗使用的 v1.29.0。MicroPython 是讓 Pico 執行 Python 程式的板上環境。
- KY-040 旋轉編碼器一顆、杜邦線五條、Keyestudio GPIO 擴展板。
- 可傳資料的 USB 線一條。只有充電功能的線無法讓電腦看見序列埠。
- Mac、VS Code、MicroPico 擴充套件與桌面 Chrome。

先拔除 Pico 的 USB 和外部電源，再調整線路。依擴展板絲印確認 **GP** 編號與電源，接妥後才插回 USB。

| KY-040 | Pico GPIO／電源 | 用途 |
| --- | --- | --- |
| CLK | GP16 | 旋轉訊號 A |
| DT | GP17 | 旋轉訊號 B |
| SW | GP18 | 按鈕，按下時讀到低電位 |
| + | 3V3 | 3.3 V 供電，請使用擴展板的 3.3 V 接腳 |
| GND | GND | 共地 |

對照擴展板上的邏輯 GPIO 標示，GP16 指的是 GPIO 16。若方向或每格回饋與旋鈕不符，可調整 `firmware/main.py` 開頭的 `DIRECTION` 或 `EDGES_PER_CLICK`。調接線前先斷電。

## 韌體試跑與獨立開機

### A. 先用 MicroPico 試跑

1. 在 VS Code 開啟 `firmware/` 資料夾。首次使用時，從 `⌘⇧P` 執行 **MicroPico: Initialize MicroPico Project**，再執行 **MicroPico: Connect** 或從狀態列選擇 Pico。
2. 若有舊程式正在跑，執行 **MicroPico: Stop Execution**，或在 MicroPico 終端的 REPL 按 `Ctrl+C`。REPL 是 Pico 的互動式 Python 終端機，出現 `>>>` 代表可以輸入指令。
3. 打開 `main.py`，執行 **MicroPico: Run Current File on Board**。這會傳送內容供裝置當次執行。按下、長按和轉動旋鈕，應看到一行一筆 JSON。
4. 結束以 **Stop Execution** 或 `Ctrl+C` 停止。關閉或中斷 MicroPico 的序列連線時，也可能停止當次程式。Chrome 連線前請完成下面的獨立啟動流程。 [MicroPico 使用說明](https://github.com/paulober/MicroPico/blob/main/README.md)

正常輸出範例：

```json
{"type":"rotate","delta":1}
{"type":"rotate","delta":-1}
{"type":"press","kind":"short"}
{"type":"press","kind":"long"}
```

順時針送 `delta: 1`，逆時針送 `delta: -1`，每個偵測到的旋鈕刻度各送一行。按鈕以 22 ms 消抖，短按在放開後送出，長按約 700 ms 送出一次。持續按住或放開長按都不會再送出按鈕事件。

韌體在主迴圈取樣 GPIO，平時每次取樣後等待約 1 ms。USB 寫入後立即重新取樣。USB 寫入可能拉長取樣間隔，快速旋轉可能漏格，整段落在兩次取樣之間的按壓也可能漏掉。接近 700 ms 的按壓依取樣到的按下和放開時間判斷。 [MicroPython 計時說明](https://docs.micropython.org/en/v1.29.0/library/time.html)

### B. 儲存到裝置根目錄並交給 Chrome

1. 先停止試跑。如果裝置根目錄已有 `main.py`，先用 MicroPico 的檔案視圖下載備份，或在 REPL 用 `import os; os.listdir()` 確認檔案後改名保留。
2. 以 `firmware/` 作為 VS Code 工作區，在檔案總管對 `main.py` 用右鍵選 **MicroPico → Upload File to Board**。確認 Pico 檔案視圖的根目錄顯示 `main.py`。存放到板上根目錄的 `/main.py` 會在 Pico 正常開機後自動執行。 [MicroPython 開機流程](https://docs.micropython.org/en/latest/reference/reset_boot.html)
3. 執行 **MicroPico: Disconnect**，並關閉仍占用該序列埠的 REPL、其他 VS Code 視窗或終端機。若 MicroPico 設為自動重連，可先關閉該 VS Code 工作區。
4. 拔掉再插回 Pico 的 USB，讓它從裝置上的 `/main.py` 獨立開機。先等裝置出現在 macOS，再切到 Chrome。
5. 在本機作品頁點右上角的插頭圖示，從 Chrome 選擇器選 Pico 或 USB Serial 裝置，再按連線。macOS 終端的 `ls /dev/cu.usbmodem*` 可協助比對裝置。USB CDC 是 Pico 透過 USB 模擬的序列埠。網頁以 115200 開啟連線，這是 Web Serial 的設定值，在此 USB CDC 路徑上不代表實體 UART 的傳輸速度。 [Chrome Web Serial 說明](https://developer.chrome.com/docs/capabilities/serial/)
6. 插頭圖示亮起時，轉動旋鈕可演化，Eternal Bloom 模式下會直接綻放或收回。短按依序切換四個模式，長按輪換目前模式的三款風格。測完先點插頭斷線，再回 MicroPico。意外拔除時網頁可繼續用，插回後點插頭並重新選擇。

> **一次只讓一個程式使用 Pico 序列埠。** MicroPico 的 REPL 與 Chrome Web Serial 共用同一條連線。

### 安全停止與復原

在 Chrome 點已亮起的插頭斷線，再讓 MicroPico 或序列終端連回 Pico，按 `Ctrl+C` 回到 `>>>`。要取消開機自動執行，可在 REPL 鍵入 `import os; os.rename('main.py', 'kaleido_saved.py')`，先確認目的檔名未被使用。備份後重新插 USB，裝置會回到一般 REPL。換線與拆除擴展板前先拔 USB 和外部電源。如果裝置仍能顯示序列埠，優先用 REPL 停止程式。 [MicroPython 中斷與復原](https://docs.micropython.org/en/latest/reference/reset_boot.html)

## 故障排除

| 情況 | 檢查方式 |
| --- | --- |
| 沒有 Pico 選項 | 改用桌面 Chrome 和本機網址。檢查 USB 資料線、轉接器與 `ls /dev/cu.usbmodem*` |
| 點插頭後出現序列埠錯誤 | 從所有終端或 VS Code 視窗中斷 MicroPico，再重試 |
| 插頭亮起，但旋鈕沒反應 | 確認正式檔名為裝置根目錄的 `main.py`，離開 MicroPico 後拔插 USB。可先回到步驟 A 確認 JSON |
| 每格回饋偏少、偏多或方向反了 | 先測慢轉與各轉十格。根據實際模組將 `EDGES_PER_CLICK` 改為 2 或 4，或將 `DIRECTION` 設為 -1，重新上傳並開機 |
| 只有按壓或只有轉動可用 | 先斷電，對照 SW、CLK、DT、3V3 與 GND。確定擴展板選用 3.3 V |
| 切換引擎後畫面保持靜止 | Eternal Bloom 由旋鈕或頁面控制推進。其餘三種模式可開啟 Demo 自動演化 |
| 開啟連結後比例不同 | 同一作品會依畫布寬高比重新構圖。若 GPU 無法使用 WebGL2，KALEIDO 與 OPTICAL 會以 Canvas 2D 的替代構圖繪製 |

## 專案結構與驗證

```text
pico/
├── blink.py、encoder.py
├── docs/lab-01-prompt
└── 01-infinite-kaleidoscope/
    ├── firmware/main.py
    ├── web/index.html
    ├── web/src/
    │   ├── main.js
    │   ├── controllers/    Seed、參數映射、動畫
    │   ├── hardware/       USB 序列連線、JSON 解碼、旋鈕事件
    │   ├── engines/        WebGL2、Canvas 2D、畫面轉場、PNG
    │   ├── shaders/        KALEIDO 與 OPTICAL 的 GLSL
    │   ├── palettes/
    │   └── styles/
    ├── tests/
    └── README.md
```

SPIRO 和 ETERNAL BLOOM 使用 Canvas 2D。KALEIDO 和 OPTICAL 優先用 WebGL2 繪製折射扇形或扭曲場。Bloom 最多快取 13 個環的向量路徑，扇形可重複繪製，只有新進入的生成序號需要建立路徑。渲染限制 DPR 與總像素，背景分頁暫停動畫，切換引擎也會停止 Bloom 計算。網站可離線使用，僅需本機 HTTP 伺服器。

在作品資料夾執行自動測試：

```sh
node --test tests/*.test.js
python3 -B -m unittest discover -s tests -p 'test_*.py'
```

- [x] 13 組色盤、四種引擎、共同控制邏輯、可版本化的 Seed 與畫面狀態。
- [x] Bloom 的測試涵蓋手動綻放與收回、停手後維持進度、背景暫停，以及新舊分享網址還原。
- [ ] 實體 KY-040 驗證 Bloom 每格綻放與收回的操作手感。
- [x] 自動測試涵蓋快速順逆轉、接點彈跳、700 ms 長按邊界、長按後放開、輪詢抖動、USB 寫入延遲、跨計時器循環的短按，以及 Web Serial 的錯誤復原和模擬拔除／重連。
- [x] macOS Chrome 實測三引擎、滾輪與鍵盤、Demo 與減少動態、展覽模式、固定 Seed 重載及窄螢幕排版。
- [x] 以 Chromium 匯出並檢查 PNG 尺寸，以 Chrome 強制停用 WebGL2 檢查兩個 Canvas 2D 備援。
- [x] 既有 `blink.py`、`encoder.py` 保留於 Pico 工作資料夾。
- [ ] 輪詢版上板確認各轉十格、快速往返、短按逐一換模式、四種模式長按每次只換一款風格、Chrome 手動斷線及 USB 拔除後重連。記下是否需要調整每格的邊沿數。
- [ ] 實體平板確認：在目標裝置上滑動、旋轉螢幕與長時間展覽播放。可依測得的效能調整解析度上限，再校對 fallback 的版形。
