// Pronunciation analysis: pure functions (no DOM, no audio), so tests can feed them synthetic data.
//
// Three checks, all on the device:
//  1. Sounds: what speech recognition heard, compared with the target mora by mora (kana normalised).
//  2. Pitch: the learner's pitch per mora against the word's accent (high / low), from the N5 deck's accent, a
//     phrase's melody, or the model clip itself.
//  3. Length: how long each mora was held. The learner's recording is lined up with the app's own clip of the word
//     (dynamic time warping on loudness, voicing and pitch), so the time spent on each of the clip's morae can be
//     measured. That catches long vowels, small っ, ん as its own beat and the い/う that go quiet (です, ます).
// Each finding is an issue id (see pron-tips.js for the words shown); verdict() turns everything into
// Great / Close / Try again, generously.

import { scorePitch, dropAt, MIN_STEP_ST } from './pitch-score.js';

const kata2hira = (s) => String(s || '').replace(/[ァ-ヶ]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0x60));
const toMorae = (kana) => kana.match(/.[ゃゅょぁぃぅぇぉゎ]?/g) || [];

const ROWS = {
  a: 'あかさたなはまやらわがざだばぱぁゃ', i: 'いきしちにひみりぎじぢびぴぃ', u: 'うくすつぬふむゆるぐずづぶぷぅゅ',
  e: 'えけせてねへめれげぜでべぺぇ', o: 'おこそとのほもよろをごぞどぼぽぉょ',
};
const VOWEL_KANA = { あ: 'a', い: 'i', う: 'u', え: 'e', お: 'o' };
/** The vowel a mora ends in (null for ん and っ). */
export function vowelOf(mora) {
  const last = mora.slice(-1);
  for (const [v, list] of Object.entries(ROWS)) if (list.includes(last)) return v;
  return null;
}
const VOICELESS_IU = new Set([...'きくしすちつひふぴぷ', 'しゅ', 'ちゅ', 'きゅ', 'ひゅ']);
const VOICELESS_ONSET = new Set([...'かきくけこさしすせそたちつてとはひふへほぱぴぷぺぽっ']);

/** Kana in a form that compares fairly: hiragana, no spaces or punctuation, ー written as its vowel. */
export function canon(s) {
  const h = kata2hira(String(s || '').normalize('NFKC')).replace(/[\s、。！？!?・,.「」『』（）()〜～…]/g, '');
  let out = '';
  for (const c of h) {
    if (c === 'ー') {
      const v = vowelOf(out.slice(-1));
      out += v ? 'あいうえお'['aiueo'.indexOf(v)] : '';
    } else out += c;
  }
  return out;
}

/**
 * The morae of a reading with what kind each is: 'cv' (an ordinary beat), 'long' (a vowel held from the one before:
 * おばあさん's second あ, こうこう's う, ビール's ー), 'n' (ん, a beat of its own) or 'sokuon' (small っ, a silent beat).
 * devoice: an い/う between voiceless sounds, or the final す of です / ます, that usually goes quiet.
 */
export function moraInfo(reading) {
  const ms = toMorae(canon(reading));
  return ms.map((kana, i) => {
    const prev = i ? ms[i - 1] : '';
    const pv = vowelOf(prev);
    let type = 'cv';
    if (kana === 'ん') type = 'n';
    else if (kana === 'っ') type = 'sokuon';
    else if (VOWEL_KANA[kana] && pv && (VOWEL_KANA[kana] === pv || (kana === 'う' && pv === 'o') || (kana === 'い' && pv === 'e'))) type = 'long';
    const next = ms[i + 1];
    const devoice = type === 'cv' && VOICELESS_IU.has(kana) && i > 0
      && ((next && VOICELESS_ONSET.has(next[0])) || (!next && kana === 'す' && /[でま]/.test(prev)));
    return { kana, type, vowel: type === 'long' ? pv : vowelOf(kana), devoice };
  });
}

/**
 * Lines up what was heard with the target, mora by mora (edit distance with a trace back).
 * Returns per target mora { kana, ok, heard } and the list of operations (match / sub / del / ins).
 */
