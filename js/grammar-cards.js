// Grammar review cards for the Garden: one per course grammar point ('g:<unit>:<point>') and one per conjugation
// form practised in Conjugation Dojo ('cj:<word>|<form>'). Pure data and question building; the schedule lives in
// store.js (store.s.grammar) and the Garden shows the cards (js/modes/garden.js).
//
// A grammar point is reviewed as a fill-in-the-blank on one of its example sentences, rotating through them so the
// answer can't be learned by heart from one line. Only existing example lines are spoken, so each has its clip.
import { STUDY_UNITS, UNIT_BY_ID } from './course-data.js';
import { CONJ_WORDS, FORM_LABEL, conjugate, conjPrompt, conjDistractors, conjWhy } from './practice-data.js';

/**
 * The particle each grammar point teaches, with wrong options picked for its sentence pattern: never one that would
 * also make a correct sentence (へやの テレビが あります, かばんに あります). Shared with the lesson recap.
 */
export const POINT_PARTICLES = {
  wa: [['は'], ['を', 'に', 'で']],
  no: [['の'], ['を', 'に', 'で']],
  suki: [['が'], ['に', 'で', 'へ', 'の']],
  'nani-ga': [['が'], ['に', 'で', 'へ', 'の']],
  'qword-ga': [['が'], ['を', 'で', 'の']],
  arimasu: [['が'], ['を', 'で', 'へ']],
  imasu: [['が'], ['を', 'で', 'へ']],
  mo: [['も'], ['を', 'で', 'へ']],
  'to-and': [['と'], ['を', 'へ', 'で']],
  'to-with': [['と'], ['を', 'へ', 'で']],
  wo: [['を'], ['に', 'で', 'の']],
  kudasai: [['を'], ['に', 'で', 'の']],
  'count-order': [['を'], ['に', 'で', 'の']],
  'ni-he': [['に', 'へ'], ['を', 'で', 'の']],
  'ni-exist': [['に'], ['を', 'へ', 'が']],
  'ji-ni': [['に'], ['を', 'で', 'へ']],
  'de-place': [['で'], ['を', 'へ', 'が']],
  'de-means': [['で'], ['を', 'へ', 'に']],
};

/**
 * What to blank in each point's examples, for points that aren't about a particle (or that test more than one).
 * Each entry: `ans` is the piece blanked (its first appearance, after `after` when given); `wrong` are wrong options,
 * each wrong for that sentence and its English. An example where no entry matches is skipped.
 */
const CLOZE = {
  greetings: [{ ans: 'おはよう', wrong: ['こんばんは', 'さようなら', 'ありがとう'] }, { ans: 'はじめまして', wrong: ['さようなら', 'おやすみ', 'すみません'] }],
  desu: [{ ans: 'です', wrong: ['ます', 'を', 'に'] }],
  ka: [{ ans: 'か', after: 'です', wrong: ['を', 'に', 'の'] }],
  kosoado: [{ ans: 'これ', wrong: ['それ', 'あれ'] }],
  nan: [{ ans: 'なん', wrong: ['だれ', 'どこ', 'いつ'] }],
  da: [{ ans: 'だ', after: '町', wrong: ['を', 'に', 'で'] }],
  'nani-ga': [{ ans: 'が', after: 'なに', wrong: ['に', 'で', 'へ', 'の'] }, { ans: 'じゃない', wrong: ['ない', 'くない', 'でした'] }],
  masu: [{ ans: 'ます', wrong: ['ません', 'ました', 'たい'] }],
  masen: [{ ans: 'ません', wrong: ['ます', 'ました', 'たい'] }],
  'time-words': [{ ans: 'あした', wrong: ['きのう', 'せんしゅう'] }],
  onegai: [{ ans: 'おねがいします', wrong: ['ありがとう', 'すみません', 'いらっしゃいませ'] }],
  ikura: [{ ans: 'いくら', wrong: ['だれ', 'どこ', 'いつ'] }],
  mashita: [{ ans: 'ました', wrong: ['ます', 'ません', 'たい'] }],
  'masen-deshita': [{ ans: 'ませんでした', wrong: ['ました', 'ません', 'ます'] }],
  deshita: [{ ans: 'でした', wrong: ['です', 'ます', 'ました'] }],
  'mashita-ka': [{ ans: 'ましたか', wrong: ['ますか', 'ました', 'ません'] }],
  'i-adj': [{ ans: 'い', after: 'さむ', wrong: ['な', 'だ', 'の'] }],
  'adj-noun': [{ ans: 'つよい', wrong: ['よわい', 'おおきい', 'ちいさい'] }, { ans: 'いい', wrong: ['つよい', 'おおきい', 'あかい'] }],
  'na-adj': [{ ans: 'な', after: 'げんき', wrong: ['の', 'い', 'だ'] }],
  'adj-neg': [{ ans: 'くない', wrong: ['じゃない', 'ない', 'かった'] }],
  arimasu: [{ ans: 'あります', wrong: ['います', 'ありません'] }],
  imasu: [{ ans: 'います', after: 'ねこが', wrong: ['あります', 'いません'] }],
  position: [{ ans: '下', wrong: ['上', '中'] }],
  tsu: [{ ans: 'みっつ', wrong: ['ふたつ', 'よっつ'] }],
  'hon-mai': [{ ans: 'にほん', wrong: ['にまい', 'さんぼん'] }, { ans: 'にまい', wrong: ['にほん', 'さんまい'] }],
  nanji: [{ ans: 'なんじ', wrong: ['いくら', 'だれ', 'どこ'] }],
  dare: [{ ans: 'だれ', wrong: ['なに', 'どこ', 'いつ'] }],
  doko: [{ ans: 'どこ', wrong: ['だれ', 'いつ', 'なん'] }],
  itsu: [{ ans: 'いつ', wrong: ['どこ', 'だれ', 'なん'] }],
  tai: [{ ans: 'たい', wrong: ['ます', 'ない', 'た'] }],
  'te-form': [{ ans: 'まって', wrong: ['まちて', 'まつて', 'またて'] }],
  'te-kudasai': [{ ans: 'いって', wrong: ['いいて', 'いうて', 'いきて'] }],
  masenka: [{ ans: 'ませんか', wrong: ['ました', 'たい', 'ません'] }, { ans: 'ましょう', wrong: ['ません', 'ました', 'ます'] }],
};

