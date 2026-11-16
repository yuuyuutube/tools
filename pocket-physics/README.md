# Pocket Physics

A small collection of impossible physical toys. **Stages 0–4** from [the original brief](prompt.md) are complete: the shared experience, Reverse Hourglass, Unbreakable Bubble, Fourth-Dimension Mirror, and Singing Liquid. Stages 5–6 require separate authorization.

## Run

Node.js 20 or newer. No dependencies, package installation, build step, remote fonts, or network services are required.

```sh
cd /Users/yoyohuang/dev/yuuyuutube/tools/pocket-physics
npm run dev
```

Open the printed local URL (default `http://127.0.0.1:4173`). Use `PORT=47831 npm run dev` if another app owns that port. Any static HTTP server also works; serve the project directory. ES modules require HTTP rather than opening `index.html` as a `file:` URL.

Open `/#liquid`, `/#mirror`, `/#bubble` or `/#hourglass` directly. The header arrow cycles all four exhibits; the collection button offers direct selection. State and pause choices are retained while switching; only the current exhibit runs.

## Play

### Fourth-Dimension Mirror

- In **4D**, drag to rotate the tesseract in the XW/YW planes: its inner and outer parts appear to exchange. In **3D**, drag to change only the viewing orientation of the same projected object.
- **內外** sets the XW angle precisely. **深度** changes the 4D perspective distance. **翻轉** performs a quarter-turn in XW, including while automatic motion is paused.
- Two fingers can pinch the projection distance and twist the ZW plane (or roll the view in 3D). A mouse uses the wheel for depth and Shift-drag for twist.
- Focus the mirror and use arrow keys (Shift for larger steps); bracket keys twist. Space toggles automatic rotation, F flips, and Home resets.
- Direct manipulation pauses automatic motion. Reduced-motion visitors start paused and receive an immediate quarter-turn instead of the animated flip.

### Singing Liquid

- Open `/#liquid`, or choose 聲音液體 from 藏品.
- Tap/drag the surface, using a mouse or up to two fingers. Focus the canvas, use arrows to position the contact marker, and press Enter to create a wave.
- Select 麥克風 to analyse live local input, or 低音 / 旋律 to play and analyse generated demo audio. Click the selected source again to stop it. No sound or capture starts automatically.
- Sound amplitude controls excitation strength; spectral centroid controls the source arrangement and its slower visual frequency. 感應 scales input; 餘波 adjusts damping. The speaker button mutes demo output while analysis continues.
- Pause, reset, modal panels, page hiding, window blur and exhibit changes stop audio resources. Returning never restarts capture or playback automatically.
- This is a damped circular height-field wave model with artistic audio mapping, not full fluid dynamics or exact cymatics. Rendering uses a smooth WebGL surface with a Canvas 2D fallback when WebGL is unavailable.

### Unbreakable Bubble

- Drag any membrane to stretch it; release to let surface tension restore it. Touch supports simultaneous grabs, including two points on the same bubble.
- Click **啟用麥克風** and grant microphone access, then blow toward the microphone. The analysed input level controls how much the membranes inflate. Click the microphone button again to stop capture.
- Only when permission is denied, no microphone exists, or capture is unavailable does the control become **按住吹氣**. Hold with mouse/touch, or Space/Enter; release to stop. The small microphone button retries capture.
- Pausing, resetting, hiding the page, opening a panel, or switching exhibits releases microphone tracks. Re-enable explicitly to resume listening. Audio is analysed locally, never recorded or uploaded. Speech and loud surroundings can also affect this amplitude-based interaction.
- Change elasticity, add bubbles up to five, release all grabs with **放鬆**, pause, or reset.
- Focus the artwork and hold arrow keys to stretch the main bubble; release to let go. This also works while paused through direct manipulation steps.
- A reset restores the original three bubbles and material parameters while preserving the pause choice.

### Reverse Hourglass

- Drag the glass to turn it. The world-space gravity direction remains independent.
- Drag the gravity dial to aim the field; adjust its strength from 0 to 2 g.
- Use **失重** to remove gravity and restore the previous strength when toggled off.
- Pause, reverse gravity, or reset at any time. Reset restores sand and controls while preserving the chosen pause state.
- Focus the glass or dial and use arrow keys (5°, or 15° with Shift). Home straightens the focused glass or points the focused dial upward. End points the dial downward.
- Away from other controls: Space pauses, R reverses, Home resets.

Reduced-motion visitors start paused. Speaker output starts only when a demo sound is explicitly selected; the microphone is never routed to speakers. Microphone capture requires HTTPS or localhost; unavailable APIs fall back to holding the button. Explanation and collection panels use fully styled modal dialogs with focus management and Escape dismissal.

## Verify

```sh
npm test
npm run check
node dev/benchmark.js
```

Open `/?qa#liquid` for wave, touch, audio lifecycle and four-room checks (click its final test button for real demo audio), `/?qa#mirror` for mirror and four-exhibit navigation checks, `/?qa#bubble` for bubble/microphone checks, or `/?qa#hourglass` for the sand harness. These queries deliberately run test actions and reset the exhibits. Ordinary visits do not load the harness. Touch checks use synthetic `PointerEvent`s and do **not** emulate physical touch hardware or OS pointer capture.

The bubble harness injects microphone success/denial scenarios without requesting hardware access. `/dev/microphone-checks.html` tests a real Web Audio analyser using generated, silent-to-speakers audio; click its test button to supply the required user gesture. It verifies the signal pipeline, not a physical microphone.

`/dev/responsive.html?width=390&height=844` provides a fixed-size iframe for phone layout inspection; append `&exhibit=liquid`, `&exhibit=mirror` or `&exhibit=hourglass` to choose a room. It does not emulate a touch device.
For an injected permission-denial preview, append `&scenario=fallback`; it runs integration checks, then shows manual fallback without requesting a real microphone.

See [project status](docs/PROJECT_STATUS.md), [art direction](docs/ART_DIRECTION.md), [architecture](docs/EXHIBIT_ARCHITECTURE.md), and [verification evidence](docs/QUALITY_REPORT.md).

## Brand assets

`icon.svg`, `favicon.ico`, PNG favicon sizes and the Apple touch icon use the circular arrow mark. `assets/og.png` is a 1200 × 630 share card depicting the four completed toys. Open Graph, Twitter card and canonical metadata point to `https://yuuyuutube.github.io/tools/pocket-physics/`. Regenerate the raster assets and ICO on macOS with `swift dev/create-brand-assets.swift` from this project directory. Runtime use needs no Swift or image libraries.
