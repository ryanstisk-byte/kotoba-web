// Typed answers (Type It, js/modes/type.js): romaji typed on an English keyboard turned into kana, and generous
// checks for a typed reading, Japanese word or English meaning.
import { toHiragana } from './romaji.js';

const ROMA = {};
const ROWS = {
  '': ['あ', 'い', 'う', 'え', 'お'], k: ['か', 'き', 'く', 'け', 'こ'], s: ['さ', 'し', 'す', 'せ', 'そ'], t: ['た', 'ち', 'つ', 'て', 'と'],
  n: ['な', 'に', 'ぬ', 'ね', 'の'], h: ['は', 'ひ', 'ふ', 'へ', 'ほ'], m: ['ま', 'み', 'む', 'め', 'も'], y: ['や', 'い', 'ゆ', 'いぇ', 'よ'],
  r: ['ら', 'り', 'る', 'れ', 'ろ'], w: ['わ', 'うぃ', 'う', 'うぇ', 'を'], g: ['が', 'ぎ', 'ぐ', 'げ', 'ご'], z: ['ざ', 'じ', 'ず', 'ぜ', 'ぞ'],
  d: ['だ', 'ぢ', 'づ', 'で', 'ど'], b: ['ば', 'び', 'ぶ', 'べ', 'ぼ'], p: ['ぱ', 'ぴ', 'ぷ', 'ぺ', 'ぽ'], f: ['ふぁ', 'ふぃ', 'ふ', 'ふぇ', 'ふぉ'],
  j: ['じゃ', 'じ', 'じゅ', 'じぇ', 'じょ'], v: ['ゔぁ', 'ゔぃ', 'ゔ', 'ゔぇ', 'ゔぉ'], l: ['ら', 'り', 'る', 'れ', 'ろ'],
};
const V = ['a', 'i', 'u', 'e', 'o'];
for (const [c, row] of Object.entries(ROWS)) row.forEach((k, i) => { ROMA[c + V[i]] = k; });
Object.assign(ROMA, {
  shi: 'し', chi: 'ち', tsu: 'つ', tu: 'つ', si: 'し', ti: 'ち', hu: 'ふ', fu: 'ふ', zi: 'じ', ji: 'じ', di: 'ぢ', du: 'づ', dzu: 'づ',
  wo: 'を', we: 'うぇ', wi: 'うぃ', ye: 'いぇ', xtsu: 'っ', xtu: 'っ', ltu: 'っ', ltsu: 'っ',
  xa: 'ぁ', xi: 'ぃ', xu: 'ぅ', xe: 'ぇ', xo: 'ぉ', xya: 'ゃ', xyu: 'ゅ', xyo: 'ょ', la: 'ぁ', li: 'ぃ', lu: 'ぅ', le: 'ぇ', lo: 'ぉ',
  lya: 'ゃ', lyu: 'ゅ', lyo: 'ょ', '-': 'ー',
});
// Contracted sounds: kya, sha, cha, ja, nya, hya, mya, rya, gya, bya, pya (and the sya / tya spellings).
const YOON = { ky: 'き', gy: 'ぎ', sy: 'し', zy: 'じ', jy: 'じ', ty: 'ち', cy: 'ち', dy: 'ぢ', ny: 'に', hy: 'ひ', by: 'び', py: 'ぴ', my: 'み', ry: 'り' };
const SMALL = { a: 'ゃ', u: 'ゅ', o: 'ょ', e: 'ぇ', i: 'ぃ' };
for (const [c, k] of Object.entries(YOON)) for (const v of ['a', 'u', 'o', 'e']) ROMA[c + v] = k + SMALL[v];
for (const [c, k] of [['sh', 'し'], ['ch', 'ち'], ['j', 'じ']]) for (const v of ['a', 'u', 'o', 'e']) ROMA[c + v] = k + SMALL[v];
ROMA.cha = 'ちゃ'; ROMA.chu = 'ちゅ'; ROMA.cho = 'ちょ'; ROMA.che = 'ちぇ';
ROMA.ja = 'じゃ'; ROMA.ju = 'じゅ'; ROMA.jo = 'じょ'; ROMA.je = 'じぇ';
ROMA.tsa = 'つぁ';

// Long vowels written with a macron or circumflex (Tōkyō, kōhī): spelled out as the kana does.
const MACRON = { ā: 'aa', ī: 'ii', ū: 'uu', ē: 'ee', ō: 'ou', â: 'aa', î: 'ii', û: 'uu', ê: 'ee', ô: 'ou' };

