// Exam readiness: how close the learner is to a mock JLPT, for the next level they haven't done yet. A level is done
// once a full mock is passed or the real test is marked as passed (store.examDone), and then the next level's meter
// takes its place, so only tests still ahead are shown. Shown on Today (a small card) and on Progress (the details).
//
// N5 readiness reads what the app already tracks, each area filling toward a target:
//   Vocabulary  N5 deck words at the Seedling stage or later (the same "known" as Progress)
//   Kanji       kanji learned in the Reading Dojo or forged, out of the ones the app teaches
//   Grammar     N5 course grammar points whose Garden card has held for a week or more
//   Listening   first-try listening accuracy over the last 4 weeks, once there are enough answers
//   Reading     kana learned, and Story chapters cleared
// "Ready for a mock" comes when the areas average 90% of their targets and none is under 60%. A mock is optional
// practice: the mini mock is open any time, and nothing is locked.
import { store, dateKey } from './store.js';
import { N5_WORDS, KANJI } from './data.js';
import { LESSONS, KANJI_LESSONS } from './dojo-data.js';
import { UNITS } from './course-data.js';
import { LEVELS, MOCK_LEVELS, N5_GRAMMAR_KEYS, SCORING } from './exam-data.js';
import { esc } from './ui.js';

export const N5_TARGETS = {
  vocab: 0.75,          // share of the N5 deck known
  kanji: 0.8,           // share of the kanji the app teaches
  grammar: 0.8,         // share of the N5 grammar points held
  grammarDays: 7,       // a grammar card "holds" once its stability reaches this (about two good reviews)
  listening: 0.8,       // first-try listening accuracy
  listeningAnswers: 40, // answers needed before the accuracy counts in full
  chapters: 6,          // Story chapters cleared
};
export const READY_AVERAGE = 0.9;
export const READY_FLOOR = 0.6;

const pct = (x) => `${Math.round(x * 100)}%`;
const clamp = (x) => Math.max(0, Math.min(1, x));

/** The kanji the app teaches (Reading Dojo starter kanji and Kanji Forge). */
export const TEACHABLE_KANJI = [...new Set([...KANJI_LESSONS.flatMap((l) => l.kanji.map((j) => j.k)), ...KANJI.map((k) => k.kanji)])];

function n5Areas(now) {
  const items = store.s.items;
  const known = new Set(store.planted().filter((p) => p.prog.level >= 2).map((p) => p.item.jp));
  const vocabN = N5_WORDS.filter((w) => known.has(w.jp)).length;
  const vocabT = Math.round(N5_WORDS.length * N5_TARGETS.vocab);

  const learned = (id) => items[id] && items[id].level >= 1;
  const kanjiN = TEACHABLE_KANJI.filter((k) => learned('kj:' + k) || store.forgedKanji.has(k)).length;
  const kanjiT = Math.round(TEACHABLE_KANJI.length * N5_TARGETS.kanji);

  const g = store.s.grammar;
  const gramN = N5_GRAMMAR_KEYS.filter((k) => g[k] && g[k].r && g[k].s >= N5_TARGETS.grammarDays && !g[k].help).length;
  const gramT = Math.round(N5_GRAMMAR_KEYS.length * N5_TARGETS.grammar);

  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const from = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 27);
  const lis = store.skillDays(dateKey(from), dateKey(today)).listening;
  const lisVal = lis.tot ? clamp(lis.tot / N5_TARGETS.listeningAnswers) * clamp(lis.rate / N5_TARGETS.listening) : 0;

  const kana = LESSONS.flatMap((l) => l.chars.map((c) => c.k));
  const kanaN = kana.filter((k) => learned('kana:' + k)).length;
  const chN = store.clearedChapters.size;
  const readVal = 0.5 * (kanaN / kana.length) + 0.5 * clamp(chN / N5_TARGETS.chapters);

  return [
    { id: 'vocab', label: 'Vocabulary', value: clamp(vocabN / vocabT), text: `${vocabN}/${vocabT}`,
      title: `Vocabulary: ${vocabN} of the ${vocabT} N5 words to aim for (${pct(N5_TARGETS.vocab)} of the deck)`,
      tip: 'Water the Garden: new N5 words come in every day.', href: '#/garden', go: 'Garden' },
    { id: 'kanji', label: 'Kanji', value: clamp(kanjiN / kanjiT), text: `${kanjiN}/${kanjiT}`,
      title: `Kanji: ${kanjiN} of ${kanjiT} learned in the Reading Dojo or forged`,
      tip: 'Learn kanji in the Reading Dojo, then forge them in Kanji Forge.', href: '#/play/dojo', go: 'Reading Dojo' },
    { id: 'grammar', label: 'Grammar', value: clamp(gramN / gramT), text: `${gramN}/${gramT}`,
      title: `Grammar: ${gramN} of ${gramT} N5 grammar points remembered for a week or more`,
      tip: 'Read the course lessons; their grammar cards come back in the Garden.', href: '#/course', go: 'Course' },
    { id: 'listening', label: 'Listening', value: lisVal, text: lis.tot ? `${pct(lis.rate)} (${lis.tot})` : '–',
      title: lis.tot ? `Listening: ${pct(lis.rate)} right on the first try from ${lis.tot} answers in the last 4 weeks (aim: ${pct(N5_TARGETS.listening)} from ${N5_TARGETS.listeningAnswers})`
        : 'Listening: no answers in the last 4 weeks yet',
      tip: 'Play Listening Lab or Numbers & Time.', href: '#/play/listen', go: 'Listening Lab' },
    { id: 'reading', label: 'Reading', value: readVal, text: `${pct(readVal)}`,
      title: `Reading: ${kanaN} of ${kana.length} kana learned, ${chN} of ${N5_TARGETS.chapters} Story chapters cleared`,
      tip: chN < N5_TARGETS.chapters && kanaN >= kana.length * 0.8 ? 'Read the next Story chapter.' : 'Finish the kana in the Reading Dojo, then read Story chapters.',
      href: chN < N5_TARGETS.chapters && kanaN >= kana.length * 0.8 ? '#/play/story' : '#/play/dojo', go: chN < N5_TARGETS.chapters && kanaN >= kana.length * 0.8 ? 'Story' : 'Reading Dojo' },
  ];
}