const POINTS = new Map();
for (const u of STUDY_UNITS) for (const p of u.points) POINTS.set(`g:${u.id}:${p.id}`, { u, p });

/** The blank for one example of a point, or null if this example doesn't show it. */
function clozeFor(p, ex) {
  const specs = CLOZE[p.id] || (POINT_PARTICLES[p.id] ? POINT_PARTICLES[p.id][0].map((ans) => ({ ans, particle: true, wrong: POINT_PARTICLES[p.id][1] })) : []);
  for (const s of specs) {
    const from = s.after ? ex.jp.indexOf(s.after) : 0;
    if (from < 0) continue;
    let at = ex.jp.indexOf(s.ans, s.after ? from + s.after.length : 0);
    if (s.particle) {
      // A particle: the first one that ends a space-separated piece (so the に in なに or the の in この is never it).
      at = -1;
      let pos = 0;
      for (const piece of ex.jp.split(' ')) {
        const core = piece.replace(/[、。！？!?…]+$/, '');
        if (core.length >= 2 && core.endsWith(s.ans)) { at = pos + core.length - 1; break; }
        pos += piece.length + 1;
      }
    }
    if (at < 0) continue;
    return { ans: s.ans, wrong: s.wrong.filter((w) => w !== s.ans), blanked: ex.jp.slice(0, at) + '（　）' + ex.jp.slice(at + s.ans.length) };
  }
  return null;
}

/** The examples of a point that can be asked, with their blanks. */
function usable(p) {
  return p.examples.map((ex) => ({ ex, c: clozeFor(p, ex) })).filter((x) => x.c);
}

/** Grammar-point card keys for a unit (only points that have a sentence to blank). */
export function unitCardKeys(unitId) {
  const u = UNIT_BY_ID[unitId];
  if (!u || u.outline) return [];
  return u.points.filter((p) => usable(p).length).map((p) => `g:${u.id}:${p.id}`);
}

/** Conjugation card key for a Conjugation Dojo question. */
export const conjKey = (wordJp, form) => `cj:${wordJp}|${form}`;

const CONJ_BY_JP = new Map(CONJ_WORDS.map((w) => [w.jp, w]));

/** Whether a key names a card this version of the app can show. */
export function isCardKey(key) {
  if (POINTS.has(key)) return usable(POINTS.get(key).p).length > 0;
  const m = /^cj:(.+)\|(\w+)$/.exec(key);
  return !!(m && CONJ_BY_JP.has(m[1]) && FORM_LABEL[m[2]]);
}

const shuffle = (a) => {
  const arr = a.slice();
  for (let i = arr.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [arr[i], arr[j]] = [arr[j], arr[i]]; }
  return arr;
};

/**
 * The question for a card on its `n`th review (rotating the examples). `nOptions`: how many choices (3 or 4).
 * Returns { kind, label, title, show, en, options (right first), why, explain, say, hint } or null.
 */
export function cardQuestion(key, n = 0, nOptions = 4) {
  if (POINTS.has(key)) {
    const { p } = POINTS.get(key);
    const exs = usable(p);
    if (!exs.length) return null;
    const { ex, c } = exs[n % exs.length];
    const firstLine = p.explain.split(/(?<=\.)\s/)[0];
    return {
      kind: 'grammar', label: 'Grammar', title: p.title, show: ex.jp, blanked: c.blanked, en: ex.en,
      options: [c.ans, ...shuffle(c.wrong)].slice(0, Math.max(2, Math.min(nOptions, c.wrong.length + 1))),
      why: firstLine, explain: p.explain, say: { text: ex.jp, voice: ex.voice },
      more: p.examples.filter((x) => x !== ex).map((x) => ({ jp: x.jp, en: x.en, voice: x.voice })),
    };
  }
  const m = /^cj:(.+)\|(\w+)$/.exec(key);
  const word = m && CONJ_BY_JP.get(m[1]);
  if (!word) return null;
  const form = m[2];
  const answer = conjugate(word, form);
  const prompt = conjPrompt(word, form);
  return {
    kind: 'conj', label: 'Conjugation', title: `${FORM_LABEL[form]} of ${prompt.jp}`, show: prompt.jp, blanked: null, en: word.en,
    formLabel: FORM_LABEL[form], options: [answer.jp, ...shuffle(conjDistractors(word, form))].slice(0, nOptions),
    why: conjWhy(word, form), explain: conjWhy(word, form), say: { text: answer.jp, voice: 0 }, more: [],
  };
}

/** A short name for a card, for lists ("は marks the topic", "て-form of 食べる"). */
export function cardName(key) {
  if (POINTS.has(key)) return POINTS.get(key).p.title;
  const q = cardQuestion(key);
  return q ? q.title : key;
}
