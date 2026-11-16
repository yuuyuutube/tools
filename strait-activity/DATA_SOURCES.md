# 資料來源

- 原始發布：中華民國國防部，[區域動態公告](https://www.mnd.gov.tw/news/plaactlist)。
- 整理與下載：[Skyfaring CSV](https://pla-tracker.skyfaring.net/data/records.csv)、[方法與勘誤](https://pla-tracker.skyfaring.net/about)。2026-11-16 實際下載成功，無須認證；來源公開提供下載，不是國防部 API。
- 授權：來源方法頁標示 CC BY 4.0。介面、匯出圖均保留國防部與 Skyfaring 署名；本站修改包括正規化、統計及視覺化。
- [政府開放資料 138118](https://data.gov.tw/dataset/138118) 為公告資料與網址，不將它當每日架次 API。

實際 CSV 欄位：`date, aircraft_total, median_line_cross, cross_rate, aircraft_type, ships_total, activity_start, activity_end, special_event`。日期為 ISO YYYY-MM-DD。共機、越線單位為架次，ships_total 為艘；來源說明艦艇合計含公務船，CSV 無法拆分。機型僅有分類，不含各機型架次；活動起訖欄位可能空白。不採用來源 cross_rate，依數值重算。

CSV **沒有逐日國防部公告 URL**。本站提供官方列表與整理紀錄入口，不生成猜測連結。原始公告可能變更或失效；無法由此 CSV 自動驗證每一個公告網址。

第一次成功快取為 1,462 筆，2022-11-16 至 2026-11-16。最新資料以 records.json 為準。Skyfaring 公開列有歷史勘誤，因此每天完整取代通過驗證的快取，保留 changedDates 清單與內容雜湊。資料未逐筆人工對照原始公告，來源修正可能改變歷史統計。

下載失敗、欄位變更、空資料、異常值、重複或未來日期、日期倒退及大量記錄消失都不覆寫最後成功 JSON；前端顯示最近同步失敗狀態。資料未增加仍可成功同步，但最新涵蓋日期與取得時間分開顯示，不宣稱新增公告。
