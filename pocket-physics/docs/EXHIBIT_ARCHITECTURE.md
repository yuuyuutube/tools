# Exhibit architecture

## Files and lifecycle

| File | Responsibility |
| --- | --- |
| `src/main.js` | Small exhibit registry, shell dialogs, page lifecycle, optional QA entry |
| `src/hourglass.js` | `ReverseHourglass` adapter, input handling, controls, fixed-step scheduler |
| `src/simulation.js` | DOM-free deterministic granular model |
| `src/renderer.js` | Canvas 2D material and grain rendering, viewport-to-artwork coordinates |
| `src/bubble.js` | Independent bubble lifecycle, simultaneous pointers, keyboard and pressure input |
| `src/bubble-simulation.js` | DOM-free membrane constraints, pressure, contacts and restoration |
| `src/bubble-renderer.js` | Deformed film surfaces and node-following reflections |
| `src/bubble-view.js` | Bubble controls and scientific notes |
| `src/microphone.js` | Permission/capture lifecycle, local RMS analysis, error fallback and late-result cancellation |
| `src/mirror.js` | Mirror lifecycle, drag spaces, simultaneous pointers, keyboard and finite flip transitions |
| `src/mirror-geometry.js` | Tesseract topology, Euclidean plane rotations and two-stage perspective |
| `src/mirror-renderer.js`, `src/mirror-view.js` | Optical aperture, projected surfaces, controls and notes |
| `src/style.css` | Shared UI, focus states, responsive layout, reduced-motion styling |
| `tests/simulation.test.js` | Physical behavior, containment, determinism, stress checks |
| `dev/browser-checks.js` | Browser integration, synthetic touch, cleanup, performance measurements |
| `tests/bubble.test.js`, `dev/bubble-checks.js` | Membrane behavior, multi-pointer controls, lifecycle and navigation checks |
| `tests/microphone.test.js`, `dev/microphone-checks.html` | Permission/device races, input mapping and generated-signal Web Audio checks |
| `tests/mirror.test.js`, `dev/mirror-checks.js` | Geometry invariants, stability, controls and four-exhibit navigation |

An exhibit implements `mount()`, `setActive(boolean)`, `reset()`, and `dispose()`. Its constructor owns independent state and renderer. The shell suspends it for modal panels and page visibility changes. Disposal cancels animation work, disconnects ResizeObserver, clears announcement timers, and aborts registered event listeners. There is one active animation chain. Browser back/forward restoration restarts only the active exhibit.

Each registry entry supplies a controller factory, markup, notes and theme. A `display: contents` surface holds its room and footer. Switching suspends and detaches the previous surface, then attaches the retained destination. The cache contains at most one controller per implemented exhibit. Inactive simulations schedule no frames; zero-size ResizeObserver notifications on detached canvases are ignored. DOM IDs remain unique because only one surface is attached. Hash navigation supports direct links and browser back/forward.

Future exhibits should receive their own modules, state, renderer, and markup, and enter the small registry. No speculative plugin framework is involved.

## Fictional law and numerical model

2,400 equal circular grains, radius 1.6 artwork units, use Verlet-style integration at **120 fixed steps per second**. A uniform world-space acceleration has an independently adjustable angle and magnitude (0–2 g, with 1 g defined as 330 artwork units/s²). The default vector points upward. Gravity is transformed into container-local coordinates before each step.

Rotating the glass counter-rotates both current and previous grain positions in its local frame, retaining world-space positions and velocities until contact with the moving boundary. Large pointer turns are subdivided into 0.04-radian increments to reduce wall tunnelling. The glass is an analytic, symmetric hourglass, with half-width `12 + 112 × sin(|y| / 218 × π/2)^1.3`. The renderer uses the same function as the collision model.

