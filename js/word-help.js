// Help for a stuck word (the Garden's needs-help panel): its picture mnemonic, an example sentence that already has
// a voice clip, and the words it's easiest to confuse it with, by sound or by look. Pure lookups over the app's own
// data, so every word and line shown here can be played.
import { GARDEN_CATALOG, CHAPTERS } from './data.js';
import { COURSE_EXAMPLES } from './course-data.js';
import { MNEMONICS } from './mnemonics.js';

export const mnemonicFor = (id) => MNEMONICS[id] || null;

const DAKUTEN = Object.fromEntries([...'がぎぐげござじずぜぞだぢづでどばびぶべぼぱぴぷぺぽ'].map((c, i) => [c, 'かきくけこさしすせそたちつてとはひふへほはひふへほ'[i]]));
const SMALL = { ゃ: 'や', ゅ: 'ゆ', ょ: 'よ', ぁ: 'あ', ぃ: 'い', ぅ: 'う', ぇ: 'え', ぉ: 'お' };
const kata2hira = (s) => s.replace(/[ァ-ヶ]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0x60));

/**
 * The "skeleton" of a reading: what's left when the details beginners mishear are dropped (voicing marks, small
 * っ, long vowels, small ゃゅょ). Two words with the same skeleton but different readings sound alike.
 */
export function soundSkeleton(reading) {
  let s = kata2hira(String(reading || '')).replace(/\s|ー|っ/g, '');
  s = [...s].map((c) => DAKUTEN[c] || SMALL[c] || c).join('');
  // Long vowels: a vowel kana right after a syllable ending in the same vowel (おばあさん, とおい, せんせい, こうこう).
  const V = { あ: 'a', い: 'i', う: 'u', え: 'e', お: 'o' };
  const vowelOf = (c) => {
    if (!c) return null;
    const rows = { a: 'あかさたなはまやらわ', i: 'いきしちにひみり', u: 'うくすつぬふむゆる', e: 'えけせてねへめれ', o: 'おこそとのほもよろを' };
    for (const [v, list] of Object.entries(rows)) if (list.includes(c)) return v;
    return null;
  };
  let out = '';
  for (const c of s) {
    const prev = out.slice(-1);
    const pv = vowelOf(prev);
    if (V[c] && pv && (V[c] === pv || (c === 'う' && pv === 'o') || (c === 'い' && pv === 'e'))) continue;
    out += c;
  }
  return out;
}

/** Characters that are easy to mix up by shape: kana and the kanji in the app's words. */
const LOOK_ALIKE = ['シツ', 'ソン', 'ぬめ', 'ねれわ', 'るろ', 'はほ', 'さちき', 'あお', 'クケ', 'コユ', 'ウワ', 'マム', 'ヌス',
  '大犬太', '人入八', '日目白', '土士', '未末', '右石', '千午', '天夫', '王玉', '白百', '木本', '体休', '手毛', '力刀', '見貝', '子了', '今会', '先生'];
const SHAPE = new Map();
for (const group of LOOK_ALIKE) for (const c of group) SHAPE.set(c, group);
const looksAlike = (a, b) => a !== b && SHAPE.has(a) && SHAPE.get(a).includes(b);

/** Whether two written forms differ in exactly one character, and that pair is easy to mix up by shape. */
function lookAlike(a, b) {
  if (a.length !== b.length || a === b) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    if (a[i] === b[i]) continue;
    if (!looksAlike(a[i], b[i])) return false;
    diff++;
  }
  return diff === 1;
}

const ALL = Object.values(GARDEN_CATALOG).filter((x) => x.jp && x.en);

/**
 * Up to `n` words easy to confuse with `item`: same sound or nearly (sound), or one character apart by shape (look).
 * `prefer`: ids to show first (the words already in the learner's garden). [{ item, why: 'sound' | 'look' }]
 */
export function confusablesFor(item, { n = 2, prefer = new Set() } = {}) {
  if (!item || !item.reading) return [];
  const sk = soundSkeleton(item.reading);
  const seen = new Set([item.jp]);
  const hits = [];
  for (const x of ALL) {
    if (x.id === item.id || seen.has(x.jp) || x.en === item.en) continue;
    let why = null;
    if (x.reading && x.reading !== item.reading && sk.length >= 2 && soundSkeleton(x.reading) === sk) why = 'sound';
    else if (x.reading && x.reading === item.reading) why = 'sound';
    else if (lookAlike(item.jp, x.jp)) why = 'look';
    if (!why) continue;
    seen.add(x.jp);
    hits.push({ item: x, why });
  }
  return hits.sort((a, b) => (prefer.has(b.item.id) ? 1 : 0) - (prefer.has(a.item.id) ? 1 : 0)).slice(0, n);
}

/** An example sentence for a word that already has a voice clip: its own N5 example, else a story or course line. */
export function exampleFor(item) {
  if (!item) return null;
  if (item.ex) return { jp: item.ex, en: item.exEn, voice: 0 };
  if (item.jp.length < 2 && !/[一-鿿]/.test(item.jp)) return null;   // a single kana would match everywhere
  for (const c of CHAPTERS) for (const b of c.beats) if (b.jp.includes(item.jp)) return { jp: b.jp, en: b.en, voice: b.speaker.voice };
  const ex = COURSE_EXAMPLES.find((e) => e.jp.includes(item.jp));
  if (ex) return { jp: ex.jp, en: ex.en, voice: ex.voice };
  const n5 = ALL.find((x) => x.ex && x.ex.includes(item.jp));
  return n5 ? { jp: n5.ex, en: n5.exEn, voice: 0 } : null;
}
