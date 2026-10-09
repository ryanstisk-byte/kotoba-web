// Difficulty targeting: small, gentle adjustments that keep each mode near 85% first-try accuracy, worked out
// from the learner's recent first-try results per skill (the last 20, see skills.js). Pure: no DOM, no storage.
//
// Below ~75% a mode gets easier (slower Rhythm, hints shown up front, fewer new words). Above ~95% Rhythm and
// Speak Slice speed up a little. Nothing changes until there are at least 8 recent answers in that skill.
import { recentRate } from './skills.js';

export const NEW_CAP = 5;          // the hard daily cap on new garden words; targeting never goes above it
export const NEW_CAP_LESS = 3;     // "fewer new words" (Settings, or the weekly check-in)

/** New garden words allowed per day: up to 5 (or 3 on the gentler pace), fewer while vocabulary accuracy is low. */
export function newPerDay(engine, settings = {}) {
  const base = settings.pace === 'less' ? NEW_CAP_LESS : NEW_CAP;
  const r = recentRate(engine, 'vocab');
  let n = base;
  if (r != null && r < 0.7) n = base - 2;
  else if (r != null && r < 0.8) n = base - 1;
  return Math.max(1, Math.min(NEW_CAP, n));
}

/** Rhythm tempo multiplier from recent speaking accuracy: 0.85 when it's hard, 1.1 when it's too easy. */
export function rhythmSpeed(engine) {
  const r = recentRate(engine, 'speaking');
  if (r == null) return 1;
  if (r < 0.7) return 0.85;
  if (r < 0.8) return 0.92;
  if (r > 0.95) return 1.1;
  return 1;
}

/** Speak Slice: seconds between new flyers at the start of a round (the round still adapts as you play). */
export function sliceSpawn(engine, quiet = false) {
  const r = recentRate(engine, quiet ? 'vocab' : 'speaking');
  if (r == null) return 3.4;
  if (r < 0.75) return 4.0;
  if (r > 0.95) return 3.0;
  return 3.4;
}

/** Show the hint up front (Forge story hint, Story meaning on choice lines) while that skill is below ~75%. */
export function earlyHint(engine, skill) {
  const r = recentRate(engine, skill);
  return r != null && r < 0.75;
}

/** Everything at once, for the Progress screen ("what the app is adjusting for you"). */
export function knobs(engine, settings = {}) {
  return {
    newPerDay: newPerDay(engine, settings),
    rhythmSpeed: rhythmSpeed(engine),
    sliceSpawn: sliceSpawn(engine, settings.quiet),
    forgeHint: earlyHint(engine, 'kanji'),
    storyHint: earlyHint(engine, 'grammar'),
  };
}
