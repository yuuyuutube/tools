# 原型檢查（修改前）

2026-11-07。原檔 `docs/otamatone-pitch-lab.html` 完整保留，作為設計與行為對照。

- 單檔 HTML / inline CSS / IIFE JavaScript，無第三方依賴。
- CSS 角色：奶油色歪頭橢圓臉、黑眼、粉紅嘴，發聲時嘴巴張大。深綠底、萊姆手指、珊瑚游標、青綠半音曲線。
- Pointer Events、pointer capture、touch-action:none；自製垂直 slider 與原生 range。
- C3–C6、三種映射，12-TET A4=440 Hz 的音名/cents 換算。
- 兩張 SVG 曲線與同步位置游標。Web Audio sawtooth + lowpass + gain。
- 實際於本機 IAB 瀏覽器開啟；Home / End 正確顯示 C3 130.8 Hz / C6 1046.5 Hz，聲音按鈕可進入發聲狀態。

## 問題

1. 聲音按鈕是持續 drone；滑軌放開後仍發聲，無全域 blur/pagehide 安全停止。
2. 單檔耦合，不利於未來麥克風、量測、頻譜擴充。
3. 圖表高寬與標尺密度不一致；缺少可操作的八度比較與局部位移靈敏度。
4. 自製 slider 沒有 aria-orientation，cents 未包含於可讀音高描述；未處理 reduced motion。
5. 音訊非同步 resume 需要防止 release/stop 後晚到的啟動造成卡音。

## 延續

保留角色 CSS 造型與嘴巴表情、琴頸、連續滑音、配色、兩圖同步及三模型公式。以獨立 ES modules 加強輸入/音訊生命週期、SVG 語意、互動教育、響應式排版。新增入口，不改寫原型檔。
