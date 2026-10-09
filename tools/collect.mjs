// Lists every line the app speaks (for voice clips) and every Japanese text with a known reading.
// Run: node tools/collect.mjs > /tmp/collect.json   (used by tools/build_assets.py)
import { PHRASES, CHAPTERS, CAST, STORY_WORDS, TRAINS, assembleTrain, KANJI, SHOP_STOCK, COUNTERS, CUSTOMERS, SHOP_GREETINGS, SHOP_THANKS, GARDEN_CATALOG } from '../js/data.js';
import { LESSONS, KANJI_LESSONS, READ_WORDS } from '../js/dojo-data.js';
import { N5_WORDS } from '../js/data.js';
import { N5 } from '../js/n5.js';
import { COURSE_EXAMPLES } from '../js/course-data.js';
import { DIALOGUES, NUMBER_SCENES, KATA_WORDS, CONJ_WORDS, VERB_FORMS, ADJ_FORMS, conjugate, conjPrompt, BUILD_SENTENCES } from '../js/practice-data.js';

const clips = new Map();
// opts (optional): { accent } to set a word's pitch, { say } for text the voice should read instead.
const add = (text, voice = 0, opts = null) => { if (text) clips.set(text + '#' + voice, opts ? [text, voice, opts] : [text, voice]); };
const pairs = [];

for (const p of PHRASES) {
  for (let v = 0; v < 4; v++) add(p.speak, v);       // Pitch Duel rotates voices 0-3
  pairs.push([p.display, p.kana]);
}
for (const item of Object.values(GARDEN_CATALOG)) { add(item.reading); pairs.push([item.jp, item.reading]); }
for (const ch of CHAPTERS) {
  for (const b of ch.beats) {
    add(b.jp, b.speaker.voice);
    pairs.push([b.jp, b.reading]);
    for (const w of b.words) { add(w.reading); pairs.push([w.jp, w.reading]); }
    // English answers are never spoken, so they get no clip.
    if (b.choice) for (const o of b.choice.options) if (/[ぁ-ゖァ-ヺ一-鿿]/.test(o)) add(o, CAST.ren.voice);
  }
}
for (const w of STORY_WORDS) add(w.reading);
for (const k of KANJI) { add(k.reading); pairs.push([k.word, k.reading]); }
for (const t of TRAINS) {
  // Every correct way to fill the gaps.
  const combos = t.gaps.reduce((acc, g, i) => acc.flatMap((f) => (g ? g.correct.map((c) => ({ ...f, [i]: c })) : [f])), [{}]);
  for (const filled of combos) add(assembleTrain(t, filled));
}
for (const c of Object.values(CUSTOMERS)) {
  for (const item of SHOP_STOCK) {
    COUNTERS[item.counter].say.forEach((s) => add(c.order(item, s), c.voice));
  }
}
add(SHOP_GREETINGS[0], 1);
add(SHOP_THANKS[0], 1);
for (const l of LESSONS) for (const c of l.chars) add(c.k);
for (const l of KANJI_LESSONS) for (const j of l.kanji) { add(j.reading); pairs.push([j.word, j.reading]); }
for (const v of READ_WORDS) add(v.w);
// Course example sentences, each in its speaker's voice (0 narrator, 1 Ren, 2 Master, 3 Kaito).
for (const ex of COURSE_EXAMPLES) { add(ex.jp, ex.voice); pairs.push([ex.jp, ex.reading]); }

// N5 deck: each word with its pitch accent set, and its example sentence. Added last so these win over
// an older clip of the same text.
N5_WORDS.forEach((w, i) => {
  const [, , , , , , , say, exSay] = N5[i];
  add(w.say, 0, { accent: w.accent, ...(say ? { say } : {}) });
  pairs.push([w.jp, w.reading]);
  if (w.ex) {
    add(w.ex, 0, exSay ? { say: exSay } : null);
    pairs.push([w.ex, w.exReading]);
  }
});

// Newer practice modes: Listening Lab scenes (each character's voice), Numbers & Time scenes, Katakana Rush words,
// Conjugation Dojo forms (with readings) and Sentence Builder sentences. Most N5 examples and story lines already
// have clips, so only the new text is synthesized.
for (const d of DIALOGUES) for (const l of d.lines) { add(l.jp, l.who.voice); pairs.push([l.jp, l.reading]); }
for (const s of NUMBER_SCENES) { if (!clips.has(s.jp + '#' + s.voice)) add(s.jp, s.voice); if (s.reading) pairs.push([s.jp, s.reading]); }
for (const w of KATA_WORDS) if (!clips.has(w.say + '#0')) add(w.say);
for (const w of CONJ_WORDS) {
  for (const f of w.type === 'verb' ? VERB_FORMS : ADJ_FORMS) {
    for (const c of [conjugate(w, f), conjPrompt(w, f)]) {
      if (!clips.has(c.jp + '#0')) add(c.jp);
      if (c.jp !== c.kana) pairs.push([c.jp, c.kana]);
    }
  }
}
for (const s of BUILD_SENTENCES) if (!clips.has(s.say + '#' + s.voice)) add(s.say, s.voice);

process.stdout.write(JSON.stringify({ clips: [...clips.values()], pairs }));
