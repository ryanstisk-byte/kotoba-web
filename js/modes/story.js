// Story (StoryView.swift): Kotoba Dojo, visual-novel style. A chapter map of the whole saga, each chapter read line by
// line, then 2-3 comprehension questions. Cleared chapters can be replayed, or replayed as a no-furigana challenge.
// "Paste a line" (story-mine.js) turns a line from a show into a Garden card.
import { store } from '../store.js';
import { speaker } from '../audio.js';
import { CHAPTERS, CAST, ARCS, QUIZZES } from '../data.js';
import { esc, delegate, shuffle } from '../ui.js';
import * as fx from '../fx.js';
import { mountMine } from './story-mine.js';

export function mount(el, ctx) {
  let chapter = null;
  let index = 0;
  let showEnglish = false;
  let showReading = true;
  let choiceSolved = false;
  let wrongReply = null;
  let selectedWord = null;
  let finished = false;
  let isReplay = false;
  let challenge = false;   // no-furigana challenge: reading help forced off for this replay
  let choiceMissed = false;
  let quiz = null;         // { qs: [{ ...q, order }], i, picked, ok }
  let mineOff = null;

  const beat = () => chapter.beats[Math.min(index, chapter.beats.length - 1)];
  const byId = (id) => CHAPTERS.find((c) => c.id === id);
  /** In a challenge replay the whole screen skips reading help (furigana and romaji). */
  const noRuby = () => (challenge ? ' data-noruby' : '');

  // ---------- chapter map ----------
  function renderList() {
    const cleared = store.clearedChapters;
    const nextId = CHAPTERS.find((c) => !cleared.has(c.id))?.id;
    const done = CHAPTERS.filter((c) => cleared.has(c.id)).length;
    const mined = store.mined.length;
    const node = (ch) => {
      const isCleared = cleared.has(ch.id);
      const unlocked = ch.number === 1 || cleared.has('ch' + (ch.number - 1));
      const state = isCleared ? 'cleared' : ch.id === nextId && unlocked ? 'next' : unlocked ? 'open' : 'locked';
      const head = `<span class="ch-num ${state === 'locked' ? 'locked' : ''}">${ch.number}</span>
        <span class="grow"><span class="strong big" lang="ja">${esc(ch.title)}</span><br><span class="small dim">${esc(ch.en)}</span></span>`;
      if (!isCleared) {
        return `<li class="saga-node ${state}">
          <button class="panel chapter-row" data-act="open" data-id="${ch.id}" ${unlocked ? '' : 'disabled'}
            aria-label="Chapter ${ch.number}: ${esc(ch.en)}${unlocked ? '' : ' (locked)'}">
            ${head}<span>${state === 'next' ? '<span class="saga-next">NEXT ▶</span>' : unlocked ? '' : '<span aria-hidden="true">🔒</span>'}</span>
          </button></li>`;
      }
      const r = store.storyResult(ch.id);
      const results = [
        r.quiz ? `Questions ${r.quiz.best}/${r.quiz.tot}` : '',
        r.challenge ? `Challenge best ${r.challenge.best}/${r.challenge.tot}` : '',
      ].filter(Boolean).join(' · ');
      return `<li class="saga-node cleared">
        <div class="panel saga-card">
          <div class="chapter-row">${head}<span class="good-c" aria-label="cleared">✔︎</span></div>
          ${results ? `<p class="tiny dim saga-results">${esc(results)}</p>` : ''}
          <div class="saga-actions">
            <button class="btn small-btn" data-act="open" data-id="${ch.id}" aria-label="Replay chapter ${ch.number}">↻ Replay</button>
            <button class="btn small-btn" data-act="challenge" data-id="${ch.id}" aria-label="No-furigana challenge, chapter ${ch.number}">🙈 No-furigana challenge</button>
          </div>
        </div></li>`;
    };
    el.innerHTML = `
      <div class="stack saga">
        <h2 class="title-jp">言葉の道場</h2>
        <p class="dim">Kotoba Dojo: Ren wants to get stronger. Each line uses words you know plus about one new one, and every word you meet is planted in your garden. Questions after each chapter check what you understood.</p>
        <div class="saga-progress"><div class="bar" role="img" aria-label="${done} of ${CHAPTERS.length} chapters cleared"><span style="width:${(done / CHAPTERS.length) * 100}%"></span></div>
          <span class="small mono dim">${done}/${CHAPTERS.length}</span></div>
        <button class="panel link-panel saga-mine" data-act="mine">
          <span class="grow"><span class="strong">✍️ Paste a line</span><br><span class="small dim">Heard a great line in a show? Turn it into a Garden card.${mined ? ` ${mined} mined so far.` : ''}</span></span>
          <span class="dim chev" aria-hidden="true">›</span></button>
        ${ARCS.map((arc) => `
          <section class="stack-sm" aria-label="${esc(arc.en)}">
            <h3 class="section-label"><span lang="ja">${esc(arc.title)}</span> ${esc(arc.en.toUpperCase())} · ${esc(arc.level)}</h3>
            <ol class="saga-path">${arc.chapters.map((id) => node(byId(id))).join('')}</ol>
          </section>`).join('')}
        <p class="small dim">Cleared chapters: replay them, or take the no-furigana challenge to read them from memory.</p>
      </div>`;
  }

  // ---------- reading ----------
  function open(ch, { asChallenge = false } = {}) {
    chapter = ch;
    index = 0;
    finished = false;
    quiz = null;
    // Furigana starts on for a new chapter and off on replays of cleared ones; the challenge forces it off.
    isReplay = store.clearedChapters.has(ch.id);
    challenge = asChallenge && isReplay;
    showReading = !isReplay;
    enterBeat();
    window.scrollTo(0, 0);
  }

  function speak() {
    const b = beat();
    speaker.speak(b.jp, { mps: 4.5, voice: b.speaker.voice });
  }

  function enterBeat() {
    showEnglish = false;
    selectedWord = null;
    wrongReply = null;
    choiceSolved = false;
    choiceMissed = false;
    for (const w of beat().words) store.plant(w.gardenID);
    render();
    speak();
  }

  function advance() {
    if (index + 1 < chapter.beats.length) {
      index++;
      if (ctx.today) ctx.today.report(`${index + 1}/${chapter.beats.length}`);
      enterBeat();
      return;
    }
    store.clearChapter(chapter.id);
    if (isReplay) store.noteReplay(chapter.id);
    store.markStudied();
    speaker.stop();
    const qs = QUIZZES[chapter.id] || [];
    if (qs.length) {
      quiz = { qs: qs.map((q) => ({ ...q, order: shuffle(q.options.map((_, i) => i)) })), i: 0, picked: null, ok: 0 };
      if (ctx.today) ctx.today.report('questions');
      render();
      el.querySelector('.quiz-q')?.focus?.();
    } else {
      finish();
    }
  }

  function finish() {
    if (quiz) store.recordStoryQuiz(chapter.id, quiz.ok, quiz.qs.length, { challenge });
    finished = true;
    render();
    fx.hit({ big: true, el: el.querySelector('h2') });
    if (ctx.today) ctx.today.done();
  }

  function render() {
    if (!chapter) return renderList();
    if (finished) return renderFinished();
    if (quiz) return renderQuiz();
    const b = beat();
    const c = b.speaker;
    const pct = ((index + 1) / chapter.beats.length) * 100;
    el.innerHTML = `
      <div class="stack"${noRuby()}>
        <div class="row-between"><span class="small dim">${chapter.number}. ${esc(chapter.title)}</span>
          ${ctx.today ? '' : '<button class="btn ghost small-btn" data-act="list">Chapters</button>'}</div>
        <div class="bar"><span style="width:${pct}%"></span></div>
        <div class="speaker-row">
          <span class="avatar" style="background:${c.color}">${esc([...c.jpName][0])}</span>
          <span class="grow"><span class="strong" style="color:${c.color}">${esc(c.jpName)}</span><br><span class="small dim">${esc(c.name)}</span></span>
          ${challenge
            ? '<span class="tag saga-challenge-tag" title="Reading help is off for this replay">🙈 Challenge</span>'
            : `<button class="chip-toggle ${showReading ? 'on' : ''}" data-act="furi" aria-pressed="${showReading}">ふりがな</button>`}
        </div>
        <button class="panel line-card" data-act="meaning" aria-label="Tap to show meaning">
          ${showReading && !challenge ? `<span class="reading dim">${esc(b.reading)}</span>` : ''}
          <span class="line-jp" lang="ja">${esc(b.jp)}</span>
          ${showEnglish ? `<span class="trace-c">${esc(b.en)}</span>` : '<span class="small dim">Tap for meaning</span>'}
        </button>
        ${b.words.length ? `<div class="chips">${b.words.map((w, i) => `<button class="chip" data-act="word" data-i="${i}" lang="ja">${esc(w.jp)}</button>`).join('')}</div>` : ''}
        ${selectedWord ? `<p>${esc(selectedWord.jp)}${challenge ? '' : ` (${esc(selectedWord.reading)})`}: ${esc(selectedWord.en)}</p>` : ''}
        ${b.note ? `<div class="panel note">💡 ${esc(b.note)}</div>` : ''}
        ${b.choice && !choiceSolved ? `
          <div class="stack-sm">
            <p class="strong">${esc(b.choice.prompt)}</p>
            ${wrongReply ? `<p class="miss-c">${esc(wrongReply)}</p>` : ''}
            ${b.choice.options.map((o, i) => `<button class="btn left" data-act="choice" data-i="${i}" lang="ja">${esc(o)}</button>`).join('')}
          </div>` : `
          <div class="row3">
            <button class="btn" data-act="replay" aria-label="Replay">🔊 Replay</button>
            <button class="btn" data-act="meaning" aria-label="Meaning">📖 Meaning</button>
            <button class="btn primary" data-act="next" aria-label="Next">Next ▶</button>
          </div>`}
      </div>`;
  }

  // ---------- comprehension questions ----------
  function renderQuiz() {
    const q = quiz.qs[quiz.i];
    const n = quiz.qs.length;
    const line = q.line != null ? chapter.beats[q.line] : null;
    const answered = quiz.picked != null;
    const right = answered && quiz.picked === q.answer;
    el.innerHTML = `
      <div class="stack saga-quiz"${noRuby()}>
        <div class="row-between"><span class="small dim">${chapter.number}. ${esc(chapter.title)} · questions</span>
          ${ctx.today ? '' : '<button class="btn ghost small-btn" data-act="list">Chapters</button>'}</div>
        <div class="bar"><span style="width:${((quiz.i + (answered ? 1 : 0)) / n) * 100}%"></span></div>
        <p class="section-label">QUESTION ${quiz.i + 1} OF ${n}${challenge ? ' · 🙈 NO FURIGANA' : ''}</p>
        <h2 class="section-title quiz-q" tabindex="-1">${esc(q.q)}</h2>
        ${line ? `<div class="panel saga-quote">
            <span class="grow"><span class="small dim">${esc(line.speaker.jpName)}</span><br><span class="saga-quote-jp" lang="ja">${esc(line.jp)}</span></span>
            <button class="btn ghost small-btn" data-act="qline" aria-label="Hear the line">🔊</button></div>` : ''}
        ${answered ? `
          <div class="panel note saga-feedback ${right ? 'ok' : 'missed'}" role="status">
            <p class="strong ${right ? 'good-c' : 'miss-c'}">${right ? '✓ Right!' : 'Here\'s the answer:'}</p>
            <p class="lead strong">${esc(q.options[q.answer])}</p>
            <p>${esc(q.why)}</p>
            ${right ? '' : '<p class="small dim">Seeing the answer counts as learning it. No penalty.</p>'}
          </div>
          <button class="btn primary wide" data-act="qnext" aria-label="Next">${quiz.i + 1 < n ? 'Next ▶' : 'Finish ▶'}</button>`
        : `<div class="stack-sm">${q.order.map((i) => `<button class="btn left" data-act="choice" data-i="${i}">${esc(q.options[i])}</button>`).join('')}</div>`}
      </div>`;
  }

  function answerQuiz(i) {
    if (quiz.picked != null) return;
    const q = quiz.qs[quiz.i];
    const ok = i === q.answer;
    quiz.picked = i;
    if (ok) quiz.ok++;
    store.log(ok);
    store.grade({ skill: q.skill, id: `${chapter.id}:q${quiz.i}`, ok, firstTry: true });
    render();
    if (ok) fx.hit(); else fx.miss();
    el.querySelector('[data-act=qnext]')?.focus();
  }

  function nextQuestion() {
    if (quiz.i + 1 < quiz.qs.length) {
      quiz.i++;
      quiz.picked = null;
      render();
      el.querySelector('.quiz-q')?.focus?.();
    } else {
      finish();
    }
  }

  function renderFinished() {
    const words = chapter.beats.flatMap((b) => b.words);
    const n = quiz ? quiz.qs.length : 0;
    const ok = quiz ? quiz.ok : 0;
    const next = CHAPTERS.find((c) => c.number === chapter.number + 1);
    const verdict = !n ? '' : ok === n ? 'Every question right. You understood it all.'
      : ok >= n - 1 ? 'Nearly all right: that is right where learning happens.'
        : 'The answers you saw will stick next time. Replay it whenever you like.';
    el.innerHTML = `
      <div class="stack"${noRuby()}>
        <h2 class="accent-c title-jp" data-noruby>第${chapter.number}話 クリア！</h2>
        ${n ? `<div class="panel saga-score"><span class="stat-v mono">${ok}/${n}</span>
          <span class="grow"><span class="strong">${challenge ? 'No-furigana challenge' : 'Questions'}</span><br><span class="small dim">${esc(verdict)}</span></span></div>` : ''}
        ${words.length ? `<p>Chapter ${chapter.number} cleared. These words are now growing in your garden:</p>
        <div class="panel word-list">${words.map((w) => `
          <div class="word-row"><span class="strong" lang="ja">${esc(w.jp)}</span>${challenge ? '' : `<span class="dim" lang="ja">${esc(w.reading)}</span>`}<span class="small dim grow right">${esc(w.en)}</span></div>`).join('')}
        </div>` : `<p>Chapter ${chapter.number} cleared.</p>`}
        ${challenge ? '' : '<p class="small dim">Replay it later as a no-furigana challenge to read it from memory.</p>'}
        ${ctx.today ? '' : `<div class="row2">
          <button class="btn" data-act="list">Back to chapters</button>
          ${next && !challenge ? `<button class="btn primary" data-act="open" data-id="${next.id}">Chapter ${next.number} ▶</button>` : `<button class="btn primary" data-act="list">Chapter map</button>`}
        </div>`}
      </div>`;
  }

  // ---------- paste a line ----------
  function showMine() {
    chapter = null;
    speaker.stop();
    el.innerHTML = '<div class="mine-root"></div>';
    mineOff = mountMine(el.firstElementChild, { back: () => { closeMine(); render(); } });
    window.scrollTo(0, 0);
  }
  function closeMine() { if (mineOff) { mineOff(); mineOff = null; } }

  const off = delegate(el, {
    open: (b) => { closeMine(); open(byId(b.dataset.id)); },
    challenge: (b) => open(byId(b.dataset.id), { asChallenge: true }),
    mine: showMine,
    list: () => { chapter = null; quiz = null; challenge = false; speaker.stop(); render(); },
    furi: () => { showReading = !showReading; render(); },
    meaning: () => { showEnglish = !showEnglish; render(); },
    word: (b) => { selectedWord = beat().words[+b.dataset.i]; speaker.speak(selectedWord.reading, { mps: 3 }); render(); },
    replay: speak,
    next: advance,
    qline: () => { const b = chapter.beats[quiz.qs[quiz.i].line]; if (b) speaker.speak(b.jp, { mps: 4.5, voice: b.speaker.voice }); },
    qnext: nextQuestion,
    choice: (btn) => {
      const i = +btn.dataset.i;
      if (quiz) { answerQuiz(i); return; }
      const ch = beat().choice;
      if (i === ch.answer) {
        wrongReply = null;
        choiceSolved = true;
        speaker.speak(ch.options[i], { mps: 4, voice: CAST.ren.voice });
        if (!choiceMissed) store.log(true);
        store.grade({ skill: 'grammar', id: `${chapter.id}:${index}`, ok: true, firstTry: !choiceMissed });
      } else {
        if (!choiceMissed) store.log(false);
        store.grade({ skill: 'grammar', id: `${chapter.id}:${index}`, ok: false, firstTry: !choiceMissed });
        choiceMissed = true;
        wrongReply = ch.wrongReply;
      }
      render();
      if (i === ch.answer) fx.hit(); else fx.miss();
    },
  });

  if (ctx.chapterId) {
    open(byId(ctx.chapterId) || CHAPTERS[0]);
    if (ctx.today) ctx.today.report(`1/${chapter.beats.length}`);
  } else {
    render();
  }
  return () => { off(); closeMine(); speaker.stop(); };
}
