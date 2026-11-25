// The main line: hand-written work orders of the Bureau of Unnecessary Protection.
// Every lock spec here is checked by tests/missions.test.js: the documented clues must
// produce exactly the combination, and the combination must open the lock.

import { p, note, proc, step, redact, mark, table, memo } from './doc.js';

export const ACTS = {
  1: { code: 'ACT 1', title: 'TRAINEE', zh: '見習保險庫管理員' },
  2: { code: 'ACT 2', title: 'SPECIALIST', zh: '正式保險庫管理員' },
  3: { code: 'ACT 3', title: 'CLASSIFIED', zh: '異常保險箱管理部門' },
};

const RULE_R = '<b>R</b> 向右（順時針）旋轉，讀數增加；<b>L</b> 向左（逆時針）旋轉，讀數減少。字母後的數字為至少須完成的整圈數，「·」後為最後停留的刻度。';

const GATE_RULE =
  '本局所有正式保險箱均裝有「閘口共鳴機構」。當轉盤<b>朝該階段的方向</b>、<b>以適當速度</b>經過<b>該階段的正確刻度</b>時，箱內會發出一聲空心的「咚」，共鳴計指針同步擺動，指標燈亮起。同一刻度、同一方向，永遠得到同一反應。轉得太快時，機構不會作動。';

const S = (dir, turns, target, gate = null) => ({ dir, turns, target, gate });

