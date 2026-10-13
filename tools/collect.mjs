// Lists every line the app speaks (for voice clips) and every Japanese text with a known reading.
// Run: node tools/collect.mjs > /tmp/collect.json   (used by tools/build_assets.py)
import { PHRASES, CHAPTERS, CAST, STORY_WORDS, TRAINS, assembleTrain, KANJI, SHOP_STOCK, COUNTERS, CUSTOMERS, SHOP_GREETINGS, SHOP_THANKS, GARDEN_CATALOG,
  SHOP_GREETINGS_N4, SHOP_THANKS_N4, SHOP_KEIGO, N4_WORDS } from '../js/data.js';
import { LESSONS, KANJI_LESSONS, N4_KANJI_LESSONS, READ_WORDS } from '../js/dojo-data.js';
import { N5_WORDS } from '../js/data.js';
import { N5 } from '../js/n5.js';
import { N4 } from '../js/n4.js';
import { N4_TASK, N4_POINT, N4_UTTER, N4_QUICK } from '../js/exam-bank-n4-listen.js';
import { BRUSH_WORDS } from '../js/brush-data.js';
import { STUDY_UNITS } from '../js/course-data.js';
import { POINT, QUICK } from '../js/exam-bank-listen1.js';
import { TASK, UTTER } from '../js/exam-bank-listen2.js';
import { PARAPHRASE, TEXT_GRAMMAR, SHORT, MID, INFO } from '../js/exam-bank-reading.js';
import { ALL_MESSAGES, SENDERS } from '../js/messages-data.js';
import { rivalLines } from '../js/rival-data.js';
import { DIALOGUES, NUMBER_SCENES, KATA_WORDS, CONJ_WORDS, VERB_FORMS, ADJ_FORMS, VERB_FORMS_N4, ADJ_FORMS_N4, formsFor, conjugate, conjPrompt, BUILD_SENTENCES } from '../js/practice-data.js';

// Every clip records the easiest level that uses it (LV while it's added): N5 clips are precached when the app
// installs; clips only N4 content uses are cached once N4 is unlocked (sw.js LATER), so they don't weigh on a phone
// before they're needed.
const ORDER = ['N5', 'N4'];
let LV = 'N5';
const lv = (x) => (x && x.level) || 'N5';
const clips = new Map();
const levels = new Map();
/** Sets a clip entry, keeping the easiest level that needs it. */
const put = (key, entry, level = LV) => {
  clips.set(key, entry);
  const was = levels.get(key);
  if (!was || ORDER.indexOf(level) < ORDER.indexOf(was)) levels.set(key, level);
};
// opts (optional): { accent } to set a word's pitch, { say } for text the voice should read instead.
// An entry may end with a list of speeds ('' normal, 'slow') when it doesn't need both.
const add = (text, voice = 0, opts = null, level = LV) => { if (text) put(text + '#' + voice, opts ? [text, voice, opts] : [text, voice], level); };
const pairs = [];

