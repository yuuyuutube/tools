# 音樂盒示範曲

四首短篇單音改編共用 Melody 資料格式，可播放、編輯、分享、匯出 WAV。

- 生日快樂歌：Happy Birthday to You 的常見旋律，C 大調、108 BPM，保留附點起拍。
- 叮叮噹：Jingle Bells 副歌，C 大調、144 BPM。
- 雪花隨風飄：Jingle Bells 主歌，C 大調、144 BPM，與副歌分開成兩張卡片。
- 結婚進行曲：孟德爾頌《仲夏夜之夢》作品 61 的開頭節選，116 BPM。只取單音，原譜三連音以「十六分、十六分、八分」簡化（總長仍為一拍），連結音與部分音域做可編輯的簡化；並非完整原譜。

參照：

- Jingle Bells 小提琴主旋律與節奏：[Mark Feezell 公開 CC0 樂譜](https://drfeezell.com/wp-content/uploads/christmas-jingle-bells-violin-piano.pdf)，原譜 G 大調移調為 C 大調。
- 中文曲名對照：[聖誕鈴聲](https://spotofsunshine.com/wp-content/uploads/2019/12/JingleBells.pdf)，不收錄歌詞。
- Wedding March：[公開樂譜](https://www.freesheetmusic.net/music/mendelssohn/WeddingMarch.pdf)，以孟德爾頌原旋律作短篇改編，未使用伴奏。

## 本機收藏

`beep-lab:starters:v1` 記錄初次加入。曲目 ID 固定，首次開啟編曲器／音樂盒時補入；不覆蓋已改編版本、不重複加入，之後刪除不會自動復活。收藏損壞或無法儲存時保留原始資料。

音樂盒移除會先將作品留在 `beep-lab:removed:v1`，再更新收藏；可使用「復原最近移除」逐首還原，重新整理後仍可復原。移除保留原標籤，復原同 ID 時拒絕覆蓋。沒有針對特定音符或曲名自動刪除使用者資料。

頁尾分享卡片使用 `?view=card&demo=birthday`，直接讀取生日快樂歌，不依賴本機收藏；舊的 `demo=1` 連結亦開啟生日快樂歌，帶旋律 hash 的分享仍優先呈現原旋律。