export const MISSIONS = [
  // ---------------------------------------------------------------- ACT 1 · TRAINEE
  {
    id: 'M001', number: '001', act: 1, kind: 'tutorial', look: 'standard', artifact: 'artifact-001',
    title: '標準作業程序 第一號',
    guide: { target: true, turns: true, dir: true, marker: true },
    lock: () => ({ stages: [S(1, 1, 30), S(-1, 0, 70)] }),
    brief: () => [
      p('歡迎加入本局。以下為閣下的第一份正式工作。'),
      p('第 001 號保險箱內存放之物品，已連續四十一年未被任何人要求查看。本局認為，這正是需要加強保護的證明。'),
      p('請依本局標準程序（BSP-3）操作轉盤。' + RULE_R),
      proc([step(1, 1, 30), step(-1, 0, 70)], { caption: '本案程序' }),
      p('也就是：向右轉至少一整圈，停在 30，按下確認；再向左轉，停在 70，按下確認。每完成一個階段，門上的指示燈會亮起一盞。全部亮起後，再按一次以拉動把手。'),
      note('本局允許閣下犯錯。保險箱不允許，但本局允許。'),
    ].join(''),
    success: ['表現優良。', '這顆馬鈴薯的安全，從今天開始由你負責。'],
  },
  {
    id: 'M002', number: '002', act: 1, kind: 'tutorial', look: 'standard', artifact: 'artifact-002',
    title: '三段式程序',
    guide: { target: true, turns: true, dir: true, marker: true },
    lock: () => ({ stages: [S(1, 2, 15), S(-1, 1, 60), S(1, 0, 35)] }),
    brief: () => [
      p('本局大部分保險箱採用三段式程序。三段，代表三倍的安全，以及三倍的手續。'),
      proc([step(1, 2, 15), step(-1, 1, 60), step(1, 0, 35)], { caption: '本案程序' }),
      p('轉過頭時，請小幅倒轉修正即可。本保險箱採<b>寬鬆行程制</b>：已完成的圈數，不會因為倒轉幾格而遺失。'),
      p('畫面上的「行程」顯示本階段朝正確方向累積的轉動量。每滿一百格，即完成一圈。'),
      note('據前任管理員回報，本保險箱內物品「長度不足以構成威脅」。'),
    ].join(''),
    success: ['確認。', '該吸管目前長度維持不變。'],
  },
  {
    id: 'M003', number: '003', act: 1, kind: 'tutorial', look: 'antique', artifact: 'artifact-003',
    title: '嚴格行程制',
    guide: { target: true, turns: true, dir: true, marker: true },
    lock: () => ({ strict: true, tolerance: 3, stages: [S(-1, 2, 88), S(1, 1, 12), S(-1, 0, 47)] }),
    brief: () => [
      p('第 003 號保險箱為 1911 年製之古董型號，對旋轉歷程極為講究。'),
      proc([step(-1, 2, 88), step(1, 1, 12), step(-1, 0, 47)], { caption: '本案程序' }),
      p('本保險箱採<b>嚴格行程制</b>：任一階段中，若朝反方向轉動<b>超過 3 格</b>，該階段的行程與圈數將歸零重計。三格以內的修正仍被允許。'),
      p('另外：<b>長按</b>旋鈕（或按 Esc）可開啟輔助選單，內有重新開始、重閱文件與視覺輔助等功能。'),
      note('本局提醒：古董並不代表裡面的東西也是古董。'),
    ].join(''),
    success: ['見習期滿。', '自即日起，閣下得以處理不附完整答案的保險箱。本局另開放「日常委託」。'],
  },

  // ---------------------------------------------------------------- ACT 2 · SPECIALIST
  {
    id: 'M004', number: '004', act: 2, kind: 'mechanical', look: 'standard', artifact: 'artifact-004',
    title: '遮蔽備忘錄',
    guide: { target: false, turns: true, dir: true },
    lock: () => ({ resetOnError: true, stages: [S(1, 2, 48), S(-1, 1, 40), S(1, 0, 24)] }),
    puzzle: { kind: 'redacted', known: 40, sum: 112, ratio: 2 },
    brief: () => [
      p('自本案起，本局不再提供完整密碼。正式管理員應能從文件中推得所需資訊。'),
      p('注意：本級別保險箱在<b>確認錯誤時，會將全部階段重設</b>。'),
      memo('內部備忘錄 第 77-A 號', [
        p('第 004 號保險箱之程序如下，部分內容依規定遮蔽：'),
        proc([step(1, 2, redact()), step(-1, 1, 40), step(1, 0, redact())]),
      ].join(''), { sign: '資訊安全科' }),
      memo('稽核附註', [
        p('經稽核：三個數字之總和為 <b>112</b>。'),
        p('第一個數字恰為第三個數字的<b>兩倍</b>。'),
        note('稽核科認為以上附註並未洩漏任何資訊。'),
      ].join(''), { cls: 'tilt' }),
    ].join(''),
    success: ['正確。', '資訊安全科已檢討備忘錄遮蔽作業，結論為：已經遮蔽了。'],
  },
  {
    id: 'M005', number: '005', act: 2, kind: 'mechanical', look: 'standard', artifact: 'artifact-005',
    title: '故障的打字機',
    guide: { target: false, turns: true, dir: true },
    lock: () => ({ resetOnError: true, stages: [S(1, 3, 47), S(-1, 2, 92), S(1, 1, 60)] }),
    puzzle: { kind: 'typewriter', typed: [58, 3, 71], shift: 1 },
    brief: () => [
      p('以下程序由本局第三打字室繕打。'),
      memo('繕打本', proc([step(1, 3, 58), step(-1, 2, 3), step(1, 1, 71)]), { cls: 'typed' }),
      p('第三打字室之打字機自 1988 年起發生故障：<b>每一個數字鍵都會打出比按下的數字大 1 的數字</b>，9 則會打成 0。'),
      p('方向字母與圈數使用另一排按鍵，已於 1991 年修復，不受影響。'),
      note('報修單仍在審核中。'),
    ].join(''),
    success: ['正確。', '第三打字室已收到感謝函一封，函中所有數字皆大了 1。'],
  },
  {
    id: 'M006', number: '006', act: 2, kind: 'mechanical', look: 'vault', artifact: 'artifact-006',
    title: '前任管理員的交接日誌',
    guide: { target: false, turns: true, dir: true },
    lock: () => ({ resetOnError: true, stages: [S(1, 3, 26), S(-1, 2, 85), S(1, 1, 15)] }),
    puzzle: { kind: 'log', start: 0, moves: [[1, 3, 26], [-1, 2, 41], [1, 1, 30]] },
    brief: () => [
      p('前任管理員離職前留下一份交接日誌。他沒有記下任何數字，只記下了自己的動作。'),
      memo('交接日誌（手寫）', [
        p('先把轉盤<b>向右</b>轉回 <b>00</b>。'),
        p('向右轉 3 圈，再多轉 26 格。按確認。'),
        p('向左轉 2 圈，再多轉 41 格。按確認。'),
        p('向右轉 1 圈，再多轉 30 格。按確認。'),
        p('拉把手。就這樣。'),
      ].join(''), { cls: 'hand', sign: '前任管理員　（已調任 B4 停車場）' }),
      p('提示：向右轉讀數增加，向左轉讀數減少，跨過 00 時接續 99。可以先算，也可以照做。'),
    ].join(''),
    success: ['正確。', '本局已將該日誌歸檔為「可能是本局最清楚的文件」。'],
  },
  {
    id: 'M007', number: '007', act: 2, kind: 'mechanical', look: 'lab', artifact: 'artifact-007',
    title: '庫存清點表',
    guide: { target: false, turns: true, dir: true },
    lock: () => ({ resetOnError: true, stages: [S(-1, 3, 64), S(1, 2, 19), S(-1, 0, 77)] }),
    puzzle: { kind: 'inventory' },
    brief: () => [
      p('第 007 號保險箱之密碼，依慣例記載於年度庫存清點表中。'),
      p('請依由上而下的順序，取出蓋有「' + mark('密') + '」字章之品項數量。'),
      proc([step(-1, 3, '①'), step(1, 2, '②'), step(-1, 0, '③')], { caption: '本案程序' }),
      table([
        ['品項', '單位', '數量', ''],
        ['迴紋針', '盒', '12', ''],
        ['鉛筆', '支', '64', mark('密')],
        ['橡皮筋', '條', '230', ''],
        ['便條紙', '本', '08', ''],
        ['訂書針', '排', '19', mark('密')],
        ['印泥', '盒', '03', ''],
        ['紙箱', '個', '77', mark('密')],
        ['迴紋針（另一盒）', '盒', '41', ''],
      ], { cls: 'inv' }),
      note('清點人：總務科。複核人：總務科。複核之複核人：同上。'),
    ].join(''),
    success: ['正確。', '總務科表示，下次會把「密」字章蓋得更不明顯一點。'],
  },
  {
    id: 'M008', number: '008', act: 2, kind: 'mechanical', look: 'standard', artifact: 'artifact-008',
    title: '三聯單',
    guide: { target: false, turns: true, dir: true },
    lock: () => ({ resetOnError: true, stages: [S(1, 1, 33), S(-1, 2, 18), S(1, 0, 29)] }),
    puzzle: {
      kind: 'carbon',
      copies: {
        white: [[1, 2, 33], [-1, 1, 71], [1, 0, 5]],
        pink: [[-1, 3, 90], [1, 2, 18], [-1, 0, 62]],
        yellow: [[1, 1, 47], [-1, 2, 56], [1, 0, 29]],
      },
    },
    brief: () => {
      const c = MISSIONS.find((m) => m.id === 'M008').puzzle.copies;
      const line = (rows) => proc(rows.map(([d, t, n]) => step(d, t, n)));
      return [
        p('第 7-B 號申請表一式三聯，分別由三個部門填寫。三聯內容不一致，這是正常的。'),
        memo('第一聯（白）', line(c.white), { cls: 'carbon white' }),
        memo('第二聯（粉紅）', line(c.pink), { cls: 'carbon pink' }),
        memo('第三聯（黃）', line(c.yellow), { cls: 'carbon yellow' }),
        p('依本局表單規則第 12 條：白聯僅<b>第一個數字</b>有效，粉紅聯僅<b>第二個數字</b>有效，黃聯僅<b>第三個數字</b>有效。<b>方向與圈數一律以黃聯為準。</b>'),
        note('本規則之制定目的，為確保每一聯都有存在意義。'),
      ].join('');
    },
    success: ['正確。', '三個部門均認為自己填對了。本局同意。'],
  },
  {
    id: 'M009', number: '009', act: 2, kind: 'sensory', look: 'standard', artifact: 'artifact-009',
    title: '聆聽入門',
    guide: { target: false, turns: true, dir: true },
    meter: true,
    lock: () => ({ resetOnError: true, stages: [S(1, 1, 63, { tone: 'mid' }), S(-1, 0, 50)] }),
    brief: () => [
      p('自本案起，閣下將學習聆聽機器。'),
      p(GATE_RULE),
      p('建議做法：朝指定方向<b>慢慢</b>轉一整圈，留意哪一格發出不同的聲音（或讓共鳴計擺動）。記住它，然後完成程序要求的圈數，停在那裡。'),
      proc([step(1, 1, '??'), step(-1, 0, 50)], { caption: '本案程序' }),
      note('靜音環境下，請觀察共鳴計與指標燈。設定中可開啟「視覺線索輔助」，記錄紙將標出共鳴發生的刻度。'),
    ].join(''),
    success: ['正確。', '閣下已聽見機器說話。本局建議不要回答它。'],
  },
  {
    id: 'M010', number: '010', act: 2, kind: 'sensory', look: 'standard', artifact: 'artifact-010',
    title: '三個閘口',
    guide: { target: false, turns: true, dir: true },
    meter: true,
    lock: () => ({
      resetOnError: true,
      stages: [S(1, 2, 18, { tone: 'mid' }), S(-1, 1, 74, { tone: 'mid' }), S(1, 0, 41, { tone: 'mid' })],
    }),
    brief: () => [
      p('本保險箱三個階段的刻度皆未記錄。'),
      p('每個閘口<b>只在所屬階段、所屬方向</b>作動。完成第一階段後，第一個閘口即沉默，第二個閘口開始說話。'),
      proc([step(1, 2, '??'), step(-1, 1, '??'), step(1, 0, '??')], { caption: '本案程序' }),
      note('如果它一直不說話，請檢查自己是不是轉錯了方向，或者轉得太快了。'),
    ].join(''),
    success: ['正確。', '依指示，該紙張繼續予以保留。'],
  },
  {
    id: 'M011', number: '011', act: 2, kind: 'sensory', look: 'vault', artifact: 'artifact-011',
    title: '預響',
    guide: { target: false, turns: true, dir: true },
    meter: true,
    lock: () => ({
      resetOnError: true, strict: true, tolerance: 3,
      stages: [
        S(1, 2, 57, { tone: 'mid', proximity: true }),
        S(-1, 1, 9, { tone: 'mid', proximity: true }),
        S(1, 0, 83, { tone: 'mid', proximity: true }),
      ],
    }),
    brief: () => [
      p('圓形金庫 R-7 的共鳴機構較為敏感：正確刻度<b>前後三格內</b>，會先出現逐漸增強的<b>預響</b>。最響、最空心的那一格才是閘口。'),
      p('本金庫同時採<b>嚴格行程制</b>（反轉超過 3 格，行程歸零）。建議先找到閘口，再一口氣完成圈數。'),
      proc([step(1, 2, '??'), step(-1, 1, '??'), step(1, 0, '??')], { caption: '本案程序' }),
      note('預響不是閘口。閘口也不是預響。本局對此已有共識。'),
    ].join(''),
    success: ['正確。', '經多方鑑定，閣下已能分辨預響與閘口。另確認箱內為普通石頭。'],
  },
  {
    id: 'M012', number: '012', act: 2, kind: 'sensory', look: 'lab', artifact: 'artifact-012',
    title: '死點',
    guide: { target: false, turns: true, dir: true },
    meter: true,
    lock: () => ({
      resetOnError: true,
      stages: [
        S(-1, 2, 36, { tone: 'mid', rhythm: true }),
        S(1, 1, 92, { tone: 'mid', rhythm: true }),
        S(-1, 0, 15, { tone: 'mid', rhythm: true }),
      ],
    }),
    brief: () => [
      p('實驗室防護型 L-2 的共鳴機構安裝有誤（已列入下一年度改善計畫）：'),
      p('正確刻度<b>前後各四格</b>，每一格的喀噠聲都會變成<b>雙響</b>；而<b>正確刻度本身完全無聲</b>。'),
      p('換句話說：找到一段雙響，中間那個什麼聲音都沒有的位置，就是答案。共鳴計會在雙響區小幅擺動，在死點向下沉。'),
      proc([step(-1, 2, '??'), step(1, 1, '??'), step(-1, 0, '??')], { caption: '本案程序' }),
      note('本局技術科表示：「沒有聲音，也是一種聲音。」技術科已被要求停止這樣說話。'),
    ].join(''),
    success: ['正確。', '本證書證明：箱內證書未證明任何事。'],
  },
  {
    id: 'M013', number: '013', act: 2, kind: 'sensory', look: 'standard', artifact: 'artifact-021',
    title: '雙音色',
    guide: { target: false, turns: true, dir: true },
    meter: true,
    lock: () => ({
      resetOnError: true,
      stages: [
        S(1, 2, 22, { tone: 'low', decoys: [{ number: 68, tone: 'high' }] }),
        S(-1, 1, 47, { tone: 'high', decoys: [{ number: 85, tone: 'low' }] }),
        S(1, 0, 7),
      ],
    }),
    brief: () => [
      p('第 013 號保險箱裝有兩組共鳴機構，一組低音，一組高音。其中一組是本局訓練科加裝的<b>干擾機構</b>。'),
      p('第一階段請追隨<b>低音</b>；第二階段請追隨<b>高音</b>。另一種音色請不要理會。指標燈與共鳴計也會以不同顏色區分：低音為藍，高音為紅。'),
      proc([step(1, 2, '??'), step(-1, 1, '??'), step(1, 0, 7)], { caption: '本案程序' }),
      note('訓練科表示，干擾機構「本身沒有惡意」。'),
    ].join(''),
    success: ['正確。', '正式管理員訓練完成。閣下已獲准接觸異常保險箱。請不要和它們建立私人感情。'],
  },

  // ---------------------------------------------------------------- ACT 3 · CLASSIFIED
  {
    id: 'M014', number: '014', act: 3, kind: 'special', look: 'antique', artifact: 'artifact-014',
    title: '害羞的保險箱', persona: 'shy',
    guide: { target: false, turns: true, dir: true },
    meter: true,
    lock: () => ({
      resetOnError: true,
      shy: { limit: 7, withdrawMs: 3000 },
      stages: [
        S(1, 1, 28, { tone: 'mid', proximity: true }),
        S(-1, 1, 71, { tone: 'mid', proximity: true }),
        S(1, 0, 52, { tone: 'mid', proximity: true }),
      ],
    }),
    brief: () => [
      memo('行為觀察紀錄 第 14 號', [
        p('本保險箱於受到快速操作時，會<b>停止提供任何線索約三秒</b>（共鳴計上的「退縮」指示會亮起）。'),
        p('操作速度請保持在<b>每秒七格以下</b>。它在慢慢被轉動時，會發出預響與閘口共鳴，與 R-7 金庫相同。'),
        p('目前沒有證據顯示它討厭閣下。'),
      ].join(''), { sign: '異常保險箱管理部門' }),
      proc([step(1, 1, '??'), step(-1, 1, '??'), step(1, 0, '??')], { caption: '本案程序' }),
    ].join(''),
    success: ['正確。', '它似乎對閣下有一點點信任了。本局不建議回應這份信任。'],
  },
  {
    id: 'M015', number: '015', act: 3, kind: 'special', look: 'lab', artifact: 'artifact-016',
    title: '急性子的保險箱', persona: 'impatient',
    guide: { target: true, turns: true, dir: true },
    lock: () => ({
      patience: { drain: 0.24, brisk: 14, refill: 0.03 },
      stages: [S(1, 3, 64), S(-1, 2, 19), S(1, 1, 80)],
    }),
    brief: () => [
      memo('行為觀察紀錄 第 15 號', [
        p('本保險箱無法忍受等待。門上的<b>耐心計</b>會在閣下慢下來或停下來時逐漸下降，歸零時，<b>當前階段的行程將被清除</b>。'),
        p('<b>快速旋轉</b>可以讓它重新滿意。對準刻度後，請立即確認。每完成一個階段，耐心會恢復。'),
        p('密碼本身並不是秘密。它只是很急。'),
      ].join(''), { sign: '異常保險箱管理部門' }),
      proc([step(1, 3, 64), step(-1, 2, 19), step(1, 1, 80)], { caption: '本案程序' }),
      note('建議：一口氣轉完圈數，最後幾格放慢對準，然後馬上按。'),
    ].join(''),
    success: ['正確。', '它已經開始催促下一位管理員了。'],
  },
  {
    id: 'M016', number: '016', act: 3, kind: 'special', look: 'vault', artifact: 'artifact-023',
    title: '健忘的保險箱', persona: 'forgetful',
    guide: { target: false, turns: true, dir: true },
    lock: () => ({ resetOnError: true, stages: [S(1, 2, 44), S(-1, 1, 22), S(1, 0, 16)] }),
    puzzle: { kind: 'forgetful', first: 38, plus: 6 },
    brief: () => [
      p('本保險箱堅持自行保管自己的密碼，並留下以下便條。本局逐字轉錄如下：'),
      memo('便條（貼在自己門上）', [
        p('我的密碼，我自己寫的，應該沒錯：'),
        p('<s>第一個：左邊，轉三圈……</s> 不對，那是上星期的。'),
        p('第一個：右邊，轉兩圈，停在 <b>38</b>。不對，比這個再多 <b>6</b>。'),
        p('第二個：左邊，轉一圈，停在<b>第一個數字的一半</b>。'),
        p('第三個：右邊，不用轉圈，停在<b>我自己的編號</b>。我的編號是幾號來著？'),
      ].join(''), { cls: 'hand sticky' }),
      note('本局提醒：保險箱的編號鑄於門上的銘牌。'),
    ].join(''),
    success: ['正確。', '它表示自己早就知道了。'],
  },
  {
    id: 'M017', number: '017', act: 3, kind: 'special', look: 'sleepy', artifact: 'artifact-026',
    title: '睡著的保險箱', persona: 'sleepy',
    guide: { target: false, turns: true, dir: true },
    meter: true,
    lock: () => ({
      resetOnError: false,
      wake: { swings: 4, min: 2, max: 8 },
      stages: [S(-1, 1, 12, { tone: 'low' }), S(1, 0, 66, { tone: 'low' })],
    }),
    brief: () => [
      p('本保險箱於 1974 年進入睡眠，至今未醒。'),
      memo('本局安撫程序 第 4 條', [
        p('請<b>左右小幅搖動</b>轉盤以喚醒它：每次朝一個方向轉 <b>2 至 8 格</b>，然後反方向，共完成 <b>4 次</b>搖動。'),
        p('單次轉動超過 8 格會使它受到驚嚇，並重新入睡（搖動次數歸零）。'),
        p('醒來後，它會以<b>低沉</b>的共鳴說出密碼。'),
      ].join('')),
      proc([step(-1, 1, '??'), step(1, 0, '??')], { caption: '醒來後之程序' }),
      note('請不要在它面前提到「上班」兩個字。'),
    ].join(''),
    success: ['正確。', '它醒來後說的第一句話是：「這裡是哪裡。」本局決定不予回答。'],
  },
  {
    id: 'M018', number: '018', act: 3, kind: 'special', look: 'luxury', artifact: 'artifact-013',
    title: '套娃保險箱', persona: 'nested',
    guide: { target: true, turns: true, dir: true },
    levels: [
      { look: 'luxury', number: '018', lock: () => ({ stages: [S(1, 2, 81), S(-1, 0, 33)] }), tagline: null },
      {
        look: 'mini', number: '018-a',
        lock: () => ({ size: 40, stages: [S(1, 1, 12), S(-1, 0, 27)] }),
        tag: ['吊牌：', 'R1·12 / L·27'],
      },
      {
        look: 'mini', number: '018-b',
        lock: () => ({ size: 12, stages: [S(1, 0, 7, { tone: 'high' })] }),
        tag: ['吊牌：', '本保險箱僅有 12 格。本局相信閣下。'],
        guide: { target: false, turns: true, dir: true },
        meter: true,
      },
    ],
    brief: () => [
      p('「極致無用型 Ω」是本局造價最高的保險箱。依據採購紀錄，它內部另附有「必要之保護措施」。'),
      proc([step(1, 2, 81), step(-1, 0, 33)], { caption: '外箱程序' }),
      p('內部的保護措施之程序，據稱「打開就知道了」。'),
      note('請注意：較小的保險箱，刻度也較少。'),
    ].join(''),
    success: ['正確。', '箱內最終之物品本身亦為保險箱。本局決定不再繼續打開。'],
  },
  {
    id: 'M019', number: '019', act: 3, kind: 'special', look: 'retired', artifact: 'artifact-027',
    title: '退休的保險箱', persona: 'retired', openAngle: -46,
    guide: { target: false, turns: true, dir: true },
    lock: () => ({ gear: 0.5, stages: [S(1, 0, 47)] }),
    puzzle: { kind: 'retired', years: 47 },
    brief: () => [
      memo('致本局', [
        p('本人服務本局 <b>47</b> 年，下個月退休。'),
        p('密碼就是我的服務年資。往右轉，不用繞圈，停在那裡就好。我不在乎了。'),
        p('另外，我的齒輪已經不太想轉了。請多轉幾下。'),
      ].join(''), { cls: 'hand', sign: '舊式 B-0　敬上' }),
      note('本局已核准其退休申請，並要求其完成最後一次開啟。'),
    ].join(''),
    success: ['確認。', '它只打開了一半。本局認為這已經足夠。'],
  },
  {
    id: 'M000', number: '000', act: 3, kind: 'special', look: 'void', artifact: 'artifact-015',
    title: '第 000 號保險箱', persona: 'void', hidden: true,
    guide: { target: false, turns: true, dir: true, noReading: true },
    meter: true,
    requires: ['M014', 'M015', 'M016', 'M017', 'M018', 'M019'],
    lock: (ctx) => {
      const v = voidNumbers(ctx);
      return {
        resetOnError: false,
        stages: [S(1, v.turns, v.a, { tone: 'mid' }), S(-1, 1, v.b, { tone: 'mid' }), S(1, 0, 0, { tone: 'mid' })],
      };
    },
    brief: (ctx) => {
      const v = voidNumbers(ctx);
      return [
        p('第 000 號保險箱不存在。'),
        p('以下文件亦不存在。'),
        memo(`${redact(4)} 第 ${redact(3)} 號`, [
          p(`第一個數字：閣下的典藏室中，${redact(3)}的<b>種類數</b>。`),
          p(`第一階段之圈數：等同閣下所保管的<b>馬鈴薯</b>數量（上限為三）。`),
          p(`第二個數字：閣下至今${redact(2)}開啟的<b>保險箱總數</b>（超過 99 時取末兩位）。`),
          p(`第三個數字：${redact(5)}。`),
          p('它的轉盤上沒有數字。它會告訴閣下，只要閣下願意聽。'),
        ].join(''), { cls: 'void' }),
        proc([step(1, v.turns, '??'), step(-1, 1, '??'), step(1, 0, '??')], { caption: '程序' }),
      ].join('');
    },
    success: ['……', '本局沒有第 000 號保險箱的紀錄。本紀錄將於星期三銷毀。'],
  },
];

// Numbers for safe 000 come from the player's own archive, frozen when the mission starts.
export function voidNumbers(ctx = {}) {
  const distinct = ctx.distinct || 0;
  const opened = ctx.opened || 0;
  const potatoes = ctx.potatoes || 0;
  return { a: distinct % 100, b: opened % 100, turns: Math.max(1, Math.min(3, potatoes)) };
}

export const MISSION_BY_ID = Object.fromEntries(MISSIONS.map((m) => [m.id, m]));

// Which missions the player may open now.
export function missionUnlocked(mission, isComplete) {
  const index = MISSIONS.indexOf(mission);
  if (mission.requires) return mission.requires.every(isComplete);
  if (mission.act === 3) return isComplete('M013');
  if (index === 0) return true;
  return isComplete(MISSIONS[index - 1].id);
}

export function lockSpecsOf(mission, ctx) {
  if (mission.levels) return mission.levels.map((lv) => lv.lock(ctx));
  return [mission.lock(ctx)];
}
