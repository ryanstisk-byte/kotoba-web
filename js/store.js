// Progress store: spaced review with no streaks. Missing days never wipes anything out.
// Port of ProgressStore.swift plus the daily-plan bookkeeping for the "Today" screen.
import { PHRASES, PHRASE_BY_ID, GARDEN_CATALOG, CHAPTERS, N5_WORDS } from './data.js';
import { ALL_LESSONS, LESSON_BY_ID } from './dojo-data.js';
import * as srs from './srs.js';
import { blankEngine, normalizeEngine, recordGrade, dayNumber } from './skills.js';
import { newPerDay } from './tuning.js';

export const STORAGE_KEY = 'kotobaBeat.v1';
const DAY = 86_400_000;

/** The old fixed review ladder (days per level). Reviews now use the FSRS-style scheduler in srs.js; this stays for
 *  the growth-stage range (levels 0-6) and for migrating items saved before v3. */
export const INTERVALS = srs.LEGACY_INTERVALS;
export const DAILY_REVIEW_CAP = 20;
export const DAILY_REVIEW_CAP_SHORT = 10;
export const DAILY_NEW_CAP = 5;

/** Skill areas the learner model tracks. Every graded action in every mode feeds one of these (see store.grade). */
export const SKILLS = ['kana', 'kanji', 'vocab', 'grammar', 'listening', 'pitch', 'speaking', 'counters'];

/** Version of the saved progress shape. Bump it and add a step to MIGRATIONS whenever the shape changes. */
export const STATE_VERSION = 5;

function blank() {
  return {
    v: STATE_VERSION,
    items: {},          // id -> { level, due (ms), best, r (reviews), pl (planted ms), s (stability, days), d (difficulty 1-10), lr (last review ms) }
    lastSession: null,
    chapters: [],       // cleared chapter ids
    forged: [],         // forged kanji
    dojo: [],           // cleared Reading Dojo lesson ids
    storyReplays: {},   // chapter id -> last replay ms (to rotate replays in the daily plan)
    settings: {
      latencyMs: 0, quiet: false, length: 'standard', hideIosHint: false, theme: 'auto', readingHelp: 'auto', voiceSrc: 'auto', speed: 'normal',
      textSize: 'm', sfx: true, haptics: true,   // added in v2
      pace: 'normal',                             // added in v3: 'less' = at most 3 new words a day
    },
    engine: blankEngine(),   // added in v3: the skill model, placement and weekly check-in (see skills.js)
    days: {},           // 'YYYY-MM-DD' -> { ok, tot, rev, newc, studied, blocks: { id: 'done'|'skipped' } }
    saga: blankSaga(),  // added in v4: Story line mining and chapter results (see migrateStory)
    course: blankCourse(),   // added in v5: the guided course (see migrateCourse)
  };
}

/**
 * The guided course (js/course.js): on = Today follows it, current = unit chosen as current (null: first not done),
 * reached / done / read = unit ids, tally = unit id -> { ok, tot, last } first-try answers in that unit's practice
 * (last: the most recent results as a '1'/'0' string, newest at the end).
 */
export function blankCourse() {
  return { on: true, current: null, reached: [], done: [], read: [], tally: {} };
}

export function dateKey(d = new Date()) {
  const y = d.getFullYear();
  const mo = String(d.getMonth() + 1).padStart(2, '0');
  const da = String(d.getDate()).padStart(2, '0');
  return `${y}-${mo}-${da}`;
}

/** Story saga state: mined lines (Garden cards 'mine:<n>'), the next mined id, and per-chapter results. */
function blankSaga() {
  return {
    mined: [],        // [{ id: 'mine:<n>', jp, reading, en, parts: [[text, reading|null]], at }]
    seq: 0,           // highest mined number handed out (ids are never reused, even after a delete)
    quiz: {},         // chapter id -> { ok, tot, best, at } (comprehension questions)
    challenge: {},    // chapter id -> { ok, tot, best, runs, at } (no-furigana challenge replays)
  };
}

/** Adds the Story saga fields (mined lines, chapter results) with empty defaults. Changes nothing else. */
export function migrateStory(raw) {
  const prev = raw.saga && typeof raw.saga === 'object' ? raw.saga : {};
  return { ...raw, saga: { ...blankSaga(), ...prev } };
}

