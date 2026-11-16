export const bubbleMarkup = `
<main class="room bubble-room" id="exhibit-room">
  <div class="exhibit-heading"><h1>不破的<br>泡泡</h1></div>
  <div class="artwork bubble-artwork" id="artwork">
    <canvas id="bubble-canvas" tabindex="0" role="group" aria-label="互動泡泡。拖曳表面拉伸，可同時使用兩指。方向鍵拉伸，放開回彈，Tab 切換其他操作。" aria-describedby="gesture-hint">需要支援 Canvas 才能體驗泡泡。</canvas>
    <div class="gesture-hint" id="gesture-hint"><span class="gesture-line"></span><span>拉住表面，放手回彈</span></div>
  </div>
  <aside class="field-panel bubble-panel" aria-label="泡泡控制">
    <div class="breath-control"><button class="inflate-button" id="inflate" aria-label="啟用麥克風吹氣" aria-pressed="false"><svg><use href="#i-mic"/></svg><span>啟用麥克風</span></button><button class="icon-button mic-retry" id="mic-retry" aria-label="重新嘗試麥克風" title="重新嘗試麥克風" hidden><svg><use href="#i-mic"/></svg></button></div>
    <label class="elasticity-label" for="elasticity"><span>彈性</span><output id="elasticity-value">0.60</output></label>
    <input class="range" id="elasticity" type="range" min="0.15" max="1" step="0.05" value="0.6" aria-label="泡泡彈性">
    <button class="float-button add-bubble" id="add-bubble"><svg><use href="#i-add-bubble"/></svg><span>加一顆</span><output id="bubble-count">3 / 5</output></button>
  </aside>
  <div class="transport" role="group" aria-label="泡泡播放控制">
    <button class="icon-button play-button" id="pause" aria-label="暫停" aria-pressed="false" title="暫停 / 播放（空白鍵）"><svg><use href="#i-pause"/></svg></button>
    <span class="transport-divider" aria-hidden="true"></span>
    <button class="transport-button" id="relax"><svg><use href="#i-release"/></svg><span>放鬆</span></button>
    <button class="icon-button reset-button" id="reset" aria-label="重置泡泡" title="重置（Home）"><svg><use href="#i-reset"/></svg></button>
  </div>
  <div class="quiet-status" id="status" aria-live="polite"></div>
</main>
<footer class="footer"><span class="footer-rule"><span class="live-dot" id="live-dot"></span><span id="flow-state">表面張力</span></span></footer>`;

export const bubbleNotes = `
<dl><dt>拉伸</dt><dd>拖住泡泡表面往外拉，放手就會回彈。可同時用兩指拉住不同位置。</dd><dt>吹氣</dt><dd>啟用麥克風後，對著麥克風吹氣；收音越強，泡泡膨脹越多。若權限被拒絕、沒有麥克風或無法收音，才改用長按按鈕。彈性越高，輪廓越快收回。</dd><dt>收音</dt><dd>聲音只在本機即時分析，不錄音、不上傳。說話或較大的環境聲也可能影響泡泡。點一下收音按鈕可關閉；暫停、重置或離開藏品也會停止收音。</dd><dt>碰撞</dt><dd>拖動泡泡推擠其他泡泡，也可以再加兩顆。</dd></dl>
<div class="science-note"><h3>模擬規則</h3><p>輪廓由相連的質點、彈簧約束與面積壓力組成。它們會回復形狀，並在碰撞時互相推擠；不破裂與回到原處的弱引力是這個藏品的虛構規則。這是二維膜模型，不是真實的肥皂泡物理。</p></div>
<p class="keyboard-note">聚焦泡泡後：方向鍵拉伸，放開回彈<br>麥克風不可用時：按住吹氣，或按住空白鍵／Enter<br>空白鍵 暫停　Home 重置</p>`;
