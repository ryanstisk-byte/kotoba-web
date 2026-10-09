// Placement check: an optional, gentle ~3-5 minute check that skips Reading Dojo lessons you already know.
// Hiragana row by row (two questions a row, a third only if it's a split), stopping after two rows you don't know.
// Then one question: any katakana or kanji yet? "Not yet" skips both. It only ever adds: nothing is un-cleared.
import { store } from './store.js';
import { LESSONS, KANJI_LESSONS } from './dojo-data.js';
import { esc, shuffle, delegate } from './ui.js';
import * as fx from './fx.js';

const TRACK_TITLE = { hiragana: 'Hiragana', katakana: 'Katakana', kanji: 'Starter kanji' };
const MAX_FAILED_ROWS = 2;

function lessonsOf(track) {
  return track === 'kanji' ? KANJI_LESSONS : LESSONS.filter((l) => l.track === track);
}

/** One question's items: { shown, answer } per character (kana -> romaji, kanji -> meaning). */
function itemsOf(lesson) {
  if (lesson.kanji) return lesson.kanji.map((j) => ({ shown: j.k, answer: j.meaning }));
  return lesson.chars.map((c) => ({ shown: c.k, answer: c.r }));
}

/** The card on Today that offers the check once, on first launch. Empty when it shouldn't show. */
export function placementCard() {
  const e = store.engine;
  if (e.placement || e.placementSkip || store.trackDone('hiragana')) return '';
  return `<section class="panel engine-card" aria-labelledby="place-h">
    <h2 class="section-title" id="place-h">Know some kana already?</h2>
    <p class="small">An optional quick check (about 3 minutes) skips the Reading Dojo lessons you already know. Misses just show the answer.</p>
    <div class="row2"><a class="btn primary" href="#/placement">Take the quick check</a><button class="btn ghost" data-act="placement-skip">Not now</button></div>
    <p class="tiny dim">You can always take it later from Settings.</p>
  </section>`;
}

