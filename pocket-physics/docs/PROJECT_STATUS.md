# Project status

Updated: 2026-11-17 (Asia/Taipei).

## Completed stages

- **Stage 0:** shared identity, dependency-free stack and exhibit lifecycle.
- **Stage 1:** Reverse Hourglass, blue / fluorescent pink.
- **Stage 2:** Unbreakable Bubble, mint / violet; microphone-first blowing with held-button fallback only when capture is unavailable.
- **Stage 3:** Fourth-Dimension Mirror, navy / lemon. Genuine 4D transformations now appear on a character facing a mirror, with a faint tesseract as geometric reference.
- **Stage 4:** Singing Liquid, Retro Printer ultra `#0078bf` / orange `#ff801e`, on ice blue `#edf6fc`. Microphone and two generated demo sounds drive a simulated wave surface. Mouse, two-pointer touch and keyboard can also excite it.
- **Stages 5–6:** not started. Endless Fold and final collection polish require separate authorization.

The original brief is preserved at project-root `prompt.md`; the requested `docs/prompt.md` was not present. This turn authorizes and completes Stage 4 only.

## Verified features

- Four rooms retain independent state and pause choices. Header cycling, direct collection selection, hash links and browser history work. Only the active surface is attached; inactive rooms freeze.
- Singing Liquid uses a 65 × 65 circular height/velocity field at 120 fixed steps/s. Touch impulses and amplitude/spectral excitation act on the same field; waves propagate, reflect, interfere and dissipate. A smooth WebGL mesh renders actual heights and normals, with a simpler Canvas 2D fallback.
- Microphone capture is explicit, local and never connected to speakers. Demo oscillators feed a real analyser and an independently mutable speaker gain. Denial/device failure leaves demos and touch available. Pause, reset, panels, hiding, blur, switching and disposal stop audio. Returning never autoplays.
- **36 automated tests pass**, including eight new wave/audio tests and all previous sand, bubble, microphone and geometry tests. The new wave model passed one simulated minute of extreme input.
- Browser integration: **28 liquid, 29 mirror, 29 bubble/microphone and 15 sand checks pass**. This includes synthetic two-pointer input, actual demo Web Audio analysis, injected microphone success/denial, stale permissions, independent room state, GPU pixels, Canvas fallback pixels and resource cleanup.
- Actual mouse dragging and keyboard/source controls were exercised. Desktop 1280 × 800, phone 390 × 844 and narrow 320 × 740 layouts were inspected; both phone widths have no horizontal overflow and the transport controls remain visible.
- Liquid timing evidence and test transcript: `docs/liquid-browser-checks.txt`; visual evidence: `docs/preview-liquid-desktop.jpg` and `docs/preview-liquid-mobile.jpg`.

## Limits

The liquid is a damped height-field wave model with artistic audio-frequency mapping, not full fluid dynamics or an exact cymatics experiment. Spectral centroid is not fundamental-pitch detection. Its isometric contact mapping uses the resting surface plane. Canvas fallback shading is simpler than WebGL. GPU context restoration is implemented but not exercised through forced loss.

The mirror is a character projection with genuine 4D rotations, not a physical higher-dimensional optical mirror. The earlier toys remain stylized 2D models.

Physical microphone hardware, physical iOS/Android touch, Safari/Firefox and screen-reader sessions remain unverified. Browser touch checks are synthetic; generated demo audio uses the real browser Web Audio pipeline. Performance measurements reflect this host and browser, not a portable device guarantee.

## Next action

Stable Stage 4 checkpoint. A separately authorized Stage 5 should add Endless Fold with another distinct non-earth-tone Retro Printer ink pair. Preserve the four-room lifecycle, resource cancellation and all regression checks.

## Handoff

Start with `README.md`. No installation is needed. `npm run dev` serves the project; `/#liquid` opens the newest toy. `npm test` checks all models; `npm run check` parses application/development modules. `/?qa#liquid` runs integration checks, then exposes an explicit button for the real demo-audio test. Existing `/?qa#mirror`, `/?qa#bubble` and `/?qa#hourglass` harnesses remain available. QA URLs deliberately manipulate and reset exhibits.

No deployment or parent tools-index change is included. The preview server owned by this session is stopped at teardown.

## Brand assets
Favicon SVG/ICO/PNG variants, an opaque 180 px Apple touch icon, and a 1200 × 630 Open Graph illustration are complete. Canonical, Open Graph and Twitter metadata use the repository owner’s GitHub Pages URL. `dev/create-brand-assets.swift` reproduces these assets on macOS. Brand assets were visually inspected and their dimensions, ICO entries and HTML references checked before the requested project commit.
