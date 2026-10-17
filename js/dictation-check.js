// Dictation Drops (js/modes/dictation.js): checking what was typed against what was heard, mora by mora, so only the
// sounds that were off get marked. Generous the way hearing is: hiragana or katakana both count, a long vowel can be
// spelled either way (とおい or とうい, ー or a vowel), the particles は, へ and を can be typed as they sound (わ, え, お),
// and じ/ぢ, ず/づ are the same sound. A small っ or a long vowel off is "close" (counted right, with the spot marked),
// and a long sentence may have a sound off per 8 morae and still count.
import { toHiragana } from './romaji.js';
import { romajiToKana } from './kana-input.js';

const SMALL = 'ゃゅょぁぃぅぇぉゎャュョァィゥェォヮ';
const SKIP = /[\s・。、！？!?.,「」『』…〜~　]/g;
const VOWEL = {};
for (const [row, v] of [['あかさたなはまやらわがざだばぱぁゃゎ', 'a'], ['いきしちにひみりぎじぢびぴぃ', 'i'], ['うくすつぬふむゆるぐずづぶぷぅゅゔ', 'u'],
  ['えけせてねへめれげぜでべぺぇ', 'e'], ['おこそとのほもよろをごぞどぼぽぉょ', 'o']]) for (const k of row) VOWEL[k] = v;
// A vowel kana that only stretches the one before it: おう / おお, えい / ええ, ああ, いい, うう.
const STRETCH = { o: 'うお', e: 'いえ', a: 'あ', i: 'い', u: 'う' };
// Same sound, different spelling.
const SAME = { ぢ: 'じ', づ: 'ず' };
// Particles written one way and said another: the answer's は may be typed わ, and so on.
const SAID = { は: 'わ', へ: 'え', を: 'お' };

/** Morae of a kana string, in its own script: small ゃゅょ join the kana before; っ, ん and ー are morae of their own. */
export function morae(s) {
  const out = [];
  for (const ch of String(s).replace(SKIP, '')) {
    if (SMALL.includes(ch) && out.length) out[out.length - 1] += ch;
    else out.push(ch);
  }
  return out;
}

/** Each mora with a token to compare by: the hiragana, a stretched vowel as "~o" etc., and one spelling per sound. */
export function tokens(s) {
  const list = morae(s);
  const out = [];
  let prev = '';
  for (const m of list) {
    const h = toHiragana(m);
    let t = SAME[h] || h;
    if (h === 'ー' && prev) t = '~' + prev;
    else if (h.length === 1 && prev && STRETCH[prev] && STRETCH[prev].includes(h)) t = '~' + prev;
    out.push({ s: m, t });
    const last = h[h.length - 1];
    if (h !== 'ー' && h !== 'っ' && h !== 'ん') prev = VOWEL[last] || '';
    else if (h !== 'ー') prev = '';
  }
  return out;
}

/** Does a typed mora match the answer's? A particle may be typed the way it sounds. */
const same = (a, t) => a.t === t.t || (SAID[a.t] && SAID[a.t] === t.t);

/** Edit-distance alignment of two token lists: which answer morae were missed or off, and which typed ones were extra. */
export function align(A, T, eq = same) {
  const n = A.length; const m = T.length;
  const d = Array.from({ length: n + 1 }, (_, i) => [i, ...Array(m).fill(0)]);
  for (let j = 1; j <= m; j++) d[0][j] = j;
  for (let i = 1; i <= n; i++) for (let j = 1; j <= m; j++) {
    d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (eq(A[i - 1], T[j - 1]) ? 0 : 1));
  }
  const aWrong = Array(n).fill(false);
  const tWrong = Array(m).fill(false);
  let said = 0;            // particles matched as they sound (わ for は)
  let i = n; let j = m;
  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && d[i][j] === d[i - 1][j - 1] + (eq(A[i - 1], T[j - 1]) ? 0 : 1)) {
      if (!eq(A[i - 1], T[j - 1])) { aWrong[i - 1] = true; tWrong[j - 1] = true; } else if (A[i - 1].t !== T[j - 1].t) said++;
      i--; j--;
    } else if (i > 0 && d[i][j] === d[i - 1][j] + 1) { aWrong[i - 1] = true; i--; }
    else { tWrong[j - 1] = true; j--; }
  }
  return { dist: d[n][m], aWrong, tWrong, said };
}

/** Typed text as kana: romaji turns into kana the way a keyboard would; kana passes through. */
export const typedKana = (typed) => (/[a-zA-Zāīūēō]/.test(typed) ? romajiToKana(typed) : String(typed));

/** Sounds off a sentence may have and still count: one per 8 morae, none on shorter lines and single words. */
export const allowance = (n) => (n >= 8 ? Math.floor(n / 8) : 0);

/**
 * What was typed against what was said. `item`: { reading (kana), jp (written form) }. Returns
 * { ok: 'exact' | 'close' | false, answer: [{ s, wrong }], typed: [{ s, wrong }], particle, kanji }. `kanji` is true when
 * the typing has kanji that aren't the written form: the screen asks for kana and doesn't count it as a try.
 */
export function checkDictation(typed, { reading, jp = '' }) {
  const raw = String(typed).trim();
  const empty = { ok: false, answer: tokens(reading).map((x) => ({ s: x.s, wrong: true })), typed: [], particle: false, kanji: false };
  if (!raw) return empty;
  if (/[一-鿿々]/.test(raw)) {
    if (raw.replace(SKIP, '') === String(jp).replace(SKIP, '')) return { ok: 'exact', answer: tokens(reading).map((x) => ({ s: x.s, wrong: false })), typed: morae(raw).map((s) => ({ s, wrong: false })), particle: false, kanji: false };
    return { ...empty, kanji: true };
  }
  const A = tokens(reading);
  const T = tokens(typedKana(raw));
  const r = align(A, T);
  const answer = A.map((x, i) => ({ s: x.s, wrong: r.aWrong[i] }));
  const typedOut = T.map((x, i) => ({ s: x.s, wrong: r.tWrong[i] }));
  // A particle typed as it sounds: right, with a note on how it's written.
  const particle = r.said > 0;
  if (r.dist === 0) return { ok: 'exact', answer, typed: typedOut, particle, kanji: false };
  // Only small っ or stretched vowels off: close.
  const core = (L) => L.filter((x) => x.t !== 'っ' && !x.t.startsWith('~'));
  if (align(core(A), core(T)).dist === 0 || r.dist <= allowance(A.length)) return { ok: 'close', answer, typed: typedOut, particle, kanji: false };
  return { ok: false, answer, typed: typedOut, particle, kanji: false };
}