/**
 * Upgrade steps, one per version: MIGRATIONS[n] turns a version-n blob into version n+1.
 * Each step only adds or renames; nothing a learner has saved is ever dropped.
 */
const MIGRATIONS = {
  // v1 -> v2: text size, sound effects and vibration settings (defaults: medium, on, on).
  1: (raw) => ({ ...raw, settings: { textSize: 'm', sfx: true, haptics: true, ...(raw.settings || {}) } }),
  // v2 -> v3: the FSRS-style scheduler. Each item gets a stability from its level's old interval, a middle difficulty
  // and an estimated last review; level, due, best, r and pl stay exactly as they were. Adds the skill model
  // (empty) and the new-words pace setting (normal).
  2: (raw) => {
    const items = {};
    if (raw.items && typeof raw.items === 'object') {
      for (const [id, p] of Object.entries(raw.items)) items[id] = p && typeof p === 'object' ? srs.migrateItem(p) : p;
    }
    return { ...raw, items, engine: raw.engine || blankEngine(), settings: { pace: 'normal', ...(raw.settings || {}) } };
  },
  // v3 -> v4: Story saga (line mining, comprehension and challenge results).
  3: migrateStory,
  // v4 -> v5: the guided course (current unit, units reached and done, practice tallies).
  4: migrateCourse,
};

/** Adds the guided-course field with defaults. Self-contained: it touches nothing else in the blob. */
export function migrateCourse(raw) {
  return { ...raw, course: raw.course && typeof raw.course === 'object' ? raw.course : blankCourse() };
}

export function migrate(raw) {
  if (!raw || typeof raw !== 'object') return raw;
  let v = Number.isInteger(raw.v) && raw.v > 0 ? raw.v : 1;
  let out = raw;
  while (v < STATE_VERSION) {
    out = MIGRATIONS[v](out);
    v += 1;
  }
  return { ...out, v: Math.max(v, out.v || 0) };
}

function normalize(input) {
  const s = blank();
  const raw = migrate(input);
  if (!raw || typeof raw !== 'object') return s;
  if (raw.items && typeof raw.items === 'object') {
    for (const [id, p] of Object.entries(raw.items)) {
      if (!p || typeof p !== 'object') continue;
      const m = srs.migrateItem(p);   // fills in s, d and lr if they are missing; keeps them if present
      s.items[id] = {
        level: Math.max(0, Math.min(INTERVALS.length - 1, Number(p.level) || 0)),
        due: Number(p.due) || 0,
        best: Number(p.best) || 0,
        r: Number(p.r) || 0,
        pl: Number(p.pl) || 0,
        s: Math.max(0, Number(m.s) || 0),
        d: Math.max(0, Math.min(10, Number(m.d) || 0)),
        lr: Math.max(0, Number(m.lr) || 0),
      };
    }
  }
  s.lastSession = typeof raw.lastSession === 'number' ? raw.lastSession : null;
  if (Array.isArray(raw.chapters)) s.chapters = raw.chapters.filter((x) => typeof x === 'string');
  if (Array.isArray(raw.forged)) s.forged = raw.forged.filter((x) => typeof x === 'string');
  if (Array.isArray(raw.dojo)) s.dojo = raw.dojo.filter((x) => typeof x === 'string');
  if (raw.storyReplays && typeof raw.storyReplays === 'object') s.storyReplays = { ...raw.storyReplays };
  if (raw.settings && typeof raw.settings === 'object') {
    const st = raw.settings;
    s.settings.latencyMs = Math.max(-200, Math.min(500, Number(st.latencyMs) || 0));
    s.settings.quiet = !!st.quiet;
    s.settings.length = st.length === 'short' ? 'short' : 'standard';
    s.settings.hideIosHint = !!st.hideIosHint;
    s.settings.theme = ['light', 'dark'].includes(st.theme) ? st.theme : 'auto';
    s.settings.readingHelp = ['romaji', 'kana', 'off'].includes(st.readingHelp) ? st.readingHelp : 'auto';
    // voiceSrc replaced the older 'voice' setting, whose default was the built-in clips.
    s.settings.voiceSrc = ['clips', 'device'].includes(st.voiceSrc) ? st.voiceSrc : 'auto';
    s.settings.speed = st.speed === 'slow' ? 'slow' : 'normal';
    s.settings.textSize = ['s', 'm', 'l', 'xl'].includes(st.textSize) ? st.textSize : 'm';
    s.settings.sfx = st.sfx !== false;
    s.settings.haptics = st.haptics !== false;
    s.settings.pace = st.pace === 'less' ? 'less' : 'normal';
  }
  s.engine = normalizeEngine(raw.engine, SKILLS);
  if (raw.days && typeof raw.days === 'object') {
    for (const [k, d] of Object.entries(raw.days)) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(k) || !d || typeof d !== 'object') continue;
      s.days[k] = {
        ok: Number(d.ok) || 0, tot: Number(d.tot) || 0, rev: Number(d.rev) || 0, newc: Number(d.newc) || 0,
        studied: !!d.studied, blocks: d.blocks && typeof d.blocks === 'object' ? { ...d.blocks } : {},
      };
    }
  }
  s.saga = normalizeSaga(raw.saga);
  s.course = normalizeCourse(raw.course);
  return s;
}

