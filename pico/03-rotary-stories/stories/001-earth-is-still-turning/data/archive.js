// The archive data for E-017 and E-031: which images exist, when they were taken and received,
// who took them, and the records attached. Pure data + small helpers (tested in tests/).
// Every date here must agree with design/timeline.md.
import { mulberry32 } from '../../../src/audio/dsp.js';

// ---- light-time model -----------------------------------------------------------------------
// Distance from Earth (light years) at ship year N: accelerate 2 y to 0.072c, cruise, brake ~4 y.
export function distanceAt(N) {
  if (N <= 0) return 0;
  if (N <= 2) return 0.018 * N * N; // 0.072c reached at N=2 → 0.072 ly
  const end = 63.79;
  const brake = 59.79;
  if (N <= brake) return 0.072 + 0.072 * (N - 2);
  const cruiseEnd = 0.072 + 0.072 * (brake - 2);
  const t = Math.min(N, end) - brake;
  return cruiseEnd + 0.072 * t - (0.072 / 8) * t * t;
}

const DEPART = 2074.3;
const DILATION = 1.0026;

// Ship year at which data sent from Earth at decimal year `te` arrives (plus scheduling delay).
export function receivedShipYear(te, schedule = 0.15) {
  let lo = 0;
  let hi = 64;
  for (let i = 0; i < 50; i++) {
    const mid = (lo + hi) / 2;
    const earthAtShip = DEPART + mid * DILATION;
    if (earthAtShip - distanceAt(mid) < te) lo = mid;
    else hi = mid;
  }
  return lo + schedule;
}

const MONTH_DAYS = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

export function decimalYear(date) {
  const [y, m, d] = date.split('-').map(Number);
  let doy = d - 1;
  for (let i = 0; i < m - 1; i++) doy += MONTH_DAYS[i];
  return y + (doy + 0.5) / 365;
}

export function seasonOf(month) {
  if (month >= 3 && month <= 5) return 'spring';
  if (month >= 6 && month <= 8) return 'summer';
  if (month >= 9 && month <= 11) return 'autumn';
  return 'winter';
}

// ---- E-017 ----------------------------------------------------------------------------------

const E017_FIXED = {
  2073: '2073-03-18 10:20',
  2078: '2078-12-02 09:50',
  2083: '2083-07-21 09:40',
  2086: '2086-11-12 10:05',
  2087: '2087-04-03 09:55',
  2088: '2088-10-09 10:10',
  2094: '2094-01-15 10:30',
  2100: '2100-05-30 09:45',
  2101: '2101-09-08 10:00',
  2106: '2106-08-12 09:35',
  2109: '2109-03-11 10:15',
  2111: '2111-11-03 10:00',
  2117: '2117-02-20 10:20',
  2124: '2124-06-08 09:50',
  2133: '2133-06-14 09:20',
};

function observerE017(y) {
  if (y <= 2095) return '王建志';
  if (y <= 2117) return '林子豪';
  if (y <= 2132) return '陳映彤';
  return '許家瑜';
}

function pad(n) {
  return String(n).padStart(2, '0');
}

function makeDate(year, rand) {
  const m = 1 + Math.floor(rand() * 12);
  const d = 1 + Math.floor(rand() * 27);
  const hh = 9 + Math.floor(rand() * 2);
  const mm = Math.floor(rand() * 6) * 10;
  return `${year}-${pad(m)}-${pad(d)} ${pad(hh)}:${pad(mm)}`;
}

const E017_NOTES = {
  2094: '2094-01-15　新增地物 S03　海堤加高段。——蔡沛涵',
  2100: '2100-05-30　新增地物 P01–P09　屋頂光電板。——蔡沛涵',
  2117: '2117-02-20　新增地物 H21–H26　住宅（新建）。——方雅文',
  2124: '2124-06-08　地物 B04 附註：外牆壁畫。——方雅文',
};

