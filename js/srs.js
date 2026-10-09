// Spaced-review scheduler: a small, faithful version of FSRS (Free Spaced Repetition Scheduler, v4 formulas).
// Pure functions only (no DOM, no storage), so tests can import this file straight from Node.
//
// Each item carries:
//   s  stability, in days: how long until the chance of remembering it drops to 90%
//   d  difficulty, 1 (easy) to 10 (hard)
//   lr last review time (ms)
// Retrievability (the chance of remembering it now) is R = (1 + t / (9 S))^-1, t = days since the last review.
// An item is due when R falls to the target retention (90%), which with this curve happens exactly S days after
// the review. A right answer grows S (more when it was nearly forgotten), a miss shrinks it.

export const DAY = 86_400_000;

/** Chance of remembering an item at the moment it comes due. */
export const TARGET_RETENTION = 0.9;

/** FSRS v4 default weights (fitted on millions of real reviews by the open-spaced-repetition project). */
export const W = [0.4, 0.6, 2.4, 5.8, 4.93, 0.94, 0.86, 0.01, 1.49, 0.14, 0.94, 2.18, 0.05, 0.34, 1.26, 0.29, 2.61];

export const AGAIN = 1;
export const HARD = 2;
export const GOOD = 3;
export const EASY = 4;

/** The old fixed ladder: days until the next review at each level. Used to migrate saved items. */
export const LEGACY_INTERVALS = [0, 1, 2, 4, 7, 14, 30];

/**
 * Stability (days) at which an item reaches each garden growth stage (0 seed ... 6 blossom).
 * Close to the old ladder, so a migrated item keeps its stage and a first right answer (S = 2.4) is stage 1.
 */
export const STAGE_STABILITY = [0, 0.1, 2.5, 4, 7, 14, 30];

const MAX_STABILITY = 36500;
const MAX_INTERVAL_DAYS = 365;
const clamp = (x, lo, hi) => Math.min(hi, Math.max(lo, x));
const round2 = (x) => Math.round(x * 100) / 100;

/** Chance (0..1) of remembering an item `elapsedDays` after its last review. */
export function retrievability(elapsedDays, s) {
  if (!(s > 0)) return 0;
  return 1 / (1 + Math.max(0, elapsedDays) / (9 * s));
}

/** Days from a review until retrievability falls to `retention`. At 90% this equals the stability. */
export function intervalDays(s, retention = TARGET_RETENTION) {
  return 9 * s * (1 / retention - 1);
}

export function initialStability(g) { return W[g - 1]; }
export function initialDifficulty(g) { return clamp(W[4] - (g - 3) * W[5], 1, 10); }

export function nextDifficulty(d, g) {
  const moved = d - W[6] * (g - 3);
  return clamp(W[7] * initialDifficulty(GOOD) + (1 - W[7]) * moved, 1, 10);
}

/** Stability after a successful recall at retrievability r. Lower r (nearly forgotten) gives a bigger boost. */
export function recallStability(d, s, r, g) {
  const hard = g === HARD ? W[15] : 1;
  const easy = g === EASY ? W[16] : 1;
  return s * (1 + Math.exp(W[8]) * (11 - d) * s ** -W[9] * (Math.exp(W[10] * (1 - r)) - 1) * hard * easy);
}

/** Stability after a lapse (forgotten). Never larger than before. */
export function forgetStability(d, s, r) {
  return Math.min(s, W[11] * d ** -W[12] * ((s + 1) ** W[13] - 1) * Math.exp(W[14] * (1 - r)));
}

/** ok/miss to an FSRS grade. `easy` (a fast first-try answer) gives Easy. */
export function gradeOf(ok, { easy = false } = {}) {
  if (!ok) return AGAIN;
  return easy ? EASY : GOOD;
}

/**
 * One review. `card` is { s, d, lr } (s = 0 means never reviewed). Returns the new { s, d, lr, due }.
 * After a miss the item is due again right away (the caller may push it a little later);
 * after a pass it comes back when its retrievability reaches the target.
 */
export function review(card, g, now = Date.now(), retention = TARGET_RETENTION) {
  let s, d;
  if (!(card && card.s > 0)) {
    s = initialStability(g);
    d = initialDifficulty(g);
  } else {
    // Unknown last review (shouldn't happen after migration): assume it came due on time.
    const elapsed = card.lr ? (now - card.lr) / DAY : intervalDays(card.s, retention);
    const r = retrievability(elapsed, card.s);
    const d0 = card.d > 0 ? card.d : initialDifficulty(GOOD);
    d = nextDifficulty(d0, g);
    s = g === AGAIN ? forgetStability(d0, card.s, r) : recallStability(d0, card.s, r, g);
  }
  s = round2(clamp(s, 0.1, MAX_STABILITY));
  d = round2(d);
  const due = g === AGAIN ? now : now + Math.round(clamp(intervalDays(s, retention), 1, MAX_INTERVAL_DAYS)) * DAY;
  return { s, d, lr: now, due };
}

/** Garden growth stage (0-6) for a stability. */
export function stageOf(s) {
  if (!(s > 0)) return 0;
  let lv = 1;
  for (let i = 1; i < STAGE_STABILITY.length; i++) if (s >= STAGE_STABILITY[i]) lv = i;
  return lv;
}

/** Stability to give an item saved under the old ladder at `level`, so it keeps its growth stage. */
export function legacyStability(level) {
  const lv = clamp(Math.round(Number(level) || 0), 0, LEGACY_INTERVALS.length - 1);
  if (!lv) return 0;
  return Math.max(LEGACY_INTERVALS[lv], STAGE_STABILITY[lv]);
}

/**
 * Migrates one saved item from the fixed ladder: stability from its level's old interval, a middle difficulty,
 * and a last-review time estimated from its due date. level, due, best, r and pl are kept exactly.
 */
export function migrateItem(p) {
  const level = Number(p.level) || 0;
  const s = Number(p.s) > 0 ? Number(p.s) : legacyStability(level);
  const due = Number(p.due) || 0;
  const lr = Number(p.lr) > 0 ? Number(p.lr)
    : (p.r > 0 && due ? Math.max(0, due - (LEGACY_INTERVALS[clamp(level, 0, 6)] || 0) * DAY) : 0);
  return { ...p, s, d: Number(p.d) > 0 ? Number(p.d) : 5, lr };
}

/** Chance of remembering an item right now (0 for never-reviewed items). */
export function recallNow(item, now = Date.now()) {
  if (!item || !(item.s > 0)) return 0;
  return retrievability(item.lr ? (now - item.lr) / DAY : 0, item.s);
}