for (const p of PHRASES) {
  for (let v = 0; v < 4; v++) add(p.speak, v, null, lv(p));       // Pitch Duel rotates voices 0-3
  pairs.push([p.display, p.kana]);
}
for (const item of Object.values(GARDEN_CATALOG)) { add(item.reading, 0, null, lv(item)); pairs.push([item.jp, item.reading]); }
for (const ch of CHAPTERS) {
  LV = lv(ch);
  for (const b of ch.beats) {
    add(b.jp, b.speaker.voice);
    pairs.push([b.jp, b.reading]);
    for (const w of b.words) { add(w.reading); pairs.push([w.jp, w.reading]); }
    // English answers are never spoken, so they get no clip.
    if (b.choice) for (const o of b.choice.options) if (/[ぁ-ゖァ-ヺ一-鿿]/.test(o)) add(o, CAST.ren.voice);
  }
}
LV = 'N5';
for (const w of STORY_WORDS) add(w.reading, 0, null, lv(w));
for (const k of KANJI) { add(k.reading, 0, null, lv(k)); pairs.push([k.word, k.reading]); }
for (const t of TRAINS) {
  LV = lv(t);
  // Every correct way to fill the gaps.
  const combos = t.gaps.reduce((acc, g, i) => acc.flatMap((f) => (g ? g.correct.map((c) => ({ ...f, [i]: c })) : [f])), [{}]);
  for (const filled of combos) add(assembleTrain(t, filled));
}
LV = 'N5';
// Shop orders: an N5 customer orders N5 goods; an N4 customer orders anything on the shelf (js/modes/shop.js).
for (const c of Object.values(CUSTOMERS)) {
  for (const item of SHOP_STOCK) {
    if (lv(c) === 'N5' && lv(item) !== 'N5') continue;
    const level = lv(c) === 'N4' || lv(item) === 'N4' ? 'N4' : 'N5';
    COUNTERS[item.counter].say.forEach((s) => add(c.order(item, s), c.voice, null, level));
  }
}
add(SHOP_GREETINGS[0], 1);
add(SHOP_THANKS[0], 1);
// N4 shop: the shopkeeper's polite greeting and thanks (Ren's voice), and each keigo moment: the customer's line and
// the right reply.
LV = 'N4';
add(SHOP_GREETINGS_N4[0].jp, 1); pairs.push([SHOP_GREETINGS_N4[0].jp, SHOP_GREETINGS_N4[0].reading]);
add(SHOP_THANKS_N4[0].jp, 1); pairs.push([SHOP_THANKS_N4[0].jp, SHOP_THANKS_N4[0].reading]);
for (const m of SHOP_KEIGO) {
  add(m.line.jp, m.who); pairs.push([m.line.jp, m.line.reading]);
  add(m.options[0].jp, 1);
  for (const o of m.options) pairs.push([o.jp, o.reading]);
}
LV = 'N5';
for (const l of LESSONS) for (const c of l.chars) add(c.k);
for (const l of KANJI_LESSONS) for (const j of l.kanji) { add(j.reading); pairs.push([j.word, j.reading]); }
for (const l of N4_KANJI_LESSONS) for (const j of l.kanji) { add(j.reading, 0, null, 'N4'); pairs.push([j.word, j.reading]); }
for (const v of READ_WORDS) add(v.w);
// Course example sentences, each in its speaker's voice (0 narrator, 1 Ren, 2 Master, 3 Kaito; N4 units also 4, 5).
for (const u of STUDY_UNITS) for (const p of u.points) for (const ex of p.examples) { add(ex.jp, ex.voice, null, lv(u)); pairs.push([ex.jp, ex.reading]); }

// Mock JLPT listening (js/exam-bank-listen*.js): every question, conversation line and reply in its voice. Each item
// plays once in the full mock, so only normal speed is needed; the mini mock's replay uses the same clip.
for (const [bank, level] of [[[...TASK, ...POINT, ...UTTER, ...QUICK], 'N5'], [[...N4_TASK, ...N4_POINT, ...N4_UTTER, ...N4_QUICK], 'N4']]) {
  for (const it of bank) {
    for (const l of [it.question, it.line, ...(it.lines || []), ...(it.replies || [])].filter(Boolean)) {
      put(l.jp + '#' + l.voice, [l.jp, l.voice, null, ['']], level);
      pairs.push([l.jp, l.reading]);
    }
  }
}
// Ren's Messages: each message in its sender's voice.
for (const m of ALL_MESSAGES) { add(m.jp, SENDERS[m.from].voice, null, lv(m)); pairs.push([m.jp, m.kana]); }
// Rival Battle: each rival's taunts, counters and endings in their own voice, and Ren's finisher shouts.
for (const [l, voice, level] of rivalLines()) { add(l.jp, voice, null, level); pairs.push([l.jp, l.reading]); }
// Kana Brush words (N4): each word said whole, before it's written kana by kana.
for (const w of BRUSH_WORDS) add(w.kana, 0, null, 'N4');

