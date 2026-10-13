// Checks a mock JLPT content file: run  node tools/check-exam-bank.mjs js/exam-bank-xxx.js
// Every exported array is checked: unique ids, Japanese text uses only N5 kanji (others must be written in kana),
// right answer first and distinct options, spoken lines have hiragana readings whose kana match, passage lengths.
import { N5_KANJI } from '../js/exam-data.js';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';

const file = process.argv[2];
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
      const bad = (s.match(KANJI) || []).filter((c) => !N5_KANJI.has(c));
      if (bad.length) errors.push(`${where}: non-N5 kanji ${[...new Set(bad)].join('')} in "${s.slice(0, 40)}" (write it in kana)`);
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
    }
  }
}
if (errors.length) { console.error(errors.join('\n')); process.exit(1); }
console.log(`OK: ${ids.size} items in ${file}`);