Three position-constraint passes separate neighboring grains. A typed-array spatial grid bounds neighbor searches. Wall contacts remove most normal velocity and add mild friction. Global damping dissipates momentum; setting gravity to zero therefore leaves grains suspended after residual motion decays. There are no hidden forces, invented vortex effects, or randomized outcomes presented as discoveries. The seed controls only initial grain jitter and tint.

This is a two-dimensional artistic granular approximation, not a physically exact model of real sand, air, frictional packing, or a three-dimensional glass vessel. A few small overlaps under dense packing are an intentional numerical approximation.

## Bubble membrane model

Each bubble has a closed ring of **56 simulated nodes**, updated at 120 Hz. Seven constraint passes combine adjacent edge lengths, softer four-node chords, and signed-area pressure. A controllable restoration force pulls toward an equal-area round silhouette. Mild damping dissipates motion. A weak home-position attraction keeps the cluster in reach; this and permanent unbreakability are explicitly fictional rules.

Microphone strength continuously adjusts the target area from 1× toward 1.45×. When capture is unavailable, press-and-hold supplies full strength. Releasing input returns area toward 1×. Elasticity changes constraint stiffness and restoration forces. Grabs apply weighted corrections to a seven-node neighborhood. Different pointer IDs can grab independent locations of the same or different membranes. Touch cancellation, lost capture, window blur, hidden pages, pause and exhibit changes clear transient grabs and blowing inputs.

## Microphone lifecycle

`MicrophoneBreath` has four states: idle, requesting, listening and fallback. An explicit button activation starts `getUserMedia` and resumes AudioContext within the user gesture. Permission denial, absent/unreadable devices, unsupported APIs, stream mute/end and audio-context interruption expose manual fallback. A retry action can restore microphone mode. Stopping an otherwise available microphone returns to idle, rather than exposing manual inflation.

The input source connects to a 1,024-sample AnalyserNode without a speaker connection. DC-corrected RMS, a quiet noise floor and short attack/release smoothing produce a 0–1 intensity. The existing exhibit frame loop samples it; no second animation chain is created. This measures input energy and does not claim to distinguish breath from speech.