// N5 deck: each word with its pitch accent set, and its example sentence. Added last so these win over
// an older clip of the same text.
for (const [words, raw, level] of [[N5_WORDS, N5, 'N5'], [N4_WORDS, N4, 'N4']]) {
  words.forEach((w, i) => {
    const [, , , , , , , say, exSay] = raw[i];
    add(w.say, 0, { accent: w.accent, ...(say ? { say } : {}) }, level);
    pairs.push([w.jp, w.reading]);
    if (w.ex) {
      add(w.ex, 0, exSay ? { say: exSay } : null, level);
      pairs.push([w.ex, w.exReading]);
    }
  });
}

// Newer practice modes: Listening Lab scenes (each character's voice), Numbers & Time scenes, Katakana Rush words,
// Conjugation Dojo forms (with readings) and Sentence Builder sentences. Most N5 examples and story lines already
// have clips, so only the new text is synthesized.
for (const d of DIALOGUES) for (const l of d.lines) { add(l.jp, l.who.voice, null, lv(d)); pairs.push([l.jp, l.reading]); }
const keep = (key, level) => { const was = levels.get(key); if (was && ORDER.indexOf(level) < ORDER.indexOf(was)) levels.set(key, level); };
for (const s of NUMBER_SCENES) { if (!clips.has(s.jp + '#' + s.voice)) add(s.jp, s.voice, null, lv(s)); else keep(s.jp + '#' + s.voice, lv(s)); if (s.reading) pairs.push([s.jp, s.reading]); }
for (const w of KATA_WORDS) if (!clips.has(w.say + '#0')) add(w.say, 0, null, lv(w)); else keep(w.say + '#0', lv(w));
// Conjugation Dojo: N5 words in the N5 forms; N4 words in every form and N5 words in the N4 forms (js/modes/conj.js).
for (const w of CONJ_WORDS) {
  const n5Forms = w.type === 'verb' ? VERB_FORMS : ADJ_FORMS;
  const n4Forms = w.type === 'verb' ? VERB_FORMS_N4 : ADJ_FORMS_N4;
  const sets = lv(w) === 'N5' ? [[n5Forms, 'N5'], [formsFor(w, n4Forms), 'N4']] : [[formsFor(w, [...n5Forms, ...n4Forms]), 'N4']];
  for (const [forms, level] of sets) {
    for (const f of forms) {
      for (const c of [conjugate(w, f), conjPrompt(w, f)]) {
        if (!clips.has(c.jp + '#0')) add(c.jp, 0, null, level); else keep(c.jp + '#0', level);
        if (c.jp !== c.kana) pairs.push([c.jp, c.kana]);
      }
    }
  }
}
for (const s of BUILD_SENTENCES) if (!clips.has(s.say + '#' + s.voice)) add(s.say, s.voice, null, lv(s)); else keep(s.say + '#' + s.voice, lv(s));

// Pitch Coach "Ears first" plays a word in two more voices: every N5 word gets voices 1 and 3 at normal speed only (no
// 🐢 copy), with its pitch accent drawn beat by beat (shape) so the drop the quiz asks about is always clear. Voice 2
// (deep) barely follows a set pitch, so it's left out. Starter phrases already have voices 0-3 above (Pitch Duel), and
// a text that already has a clip in a voice keeps it.
N5_WORDS.forEach((w, i) => {
  const say = N5[i][7];
  for (const v of [1, 3]) {
    if (!clips.has(w.say + '#' + v)) clips.set(w.say + '#' + v, [w.say, v, { accent: w.accent, shape: 1, ...(say ? { say } : {}) }, ['']]);
  }
});

// Each clip: [text, voice, opts, speeds, level].
const out = [...clips.entries()].map(([k, [text, voice, opts = null, speeds = null]]) => [text, voice, opts, speeds, levels.get(k) || 'N5']);
process.stdout.write(JSON.stringify({ clips: out, pairs }));
