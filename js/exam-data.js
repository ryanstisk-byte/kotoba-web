// Mock JLPT: the question bank, a mock's layout and its score. Pure data and maths (no DOM, no store), so it runs in
// Node for the tests. Every question is made from the app's own content (the N5 deck, the course grammar, Sentence
// Builder, the story and the listening scenes), never from official tests, and only existing lines are spoken, so
// every one has its VOICEVOX clip. The screen is js/exam.js; readiness is js/readiness.js.
//
// It follows the real N5's parts and question types where the app has the material for them:
//   Vocabulary  kanji reading (漢字読み), which spelling (表記), word in context (文脈規定)
//   Grammar     sentence grammar (文法形式の判断), the starred slot (文の組み立て)
//   Reading     short story passages with questions (読解)
//   Listening   short scenes (課題・ポイント理解), numbers and times (課題理解), what a line means (発話の理解)
// Paraphrase, text grammar and notices are left out until there is hand-written material for them.
import { N5_WORDS } from './data.js';
import { CHAPTERS } from './data.js';
import { QUIZZES } from './story-data.js';
import { DIALOGUES, NUMBER_SCENES, BUILD_SENTENCES } from './practice-data.js';
import { STUDY_UNITS } from './course-data.js';
import { unitCardKeys, cardQuestion } from './grammar-cards.js';

/** The levels the app knows about, easiest first. Only N5 has a mock so far. */
export const LEVELS = ['N5', 'N4', 'N3', 'N2', 'N1'];
export const MOCK_LEVELS = ['N5'];

/** The real N5's score: two scored sections, a pass line and a minimum for each section. */
export const SCORING = {
  N5: { lk: { max: 120, min: 38 }, li: { max: 60, min: 19 }, total: 180, pass: 80 },
};

/** Parts of a mock, in order. `group` is the scored section: lk = language knowledge and reading, li = listening. */
export const PARTS = {
  vocab: { title: 'Vocabulary', group: 'lk', practice: [['garden', 'Garden'], ['forge', 'Kanji Forge'], ['dojo', 'Reading Dojo']] },
  grammar: { title: 'Grammar', group: 'lk', practice: [['particle', 'Particle Train'], ['build', 'Sentence Builder'], ['conj', 'Conjugation Dojo']] },
  reading: { title: 'Reading', group: 'lk', practice: [['story', 'Story']] },
  listening: { title: 'Listening', group: 'li', practice: [['listen', 'Listening Lab'], ['numbers', 'Numbers & Time']] },
};

/**
 * Timed sections, as in the real N5 (minutes): vocabulary 20, grammar and reading 40, listening 30. The mini mock
 * uses the same order with a few questions from each part and no clock.
 */
export const FORMATS = {
  full: {
    title: 'Full mock', timed: true,
    sections: [
      { id: 'vocab', title: 'Vocabulary', minutes: 20, parts: { read: 7, spell: 5, context: 9 } },
      { id: 'grammar', title: 'Grammar and reading', minutes: 40, parts: { grammar: 10, star: 5, passage: 3 } },
      { id: 'listening', title: 'Listening', minutes: 30, parts: { scene: 3, number: 6, line: 8 } },
    ],
  },
  mini: {
    title: 'Mini mock', timed: false, minutes: 10,
    sections: [
      { id: 'vocab', title: 'Vocabulary', parts: { read: 2, spell: 1, context: 2 } },
      { id: 'grammar', title: 'Grammar and reading', parts: { grammar: 3, star: 1, passage: 1 } },
      { id: 'listening', title: 'Listening', parts: { scene: 1, number: 1, line: 2 } },
    ],
  },
};

const KANJI_RE = /[一-鿿々]/;
const HIRA_RE = /^[ぁ-ゖー]+$/;

// ---------- near-miss readings (the kind of wrong options the real kanji-reading questions use) ----------

const VOWEL = {};
for (const [v, row] of Object.entries({
  a: 'あかさたなはまやらわがざだばぱぁ', i: 'いきしちにひみりぎじぢびぴぃ', u: 'うくすつぬふむゆるぐずづぶぷぅ',
  e: 'えけせてねへめれげぜでべぺぇ', o: 'おこそとのほもよろをごぞどぼぽぉ',
})) for (const k of row) VOWEL[k] = v;
const SMALL_VOWEL = { 'ゃ': 'a', 'ゅ': 'u', 'ょ': 'o' };
const VOICING = [['か', 'が'], ['き', 'ぎ'], ['く', 'ぐ'], ['け', 'げ'], ['こ', 'ご'], ['さ', 'ざ'], ['し', 'じ'], ['す', 'ず'], ['せ', 'ぜ'],
  ['そ', 'ぞ'], ['た', 'だ'], ['て', 'で'], ['と', 'ど'], ['は', 'ば', 'ぱ'], ['ひ', 'び', 'ぴ'], ['ふ', 'ぶ', 'ぷ'],
  ['へ', 'べ', 'ぺ'], ['ほ', 'ぼ', 'ぽ']];
