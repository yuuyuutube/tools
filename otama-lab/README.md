# OTAMA LAB

用虛擬 Otamatone 比較琴頸位置、頻率、音名與音程的純前端工具。保留原型角色，提供三種數學模擬、連續滑音、同步雙圖與八度比較。沒有後端、第三方執行時依賴、API key 或麥克風要求。

## 開啟

- 正式網址：<https://yuuyuutube.github.io/tools/otama-lab/>
- 本機可直接開啟 `index.html`，或建置後的 `dist/index.html`。
- 開發／執行瀏覽器測試時，在此資料夾啟動 HTTP server：

```sh
python3 -m http.server 4187 --bind 127.0.0.1
```

開啟 <http://127.0.0.1:4187/>。`app.bundle.js` 是已提交的傳統 script，無需載入 ES modules，因此開啟工具本身不依賴 HTTP server。瀏覽器的 file:// 安全限制依產品而異；本次測試宿主禁止 file://，未能直接實測雙擊開啟。

## 操作

- 滑鼠／觸控：整個奶油色琴頸與綠色指示器都是操作區；向下、靠近頭部提高音高。可滑出琴頸，放開即停止。
- 下方水平滑桿也可拖曳。滑軌與滑桿使用一致的 Pointer Events 與停止處理，操作時不應滾動頁面。
- Header 的 SVG 音符「專注演奏」按鈕可切換滿版演奏模式，自動開啟聲音；只顯示琴頸、臉與退出按鈕。手機畫面鎖定捲動並隨可見 viewport／旋轉調整高度，右上角或 Esc 可退出，退出會停止目前發聲。
- 演奏介面與控制項禁止文字選取，避免快速拖曳時誤選；公式與展開的模擬說明仍可複製。
- 先按「開啟聲音」，再按住琴頸、滑桿或鍵盤發聲。聲音開關本身不會持續播放。
- 方向鍵移動 1%；Shift + 方向鍵微調 0.1%；Page Up / Down 移動 10%；Home / End 到端點。Space / Enter 按住發聲。
- 放開、取消、失去捕捉、視窗失焦或分頁隱藏會停止。Esc／停止按鈕同時關閉聲音開關。
- 位置連續變化，沒有音符吸附。音名是最近的標準音，不會改變實際演奏頻率。
- 標記基準音後可比較兩倍頻率；超出 C6 時停用倍頻按鈕。切換模型時保留基準頻率、重新計算其位置。

## 數學

所有映射均為 **Simulation**，不是 DX 實測或電路說明。合成音為 sawtooth + 固定 lowpass，不是 Otamatone 原音色。

x ∈ [0,1]，由低到高；f₀ = C3 = 130.81278265 Hz，f₁ = 8f₀ = C6。

| 模型 | f(x) | 音程靈敏度 |
| --- | --- | --- |
| Linear frequency／等距 Hz | f₀ + (f₁ − f₀)x | 高音端較低 |
| Equal semitone spacing／等距半音 | f₀ × 8ˣ | 固定 36 cents / 1% |
| Inverse-length-inspired／反比靈感 | f₀ / (1 − 0.875x) | 高音端較高 |

`MIDI = 69 + 12 log₂(f / 440)`；nearest = round(MIDI)；cents = 100 × (MIDI − nearest)。十二平均律、A4=440 Hz、C4 為中央 C。畫面顯示 Hz 1 位、半音 2 位、cents 整數；圖表及音訊使用完整精度頻率。半音圖為 `12 log₂(f / f₀)`。靈敏度是局部導數，以 cents / 1% 位移表示。

## 開發與建置

Node.js 20+，無需 npm install：

```sh
npm run build
npm test
```

`src/` 是各自可測試的 ES modules：

- `pitch.js`：映射、反算、音名、cents、靈敏度。
- `instrument.js`：琴頸／滑桿 Pointer Events、鍵盤、安全停止。
- `audio.js`：Web Audio 合成、手勢啟動、非同步競態防護。
- `visualization.js`：雙 SVG 圖表、響應式座標、基準點。
- `app.js`：介面與狀態協調。
- `focus.js`：專注演奏的視圖切換、viewport 高度與返回位置。
- `styles.css`：保留角色美術、響應式布局、reduced motion。

`build` 依固定依賴順序將小型 modules 合成為 classic IIFE `app.bundle.js`，並為 bundle / CSS 加上內容版本參數，避免新畫面搭配舊快取；另產出 `dist/`（HTML、bundle、CSS、assets、.nojekyll）。生成器只支援目前使用的 named relative imports 與具名宣告；加入其他 module 語法會明確失敗。修改 `src/` 後務必重新 build，並將更新的根目錄 bundle 一併提交。

瀏覽器整合測試：開啟 `/tests/browser.html` 按 Run checks，會播放短暫合成音。測試頁本身使用 ES modules，因此需 HTTP。測試檔不進 dist。

## Favicon 與分享圖

`assets/favicon.svg` 為沿用角色臉部的原生向量圖；另有 32px PNG 與 180px Apple touch icon。`assets/og.svg` 為 1200×630 向量原稿，`assets/og.png` 為對應分享圖，兩者都沒有文字。OG / Twitter metadata 使用正式網址的絕對路徑。SVG 為可編輯來源，PNG 已產出，執行時不需影像套件。

## GitHub Pages

目前專案位於 `yuuyuutube/tools` repository 的 `otama-lab/`，根目錄 `index.html`、`app.bundle.js`、`src/styles.css` 與 `assets/` 已能作為 Pages 子目錄直接發布。此方式沿用 repository 原有的 Pages 設定，無需將 dist 放到根目錄、也不覆蓋其他工具。

若將此資料夾作為獨立 repository：在 Settings → Pages 選 GitHub Actions，使用本專案 `.github/workflows/pages.yml` 即可將 dist 部署成獨立網站。若保留 monorepo 結構，GitHub 不會執行這個巢狀 workflow；請沿用 repository 原有發布流程。換網址時需同步更新 canonical、og:url、og:image 與 twitter:image。

官方參考：[GitHub Pages custom workflows](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages)、[Web Audio best practices](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API/Best_practices)。

## 紀錄

- [原型檢查](docs/PROTOTYPE-AUDIT.md)
- [Phase 1–4 路線圖](docs/ROADMAP.md)
- [修改清單](docs/CHANGELOG.md)
- [測試結果與未驗證項目](docs/TEST-RESULTS.md)
