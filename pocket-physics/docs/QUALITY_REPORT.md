# Quality report

Verified on 2026-11-16 (Asia/Taipei).

## Stage 3: Fourth-Dimension Mirror

`npm test`: **28 passed, 0 failed**, including all existing toys and microphone behavior. Eight new tests check exact tesseract topology, all six 4D rotation-plane invariants, genuine fourth-coordinate perspective, the distinction between 3D viewing and 4D orientation, finite projections at both depth extremes, exact animated/immediate quarter-turns, ten-minute stability, and complete deterministic reset. Application/development JavaScript passes `npm run check`.

`/?qa#mirror`: **28 integration checks passed**. The harness verifies keyboard changes to actual 4D vertices, preserved 4D coordinates in 3D mode, selected-state semantics, touch drag/cancellation, two-pointer depth/twist, precise sliders, wheel limits, completion of an exact quarter-turn, pause retention, frozen inactive time, microphone inactivity on entering the bubble, all three navigation targets, independent retained state, 36 repeated room switches, unique IDs, one attached canvas, notes/focus, disposal, reset, live motion and overflow.

Actual mouse dragging changed the 4D angle and visible projection while pausing automatic movement. Desktop (1280 × 720) and phone (390 × 844 and 320 × 740) layouts, optical material and controls were inspected. Phone checks use fixed-size iframe viewports. At 320 × 740 the document remained 320 px wide and transport controls ended at y=686, above the fold; at 390 × 844 they ended at y=780. All primary text colors exceed 4.5:1 against the navy ground (lemon 9.60:1, light text 10.84:1, secondary text 6.68:1). Touch gestures were tested with synthetic events; physical touch hardware is not emulated. The existing bubble/microphone harness passed all 29 checks and the hourglass harness passed all 15 checks after this integration.

| Mirror measurement | Average | 95th percentile |
| --- | ---: | ---: |
| Geometry update + projection, 240 samples | 0.002 ms | <0.100 ms |
| Canvas command submission, 240 samples | 0.075 ms | 0.100 ms |
| Live frame interval, 90 samples | 8.333 ms | 9.300 ms |

Measurements are from embedded Chromium at 1280 × 720 on this machine. Very short geometry samples are quantized by browser timer resolution; zero-valued samples do not mean zero computation. Command submission is not a separate measurement of all GPU/compositor work. The underlying 16 vertices, 32 edges and 24 faces remain fixed in count. Scene rendering stops when hidden, paused or inactive; an explicitly requested finite flip can finish while automatic rotation is paused.

The circular aperture and surface shading are artistic rendering. Underlying four-dimensional rotations and projections are mathematical; the work does not claim literal access to another dimension, exact 4D optics or transparent-face intersection ordering. Evidence: [mirror desktop](preview-mirror-desktop.jpg), [mirror phone](preview-mirror-mobile.jpg), [three-exhibit collection](preview-collection.jpg). Earlier sections below describe their respective verification checkpoints.

## Microphone-first revision

`npm test`: **20 passed, 0 failed**. Added microphone tests verify explicit activation, local analysis without speaker output, silence/DC rejection, monotonic input intensity, denied/missing/unreadable devices, unsupported APIs, retry, duplicate requests, interrupted devices, cleanup and late permission grants after suspension. The membrane test also verifies that stronger microphone input produces more inflation.

`/?qa#bubble`: **29 checks passed**. Eight new integration checks verify that microphone activation is primary, successful capture replaces holding, manual input is ignored while microphone capture is available, analysed samples drive actual membrane pressure, leaving stops capture, returning stays idle, denial enables holding, and retry restores microphone mode. These use injected capture outcomes; they do not access hardware.

`/dev/microphone-checks.html`: **6 checks passed** with a real AudioContext, MediaStreamAudioDestination stream, and AnalyserNode. Generated broadband input was detected and increased actual simulated area; silence did not inflate, stopping input cleared the signal, and stopping capture ended every track and closed the consumer context. No hardware permission, speaker output, recording or upload is involved in this test. Physical microphone response and real permission UI have not been tested.

The UI was inspected with the microphone enable action as the default, including a 390 × 844 phone viewport. The injected denial scenario also passed the integration harness at 320 × 740 and was visually inspected: [fallback phone view](preview-microphone-fallback.jpg). Fallback retains mouse, touch and Space/Enter holding, and explains the capture failure in the footer; a retry icon restores microphone mode. Existing Stage 2 results below describe the earlier baseline; current screenshots show the microphone control. Sound-energy mapping can also respond to speech or loud ambient sound; the interface notes disclose that limitation.

## Stage 2: Unbreakable Bubble

