export const mirrorMarkup = `
<main class="room mirror-room" id="exhibit-room">
  <div class="exhibit-heading"><h1>四維<br>鏡子</h1></div>
  <div class="artwork mirror-artwork" id="artwork">
    <canvas id="mirror-canvas" tabindex="0" role="group" aria-label="四維鏡子。拖曳或按方向鍵旋轉，3D 轉視角，4D 轉內外。" aria-describedby="gesture-hint">角色面向鏡子，鏡中的輪廓隨四維旋轉變形。可用控制面板與方向鍵調整。</canvas>
    <div class="gesture-hint" id="gesture-hint"><span class="gesture-line"></span><span id="mirror-hint">拖曳，看看鏡中的自己</span></div>
  </div>
  <aside class="field-panel mirror-panel" aria-label="四維鏡子控制">
    <div class="dimension-switch" role="group" aria-label="拖曳旋轉方式"><button id="dimension-3d" aria-pressed="false" aria-label="3D 視角旋轉">3D</button><button id="dimension-4d" aria-pressed="true" aria-label="4D 內外旋轉">4D</button></div>
    <div class="mirror-control"><label class="mirror-label" for="fourth-angle"><span>內外</span><output id="fourth-angle-value" aria-live="off">23°</output></label><input class="range" id="fourth-angle" type="range" min="-180" max="180" step="1" value="23" aria-label="第四維旋轉角度"></div>
    <div class="mirror-control"><label class="mirror-label" for="mirror-depth"><span>深度</span><output id="mirror-depth-value" aria-live="off">3.60</output></label><input class="range" id="mirror-depth" type="range" min="2.7" max="6" step="0.05" value="3.6" aria-label="第四維投影深度"></div>
  </aside>
  <div class="transport" role="group" aria-label="四維鏡子播放控制">
    <button class="icon-button play-button" id="pause" aria-label="暫停" aria-pressed="false" title="暫停 / 播放（空白鍵）"><svg><use href="#i-pause"/></svg></button>
    <span class="transport-divider" aria-hidden="true"></span>
    <button class="transport-button" id="mirror-flip" title="沿第四維翻轉（F）"><svg><use href="#i-rotate"/></svg><span>翻轉</span></button>
    <button class="icon-button reset-button" id="reset" aria-label="重置四維鏡子" title="重置（Home）"><svg><use href="#i-reset"/></svg></button>
  </div>
  <div class="quiet-status" id="status" aria-live="polite"></div>
</main>
<footer class="footer"><span class="footer-rule"><span class="live-dot" id="live-dot"></span><span id="flow-state">四維旋轉</span></span></footer>`;

export const mirrorNotes = `
<p>鏡外的小角色正在照鏡子。鏡中角色的輪廓沿第四個空間方向旋轉，再投影到畫面；淡色線框是同一轉法下的超立方體參考，不是鏡子的結構。這是藝術化的四維投影示意，並非真實光學反射。</p><dl><dt>4D</dt><dd>拖曳鏡面，讓第四維與左右、上下交換。看起來在內部的部分，可以逐漸轉到外面。</dd><dt>3D</dt><dd>轉動同一物件的三維投影，只改變觀察方向。切換 3D／4D，比較兩種旋轉。</dd><dt>內外</dt><dd>精確調整第四維的旋轉角度。「翻轉」會再轉四分之一圈。</dd><dt>深度</dt><dd>改變第四維的透視距離，觀察遠近部分的大小如何變化。</dd></dl>
<div class="science-note"><h3>數學規則</h3><p>鏡中是有 16 個頂點、32 條邊與 24 個正方形面的四維超立方體。先在四維空間做保持距離的旋轉，再透視投影到三維與螢幕。相交與內外交換是投影的結果，不代表原本的四維物件穿過自己。這裡的第四維是空間方向，不是時間。</p></div>
<p class="keyboard-note">雙指：縮放深度、扭轉；滑鼠：滾輪、Shift＋拖曳<br>方向鍵旋轉，Shift 加大角度；[ ] 扭轉<br>空白鍵 暫停　F 翻轉　Home 重置</p>`;
