// Every safe in the Bureau shares one construction (enamel door, machined bezel, enamel dial,
// knurled knob) and differs only in finish, proportion and shape.

export const LOOKS = {
  standard: {
    name: '局標準型 B-1',
    door: '#22392F', doorLight: '#2C4A3D', doorDark: '#15241D', trim: '#B39256',
    face: '#EEE7D4', faceInk: '#1B1C1A', ring: '#22392F', ringInk: '#C9AA6B', knob: '#232524',
    shape: 'rect', scale: 1,
  },
  antique: {
    name: '古董型 1911',
    door: '#5A221B', doorLight: '#6E2C22', doorDark: '#3B1511', trim: '#C29B55',
    face: '#E9DFC6', faceInk: '#2A1A12', ring: '#5A221B', ringInk: '#D6B478', knob: '#2A1F1A',
    shape: 'rect', scale: 0.86,
  },
  vault: {
    name: '圓形金庫 R-7',
    door: '#5F676A', doorLight: '#79827F', doorDark: '#3D4446', trim: '#B9BDB7',
    face: '#E6E4DC', faceInk: '#17191A', ring: '#2E3437', ringInk: '#C7CBC4', knob: '#1E2224',
    shape: 'round', scale: 1,
  },
  lab: {
    name: '實驗室防護型 L-2',
    door: '#E2DED3', doorLight: '#EFECE4', doorDark: '#C6C1B3', trim: '#2B4C7E',
    face: '#F7F4EC', faceInk: '#1B2A44', ring: '#2B4C7E', ringInk: '#E6E2D6', knob: '#2C3440',
    shape: 'rect', scale: 0.94,
  },
  luxury: {
    name: '極致無用型 Ω',
    door: '#161616', doorLight: '#242322', doorDark: '#0A0A0A', trim: '#C9A55B',
    face: '#1E1D1B', faceInk: '#D9BE86', ring: '#0F0F0E', ringInk: '#C9A55B', knob: '#0E0E0E',
    shape: 'rect', scale: 1,
  },
  mini: {
    name: '迷你自衛型 m',
    door: '#E7DCC2', doorLight: '#F2E9D3', doorDark: '#C9BB98', trim: '#B2321F',
    face: '#FBF6EA', faceInk: '#B2321F', ring: '#B2321F', ringInk: '#FBF1DC', knob: '#B2321F',
    shape: 'rect', scale: 0.7, chunky: true,
  },
  sleepy: {
    name: '夜班型 N-3',
    door: '#2A3350', doorLight: '#354066', doorDark: '#1A2035', trim: '#C9B27A',
    face: '#E8E3D2', faceInk: '#1E2338', ring: '#2A3350', ringInk: '#C9B27A', knob: '#20253A',
    shape: 'rect', scale: 0.92,
  },
  retired: {
    name: '舊式 B-0（已退休）',
    door: '#6B6A52', doorLight: '#7B7A60', doorDark: '#4E4D3A', trim: '#A08A5C',
    face: '#DCD3BA', faceInk: '#3A3628', ring: '#57563F', ringInk: '#CDBE95', knob: '#3D3B2E',
    shape: 'rect', scale: 0.9, worn: true,
  },
  void: {
    name: '———',
    door: '#0D0E0D', doorLight: '#161816', doorDark: '#050605', trim: '#3B3E3A',
    face: '#121312', faceInk: '#121312', ring: '#0B0C0B', ringInk: '#2A2D29', knob: '#0A0B0A',
    shape: 'round', scale: 0.96, blank: true,
  },
};

export function lookOf(name) {
  return LOOKS[name] || LOOKS.standard;
}
