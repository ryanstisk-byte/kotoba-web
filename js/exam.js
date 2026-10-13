// Mock JLPT screen (#/exam): a mini mock (a few questions from each part, no clock) or a full mock timed like the
// real N5 (vocabulary 20 min, grammar and reading 40, listening 30) with pause. Like the real test there's no
// feedback while answering; the results show the score against the pass line, each part with where to practise it,
// and every miss with its answer and why. Each miss goes into the Garden. Questions come from js/exam-data.js.
import { store } from './store.js';
import { speaker } from './audio.js';
import { buildMock, scoreMock, mockIds, FORMATS, PARTS, SCORING, MOCK_LEVELS } from './exam-data.js';
import { readiness, mockLine } from './readiness.js';
import { esc, shuffle, delegate } from './ui.js';
import { linePlayer } from './practice-ui.js';
import * as fx from './fx.js';

const fmtTime = (ms) => {
  const s = Math.max(0, Math.ceil(ms / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
};

export function mount(el, ctx = {}) {
  const level = MOCK_LEVELS[0];
  const quiet = !!ctx.quiet;
  let phase = 'intro';     // intro | section | question | paused | result
  let mock = null;
  let flat = [];           // [{ q, sec }] every question in order
  let answers = [];        // option picked per question (null: no answer)
  let qi = 0;              // current question in `flat`
  let si = 0;              // current section
  let left = 0;            // ms left in a timed section
  let tick = null;
  let lastTick = 0;
  let timeUp = false;
  let result = null;
  let doneBefore = false;
  const player = linePlayer((i) => {
    const s = el.querySelector('#ex-status');
    if (s) s.textContent = i >= 0 ? 'Playing…' : '';
  });

  function start(format) {
    mock = buildMock({ level, format, seen: store.exam.seen });
    flat = [];
    mock.sections.forEach((sec, s) => sec.questions.forEach((q) => flat.push({ q: { ...q, shown: shuffle(q.options) }, sec: s })));
    answers = flat.map(() => null);
    qi = 0;
    si = 0;
    doneBefore = store.examDone().has(level);
    phase = 'section';
    render();
  }

  // ----- the clock (full mock only) -----
  function startClock() {
    stopClock();
    if (!mock.timed) return;
    lastTick = Date.now();
    tick = setInterval(() => {
      const now = Date.now();
      left -= now - lastTick;
      lastTick = now;
      const t = el.querySelector('#ex-clock');
      if (t) t.textContent = fmtTime(left);
      if (left <= 0) { timeUp = true; endSection(); }
    }, 1000);
  }
  function stopClock() { if (tick) clearInterval(tick); tick = null; }

  function beginSection() {
    timeUp = false;
    left = (mock.sections[si].minutes || 0) * 60_000;
    phase = 'question';
    startClock();
    render();
  }

  function endSection() {
    stopClock();
    player.stop();
    const last = flat.findLastIndex((f) => f.sec === si);
    si++;
    qi = last + 1;
    if (si >= mock.sections.length) finish();
    else { phase = 'section'; render(); }
  }

  function answer(v) {
    answers[qi] = v;
    player.stop();
    const next = qi + 1;
    if (next >= flat.length || flat[next].sec !== si) { endSection(); return; }
    qi = next;
    render();
  }

  function finish() {
    stopClock();
    phase = 'result';
    const score = scoreMock(mock, answers);
    result = { level, format: mock.format, ...score };
    store.recordMock(result, mockIds(mock));
    // Every miss comes back in the Garden: its words sooner (or planted), its grammar point as a card.
    const missed = flat.filter((f, i) => answers[i] !== f.q.answer).map((f) => f.q);
    store.recapMissed([...new Set(missed.flatMap((q) => q.garden || []))]);
    for (const key of new Set(missed.flatMap((q) => q.grammar || []))) store.plantGrammar(key);
    render();
    if (result.pass) { fx.sound('fanfare'); fx.buzz([20, 60, 20, 60, 40]); }
  }

  // ----- screens -----
  function render() {
    if (phase === 'intro') return renderIntro();
    if (phase === 'section') return renderSection();
    if (phase === 'paused') return renderPaused();
    if (phase === 'result') return renderResult();
    return renderQuestion();
  }

  function renderIntro() {
    const r = readiness();
    const sc = SCORING[level];
    const full = FORMATS.full;
    const hist = store.exam.history.filter((h) => h.level === level).slice(-3).reverse();
    el.innerHTML = `<div class="stack exam">
      <h2 class="section-title">Mock JLPT ${level}</h2>
      <p>Practice in the real test's format, made from the app's own words, grammar, story and voices. It's optional and nothing is locked by it. About once a month is plenty.</p>
      ${r && r.level === level ? `<p class="small ${r.ready ? 'good-c strong' : 'dim'}">${r.ready ? `You look ready: ${Math.round(r.overall * 100)}% of the way on your road to ${level}.`
        : `You're ${Math.round(r.overall * 100)}% of the way to ready. A mock now is fine too: it shows what to practise next.`}</p>` : ''}
      <div class="exam-formats">
        <div class="panel stack-sm">
          <h3 class="strong big">Mini mock</h3>
          <p class="small">About ${FORMATS.mini.minutes} minutes, a few questions from every part, no clock.</p>
          <button class="btn primary wide" data-act="start" data-v="mini">Start the mini mock</button>
        </div>
        <div class="panel stack-sm">
          <h3 class="strong big">Full mock</h3>
          <p class="small">Timed like the real ${level}: ${full.sections.map((s) => `${s.title.toLowerCase()} ${s.minutes} min`).join(', ')}. You can pause. Passing it finishes ${level} on your road.</p>
          <button class="btn wide" data-act="start" data-v="full">Start the full mock</button>
        </div>
      </div>
      <details class="panel small"><summary class="strong">How it's scored</summary>
        <p>Like the real ${level}: vocabulary, grammar and reading together score 0 to ${sc.lk.max}, and listening scores 0 to ${sc.li.max}, for ${sc.total} in all. You pass with ${sc.pass} or more, as long as you also get at least ${sc.lk.min} in the first part and ${sc.li.min} in listening.</p>
        <p class="dim">The real test weighs each question by how hard it is; here every question counts the same, so treat the score as a guide.</p>
      </details>
      <ul class="small dim">
        <li>No reading help in the vocabulary part, like the real test. Elsewhere it follows your setting.</li>
        <li>There are no answers along the way. At the end you see every miss with its answer, and each one comes back in your Garden.</li>
        <li>Leaving partway saves nothing.</li>
        ${quiet ? '<li>Quiet mode is on, so listening questions show the lines as text instead of playing them.</li>' : ''}
      </ul>
      ${hist.length ? `<p class="small dim">Recent: ${hist.map((h) => esc(mockLine(h))).join(' · ')}</p>` : ''}
    </div>`;
  }

  function renderSection() {
    const sec = mock.sections[si];
    const n = sec.questions.length;
    el.innerHTML = `<div class="stack exam">
      <p class="small dim">${esc(FORMATS[mock.format].title)} ${level} · part ${si + 1} of ${mock.sections.length}</p>
      ${timeUp ? `<p class="note-c small" role="status">Time's up for that part. In the real test you'd move on now, so this one does too.</p>` : ''}
      <h2 class="section-title">${esc(sec.title)}</h2>
      <p>${n} questions${sec.minutes ? `, ${sec.minutes} minutes` : ''}.${sec.id === 'listening' ? (quiet ? ' Quiet mode: you read each line instead of hearing it.' : ' Each one plays when it opens; you can replay it.') : ''}</p>
      <button class="btn primary wide" data-act="begin">Start ${esc(sec.title.toLowerCase())}</button>
    </div>`;
    el.querySelector('[data-act=begin]')?.focus();
  }

  function renderPaused() {
    el.innerHTML = `<div class="stack exam">
      <h2 class="section-title">Paused</h2>
      <p>The clock is stopped at ${fmtTime(left)}. The question is hidden until you come back.</p>
      <button class="btn primary wide" data-act="resume">Resume</button>
      <button class="btn ghost wide" data-act="quit">Stop the mock (nothing is saved)</button>
    </div>`;
    el.querySelector('[data-act=resume]')?.focus();
  }

  /** The part of a question above its options. */
  function body(q, { review = false } = {}) {
    const ja = (s) => `<span lang="ja">${esc(s)}</span>`;
    if (q.sentence) {
      const s = q.sentence;
      return `<p class="exam-jp" lang="ja" data-noruby>${esc(s.before)}<u class="exam-mark">${esc(s.mark)}</u>${esc(s.after)}</p>`;
    }
    if (q.blanked) {
      return `<p class="exam-jp" lang="ja" ${q.noruby ? 'data-noruby' : ''}>${esc(q.blanked)}</p>${q.en ? `<p class="small dim">"${esc(q.en)}"</p>` : ''}`;
    }
    if (q.frame) {
      const f = q.frame;
      const slots = Array.from({ length: f.slots }, (_, i) => `<span class="exam-slot ${i === f.star ? 'star' : ''}">${i === f.star ? '★' : ''}</span>`).join('');
      return `<p class="exam-jp exam-frame" lang="ja">${f.before ? ja(f.before) : ''}${slots}${f.after ? ja(f.after) : ''}</p>
        <p class="small dim">"${esc(q.en)}"</p>`;
    }
    if (q.passage) {
      const text = `<div class="panel exam-passage stack-sm"><p class="small strong" lang="ja">${esc(q.passage.title)}</p>
        ${q.passage.lines.map((l) => `<p><span class="small dim">${esc(l.who)}:</span> <span lang="ja">${esc(l.jp)}</span></p>`).join('')}</div>`;
      return review ? `<details class="small"><summary class="strong">The passage</summary>${text}</details>` : text;
    }
    if (q.say && q.part === 'listening') {
      if (quiet || review) {
        return `<div class="panel exam-passage stack-sm">${q.transcript.map((l) => `<p>${l.who ? `<span class="small dim">${esc(l.who)}:</span> ` : ''}<span lang="ja">${esc(l.text)}</span></p>`).join('')}</div>`;
      }
      return `<div class="row2"><button class="btn" data-act="play">🔊 Play again</button><span class="small accent-c exam-status" id="ex-status" aria-live="polite"></span></div>`;
    }
    return '';
  }

  function renderQuestion() {
    const { q } = flat[qi];
    const sec = mock.sections[si];
    const inSec = flat.filter((f) => f.sec === si);
    const pos = inSec.findIndex((f) => f === flat[qi]);
    el.innerHTML = `<div class="stack exam" ${sec.id === 'vocab' ? 'data-noruby' : ''} data-qid="${esc(q.qid || q.id)}">
      <div class="row-between">
        <span class="small dim">${esc(sec.title)} · ${pos + 1} of ${inSec.length}</span>
        ${mock.timed ? `<span class="row-gap"><span class="mono strong" id="ex-clock" aria-label="Time left">${fmtTime(left)}</span>
          <button class="btn ghost small-btn" data-act="pause">Pause</button></span>` : ''}
      </div>
      <div class="bar" role="img" aria-label="Question ${pos + 1} of ${inSec.length}"><span style="width:${(pos / inSec.length) * 100}%"></span></div>
      <p><span class="tag">${esc(q.label)}</span></p>
      <p class="lead strong">${esc(q.ask)}</p>
      ${body(q)}
      <div class="choice-grid exam-opts">${q.shown.map((o, i) => `<button class="btn" data-act="pick" data-i="${i}"${q.ja ? ' lang="ja"' : ''}>${esc(o)}</button>`).join('')}</div>
      <button class="btn ghost wide" data-act="skip">I don't know</button>
    </div>`;
    // A listening question plays when it opens (once per scene: its other questions don't replay it).
    const prev = flat[qi - 1];
    if (q.part === 'listening' && !quiet && !(prev && prev.q.id === q.id)) setTimeout(() => { if (flat[qi] && flat[qi].q === q && phase === 'question') player.play(q.say); }, 350);
  }

  function renderResult() {
    const sc = SCORING[level];
    const r = result;
    const nowDone = !doneBefore && store.examDone().has(level);
    const next = readiness();
    const missed = flat.map((f, i) => ({ ...f, i })).filter((f) => answers[f.i] !== f.q.answer);
    const partRows = Object.entries(r.parts).filter(([, t]) => t[1]).map(([id, [ok, tot]]) => {
      const p = PARTS[id];
      const low = ok / tot < 0.6;
      return `<li class="exam-part"><span class="strong">${esc(p.title)}</span> <span class="mono">${ok}/${tot}</span>
        ${low ? `<br><span class="small">Practise in ${p.practice.map(([m, t]) => `<a href="#/play/${m}">${esc(t)}</a>`).join(', ')}.</span>` : ''}</li>`;
    }).join('');
    const pctOf = (v, max) => Math.round((v / max) * 100);
    el.innerHTML = `<div class="stack exam exam-result">
      <p class="small dim">${esc(FORMATS[r.format].title)} ${level}</p>
      <h2 class="section-title">${r.pass ? 'Pass!' : 'Not yet, and that\'s useful to know.'}</h2>
      <p><span class="score-huge mono">${r.total}</span><span class="dim"> / ${sc.total}</span></p>
      <div class="exam-meter" role="img" aria-label="${r.total} out of ${sc.total}; the pass line is ${sc.pass}">
        <span class="fill ${r.pass ? 'pass' : ''}" style="width:${pctOf(r.total, sc.total)}%"></span>
        <span class="line" style="left:${pctOf(sc.pass, sc.total)}%"></span>
      </div>
      <p class="small dim">The pass line is ${sc.pass}.</p>
      <div class="tiles">
        <div class="tile"><span class="tile-v mono">${r.lk}<span class="small dim"> / ${sc.lk.max}</span></span><span class="small dim">Vocabulary, grammar, reading (need ${sc.lk.min})</span></div>
        <div class="tile"><span class="tile-v mono">${r.li}<span class="small dim"> / ${sc.li.max}</span></span><span class="small dim">Listening (need ${sc.li.min})</span></div>
        <div class="tile"><span class="tile-v mono">${r.ok}<span class="small dim"> / ${r.n}</span></span><span class="small dim">questions right</span></div>
      </div>
      <p class="small">In plain words: the first two parts score up to ${sc.lk.max} together and listening up to ${sc.li.max}. A pass needs ${sc.pass} in total, plus at least ${sc.lk.min} and ${sc.li.min} in those two, so one strong part can't carry a very weak one.${!r.pass && r.total >= sc.pass ? ' You were over the total, so one part was under its minimum.' : ''}</p>
      ${nowDone ? `<p class="panel good-panel strong">${level} is done on your road.${next ? ` Your Road to ${next.level} starts now.` : ''}</p>` : ''}
      ${r.pass && r.format === 'mini' ? `<p class="small">Try the full mock when you have about an hour and a half: passing that one finishes ${level} on your road.</p>` : ''}
      <h3 class="strong">By part</h3>
      <ul class="exam-parts">${partRows}</ul>
      <h3 class="strong">${missed.length ? `Your misses (${missed.length})` : 'No misses at all.'}</h3>
      ${missed.length ? `<p class="small dim">Each of these comes back in your Garden.</p>
        <div class="stack-sm">${missed.map(({ q, i }) => `<div class="panel stack-sm exam-miss">
          <p><span class="tag">${esc(q.label)}</span></p>
          <p class="small strong">${esc(q.ask)}</p>
          ${body(q, { review: true })}
          <p class="small">${answers[i] == null ? 'No answer' : `You picked <span lang="ja">${esc(answers[i])}</span>`}. The answer: <span class="strong good-c" lang="ja">${esc(q.answer)}</span></p>
          <p class="small dim" lang="ja">${esc(q.why || '')}</p>
          ${q.say ? `<button class="btn small-btn" data-act="hear" data-i="${i}">🔊 Hear it</button>` : ''}
        </div>`).join('')}</div>` : ''}
      <div class="row2"><a class="btn primary" href="#/progress">See your progress</a><button class="btn" data-act="leave">Back to Today</button></div>
    </div>`;
  }

  const off = delegate(el, {
    start: (b) => start(b.dataset.v),
    begin: beginSection,
    pick: (b) => answer(flat[qi].q.shown[+b.dataset.i]),
    skip: () => answer(null),
    play: () => player.play(flat[qi].q.say),
    pause: () => { stopClock(); player.stop(); phase = 'paused'; render(); },
    resume: () => { phase = 'question'; startClock(); render(); },
    quit: () => { stopClock(); phase = 'intro'; mock = null; render(); },
    hear: (b) => player.play(flat[+b.dataset.i].q.say),
    leave: () => { if (ctx.done) ctx.done(); else location.hash = '#/'; },
  });

  store.markSession();
  render();
  return () => { off(); stopClock(); player.stop(); speaker.stop(); };
}