const VOICED = {};
for (const set of VOICING) for (const k of set) VOICED[k] = set.filter((x) => x !== k);
const SMALL = { 'ゃ': 'や', 'ゅ': 'ゆ', 'ょ': 'よ' };
const BIG = { 'や': 'ゃ', 'ゆ': 'ゅ', 'よ': 'ょ' };
const DOUBLES = /[かきくけこさしすせそたちつてとぱぴぷぺぽ]/;

const vowelAt = (r, i) => SMALL_VOWEL[r[i + 1]] || (SMALL_VOWEL[r[i]] ? SMALL_VOWEL[r[i]] : VOWEL[r[i]]);

/**
 * Readings one slip away from `r`: a long vowel added or dropped (きょう / きょ), voicing changed (かいしゃ / がいしゃ),
 * a small っ added or dropped, a small ゃゅょ written big or the other way round, an ん dropped. Each is tagged with
 * the kind of slip, so the wrong options can be varied.
 */
export function nearMisses(r) {
  const out = new Map();
  const add = (s, kind) => { if (s !== r && s.length >= 1 && !out.has(s) && !/^[ゃゅょっー]/.test(s)) out.set(s, kind); };
  for (let i = 0; i < r.length; i++) {
    const k = r[i];
    for (const v of VOICED[k] || []) add(r.slice(0, i) + v + r.slice(i + 1), 'voicing');
    if (SMALL[k]) add(r.slice(0, i) + SMALL[k] + r.slice(i + 1), 'small');
    if (BIG[k] && i > 0 && VOWEL[r[i - 1]] === 'i') add(r.slice(0, i) + BIG[k] + r.slice(i + 1), 'small');
    if (k === 'っ') add(r.slice(0, i) + r.slice(i + 1), 'double');
    if (k === 'ん' && i > 0) add(r.slice(0, i) + r.slice(i + 1), 'n');
    if (i > 0 && DOUBLES.test(k) && r[i - 1] !== 'っ' && r[i - 1] !== 'ん' && VOWEL[r[i - 1]]) add(r.slice(0, i) + 'っ' + r.slice(i), 'double');
    // Long vowels: おう / えい / うう after a kana with that vowel.
    const v = vowelAt(r, i);
    const next = SMALL_VOWEL[r[i + 1]] ? i + 2 : i + 1;
    // Not after a kana that already lengthens the one before it (no がっこうう).
    if (!v || k === 'っ' || k === 'ん' || SMALL_VOWEL[k] || (i > 0 && (k === 'う' || k === 'い') && vowelAt(r, i - 1))) continue;
    const long = { o: 'う', u: 'う', e: 'い', i: 'い', a: 'あ' }[v];
    if (r[next] === long) add(r.slice(0, next) + r.slice(next + 1), 'long');
    else if (v !== 'a' && v !== 'i') add(r.slice(0, next) + long + r.slice(next), 'long');
  }
  return out;
}

// ---------- helpers ----------

function shuffleWith(a, rand) {
  const arr = a.slice();
  for (let i = arr.length - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [arr[i], arr[j]] = [arr[j], arr[i]]; }
  return arr;
}

/** Takes `n` from `list`, questions not seen in recent mocks first (each group shuffled). */
function takeFresh(list, n, seen, rand, idOf = (x) => x.id) {
  const fresh = list.filter((x) => !seen.has(idOf(x)));
  const old = list.filter((x) => seen.has(idOf(x)));
  return [...shuffleWith(fresh, rand), ...shuffleWith(old, rand)].slice(0, n);
}

/** Distinct options with the right one first: the right answer, then the first n - 1 others not equal to it. */
function options(right, pool, n = 4) {
  const out = [right];
  for (const x of pool) { if (out.length >= n) break; if (x && !out.includes(x)) out.push(x); }
  return out;
}

const words = (s) => new Set(String(s).toLowerCase().split(/[^a-z]+/).filter((x) => x.length >= 4));
const sharesWord = (a, b) => { const wa = words(a); return [...words(b)].some((x) => wa.has(x)); };

