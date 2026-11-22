# Play with Matisse

A cut-paper playground: pick a paper, draw a few lines, snip or rip, and collage the pieces into one artwork.
Plain ES modules with no build step and no dependencies. Deploys as-is under `/tools/play-with-matisse/`.

## Run

```bash
python3 tools/play-with-matisse/scripts/dev-server.py 8767
```

Then open http://localhost:8767. The dev server sends `no-store` so edited modules are never cached. It is also in
`.claude/launch.json` as `play-with-matisse`. Any static server works for production.

## Files

| File | What it does |
|---|---|
| `index.html` | Every screen's markup (desk, finish, size picker, draw pad, about, intro) |
| `src/main.js` | App flow: intro → canvas size → paper → draw → collage → finish; returning visitors go straight to the desk |
| `src/store.js` | Artwork data kept apart from UI state; undo/redo; autosave to localStorage |
| `src/shapes.js` | Stroke → cut-paper generator (leaf, branch, flower, organic, free cut × original / soft / bold) and the 22 original presets |
| `src/geom.js` | Resampling, smoothing, RDP, marching-squares contour tracing, ring orientation |
| `src/paper.js` | Snip and rip edges, paper texture, and the one renderer used by the editor, thumbnails and export |
| `src/editor.js` | Collage canvas: picking, move / scale / rotate (mouse, pen, one or two fingers), piece toolbar, keyboard |
| `src/desk.js` | Paper rail, set popover (texture, background, My Colours picker), cut mode, shape tray |
| `src/drawpad.js` | Drawing pad, live variations, add to tray, re-edit a saved drawing |
| `src/sizes.js` | Canvas size picker; mid-work resize with Fit / Keep previews |
| `src/export.js` | PNG output (artwork or art print) and the 300 DPI `pHYs` chunk |
| `src/finish.js` | Finished-artwork view: original / art print / postcard preview, download |
| `src/intro.js` | Cut-paper rainforest intro (Web Animations API) |
| `src/about.js` | About / tribute booklet (EN / 繁中) |
| `src/ui.js` | Custom confirm, popovers, colour picker, segmented toggles. No native select, radio, checkbox, confirm or alert |
| `src/icons.js` | Inline SVG icon set, no emoji |

## How shapes are made

Each generator turns the user's strokes into simple primitives: leaf outlines grown around the stroke as a midrib,
stems with leaves placed along the stroke, petals sized from the stroke's polar outline, thickened lines, and filled
closed loops. Slits and holes are drawn as cut-outs. The primitives are rasterised at 360 px, softened with a box blur
whose radius depends on the variant, and traced back to vector rings with marching squares. Overlaps merge into one
sheet and cut-outs become real holes. The output always follows the strokes. If a type can't make a shape (a single dot,
a tangle), it falls back to the thickened stroke, so a drawing never vanishes.

Rip edges are computed at render time from the traced rings and a per-piece seed. Periodic noise at three scales moves
the edge, and a pale core rim with fibres sits outside it. The same seed always gives the same tear, so the editor and
the export match.

## Reused from puri-club

The gesture model comes from `tools/puri-club/src/adjust.js`: one corner handle for scale + rotate, two-finger pinch
with rotation, quarter-turn snapping with a short vibration, pointer capture, a render queue, and snapshot undo. It was
rewritten here for vector pieces (hit-testing with `isPointInPath`) and nothing in puri-club was changed.

## Keyboard

`⌘/Ctrl Z` undo · `⇧⌘Z` / `⌘Y` redo · `⌘D` duplicate · `Delete` remove · arrows nudge (`⇧` = bigger) · `[` `]` layer ·
`,` `.` rotate 15° · `Esc` deselect / close · `Shift`-drag the handle for free rotation · wheel or trackpad pinch scales the selected piece, `Shift`+wheel rotates.

## Not done / later

- SVG and PDF export, bleed and safe-area guides (the vector rings already make SVG export simple)
- Pinch-to-zoom on the canvas itself (pinch acts on the selected piece)
- Paper texture is set per artwork, not per piece
