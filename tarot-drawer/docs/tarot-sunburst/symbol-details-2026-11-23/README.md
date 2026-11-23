# 八張符號細節補色與月亮光芒｜2026-11-23

本輪直接編寫局部色塊與路徑，未使用圖像生成。以本輪 before/ 保存的目前稿件為底，保留使用者 Photoshop 配色及上一輪命運之輪補字。

## 實際修改

| 牌 | 修改 | 墨線 |
|---|---|---|
| 3 皇后 | 袍內八枚小石榴紋樣，含果冠、剖面與籽。 | 原檔完全一致 |
| 5 教皇 | 觀者左門徒玫瑰、右門徒百合，分別五處。 | 原檔完全一致 |
| 6 戀人 | 保留原有三簇大火焰，再於葉內加入九簇小火舌，形成十二單元的方向。依使用者要求不強求明顯清點。 | 原檔完全一致 |
| 7 戰車 | 頂篷九枚小紙白星紋。 | 原檔完全一致 |
| 10 命運之輪 | 內圈四煉金記號：上水星、右硫、左鹽、下波浪式水記號。為避既有輪輻，在各象限稍偏移。以深色描出符號；分色時保留這四處色層筆畫為實地深墨，避免四色網點與錯位淹沒小空隙，不改輪輻。 | 含前輪八字母的墨線原檔完全一致 |
| 14 節制 | 額頭小日輪，避開眉眼。 | 原檔完全一致 |
| 16 高塔 | 清除舊小金色散點，補左12＋右10枚火滴。保護兩窗原有火心及塔頂火焰，碎石保留。 | 原檔完全一致 |
| 18 月亮 | 原月面與側臉局部縮整至約85%，保留形狀；清除舊芒線，重排16主芒＋16副芒。保留15枚露滴及其他場景。 | 只有月亮局部修改 |

參照：docs/redraw-plan.md、symbol-audit-2026-11-23.md；原圖與原文連結沿用查核文件。水記號沿 RWS 圖的波浪形記號，不以一般水滴替代。月亮光芒以使用者確認的16＋16規格處理。

## 輸出與驗證

- 更新八張 light-paint/*-colour.png、八張 *-preview.png，只有 18-moon-ink-transparent.png 被修改。
- 用原 reveal-bake.html 與 buildRevealPlates／printCard 更新八張 assets/faces 和各五張 assets/reveal。
- scripts/repair-colour-symbols.swift 保存手寫色塊及光芒座標。重跑以本批 before/ 為固定輸入，避免色塊重疊。
- scripts/normalize-symbol-png.py 只正規化輸出 PNG 的 sRGB／gAMA 標記，不改 IDAT 像素資料，避免 AppKit DeviceRGB 標記讓瀏覽器把圖讀成淡色。
- scripts/verify-symbol-details.swift 對照色層差異範圍與墨線檔案；pixel-verification.json 確認前七張墨線位元組完全不變，月亮的十五枚露滴仍形成15個獨立色塊。
- construction.json 記錄高塔火滴的左右座標與月亮32道光芒的逐道編號／端點。review.html 的數量編號可開關，編號不會寫入牌圖。
- 檢查了原色層合成及正式印刷圖；小衣紋、小日輪在120px縮圖自然較弱，不將所有縮圖細節都宣稱可逐一清點。
- press.js 印刷引擎及其參數、牌框、各牌插圖位移值、抽牌流程與正／逆位牌義不變。reveal-plates.js 的10號分色新增四個深色符號的實地保護；輸入仍是色層 PNG，墨線母檔不變。沒有執行完整抽牌與海報互動驗證。

Light Paint JSON／ZIP、歷史 batch 衍生圖未重新打包；目前正式烘焙依然讀取最新平塗 PNG 與透明墨線 PNG。原查核文件保留為查核當時紀錄，沒有覆寫原結論。

## 復現

```sh
swiftc -module-cache-path /tmp/tarot-swift-cache scripts/repair-colour-symbols.swift -o /tmp/repair-colour-symbols
/tmp/repair-colour-symbols /absolute/path/to/tarot-drawer
python3 scripts/normalize-symbol-png.py
```

之後用既有本機烘焙入口重新輸出本批八張。before/ 包含本批修改前的色層、墨線、預覽、正式插畫與翻牌色版，方便精確回復。

## 發布同步｜2026-11-23

使用者核准後，正式插畫、翻牌色版、圖鑑下載與圖片版本號已同步。另以 scripts/sync-light-paint-projects.py 更新目前22份分層專案及ZIP，嵌入圖層與最新PNG逐一相符；current-project-validation.json 是本次打包驗證。上文未打包的說明是修圖完成當時的狀態。