const num = (x) => (Number.isFinite(Number(x)) ? Number(x) : 0);

function normalizeResults(obj, extra = []) {
  const out = {};
  if (!obj || typeof obj !== 'object') return out;
  for (const [k, r] of Object.entries(obj)) {
    if (!r || typeof r !== 'object') continue;
    const e = { ok: num(r.ok), tot: num(r.tot), best: num(r.best), at: num(r.at) };
    for (const f of extra) e[f] = num(r[f]);
    out[k] = e;
  }
  return out;
}

const UNIT_ID_RE = /^p\d+-\d+$/;
function normalizeCourse(c) {
  const out = blankCourse();
  if (!c || typeof c !== 'object') return out;
  const ids = (a) => (Array.isArray(a) ? [...new Set(a.filter((x) => typeof x === 'string' && UNIT_ID_RE.test(x)))] : []);
  out.on = c.on !== false;
  out.current = typeof c.current === 'string' && UNIT_ID_RE.test(c.current) ? c.current : null;
  out.reached = ids(c.reached);
  out.done = ids(c.done);
  out.read = ids(c.read);
  if (c.tally && typeof c.tally === 'object') {
    for (const [id, t] of Object.entries(c.tally)) {
      if (!UNIT_ID_RE.test(id) || !t || typeof t !== 'object') continue;
      const tot = Math.max(0, Math.floor(Number(t.tot) || 0));
      out.tally[id] = {
        tot,
        ok: Math.max(0, Math.min(tot, Math.floor(Number(t.ok) || 0))),
        last: typeof t.last === 'string' ? t.last.replace(/[^01]/g, '').slice(-30) : '',
      };
    }
  }
  return out;
}

/** Validates the saga block: keeps every well-formed mined line and result, fills in what's missing. */
function normalizeSaga(raw) {
  const g = blankSaga();
  if (!raw || typeof raw !== 'object') return g;
  const seen = new Set();
  if (Array.isArray(raw.mined)) {
    for (const m of raw.mined) {
      if (!m || typeof m !== 'object' || typeof m.id !== 'string' || !/^mine:\d+$/.test(m.id) || seen.has(m.id)) continue;
      if (typeof m.jp !== 'string' || !m.jp.trim()) continue;
      seen.add(m.id);
      const parts = Array.isArray(m.parts)
        ? m.parts.filter((p) => Array.isArray(p) && typeof p[0] === 'string').map((p) => [p[0], typeof p[1] === 'string' ? p[1] : null])
        : [];
      g.mined.push({ id: m.id, jp: m.jp, reading: typeof m.reading === 'string' ? m.reading : '', en: typeof m.en === 'string' ? m.en : '', parts, at: num(m.at) });
    }
  }
  const top = g.mined.reduce((n, m) => Math.max(n, Number(m.id.slice(5))), 0);
  g.seq = Math.max(top, Math.floor(num(raw.seq)));
  g.quiz = normalizeResults(raw.quiz);
  g.challenge = normalizeResults(raw.challenge, ['runs']);
  return g;
}

function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return normalize(JSON.parse(raw));
  } catch (e) { /* private mode or corrupt data: start fresh */ }
  return blank();
}

/** How sure the app is of a kana or kanji the placement check found you already know (days of stability). */
export const PLACEMENT_STABILITY = 3;