`npm test`: **12 passed, 0 failed** — six existing sand-model tests and six new membrane-model tests. New tests verify rest-area preservation, meaningful two-point stretching and recovery, pressure-driven inflation/deflation, membrane contact separation, a one-minute five-bubble stress sequence, and deterministic complete reset. `npm run check` validates all application and development JavaScript modules.

`/?qa#bubble`: **21 integration checks passed**. These cover simultaneous touch pointers, cancellation, actual node displacement, held pressure, keyboard press/release, elasticity, the five-bubble limit, inactive animation suspension, retained independent state, 30 repeated exhibit switches, exactly one attached canvas, unique IDs, modal suspension, focus restoration, disposal, reset, live animation and horizontal overflow. `/?qa#hourglass` also passed all **15 hourglass regression checks** after navigation integration.

Actual mouse dragging visibly deformed the membrane. Holding the blow control enlarged the cluster and releasing it stopped pressure input. Desktop (1280 × 720 and 1280 × 900) and phone (390 × 844 and 320 × 740) layouts, room-color changes, collection entries, reset and focus feedback were visually inspected. At 320 × 740 the document width remained 320 px and the transport controls ended at y=686, above the fold. Phone layouts use fixed-size same-origin iframe viewports; they are CSS/layout verification, not physical-device emulation. Synthetic touch checks test the shared Pointer Events handlers and two simultaneous grabs; actual iOS/Android touch hardware remains unverified.

| Bubble measurement | Average | 95th percentile |
| --- | ---: | ---: |
| Simulation step, 240 samples | 0.128 ms | 0.200 ms |
| Canvas command submission, 240 samples | 0.022 ms | 0.100 ms |
| Live frame interval, 90 samples | 8.337 ms | 9.300 ms |

Browser sample: embedded Chromium, 1280 × 720, 56 nodes per bubble, three bubbles at reset and a maximum of five. Performance numbers describe this machine and command submission; they do not independently measure all compositor work or guarantee physical-phone performance. Both simulations stop when their room is inactive.

The bubble room uses Retro Printer's mint `#82d8d5` and violet `#765ba7` pair with a mint-white ground. This is deliberately distinct from the sand room's blue and fluorescent pink. Current evidence: [bubble desktop](preview-bubble-desktop.jpg), [bubble phone](preview-bubble-mobile.jpg), [collection](preview-collection.jpg). The bubble model intentionally uses bounded stretching, approximate 2D contacts, and a fictional weak return force. It does not claim exact soap-film physics, merging, splitting or rupture.

## Color revision

Recolored from the creator's local `tools/retro-printer` interface and ink palette: fluorescent pink (`#ff48b0`) sand, blue (`#3255a4`) title and controls, cool white (`#f4f5f8`) ground, and transparent cool-blue/mint glass. The original earth tones have been replaced throughout the product, collection preview, dialog surfaces, and favicon. Desktop and phone renders were inspected again, including custom control states. JavaScript syntax checks passed. Simulation code and behavior were not changed for this revision; the behavioral results below are from the Stage 1 verification.

Text contrast on the cool-white ground: ink-black 16.76:1, blue 6.48:1, and secondary text above 4.5:1. Fluorescent pink is reserved for particles and visual indicators rather than small text. Preview screenshots below show the current palette.

## Automated simulation checks

`node --test tests/*.test.js`: **6 passed, 0 failed**, with the full 2,400-particle model.

1. Upward transfer through the neck, then return under reversed gravity (40 simulated seconds total).
2. Opposing lateral fields produce opposing center-of-mass displacement.
3. Zero acceleration preserves isolated stationary sand and damps residual momentum.
4. Turning the container preserves an unclipped grain's world-space position.
5. A simulated minute of rapid rotations and field strengths 0, 0.05, 1, and 2 keeps all grains finite and inside the vessel.
6. Reset restores every grain position, velocity history, angle, direction, and strength; repeated runs match deterministically.

The tests check simulated behavior and invariants rather than screenshots of a predetermined animation.

## Browser integration

`/?qa` completed **15 checks**, covering pause, full reset, keyboard rotation, touch-pointer rotation, gesture cancellation, touch dial input, zero gravity, restored force, reversal, dialog suspension, focus restoration, collection navigation, disposal, live animation, and overflow.

Synthetic touch checks temporarily replace `setPointerCapture` because browser-created events cannot acquire OS pointer capture. They validate shared touch event handlers and their effect on simulated state. They are not a physical-device test. Actual mouse dragging separately changed the vessel from −12° to 73° and the gravity dial from 0° to 102°.

## Performance

Measurements are observations from this machine, not guarantees on all mobile devices.