export const CONFLICTS = {
  B04: {
    id: 'B04',
    kind: 'conflict',
    from: 2088,
    text: `標註衝突　E017-B04
基準版　2073-03-18　頭汕國小
本影像　2088-10-09　頭汕社區活動中心

處理紀錄
第 15 年第 203 日　蔡沛涵
　疑為標註錯誤。暫沿用基準版名稱，已向地球端請求確認。
第 18 年第 20 日　蔡沛涵
　地球端異動紀錄已到，見附件。用途變更屬實。
　依教育委員會第 5 年決議，基準版標註不改。
　已設定定期請求：E-017、E-031 地物異動紀錄與站點紀錄，隨例行資料附送。
第 39 年第 12 日　蔡沛涵
　整理規範第 4 條已修訂。本項留待正式版整理時分段。

附件　地球端地物異動紀錄　E017-B04
2086-07-31　頭汕國小停辦，學生併入北寮國小。
2086-08-01　校舍移交北寮鄉公所，暫停使用。
2087-08-01　啟用為頭汕社區活動中心。升旗台、旗桿保留。`,
  },
  MOUNT: {
    id: 'MOUNT',
    kind: 'mount',
    from: 2111,
    text: `影像比對異常　E-017
2111 年起的影像與先前視角不符。偏移約 3°，機位高度不同。

處理紀錄
第 40 年第 151 日　蔡沛涵
　依地球端站點紀錄，機位已遷移，非影像錯誤。
　比對時改用新機位參數。

附件　E-017 站點紀錄
2109-06-02　北堤延長工程，原燈桿機位拆除。
2109-06-20　新堤頭支架完成。方位依原設定補正。
　　　　　　舊機位影像不重新校正。`,
  },
  T01: {
    id: 'T01',
    kind: 'missing',
    from: 2101,
    text: `地物缺失　E017-T01　水塔
基準版有此地物，2101 年起的影像中找不到。

處理紀錄
第 29 年第 210 日　蔡沛涵
　確認拆除。見附件。

附件　地球端地物異動紀錄　E017-T01
2101-03-15　水塔拆除。自來水改由加壓站供水。`,
  },
};

export function e017Entries({ includeLatest = false } = {}) {
  const out = [];
  const last = includeLatest ? 2133 : 2132;
  for (let y = 2073; y <= last; y++) {
    if (y === 2110) {
      out.push({ site: 'E-017', year: y, empty: true });
      continue;
    }
    const rand = mulberry32(y * 7919 + 17);
    const stamp = E017_FIXED[y] || makeDate(y, rand);
    const [date, time] = stamp.split(' ');
    const month = Number(date.slice(5, 7));
    const te = decimalYear(date);
    const flags = [];
    if (y >= CONFLICTS.B04.from) flags.push('B04');
    if (y >= CONFLICTS.T01.from) flags.push('T01');
    if (y >= CONFLICTS.MOUNT.from) flags.push('MOUNT');
    out.push({
      site: 'E-017',
      year: y,
      date,
      time,
      month,
      season: seasonOf(month),
      weather: y === 2100 ? 'rain' : month === 12 || month <= 2 ? 'monsoon' : 'fair',
      observer: observerE017(y),
      baseline: y === 2073,
      shipYear: y === 2073 ? null : Math.floor(receivedShipYear(te)),
      note: E017_NOTES[y] || null,
      flags: y === 2133 ? [] : flags,
      camera: y >= 2133 ? 'new' : 'old',
      mount: y >= 2111 ? 'new' : 'old',
    });
  }
  return out;
}

// ---- E-031 ----------------------------------------------------------------------------------

function observerE031(y) {
  if (y <= 2095) return '王建志';
  if (y <= 2117) return '林子豪';
  return '陳映彤';
}

export function spoonbills(y) {
  if (y < 2091) return 0;
  const fixed = { 2091: 12, 2099: 34, 2132: 61 };
  if (fixed[y]) return fixed[y];
  const r = mulberry32(y * 31 + 5);
  const trend = 12 + ((y - 2091) / (2132 - 2091)) * 49;
  return Math.max(8, Math.round(trend + (r() - 0.5) * 8));
}

const E031_NOTES = {
  2105: `新增地物 V07　紅樹林小苗
溪口北側泥灘，約 40 株。依 2105-12-11 影像判斷為紅樹林小苗，
疑為海茄苳（本區常見種）。待地球端物種紀錄確認。
——蔡沛涵　第 34 年`,
  2109: `新增地物 V07 附註
地球端物種紀錄確認為海茄苳。地物名稱改為「海茄苳林」。
——蔡沛涵　第 38 年`,
  2119: `新增地物 D02　賞鳥木棧道、觀察屋
——方雅文　第 49 年`,
};

