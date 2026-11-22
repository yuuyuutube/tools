// Intro editor: overrides for the opening forest, saved to src/intro-layout.js. The desktop size (1440 × 900) is
// the reference the per-piece values were recorded at.
import savedLayout from "../src/intro-layout.js";
import { startEditor } from "./forest-editor.js";

startEditor({
  sizes: { phone: [390, 844], tablet: [820, 1080], desktop: [1440, 900] },
  start: "desktop",
  own: savedLayout,
  saveUrl: "/__save/intro-layout",
  pinColors: true,
  resetMessage: "把所有葉子的顏色和前後順序都還原成預設？要按儲存才會寫進網站。",
});
