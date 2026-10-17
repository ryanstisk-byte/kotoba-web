// Library: short graded readers for reading lots of easy Japanese (extensive reading). A shelf per level, each reader
// marked with how many of its words you've already met, so the best next read is easy to spot. A reader is a page:
// every line can be played in its speaker's voice (or all of them in a row), every word can be tapped to look it up,
// and the English stays hidden until you ask for it. Two or three light questions at the end check the gist (a miss
// just shows the answer), and the words read add up on the shelf. Readers live in js/library-*.js.
import { store } from '../store.js';
import { speaker } from '../audio.js';
import { READERS, READER_BY_ID } from '../library-data.js';
import { content, itemOpen, lockLine, levelOf, levelBar, APP_LEVELS, allContent } from '../levels.js';
import { lookupHTML, mountLookup, wordsIn, describe } from '../lookup.js';
import { esc, delegate, shuffle } from '../ui.js';
import * as fx from '../fx.js';

/** Words in a reader (each time a word appears), and how many of them the learner has met. */
export function readerStats(r) {
  const words = r.lines.flatMap((l) => wordsIn(l.jp));
  const known = words.filter((w) => w.known).length;
  return { words: words.length, known, pct: words.length ? Math.round((known / words.length) * 100) : 0 };
}

/** Words read in the Library so far: each finished reader's words, times it was read. */
export function wordsRead() {
  let n = 0;
  for (const r of READERS) {
    const res = store.readerResult(r.id);
    if (res) n += res.n * r.lines.reduce((a, l) => a + wordsIn(l.jp).length, 0);
  }
  return n;
}

/** The reader to suggest next: an unread one of an open level with the most words already met. */
export function nextReader() {
  const open = content('library').filter((r) => !store.readerResult(r.id));
  if (!open.length) return null;
  return open.map((r) => ({ r, pct: readerStats(r).pct })).sort((a, b) => b.pct - a.pct || READERS.indexOf(a.r) - READERS.indexOf(b.r))[0].r;
}