/** N4 has no lessons or mock yet: its meter shows the foundation it will build on and the N4 units done. */
function n4Areas() {
  const strong = new Set(store.planted().filter((p) => p.prog.level >= 4).map((p) => p.item.jp));
  const strongN = N5_WORDS.filter((w) => strong.has(w.jp)).length;
  const strongT = Math.round(N5_WORDS.length * 0.9);
  const n4Units = UNITS.filter((u) => u.phase === 'p2');
  const unitsN = n4Units.filter((u) => store.s.course.done.includes(u.id)).length;
  return [
    { id: 'vocab', label: 'N5 words grown', value: clamp(strongN / strongT), text: `${strongN}/${strongT}`,
      title: `${strongN} of ${strongT} N5 words grown to a tree (remembered for weeks)`,
      tip: 'Keep watering the Garden; N4 builds on these.', href: '#/garden', go: 'Garden' },
    { id: 'units', label: 'N4 lessons', value: unitsN / n4Units.length, text: `${unitsN}/${n4Units.length}`,
      title: `${unitsN} of ${n4Units.length} N4 bridge units done`,
      tip: 'The N4 bridge lessons are still being written.', href: '#/course', go: 'Course' },
  ];
}

/**
 * Readiness for the next level not done yet: { level, areas, overall (0..1), ready, mock (a mock exists for it),
 * snoozed, weakest, done (levels done) }, or null once every level is done.
 */
export function readiness(now = new Date()) {
  const done = store.examDone();
  const level = LEVELS.find((lv) => !done.has(lv));
  if (!level) return null;
  const mock = MOCK_LEVELS.includes(level);
  const areas = level === 'N5' ? n5Areas(now) : level === 'N4' ? n4Areas() : [];
  const overall = areas.length ? areas.reduce((a, x) => a + x.value, 0) / areas.length : 0;
  const ready = mock && areas.length > 0 && overall >= READY_AVERAGE && Math.min(...areas.map((x) => x.value)) >= READY_FLOOR;
  const later = store.exam.later[level];
  const weakest = areas.slice().sort((a, b) => a.value - b.value)[0] || null;
  return { level, areas, overall, ready, mock, snoozed: !!later && later > dateKey(now), weakest, done: LEVELS.filter((lv) => done.has(lv)) };
}

/** The latest mock for a level, or null. */
export function lastMock(level) {
  const h = store.exam.history.filter((x) => x.level === level);
  return h.length ? h[h.length - 1] : null;
}

/** One line about a mock result: "Full mock, 12 Oct: 96/180, passed". */
export function mockLine(h) {
  const d = new Date(h.at);
  const mon = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][d.getMonth()];
  const sc = SCORING[h.level];
  return `${h.format === 'full' ? 'Full' : 'Mini'} mock, ${d.getDate()} ${mon}: ${h.total}/${sc ? sc.total : 180}, ${h.pass ? 'pass' : 'not yet'}`;
}

/** The Today card: the meter for the next level, and a nudge toward a mock once ready. Empty when all are done. */
export function readinessCard(now = new Date()) {
  const r = readiness(now);
  if (!r) return '';
  const p = Math.round(r.overall * 100);
  const last = lastMock(r.level);
  let body;
  if (r.ready && !r.snoozed) {
    body = `<p class="strong good-c">You look ready for a mock ${r.level}.</p>
      <p class="small">It's practice in the real test's format, scored the same way. Misses go into your Garden.</p>
      <div class="row2"><a class="btn primary" href="#/exam">Take a mock</a><button class="btn ghost" data-act="exam-later" data-level="${r.level}">Later</button></div>`;
  } else if (!r.mock) {
    body = `<p class="small">${r.level} lessons and a mock ${r.level} are still to come. Until then this meter shows the ground they build on.</p>`;
  } else {
    body = `<p class="small">${r.ready ? `Ready for a mock ${r.level} whenever you are.` : `Next to grow: <span class="strong">${esc(r.weakest.label)}</span> (${esc(r.weakest.text)}). ${esc(r.weakest.tip)}`}</p>`;
  }
  return `<section class="panel stack-sm road-card ${r.ready ? 'ready' : ''}" aria-labelledby="road-h">
    <div class="row-between"><h2 class="section-title" id="road-h">Road to ${r.level}</h2><span class="mono strong">${p}%</span></div>
    <div class="bar" role="img" aria-label="${p}% of the way to being ready for a mock ${r.level}"><span style="width:${p}%"></span></div>
    ${body}
    ${last ? `<p class="tiny dim">Last: ${esc(mockLine(last))}.</p>` : ''}
    <a class="linkbtn" href="#/progress">See the details ›</a>
  </section>`;
}