export function mount(el, ctx = {}) {
  let phase = 'intro';      // intro | quiz | ask | result
  let tracks = [];          // tracks still to check
  let track = null;
  let rows = [];            // lessons of the current track not yet cleared
  let ri = 0;               // row index
  let qs = [];              // questions for this row
  let qi = 0;
  let right = 0, asked = 0;
  let failed = 0;
  let reveal = null;        // { picked, q } after a miss
  const passed = [];
  let added = [];

  function startTrack(t) {
    track = t;
    const cleared = store.clearedLessons;
    rows = lessonsOf(t).filter((l) => !cleared.has(l.id));
    ri = 0;
    failed = 0;
    if (!rows.length) return nextTrack();
    startRow();
    phase = 'quiz';
    render();
  }

  function nextTrack() {
    if (track === 'hiragana' && !tracks.length) { phase = 'ask'; track = null; render(); return; }
    const t = tracks.shift();
    if (t) startTrack(t); else finish();
  }

  function startRow() {
    const pool = itemsOf(rows[ri]);
    const all = lessonsOf(track).flatMap(itemsOf);
    qs = shuffle(pool).slice(0, 3).map((it) => {
      const others = shuffle([...new Set(all.map((x) => x.answer).filter((a) => a !== it.answer))]).slice(0, 3);
      return { ...it, options: shuffle([it.answer, ...others]) };
    });
    qi = 0; right = 0; asked = 0; reveal = null;
  }

  /** Two right: known. Two wrong: not yet. One of each: one more question decides. */
  function rowVerdict() {
    if (asked >= 2 && right >= 2) return 'pass';
    if (asked >= 2 && asked - right >= 2) return 'fail';
    if (asked >= qs.length) return right * 2 > asked ? 'pass' : 'fail';
    return null;
  }

  function afterAnswer() {
    const v = rowVerdict();
    if (!v) { qi++; render(); return; }
    if (v === 'pass') passed.push(rows[ri].id); else failed++;
    ri++;
    if (failed >= MAX_FAILED_ROWS || ri >= rows.length) { nextTrack(); return; }
    startRow();
    render();
  }

  function answer(picked) {
    if (reveal) return;
    const q = qs[qi];
    asked++;
    if (picked === q.answer) {
      right++;
      fx.hit();
      afterAnswer();
    } else {
      reveal = { picked, q };
      fx.miss();
      render();
    }
  }

  function finish() {
    added = store.applyPlacement(passed);
    phase = 'result';
    render();
  }

  function render() {
    if (phase === 'intro') {
      el.innerHTML = `<div class="stack placement">
        <h2 class="section-title">Quick check</h2>
        <p>A few hiragana, row by row. If you know a row, its Reading Dojo lesson is marked done and you skip it.
          About 3 minutes; it stops early when you reach the rows you haven't learned yet.</p>
        <ul class="small dim"><li>Not sure? Tap "I don't know"; you'll just see the answer.</li>
          <li>Nothing is ever taken away. Lessons you've already cleared stay cleared.</li></ul>
        <button class="btn primary wide" data-act="start">Start</button>
        <button class="btn ghost wide" data-act="leave">Not now</button>
      </div>`;
      return;
    }
    if (phase === 'ask') {
      el.innerHTML = `<div class="stack placement">
        <h2 class="section-title">Hiragana done.</h2>
        <p>Do you know any katakana or kanji yet?</p>
        <button class="btn primary wide" data-act="more" data-v="none">Not yet</button>
        <div class="row2"><button class="btn" data-act="more" data-v="katakana">Some katakana</button><button class="btn" data-act="more" data-v="kanji">Some kanji</button></div>
        <button class="btn wide" data-act="more" data-v="both">Some of both</button>
      </div>`;
      return;
    }
    if (phase === 'result') {
      const titles = passed.map((id) => {
        const l = [...LESSONS, ...KANJI_LESSONS].find((x) => x.id === id);
        return `${TRACK_TITLE[l.track]}: ${l.title}`;
      });
      const next = store.nextLesson();
      el.innerHTML = `<div class="stack placement">
        <h2 class="section-title">${passed.length ? 'Nice. You can skip ahead.' : 'All set.'}</h2>
        ${passed.length
          ? `<p>You already know ${passed.length} lesson${passed.length === 1 ? '' : 's'}${added.length < passed.length ? ` (${passed.length - added.length} were already cleared)` : ''}. They're marked done in the Reading Dojo, and their characters come back for an easy review over the next week.</p>
             <ul class="small placement-list">${titles.map((t) => `<li>${esc(t)}</li>`).join('')}</ul>`
          : '<p>No problem: the Reading Dojo starts from the very first row, so nothing is skipped.</p>'}
        <p class="small dim">${next ? `Next lesson: ${esc(TRACK_TITLE[next.track])} · ${esc(next.title)}.` : 'Every Reading Dojo lesson is done.'}</p>
        <button class="btn primary wide" data-act="leave">Back to Today</button>
      </div>`;
      return;
    }
    const q = qs[qi];
    const total = rows.length;
    el.innerHTML = `<div class="stack placement">
      <div class="row-between"><span class="small dim">${esc(TRACK_TITLE[track])} · row ${ri + 1} of ${total}</span>
        <button class="btn ghost small-btn" data-act="stoptrack">Stop here</button></div>
      <div class="bar" role="img" aria-label="Row ${ri + 1} of ${total}"><span style="width:${(ri / total) * 100}%"></span></div>
      <p class="small dim">${track === 'kanji' ? 'What does this kanji mean?' : 'How do you read this?'}</p>
      <div class="quiz-prompt placement-k" lang="ja" data-noruby>${esc(q.shown)}</div>
      <div class="placement-opts">${q.options.map((o) => {
        const cls = reveal ? (o === q.answer ? 'good' : o === reveal.picked ? 'wrong' : 'faded') : '';
        return `<button class="btn opt ${cls}" data-act="pick" data-v="${esc(o)}" ${reveal ? 'disabled' : ''}>${esc(o)}</button>`;
      }).join('')}</div>
      ${reveal
        ? `<p class="placement-reveal" role="status"><span lang="ja" data-noruby>${esc(q.shown)}</span> is <span class="strong">${esc(q.answer)}</span>.</p>
           <button class="btn primary wide" data-act="next">Next</button>`
        : '<button class="btn ghost wide" data-act="pick" data-v="">I don\'t know</button>'}
    </div>`;
    if (reveal) el.querySelector('[data-act=next]')?.focus();
  }

  const off = delegate(el, {
    start: () => { tracks = []; startTrack('hiragana'); },
    pick: (b) => answer(b.dataset.v),
    next: () => { reveal = null; afterAnswer(); },
    stoptrack: () => { ri = rows.length; nextTrack(); },
    more: (b) => {
      const v = b.dataset.v;
      tracks = v === 'both' ? ['katakana', 'kanji'] : v === 'none' ? [] : [v];
      track = 'done';
      if (tracks.length) startTrack(tracks.shift()); else finish();
    },
    leave: () => { if (ctx.done) ctx.done(); else location.hash = '#/'; },
  });
  render();
  return () => off();
}