| Measurement | Average | 95th percentile |
| --- | ---: | ---: |
| Node simulation step, 2,400 samples | 1.056 ms | 1.338 ms |
| Browser simulation step, 300 samples | 0.771 ms | 1.000 ms |
| Browser Canvas submission, 300 samples | 0.301 ms | 0.400 ms |
| Live browser frame interval, 90 samples | 8.332 ms | 8.800 ms |

Browser sample: embedded Chromium, 1280 × 720 viewport, DPR 2. Canvas timings measure command submission and do not independently measure all GPU/compositor work. Live frame intervals include the normal animation loop. Fixed-step state updates remain independent of display refresh rate.

## Visual and interaction inspection

Actual rendered glass, particle materials, desktop composition, mobile controls, optional notes, mouse dragging, and reset were inspected in the app browser. Viewports checked: 320 × 740, 390 × 844, 768 × 1024, and 1280 × 900. No horizontal overflow was observed. At 320 × 740, all primary controls sit above the fold; the footer extends 10 px below it. The palette, grain scale, artwork clearance, small-screen control widths, and modal copy were refined from screenshots. The product uses SVG icons, custom controls, `user-select: none` on manipulation surfaces, and Pointer Events. Text explanations remain selectable. Captured evidence: [desktop](preview-desktop.jpg), [phone](preview-mobile.jpg).

Keyboard-focus outlines, slider semantics and labels, dialog focus management, and a reduced-motion initial pause are implemented. A screen-reader session and physical iOS/Android touch device have not been tested. No microphone or sound is used in Stage 1.

## Reproduce

```sh
npm test
npm run check
node dev/benchmark.js
npm run dev
```

Open `/?qa` for the development integration report. Re-run measurements after changing grain count, contact passes, rendering, or timestep. Later exhibits require their own independent quality checks.


## Stage 4 — Singing Liquid (2026-11-17)

- `npm run check` passes. The automated suite has **36 passing tests**, including eight new wave/audio tests. The new model is tested for propagation, energy decay, amplitude scaling, spectral source changes, deterministic reset, pinned boundaries and one simulated minute of extreme gestures/audio. Permission cancellation and denial remain covered without requesting hardware.
- The liquid browser harness passes **28 checks**. It verifies synthetic two-touch deformation, keyboard impulses, sliders, explicit mute state, injected successful and denied microphone capture, local spectral/amplitude analysis, modal/blur/pause resource release, four-room retention, disposal, deterministic reset, actual visible WebGL pixels and a visible Canvas fallback render. Its final user-gesture test starts real oscillators and a real analyser, reads nonzero audio features, preserves analysis while muting, closes the audio context on exit and proves no autoplay on return.
- Regression harnesses pass: **29 mirror**, **29 bubble/microphone**, **15 sand**. The mirror harness now follows the four-room cycle and repeated four-room caching. No duplicate active DOM IDs or extra attached canvases were observed.
- Native mouse dragging and source selection were exercised. Desktop 1280 × 800, phone 390 × 844 and narrow 320 × 740 were inspected. Scroll widths remain 390 and 320 respectively; transport bottom positions are 780/844 and 686/740. The four-item collection directly selects the new exhibit.
- Measured liquid simulation mean **0.037 ms**, p95 **0.1 ms**, at 65 × 65; frame interval mean **8.333 ms**, p95 **9 ms**, during a short real demo test on this host. Browser timer precision is coarse. The transcript also records render submission with a requested GPU finish; this is not a portable GPU benchmark. No device-wide performance claim is made.
- Evidence: [desktop](preview-liquid-desktop.jpg), [phone](preview-liquid-mobile.jpg), [browser transcript](liquid-browser-checks.txt).

The liquid uses Retro Printer ultra `#0078bf` and orange `#ff801e`. Amplitude controls excitation force, and spectral centroid controls its arrangement and slower visual frequency. The numerical model is a damped wave height field; it does not claim complete liquid dynamics or exact acoustic cymatics. The Canvas fallback is simpler. Forced GPU context loss/restoration, physical microphone hardware, physical touch devices, other browser engines and screen readers remain unverified. Generated audio verifies real Web Audio processing; microphone success/denial and track lifecycle are injected.

## Brand and sharing assets (2026-11-17)

The SVG mark and 16/32/48 px PNG favicon variants were generated with a multi-size ICO and an opaque 180 px Apple touch icon. The 1200 × 630 PNG Open Graph artwork was visually inspected alongside the 32 px favicon. HTML metadata includes absolute canonical/Open Graph URLs, dimensions, image alt text and Twitter large-image fields. Local file references, PNG dimensions and ICO payloads were checked. The local preview server serves PNG/JPEG/ICO with their image MIME types. Public social-crawler caching is not checked; no deployment or push is part of this commit task.
