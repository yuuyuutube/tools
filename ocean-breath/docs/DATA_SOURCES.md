# 資料來源

全部來自[中央氣象署開放資料平台](https://opendata.cwa.gov.tw/)。REST 端點：`https://opendata.cwa.gov.tw/api/v1/rest/datastore/{資料代碼}?Authorization=金鑰&format=JSON`。

欄位結構在 2026-11-16 依據以下來源確認：平台的 swagger（`/apidoc/v1`）、資料集說明、平台提供的當日範例檔，以及 GitHub 上公開的真實 REST 回應。`tests/fixtures/` 裡是從這些官方檔案擷取的樣本，測試直接用它們跑解析。

## F-A0021-001 潮汐預報（未來 1 個月每日潮況）

- 路徑：`records.TideForecasts[].Location.{LocationId, LocationName, Latitude, Longitude, TimePeriods.Daily[].{Date, LunarDate, TideRange, Time[].{DateTime, Tide, TideHeights.{AboveTWVD, AboveLocalMSL, AboveChartDatum}}}}`
- `Tide`：`滿潮`／`乾潮`。`TideRange`：`大`／`中`／`小`。每天 1–4 個事件，不固定兩高兩低。
- 潮高單位 **cm**，三種基準：
  - `AboveTWVD`：臺灣高程基準（本島 TWVD2001，離島用島上的基準；部分地點為 null）
  - `AboveLocalMSL`：當地平均海平面（本站判斷水位用這個，每個地點都有）
  - `AboveChartDatum`：海圖基準
- REST 版的 `AboveTWVD` 是字串、另外兩個是數字；檔案版全是字串，單一事件時 `Time` 可能不是陣列。解析器兩種都接受。
- 篩選：`LocationId`（逗號分隔）、`sort=DateTime`。全檔約 10 MB，一定要篩選。
- 更新：每天一次（約 00:07 發布，涵蓋當天起 31 天）。伺服器快取 6 小時。

## O-B0075-001 海象監測（48 小時）

- 路徑：`Records.SeaSurfaceObs.Location[].{Station.StationID, StationObsTimes.StationObsTime[].{DateTime, WeatherElements}}`（注意大寫 `Records`；時間欄位有時叫 `DataTime`，兩者都讀）
- 回傳**不保證時間順序**，解析時排序並去重。
- `WeatherElements`：`TideHeight`（**m**，轉成 cm）、`TideLevel`（漲潮／退潮）、`WaveHeight`（m）、`WavePeriod`（s）、`WaveDirection`（度，來向）、`SeaTemperature`（°C）、`PrimaryAnemometer.WindSpeed`（m/s）、`WindDirection`（度，來向）、`SeaCurrents`。
- 缺測：`"None"`（無資料、儀器故障或測站不觀測此項）、`"-"`（通訊中斷）。潮位站的回應沒有 Wave* 欄位。本站一律轉成 null，畫面顯示「—」。
- 潮高基準：本島潮位站為 TWVD2001（基隆平均海平面為 0）；離島（澎湖、金門、馬祖、蘭嶼、綠島）為當地平均海平面。**觀測潮位與預報的 AboveLocalMSL 基準不一定相同，本站不把兩者相減、不做跨測站排行。**
- 篩選：`StationID`（逗號分隔）。
- 更新：每小時整點觀測。伺服器快取 10 分鐘。

## O-B0075-002 海象監測（30 天）與歷史

O-B0075-002 每次呼叫最多 24 小時，要湊滿 30 天得連續呼叫 30 次。本站改為**自行累積**：每次取得 48 小時觀測就併入歷史，保留最近 30 天、只保存真的收到過的整點（`server/normalize.js` 的 `mergeHistory`）。本機存在 `.ocean-cache/history.json`；Pages 由 GitHub Actions 從上次發布的 `ocean-breath-history.json` 接續。剛開始累積時，30 天時間軸只會有 48 小時的實測，介面會提示。

## O-B0076-001 海象測站基本資料

只用來建立測站對應表（站名、座標、測站類型、觀測項目、狀態），不在執行時呼叫。它不在 REST swagger 裡，要從檔案 API 取得。2026-11-16 的狀態：龜山島資料浮標 46708A、澎湖潮位站 C4W02 為停止觀測（status 0）。

## 本站的快照格式

`/api/ocean` 與 Pages 的 `ocean-breath.json`：

```json
{ "version": 1, "mode": "live", "generatedAt": "...", "forecastAt": "...", "observedFetchedAt": "...",
  "forecasts": { "10015010": { "id", "name", "lat", "lon", "events": [{ "time", "type": "high|low", "heights": { "twvd", "msl", "chart" } }], "days": [{ "date", "range" }] } },
  "stations": { "C4T01": [{ "t", "tide"(cm), "level", "wave", "period", "waveDir", "temp", "wind", "windDir" }] },
  "issues": [] }
```

## 新鮮度

| 狀態 | 條件 | 畫面 |
| --- | --- | --- |
| 正常觀測 | 最新觀測 ≤ 90 分鐘 | 觀測 hh:mm |
| 近期觀測 | ≤ 3 小時 | 近期觀測 hh:mm |
| 資料延遲 | ≤ 24 小時 | 資料延遲 m/d hh:mm |
| 無觀測資料 | 超過一天或沒有 | 無觀測資料／數值「—」 |
| 僅潮汐預報 | 有預報、沒有任何觀測 | 僅潮汐預報＋說明「目前使用潮汐預報，未取得最新觀測資料。」 |
| API 失敗 | 預報與觀測都失敗 | 有舊資料：連線失敗＋時間；沒有：展示模式 |
| 展示模式 | 沒有金鑰／沒有資料來源 | 展示模式 |

## 使用限制

- 漲退潮依官方極值事件判斷；事件缺漏、重複、同時又滿又乾、連續同型或間隔不合理（< 1.5 小時或 > 16 小時）時停止推算，顯示「潮汐資料不足」。
- 畫面上的連續水位是相鄰極值的餘弦插值，只是**視覺示意**，不顯示成精確潮位數字。官方沒有逐時潮位預報可用。
- 沒有船舶定位資料：淡水的小船、各地的海鳥都是裝飾動畫。
- 不發布任何危險警告；本站不能作為航行、游泳、衝浪或海岸活動安全判斷依據。