/** Words the context questions avoid: pointing and question words, where more than one option can fit. */
const VAGUE = /^(this|that|which|what|who|where|when|here|there|over there|how|i \/|you|he|she)\b/i;

const kindOf = (w) => (/^to /.test(w.en) ? 'verb' : /い$/.test(w.jp) && /い$/.test(w.reading) && !KANJI_RE.test(w.jp.slice(-1)) ? 'adj' : 'noun');

/** Splits a sentence around the first place `word` appears: { before, mark, after }. */
const around = (sentence, word, shown = word) => {
  const at = sentence.indexOf(word);
  return { before: sentence.slice(0, at), mark: shown, after: sentence.slice(at + word.length) };
};

// ---------- the question bank (built once) ----------

const DECK = N5_WORDS.filter((w) => w.ex && w.exEn);

/** Kanji reading: a word in its example sentence, underlined; pick how it's read. */
const READ = DECK.filter((w) => KANJI_RE.test(w.jp) && w.jp.length <= 3 && HIRA_RE.test(w.reading) && w.ex.includes(w.jp) && nearMisses(w.reading).size >= 3);

/** Which spelling: the word's reading underlined in its sentence; pick how it's written. */
const SPELL = DECK.filter((w) => KANJI_RE.test(w.jp) && HIRA_RE.test(w.reading) && w.ex.includes(w.jp));

/** Word in context: the word blanked in its example; pick the word that fits (the English is shown). */
const CONTEXT = DECK.filter((w) => w.ex.includes(w.jp) && w.jp.length < w.ex.length - 2 && !VAGUE.test(w.en));

/** The N5 course's grammar cards (re-entry and N5 core units). */
export const N5_GRAMMAR_KEYS = STUDY_UNITS.filter((u) => u.phase === 'p0' || u.phase === 'p1').flatMap((u) => unitCardKeys(u.id));

/** Particles that let a phrase move: with two of them among the four slots, more than one order can be right. */
const FREE = new Set(['は', 'が', 'を', 'に', 'で', 'へ', 'と', 'も', 'から', 'まで']);
/** Time words and counted amounts can float around the sentence too (まいにち にほんごを / にほんごを まいにち). */
const FLOATS = /^(まいにち|毎日|きょう|今日|あした|明日|きのう|昨日|いつも|よく|ときどき|.+つ|.+[はぱば]い|.+[ほぼぽ]ん|.+本|.+まい|.+枚|.+人|.+時)$/;
/** Where four slots in a row can start so that only one order is right (at most one movable piece among them). */
const starts = (s) => {
  const out = [];
  for (let i = 0; i + 4 <= s.tiles.length; i++) if (s.tiles.slice(i, i + 4).filter((t) => FREE.has(t) || FLOATS.test(t)).length <= 1) out.push(i);
  return out;
};
/** Sentence Builder sentences with one right order, no repeated tiles and somewhere to put four unambiguous slots. */
const STAR = BUILD_SENTENCES.filter((s) => s.tiles.length >= 4 && !(s.alts || []).length && new Set(s.tiles).size === s.tiles.length && starts(s).length);

const PASSAGES = CHAPTERS.filter((c) => (QUIZZES[c.id] || []).length);

// ---------- question builders ----------

function readQuestion(w, rand) {
  const misses = nearMisses(w.reading);
  // One of each kind of slip first, so the options don't all differ the same way.
  const byKind = new Map();
  for (const [s, kind] of shuffleWith([...misses], rand)) if (!byKind.has(kind)) byKind.set(kind, s);
  const pool = [...byKind.values(), ...shuffleWith([...misses.keys()], rand)];
  return {
    id: 'read:' + w.id, part: 'vocab', type: 'read', label: 'Kanji reading',
    ask: 'How is the underlined word read?', sentence: around(w.ex, w.jp), noruby: true,
    options: options(w.reading, pool), ja: true,
    answer: w.reading, why: `${w.jp} is read ${w.reading}: "${w.en}".`, garden: [w.id],
  };
}

function spellQuestion(w, rand) {
  const chars = new Set([...w.jp].filter((c) => KANJI_RE.test(c)));
  const others = SPELL.filter((x) => x.jp !== w.jp && x.reading !== w.reading && x.jp.length === w.jp.length);
  const sharing = others.filter((x) => [...x.jp].some((c) => chars.has(c)));
  const pool = [...shuffleWith(sharing, rand), ...shuffleWith(others, rand), ...shuffleWith(SPELL, rand)].map((x) => x.jp)
    .filter((jp) => jp !== w.jp);
  return {
    id: 'spell:' + w.id, part: 'vocab', type: 'spell', label: 'Which spelling',
    ask: 'How is the underlined word written?', sentence: around(w.ex, w.jp, w.reading), noruby: true,
    options: options(w.jp, pool), ja: true,
    answer: w.jp, why: `${w.reading} is written ${w.jp}: "${w.en}".`, garden: [w.id],
  };
}

