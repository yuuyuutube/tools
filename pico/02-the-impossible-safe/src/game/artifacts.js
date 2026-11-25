// The holdings of the Bureau of Unnecessary Protection.
// Each record is official. None of them is valuable.

export const RARITIES = {
  COMMON: {
    zh: '普通',
    en: 'COMMON',
    weight: 50,
    note: '本級別物品於一般家庭抽屜中之出現率約為百分之百。',
  },
  UNCOMMON: {
    zh: '不太普通',
    en: 'UNCOMMON',
    weight: 26,
    note: '本級別物品略微不普通，但不足以引起任何人注意。',
  },
  RARE: {
    zh: '值得懷疑',
    en: 'RARE',
    weight: 14,
    note: '本級別物品之存在本身即值得懷疑。',
  },
  CLASSIFIED: {
    zh: '機密',
    en: 'CLASSIFIED',
    weight: 7,
    note: '本級別之說明文字已列為機密。',
  },
  POINTLESS: {
    zh: '毫無意義',
    en: 'ABSOLUTELY POINTLESS',
    weight: 3,
    note: '本級別為本局最高等級。',
  },
};

export const RARITY_ORDER = ['COMMON', 'UNCOMMON', 'RARE', 'CLASSIFIED', 'POINTLESS'];

// unit: the measure word used when the Bureau counts duplicates.
// visual: a drawing note for the specimen plate (not shown to players).
export const ARTIFACTS = [
  {
    id: 'artifact-001', no: 1, name: '普通馬鈴薯', en: 'ORDINARY POTATO', unit: '顆',
    rarity: 'COMMON', category: '未經加工之物質', securityLevel: 'TOP SECRET',
    condition: '馬鈴薯狀態', conditionEn: 'POTATO',
    description: '已確認仍具有馬鈴薯的所有主要特徵。',
    visual: 'A single lumpy potato, three shallow eyes, one tiny sprout. Treated like a museum masterpiece.',
  },
  {
    id: 'artifact-002', no: 2, name: '半截吸管', en: 'HALF A STRAW', unit: '截',
    rarity: 'COMMON', category: '管狀物', securityLevel: 'SECRET',
    condition: '一半', conditionEn: 'HALF',
    description: '根據推測，原本是一整根。',
    visual: 'A bendy drinking straw cut cleanly in half, red and white stripes, lying diagonally.',
  },
  {
    id: 'artifact-003', no: 3, name: '過期停車券', en: 'EXPIRED PARKING TICKET', unit: '張',
    rarity: 'COMMON', category: '失效票證', securityLevel: 'SECRET',
    condition: '已過期', conditionEn: 'EXPIRED',
    description: '曾經具有停車相關功能。',
    visual: 'A small thermal parking stub, slightly curled, with a punched hole and a faint big P.',
  },
  {
    id: 'artifact-004', no: 4, name: '一顆不明螺絲', en: 'UNIDENTIFIED SCREW', unit: '顆',
    rarity: 'UNCOMMON', category: '來源不明零件', securityLevel: 'TOP SECRET',
    condition: '完整，用途不明', conditionEn: 'INTACT, PURPOSE UNKNOWN',
    description: '本局暫時不敢確認它來自哪裡。',
    visual: 'One steel screw with a cross head, standing at a slight angle, crisp thread lines.',
  },
  {
    id: 'artifact-005', no: 5, name: '左腳襪子', en: 'LEFT SOCK', unit: '隻',
    rarity: 'COMMON', category: '單數織物', securityLevel: 'CONFIDENTIAL',
    condition: '孤身', conditionEn: 'UNPAIRED',
    description: '右腳襪子的下落目前仍不公開。',
    visual: 'A single ribbed sock with two stripes at the cuff, heel visible, pointing left.',
  },
  {
    id: 'artifact-006', no: 6, name: '一小塊橡皮擦', en: 'SMALL PIECE OF ERASER', unit: '塊',
    rarity: 'COMMON', category: '文具殘餘', securityLevel: 'CONFIDENTIAL',
    condition: '已磨損', conditionEn: 'WORN',
    description: '曾經消除過未知數量的錯誤。',
    visual: 'A worn wedge of an eraser with a torn paper sleeve fragment, rounded used corners.',
  },
  {
    id: 'artifact-007', no: 7, name: '空信封', en: 'EMPTY ENVELOPE', unit: '個',
    rarity: 'UNCOMMON', category: '郵務容器', securityLevel: 'TOP SECRET',
    condition: '內容物缺失', conditionEn: 'CONTENTS MISSING',
    description: '內容物的缺失已被完整保存。',
    visual: 'A plain envelope, flap open, a red-and-blue airmail border, visibly nothing inside.',
  },
  {
    id: 'artifact-008', no: 8, name: '扁掉的乒乓球', en: 'FLATTENED PING-PONG BALL', unit: '顆',
    rarity: 'COMMON', category: '前球體', securityLevel: 'SECRET',
    condition: '大致扁平', conditionEn: 'MOSTLY FLAT',
    description: '已失去大部分圓形資格。',
    visual: 'A ping-pong ball with a big dent, the seam line visible, faint brand dots.',
  },
  {
    id: 'artifact-009', no: 9, name: '無主遙控器', en: 'ORPHANED REMOTE CONTROL', unit: '支',
    rarity: 'RARE', category: '孤兒電器', securityLevel: 'TOP SECRET',
    condition: '可按，無回應', conditionEn: 'PRESSABLE, UNANSWERED',
    description: '所屬電器尚未被人類文明尋獲。',
    visual: 'An old chunky remote, rubber buttons in a grid, one red power button, no brand.',
  },
  {
    id: 'artifact-010', no: 10, name: '寫著「不要丟」的紙', en: 'NOTE SAYING DO NOT THROW AWAY', unit: '張',
    rarity: 'UNCOMMON', category: '指示性文件', securityLevel: 'SECRET',
    condition: '遵照指示', conditionEn: 'INSTRUCTIONS FOLLOWED',
    description: '因明確指示，目前仍予以保留。',
    visual: 'A torn scrap of lined paper, folded once, handwritten 不要丟 in pencil, slightly crumpled.',
  },
  {
    id: 'artifact-011', no: 11, name: '普通石頭', en: 'ORDINARY STONE', unit: '顆',
    rarity: 'COMMON', category: '礦物', securityLevel: 'TOP SECRET',
    condition: '石頭狀態', conditionEn: 'STONE',
    description: '經多方鑑定，確認為普通石頭。',
    visual: 'A grey pebble, smooth, slightly flat, a faint pale band across it.',
  },
  {
    id: 'artifact-012', no: 12, name: '一張空白證書', en: 'BLANK CERTIFICATE', unit: '張',
    rarity: 'RARE', category: '官方文件', securityLevel: 'TOP SECRET',
    condition: '尚未證明任何事', conditionEn: 'NOTHING CERTIFIED',
    description: '用以證明尚未有任何值得證明的事。',
    visual: 'A formal certificate with an ornate border, a red seal ribbon, and a perfectly blank centre.',
  },
  {
    id: 'artifact-013', no: 13, name: '微型保險箱', en: 'MINIATURE SAFE', unit: '座',
    rarity: 'CLASSIFIED', category: '受保護之保護設備', securityLevel: 'EYES ONLY',
    condition: '上鎖中', conditionEn: 'LOCKED',
    description: '本身亦為受保護資產。',
    visual: 'A tiny cube safe on four stubby feet, dark green, a minuscule dial and handle, very proud.',
  },
  {
    id: 'artifact-014', no: 14, name: '昨天的空氣', en: "YESTERDAY'S AIR", unit: '罐',
    rarity: 'CLASSIFIED', category: '氣體（過去式）', securityLevel: 'EYES ONLY',
    condition: '密封，日期已過', conditionEn: 'SEALED, DATED',
    description: '保存期限不明。',
    visual: 'A glass jar with a screw lid and a paper label with a date; inside: nothing, just a faint reflection.',
  },
  {
    id: 'artifact-015', no: 15, name: '兩公分的星期二', en: 'TWO CENTIMETRES OF TUESDAY', unit: '段',
    rarity: 'POINTLESS', category: '時間（片段）', securityLevel: 'BEYOND CLASSIFICATION',
    condition: '無法測量', conditionEn: 'UNMEASURABLE',
    description: '本局尚未建立相應的測量標準。',
    visual: 'A narrow 2cm strip cut from a tear-off calendar page showing part of 二 / TUE, next to a tiny ruler.',
  },
  {
    id: 'artifact-016', no: 16, name: '拉直的迴紋針', en: 'STRAIGHTENED PAPER CLIP', unit: '根',
    rarity: 'COMMON', category: '前迴紋針', securityLevel: 'CONFIDENTIAL',
    condition: '職涯轉換中', conditionEn: 'CAREER IN TRANSITION',
    description: '目前正處於職涯轉換期。',
    visual: 'A paper clip almost fully straightened, one small loop left, silver wire with highlight.',
  },
  {
    id: 'artifact-017', no: 17, name: '沒水的原子筆', en: 'DRIED-OUT BALLPOINT PEN', unit: '支',
    rarity: 'COMMON', category: '書寫工具（退休）', securityLevel: 'CONFIDENTIAL',
    condition: '無墨', conditionEn: 'INKLESS',
    description: '最後寫下的一句話不詳。',
    visual: 'A cheap clear-barrel ballpoint pen with a blue cap, the ink tube visibly empty, a chewed end.',
  },
  {
    id: 'artifact-018', no: 18, name: '一顆鈕扣', en: 'ONE BUTTON', unit: '顆',
    rarity: 'COMMON', category: '衣物附件', securityLevel: 'SECRET',
    condition: '單獨行動', conditionEn: 'OPERATING ALONE',
    description: '所屬衣物已另案處理。',
    visual: 'A four-hole coat button with a short dangling thread end.',
  },
  {
    id: 'artifact-019', no: 19, name: '一條橡皮筋', en: 'ONE RUBBER BAND', unit: '條',
    rarity: 'COMMON', category: '彈性物', securityLevel: 'CONFIDENTIAL',
    condition: '彈性尚存', conditionEn: 'STILL ELASTIC',
    description: '彈性尚存，態度保留。',
    visual: 'A loose tan rubber band lying in a lazy figure, one twist in it.',
  },
  {
    id: 'artifact-020', no: 20, name: '蘋果核', en: 'APPLE CORE', unit: '個',
    rarity: 'UNCOMMON', category: '已完成任務之水果', securityLevel: 'SECRET',
    condition: '已食用', conditionEn: 'CONSUMED',
    description: '已完成其作為蘋果的主要職責。',
    visual: 'An eaten apple core with a stem and one leaf, two seeds showing, browned flesh edges.',
  },
  {
    id: 'artifact-021', no: 21, name: '用途不明的備用鑰匙', en: 'SPARE KEY, PURPOSE UNKNOWN', unit: '把',
    rarity: 'RARE', category: '開啟工具', securityLevel: 'TOP SECRET',
    condition: '可開啟未知物', conditionEn: 'OPENS SOMETHING',
    description: '本局已試過所有的門。',
    visual: 'A brass key with an old-fashioned bow and a paper tag on a string with a question mark.',
  },
  {
    id: 'artifact-022', no: 22, name: '一枚瓶蓋', en: 'ONE BOTTLE CAP', unit: '枚',
    rarity: 'COMMON', category: '容器零件', securityLevel: 'CONFIDENTIAL',
    condition: '瓶子已離職', conditionEn: 'BOTTLE RESIGNED',
    description: '原屬瓶子已不在本局服務範圍內。',
    visual: 'A crown bottle cap, crimped edge, slightly bent, seen at three-quarter angle.',
  },
  {
    id: 'artifact-023', no: 23, name: '字跡消失的收據', en: 'FADED RECEIPT', unit: '張',
    rarity: 'UNCOMMON', category: '熱感應紙', securityLevel: 'SECRET',
    condition: '內容已蒸發', conditionEn: 'CONTENTS EVAPORATED',
    description: '金額已隨時間自動結清。',
    visual: 'A long curling thermal receipt with a torn zigzag edge, only faint ghost lines remain.',
  },
  {
    id: 'artifact-024', no: 24, name: '一根牙籤', en: 'ONE TOOTHPICK', unit: '根',
    rarity: 'COMMON', category: '木質細棒', securityLevel: 'CONFIDENTIAL',
    condition: '尖端完好', conditionEn: 'POINT INTACT',
    description: '單獨使用時威脅性極低。',
    visual: 'A single wooden toothpick laid diagonally, both ends pointed, wood grain lines.',
  },
  {
    id: 'artifact-025', no: 25, name: '麵包袋夾', en: 'BREAD BAG CLIP', unit: '個',
    rarity: 'UNCOMMON', category: '封口裝置', securityLevel: 'SECRET',
    condition: '已與麵包失聯', conditionEn: 'OUT OF CONTACT WITH BREAD',
    description: '目前已與麵包失去聯繫。',
    visual: 'A small square plastic bread clip in pale blue, with its keyhole-shaped notch and a printed date.',
  },
  {
    id: 'artifact-026', no: 26, name: '空白的幸運籤', en: 'BLANK FORTUNE SLIP', unit: '張',
    rarity: 'RARE', category: '預言', securityLevel: 'TOP SECRET',
    condition: '預言內容為無', conditionEn: 'PROPHECY: NONE',
    description: '預言內容為無。目前準確率為百分之百。',
    visual: 'A broken fortune cookie with a thin paper slip sticking out that is completely blank.',
  },
  {
    id: 'artifact-027', no: 27, name: '一份退休感言', en: 'ONE RETIREMENT SPEECH', unit: '份',
    rarity: 'RARE', category: '演講稿', securityLevel: 'SECRET',
    condition: '全文共一字', conditionEn: 'ONE WORD LONG',
    description: '全文共一字：「好。」',
    visual: 'A folded sheet of formal letter paper, opened, with a single character 好 written in the middle.',
  },
  {
    id: 'artifact-028', no: 28, name: '沒電的電池', en: 'DEAD BATTERY', unit: '顆',
    rarity: 'COMMON', category: '能量容器（空）', securityLevel: 'CONFIDENTIAL',
    condition: '仍標示 1.5V', conditionEn: 'STILL CLAIMS 1.5V',
    description: '外殼仍堅持標示為 1.5V。',
    visual: 'An AA battery lying on its side, copper and black wrap, 1.5V printed, a tiny dent.',
  },
  {
    id: 'artifact-029', no: 29, name: '刻錯的印章', en: 'MISCARVED SEAL', unit: '枚',
    rarity: 'UNCOMMON', category: '官方印章（瑕疵）', securityLevel: 'TOP SECRET',
    condition: '印文有誤', conditionEn: 'INSCRIPTION INCORRECT',
    description: '印文為「無用物品保護扃」。',
    visual: 'A wooden-handled rubber stamp standing upright beside its red square impression, one character visibly wrong.',
  },
  {
    id: 'artifact-030', no: 30, name: '一片落葉', en: 'ONE FALLEN LEAF', unit: '片',
    rarity: 'COMMON', category: '植物檔案', securityLevel: 'CONFIDENTIAL',
    condition: '已退出樹木組織', conditionEn: 'RESIGNED FROM TREE',
    description: '已正式退出樹木組織。',
    visual: 'A single dry maple-like leaf, ochre and rust, curled edge, a small hole.',
  },
  {
    id: 'artifact-031', no: 31, name: '一粒米', en: 'ONE GRAIN OF RICE', unit: '粒',
    rarity: 'COMMON', category: '穀物', securityLevel: 'SECRET',
    condition: '數量已核對', conditionEn: 'COUNT VERIFIED',
    description: '數量已三度核對，確認無誤。',
    visual: 'One grain of rice, absurdly alone on a tiny white specimen card with tweezers resting beside it.',
  },
  {
    id: 'artifact-032', no: 32, name: '一罐沉默', en: 'A JAR OF SILENCE', unit: '罐',
    rarity: 'POINTLESS', category: '聲音（缺席）', securityLevel: 'BEYOND CLASSIFICATION',
    condition: '約三秒', conditionEn: 'APPROX. THREE SECONDS',
    description: '開封時請勿出聲。',
    visual: 'A small tin can with a sealed lid and a label printed with a flat horizontal line like a silent waveform.',
  },
];