/**
 * Schedules one review of item `p` (mutated) with the FSRS-style scheduler. A miss makes it due now and never
 * lowers its growth stage; a pass grows the stage by at most one, up to what its stability supports.
 */
function schedule(p, ok, now = Date.now()) {
  const next = srs.review(p, srs.gradeOf(ok), now);
  p.s = next.s;
  p.d = next.d;
  p.lr = next.lr;
  p.due = next.due;
  if (ok) p.level = Math.max(p.level || 0, Math.min((p.level || 0) + 1, srs.stageOf(p.s)));
  return p;
}

const newItem = (now = Date.now()) => ({ level: 0, due: 0, best: 0, r: 0, pl: now, s: 0, d: 0, lr: 0 });

const listeners = new Set();
const gradeListeners = new Set();

class Store {
  constructor() {
    this.s = load();
    // Remember when the previous visit was, before this one overwrites it (for the welcome line).
    this.previousSession = this.s.lastSession;
    this.saveOk = true;
  }

  save() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.s));
      this.saveOk = true;
    } catch (e) {
      this.saveOk = false;
    }
    listeners.forEach((fn) => { try { fn(); } catch (e) { /* ignore */ } });
  }

  onChange(fn) { listeners.add(fn); return () => listeners.delete(fn); }

  get settings() { return this.s.settings; }
  setSetting(k, v) { this.s.settings[k] = v; this.save(); }

  // ----- days -----
  day(key = dateKey()) {
    if (!this.s.days[key]) this.s.days[key] = { ok: 0, tot: 0, rev: 0, newc: 0, studied: false, blocks: {} };
    return this.s.days[key];
  }

  /** Any graded answer anywhere. Feeds "accuracy this week". */
  log(ok) {
    const d = this.day();
    d.tot += 1;
    if (ok) d.ok += 1;
    d.studied = true;
    this.s.lastSession = Date.now();
    this.save();
  }

  markSession() {
    this.s.lastSession = Date.now();
    this.save();
  }

  markStudied() {
    this.day().studied = true;
    this.save();
  }

  setBlock(id, status) {
    const d = this.day();
    d.blocks[id] = status;
    if (status === 'done') d.studied = true;
    this.save();
  }

  weekAccuracy() {
    let ok = 0, tot = 0;
    const day = new Date();
    for (let i = 0; i < 7; i++) {
      // Step back by calendar day, not 24 hours, so a daylight-saving change never skips or repeats a day.
      if (i) day.setDate(day.getDate() - 1);
      const d = this.s.days[dateKey(day)];
      if (d) { ok += d.ok; tot += d.tot; }
    }
    return { ok, tot, rate: tot ? ok / tot : null };
  }

  daysStudiedThisMonth() {
    const prefix = dateKey().slice(0, 7);
    return Object.entries(this.s.days).filter(([k, d]) => k.startsWith(prefix) && d.studied).length;
  }

  // ----- skill model -----
  /**
   * Records one graded action for the skill model: `skill` is one of SKILLS, `id` the item it was about (optional),
   * `ok` whether it was right, `firstTry` false for a retry after a miss. First tries feed the per-skill daily
   * tallies, the recent results that difficulty targeting reads, and per-item mastery (skills.js). Callers still
   * use log()/recordReview()/recordDojo()/... for scheduling and daily accuracy. Every call is emitted to onGrade().
   */
  grade({ skill, id = null, ok, firstTry = true } = {}) {
    if (!SKILLS.includes(skill)) return;
    const ev = { skill, id, ok: !!ok, firstTry: !!firstTry, at: Date.now() };
    recordGrade(this.s.engine, ev, dateKey());
    this.save();
    gradeListeners.forEach((fn) => { try { fn(ev); } catch (e) { /* ignore */ } });
  }

  get engine() { return this.s.engine; }

  /** First-try accuracy per skill over calendar days fromKey..toKey (inclusive): { skill: { ok, tot, rate } }. */
  skillDays(fromKey, toKey) {
    const from = dayNumber(fromKey), to = dayNumber(toKey);
    const out = {};
    for (const sk of SKILLS) out[sk] = { ok: 0, tot: 0, rate: null };
    for (const [k, day] of Object.entries(this.s.engine.tally)) {
      const n = dayNumber(k);
      if (n < from || n > to) continue;
      for (const [sk, t] of Object.entries(day)) { if (out[sk]) { out[sk].ok += t[0]; out[sk].tot += t[1]; } }
    }
    for (const sk of SKILLS) out[sk].rate = out[sk].tot ? out[sk].ok / out[sk].tot : null;
    return out;
  }

  /** New garden words allowed today: at most DAILY_NEW_CAP, fewer on the gentle pace or while accuracy is low. */
  newCap() { return Math.min(DAILY_NEW_CAP, newPerDay(this.s.engine, this.s.settings)); }

  // ----- placement check -----
  skipPlacement() { this.s.engine.placementSkip = true; this.save(); }

  /**
   * Marks Reading Dojo lessons the placement check found you know: clears them (never un-clears anything) and
   * seeds their characters as learned with a modest stability, due over the next week. Existing items are left
   * alone. Returns the lesson ids that were newly cleared.
   */
  applyPlacement(lessonIds, now = Date.now()) {
    const added = [];
    let n = 0;
    for (const id of lessonIds) {
      const l = LESSON_BY_ID[id];
      if (!l) continue;
      if (!this.s.dojo.includes(id)) { this.s.dojo.push(id); added.push(id); }
      const ids = l.chars ? l.chars.map((c) => 'kana:' + c.k) : (l.kanji || []).map((j) => 'kj:' + j.k);
      for (const cid of ids) {
        if (this.s.items[cid]) continue;
        const s = PLACEMENT_STABILITY;
        this.s.items[cid] = { level: srs.stageOf(s), due: now + (2 + (n++ % 5)) * DAY, best: 0, r: 1, pl: now, s, d: 5, lr: now };
      }
    }
    const prev = this.s.engine.placement ? this.s.engine.placement.lessons : [];
    this.s.engine.placement = { at: now, lessons: [...new Set([...prev, ...lessonIds.filter((x) => LESSON_BY_ID[x])])] };
    this.save();
    return added;
  }

  // ----- weekly check-in -----
  markCheckin(week) { this.s.engine.checkin = week; this.save(); }

  /** Listen to every graded action (e.g. a course unit counting its practice). Returns an unsubscribe function. */
  onGrade(fn) { gradeListeners.add(fn); return () => gradeListeners.delete(fn); }

  // ----- review items -----
  item(id) { return this.s.items[id]; }
  progress(id) { return this.s.items[id] || newItem(0); }
  level(phrase) { return this.progress(phrase.id).level; }
  isDue(phrase, now = Date.now()) { return this.progress(phrase.id).due <= now; }

  /** Adds a word to the garden the first time it's met. Does nothing if it's already planted. */
  plant(id) {
    if (this.s.items[id]) return;
    this.s.items[id] = newItem();
    this.save();
  }

  /** Garden review: a pass grows the plant and waters it until its next due date (when recall drops to ~90%). */
  recordReview(id, ok) {
    const p = this.s.items[id] || newItem();
    const wasNew = !p.r;
    schedule(p, ok);
    p.r = (p.r || 0) + 1;
    this.s.items[id] = p;
    const d = this.day();
    d.rev += 1;
    if (wasNew) d.newc += 1;
    this.log(ok);
  }

  clearChapter(id) {
    if (!this.s.chapters.includes(id)) this.s.chapters.push(id);
    this.save();
  }
  noteReplay(id) { this.s.storyReplays[id] = Date.now(); this.save(); }
  get clearedChapters() { return new Set(this.s.chapters); }

  forge(kanji) {
    if (!this.s.forged.includes(kanji)) this.s.forged.push(kanji);
    this.save();
  }
  get forgedKanji() { return new Set(this.s.forged); }

  /** Due phrases first (oldest due first), boss levels only after the basics have been seen. */
  queue() {
    const now = Date.now();
    const seenBasics = PHRASES.filter((p) => !p.isBoss && this.s.items[p.id]).length;
    const pool = PHRASES.filter((p) => !p.isBoss || seenBasics >= 6);
    const byDue = (a, b) => this.progress(a.id).due - this.progress(b.id).due;
    const due = pool.filter((p) => this.isDue(p, now)).sort(byDue);
    return due.length ? due : pool.slice().sort(byDue);
  }

  /** Rhythm result. A pass moves the phrase up a level and schedules it further out. */
  recordRhythm(phrase, score) {
    const p = { ...this.progress(phrase.id) };
    if (!p.pl) p.pl = Date.now();
    p.best = Math.max(p.best, score);
    schedule(p, score >= 0.8);
    this.s.items[phrase.id] = p;
    this.log(score >= 0.8);
  }

  /** Speak Slice / Pitch Duel result. A miss brings the phrase back today; a hit leaves its schedule alone. */
  recordSlice(phrase, hit) {
    const p = { ...this.progress(phrase.id) };
    if (!p.pl) p.pl = Date.now();
    if (!hit) p.due = Date.now();
    this.s.items[phrase.id] = p;
    this.log(hit);
  }

  // ----- garden -----
  /** The Garden card for a progress id: the built-in catalog, or a line the learner mined in Story. */
  catalogItem(id) {
    if (GARDEN_CATALOG[id]) return GARDEN_CATALOG[id];
    if (!id.startsWith('mine:')) return null;
    const m = this.s.saga.mined.find((x) => x.id === id);
    return m ? { id: m.id, jp: m.jp, reading: m.reading, en: m.en, mined: true } : null;
  }

  planted() {
    return Object.entries(this.s.items)
      .filter(([id]) => this.catalogItem(id))
      .map(([id, prog]) => ({ item: this.catalogItem(id), prog }))
      .sort((a, b) => a.prog.due - b.prog.due);
  }

  thirsty(now = Date.now()) { return this.planted().filter((p) => p.prog.due <= now).map((p) => p.item); }

  /**
   * Today's garden queue: due reviews (most overdue first), then at most 5 new items a day,
   * all within a daily cap so a backlog after a break never piles up. The rest simply wait.
   */
  dailyGardenQueue(cap = DAILY_REVIEW_CAP) {
    const d = this.day();
    const remaining = Math.max(0, cap - d.rev);
    const newLeft = Math.max(0, this.newCap() - d.newc);
    const now = Date.now();
    const plants = this.planted().filter((p) => p.prog.due <= now);
    const reviews = plants.filter((p) => p.prog.r > 0).map((p) => p.item);
    // New plants oldest first, except lines the learner mined themselves, which come first.
    const fresh = plants.filter((p) => !p.prog.r)
      .sort((a, b) => (b.item.mined ? 1 : 0) - (a.item.mined ? 1 : 0) || (a.prog.pl || 0) - (b.prog.pl || 0)).map((p) => p.item);
    // If fewer than 5 planted words are waiting, introduce starter phrases in order, then the N5 deck in order.
    if (fresh.length < newLeft) {
      for (const ph of PHRASES) {
        if (fresh.length >= newLeft) break;
        if (!ph.isBoss && !this.s.items[ph.id]) fresh.push(GARDEN_CATALOG[ph.id]);
      }
    }
    if (fresh.length < newLeft) {
      // Skip N5 words already growing under another id (met in Story, Kanji Forge or the starter phrases).
      const known = new Set(this.planted().map((p) => p.item.jp).concat(fresh.map((f) => f.jp)));
      for (const w of N5_WORDS) {
        if (fresh.length >= newLeft) break;
        if (!this.s.items[w.id] && !known.has(w.jp)) { fresh.push(GARDEN_CATALOG[w.id]); known.add(w.jp); }
      }
    }
    const q = reviews.slice(0, remaining);
    const newSlots = Math.min(newLeft, remaining - q.length);
    return { queue: q.concat(fresh.slice(0, Math.max(0, newSlots))), waiting: Math.max(0, reviews.length - q.length), remaining };
  }

  // ----- story saga: line mining and chapter results -----
  get mined() { return this.s.saga.mined; }

  /** Saves a pasted line as a Garden card (planted, due now). Returns its id. */
  mineLine({ jp, reading, en, parts = [] }) {
    const g = this.s.saga;
    g.seq += 1;
    const id = 'mine:' + g.seq;
    g.mined.push({ id, jp, reading, en, parts, at: Date.now() });
    this.s.items[id] = { level: 0, due: 0, best: 0, r: 0, pl: Date.now() };
    this.save();
    return id;
  }

  /** Removes a mined line and its Garden card. */
  deleteMined(id) {
    const g = this.s.saga;
    g.mined = g.mined.filter((m) => m.id !== id);
    if (id.startsWith('mine:')) delete this.s.items[id];
    this.save();
  }

  /** Comprehension questions for a chapter (or its no-furigana challenge replay): remembers the latest and best. */
  recordStoryQuiz(chapterId, ok, tot, { challenge = false } = {}) {
    const book = challenge ? this.s.saga.challenge : this.s.saga.quiz;
    const prev = book[chapterId] || { best: 0, runs: 0 };
    const e = { ok, tot, best: Math.max(prev.best || 0, ok), at: Date.now() };
    if (challenge) e.runs = (prev.runs || 0) + 1;
    book[chapterId] = e;
    this.save();
  }
  storyResult(chapterId) {
    return { quiz: this.s.saga.quiz[chapterId] || null, challenge: this.s.saga.challenge[chapterId] || null };
  }

  // ----- reading dojo -----
  clearLesson(id) {
    if (!this.s.dojo.includes(id)) this.s.dojo.push(id);
    this.markStudied();
  }
  get clearedLessons() { return new Set(this.s.dojo); }
  trackDone(track) {
    const cleared = this.clearedLessons;
    return ALL_LESSONS.filter((l) => l.track === track).every((l) => cleared.has(l.id));
  }
  /** First lesson not yet cleared, in course order (hiragana, katakana, kanji). */
  nextLesson() {
    const cleared = this.clearedLessons;
    return ALL_LESSONS.find((l) => !cleared.has(l.id)) || null;
  }

  /** Dojo review: same scheduler as the garden, but kept out of the garden's daily cap. */
  recordDojo(id, ok, { firstTime = false } = {}) {
    const p = this.s.items[id] || newItem();
    schedule(p, ok);
    // A miss comes back soon, without knocking the level down (no punishment, just more practice).
    if (!ok && firstTime) p.due = Date.now() + DAY / 2;
    p.r = (p.r || 0) + 1;
    this.s.items[id] = p;
    this.log(ok);
  }

  /** Learned kana and kanji that are due again, most overdue first. */
  dojoDue(now = Date.now()) {
    return Object.entries(this.s.items)
      .filter(([id, p]) => (id.startsWith('kana:') || id.startsWith('kj:')) && p.due <= now)
      .sort((a, b) => a[1].due - b[1].due)
      .map(([id]) => id);
  }

  // ----- story plan -----
  nextChapter() {
    const cleared = this.clearedChapters;
    const next = CHAPTERS.find((c) => !cleared.has(c.id));
    if (next) return { chapter: next, replay: false };
    // All cleared: replay the one revisited longest ago (rotating), furigana off.
    const sorted = CHAPTERS.slice().sort((a, b) => (this.s.storyReplays[a.id] || 0) - (this.s.storyReplays[b.id] || 0));
    return { chapter: sorted[0], replay: true };
  }

  // ----- export / import -----
  exportJSON() {
    return JSON.stringify({ app: 'kotoba-beat', exported: new Date().toISOString(), data: this.s }, null, 1);
  }

  exportCode() {
    const json = JSON.stringify(this.s);
    const bytes = new TextEncoder().encode(json);
    let bin = '';
    for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
    return 'KOTOBA1:' + btoa(bin);
  }

  /** Accepts a KOTOBA1: code, an exported .json, or raw state JSON. Returns the parsed state (not applied). */
  parseImport(text) {
    text = String(text || '').trim();
    let obj;
    if (text.startsWith('KOTOBA1:')) {
      const bin = atob(text.slice(8).replace(/\s+/g, ''));
      const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0));
      obj = JSON.parse(new TextDecoder().decode(bytes));
    } else {
      obj = JSON.parse(text);
      if (obj && obj.app === 'kotoba-beat' && obj.data) obj = obj.data;
    }
    if (!obj || typeof obj !== 'object' || typeof obj.items !== 'object') throw new Error('This does not look like Kotoba Beat progress.');
    return normalize(obj);
  }

  applyImport(state) {
    this.s = normalize(state);
    this.save();
  }

  resetAll() {
    const settings = this.s.settings;
    this.s = blank();
    this.s.settings = settings;
    this.save();
  }
}

export const store = new Store();
export { PHRASE_BY_ID };
