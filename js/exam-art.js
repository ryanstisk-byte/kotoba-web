// Line-art pictures for the mock JLPT's listening questions: picture options (課題理解) and situation scenes
// (発話表現). Original drawings in the site's icon style (round 2px strokes in the text colour, so they follow light and
// dark mode). Single pictures reuse the app's icons (js/icon-art.js) and add a few more here.
import { ICON_ART } from './icon-art.js';

/** Extra 24x24 drawings the exam's pictures need. */
const EXTRA = {
  bag: '<path d="M4 9h16l-1.5 11h-13Z"/><path d="M8.5 9V7a3.5 3.5 0 0 1 7 0v2"/>',
  hat: '<path d="M2.5 16.5c3 1.7 16 1.7 19 0"/><path d="M6 16.5c0-6 1.8-9.5 6-9.5s6 3.5 6 9.5"/><path d="M6.4 13.5h11.2"/>',
  shirt: '<path d="M8.5 3.5L3 6.5l2 4 2.5-1.2V20.5h9V9.3l2.5 1.2 2-4-5.5-3c-.8 1.6-2 2.4-3.5 2.4S9.3 5.1 8.5 3.5Z"/>',
  glasses: '<circle cx="6.5" cy="13" r="3.5"/><circle cx="17.5" cy="13" r="3.5"/><path d="M10 12.5q2-1.5 4 0"/><path d="M3 13L2 9"/><path d="M21 13l1-4"/>',
  bicycle: '<circle cx="5.5" cy="16" r="3.5"/><circle cx="18.5" cy="16" r="3.5"/><path d="M5.5 16L9.5 9h6.5l2.5 7"/><path d="M9.5 9L12 16l4-7"/><path d="M8.5 6.5h3"/><path d="M15 6.5h2.5l-1.5 2.5"/>',
  car: '<path d="M3 16v-3.5l2-4.5h14l2 4.5V16Z"/><path d="M6.5 12.5l1.2-3h8.6l1.2 3Z"/><circle cx="7" cy="17" r="2"/><circle cx="17" cy="17" r="2"/>',
  plane: '<path d="M2.5 13.5l7-1.5 3.5-8h2l-1.5 7.5 6-1.3c1.5-.3 2.5 1.8 0 2.3l-6 1.3 1.5 6.5h-2L9 14l-6.5.7Z"/>',
  fish: '<path d="M3 12c3-4.5 9-5.5 13 0-4 5.5-10 4.5-13 0Z"/><path d="M16 12l5-3.5v7Z"/><circle cx="7" cy="11" r=".8" fill="currentColor" stroke="none"/>',
  coffee: '<path d="M4 9h12v6a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5Z"/><path d="M16 11h1.5a2.5 2.5 0 0 1 0 5H16"/><path d="M8 3.5q1 1.5 0 3"/><path d="M12 3.5q1 1.5 0 3"/>',
  ball: '<circle cx="12" cy="12" r="9"/><path d="M12 3c-3 3-3 15 0 18"/><path d="M3 12h18"/><path d="M5 6.5c4 2 10 2 14 0"/><path d="M5 17.5c4-2 10-2 14 0"/>',
  chair: '<path d="M7 3v18"/><path d="M7 12h10v9"/><path d="M7 12V3h3v9"/><path d="M7 16h10"/>',
  flower: '<circle cx="12" cy="8" r="2"/><path d="M12 6c-1.5-3.5 3-3.5 1.5 0M14 8c3.5-1.5 3.5 3 0 1.5M12 10c1.5 3.5-3 3.5-1.5 0M10 8c-3.5 1.5-3.5-3 0-1.5"/><path d="M12 10v11"/><path d="M12 16c2-2.5 4.5-2.5 5-2-0.5 2.5-3 3-5 2"/>',
  key: '<circle cx="7" cy="12" r="4"/><path d="M11 12h10"/><path d="M17 12v3"/><path d="M20 12v4"/>',
  camera: '<path d="M3 8h4l1.5-2.5h7L17 8h4v11H3Z"/><circle cx="12" cy="13.5" r="3.5"/>',
};

/** Every picture the exam can show by name. */
export const PICTURES = { ...ICON_ART, ...EXTRA };

/** One picture as an SVG (a named image for screen readers when `label` is given). */
export function pictureSVG(name, { label = '', cls = '' } = {}) {
  const art = PICTURES[name];
  if (!art) return '';
  const a11y = label ? `role="img" aria-label="${label.replace(/"/g, '&quot;')}"` : 'aria-hidden="true"';
  return `<svg class="exam-pic ${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" ${a11y}>${art}</svg>`;
}

