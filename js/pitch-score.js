// Pitch Coach maths: pure functions (no DOM, no audio), so tests can check them directly.
//
// Pitch is measured in semitones from the learner's own comfortable middle pitch, learned from their attempts (or a
// two-second "say あ" step) and saved per device. That keeps the scale fixed: a small wobble stays small on screen
// instead of being stretched to fill it.
//
// Scoring follows what native listeners hear in Tokyo pitch accent: where the pitch drops (or that it doesn't), and
// the direction of each step from one beat to the next. Absolute height and the size of a step don't count, beyond a
// small minimum so a wobble isn't mistaken for a step.

/** Semitones of `hz` above (or below) a reference pitch. */
export const semitones = (hz, refHz) => 12 * Math.log2(hz / refHz);

/** Hz for a number of semitones from a reference pitch. */
export const fromSemitones = (st, refHz) => refHz * 2 ** (st / 12);

/** The fixed vertical scale: semitones shown above and below the comfortable middle. */
export const SCALE_ST = 8;
/** How far the target's high and low steps sit from the middle (semitones); "Bigger" exaggerates them. */
export const STEP_ST = 2.5;
export const BIG_STEP_ST = 5;
/** The smallest change between two beats that counts as a step up or down. */
export const MIN_STEP_ST = 0.7;

/** y position (px) for a pitch, on a fixed scale: `height` px tall, ±SCALE_ST semitones around the middle. */
export function yFor(st, height, pad = 14) {
  const clamped = Math.max(-SCALE_ST, Math.min(SCALE_ST, st));
  return height / 2 - (clamped / SCALE_ST) * (height / 2 - pad);
}

/**
 * A running median over the last `n` readings, so a single bad reading (an octave jump, a click) doesn't move the
 * line. Readings of null (no pitch) are skipped; returns null until there are enough real readings.
 */
export function medianFilter(values, n = 5) {
  const out = [];
  for (let i = 0; i < values.length; i++) {
    const win = values.slice(Math.max(0, i - n + 1), i + 1).filter((v) => v != null && Number.isFinite(v));
    if (values[i] == null || win.length < Math.min(3, n)) { out.push(null); continue; }
    const s = win.slice().sort((a, b) => a - b);
    out.push(s[Math.floor(s.length / 2)]);
  }
  return out;
}

const pct = (xs, p) => { const s = xs.slice().sort((a, b) => a - b); return s.length ? s[Math.min(s.length - 1, Math.floor(p * s.length))] : null; };

/**
 * A voice range from pitch readings (Hz): the middle (median) and a comfortable band (10th to 90th percentile, in
 * semitones from the middle, at least ±2). Null with too few readings.
 */
export function voiceFrom(hzs) {
  const v = hzs.filter((x) => x && x > 50 && x < 1000);
  if (v.length < 8) return null;
  const mid = pct(v, 0.5);
  const lo = Math.min(-2, semitones(pct(v, 0.1), mid));
  const hi = Math.max(2, semitones(pct(v, 0.9), mid));
  return { mid: Math.round(mid * 10) / 10, lo: Math.round(Math.max(-12, lo) * 10) / 10, hi: Math.round(Math.min(12, hi) * 10) / 10 };
}

/**
 * Learns from a new attempt: the saved voice drifts toward the new reading (a fifth of the way, in semitones, so one
 * odd attempt can't throw it off). `prev` may be null (first time). `n` counts the attempts learned from.
 */
export function learnVoice(prev, hzs) {
  const now = voiceFrom(hzs);
  if (!now) return prev;
  if (!prev || !prev.mid) return { ...now, n: 1 };
  const w = prev.n < 3 ? 0.4 : 0.2;
  const midSt = semitones(now.mid, prev.mid) * w;
  const mix = (a, b) => Math.round((a + (b - a) * w) * 10) / 10;
  return { mid: Math.round(fromSemitones(midSt, prev.mid) * 10) / 10, lo: mix(prev.lo, now.lo), hi: mix(prev.hi, now.hi), n: (prev.n || 1) + 1 };
}

/** The beat after which the pitch drops (the accent kernel), or -1 for no drop. */
export const dropAt = (highs) => highs.findIndex((h, i) => h && highs[i + 1] === false);

/**
 * High/low steps with a following particle (が): after a word with no drop the particle stays high; after any other
 * word it's low. Only here do flat words (no drop) and words that drop after their last beat sound different.
 */