export function alignMorae(target, heard) {
  const t = target, h = heard;
  const n = t.length, m = h.length;
  const D = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(0));
  for (let i = 0; i <= n; i++) D[i][0] = i;
  for (let j = 0; j <= m; j++) D[0][j] = j;
  for (let i = 1; i <= n; i++) {
    for (let j = 1; j <= m; j++) D[i][j] = Math.min(D[i - 1][j] + 1, D[i][j - 1] + 1, D[i - 1][j - 1] + (t[i - 1] === h[j - 1] ? 0 : 1));
  }
  const ops = [];
  let i = n, j = m;
  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && D[i][j] === D[i - 1][j - 1] + (t[i - 1] === h[j - 1] ? 0 : 1)) {
      ops.unshift({ op: t[i - 1] === h[j - 1] ? 'match' : 'sub', i: i - 1, heard: h[j - 1] });
      i--; j--;
    } else if (i > 0 && D[i][j] === D[i - 1][j] + 1) {
      ops.unshift({ op: 'del', i: i - 1, heard: null });
      i--;
    } else {
      ops.unshift({ op: 'ins', i, heard: h[j - 1] });
      j--;
    }
  }
  const per = t.map((kana) => ({ kana, ok: false, heard: null }));
  for (const o of ops) if (o.op === 'match' || o.op === 'sub') { per[o.i].ok = o.op === 'match'; per[o.i].heard = o.heard; }
  return { per, ops, distance: D[n][m] };
}

/**
 * The sounds check. `transcripts`: what recognition heard (best first, alternatives after); `readingOf` turns
 * written Japanese (kanji) into kana where it can. The closest transcript wins: recognition is lenient and often
 * writes the word in kanji, so hearing the word itself counts as a full match.
 */
export function soundCheck(target, transcripts, readingOf = () => '') {
  const tm = moraInfo(target.reading);
  const tKana = tm.map((m) => m.kana);
  let best = null;
  for (const raw of transcripts.filter(Boolean)) {
    const plain = String(raw).replace(/[\s、。！？!?]/g, '');
    const exact = [target.jp, target.say].filter(Boolean).some((w) => plain === String(w).replace(/[\s、。！？!?]/g, ''));
    const kana = exact ? canon(target.reading) : canon(/[一-鿿]/.test(plain) ? (readingOf(plain) || plain) : plain);
    const al = alignMorae(tKana, toMorae(kana));
    const score = al.per.filter((p) => p.ok).length / Math.max(1, tKana.length);
    if (!best || score > best.score) best = { heard: raw, kana, score, ...al };
  }
  if (!best) return { available: true, heard: '', score: 0, per: tKana.map((kana) => ({ kana, ok: false, heard: null })), issues: [{ id: 'not_heard' }] };
  const issues = [];
  for (const o of best.ops) {
    if (o.op === 'match') continue;
    const m = tm[o.i] || tm[tm.length - 1];
    if (o.op === 'del' && m.type === 'long') issues.push({ id: 'long_short', at: o.i });
    else if (o.op === 'del' && m.type === 'sokuon') issues.push({ id: 'sokuon_missing', at: o.i });
    else if (o.op === 'del' && m.type === 'n') issues.push({ id: 'n_short', at: o.i });
    else if (o.op === 'ins' && VOWEL_KANA[o.heard] && tm[o.i - 1] && vowelOf(tm[o.i - 1].kana) === VOWEL_KANA[o.heard]) issues.push({ id: 'long_added', at: o.i - 1 });
    else if (o.op === 'sub') issues.push({ id: 'sound_swap', at: o.i, heard: o.heard });
  }
  return { available: true, heard: best.heard, score: best.score, per: best.per, issues };
}

// ---------- audio frames ----------

/** Frames: [{ time (s), hz (or null), level (rms) }], about every 30 ms. Trims silence at both ends. */
export function speechSpan(frames, floor = 0) {
  if (!frames.length) return null;
  const peak = Math.max(...frames.map((f) => f.level));
  const thr = Math.max(floor * 2.5, peak * 0.12, 0.003);
  let a = frames.findIndex((f) => f.level >= thr);
  let b = frames.length - 1 - [...frames].reverse().findIndex((f) => f.level >= thr);
  if (a < 0 || peak < 0.004) return null;
  return { from: a, to: b, thr, frames: frames.slice(a, b + 1) };
}

const median = (xs) => { const s = xs.filter((x) => x != null && Number.isFinite(x)).sort((a, b) => a - b); return s.length ? s[Math.floor(s.length / 2)] : null; };
const st = (hz, ref) => 12 * Math.log2(hz / ref);

