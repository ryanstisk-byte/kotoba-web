// Skill model: what the learner actually knows, per skill area and per item. Pure functions over the saved
// `engine` object (no DOM, no storage), fed by store.grade() from every mode's graded actions.
//
// Saved shape (kept small; old detail is pruned):
//   tally    { 'YYYY-MM-DD': { skill: [right, answered] } }   first-try answers per skill per day, last 8 weeks
//   recent   { skill: '1101…' }                               the last 20 first-try results per skill (1 = right)
//   mastery  { 'skill|id': [percent, answers, dayNumber] }    per-item mastery, at most 600 items
//   placement      null | { at, lessons: [lesson ids marked known] }
//   placementSkip  true once "Not now" was tapped on the placement card
//   checkin        ISO week ('2026-W41') the weekly check-in was last shown in

export const SKILL_LABELS = {
  kana: 'Kana', kanji: 'Kanji', vocab: 'Vocabulary', grammar: 'Particles & grammar',
  listening: 'Listening', pitch: 'Pitch', speaking: 'Speaking', counters: 'Counters',
};

export const TALLY_DAYS = 56;
export const RECENT_LEN = 20;
export const MASTERY_MAX = 600;
const DAY = 86_400_000;

export function blankEngine() {
  return { tally: {}, recent: {}, mastery: {}, placement: null, placementSkip: false, checkin: '' };
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const int = (x) => Math.max(0, Math.round(Number(x) || 0));

/** Cleans a saved engine object, keeping everything valid. */
export function normalizeEngine(raw, skills) {
  const e = blankEngine();
  if (!raw || typeof raw !== 'object') return e;
  if (raw.tally && typeof raw.tally === 'object') {
    for (const [k, day] of Object.entries(raw.tally)) {
      if (!DATE_RE.test(k) || !day || typeof day !== 'object') continue;
      const out = {};
      for (const sk of skills) {
        const t = day[sk];
        if (Array.isArray(t) && t.length >= 2) out[sk] = [Math.min(int(t[0]), int(t[1])), int(t[1])];
      }
      if (Object.keys(out).length) e.tally[k] = out;
    }
  }
  if (raw.recent && typeof raw.recent === 'object') {
    for (const sk of skills) {
      const r = raw.recent[sk];
      if (typeof r === 'string' && /^[01]*$/.test(r) && r) e.recent[sk] = r.slice(-RECENT_LEN);
    }
  }
  if (raw.mastery && typeof raw.mastery === 'object') {
    for (const [k, m] of Object.entries(raw.mastery)) {
      if (!Array.isArray(m) || m.length < 3 || !skills.includes(k.split('|')[0])) continue;
      e.mastery[k] = [Math.min(100, int(m[0])), int(m[1]), int(m[2])];
    }
  }
  const p = raw.placement;
  if (p && typeof p === 'object') {
    e.placement = { at: Number(p.at) || 0, lessons: Array.isArray(p.lessons) ? p.lessons.filter((x) => typeof x === 'string') : [] };
  }
  e.placementSkip = !!raw.placementSkip;
  e.checkin = typeof raw.checkin === 'string' && /^\d{4}-W\d{2}$/.test(raw.checkin) ? raw.checkin : '';
  return e;
}

/** Days since 1970 for a 'YYYY-MM-DD' key (calendar days, no time zone or daylight-saving drift). */
export function dayNumber(key) {
  const [y, m, d] = key.split('-').map(Number);
  return Math.round(Date.UTC(y, m - 1, d) / DAY);
}

export function keyFromDayNumber(n) {
  return new Date(n * DAY).toISOString().slice(0, 10);
}

/**
 * Records one graded action. Only first tries count toward accuracy and mastery: a retry after a miss is
 * practice, not a measure of what was known. Mutates `engine`.
 */
export function recordGrade(engine, { skill, id = null, ok, firstTry = true }, todayKey) {
  if (!firstTry) return;
  const day = engine.tally[todayKey] || (engine.tally[todayKey] = {});
  const t = day[skill] || (day[skill] = [0, 0]);
  t[1] += 1;
  if (ok) t[0] += 1;
  engine.recent[skill] = ((engine.recent[skill] || '') + (ok ? '1' : '0')).slice(-RECENT_LEN);
  if (id != null && id !== '') {
    const key = `${skill}|${id}`;
    const m = engine.mastery[key];
    const target = ok ? 100 : 0;
    // A running average that leans on recent answers: one miss doesn't erase a well-known item.
    const pct = m ? Math.round(m[0] + (target - m[0]) * 0.3) : (ok ? 70 : 20);
    engine.mastery[key] = [pct, (m ? m[1] : 0) + 1, dayNumber(todayKey)];
  }
  prune(engine, todayKey);
}

/** Drops tallies older than 8 weeks and the least recently seen items past the mastery cap. */
export function prune(engine, todayKey) {
  const cutoff = dayNumber(todayKey) - TALLY_DAYS;
  for (const k of Object.keys(engine.tally)) if (dayNumber(k) < cutoff) delete engine.tally[k];
  const keys = Object.keys(engine.mastery);
  if (keys.length > MASTERY_MAX) {
    keys.sort((a, b) => engine.mastery[a][2] - engine.mastery[b][2]);
    for (const k of keys.slice(0, keys.length - MASTERY_MAX)) delete engine.mastery[k];
  }
}

/** First-try { ok, tot } for one skill (or all skills when `skill` is null) over day numbers [from, to]. */
export function tallyRange(engine, skill, from, to) {
  let ok = 0, tot = 0;
  for (const [k, day] of Object.entries(engine.tally)) {
    const n = dayNumber(k);
    if (n < from || n > to) continue;
    for (const [sk, t] of Object.entries(day)) {
      if (skill && sk !== skill) continue;
      ok += t[0];
      tot += t[1];
    }
  }
  return { ok, tot, rate: tot ? ok / tot : null };
}

/** Recent first-try accuracy for a skill, or null with fewer than `min` answers. */
export function recentRate(engine, skill, min = 8) {
  const r = (engine && engine.recent && engine.recent[skill]) || '';
  if (r.length < min) return null;
  return [...r].filter((c) => c === '1').length / r.length;
}

/** ISO week of a date, like '2026-W41' (weeks start on Monday). Uses the local calendar date. */
export function isoWeek(date = new Date()) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const wd = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - wd);
  const y = d.getUTCFullYear();
  const week = Math.ceil(((d - Date.UTC(y, 0, 1)) / DAY + 1) / 7);
  return `${y}-W${String(week).padStart(2, '0')}`;
}
