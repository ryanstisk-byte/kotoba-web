// Checks a mock JLPT content file: run  node tools/check-exam-bank.mjs js/exam-bank-xxx.js
// (several files at once are fine; with none it checks every js/exam-bank-*.js).
// Every exported array is checked: unique ids, Japanese text uses only the level's kanji (N5 for the N5 bank, N5 + N4
// for exam-bank-n4-*; others must be written in kana), right answer first and distinct options, spoken lines have
// hiragana readings whose kana match, passage lengths, no emoji. An N3 bank (exam-bank-n3-*) may use kanji beyond
// the N3 kanji the app teaches (LEVEL_KANJI.N3): the mock shows furigana over those, so they are listed, not errors.
import { LEVEL_KANJI } from '../js/exam-data.js';
import { pathToFileURL } from 'node:url';
import { resolve, basename } from 'node:path';
import { readdirSync } from 'node:fs';

const args = process.argv.slice(2);
const files = args.length ? args : readdirSync('js').filter((f) => /^exam-bank-.*\.js$/.test(f)).sort().map((f) => `js/${f}`);
let failed = false;
for (const file of files) if (!(await check(file))) failed = true;
if (failed) process.exit(1);

async function check(file) {
const level = /exam-bank-n3-/.test(basename(file)) ? 'N3' : /exam-bank-n4-/.test(basename(file)) ? 'N4' : 'N5';
const known = LEVEL_KANJI[level];
const lenient = level === 'N3';
const beyond = new Map();
const mod = await import(pathToFileURL(resolve(file)).href);
const errors = [];
const ids = new Set();
const KANJI = /[一-鿿々]/g;
const strings = (v, out = []) => {
  if (typeof v === 'string') out.push(v);
  else if (Array.isArray(v)) v.forEach((x) => strings(x, out));
  else if (v && typeof v === 'object') for (const [k, x] of Object.entries(v)) if (!['why', 'en', 'title_en', 'reading'].includes(k)) strings(x, out);
  return out;
};
const kanaOf = (s) => s.replace(/[^ぁ-ゖァ-ヺー]/g, '').replace(/[ァ-ヶ]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0x60));
const checkLine = (where, l) => {
  if (!l || typeof l.jp !== 'string' || typeof l.reading !== 'string') { errors.push(`${where}: a spoken line needs jp and reading`); return; }
  if (/[一-鿿々]/.test(l.reading)) errors.push(`${where}: reading has kanji: ${l.reading}`);
  // Every kana in jp must appear, in order, in the reading (the reading only adds kana for the kanji).
  const jpKana = kanaOf(l.jp), rd = kanaOf(l.reading);
  let i = 0;
  for (const c of jpKana) { i = rd.indexOf(c, i); if (i < 0) { errors.push(`${where}: reading doesn't match: ${l.jp} / ${l.reading}`); break; } i++; }
  if (![0, 1, 2, 3, 4, 5].includes(l.voice)) errors.push(`${where}: voice must be 0-5`);
};
for (const [name, list] of Object.entries(mod)) {
  if (!Array.isArray(list)) continue;
  for (const item of list) {
    const where = `${name}/${item.id}`;
    if (!item.id || ids.has(item.id)) errors.push(`${where}: missing or duplicate id`);
    ids.add(item.id);
    for (const s of strings(item)) {
      if (/\p{Extended_Pictographic}/u.test(s)) errors.push(`${where}: emoji in "${s.slice(0, 40)}"`);
      const bad = (s.match(KANJI) || []).filter((c) => c !== '々' && !known.has(c));
      if (!bad.length) continue;
      if (lenient) for (const c of bad) beyond.set(c, (beyond.get(c) || 0) + 1);
      else errors.push(`${where}: non-${level} kanji ${[...new Set(bad)].join('')} in "${s.slice(0, 40)}" (write it in kana)`);
    }
    const qs = item.questions || (item.options ? [item] : []);
    for (const q of qs) {
      if (!Array.isArray(q.options) || new Set(q.options).size !== q.options.length) errors.push(`${where}: options must be distinct`);
    }
    for (const b of item.blanks || []) if (new Set(b.options).size !== 4) errors.push(`${where}: each blank needs 4 distinct options`);
    for (const k of ['lines', 'say']) for (const [j, l] of (item[k] || []).entries()) checkLine(`${where}/${k}${j}`, l);
    for (const k of ['question', 'line']) if (item[k]) checkLine(`${where}/${k}`, item[k]);
    for (const [j, l] of (item.replies || []).entries()) checkLine(`${where}/reply${j}`, l);
    if (item.text) {
      const n = item.text.replace(/\s|\{\d\}/g, '').length;
      if (name === 'SHORT' && (n < 60 || n > 130)) errors.push(`${where}: short passage is ${n} characters (about 80 wanted)`);
      if (name === 'MID' && (n < 200 || n > 330)) errors.push(`${where}: mid passage is ${n} characters (about 250 wanted)`);
      if (name === 'N3_SHORT' && (n < 130 || n > 230)) errors.push(`${where}: N3 short passage is ${n} characters (150-200 wanted)`);
      if (name === 'N3_MID' && (n < 300 || n > 450)) errors.push(`${where}: N3 mid passage is ${n} characters (about 350 wanted)`);
      if (name === 'N3_LONG' && (n < 500 || n > 750)) errors.push(`${where}: N3 long passage is ${n} characters (about 550-650 wanted)`);
    }
    if (name === 'N3_LONG' && (item.questions || []).length < 3) errors.push(`${where}: a long text needs 3 or 4 questions`);
    if (name === 'N3_GIST') {
      if ((item.lines || []).length < 3) errors.push(`${where}: a 概要理解 talk needs several lines`);
      if ((item.options || []).length !== 4) errors.push(`${where}: a 概要理解 item needs 4 options`);
    }
  }
}
if (errors.length) { console.error(`${file}:\n` + errors.join('\n')); return false; }
console.log(`OK: ${ids.size} items in ${file}${beyond.size ? ` (furigana in the mock over ${beyond.size} kanji beyond the N3 the app teaches: ${[...beyond.keys()].join('')})` : ''}`);
return true;
}
