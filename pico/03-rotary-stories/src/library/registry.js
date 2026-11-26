// The catalogue. Adding a story = adding one entry here plus a folder under stories/.
// Only light things are imported up front (cover art); the story itself loads on demand.
import { coverSVG as cover001, spineSVG as spine001 } from '../../stories/001-earth-is-still-turning/cover.js';

export const CATALOGUE = [
  {
    id: '001-earth-is-still-turning',
    number: 'RS 001',
    title: '地球仍有四季',
    titleEn: 'Earth Is Still Turning',
    genre: '科幻短篇',
    length: '約 20 分鐘',
    status: 'ready',
    cover: cover001,
    spine: spine001,
    load: () => import('../../stories/001-earth-is-still-turning/manifest.js'),
  },
  { id: '002', number: 'RS 002', title: '明日停業', status: 'draft' },
  { id: '005', number: 'RS 005', title: '深度 11,000', status: 'draft' },
  { id: '007', number: 'RS 007', title: '第七封信', status: 'draft' },
];

export const byId = (id) => CATALOGUE.find((b) => b.id === id);

export function draftSpine(book) {
  return `<svg viewBox="0 0 44 600" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
  <rect width="44" height="600" fill="#C9B796"/>
  <text x="22" y="34" font-family="IBM Plex Mono, monospace" font-size="8" fill="#4A4234" text-anchor="middle">RS</text>
  <text x="22" y="46" font-family="IBM Plex Mono, monospace" font-size="8" fill="#4A4234" text-anchor="middle">${book.number.slice(3)}</text>
  <text x="22" y="80" font-family="Noto Serif TC, serif" font-weight="600" font-size="17" fill="#3A3328" writing-mode="tb" letter-spacing="3">${book.title}</text>
  <text x="22" y="470" font-family="Noto Serif TC, serif" font-size="11" fill="#7A6D57" writing-mode="tb" letter-spacing="2">籌備中</text>
</svg>`;
}