export function withParticle(highs, accent) {
  const flat = accent === 0 || (accent == null && !highs.some((h, i) => h && highs[i + 1] === false) && highs[highs.length - 1]);
  return [...highs, !!flat];
}

/**
 * Scores the learner's pitch per beat against the target's high/low steps.
 *   highs  target high (true) / low (false) per beat
 *   user   the learner's pitch per beat, in semitones (null where it couldn't be measured)
 *   skip   beats left out (devoiced ones like the す in です, or the silent っ)
 *   endDropUnheard  true for a word said alone when its drop would come after the last beat (on a particle), so the
 *                   last beat's height can't be judged
 * Returns { steps: [{ from, to, want, got, ok }], drop: { want, got, ok }, match, verdict, firstMiss }.
 * want / got: 'up' | 'down' | 'level'. verdict: 'great' | 'close' | 'try' | 'none'.
 */
export function scorePitch(highs, user, { skip = [], minStep = MIN_STEP_ST } = {}) {
  const idx = highs.map((_, i) => i).filter((i) => !skip[i] && user[i] != null);
  const steps = [];
  for (let k = 0; k + 1 < idx.length; k++) {
    const a = idx[k], b = idx[k + 1];
    const want = highs[a] === highs[b] ? 'level' : highs[b] ? 'up' : 'down';
    const d = user[b] - user[a];
    const got = d > minStep ? 'up' : d < -minStep ? 'down' : 'level';
    // A level step allows a little drift either way (it only matters that it isn't a clear step the wrong way).
    const ok = want === 'level' ? Math.abs(d) < 2 * minStep + 0.6 || got === 'level' : got === want;
    steps.push({ from: a, to: b, want, got, d: Math.round(d * 10) / 10, ok });
  }
  if (!steps.length) return { steps, drop: null, match: null, verdict: 'none', firstMiss: null };
  // The drop: where the target falls, against where the learner's pitch first clearly fell (what a listener hears as
  // the drop; falling further after it is fine).
  const wantK = dropAt(highs);
  const falls = steps.filter((s) => s.d < -minStep);
  const first = falls[0] || null;
  const gotK = first ? first.from : -1;
  const dropStep = steps.find((s) => s.from <= wantK && s.to > wantK);
  const dropOk = wantK < 0 ? !falls.some((s) => s.d < -(2 * minStep + 0.6)) : !!(dropStep && first === dropStep);
  const match = steps.filter((s) => s.ok).length / steps.length;
  const verdict = dropOk && match >= 0.75 ? 'great' : (dropOk || match >= 0.5) ? 'close' : 'try';
  const firstMiss = steps.find((s) => !s.ok) || null;
  return { steps, drop: { want: wantK, got: gotK, ok: dropOk }, match, verdict, firstMiss };
}

/**
 * Splits a voiced span into `n` beats: by the dips in loudness when they make exactly n syllables ("ma-ma-ma"),
 * else evenly (a hum). frames: [{ time, hz, level }]. Returns the learner's pitch per beat (semitones from refHz).
 */
export function beatsPitch(frames, n, refHz, { segmented = false } = {}) {
  const peak = Math.max(0, ...frames.map((f) => f.level));
  const thr = Math.max(peak * 0.15, 0.004);
  const voiced = frames.map((f) => f.level >= thr);
  const a = voiced.indexOf(true), b = voiced.lastIndexOf(true);
  if (a < 0) return new Array(n).fill(null);
  let groups = null;
  if (segmented) {
    const segs = [];
    let cur = null;
    for (let i = a; i <= b; i++) {
      if (voiced[i]) { if (!cur) segs.push(cur = []); cur.push(i); } else cur = null;
    }
    if (segs.length === n) groups = segs;
  }
  if (!groups) {
    const len = b - a + 1;
    groups = Array.from({ length: n }, (_, k) => {
      const from = a + Math.floor((k * len) / n), to = a + Math.floor(((k + 1) * len) / n);
      return Array.from({ length: Math.max(1, to - from) }, (__, x) => from + x);
    });
  }
  return groups.map((g) => {
    // The middle of each beat: its edges glide in from the beat before and out to the next.
    const core = g.length >= 4 ? g.slice(Math.floor(g.length / 4), Math.ceil((3 * g.length) / 4)) : g;
    const hz = core.map((i) => frames[i].hz).filter((x) => x);
    if (!hz.length) return null;
    const s = hz.slice().sort((x, y) => x - y);
    return semitones(s[Math.floor(s.length / 2)], refHz);
  });
}
