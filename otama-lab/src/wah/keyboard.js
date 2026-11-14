// Hold-to-open works from buttons and the mouth range too, without intercepting
// browser shortcuts, text editing, IME composition or the help dialog.
export function bindWahMouthKey({ onChange, isDialogOpen = () => false, documentTarget = document, windowTarget = window }) {
  let held = false;
  const isMouthKey = event => event.code === 'KeyW' || event.key?.toLowerCase() === 'w';
  const stop = () => { if (held) { held = false; onChange(false); } };
  documentTarget.addEventListener('keydown', event => {
    if (!isMouthKey(event) || event.ctrlKey || event.metaKey || event.altKey || event.isComposing || isDialogOpen()) return;
    if (event.target?.isContentEditable || event.target?.closest?.('textarea,select,input:not([type="range"]),[contenteditable=""],[contenteditable="true"],[role="textbox"]')) return;
    event.preventDefault();
    if (held || event.repeat) return;
    held = true; onChange(true);
  });
  documentTarget.addEventListener('keyup', event => {
    if (!isMouthKey(event) || !held) return;
    event.preventDefault(); stop();
  });
  windowTarget.addEventListener('blur', stop); windowTarget.addEventListener('pagehide', stop);
  documentTarget.addEventListener('visibilitychange', () => { if (documentTarget.hidden) stop(); });
  return { stop, get held() { return held; } };
}