/** Simple backgrounds for situation scenes, in a 200x120 box (the floor is at y=108). */
const PLACES = {
  shop: '<path d="M126 108V78h66v30"/><path d="M126 78h66"/><path d="M8 20h56M8 40h56M8 60h56"/><path d="M8 14v62M64 14v62"/><rect x="14" y="26" width="8" height="12" rx="1"/><rect x="28" y="28" width="10" height="10" rx="5"/><rect x="44" y="48" width="12" height="10" rx="1"/>',
  restaurant: '<path d="M70 82h60"/><path d="M80 82v26M120 82v26"/><path d="M92 76h16"/><path d="M95 76q5-8 10 0"/><path d="M150 22h36v26h-36Z"/><path d="M155 30h26M155 37h20"/>',
  classroom: '<rect x="40" y="10" width="120" height="44" rx="2"/><path d="M48 60h104"/><path d="M60 24h40M60 34h60"/><path d="M168 108V70h24v38"/>',
  station: '<path d="M0 98h200"/><path d="M0 104h200"/><rect x="128" y="34" width="70" height="44" rx="6"/><path d="M134 46h16v14h-16ZM156 46h16v14h-16ZM178 46h14v14h-14Z"/><path d="M20 98V30"/><rect x="8" y="16" width="24" height="14" rx="2"/>',
  home: '<path d="M10 54l40-34 40 34"/><path d="M18 48v60M82 48v60"/><rect x="38" y="66" width="24" height="42"/><path d="M140 30h46v34h-46Z"/><path d="M163 30v34M140 47h46"/>',
  street: '<path d="M0 100h200"/><path d="M20 108l14-8M60 108l14-8M100 108l14-8M140 108l14-8M180 108l14-8"/><path d="M176 100V30"/><path d="M160 30h34l6 7-6 7h-34Z"/><path d="M14 100V58h30v42"/><path d="M14 58l15-14 15 14"/>',
  office: '<path d="M120 80h72"/><path d="M128 80v28M184 80v28"/><rect x="138" y="54" width="34" height="22" rx="2"/><path d="M155 76v4"/><path d="M14 18h40v30h-40Z"/><path d="M14 33h40M34 18v30"/>',
  park: '<path d="M0 108h200"/><circle cx="170" cy="40" r="22"/><path d="M170 62v46"/><path d="M14 92h52M20 92v16M60 92v16M14 84h52"/><path d="M90 108q4-10 8 0M104 108q4-10 8 0"/>',
  library: '<path d="M8 12h70v96H8Z"/><path d="M8 36h70M8 60h70M8 84h70"/><path d="M16 14v20M22 14v20M30 16v18M38 14v20M48 38v20M54 38v20M62 40v18M18 62v20M26 62v20M44 62v20M70 62v20"/><path d="M150 80h44M158 80v28M186 80v28"/>',
  hospital: '<path d="M150 18h40v40h-40Z"/><path d="M170 26v24M158 38h24"/><path d="M10 90h60v-12h-60Z"/><path d="M10 90v18M70 90v18"/><path d="M14 78q6-8 16-2"/>',
  door: '<path d="M140 108V14h46v94"/><circle cx="178" cy="62" r="2.5"/><path d="M14 30h36v30h-36Z"/><path d="M14 45h36M32 30v30"/>',
};

const person = (x, flip = false) => `<g transform="translate(${x} 0)${flip ? ' scale(-1 1)' : ''}">
  <circle cx="0" cy="44" r="9"/><path d="M0 53v30"/><path d="M0 62l-13 12M0 62l13 10"/><path d="M0 83l-9 25M0 83l9 25"/></g>`;

/**
 * A situation scene: two people at a place, an arrow over the one who speaks, and up to two props between them.
 * `scene`: { place, props: [picture names], arrow: 'left' | 'right' }.
 */
export function sceneSVG(scene, { label = '' } = {}) {
  const place = PLACES[scene.place] || '';
  const lx = 66, rx = 134;
  const ax = scene.arrow === 'right' ? rx : lx;
  const props = (scene.props || []).slice(0, 2).map((name, i) => {
    const art = PICTURES[name];
    if (!art) return '';
    const x = (scene.props.length === 1 ? 88 : 76 + i * 26);
    return `<g transform="translate(${x} 70) scale(1)">${art}</g>`;
  }).join('');
  const a11y = label ? `role="img" aria-label="${label.replace(/"/g, '&quot;')}"` : 'aria-hidden="true"';
  return `<svg class="exam-scene" viewBox="0 0 200 120" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" ${a11y}>
    <g class="exam-scene-place">${place}</g>
    ${person(lx)}${person(rx, true)}
    <g class="exam-scene-props">${props}</g>
    <path class="exam-arrow" d="M${ax} 8v18M${ax - 6} 20l6 7 6-7" stroke-width="3"/>
  </svg>`;
}
