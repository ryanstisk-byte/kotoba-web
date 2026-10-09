// Lists every line the app speaks (for voice clips) and every Japanese text with a known reading.
// Run: node tools/collect.mjs > /tmp/collect.json   (used by tools/build_assets.py)
import { PHRASES, CHAPTERS, CAST, STORY_WORDS, TRAINS, assembleTrain, KANJI, SHOP_STOCK, COUNTERS, CUSTOMERS, SHOP_GREETINGS, SHOP_THANKS, GARDEN_CATALOG } from '../js/data.js';
import { LESSONS, KANJI_LESSONS, READ_WORDS } from '../js/dojo-data.js';

const clips = new Map();
const add = (text, voice = 0) => { if (text) clips.set(text + '#' + voice, [text, voice]); };
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
    if (b.choice) for (const o of b.choice.options) add(o, CAST.ren.voice);
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

process.stdout.write(JSON.stringify({ clips: [...clips.values()], pairs }));
