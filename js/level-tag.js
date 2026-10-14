// JLPT levels the app offers, and the tag every piece of content carries. No imports, so any data file can use it
// (js/levels.js builds on it: which levels are unlocked, and each mode's content for them).

/** Levels with content in the app, easiest first. A new level goes at the end, and every mode must cover it. */
export const APP_LEVELS = ['N5', 'N4', 'N3'];

/** Gives every item in `list` a `level` (unless it already has one) and returns the list. */
export function tagLevel(list, level) {
  for (const x of list) if (x && typeof x === 'object' && !x.level) x.level = level;
  return list;
}

/** An item's level: its tag, or N5 for anything older than the tag. */
export const levelOf = (x) => (x && x.level) || 'N5';

/** The level after `level` (null at the top). */
export const nextLevel = (level) => APP_LEVELS[APP_LEVELS.indexOf(level) + 1] || null;
/** The level before `level` (null for the first). */
export const prevLevel = (level) => APP_LEVELS[APP_LEVELS.indexOf(level) - 1] || null;