export const ARTIFACT_BY_ID = Object.fromEntries(ARTIFACTS.map((a) => [a.id, a]));

export function accessionNo(artifact) {
  return String(artifact.no).padStart(6, '0');
}

const CN_DIGITS = ['零', '一', '兩', '三', '四', '五', '六', '七', '八', '九', '十'];

export function cnCount(n) {
  if (n <= 10) return CN_DIGITS[n];
  if (n < 20) return '十' + CN_DIGITS[n - 10].replace('兩', '二');
  if (n < 100) {
    const tens = Math.floor(n / 10);
    const ones = n % 10;
    return (tens === 2 ? '二' : CN_DIGITS[tens]) + '十' + (ones ? CN_DIGITS[ones].replace('兩', '二') : '');
  }
  return String(n);
}

// The Bureau's response to receiving the same thing again.
export function duplicateLines(artifact, count) {
  const qty = `${cnCount(count)}${artifact.unit}${artifact.name.replace(/^一(顆|張|根|條|片|粒|罐|份|枚|個|支|把|段|隻|塊|截)/, '')}`;
  const lines = [
    [`本局現已保管${qty}。`, '安全風險評估維持不變。'],
    [`本局現已保管${qty}。`, '倉儲部門已就此事召開會議，會議無結論。'],
    [`本局現已保管${qty}。`, '各件之間無法分辨，已分別建檔。'],
    [`本局現已保管${qty}。`, '經比對，新入庫者與先前入庫者具有相同程度的無關緊要。'],
    [`本局現已保管${qty}。`, '已追加一張同樣認真的鑑定書。'],
  ];
  return lines[(count - 2) % lines.length];
}
