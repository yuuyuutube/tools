# 鈴聲考古：已開放八關

五步驟流程共用同一 Melody 與 AudioEngine。關卡只提供目標、錯誤版、任務與三層提示；編輯器與判定不依賴曲名或畫面文字。原創「回聲小徑」流程樣本已替換為正式曲目。

| ID | 曲目 | 改編及出題 |
|---|---|---|
| nokia | Nokia Tune | A 大調鈴聲片段，156 BPM。第 3 音 F#1 被改為 F1。 |
| ode-to-joy | 歡樂頌 | 第九號交響曲主題前四小節移調 C 大調，112 BPM。第 5 音 G2→A2、第 11 音 D2→E2。 |
| fate | 第五號交響曲開頭 | C 小調，108 四分音符 BPM（教學慢速）。保留起始八分休止、三短一長；第 1 格八分休止被改為四分，第 5 音二分音符被改為四分。 |

## 核對來源與改編邊界

- Nokia Tune 的來源及使用歷史：[Microsoft Devices Blog](https://blogs.windows.com/devices/2009/01/21/history-of-nokia-part-3-grand-valse/)。
- 塔雷加《Gran Vals》原譜：[公開掃描 PDF，第 2 頁第 3 行](https://gitarrengold.de/wp-content/uploads/2013/03/Gran-Vals-Francisco-Tarrega.pdf)。只取高聲部旋律；採熟悉的鈴聲收尾 A，並非原吉他譜後續銜接的 E。不使用原機錄音，也不宣稱音色與節奏處理完全複製特定韌體。
- 歡樂頌：[Mutopia 公開領域譜例](https://www.mutopiaproject.org/ftp/BeethovenLv/ode/ode-let.pdf)。只取前四小節主旋律，移調成 C 大調，保留末句附點四分、八分與二分音符。
- 第五號交響曲：[BYU 出版物收錄的原管弦樂譜，第 16 頁](https://rsc.byu.edu/sites/default/files/pub_content/pdf/Ludwig%20Van%20Beethoven.pdf)。取弦樂主題前五小節；最後兩個連結的二分 D 合併為一個全音符。延長記號不採自由速度，播放採固定時值；原譜 E♭ 以模型支援的等音 D# 表示。無複製出版物內的圖像、文字或錄音。

## 第二批：第 4～6 關

- `fur-elise`：《給愛麗絲》開頭右手聲部（72 BPM）；第 2、4 音 D#2 降為 D2。取原譜前段，不加入左手伴奏；保留右手休止與十六分音符。
- `alla-turca`：《土耳其進行曲》開頭（112 BPM 教學慢速）；第 3 音 G#1 改為 G1，第 7 音 1/16 拉長為 1/8。混合關會自動展開時值設定。
- `nachtmusik`：《弦樂小夜曲》第一小提琴前四小節（132 BPM）；第 1 音 G2 與第 11 音 D3 各降低一個八度。保留原譜休止符，和弦只取最高聲部。

旋律與節奏核對 Mutopia 官方原始譜：

- [Für Elise，Breitkopf & Härtel 1888 來源版本](https://github.com/MutopiaProject/MutopiaProject/blob/master/ftp/BeethovenLv/WoO59/fur_Elise_WoO59/fur_Elise_WoO59.ly)
- [Rondo Alla Turca，righta 聲部](https://github.com/MutopiaProject/MutopiaProject/blob/master/ftp/MozartWA/KV331/KV331_3_RondoAllaTurca/KV331_3_RondoAllaTurca-lys/KV331_3_RondoAllaTurcaNotes.ly)，德式 h 為 B，gis/dis 為 G#/D#；依原檔移調指示解析八度。
- [Eine kleine Nachtmusik，violinOne 聲部](https://github.com/MutopiaProject/MutopiaProject/blob/master/ftp/MozartWA/KV525/eine-kleine-nachtmusik-mvt1/eine-kleine-nachtmusik-mvt1-lys/violin1.ly)，依 G 大調與 relative 音高解析 F#。

## 我的版本與原曲試聽

步驟 3 固定呈現使用者正在修復的版本，標示「我的版本」。播放原曲時，只隱藏這份樂譜的音符文字及其可及名稱（顯示「──」），保留編號與播放位置；停止、自然播放結束或切換播放來源後恢復使用者自己的音符。不把正解樂譜寫進編輯器，亦不改動任何編輯資料。

## 闖關與本機進度

- 可自由選八關，也可通關後按「下一關」。最後一關若還有未完成關卡，提供回到尚未完成關卡的入口。
- `?view=archaeology&level=nokia`（或 `ode-to-joy`、`fate`）直達該關。沒有指定時使用本機上次選取的關卡。
- `beep-lab:repair-progress:v1` 保存已完成 ID 與目前關卡；重新整理會從該關聽原曲開始，不保存尚未送出的編輯草稿。寫入時合併其他分頁的完成紀錄。資料無效／版本不支援時保留原始資料，遊戲仍能在本次頁面繼續。
- 分享修復作品仍產生旋律卡片；不把本機進度帶進分享網址，也不自動加入音樂盒。
- 每次成功挑戰抽一句讚美；返回步驟不重抽。重新挑戰後成功避開上一句。讚美不影響判定與進度。


## 第三批：第 7～8 關

- `spring`：《四季・春》開頭，E 大調、132 BPM，保留弱起與兩次重複句。第 2 音的 1/8 拉長為 1/4，第 7、15 音的附點被移除。核對 [Mutopia 第一小提琴原始譜](https://github.com/MutopiaProject/MutopiaProject/blob/master/ftp/VivaldiA/O8/spring/spring-lys/spring1a.ly)，依 E 大調解析 F#/G#/D#。
- `swan-lake`：《天鵝湖》主題前四小節，C 小調、96 BPM 簡化移調版。第 1 音全音符縮成二分，第 4 音 D#2 改為 D2，第 8 音附點被移除。核對 [Gilbert DeBenedetti 的旋律譜例](https://www.gmajormusictheory.org/Freebies/FirstPieces/0SwanLake/0SwanLake.pdf)，音域提高八度以符合共用模型；降 E 以等音 D# 表示，不使用譜例圖像或錄音。

## 全通關證書

完成八個實際關卡 ID 後，通關畫面顯示「領取通關證書」，頁首「通關證書」入口也會保留，重開頁面可再次製作。重複完成或未知關卡 ID 不可代替缺少的關卡。

名字由玩家輸入（最多 24 個 Unicode 碼位），Canvas 直接繪製文字，不解析 HTML。名字只存在本次頁面，不寫入 localStorage 或傳送伺服器。每次產生時取裝置當地日曆日期，不使用 UTC 日期截斷，避免跨日錯誤。

輸出為 1600×1200 PNG，採本機字型，不載入外部字型／圖片。姓名過長會縮小字級；修改名字後立即停用舊檔下載與分享，須重新產生。圖片含名稱、完成關數、日期與 BEEP LAB 署名。

分享以已產生的 File 在使用者點擊當下呼叫系統檔案分享；不支援時改用剪貼簿 PNG，兩者皆無法使用則下載圖片供使用者自行附加。系統分享取消不會自動下載或傳送；下載、分享都由玩家主動點選。未登入、無後端，證書是趣味通關紀念，無外部認證流程。
