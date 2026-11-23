# Play with Matisse

A cut-paper playground: pick a paper, draw a few lines, snip or rip, and collage the pieces into one artwork.
Plain ES modules with no build step and no dependencies. Deploys as-is under `/tools/play-with-matisse/`.

## Run

```bash
python3 tools/play-with-matisse/scripts/dev-server.py 8767
```

Then open http://localhost:8767. The dev server sends `no-store` so edited modules are never cached. It is also in
`.claude/launch.json` as `play-with-matisse`. Any static server works for production.

## Publishing

Run `node tools/play-with-matisse/scripts/stamp.mjs` before committing a release. It adds a content hash to the
stylesheet, icons, og.png and every JS module (through an import map in index.html), so visitors never get a stale
cached copy. Re-run it after any change under `src/`, including saves from the intro or OG editor.

## Intro editor

Open http://localhost:8767/scripts/intro-editor.html with the dev server running. Click a leaf or blossom to
select it (click the same spot again to reach the one underneath), change its stacking or colour, and save: the
dev server writes `src/intro-layout.js`, which the real intro reads. Pieces are matched by a stable key
(`L<layer>-<i>`, `B<i>`), so one layout applies to every screen size; switch the preview size to check each one.
`[` / `]` move back / forward (with Shift: to the back / front), `⌘S` saves.

## OG editor

http://localhost:8767/scripts/og-editor.html works the same way for the 1200 × 630 share image. Its overrides go
to `src/og-layout.js`, on top of the intro layout (anything you don't change follows the intro), and saving also
re-renders `og.png`. Bump `?v=` in the `og:image` tags when publishing a new one.

## OG image and icons

`og.png`, `assets/apple-touch-icon.png` and `assets/icon-32.png` are rendered from `scripts/og.html` (the intro
forest and cut-paper title, without the play button) and `scripts/icon.html` (the cut-paper `assets/icon.svg`):

```bash
./tools/play-with-matisse/scripts/render-og.sh
```

It needs the dev server running and Google Chrome installed. Bump `?v=` in the `og:image` tags after re-rendering.

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
| `src/drawpad.js` | Drawing pad, live variations, add to tray, re-edit a saved drawing or photo |
| `src/tour.js` | First-visit guide on the work table: spotlight over the real control + speech bubble, in English or 繁中 (switch in the bubble; shares the About booklet's language); steps whose control isn't on screen are skipped, so desktop and phone each get their own path. Runs once (`store.ui.toured`); the `?` button in the top bar replays it |
| `src/photo.js` | Photo of a paper sketch → ink mask (lighting evened out, table edge and specks dropped), filled in or kept as lines |
| `src/sizes.js` | Canvas size picker; mid-work resize with Fit / Keep previews |
| `src/export.js` | PNG output (artwork or art print) and the 300 DPI `pHYs` chunk |
| `src/sign.js` | Signing anywhere on the finished artwork: black pen (thinner when fast) or a typed name (Latin in the original Kaiti letters, Chinese in Ming/Song, then Hei), ported from stamp-tour; stored in the artwork and drawn into every export |
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

## Shapes from a photo

The camera button (next to the pencil in the tray, beside the pencil in the phone dock, and in the pad's tools) takes
a photo or picks one from the library. The photo is shrunk to 420 px and turned grey. The paper's white at
each pixel comes from a grey-level closing (max, then min, over a ~60 px square): pencil lines and small filled
areas are wiped out of it, while shadows keep their exact shape and edges, so a hand or phone shadow cancels out
instead of its edge reading as a line. It is never taken below half the brightest paper, so a big area coloured in
with marker still counts as ink. The slider sets how faint a mark still counts, starting just above the paper's
own noise (median + spread, measured in the middle of the photo). Specks are dropped, and so are pieces touching
the photo's edge (the table, the paper's shadow), unless nothing else is left. **Fill** closes small gaps in the
outline, fills everything the outside can't reach, then trims strands that are still bare pencil lines (a stroke
that ran past a corner). **Lines** keeps the
marks as strips. Leaf, branch and flower aren't offered for photos. The three looks and tracing are the same as for
drawings (`traceMask` in `shapes.js`). The grey 420 px JPEG (about 20 KB) is kept in the asset, so a photo shape
can be re-edited like a drawing.

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
