// 測站對應（Station Registry）：每片海的潮汐預報地點、潮位站、波浪與海溫測站分開記錄，不假設它們是同一處。
// 編號與座標取自中央氣象署 F-A0021-001 地點清單與 O-B0076-001 測站基本資料（2026-11-16 檢查），詳見 docs/STATION_MAPPING.md。
// 候選清單依序使用第一個有新鮮資料的測站。潮位不跨站遞補：不同測站可能使用不同潮高基準。

export const COASTS = [
  {
    id: 'hualien', name: '花蓮', lat: 23.9806, lon: 121.6236, facing: 90, typicalRange: 150,
    forecast: { id: '10015010', name: '花蓮縣花蓮市' },
    tide: [{ id: 'C4T01', name: '花蓮潮位站', lat: 23.9806, lon: 121.6236, datum: 'TWVD2001' }],
    wave: [{ id: '46699A', name: '花蓮資料浮標', lat: 24.0314, lon: 121.6328 }],
    temp: [{ id: '46699A', name: '花蓮資料浮標', lat: 24.0314, lon: 121.6328 }, { id: 'C4T01', name: '花蓮潮位站', lat: 23.9806, lon: 121.6236 }],
    wind: [{ id: '46699A', name: '花蓮資料浮標', lat: 24.0314, lon: 121.6328 }, { id: 'C4T01', name: '花蓮潮位站', lat: 23.9806, lon: 121.6236 }],
  },
  {
    id: 'yilan', name: '宜蘭', lat: 24.8672, lon: 121.8375, facing: 95, typicalRange: 110,
    forecast: { id: '10002040', name: '宜蘭縣頭城鎮' },
    tide: [{ id: 'C4U02', name: '烏石潮位站', lat: 24.8686, lon: 121.8396, datum: 'TWVD2001' }],
    wave: [{ id: '46708A', name: '龜山島資料浮標', lat: 24.8471, lon: 121.9271 }, { id: '46706A', name: '蘇澳資料浮標', lat: 24.6247, lon: 121.8758 }],
    temp: [{ id: 'C4U02', name: '烏石潮位站', lat: 24.8686, lon: 121.8396 }, { id: '46708A', name: '龜山島資料浮標', lat: 24.8471, lon: 121.9271 }],
    wind: [{ id: '46708A', name: '龜山島資料浮標', lat: 24.8471, lon: 121.9271 }, { id: '46706A', name: '蘇澳資料浮標', lat: 24.6247, lon: 121.8758 }],
  },
  {
    id: 'keelung', name: '基隆', lat: 25.1506, lon: 121.79, facing: 10, typicalRange: 90,
    forecast: { id: '10017010', name: '基隆市中正區' },
    tide: [{ id: 'C4B01', name: '基隆潮位站', lat: 25.1550, lon: 121.7522, datum: 'TWVD2001' }],
    wave: [{ id: 'OAC004', name: '潮境浮標', lat: 25.1441, lon: 121.8080 }],
    temp: [{ id: 'C4B01', name: '基隆潮位站', lat: 25.1550, lon: 121.7522 }, { id: 'OAC004', name: '潮境浮標', lat: 25.1441, lon: 121.8080 }],
    wind: [{ id: 'C4B01', name: '基隆潮位站', lat: 25.1550, lon: 121.7522 }, { id: 'OAC004', name: '潮境浮標', lat: 25.1441, lon: 121.8080 }],
  },
  {
    id: 'tamsui', name: '淡水', lat: 25.1915, lon: 121.414, facing: 290, typicalRange: 220,
    forecast: { id: '65000100', name: '新北市淡水區' },
    tide: [{ id: 'C4A01', name: '淡水潮位站', lat: 25.1757, lon: 121.4248, datum: 'TWVD2001' }],
    wave: [],
    temp: [{ id: 'C4A01', name: '淡水潮位站', lat: 25.1757, lon: 121.4248 }],
    wind: [],
  },
  {
    id: 'tainan', name: '台南', lat: 22.9786, lon: 120.1758, facing: 265, typicalRange: 90,
    forecast: { id: '67000360', name: '臺南市安平區' },
    tide: [{ id: '4A', name: '安平潮位站', lat: 22.9883, lon: 120.1497, datum: 'TWVD2001' }],
    wave: [{ id: 'C6N01', name: '臺南水位浮標', lat: 22.9793, lon: 120.1354 }],
    temp: [{ id: 'C6N01', name: '臺南水位浮標', lat: 22.9793, lon: 120.1354 }],
    wind: [],
  },
  {
    id: 'penghu', name: '澎湖', lat: 23.5603, lon: 119.5781, facing: 300, typicalRange: 210,
    forecast: { id: '10016010', name: '澎湖縣馬公市' },
    tide: [{ id: 'C4W02', name: '澎湖潮位站', lat: 23.5619, lon: 119.5782, datum: '當地平均海平面' }],
    wave: [{ id: '46735A', name: '澎湖資料浮標', lat: 23.7267, lon: 119.5519 }],
    temp: [{ id: '46735A', name: '澎湖資料浮標', lat: 23.7267, lon: 119.5519 }, { id: 'C4W02', name: '澎湖潮位站', lat: 23.5619, lon: 119.5782 }],
    wind: [{ id: '46735A', name: '澎湖資料浮標', lat: 23.7267, lon: 119.5519 }],
  },
];

export const coastById = id => COASTS.find(c => c.id === id) || null;
export const DEFAULT_COAST = 'hualien';

/** 所有用到的測站編號（給 API 篩選） */
export const stationIds = () => [...new Set(COASTS.flatMap(c => [...c.tide, ...c.wave, ...c.temp, ...c.wind].map(s => s.id)))];

/** 兩點距離（公里） */
export function distanceKm(a, b) {
  const R = 6371, r = Math.PI / 180, dLat = (b.lat - a.lat) * r, dLon = (b.lon - a.lon) * r;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * r) * Math.cos(b.lat * r) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}
