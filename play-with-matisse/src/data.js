// Canvas sizes and paper palettes.

// Print sizes are exact at 300 DPI (A4 210 × 297 mm, postcard 100 × 150 mm); the PNG carries a matching pHYs chunk.
export const SIZES = [
  { id: "square", w: 2048, h: 2048, label: "Square 1:1" },
  { id: "portrait", w: 1080, h: 1350, label: "Portrait 4:5" },
  { id: "story", w: 1080, h: 1920, label: "Story 9:16" },
  { id: "landscape", w: 1920, h: 1080, label: "Landscape 16:9" },
  { id: "postcard-p", w: 1181, h: 1772, label: "Postcard 100 × 150 mm", print: true, card: true },
  { id: "postcard-l", w: 1772, h: 1181, label: "Postcard 150 × 100 mm", print: true, card: true },
  { id: "a4-p", w: 2480, h: 3508, label: "A4 210 × 297 mm", print: true, a4: true },
  { id: "a4-l", w: 3508, h: 2480, label: "A4 297 × 210 mm", print: true, a4: true },
];
export const sizeById = (id) => SIZES.find((s) => s.id === id) || SIZES[0];
export const DPI = 300;

export const PALETTES = [
  { id: "jungle", label: "Tropical Jungle", colors: ["#1F5A3A", "#5FA83F", "#2A9D9A", "#F1C232", "#EC6A4C"] },
  { id: "ocean", label: "Ocean Garden", colors: ["#2552A3", "#3AA597", "#F2DD8C", "#EE9DB3", "#F5ECD9"] },
  { id: "autumn", label: "Autumn Leaves", colors: ["#B2462B", "#D8A32B", "#78782F", "#6A4228", "#F1E5CC"] },
  { id: "cutouts", label: "Colourful Cut-outs", colors: ["#1E3F9E", "#D5312B", "#F4C41A", "#2D8A4A", "#1B1B1B"] },
  { id: "mine", label: "My Colours", colors: null },
];
export const DEFAULT_MINE = ["#E2725B", "#F3B63F", "#7BB662", "#4F86C6", "#9C6ADE"];
export const NEUTRALS = ["#F4EEE1", "#FFFFFF"];
export const DEFAULT_BG = "#F4EEE1";

export const TEXTURES = ["smooth", "textured", "fibrous"];
