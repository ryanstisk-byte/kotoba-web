// Kana helpers: katakana to hiragana, and kana to Hepburn-style romaji for beginners.

export const KANA_RE = /[ぁ-ゖァ-ヺー]/;
export const KANJI_RE = /[一-鿿々]/;
export const HIRA_RE = /[ぁ-ゖ]/;
export const KATA_RE = /[ァ-ヺ]/;

export function toHiragana(s) {
  let out = '';
  for (const ch of String(s)) {
    const c = ch.codePointAt(0);
    out += c >= 0x30a1 && c <= 0x30f6 ? String.fromCodePoint(c - 0x60) : ch;
  }
  return out;
}

const BASE = {
  あ: 'a', い: 'i', う: 'u', え: 'e', お: 'o',
  か: 'ka', き: 'ki', く: 'ku', け: 'ke', こ: 'ko',
  さ: 'sa', し: 'shi', す: 'su', せ: 'se', そ: 'so',
  た: 'ta', ち: 'chi', つ: 'tsu', て: 'te', と: 'to',
  な: 'na', に: 'ni', ぬ: 'nu', ね: 'ne', の: 'no',
  は: 'ha', ひ: 'hi', ふ: 'fu', へ: 'he', ほ: 'ho',
  ま: 'ma', み: 'mi', む: 'mu', め: 'me', も: 'mo',
  や: 'ya', ゆ: 'yu', よ: 'yo',
  ら: 'ra', り: 'ri', る: 'ru', れ: 're', ろ: 'ro',
  わ: 'wa', ゐ: 'i', ゑ: 'e', を: 'o', ん: 'n',
  が: 'ga', ぎ: 'gi', ぐ: 'gu', げ: 'ge', ご: 'go',
  ざ: 'za', じ: 'ji', ず: 'zu', ぜ: 'ze', ぞ: 'zo',
  だ: 'da', ぢ: 'ji', づ: 'zu', で: 'de', ど: 'do',
  ば: 'ba', び: 'bi', ぶ: 'bu', べ: 'be', ぼ: 'bo',
  ぱ: 'pa', ぴ: 'pi', ぷ: 'pu', ぺ: 'pe', ぽ: 'po',
  ゔ: 'vu',
  ぁ: 'a', ぃ: 'i', ぅ: 'u', ぇ: 'e', ぉ: 'o', ゃ: 'ya', ゅ: 'yu', ょ: 'yo', ゎ: 'wa',
};

// Two-kana sounds (きゃ, しゅ, ファ, ティ…).
const COMBO = {
  きゃ: 'kya', きゅ: 'kyu', きょ: 'kyo', ぎゃ: 'gya', ぎゅ: 'gyu', ぎょ: 'gyo',
  しゃ: 'sha', しゅ: 'shu', しょ: 'sho', しぇ: 'she', じゃ: 'ja', じゅ: 'ju', じょ: 'jo', じぇ: 'je',
  ちゃ: 'cha', ちゅ: 'chu', ちょ: 'cho', ちぇ: 'che', ぢゃ: 'ja', ぢゅ: 'ju', ぢょ: 'jo',
  にゃ: 'nya', にゅ: 'nyu', にょ: 'nyo', ひゃ: 'hya', ひゅ: 'hyu', ひょ: 'hyo',
  びゃ: 'bya', びゅ: 'byu', びょ: 'byo', ぴゃ: 'pya', ぴゅ: 'pyu', ぴょ: 'pyo',
  みゃ: 'mya', みゅ: 'myu', みょ: 'myo', りゃ: 'rya', りゅ: 'ryu', りょ: 'ryo',
  ふぁ: 'fa', ふぃ: 'fi', ふぇ: 'fe', ふぉ: 'fo', てぃ: 'ti', でぃ: 'di', とぅ: 'tu', どぅ: 'du',
  うぃ: 'wi', うぇ: 'we', うぉ: 'wo', ゔぁ: 'va', ゔぃ: 'vi', ゔぇ: 've', ゔぉ: 'vo', つぁ: 'tsa',
};

/**
 * Romaji for a run of kana (any kanji left in is passed through).
 * `particles`: read a trailing は/へ as the particles "wa"/"e" (the app's text puts spaces after particles).
 */
export function romaji(text, { particles = true } = {}) {
  const s = toHiragana(text);
  const chars = [...s];
  let out = '';
  let gemi = false;
  let afterN = false;
  for (let i = 0; i < chars.length; i++) {
    const ch = chars[i];
    const pair = ch + (chars[i + 1] || '');
    let r;
    if (COMBO[pair]) { r = COMBO[pair]; i++; }
    else if (ch === 'っ') { gemi = true; continue; }
    else if (ch === 'ー') {
      const m = out.match(/[aeiou]$/);
      out += m ? m[0] : '-';
      continue;
    } else if (BASE[ch] !== undefined) {
      r = BASE[ch];
      if (particles && i === chars.length - 1 && i > 0) {
        if (ch === 'は') r = ' wa';
        if (ch === 'へ') r = ' e';
      }
      if (particles && ch === 'を' && i > 0) r = ' o';
    } else { r = ch; }
    if (gemi) {
      gemi = false;
      if (/^ch/.test(r)) r = 't' + r;
      else if (/^[bcdfghjkmpqrstvwxyz]/.test(r)) r = r[0] + r;
    }
    // ん before a vowel or y gets an apostrophe so it isn't misread (きんえん = kin'en).
    if (afterN && /^[aeiouy]/.test(r)) out += "'";
    afterN = ch === 'ん';
    out += r;
  }
  if (gemi) out += 'h';
  return out;
}
