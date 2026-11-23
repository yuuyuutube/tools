import { BLOOM_STYLES } from './bloom.js';

export const DEFAULT_PATTERN_STYLE = 'classic';

export const patternStyles = {
  kaleido: [
    { id: DEFAULT_PATTERN_STYLE, name: 'Chromatic Fold' },
    { id: 'enamel-window', name: 'Enamel Window' },
    { id: 'paper-star', name: 'Folded Star' },
  ],
  spiro: [
    { id: DEFAULT_PATTERN_STYLE, name: 'Plotter Plate' },
    { id: 'ribbon-orbit', name: 'Ribbon Orbit' },
    { id: 'celestial-etching', name: 'Celestial Etching' },
  ],
  optical: [
    { id: DEFAULT_PATTERN_STYLE, name: 'Kinetic Field' },
    { id: 'tidal-relief', name: 'Tidal Relief' },
    { id: 'moire-weave', name: 'Moiré Weave' },
  ],
  bloom: BLOOM_STYLES,
};

export function nextStyle(engine, current) {
  const styles = patternStyles[engine];
  const index = styles.findIndex(({ id }) => id === current);
  return styles[(index + 1) % styles.length].id;
}
