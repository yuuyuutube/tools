// Ground, paper (lightest), and three inks. The first palette is the opening print.
export const palettes = [
  { id: 'moss-cyclamen', name: 'Moss Cyclamen', colors: ['#16180F', '#EDE6D4', '#D94F7E', '#B3A250', '#F1BBCB'] },
  { id: 'cocoa-bluebell', name: 'Cocoa Bluebell', colors: ['#2A1A14', '#F3ECE2', '#4664C6', '#AEC5E2', '#E8A07E'] },
  { id: 'sanguine', name: 'Sanguine', colors: ['#3A120F', '#F1E1D1', '#F1E1D1', '#B2665A', '#F1E1D1'] },
  { id: 'ash-cadmium', name: 'Ash Cadmium', colors: ['#24222B', '#EEEAF1', '#DB4A2D', '#A79BCB', '#F0C238'] },
  { id: 'bordeaux-pistachio', name: 'Bordeaux Pistachio', colors: ['#3A0F1E', '#F4EEDF', '#3C8A70', '#BCCB8F', '#E9B3A4'] },
  { id: 'prussian-celadon', name: 'Prussian Celadon', colors: ['#11203A', '#F2EDE3', '#B8573A', '#9DC4B5', '#E4D3A8'] },
  { id: 'opal-dusk', name: 'Opal Dusk', colors: ['#474B67', '#F7F2EC', '#8A6CC9', '#9CD2CC', '#F2CFA6'] },
  { id: 'klein-vermilion', name: 'Klein Vermilion', colors: ['#1E24A4', '#F4EFE3', '#F0583A', '#8F9BEE', '#F4EFE3'] },
  { id: 'candy-picnic', name: 'Candy Picnic', colors: ['#38204E', '#FFF3D9', '#DD5A91', '#4FAD9A', '#FFC76B'] },
  { id: 'velvet-eclipse', name: 'Velvet Eclipse', colors: ['#101722', '#EFE6DA', '#AB70A7', '#548D81', '#C29F69'] },
  { id: 'marigold-peacock', name: 'Marigold Peacock', colors: ['#082E34', '#FFF1C6', '#C44877', '#9AB047', '#F3AA2A'] },
  { id: 'lingonberry-wool', name: 'Lingonberry Wool', colors: ['#203731', '#F6EEE2', '#B74959', '#5F9385', '#AFC9E3'] },
  { id: 'persimmon-ink', name: 'Persimmon Ink', colors: ['#242A33', '#F6EAD5', '#C55A3A', '#85965A', '#9BB8C0'] },
].map((palette) => ({
  ...palette,
  rgb: new Float32Array(palette.colors.flatMap((color) =>
    [1, 3, 5].map((start) => parseInt(color.slice(start, start + 2), 16) / 255))),
}));
