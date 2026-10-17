// Rival Battle character drawings: flat line-art busts in inline SVG, one per story character. Rivals face you (front
// view); the fighter you play as is drawn from behind (BACK), nearer the camera, the way a monster-battle game shows
// the player.
// Every shape gets the dark outline from the stylesheet (.sprite svg), so the drawings read in light and dark mode.
// N4 and N3 rematches reuse the base drawing with a power aura in the rival's colour.

const SKIN = '#f2c9a0';
const INK = '#1d1a24';

const ART = {
  kaito: `
    <path d="M22 116 Q24 86 44 79 L76 79 Q96 86 98 116 Z" fill="#0f6b85"/>
    <path d="M50 79 L60 94 L70 79 Z" fill="#fffdf9"/>
    <rect x="52" y="66" width="16" height="15" fill="${SKIN}"/>
    <ellipse cx="60" cy="52" rx="20" ry="22" fill="${SKIN}"/>
    <path d="M38 52 L33 30 L44 36 L45 18 L54 29 L60 11 L66 29 L75 18 L76 36 L87 30 L82 52 Q72 38 60 39 Q48 38 38 52 Z" fill="#24324a"/>
    <path d="M39 45 Q60 36 81 45 L81 51 Q60 42 39 51 Z" fill="#c8321e"/>
    <path d="M81 46 L98 40 L93 50 Z" fill="#c8321e"/>
    <path d="M46 54 L56 57 M74 54 L64 57" fill="none" stroke-width="3.2"/>
    <ellipse cx="51" cy="61" rx="2.6" ry="3.2" fill="${INK}" stroke="none"/>
    <ellipse cx="69" cy="61" rx="2.6" ry="3.2" fill="${INK}" stroke="none"/>
    <path d="M53 69 Q60 72 68 66" fill="none" stroke-width="2.4"/>`,
  master: `
    <path d="M20 116 Q22 86 42 80 L78 80 Q98 86 100 116 Z" fill="#2f6b3a"/>
    <path d="M46 80 L60 100 L74 80 L66 80 L60 90 L54 80 Z" fill="#fffdf9"/>
    <rect x="52" y="66" width="16" height="15" fill="#e8b48c"/>
    <ellipse cx="60" cy="50" rx="20" ry="23" fill="#e8b48c"/>
    <circle cx="60" cy="24" r="6" fill="#a7adb3"/>
    <path d="M40 52 Q38 38 44 34 L44 52 Z M80 52 Q82 38 76 34 L76 52 Z" fill="#c9ced3"/>
    <path d="M45 49 Q50 44 57 48 L56 51 Q50 48 45 52 Z M75 49 Q70 44 63 48 L64 51 Q70 48 75 52 Z" fill="#fffdf9"/>
    <path d="M48 56 Q51 58 55 56 M65 56 Q69 58 72 56" fill="none" stroke-width="2.4"/>
    <path d="M44 61 Q60 98 76 61 Q68 68 60 66 Q52 68 44 61 Z" fill="#eef0f2"/>
    <path d="M50 63 Q60 58 70 63 Q60 66 50 63 Z" fill="#fffdf9"/>`,
  sora: `
    <path d="M28 116 Q30 92 46 86 L74 86 Q90 92 92 116 Z" fill="#e8742a"/>
    <path d="M48 86 Q60 96 72 86" fill="none" stroke-width="2.6"/>
    <rect x="53" y="74" width="14" height="13" fill="${SKIN}"/>
    <ellipse cx="60" cy="58" rx="22" ry="21" fill="${SKIN}"/>
    <path d="M37 58 Q34 34 52 30 L50 38 Q60 28 70 32 L68 38 Q86 36 83 58 Q78 46 70 45 L72 50 Q62 44 54 46 L56 50 Q44 46 37 58 Z" fill="#7a4a22"/>
    <ellipse cx="51" cy="61" rx="3.6" ry="4.4" fill="${INK}" stroke="none"/>
    <ellipse cx="69" cy="61" rx="3.6" ry="4.4" fill="${INK}" stroke="none"/>
    <circle cx="52.4" cy="59.4" r="1.3" fill="#fff" stroke="none"/>
    <circle cx="70.4" cy="59.4" r="1.3" fill="#fff" stroke="none"/>
    <path d="M52 69 Q60 77 68 69 Z" fill="#fffdf9" stroke-width="2.2"/>
    <path d="M73 66 L80 66 M76.5 63 L76.5 69" fill="none" stroke-width="2"/>`,
  kiku: `
    <path d="M22 116 Q24 88 44 82 L76 82 Q96 88 98 116 Z" fill="#6a4c93"/>
    <path d="M44 116 L46 92 L74 92 L76 116 Z" fill="#fffdf9"/>
    <path d="M48 82 L60 96 L72 82" fill="none" stroke-width="2.6"/>
    <rect x="52" y="68" width="16" height="15" fill="#efc29c"/>
    <ellipse cx="60" cy="53" rx="20" ry="22" fill="#efc29c"/>
    <circle cx="60" cy="25" r="9" fill="#d5d8dc"/>
    <path d="M39 55 Q38 32 60 31 Q82 32 81 55 Q76 40 60 40 Q44 40 39 55 Z" fill="#d5d8dc"/>
    <circle cx="51" cy="57" r="6.5" fill="none" stroke-width="2.2"/>
    <circle cx="69" cy="57" r="6.5" fill="none" stroke-width="2.2"/>
    <path d="M57.5 57 L62.5 57" fill="none" stroke-width="2"/>
    <path d="M47.5 58 Q51 55 54.5 58 M65.5 58 Q69 55 72.5 58" fill="none" stroke-width="2.2"/>
    <path d="M54 68 Q60 73 66 68" fill="none" stroke-width="2.4"/>
    <circle cx="45" cy="66" r="3" fill="#f2a6a0" stroke="none"/>
    <circle cx="75" cy="66" r="3" fill="#f2a6a0" stroke="none"/>`,
};


