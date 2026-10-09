// Progress store: spaced review with no streaks. Missing days never wipes anything out.
// Port of ProgressStore.swift plus the daily-plan bookkeeping for the "Today" screen.
import { PHRASES, PHRASE_BY_ID, GARDEN_CATALOG, CHAPTERS, N5_WORDS } from './data.js';
import { ALL_LESSONS } from './dojo-data.js';

export const STORAGE_KEY = 'kotobaBeat.v1';
const DAY = 86_400_000;

/** Days until the next review after reaching each level. */
export const INTERVALS = [0, 1, 2, 4, 7, 14, 30];
export const DAILY_REVIEW_CAP = 20;
export const DAILY_REVIEW_CAP_SHORT = 10;
export const DAILY_NEW_CAP = 5;

/** Version of the saved progress shape. Bump it and add a step to MIGRATIONS whenever the shape changes. */
export const STATE_VERSION = 2;

function blank() {
  return {
    v: STATE_VERSION,
    items: {},          // id -> { level, due (ms), best, r (garden reviews), pl (planted ms) }
    lastSession: null,
    chapters: [],       // cleared chapter ids
    forged: [],         // forged kanji
    dojo: [],           // cleared Reading Dojo lesson ids
    storyReplays: {},   // chapter id -> last replay ms (to rotate replays in the daily plan)
    settings: {
      latencyMs: 0, quiet: false, length: 'standard', hideIosHint: false, theme: 'auto', readingHelp: 'auto', voiceSrc: 'auto', speed: 'normal',
      textSize: 'm', sfx: true, haptics: true,   // added in v2
    },
    days: {},           // 'YYYY-MM-DD' -> { ok, tot, rev, newc, studied, blocks: { id: 'done'|'skipped' } }
  };
}

export function dateKey(d = new Date()) {
  const y = d.getFullYear();
  const mo = String(d.getMonth() + 1).padStart(2, '0');
  const da = String(d.getDate()).padStart(2, '0');
  return `${y}-${mo}-${da}`;
}

/**
 * Upgrade steps, one per version: MIGRATIONS[n] turns a version-n blob into version n+1.
 * Each step only adds or renames; nothing a learner has saved is ever dropped.
 */
const MIGRATIONS = {
  // v1 -> v2: text size, sound effects and vibration settings (defaults: medium, on, on).
  1: (raw) => ({ ...raw, settings: { textSize: 'm', sfx: true, haptics: true, ...(raw.settings || {}) } }),
};

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
      s.items[id] = {
        level: Math.max(0, Math.min(INTERVALS.length - 1, Number(p.level) || 0)),
        due: Number(p.due) || 0,
        best: Number(p.best) || 0,
        r: Number(p.r) || 0,
        pl: Number(p.pl) || 0,
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
  }
  if (raw.days && typeof raw.days === 'object') {
    for (const [k, d] of Object.entries(raw.days)) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(k) || !d || typeof d !== 'object') continue;
      s.days[k] = {
        ok: Number(d.ok) || 0, tot: Number(d.tot) || 0, rev: Number(d.rev) || 0, newc: Number(d.newc) || 0,
        studied: !!d.studied, blocks: d.blocks && typeof d.blocks === 'object' ? { ...d.blocks } : {},
      };
    }
  }
  return s;
}

function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return normalize(JSON.parse(raw));
  } catch (e) { /* private mode or corrupt data: start fresh */ }
  return blank();
}

const listeners = new Set();

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

  // ----- review items -----
  item(id) { return this.s.items[id]; }
  progress(id) { return this.s.items[id] || { level: 0, due: 0, best: 0, r: 0, pl: 0 }; }
  level(phrase) { return this.progress(phrase.id).level; }
  isDue(phrase, now = Date.now()) { return this.progress(phrase.id).due <= now; }

  /** Adds a word to the garden the first time it's met. Does nothing if it's already planted. */
  plant(id) {
    if (this.s.items[id]) return;
    this.s.items[id] = { level: 0, due: 0, best: 0, r: 0, pl: Date.now() };
    this.save();
  }

  /** Garden review: a pass grows the plant and waters it until its next due date. */
  recordReview(id, ok) {
    const p = this.s.items[id] || { level: 0, due: 0, best: 0, r: 0, pl: Date.now() };
    const wasNew = !p.r;
    if (ok) {
      p.level = Math.min(p.level + 1, INTERVALS.length - 1);
      p.due = Date.now() + INTERVALS[p.level] * DAY;
    } else {
      p.due = Date.now();
    }
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
    if (score >= 0.8) {
      p.level = Math.min(p.level + 1, INTERVALS.length - 1);
      p.due = Date.now() + INTERVALS[p.level] * DAY;
    } else {
      p.due = Date.now();
    }
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
  planted() {
    return Object.entries(this.s.items)
      .filter(([id]) => GARDEN_CATALOG[id])
      .map(([id, prog]) => ({ item: GARDEN_CATALOG[id], prog }))
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
    const newLeft = Math.max(0, DAILY_NEW_CAP - d.newc);
    const now = Date.now();
    const plants = this.planted().filter((p) => p.prog.due <= now);
    const reviews = plants.filter((p) => p.prog.r > 0).map((p) => p.item);
    const fresh = plants.filter((p) => !p.prog.r).sort((a, b) => (a.prog.pl || 0) - (b.prog.pl || 0)).map((p) => p.item);
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

  /** Dojo review: same growing intervals as the garden, but kept out of the garden's daily cap. */
  recordDojo(id, ok, { firstTime = false } = {}) {
    const p = this.s.items[id] || { level: 0, due: 0, best: 0, r: 0, pl: Date.now() };
    if (ok) {
      p.level = Math.min(p.level + 1, INTERVALS.length - 1);
      p.due = Date.now() + INTERVALS[p.level] * DAY;
    } else {
      // A miss comes back soon, without knocking the level down (no punishment, just more practice).
      p.due = firstTime ? Date.now() + DAY / 2 : Date.now();
    }
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
