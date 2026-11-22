// OG image editor: 1200 × 630, no play button. Its overrides (src/og-layout.js) sit on top of the intro layout,
// so anything you don't change here follows the intro. Saving also re-renders og.png.
import introLayout from "../src/intro-layout.js";
import ogLayout from "../src/og-layout.js";
import { startEditor } from "./forest-editor.js";

startEditor({
  sizes: { og: [1200, 630] },
  start: "og",
  hideButton: true,
  own: ogLayout,
  base: introLayout,
  saveUrl: "/__save/og-layout",
  pinColors: false,
  resetMessage: "把 OG 圖的顏色和前後順序都還原成跟進站畫面一樣？要按儲存才會寫進網站。",
});