export const DRAFT_W03 = `分段草案　E031-W03
2073–2095　魚塭
2096–　　　魚塭（漁電共生光電板）
依各年影像與地球端異動紀錄判斷。待正式版整理時確認。
——蔡沛涵　第 41 年第 88 日

第 56 年第 140 日　方雅文
　2126 年起光電板拆除、堤防開口，補第三段：潮間帶濕地。`;

export function e031Entries() {
  const out = [];
  const add = (stamp, y) => {
    const [date, time] = stamp.split(' ');
    const month = Number(date.slice(5, 7));
    const te = decimalYear(date);
    const birds = spoonbills(y);
    out.push({
      site: 'E-031',
      year: y,
      date,
      time,
      month,
      season: seasonOf(month),
      weather: 'fair',
      observer: observerE031(y),
      baseline: y === 2073,
      shipYear: y === 2073 ? null : Math.floor(receivedShipYear(te)),
      count: birds,
      note: E031_NOTES[y] || null,
      flags: y >= 2096 ? ['W03'] : [],
      camera: 'old',
      mount: 'old',
    });
  };
  add('2073-01-14 08:10', 2073);
  add('2073-10-28 08:30', 2073);
  for (let y = 2074; y <= 2090; y++) out.push({ site: 'E-031', year: y, empty: true });
  for (let y = 2091; y <= 2132; y++) {
    const r = mulberry32(y * 104729 + 3);
    const winterMonths = [12, 1, 2];
    const m = winterMonths[Math.floor(r() * 3)];
    const yy = m === 12 ? y : y; // the winter image is filed under the year it was taken
    const d = 1 + Math.floor(r() * 27);
    const fixed = { 2091: '2091-12-05 07:40', 2099: '2099-01-22 07:50', 2105: '2105-12-11 07:30', 2112: '2112-02-07 08:00', 2119: '2119-12-19 07:45', 2126: '2126-01-30 08:05' }[y];
    add(fixed || `${yy}-${pad(m)}-${pad(d)} 0${7 + Math.floor(r() * 2)}:${pad(Math.floor(r() * 6) * 10)}`, y);
  }
  return out;
}

// ---- the reception ledger (chapter 5) -------------------------------------------------------
// Monthly packets until ship year 30, then quarterly; the last one is EP-0478.

export function ledger() {
  const rows = [];
  const push = (te, extra = {}) => rows.push({ n: rows.length + 1, te, recv: receivedShipYear(te, 0.02), ...extra });
  // Monthly for the first thirty Earth years (the first packet left eight days after departure),
  // then quarterly. The last one, EP-0478, was sent 2133-07-19 and completed on day 196 of year 63.
  const first = DEPART + 8 / 365;
  for (let k = 0; k < 360; k++) push(first + k / 12);
  const qStart = first + 30;
  const qEnd = decimalYear('2133-04-20');
  for (let k = 0; k < 117; k++) push(qStart + ((qEnd - qStart) * k) / 116);
  rows.push({ n: 478, te: decimalYear('2133-07-19'), recv: 63 + 195.5 / 365, last: true });
  return rows.map((r) => ({ ...r, id: `EP-${String(r.n).padStart(4, '0')}` }));
}

export function formatEarthDate(te) {
  const y = Math.floor(te);
  const doy = (te - y) * 365;
  const months = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  let m = 0;
  let d = doy;
  while (m < 11 && d >= months[m]) {
    d -= months[m];
    m += 1;
  }
  return `${y}-${pad(m + 1)}-${pad(Math.floor(d) + 1)}`;
}

export function formatShipDate(N) {
  const y = Math.floor(N);
  const d = Math.min(365, Math.floor((N - y) * 365) + 1);
  return `第 ${y} 年第 ${d} 日`;
}

// Delay = (Earth date when the ship received it) − (send date), in years and months.
export function formatDelay(row) {
  const earthAtRecv = DEPART + row.recv * DILATION;
  const yrs = Math.max(0, earthAtRecv - row.te);
  let y = Math.floor(yrs);
  let m = Math.round((yrs - y) * 12);
  if (m === 12) {
    y += 1;
    m = 0;
  }
  if (y === 0 && m === 0) return `${Math.max(1, Math.round(yrs * 365))} 日`;
  if (y === 0) return `${m} 個月`;
  return `${y} 年 ${m} 個月`;
}

export const LEDGER_NOTES = {
  24: '巡航開始，改用主天線。',
  361: '自本包起改為每季一包。',
  469: '減速段，點火期間暫停接收。',
};
