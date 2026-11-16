# Art direction

## Fluorescent ink / cold glass

The color reference is the creator's `tools/retro-printer` interface and its `src/inks.js` ink palette. Fluorescent pink (`#ff48b0`) and blue (`#3255a4`) are its default inks; these become the two primary colors here. Cool white (`#f4f5f8`) replaces warm paper, with ink-black text (`#151514`) and neutral blue-grey dividers. Blue controls and title balance a concentrated fluorescent-pink sand mass. Sand variations use the reference's peach ink (`#d64080`) and tints of fluorescent pink, rather than metallic gold or earth colors.

Glass edges use the reference's ultramarine (`#0078bf`), blue, and mint (`#82d8d5`) in restrained transparent layers. Shadows are cool navy. Collection previews, dialogs, focus rings, status indicators, and the favicon use the same palette. The vessel remains a continuous blown-glass silhouette with thin reflected edges, translucent volume, elliptical rims, and a diffuse shadow. Sand is drawn at its simulated position; no prerecorded sand stream or ornamental particle layer exists.

The room is one generous interaction surface. The object owns the center, its Chinese name anchors the left, and the gravity instrument sits to the right. Narrow layouts stack the artwork above a compact two-column control area. Transport controls remain grouped below. The title uses a local Traditional Chinese serif face; controls use local system sans-serif. There are no font or image downloads.

## UI rules

- No exhibition slogans, eyebrow labels, decorative copy, emoji, or future-exhibit placeholders.
- Necessary instructions appear beside the interaction; scientific context is optional.
- Icons are small inline SVGs; playback and weightlessness have explicit accessible states.
- Field direction, glass angle, and gravity strength remain independently readable.
- Material shading follows the glass; state changes directly affect geometry and particle motion.
- Buttons, dial, and artwork prevent accidental selection; explanatory text remains selectable.
- Pointer capture supports mouse, pen, and touch. Browser scrolling remains available outside the artwork and dial.
- Range tracks, toggle, dialogs, focus rings, and buttons are authored styles. No native select, radio, checkbox, alert, or confirm UI is used.

This direction is a functional toy interface. Visual quality is judged from actual desktop and phone renders, rather than a claim of awards or exhibition status.

## A separate pigment pair for every room

| Exhibit | Retro Printer inks | Room ground | Material |
| --- | --- | --- | --- |
| Reverse Hourglass | Blue `#3255a4` × fluorescent pink `#ff48b0` | Cool white `#f4f5f8` | Cold glass and pink grains |
| Unbreakable Bubble | Mint `#82d8d5` × violet `#765ba7` | Mint white `#eef8f5` | Translucent mint membrane, violet edges, white reflections |
| Singing Liquid | Ultra `#0078bf` × orange `#ff801e` | Ice blue `#edf6fc` | Reflective blue wave surface, orange reflected rim |
| Fourth-Dimension Mirror | Navy `#263462` × lemon `#ffe800` | Navy `#263462` | Satin optical glass, lemon structural edges, cool transparent square faces |

The bubble uses mint and violet from Retro Printer’s ink collection. The bubble room changes the entire ground, title, controls, borders, shadows and optional panel palette. All collection entries retain their own colors so visitors can recognize the rooms before switching. Future rooms must select a different non-earth-tone combination from the same ink collection.

The bubble's closed silhouette, edge color and reflected arcs all follow its simulated membrane nodes. The material has no decorative sparkle layer or unrelated ambient wobble. A quiet cluster of three differently sized membranes makes the primary interaction visible; up to two more can be added. A small focus outline around the interaction hint provides keyboard feedback without framing the entire artwork.

The bubble breath control defaults to a microphone SVG and explicit enable action. While listening, the same circle shows the microphone state and a restrained level-responsive ring. Only unavailable capture changes it to the original held-breath action; a small microphone retry control appears in that state. No new decorative labels or permanent control panel were added.

The third room uses the existing `navy/lemon` pair from Retro Printer's `START_COLORS`. Its dark ground contrasts with the two light rooms. A thin-edged circular lens holds the projection; broad edge reflections and a diffuse shadow give it material presence. The 24 projected square faces receive restrained transparent shading, with lemon edges and cool bridges distinguishing structure. There are no glow effects, star fields, background particles or explanatory labels over the object. The 3D/4D switch changes the meaning of the same drag gesture, while two compact sliders expose exact angle and perspective distance.

The fourth room is a shallow blue liquid disc with a restrained orange edge reflection. Surface normals come from the simulated height field; waves change geometry and reflected light. There are no unrelated visualizer bars or decorative particles. Three compact source buttons distinguish live input and two audible demos; a thin orange level meter is functional feedback. The mobile arrangement keeps every source and both sliders within reach.
