// Deliberately synthetic fixtures matching the documented capitalized CWA schema.
// These are NOT downloaded live API responses.
export const NOW=Date.parse('2026-11-13T09:30:00+08:00');
export const interval=(value,start='2026-11-13T09:00:00+08:00',end='2026-11-13T12:00:00+08:00')=>({StartTime:start,EndTime:end,ElementValue:[value]});
const element=(name,value)=>({ElementName:name,Time:[interval(value)]});
export function forecastFixture() {return {success:'true',records:{Locations:[{LocationsName:'臺北市',Location:[{
 LocationName:'中正區',Latitude:'25.0324',Longitude:'121.5199',WeatherElement:[
 element('溫度',{Temperature:'28'}),element('相對濕度',{RelativeHumidity:'58'}),element('風速',{WindSpeed:'2.4'}),
 element('風向',{WindDirection:'東北風'}),element('天氣現象',{Weather:'晴',WeatherCode:'01'}),
 {ElementName:'3小時降雨機率',Time:[interval({ProbabilityOfPrecipitation:'10'}),interval({ProbabilityOfPrecipitation:'80'},'2026-11-13T12:00:00+08:00','2026-11-13T15:00:00+08:00')]}
 ]}]}]}};}
export function observationFixture() {return {success:'true',records:{Station:[{StationId:'TEST01',StationName:'測試站',ObsTime:{DateTime:'2026-11-13T09:00:00+08:00'},
 GeoInfo:{CountyName:'臺北市',TownName:'大安區',Coordinates:[{CoordinateName:'TWD67',StationLatitude:'0',StationLongitude:'0'},{CoordinateName:'WGS84',StationLatitude:'25.03',StationLongitude:'121.52'}]},
 WeatherElement:{AirTemperature:'27',RelativeHumidity:'60',WindSpeed:'1.2',WindDirection:'90',Weather:'晴',Now:{Precipitation:'30'}}}]}};}