/** The fighters you can play as, drawn from behind (nearer the camera), the way a monster-battle game shows the player. */
const BACK = {
  // Ren: the headband knot and its tails, a dojo gi with the dojo's mark.
  ren: `
    <path d="M10 120 Q14 84 40 76 L80 76 Q106 84 110 120 Z" fill="#fffdf9"/>
    <circle cx="60" cy="102" r="10" fill="none" stroke-width="2.6"/>
    <path d="M55 102 L65 102 M60 96 L60 108" fill="none" stroke-width="2.4"/>
    <rect x="50" y="62" width="20" height="16" fill="${SKIN}"/>
    <ellipse cx="60" cy="44" rx="24" ry="26" fill="#2a2a35"/>
    <path d="M36 44 L30 26 L42 30 L44 14 L54 24 L60 8 L66 24 L76 14 L78 30 L90 26 L84 44 Z" fill="#2a2a35"/>
    <path d="M36 48 Q60 56 84 48 L84 54 Q60 62 36 54 Z" fill="#e0a020"/>
    <path d="M58 56 L44 76 L50 78 L60 60 Z M62 56 L74 78 L80 74 L64 58 Z" fill="#e0a020"/>
    <circle cx="60" cy="57" r="4" fill="#e0a020"/>`,
  // Aoi: a long ponytail with a ribbon, a navy dojo top.
  aoi: `
    <path d="M10 120 Q14 84 40 76 L80 76 Q106 84 110 120 Z" fill="#26407a"/>
    <path d="M44 76 L60 92 L76 76" fill="none" stroke-width="2.6"/>
    <rect x="50" y="62" width="20" height="16" fill="${SKIN}"/>
    <ellipse cx="60" cy="44" rx="23" ry="25" fill="#3a2418"/>
    <path d="M54 50 Q46 74 52 104 Q60 112 68 104 Q74 74 66 50 Z" fill="#3a2418"/>
    <path d="M50 46 L60 52 L70 46 L70 56 L60 52 L50 56 Z" fill="#e0457b"/>
    <circle cx="60" cy="52" r="3.6" fill="#e0457b"/>`,
  kaito: `
    <path d="M10 120 Q14 84 40 76 L80 76 Q106 84 110 120 Z" fill="#0f6b85"/>
    <rect x="50" y="62" width="20" height="16" fill="${SKIN}"/>
    <ellipse cx="60" cy="44" rx="24" ry="26" fill="#24324a"/>
    <path d="M36 46 L28 26 L42 30 L42 12 L54 24 L60 4 L66 24 L78 12 L78 30 L92 26 L84 46 Z" fill="#24324a"/>
    <path d="M36 48 Q60 56 84 48 L84 54 Q60 62 36 54 Z" fill="#c8321e"/>
    <path d="M58 56 L40 72 L46 76 L60 60 Z M62 56 L82 70 L84 64 L64 57 Z" fill="#c8321e"/>`,
  sora: `
    <path d="M18 120 Q22 90 42 84 L78 84 Q98 90 102 120 Z" fill="#e8742a"/>
    <path d="M38 88 Q60 112 82 88 Q60 96 38 88 Z" fill="#cf6220"/>
    <rect x="51" y="70" width="18" height="15" fill="${SKIN}"/>
    <ellipse cx="60" cy="54" rx="24" ry="23" fill="#7a4a22"/>
    <path d="M38 60 L32 50 L40 48 L36 38 L46 40 L46 30 L56 36 L60 26 L66 36 L76 30 L76 40 L86 38 L82 48 L90 50 L82 60 Z" fill="#7a4a22"/>`,
  master: `
    <path d="M10 120 Q14 84 40 76 L80 76 Q106 84 110 120 Z" fill="#2f6b3a"/>
    <path d="M40 76 Q60 86 80 76 L80 82 Q60 92 40 82 Z" fill="#fffdf9"/>
    <rect x="50" y="62" width="20" height="16" fill="#e8b48c"/>
    <ellipse cx="60" cy="44" rx="23" ry="25" fill="#e8b48c"/>
    <path d="M37 46 Q38 64 60 66 Q82 64 83 46 Q78 58 60 58 Q42 58 37 46 Z" fill="#c9ced3"/>
    <circle cx="60" cy="20" r="7" fill="#a7adb3"/>`,
  kiku: `
    <path d="M10 120 Q14 86 40 78 L80 78 Q106 86 110 120 Z" fill="#6a4c93"/>
    <path d="M44 104 Q36 96 40 90 Q50 92 60 100 Q70 92 80 90 Q84 96 76 104 Q68 108 60 102 Q52 108 44 104 Z" fill="#fffdf9"/>
    <rect x="50" y="64" width="20" height="16" fill="#efc29c"/>
    <ellipse cx="60" cy="46" rx="23" ry="24" fill="#d5d8dc"/>
    <circle cx="60" cy="24" r="11" fill="#d5d8dc"/>
    <path d="M52 22 L70 18" fill="none" stroke-width="2.6"/>`,
};