function contextQuestion(w, rand) {
  const kind = kindOf(w);
  const fits = (x) => x.jp !== w.jp && x.reading !== w.reading && !sharesWord(x.en, w.en) && !w.ex.includes(x.jp);
  const same = DECK.filter((x) => kindOf(x) === kind && fits(x));
  const pool = [...shuffleWith(same, rand), ...shuffleWith(DECK.filter(fits), rand)].map((x) => x.jp);
  const at = w.ex.indexOf(w.jp);
  return {
    id: 'ctx:' + w.id, part: 'vocab', type: 'context', label: 'Word in context',
    ask: 'Which word fits the blank?', blanked: w.ex.slice(0, at) + '（　）' + w.ex.slice(at + w.jp.length), en: w.exEn, noruby: true,
    options: options(w.jp, pool), ja: true,
    answer: w.jp, why: `${w.jp} (${w.reading}) means "${w.en}". ${w.ex} = "${w.exEn}"`, garden: [w.id], say: [{ text: w.ex, voice: 0 }],
  };
}

function grammarQuestion(key, rand) {
  const n = Math.floor(rand() * 6);
  const q = cardQuestion(key, n, 4);
  if (!q || !q.blanked) return null;
  return {
    id: 'gram:' + key, part: 'grammar', type: 'grammar', label: 'Sentence grammar',
    ask: 'Which fits the blank?', blanked: q.blanked, en: q.en,
    options: q.options, ja: true,
    answer: q.options[0], why: `${q.title}. ${q.why}`, grammar: [key], say: [q.say],
  };
}

function starQuestion(s, rand) {
  // Four slots in a row (the rest of the sentence is given), the star on one of them.
  const ok = starts(s);
  const start = ok[Math.floor(rand() * ok.length)];
  const slots = s.tiles.slice(start, start + 4);
  const star = Math.floor(rand() * 4);
  return {
    id: 'star:' + s.id, part: 'grammar', type: 'star', label: 'The starred slot',
    ask: 'Put the four pieces in order. Which one goes in the ★ slot?',
    frame: { before: s.tiles.slice(0, start).join(''), slots: 4, star, after: s.tiles.slice(start + 4).join('') }, en: s.en,
    options: options(slots[star], shuffleWith(slots, rand)), ja: true,
    answer: slots[star], why: `In order: ${s.tiles.join(' ')} = "${s.en}".`, garden: s.garden || [], say: [{ text: s.say, voice: s.voice || 0 }],
  };
}

function passageQuestions(ch) {
  const passage = { id: ch.id, title: `${ch.title} (${ch.en})`, lines: ch.beats.map((b) => ({ who: b.speaker.name, jp: b.jp })) };
  return QUIZZES[ch.id].map((q, i) => ({
    id: `pass:${ch.id}`, qid: `pass:${ch.id}:${i}`, part: 'reading', type: 'passage', label: 'Reading',
    ask: q.q, passage, options: q.options.slice(), ja: false,
    answer: q.options[0], why: q.why,
  }));
}

function sceneQuestions(d) {
  const lines = d.lines.map((l) => ({ text: l.jp, voice: l.who.voice, who: l.who.name }));
  return d.questions.map((q, i) => ({
    id: `scene:${d.id}`, qid: `scene:${d.id}:${i}`, part: 'listening', type: 'scene', label: 'Listen to the scene',
    ask: q.q, say: lines, transcript: lines, options: q.options.slice(), ja: false,
    answer: q.options[0], why: q.why,
  }));
}

function numberQuestion(s) {
  return {
    id: 'num:' + s.id, part: 'listening', type: 'number', label: 'Numbers and times',
    ask: s.q, say: [{ text: s.jp, voice: s.voice }], transcript: [{ text: s.jp, voice: s.voice }], options: s.options.slice(), ja: false,
    answer: s.options[0], why: `${s.why} (${s.en})`, garden: s.garden || [],
  };
}

function lineQuestion(w, rand) {
  const pool = shuffleWith(DECK.filter((x) => x !== w && !sharesWord(x.exEn, w.exEn)), rand).map((x) => x.exEn);
  return {
    id: 'line:' + w.id, part: 'listening', type: 'line', label: 'What does it mean?',
    ask: 'Listen. What does it mean?', say: [{ text: w.ex, voice: 0 }], transcript: [{ text: w.ex, voice: 0 }],
    options: options(w.exEn, pool), ja: false,
    answer: w.exEn, why: `You heard ${w.ex}: "${w.exEn}".`, garden: [w.id],
  };
}