Pause, reset, hidden/blurred pages, panels, exhibit switches and disposal stop all tracks, disconnect audio nodes, and close the context. A request-generation counter rejects late permission results and immediately stops their tracks. Returning to a room never automatically requests capture. Audio is neither recorded nor transmitted. Capture requires a secure context (HTTPS or localhost). References: [getUserMedia](https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getUserMedia), [time-domain analyser](https://developer.mozilla.org/en-US/docs/Web/API/AnalyserNode/getFloatTimeDomainData), [track stop](https://developer.mozilla.org/en-US/docs/Web/API/MediaStreamTrack/stop).

Contacts use polygon containment and nearest-edge projection to push intersecting membrane nodes apart. This is a bounded, approximate 2D soft-body model, not a real 3D soap-film solver. There is no merging, splitting, bubble rupture, or exact fluid mechanics. A fixed five-bubble limit bounds work. Rendering uses smooth closed paths through the computed vertices; specular arcs follow those same vertices instead of overlaying rigid circles.

## Four-dimensional geometry

The mirror starts with all 16 vectors in `{−1,+1}^4`. Bit-adjacent vertices form 32 edges; varying every pair of coordinate axes produces 24 square faces. Four-dimensional orientation is computed afresh from these source vertices through XW, YW and ZW plane rotations. Each rotation uses the usual orthogonal 2×2 cosine/sine block and preserves 4D pairwise distances. Angles are wrapped rather than accumulating changes in transformed vertices, preventing orientation drift.

Perspective maps `(x,y,z,w)` to `d/(d−w) × (x,y,z)`, then applies the user's 3D yaw/pitch/roll and projects to the display with `D/(D−z)`, `D=5.5`. Fourth-dimensional eye distance `d` is bounded to `[2.7,6]`; source norms are 2, so the camera does not cross a 4D vertex. The corresponding projected 3D radius stays below 3.1, clear of the 3D eye plane. The renderer uses a uniform screen-fit scale within a 207-unit aperture; geometry and perspective remain unchanged by viewport fitting.

In 4D drag mode, horizontal/vertical motion changes XW/YW; in 3D drag mode it changes only the orientation of the intermediate 3D projection. Two-pointer twist controls ZW or 3D roll; pinch controls 4D eye distance. Shift-drag, wheel and keyboard controls offer mouse/keyboard equivalents. Automatic movement respects the selected rotation space. The 120 Hz fixed update drives only angle changes and a finite 1.15-second XW quarter-turn; it is a geometric transformation, not a physical particle simulation. Reduced motion makes that explicit flip instantaneous.

Faces are depth-sorted transparent square patches, with edges colored by their original axis. This is a stylized rendering of a real 4D projection, not 4D ray tracing or a claim that a physical mirror accesses an additional dimension. It does not implement slicing, volumetric 4D lighting, or exact ordering of intersecting transparent projected faces. This does not change the underlying transformed geometry.

Mathematical reference: Yan, Fu and Hanson, [Multitouching the Fourth Dimension](https://homes.luddy.indiana.edu/hansona/papers/4Dice-mco2012090080.pdf), IEEE Computer, 2012. Its 4D-to-3D-to-display pipeline and distinction between spatial viewing and fourth-dimensional rotation informed the interaction; this project's geometry, controls and renderer are independently implemented.

## Runtime and resource choices

Dependency-free ES modules and browser APIs keep this checkpoint directly runnable from a static server. JavaScript with documented interfaces was chosen over a TypeScript build pipeline for this small local application. No CDN, image asset generator, audio permission, service worker, or backend is involved.

Simulation time catch-up is capped at 50 ms / six steps per frame. Inactive, hidden, and paused exhibits schedule no animation frames. Reduced-motion preference starts the toy paused. Device pixel ratio is capped at 2. Five material-color batches draw grains without individual DOM nodes. Grain buffers and spatial arrays are allocated once; steady-state simulation does not grow particle collections.

## Singing Liquid

`liquid-simulation.js` owns a 65 × 65 typed-array height/velocity field within a pinned circle. A 120 Hz finite-difference wave update uses wave speed 23 grid cells/s, damping controlled by persistence, and bounded velocities/heights. Pointer impulses and audio forcing act on the same field. Amplitude scales force; spectral centroid determines 2–6 source lobes, radius and a 1.2–5 Hz visual excitation frequency. Audio frequencies are deliberately mapped into a slower artistic motion.

`liquid-audio.js` reuses the existing permission-safe `MicrophoneBreath` resource owner for capture, without changing bubble behavior. It reads RMS amplitude and FFT magnitudes independently. Its two demos use sine oscillators and envelopes feeding the same analyser; a downstream master gain mutes speakers while preserving analysis. Capture never connects to the audio destination. Cancellation tokens reject stale microphone and context completions. Stop/dispose closes contexts, disconnects nodes and stops tracks/oscillators. Every restart requires a new explicit source selection.

`liquid-renderer.js` uploads the height field as a packed 16-bit RG texture and linearly samples it on a 128 × 128 WebGL mesh. Fragment normals drive authored blue/white/orange reflections. The lower cap does not occlude wave troughs. Context loss/restoration rebuilds GPU resources; disposal deletes buffers, textures and programs. `liquid-canvas-renderer.js` supplies a simpler Canvas 2D fallback when WebGL is unavailable. `liquid.js` owns pointer capture, keyboard controls, fixed-step scheduling, visibility and resource suspension. `liquid-view.js` provides markup and scientific notes. `tests/liquid.test.js` and `dev/liquid-checks.js` cover model and browser integration.

Web Audio behavior follows the [W3C Web Audio specification](https://www.w3.org/TR/webaudio/), particularly analyser frequency/time-domain data and oscillator source scheduling. Spectral peak is a measured strongest FFT bin, not a fundamental-pitch detector. No recording, network audio or external assets are used.