/** The base character a rival is drawn as: kaito4 and kaito3 are Kaito. */
export function artId(id) {
  const base = String(id || '').replace(/[0-9]+$/, '');
  return ART[base] ? base : 'kaito';
}

/**
 * Finished artwork, when there is some: base id (or 'kaito-back' and so on for a fighter seen from behind) -> image path (relative, e.g. 'img/rivals/kaito.png', a square PNG
 * with a transparent background; rivals facing you, fighters from behind). A character listed here shows its image in place
 * of the line drawing.
 */
export const ART_IMAGES = {};

/** A character drawing. `power`: the N4/N3 rematch aura. `label`: an accessible name (else decorative). */
export function sprite(id, { power = false, label = '', cls = '', back = false } = {}) {
  const base = back ? (BACK[id] ? id : 'ren') : artId(id);
  const key = back ? `${base}-back` : base;
  const alt = label ? `alt="${label.replace(/"/g, '&quot;')}"` : 'alt="" aria-hidden="true"';
  if (ART_IMAGES[key]) return `<img class="sprite-img ${power ? 'powered' : ''} ${cls}" src="${ART_IMAGES[key]}" ${alt} draggable="false">`;
  const aura = power ? `<g class="sprite-aura" stroke="none"><ellipse cx="60" cy="62" rx="56" ry="56" fill="currentColor" opacity=".16"/>
    <path d="M60 2 L66 22 L80 6 L80 28 L98 16 L92 38 L114 32 L100 50 L54 50 L20 50 L6 32 L28 38 L22 16 L40 28 L40 6 L54 22 Z" fill="currentColor" opacity=".28"/></g>` : '';
  const a11y = label ? `role="img" aria-label="${label.replace(/"/g, '&quot;')}"` : 'aria-hidden="true"';
  return `<svg class="sprite-svg ${cls}" viewBox="0 0 120 120" ${a11y} focusable="false">
    <ellipse class="sprite-ground" cx="60" cy="114" rx="50" ry="7" stroke="none"/>${aura}<g class="sprite-body">${back ? BACK[base] : ART[base]}</g></svg>`;
}
