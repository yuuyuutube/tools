import { ReverseHourglass } from '../src/hourglass.js';

export async function runBrowserChecks(exhibit) {
  const output = document.createElement('pre');
  output.id = 'qa-results';
  output.style.cssText = 'position:fixed;z-index:100;top:8px;left:8px;max-width:calc(100% - 16px);max-height:95vh;overflow:auto;padding:18px;border:1px solid #a3acbd;background:#f4f5f8fa;color:#263462;font:12px/1.8 monospace;white-space:pre-wrap;user-select:text;box-shadow:0 5px 30px #0002';
  document.body.append(output);
  const results = [];
  const check = (name, condition) => {
    results.push({ name, passed: !!condition });
    output.textContent = results.map(r => `${r.passed ? 'PASS' : 'FAIL'}  ${r.name}`).join('\n');
    if (!condition) throw new Error(name);
  };
  const frame = () => new Promise(resolve => requestAnimationFrame(resolve));
  const $ = (id) => document.getElementById(id);
  try {
    exhibit.paused = true; exhibit.schedule(); exhibit.updateUI();
    const pausedTime = exhibit.sim.time;
    await frame(); await frame();
    check('Pause stops simulation time', exhibit.sim.time === pausedTime && exhibit.frame === 0);
    $('reset').click();
    check('Reset restores grains, angle, field and force', exhibit.sim.metrics().upper === 0 && Math.round(exhibit.sim.angle * 180 / Math.PI) === -12 && exhibit.sim.strength === 1 && exhibit.sim.fieldAngle === 0);
    exhibit.canvas.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
    check('Keyboard changes simulated glass orientation', Math.round(exhibit.sim.angle * 180 / Math.PI) === -7);
    const bounds = exhibit.canvas.getBoundingClientRect();
    const { center, scale } = exhibit.renderer;
    const cx = bounds.left + center.x, cy = bounds.top + center.y;
    const pointer = (element, type, x, y, id = 51) => element.dispatchEvent(new PointerEvent(type, { pointerId: id, pointerType: 'touch', isPrimary: true, button: 0, buttons: type === 'pointerup' ? 0 : 1, clientX: x, clientY: y, bubbles: true, cancelable: true }));
    // Synthetic events cannot own OS pointer capture. Stub only that boundary; real input is tested separately.
    const originalCanvasCapture = exhibit.canvas.setPointerCapture;
    exhibit.canvas.setPointerCapture = () => {};
    const originalAngle = exhibit.sim.angle;
    pointer(exhibit.canvas, 'pointerdown', cx, cy - 150 * scale);
    pointer(exhibit.canvas, 'pointermove', cx + 100 * scale, cy - 100 * scale);
    pointer(exhibit.canvas, 'pointerup', cx + 100 * scale, cy - 100 * scale);
    check('Touch pointer drag changes actual glass geometry', Math.abs(exhibit.sim.angle - originalAngle) > .5 && exhibit.drag === null);
    pointer(exhibit.canvas, 'pointerdown', cx, cy - 100 * scale);
    pointer(exhibit.canvas, 'pointercancel', cx, cy - 100 * scale);
    const cancelledAngle = exhibit.sim.angle;
    pointer(exhibit.canvas, 'pointermove', cx + 100 * scale, cy);
    check('Cancelled touch gesture releases the glass', exhibit.drag === null && exhibit.sim.angle === cancelledAngle);
    exhibit.canvas.setPointerCapture = originalCanvasCapture;
    const originalDialCapture = exhibit.dial.setPointerCapture;
    exhibit.dial.setPointerCapture = () => {};
    const db = exhibit.dial.getBoundingClientRect();
    pointer(exhibit.dial, 'pointerdown', db.right - 12, db.top + db.height / 2, 52);
    pointer(exhibit.dial, 'pointerup', db.right - 12, db.top + db.height / 2, 52);
    exhibit.dial.setPointerCapture = originalDialCapture;
    check('Touch dial sets a rightward gravity field', Math.abs(exhibit.sim.fieldAngle - Math.PI / 2) < .01);
    $('strength').value = '1.65'; $('strength').dispatchEvent(new Event('input', { bubbles: true }));
    $('float').click();
    check('Weightless toggle removes acceleration', exhibit.sim.strength === 0 && $('float').getAttribute('aria-pressed') === 'true');
    $('float').click();
    check('Leaving weightlessness restores previous force', exhibit.sim.strength === 1.65);
    $('reverse').click();
    check('Reverse changes actual gravity by 180 degrees', Math.abs(exhibit.sim.fieldAngle + Math.PI / 2) < .01);
    $('notes-open').click();
    check('Custom notes dialog suspends exhibit', $('notes-dialog').open && !exhibit.active);
    $('notes-dialog').close(); await frame();
    check('Closing notes restores lifecycle and focus', exhibit.active && document.activeElement === $('notes-open') && exhibit.paused);
    $('collection-open').click(); $('hourglass-entry').click(); await frame();
    check('Collection navigation returns to playable exhibit', !$('collection-dialog').open && exhibit.active);

    const fixture = exhibit.root.cloneNode(true);
    fixture.style.display = 'none'; document.body.append(fixture);
    const other = new ReverseHourglass(fixture);
    other.paused = true; other.setActive(false); other.mount(); other.dispose();
    fixture.querySelector('#reverse').click();
    check('Dispose removes event handlers and animation work', other.sim.fieldAngle === 0 && other.frame === 0 && other.abort.signal.aborted);
    fixture.remove();

    const simSamples = [], renderSamples = [];
    exhibit.reset();
    for (let i = 0; i < 300; i++) {
      let t = performance.now(); exhibit.sim.step(); simSamples.push(performance.now() - t);
      t = performance.now(); exhibit.paint(); renderSamples.push(performance.now() - t);
    }
    const stats = (values) => {
      const sorted = [...values].sort((a,b) => a-b);
      return { averageMs: +(values.reduce((a,b) => a+b) / values.length).toFixed(3), p95Ms: +sorted[Math.floor(sorted.length * .95)].toFixed(3) };
    };
    exhibit.paused = false; exhibit.schedule(); exhibit.updateUI();
    const intervals = [];
    let previous = await frame();
    for (let i = 0; i < 90; i++) { const now = await frame(); intervals.push(now - previous); previous = now; }
    const performanceResult = { simulation: stats(simSamples), rendering: stats(renderSamples), frameInterval: stats(intervals), particles: exhibit.sim.count, viewport: `${innerWidth} × ${innerHeight}`, devicePixelRatio };
    check('Live animation advances simulation', exhibit.sim.time > 2);
    check('Layout has no horizontal overflow', document.documentElement.scrollWidth <= innerWidth);
    exhibit.reset();
    output.textContent += '\n\n' + JSON.stringify(performanceResult, null, 2) + '\n\nSynthetic touch events verify handlers; real touch hardware is not emulated.\nCOMPLETE';
    output.dataset.state = 'passed';
  } catch (error) {
    output.textContent += '\nERROR: ' + error.stack;
    output.dataset.state = 'failed';
    console.error(error);
  }
}