/** Romaji to hiragana, as an IME does: "taberu" -> たべる, "kitte" -> きって, "konnichiha" -> こんにちは. Kana passes through. */
export function romajiToKana(input) {
  let s = String(input).toLowerCase().replace(/[āīūēōâîûêô]/g, (c) => MACRON[c]).replace(/\s+/g, '');
  let out = '';
  let i = 0;
  while (i < s.length) {
    const c = s[i];
    if (!/[a-z'-]/.test(c)) { out += c; i++; continue; }
    // A doubled consonant is a small っ (kk, tt, tch).
    if (c === s[i + 1] && /[bcdfghjklmpqrstvwxyz]/.test(c) && c !== 'n') { out += 'っ'; i++; continue; }
    if (c === 't' && s[i + 1] === 'c' && s[i + 2] === 'h') { out += 'っ'; i++; continue; }
    if (c === 'n') {
      // n before a consonant (or at the end) is ん: "konban" -> こんばん. "nn" is ん too, unless a vowel follows
      // ("konnichiha": the second n starts に). Before a vowel or y, n starts a syllable.
      const next = s[i + 1];
      if (next === "'") { out += 'ん'; i += 2; continue; }
      if (next === 'n') { const after = s[i + 2]; out += 'ん'; i += after && /[aiueoy]/.test(after) ? 1 : 2; continue; }
      if (!next || !/[aiueoy]/.test(next)) { out += 'ん'; i += 1; continue; }
    }
    let hit = null;
    for (const len of [4, 3, 2, 1]) {
      const chunk = s.slice(i, i + len);
      if (ROMA[chunk]) { hit = [chunk, ROMA[chunk]]; break; }
    }
    if (hit) { out += hit[1]; i += hit[0].length; continue; }
    out += c;
    i++;
  }
  return out;
}

const VOWEL_OF = {};
for (const [row, v] of [['あかさたなはまやらわがざだばぱぁゃゎ', 'あ'], ['いきしちにひみりぎじぢびぴぃ', 'い'], ['うくすつぬふむゆるぐずづぶぷぅゅゔ', 'う'],
  ['えけせてねへめれげぜでべぺぇ', 'え'], ['おこそとのほもよろをごぞどぼぽぉょ', 'お']]) for (const k of row) VOWEL_OF[k] = v;

/** Hiragana with ー spelled out as its vowel (コーヒー -> こおひい) and spaces dropped. */
export function plainKana(s) {
  const h = toHiragana(String(s)).replace(/[\s・。、！？!?.,]/g, '');
  let out = '';
  for (const ch of h) out += ch === 'ー' && out ? (VOWEL_OF[out[out.length - 1]] || '') : ch;
  return out;
}

/** The same with long vowels and small っ folded away: a typed "tokyo" still matches とうきょう. */
export function looseKana(s) {
  return plainKana(s).replace(/っ/g, '')
    .replace(/([おこそとのほもよろごぞどぼぽょ])[うお]/g, '$1').replace(/([えけせてねへめれげぜでべぺ])[いえ]/g, '$1')
    .replace(/([あかさたなはまやらわがざだばぱゃ])あ/g, '$1').replace(/([いきしちにひみりぎじびぴ])い/g, '$1').replace(/([うくすつぬふむゆるぐずぶぷゅ])う/g, '$1');
}

/**
 * A typed reading (romaji or kana) against the right reading. 'exact', 'close' (only a long vowel or small っ off:
 * counted right, with a note) or false.
 */
export function checkReading(typed, reading) {
  const t = String(typed).trim();
  if (!t) return false;
  const kana = /[a-zA-Zāīūēō]/.test(t) ? romajiToKana(t) : t;
  if (plainKana(kana) === plainKana(reading)) return 'exact';
  // は and を read as particles: "wa" for は, "o" for を.
  const asSaid = (x) => plainKana(x).replace(/は/g, 'わ').replace(/を/g, 'お').replace(/へ/g, 'え');
  if (asSaid(kana) === asSaid(reading)) return 'exact';
  if (looseKana(kana) === looseKana(reading)) return 'close';
  return false;
}

/** A typed Japanese answer: the written form, or its reading (in kana or romaji). */
export function checkJapanese(typed, { jp, reading }) {
  const t = String(typed).trim().replace(/\s+/g, '');
  if (!t) return false;
  if (t === String(jp).replace(/\s+/g, '')) return 'exact';
  return checkReading(t, reading);
}

const STOP = /^(to|a|an|the|be|is|it|one's|someone|something|sth|sb)\s+/;

/** One meaning, trimmed for comparing: lower case, no notes in brackets, no "to"/"a"/"the" in front. */
export function normMeaning(s) {
  let m = String(s).toLowerCase().replace(/\([^)]*\)|\[[^\]]*\]/g, ' ').replace(/[^a-z0-9' -]/g, ' ').replace(/\s+/g, ' ').trim();
  for (let k = 0; k < 3; k++) m = m.replace(STOP, '');
  return m.replace(/'s$/, '').trim();
}

/** The meanings in a list like "to eat; to have (a meal)" or "immediately / soon". */
export function meaningsOf(en) {
  return String(en).split(/\s*[/;,]\s*|\s+or\s+/).map(normMeaning).filter(Boolean);
}

function edits(a, b) {
  if (Math.abs(a.length - b.length) > 2) return 3;
  const d = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
  for (let j = 1; j <= b.length; j++) d[0][j] = j;
  for (let i = 1; i <= a.length; i++) for (let j = 1; j <= b.length; j++) {
    d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
  }
  return d[a.length][b.length];
}
const stem = (w) => w.replace(/(ing|ed|es|s)$/, '');

/**
 * A typed English meaning against the word's meanings. Generous: any listed meaning, small typos, plurals and -ing,
 * or the key word of a longer meaning ("eat" for "to eat (a meal)"). 'exact', 'close' (a typo away) or false.
 */
export function checkMeaning(typed, en) {
  const t = normMeaning(typed);
  if (!t) return false;
  const all = meaningsOf(en);
  if (all.includes(t)) return 'exact';
  for (const m of all) {
    if (stem(m) === stem(t)) return 'exact';
    const words = m.split(' ');
    const tw = t.split(' ');
    // A longer meaning whose words the answer covers ("brother" for "older brother", "eat" for "eat a meal").
    if (t.length >= 3 && (words.includes(t) || words.map(stem).includes(stem(t)))) return 'exact';
    if (m.length >= 3 && tw.includes(m)) return 'exact';
    const lim = m.length >= 8 ? 2 : m.length >= 4 ? 1 : 0;
    if (lim && edits(m, t) <= lim) return 'close';
  }
  return false;
}