/** Per-frame features for alignment: loudness (log, standardised), voiced or not, and pitch relative to the speaker. */
function features(frames, thr) {
  const logs = frames.map((f) => Math.log(Math.max(f.level, 1e-4)));
  const mu = logs.reduce((a, b) => a + b, 0) / logs.length;
  const sd = Math.sqrt(logs.reduce((a, b) => a + (b - mu) ** 2, 0) / logs.length) || 1;
  const ref = median(frames.map((f) => f.hz)) || 150;
  return frames.map((f, i) => [
    (logs[i] - mu) / sd,
    f.hz && f.level >= thr ? 1.5 : 0,
    f.hz ? Math.max(-2, Math.min(2, st(f.hz, ref) / 4)) : 0,
  ]);
}

/** Dynamic time warping: for each model frame, the user frames matched to it. */
export function warp(userF, modelF) {
  const n = userF.length, m = modelF.length;
  const dist = (a, b) => Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]) + Math.abs(a[2] - b[2]);
  const INF = 1e18;
  const D = Array.from({ length: n + 1 }, () => new Float64Array(m + 1).fill(INF));
  D[0][0] = 0;
  for (let i = 1; i <= n; i++) {
    for (let j = 1; j <= m; j++) {
      D[i][j] = dist(userF[i - 1], modelF[j - 1]) + Math.min(D[i - 1][j], D[i][j - 1], D[i - 1][j - 1]);
    }
  }
  const map = Array.from({ length: m }, () => []);
  let i = n, j = m;
  while (i > 0 && j > 0) {
    map[j - 1].push(i - 1);
    const a = D[i - 1][j - 1], b = D[i - 1][j], c = D[i][j - 1];
    if (a <= b && a <= c) { i--; j--; } else if (b <= c) i--; else j--;
  }
  return map;
}

/**
 * Per target mora: the user's frames (via the model clip when there is one, else an even split of the user's span),
 * how long they were held (s), how voiced they were, and their pitch (semitones from the user's median).
 */
export function moraSlots(target, user, model = null) {
  const tm = moraInfo(target.reading);
  const n = tm.length;
  const u = speechSpan(user.frames, user.floor);
  if (!u || !n) return null;
  const hop = u.frames.length > 1 ? (u.frames[u.frames.length - 1].time - u.frames[0].time) / (u.frames.length - 1) : 0.03;
  let groups;
  let modelGroups = null;
  const ms = model ? speechSpan(model.frames, 0) : null;
  if (ms && ms.frames.length >= n) {
    const map = warp(features(u.frames, u.thr), features(ms.frames, ms.thr));
    // The clip's morae: VOICEVOX speaks close to evenly timed morae, so its span is split evenly.
    const per = ms.frames.length / n;
    groups = tm.map((_, k) => {
      const set = new Set();
      for (let j = Math.floor(k * per); j < Math.floor((k + 1) * per); j++) for (const x of map[j] || []) set.add(x);
      return [...set].sort((a, b) => a - b);
    });
    modelGroups = tm.map((_, k) => ms.frames.slice(Math.floor(k * per), Math.floor((k + 1) * per)));
  } else {
    const per = u.frames.length / n;
    groups = tm.map((_, k) => Array.from({ length: Math.max(1, Math.floor((k + 1) * per) - Math.floor(k * per)) }, (__, x) => Math.floor(k * per) + x));
  }
  const ref = median(u.frames.map((f) => f.hz)) || 150;
  const mref = ms ? median(ms.frames.map((f) => f.hz)) || 150 : null;
  /** The longest unbroken voiced stretch (s) among these user frames: how long a vowel was actually held. */
  const run = (idx) => {
    let best = 0, cur = 0, last = -2;
    for (const x of [...new Set(idx)].sort((a, b) => a - b)) {
      const f = u.frames[x];
      const v = f && f.hz && f.level >= u.thr;
      cur = v ? (x === last + 1 ? cur + 1 : 1) : 0;
      if (v) last = x;
      best = Math.max(best, cur);
    }
    return best * hop;
  };
  return tm.map((m, k) => {
    const fs = groups[k].map((x) => u.frames[x]).filter(Boolean);
    // A long vowel is held across its own beat and the one before it, so its stretch spans both.
    const held = run(m.type === 'long' && k > 0 ? [...groups[k - 1], ...groups[k]] : groups[k]);
    const pitched = fs.filter((f) => f.hz && f.level >= u.thr);
    const mf = modelGroups ? modelGroups[k] : [];
    const mp = mf.filter((f) => f.hz && f.level >= ms.thr);
    return {
      ...m,
      dur: fs.length * hop,
      held,
      silent: fs.length ? fs.filter((f) => f.level < u.thr).length / fs.length : 0,
      voiced: fs.length ? pitched.length / fs.length : 0,
      pitch: pitched.length ? median(pitched.map((f) => st(f.hz, ref))) : null,
      modelVoiced: mf.length ? mp.length / mf.length : null,
      modelPitch: mp.length ? median(mp.map((f) => st(f.hz, mref))) : null,
    };
  });
}