export function mount(el, ctx = {}) {
  let reader = null;
  let english = new Set();     // line indexes showing English
  let allEnglish = false;
  let playing = -1;            // the line playing in "Play all", or -1
  let quiz = null;             // { qs, i, picked, ok }
  let done = null;             // { words, newWords } after finishing
  const offLookup = mountLookup(el);

  // ---------- shelf ----------
  function renderShelf() {
    const total = wordsRead();
    const finished = READERS.filter((r) => store.readerResult(r.id)).length;
    const next = nextReader();
    const card = (r) => {
      const res = store.readerResult(r.id);
      const open = itemOpen(r);
      const st = readerStats(r);
      return `<li><button class="panel lib-card ${r === next ? 'next' : ''}" data-act="open" data-id="${esc(r.id)}" ${open ? '' : 'disabled'}
          aria-label="${esc(r.en)}${open ? '' : ' (locked)'}${res ? ', read' : ''}">
          <span class="grow stack-xs">
            <span class="strong lib-title" lang="ja">${esc(r.title)}</span>
            <span class="small">${esc(r.en)}${r === next ? ' <span class="saga-next">NEXT ▶</span>' : ''}</span>
            <span class="small dim">${esc(r.blurb || '')}</span>
            <span class="lib-meta tiny dim">${r.lines.length} lines · ${st.words} words${open ? ` · <span class="${st.pct >= 80 ? 'good-c' : ''}">${st.pct}% met</span>` : ''}${res ? ` · read ${res.n > 1 ? res.n + ' times' : 'once'} ✓` : ''}</span>
          </span>
          <span aria-hidden="true">${open ? '›' : '🔒'}</span></button></li>`;
    };
    el.innerHTML = `
      <div class="stack library">
        <h2 class="title-jp" lang="ja">図書室</h2>
        <p class="dim">Short stories at your level. Read a lot, tap any word you don't know, and don't worry about every detail: the gist is enough.</p>
        ${levelBar('library')}
        <div class="tiles lib-tiles">
          <div class="tile panel"><span class="tile-v mono">${total.toLocaleString()}</span><span class="small dim">words read</span></div>
          <div class="tile panel"><span class="tile-v mono">${finished}</span><span class="small dim">of ${content('library').length} read</span></div>
        </div>
        ${APP_LEVELS.map((lv) => {
          const list = allContent('library').filter((r) => levelOf(r) === lv);
          if (!list.length) return '';
          const open = itemOpen(list[0]);
          return `<section class="stack-sm" aria-label="${lv} readers">
            <h3 class="section-label">${lv} SHELF</h3>
            ${open ? `<ul class="lib-list">${list.map(card).join('')}</ul>`
              : `<p class="small dim">🔒 ${esc(lockLine(lv))}</p><details class="fold"><summary class="small strong">${list.length} readers, locked</summary><ul class="lib-list">${list.map(card).join('')}</ul></details>`}
          </section>`;
        }).join('')}
        <p class="small dim">"% met" is how many of a story's words are already in your Garden. Around 90% or more reads smoothly.</p>
      </div>`;
  }

  // ---------- reading ----------
  function open(r) {
    reader = r;
    english = new Set();
    allEnglish = false;
    playing = -1;
    quiz = null;
    done = null;
    render();
    window.scrollTo(0, 0);
  }

  function renderReader() {
    const r = reader;
    const st = readerStats(r);
    el.innerHTML = `
      <div class="stack lib-reader">
        <div class="row-between"><span class="small dim">${levelOf(r)} · ${r.lines.length} lines · ${st.pct}% of words met</span>
          ${ctx.today ? '' : '<button class="btn ghost small-btn" data-act="shelf">Shelf</button>'}</div>
        <h2 class="section-title lib-h" lang="ja">${esc(r.title)}</h2>
        <p class="small dim">${esc(r.en)}</p>
        <div class="row2">
          ${playing >= 0 ? '<button class="btn" data-act="stop">■ Stop</button>' : '<button class="btn" data-act="playall">▶ Play all</button>'}
          <button class="btn ${allEnglish ? 'on' : ''}" data-act="alleng" aria-pressed="${allEnglish}">📖 ${allEnglish ? 'Hide' : 'Show'} English</button>
        </div>
        <p class="tiny dim">Tap any word to look it up. Tap 🔊 to hear a line.</p>
        <ol class="lib-lines">
          ${r.lines.map((l, i) => {
            const narr = l.who === 'narrator';
            const showEn = allEnglish || english.has(i);
            return `<li class="lib-line ${narr ? 'narr' : 'talk'} ${playing === i ? 'playing' : ''}" data-i="${i}">
              ${narr ? '' : `<span class="lib-who small strong" style="color:${l.speaker.color}" lang="ja">${esc(l.speaker.jpName)}</span>`}
              <span class="lib-row">
                <span class="lib-jp grow" lang="ja">${narr ? '' : '「'}${lookupHTML(l.jp)}${narr ? '' : '」'}</span>
                <button class="btn ghost small-btn lib-play" data-act="line" data-i="${i}" aria-label="Hear line ${i + 1}">🔊</button>
              </span>
              ${showEn ? `<span class="small trace-c lib-en">${esc(l.en)}</span>` : `<button class="linkbtn tiny lib-en-btn" data-act="eng" data-i="${i}">English</button>`}
            </li>`;
          }).join('')}
        </ol>
        <button class="btn primary wide" data-act="finish">${r.questions.length ? 'Done reading: quick questions ▶' : 'Done reading ✓'}</button>
      </div>`;
  }

  function playLine(i, then = null) {
    const l = reader.lines[i];
    speaker.speak(l.jp, { mps: 4.5, voice: l.speaker.voice, onend: then });
  }

  function playFrom(i) {
    if (!reader || i >= reader.lines.length) { playing = -1; render(); return; }
    playing = i;
    render();
    el.querySelector('.lib-line.playing')?.scrollIntoView({ block: 'center', behavior: fx.reducedMotion() ? 'auto' : 'smooth' });
    playLine(i, () => { if (playing === i) setTimeout(() => { if (playing === i) playFrom(i + 1); }, 350); });
  }

  // ---------- questions ----------
  function startQuiz() {
    speaker.stop();
    playing = -1;
    if (!reader.questions.length) return finish();
    quiz = { qs: reader.questions.map((q) => ({ ...q, order: shuffle(q.options.map((_, i) => i)) })), i: 0, picked: null, ok: 0 };
    render();
    window.scrollTo(0, 0);
  }

  function renderQuiz() {
    const q = quiz.qs[quiz.i];
    const n = quiz.qs.length;
    const answered = quiz.picked != null;
    const right = answered && quiz.picked === q.answer;
    el.innerHTML = `
      <div class="stack saga-quiz">
        <div class="row-between"><span class="small dim" lang="ja">${esc(reader.title)} · questions</span>
          <button class="btn ghost small-btn" data-act="back">Back to the text</button></div>
        <p class="section-label">QUESTION ${quiz.i + 1} OF ${n}</p>
        <h2 class="section-title quiz-q" tabindex="-1">${esc(q.q)}</h2>
        ${answered ? `
          <div class="panel note saga-feedback ${right ? 'ok' : 'missed'}" role="status">
            <p class="strong ${right ? 'good-c' : 'miss-c'}">${right ? '✓ Right!' : "Here's the answer:"}</p>
            <p class="lead strong">${esc(q.options[q.answer])}</p>
            <p>${esc(q.why || '')}</p>
          </div>
          <button class="btn primary wide" data-act="qnext">${quiz.i + 1 < n ? 'Next ▶' : 'Finish ▶'}</button>`
        : `<div class="stack-sm">${q.order.map((i) => `<button class="btn left" data-act="answer" data-i="${i}">${esc(q.options[i])}</button>`).join('')}</div>`}
      </div>`;
  }

  function answer(i) {
    if (quiz.picked != null) return;
    const q = quiz.qs[quiz.i];
    const ok = i === q.answer;
    quiz.picked = i;
    if (ok) quiz.ok++;
    store.log(ok);
    store.grade({ skill: 'vocab', id: `lib:${reader.id}:q${quiz.i}`, ok, firstTry: true });
    render();
    if (ok) fx.hit(); else fx.miss();
    el.querySelector('[data-act=qnext]')?.focus();
  }

  // ---------- done ----------
  function finish() {
    const words = reader.lines.reduce((a, l) => a + wordsIn(l.jp).length, 0);
    store.finishReader(reader.id, quiz ? quiz.ok : 0, quiz ? quiz.qs.length : 0);
    // Garden words in the story not planted yet: offered, never planted for you.
    const seen = new Set();
    const fresh = reader.lines.flatMap((l) => wordsIn(l.jp)).filter((w) => w.id && !w.known && !seen.has(w.id) && seen.add(w.id))
      .map((w) => ({ ...describe(w.entry), id: w.id })).filter((d) => d && d.level && itemOpen({ level: d.level })).slice(0, 8);
    done = { words, fresh, ok: quiz ? quiz.ok : 0, n: quiz ? quiz.qs.length : 0 };
    quiz = null;
    render();
    fx.hit({ big: true, el: el.querySelector('h2') });
    if (ctx.today) ctx.today.done();
  }

  function renderDone() {
    const next = nextReader();
    el.innerHTML = `
      <div class="stack">
        <h2 class="accent-c title-jp" lang="ja" data-noruby>読了！</h2>
        <p class="lead strong">${done.words} more words read. ${wordsRead().toLocaleString()} in all.</p>
        ${done.n ? `<p class="small dim">Questions: ${done.ok} of ${done.n}. ${done.ok === done.n ? 'You got the gist.' : 'The answers you saw are part of reading it.'}</p>` : ''}
        ${done.fresh.length ? `<div class="panel stack-sm"><p class="section-label">NEW WORDS FROM THIS STORY</p>
          <p class="small dim">Plant the ones you want to keep. They join your Garden's new words.</p>
          ${done.fresh.map((w) => `<div class="word-row"><span class="strong" lang="ja">${esc(w.jp)}</span><span class="dim" lang="ja">${esc(w.reading)}</span>
            <span class="small dim grow">${esc(w.en)}</span>
            ${store.s.items[w.id] ? '<span class="tag">🌱 Planted</span>' : `<button class="btn small-btn" data-act="plant" data-id="${esc(w.id)}">＋ Plant</button>`}</div>`).join('')}
        </div>` : ''}
        ${ctx.today ? '' : `<div class="row2">
          <button class="btn" data-act="shelf">Shelf</button>
          ${next ? `<button class="btn primary" data-act="open" data-id="${esc(next.id)}">Next: <span lang="ja">${esc(next.title)}</span></button>` : '<button class="btn primary" data-act="again">Read it again</button>'}
        </div>`}
      </div>`;
  }

  function render() {
    if (!reader) return renderShelf();
    if (done) return renderDone();
    if (quiz) return renderQuiz();
    return renderReader();
  }

  const off = delegate(el, {
    open: (b) => open(READER_BY_ID[b.dataset.id]),
    shelf: () => { speaker.stop(); reader = null; quiz = null; done = null; playing = -1; render(); window.scrollTo(0, 0); },
    line: (b) => { playing = -1; render(); playLine(+b.dataset.i); },
    playall: () => playFrom(0),
    stop: () => { playing = -1; speaker.stop(); render(); },
    eng: (b) => { english.add(+b.dataset.i); render(); },
    alleng: () => { allEnglish = !allEnglish; render(); },
    finish: startQuiz,
    back: () => { quiz = null; render(); },
    answer: (b) => answer(+b.dataset.i),
    qnext: () => { if (quiz.i + 1 < quiz.qs.length) { quiz.i++; quiz.picked = null; render(); el.querySelector('.quiz-q')?.focus?.(); } else finish(); },
    plant: (b) => { store.plant(b.dataset.id); render(); },
    again: () => open(reader),
  });

  if (ctx.readerId && READER_BY_ID[ctx.readerId]) open(READER_BY_ID[ctx.readerId]);
  else render();
  return () => { off(); offLookup(); playing = -1; speaker.stop(); };
}