// ---------- a whole mock ----------

/**
 * Lays out a mock: { level, format, timed, sections: [{ id, title, minutes, questions }] }. `seen` holds question ids
 * from recent mocks; fresh ones are picked first, so two mocks in a row share few questions. `rand` is for tests.
 */
export function buildMock({ level = 'N5', format = 'mini', seen = [], rand = Math.random } = {}) {
  const f = FORMATS[format] || FORMATS.mini;
  const s = new Set(seen);
  const sections = f.sections.map((sec) => {
    const p = sec.parts;
    let qs = [];
    if (sec.id === 'vocab') {
      const used = new Set();
      const pick = (list, n, prefix) => {
        const got = takeFresh(list.filter((w) => !used.has(w.id)), n, s, rand, (w) => prefix + w.id);
        got.forEach((w) => used.add(w.id));
        return got;
      };
      qs = [
        ...pick(READ, p.read, 'read:').map((w) => readQuestion(w, rand)),
        ...pick(SPELL, p.spell, 'spell:').map((w) => spellQuestion(w, rand)),
        ...pick(CONTEXT, p.context, 'ctx:').map((w) => contextQuestion(w, rand)),
      ];
    } else if (sec.id === 'grammar') {
      qs = [
        ...takeFresh(N5_GRAMMAR_KEYS, p.grammar, s, rand, (k) => 'gram:' + k).map((k) => grammarQuestion(k, rand)).filter(Boolean),
        ...takeFresh(STAR, p.star, s, rand, (x) => 'star:' + x.id).map((x) => starQuestion(x, rand)),
        ...takeFresh(PASSAGES, p.passage, s, rand, (c) => 'pass:' + c.id).flatMap(passageQuestions),
      ];
    } else {
      qs = [
        ...takeFresh(DIALOGUES, p.scene, s, rand, (d) => 'scene:' + d.id).flatMap(sceneQuestions),
        ...takeFresh(NUMBER_SCENES, p.number, s, rand, (x) => 'num:' + x.id).map(numberQuestion),
        ...takeFresh(DECK, p.line, s, rand, (w) => 'line:' + w.id).map((w) => lineQuestion(w, rand)),
      ];
    }
    return { id: sec.id, title: sec.title, minutes: f.timed ? sec.minutes : null, questions: qs };
  });
  return { level, format, timed: f.timed, sections };
}

/** Every question's id in a mock (a passage or scene counts once), for "seen recently". */
export const mockIds = (mock) => [...new Set(mock.sections.flatMap((s) => s.questions.map((q) => q.id)))];

/**
 * Scores answered questions like the real test: each scored section scales to its maximum by the share right, then
 * the pass line and each section's minimum are checked. `answers` maps a question's index (in order, over all
 * sections) to the option picked, or null / missing when unanswered.
 */
export function scoreMock(mock, answers) {
  const sc = SCORING[mock.level];
  const parts = {};
  for (const id of Object.keys(PARTS)) parts[id] = [0, 0];
  let i = 0;
  for (const sec of mock.sections) {
    for (const q of sec.questions) {
      const t = parts[q.part];
      t[1] += 1;
      if (answers[i] != null && answers[i] === q.answer) t[0] += 1;
      i++;
    }
  }
  const group = (g) => Object.entries(parts).filter(([id]) => PARTS[id].group === g).reduce((a, [, t]) => [a[0] + t[0], a[1] + t[1]], [0, 0]);
  const [lkOk, lkTot] = group('lk');
  const [liOk, liTot] = group('li');
  const lk = lkTot ? Math.round((sc.lk.max * lkOk) / lkTot) : 0;
  const li = liTot ? Math.round((sc.li.max * liOk) / liTot) : 0;
  const total = lk + li;
  const pass = total >= sc.pass && lk >= sc.lk.min && li >= sc.li.min;
  return { lk, li, total, pass, parts, ok: lkOk + liOk, n: lkTot + liTot };
}

/** Sizes of the bank, for the tests and the intro screen. */
export const BANK = { read: READ.length, spell: SPELL.length, context: CONTEXT.length, grammar: N5_GRAMMAR_KEYS.length, star: STAR.length, passage: PASSAGES.length, scene: DIALOGUES.length, number: NUMBER_SCENES.length, line: DECK.length };
