/* Data Normalizer：把農業部原始欄位清理成精簡、可信任的物件。
   所有文字都當成不可信輸入：去掉標籤與控制字元，之後一律用 textContent 輸出。 */
export const COUNTY = {
  2: '臺北市', 3: '新北市', 4: '基隆市', 5: '宜蘭縣', 6: '桃園市', 7: '新竹縣', 8: '新竹市', 9: '苗栗縣',
  10: '臺中市', 11: '彰化縣', 12: '南投縣', 13: '雲林縣', 14: '嘉義縣', 15: '嘉義市', 16: '臺南市', 17: '高雄市',
  18: '屏東縣', 19: '花蓮縣', 20: '臺東縣', 21: '澎湖縣', 22: '金門縣', 23: '連江縣',
};

export function clean(s) {
  return String(s ?? '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/[\u0000-\u001f\u007f​-‏‪-‮]/g, ' ')
    .replace(/\s+/g, ' ')
    .replace(/([㐀-鿿，。、；：])\s+(?=[㐀-鿿，。、；：])/g, '$1')   // 官方備註常在中文字之間夾空白
    .trim();
}

export function cleanDate(s) {
  const m = /^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/.exec(clean(s));
  return m ? `${m[1]}-${m[2].padStart(2, '0')}-${m[3].padStart(2, '0')}` : '';
}

/* 只接受 https 的 .gov.tw 圖片；其餘一律視為沒有照片 */
export function photoUrl(s) {
  try {
    const u = new URL(clean(s));
    if (u.protocol !== 'https:' || !/(^|\.)gov\.tw$/.test(u.hostname)) return '';
    return u.href;
  } catch { return ''; }
}

const pickOf = (v, map) => map[clean(v).toUpperCase()] || '';

export function normalize(r) {
  if (!r || typeof r !== 'object') return null;
  const id = Number(r.animal_id);
  if (!Number.isInteger(id) || id <= 0) return null;
  const kindRaw = clean(r.animal_kind);
  const area = Number(r.animal_area_pkid) || 0;
  const shelter = clean(r.shelter_name) || clean(r.animal_place);
  return {
    id,
    sub: clean(r.animal_subid),
    area,
    county: COUNTY[area] || (/^(.{2}[市縣])/.exec(shelter) || [])[1] || '',
    sid: Number(r.animal_shelter_pkid) || 0,
    shelter,
    kind: kindRaw === '狗' ? 'dog' : kindRaw === '貓' ? 'cat' : 'other',
    variety: clean(r.animal_Variety),
    sex: pickOf(r.animal_sex, { M: 'M', F: 'F' }),
    body: pickOf(r.animal_bodytype, { SMALL: 'S', MEDIUM: 'M', BIG: 'L' }),
    colour: clean(r.animal_colour),
    age: pickOf(r.animal_age, { CHILD: 'child', ADULT: 'adult' }),
    ster: pickOf(r.animal_sterilization, { T: 'T', F: 'F' }),
    found: clean(r.animal_foundplace),
    remark: clean(r.animal_remark).slice(0, 600),
    status: clean(r.animal_status).toUpperCase(),
    open: cleanDate(r.animal_opendate),
    closed: cleanDate(r.animal_closeddate),
    update: cleanDate(r.animal_update) || cleanDate(r.cDate),
    photo: photoUrl(r.album_file),
    addr: clean(r.shelter_address),
    tel: clean(r.shelter_tel).replace(/[^\d\-#()+ 轉分機、,]/g, ''),
  };
}

export function normalizeAll(rows) {
  const seen = new Set(), out = [];
  for (const r of rows || []) {
    const a = normalize(r);
    if (a && !seen.has(a.id)) { seen.add(a.id); out.push(a); }
  }
  return out;
}

/* 快照用：收容所資訊抽出來只存一份 */
const SHELTER_KEYS = ['shelter', 'addr', 'tel', 'area', 'county'];
export function pack(list) {
  const shelters = {};
  const animals = list.map(a => {
    const key = a.sid || a.shelter;
    if (!shelters[key]) shelters[key] = Object.fromEntries(SHELTER_KEYS.map(k => [k, a[k]]));
    const o = { ...a, sk: key };
    for (const k of SHELTER_KEYS) delete o[k];
    for (const k of Object.keys(o)) if (o[k] === '') delete o[k];
    return o;
  });
  return { shelters, animals };
}
const BLANK = { sub: '', variety: '', sex: '', body: '', colour: '', age: '', ster: '', found: '', remark: '', status: '', open: '', closed: '', update: '', photo: '' };
export function unpack(p) {
  return (p?.animals || []).map(o => {
    const { sk, ...rest } = o;
    return { ...BLANK, ...rest, ...(p.shelters?.[sk] || { shelter: '', addr: '', tel: '', area: 0, county: '' }) };
  });
}
