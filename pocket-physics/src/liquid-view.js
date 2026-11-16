export const liquidMarkup=`
<main class="room liquid-room" id="exhibit-room">
  <div class="exhibit-heading"><h1>聲音<br>液體</h1></div>
  <div class="artwork liquid-artwork" id="artwork">
    <canvas id="liquid-canvas" tabindex="0" role="group" aria-label="聲音液體。點按或拖曳液面造波，可同時用兩指；方向鍵移動撥水位置，Enter 造波。" aria-describedby="gesture-hint">用聲音或觸碰在液面上造波。</canvas>
    <div class="gesture-hint" id="gesture-hint"><span class="gesture-line"></span><span>撥動液面，或讓聲音落下</span></div>
  </div>
  <aside class="field-panel liquid-panel" aria-label="聲音液體控制">
    <div class="liquid-sources" role="group" aria-label="聲音來源">
      <button id="liquid-mic" class="liquid-source" aria-pressed="false"><svg><use href="#i-mic"/></svg><span>麥克風</span></button>
      <button id="liquid-bass" class="liquid-source" aria-pressed="false"><svg><use href="#i-note"/></svg><span>低音</span></button>
      <button id="liquid-melody" class="liquid-source" aria-pressed="false"><svg><use href="#i-notes"/></svg><span>旋律</span></button>
    </div>
    <div class="liquid-control"><label class="mirror-label" for="liquid-sensitivity"><span>感應</span><output id="liquid-sensitivity-value" aria-live="off">1.0</output></label><input class="range" id="liquid-sensitivity" type="range" min="0.3" max="2" step="0.1" value="1" aria-label="聲音感應強度"></div>
    <div class="liquid-control"><label class="mirror-label" for="liquid-persistence"><span>餘波</span><output id="liquid-persistence-value" aria-live="off">0.60</output></label><input class="range" id="liquid-persistence" type="range" min="0" max="1" step="0.05" value="0.6" aria-label="波紋持續程度"></div>
    <div class="liquid-meter" role="meter" aria-label="聲音強度" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0"><span id="liquid-level"></span></div>
    <p id="liquid-audio-status" class="liquid-audio-status" role="status"></p>
  </aside>
  <div class="transport" role="group" aria-label="液體播放控制">
    <button class="icon-button play-button" id="pause" aria-label="暫停" aria-pressed="false"><svg><use href="#i-pause"/></svg></button><span class="transport-divider" aria-hidden="true"></span>
    <button class="icon-button" id="liquid-mute" aria-label="關閉示範音聲音" aria-pressed="false" title="示範音靜音"><svg><use href="#i-sound"/></svg></button>
    <button class="icon-button reset-button" id="reset" aria-label="重置聲音液體" title="重置（Home）"><svg><use href="#i-reset"/></svg></button>
  </div>
  <div class="quiet-status" id="status" aria-live="polite"></div>
</main><footer class="footer"><span class="footer-rule"><span class="live-dot" id="live-dot"></span><span id="flow-state">等待聲音</span></span></footer>`;
export const liquidNotes=`<dl><dt>撥水</dt><dd>點按、拖曳液面，讓波紋互相干涉。可以同時用兩指。聲音與手勢可以一起使用。</dd><dt>聲音</dt><dd>點選麥克風後唱歌、說話或演奏；收音音量控制波幅，頻譜重心控制激振位置、數量和速度。低音與旋律是真正播放並分析的示範音。再點一次會停止。</dd><dt>調整</dt><dd>「感應」調整聲音造波的強度；「餘波」越高，波紋消散越慢。喇叭按鈕只靜音示範音，液面仍會回應。</dd><dt>收音</dt><dd>聲音只在本機分析，不錄音、不上傳，麥克風不接回喇叭。權限拒絕或設備不可用時，可播放示範音或撥水。暫停、重置、切換藏品、開啟面板及離開視窗都會停止聲音；回來後請自行重新啟用。</dd></dl><div class="science-note"><h3>模擬規則</h3><p>圓形邊界上的阻尼波動方程會計算波的傳播、反射和疊加。聲音的可聽頻率被映射到較慢的表面激振，形成藝術化波紋。這不是完整流體力學，也不是實際聲波駐波實驗的重現。</p></div><p class="keyboard-note">聚焦液面：方向鍵移動，Enter 造波<br>空白鍵 暫停　Home 重置</p>`;
