# 資料來源與驗證界線

研究日期：2026-11-13。所有 API 存取均由後端發送。前端沒有授權碼。

## 官方依據

- [O-A0001-001 資料頁](https://opendata.cwa.gov.tw/dataset/observation/O-A0001-001)
- [官方觀測格式文件 v1.05](https://opendata.cwa.gov.tw/opendatadoc/Observation/O-A0002-001.pdf)
- [F-D0047-089 資料頁](https://opendata.cwa.gov.tw/dataset/all/F-D0047-089)
- [F-D0047 官方預報文件](https://opendata.cwa.gov.tw/opendatadoc/Forecast/F-D0047-001_093.pdf)
- [官方 API 文件](https://opendata.cwa.gov.tw/dist/opendata-swagger.html)
- [使用規範](https://opendata.cwa.gov.tw/about/rules)

已透過官方資料頁檢查 XML 範例與欄位名稱，並閱讀觀測格式 PDF。預報 PDF 的直接擷取曾逾時。未獲得授權碼，**尚未取得真實授權 REST JSON 回應**；目前 JSON 外層封裝以文件／資料集結構實作，使用合成 fixture 測試。首次填入金鑰後必須執行 `npm run verify:live`；格式若有差異，程式會保守報錯，不以展示資料冒充官方回應。

## 觀測

`GET https://opendata.cwa.gov.tw/api/v1/rest/datastore/O-A0001-001?Authorization=...&format=JSON`

支援的封裝：`records.Station[]`。

| 欄位 | 解讀 |
| --- | --- |
| `StationName / StationId` | 參考測站名稱與識別碼 |
| `ObsTime.DateTime` | 觀測時間，保留 ISO 8601 時區 |
| `GeoInfo.Coordinates[]` | 只選 `CoordinateName=WGS84` |
| `GeoInfo.CountyName / TownName` | 測站所在行政區；不用來判定使用者行政區 |
| `WeatherElement.AirTemperature` | °C |
| `WeatherElement.RelativeHumidity` | 百分比，0–100；不乘以 100 |
| `WeatherElement.WindSpeed / WindDirection` | m/s、氣象來向度數 |
| `WeatherElement.Weather` | 目前天氣現象；有雨／雷／雪時採保守建議 |
| `WeatherElement.Now.Precipitation` | 當日累積量，**不用來判定現在是否下雨** |

只採用同縣市、距預報代表點 25 km 內、兩小時內且非未來時間的鄰近觀測。缺欄位時逐欄回退至有效預報，UI 會揭露來源。沒有近站時不捏造測站。`-99`、`X`、空白、不合理範圍均轉為 null；缺失風向與 990 不作方向判斷。

## 鄉鎮預報

官方 `F-D0047-089` 頁面目前顯示的是縣市 `LocationName`，不能把它當成全臺鄉鎮目錄。因此使用 22 個各縣市的三日資料集。`src/locations.js` 集中維護映射，例如臺北市 `061`、新北市 `069`、高雄市 `065`。

支援封裝：`records.Locations[].Location[]`，每個地點具有 `LocationName`、`Latitude`、`Longitude` 與 `WeatherElement[]`。每個氣象要素的 `Time[]` 可有時間點 `DataTime`，或 `StartTime / EndTime`；數值讀取 `ElementValue[0]`。

使用 `ElementName` 與對應值：溫度／Temperature、相對濕度／RelativeHumidity、風速／WindSpeed、風向／WindDirection、天氣現象／Weather、3小時降雨機率／ProbabilityOfPrecipitation。不解析舊版 `Wx/T/RH`，也不猜測未知欄位。

- 降雨機率只從包含目前時間的半開區間 `[StartTime, EndTime)` 取值。
- 未來六小時重疊區間的最大降雨機率另供保守評分，不把未來區間標成現在的降雨機率。
- 目前區間不存在就顯示 `—`，不拿下午數值補現在。
- 時間點數值有效至下一筆（最長三小時）；不外推超過此上限。只有單一最後時間點仍只能使用最多三小時，這是本站的保守有效期規則。
- 未來六小時的降雨區間不連續或含缺值時，評估降為資料不足。
- 天氣現象用來決定藝術化的雲與光，沒有宣稱取得實際雲量或日照。

## 地理位置與隱私

GPS 座標透過 POST `/api/locate` 傳到本站，不放 URL、紀錄或 localStorage；不傳到氣象署或第三方地理編碼服務。官方請求只有資料集識別，不含使用者座標。

正式模式首次定位會載入全部 22 縣市的預報座標清單（最大三個並行請求，之後共用快取），用球面距離找最近鄉鎮預報點；最遠超過 35 km 則要求手動選擇。只要有縣市清單失敗就不假裝全國匹配完成。這是**鄰近預報區**，不是行政區邊界判定。

展示模式只對 22 個代表地點匹配，顯示「鄰近展示地點」。localStorage 只存手動選擇的縣市與鄉鎮，GPS 選擇不持久化。

## 快取與失敗

- 每個官方資料集快取 10 分鐘；相同資料集的同時請求共用一個 Promise。
- 每次官方請求逾時 15 秒。GPS 首次全國目錄有獨立的 90 秒前端期限，畫面仍可操作。
- 上游失敗可使用一小時內的伺服器快取，標示為較舊資料；不延長快取原始時間。
- 沒有預報就回 502。沒有觀測仍可回傳有效預報與欄位來源。
- 瀏覽器更新失敗會保留同地點的舊資料並降級評估；沒有可用資料則明確標示展示資料。
- 可見分頁每 10 分鐘更新，隱藏分頁不輪詢；重新整理仍尊重伺服器快取。
- 無請求記錄；錯誤訊息不包含上游網址／金鑰。沒有任意 URL 代理、外部字型、分析器或追蹤程式。

## 實際驗證狀態

| 項目 | 本次結果 |
| --- | --- |
| 官方資料頁與觀測格式文件 | 已閱讀 |
| 正式授權觀測／預報 API | 未驗證，缺少 CWA_API_KEY |
| JSON 解析、時段與缺值 | 合成 fixture 測試通過 |
| HTTP 代理成功／錯誤路徑 | 本機測試通過 |
| 金鑰未外洩至公開檔案／錯誤 | 本機測試通過 |
| 手機／桌面展示場景 | 瀏覽器檢查與截圖完成 |