/** The length and rhythm check: long vowels, small っ, ん, the quiet い/う, and rushing. */
export function lengthCheck(slots, { userSpan = null, modelSpan = null } = {}) {
  if (!slots) return { available: false, issues: [] };
  // One beat: the learner's own typical beat (the median, so one held vowel doesn't stretch it), so a slow or
  // fast speaker is measured against themselves.
  const unit = median(slots.map((s) => s.dur)) || 0.15;
  const issues = [];
  slots.forEach((s, i) => {
    if (s.type === 'long' && s.held < 1.25 * unit) issues.push({ id: 'long_short', at: i });
    else if (s.type === 'n' && s.dur < 0.45 * unit) issues.push({ id: 'n_short', at: i });
    else if (s.type === 'sokuon' && s.dur * s.silent < 0.35 * unit) issues.push({ id: 'sokuon_missing', at: i });
    else if (s.type === 'cv' && i < slots.length - 1 && slots[i + 1].type !== 'long' && s.held > 1.6 * unit) issues.push({ id: 'long_added', at: i });
    if (s.devoice && s.voiced > 0.7 && (s.modelVoiced == null || s.modelVoiced < 0.4)) issues.push({ id: 'devoice', at: i });
  });
  if (userSpan && modelSpan && userSpan / modelSpan < 0.55 && slots.length >= 3) issues.push({ id: 'rushed' });
  return { available: true, unit, issues };
}

/**
 * Target high / low per mora: from the word's accent (N5 deck) or a phrase's melody when known, else from the
 * model clip's own pitch.
 */
export function targetPitch(target, slots) {
  const n = slots ? slots.length : moraInfo(target.reading).length;
  if (Array.isArray(target.highs) && target.highs.length === n) return target.highs.map(Boolean);
  if (Number.isInteger(target.accent)) {
    const a = target.accent;
    return Array.from({ length: n }, (_, i) => (a === 1 ? i === 0 : i > 0 && (a === 0 || i < a)));
  }
  if (!slots) return null;
  const mp = slots.map((s) => s.modelPitch);
  const known = mp.filter((x) => x != null);
  if (known.length < Math.max(2, n / 2)) return null;
  const mid = (Math.min(...known) + Math.max(...known)) / 2;
  if (Math.max(...known) - Math.min(...known) < 1) return null;
  let last = false;
  return mp.map((x) => (x == null ? last : (last = x >= mid)));
}

/**
 * The pitch-accent check, scored the way listeners hear it (pitch-score.js): the direction of each step from one beat
 * to the next, and where the pitch drops. Whispered beats (the す in です) and the silent っ are left out.
 * Each issue says which step it's about (at → to), so the Pitch Coach can practise just that step.
 */
export function pitchCheck(target, slots) {
  const highs = targetPitch(target, slots);
  if (!slots || !highs) return { available: false, issues: [], highs };
  const u = slots.map((s) => s.pitch);
  const skip = slots.map((s) => s.devoice || s.type === 'sokuon');
  const known = u.filter((x, i) => x != null && !skip[i]).length;
  const scorable = highs.filter((_, i) => !skip[i]).length;
  if (known < Math.max(2, Math.ceil(scorable / 2))) return { available: false, issues: [], highs, user: u, skip };
  const sc = scorePitch(highs, u, { skip });
  if (sc.verdict === 'none') return { available: false, issues: [], highs, user: u, skip };
  const issues = [];
  const varies = highs.some(Boolean) && highs.some((h) => !h);
  const last = sc.steps[sc.steps.length - 1];
  if (varies && sc.steps.every((x) => x.got === 'level' && Math.abs(x.d) <= MIN_STEP_ST)) issues.push({ id: 'pitch_flat' });
  else if (sc.firstMiss) {
    const m = sc.firstMiss;
    const k = dropAt(highs);
    const at = { at: m.from, to: m.to };
    if (m.want === 'down' && m.from === 0) issues.push({ id: 'pitch_start_high', ...at });
    else if (m.want === 'up' && m.from === 0) issues.push({ id: 'pitch_start_low', ...at });
    else if (m.want === 'down') issues.push({ id: 'pitch_no_drop', ...at });
    else if (m.want === 'level' && m.got === 'down' && k >= 0 && m.from < k) issues.push({ id: 'pitch_early_drop', ...at, drop: k });
    else if (m.want === 'level' && m.got === 'down') issues.push({ id: 'pitch_end_drop', ...at });
    else if (m.got === 'up' && m === last) issues.push({ id: 'pitch_rise_end', ...at });
    else issues.push({ id: m.want === 'up' ? 'pitch_start_low' : 'pitch_no_drop', ...at });
    // A last step that rises where the word ends low is worth its own tip too.
    if (last !== m && last.got === 'up' && last.want !== 'up' && !last.ok) issues.push({ id: 'pitch_rise_end', at: last.from, to: last.to });
    else if (last === m && m.from === 0 && m.got === 'up' && m.want === 'down') issues.push({ id: 'pitch_rise_end', at: m.from, to: m.to });
  }
  return { available: true, highs, user: u, skip, match: sc.match, score: sc, issues };
}

/** Which tips to show: the two most useful, in this order, one per kind. */
const PRIORITY = ['silent', 'not_heard', 'sound_swap', 'long_short', 'long_added', 'sokuon_missing', 'n_short',
  'pitch_start_high', 'pitch_start_low', 'pitch_no_drop', 'pitch_early_drop', 'pitch_end_drop', 'pitch_rise_end', 'pitch_flat', 'devoice', 'rushed'];

export function pickIssues(all, max = 2) {
  const seen = new Set();
  return all.filter((x) => PRIORITY.includes(x.id))
    .sort((a, b) => PRIORITY.indexOf(a.id) - PRIORITY.indexOf(b.id))
    .filter((x) => !seen.has(x.id) && seen.add(x.id))
    .slice(0, max);
}

/**
 * The overall result, generous on purpose: each available check scores 2 (fine), 1 (nearly) or 0; the average
 * gives Great (≥ 1.5), Close (≥ 0.8) or Try again. Returns 'none' when nothing could be measured.
 */
export function verdict({ sounds, pitch, length }) {
  const parts = [];
  if (sounds && sounds.available) parts.push(sounds.score >= 0.8 ? 2 : sounds.score >= 0.45 ? 1 : 0);
  if (pitch && pitch.available) parts.push(pitch.score ? { great: 2, close: 1, try: 0 }[pitch.score.verdict] ?? 1 : pitch.match >= 0.7 && !pitch.issues.length ? 2 : pitch.match >= 0.5 ? 1 : 0);
  if (length && length.available) parts.push(length.issues.length === 0 ? 2 : length.issues.length === 1 ? 1 : 0);
  if (!parts.length) return 'none';
  const avg = parts.reduce((a, b) => a + b, 0) / parts.length;
  return avg >= 1.5 ? 'great' : avg >= 0.8 ? 'close' : 'try';
}

/** Everything at once. `user`: { frames, floor }, `model`: { frames } or null, `transcripts`: [] or null (no recognition). */
export function analyze(target, { user, model = null, transcripts = null, readingOf } = {}) {
  const sounds = transcripts ? soundCheck(target, transcripts, readingOf) : { available: false, issues: [] };
  const uSpan = user ? speechSpan(user.frames, user.floor) : null;
  if (!uSpan) {
    const issues = sounds.available && sounds.score > 0 ? sounds.issues : [{ id: 'silent' }];
    return { sounds, pitch: { available: false, issues: [] }, length: { available: false, issues: [] }, slots: null, issues: pickIssues(issues), verdict: sounds.available && sounds.score > 0 ? verdict({ sounds }) : 'none' };
  }
  const slots = moraSlots(target, user, model);
  const mSpan = model ? speechSpan(model.frames, 0) : null;
  const dur = (s) => (s ? s.frames[s.frames.length - 1].time - s.frames[0].time : null);
  const length = lengthCheck(slots, { userSpan: dur(uSpan), modelSpan: dur(mSpan) });
  const pitch = pitchCheck(target, slots);
  const all = [...(sounds.issues || []), ...length.issues, ...pitch.issues];
  const issues = pickIssues(all);
  let v = verdict({ sounds, pitch, length });
  // A clear slip (a sound, a beat or the pitch) keeps it at Close, however good the rest was.
  if (v === 'great' && issues.some((x) => !['devoice', 'rushed'].includes(x.id))) v = 'close';
  return { sounds, pitch, length, slots, issues, verdict: v };
}
