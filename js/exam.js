// Mock JLPT screen (#/exam). Two formats (js/exam-data.js):
// - Full mock: the real N5's parts, question types, order and counts, timed (vocabulary 20 min, grammar and reading
//   40, listening 30), with the instructions in Japanese and an English line under each. No English hints. Listening
//   plays each item once, with the real test's pauses between items, and moves on by itself.
// - Mini mock: a few of each type, untimed, in practice mode: English hints, and listening can be replayed.
// Like the real answer sheet, any question in the current part can be revisited and changed until its time is up, and
// questions can be flagged to come back to. Furigana as in the real test: none in the vocabulary part, and elsewhere
// only over kanji beyond N5. The results show the score against the pass line (an estimate: the real test scales its
// scores), each part with where to practise it, and every miss with its answer and why. Each miss goes to the Garden.
import { store } from './store.js';
import { speaker } from './audio.js';
import { buildMock, scoreMock, mockIds, FORMATS, PARTS, SCORING, MOCK_LEVELS, TYPES, N5_KANJI } from './exam-data.js';
import { pictureSVG, sceneSVG } from './exam-art.js';
import { readingOf } from './furigana.js';
import { readiness, mockLine } from './readiness.js';
import { esc, shuffle, delegate } from './ui.js';
import * as fx from './fx.js';

/** Scales the pauses between listening items (tests shorten them). */
export const TAPE = { scale: 1 };

const fmtTime = (ms) => {
  const s = Math.max(0, Math.ceil(ms / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
};

const KANJI_RUN = /([一-鿿々]+)/;
/** Japanese text with furigana like the real test: only over kanji runs that hold a kanji beyond N5. */
export function furi(text) {
  return String(text).split(KANJI_RUN).map((part, i) => {
    if (i % 2 === 0) return esc(part);
    if ([...part].every((c) => N5_KANJI.has(c))) return esc(part);
    const r = readingOf(part);
    return r ? `<ruby>${esc(part)}<rt>${esc(r)}</rt></ruby>` : esc(part);
  }).join('');
}

/** Plays spoken lines one after another; resolves when done (or when stopped). */
function playLines(lines, isLive) {
  return new Promise((resolve) => {
    const step = (i) => {
      if (!isLive() || i >= lines.length) { resolve(); return; }
      speaker.speak(lines[i].text, { voice: lines[i].voice, mps: 4, onend: () => setTimeout(() => step(i + 1), 450 * TAPE.scale) });
    };
    step(0);
  });
}

export function mount(el, ctx = {}) {
  const level = MOCK_LEVELS[0];
  const quiet = !!ctx.quiet;
  let phase = 'intro';     // intro | section | question | sheet | confirm | paused | result
  let mock = null;
  let flat = [];           // [{ q, sec }] every question in order
  let answers = [];        // option picked per question (null: no answer)
  let flags = new Set();   // question indexes flagged to come back to
  let qi = 0;              // question on screen
  let si = 0;              // current section
  let left = 0;            // ms left in a timed section
  let tick = null;
  let lastTick = 0;
  let timeUp = false;
  let result = null;
  let doneBefore = false;
  let tapeRun = 0;         // the listening tape's run number (a new run cancels the old one)
  let playing = -1;        // index of the listening item playing now
  let practicePlay = 0;    // replay run in practice mode

  const practice = () => mock && mock.practice;
  const secIdx = () => flat.map((f, i) => i).filter((i) => flat[i].sec === si);
  const isTape = () => !!(mock && mock.timed && !quiet && mock.sections[si]?.id === 'listening');

  function start(format) {
    mock = buildMock({ level, format, seen: store.exam.seen });
    flat = [];
    mock.sections.forEach((sec, s) => sec.questions.forEach((q) => {
      const shown = shuffle(q.options);
      // Heard replies are said in the order the answer sheet numbers them.
      const say = q.heard ? [q.lead, ...shown.map((o) => q.replyLine[o])] : q.say;
      flat.push({ q: { ...q, shown, say }, sec: s });
    }));
    answers = flat.map(() => null);
    flags = new Set();
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
    qi = secIdx()[0];
    phase = 'question';
    startClock();
    render();
    if (isTape()) runTape(secIdx()[0]);
    else autoPlay();
  }

  function endSection() {
    stopClock();
    stopTape();
    playing = -1;
    si++;
    if (si >= mock.sections.length) finish();
    else { qi = secIdx()[0]; phase = 'section'; render(); }
  }

  // ----- listening: the tape (full mock) and practice playback (mini) -----
  /** Plays every listening item once, in order, with the real test's pause after each, then ends the part. */
  async function runTape(from) {
    const run = ++tapeRun;
    const live = () => run === tapeRun && phase !== 'paused' && phase !== 'result';
    for (const i of secIdx().filter((x) => x >= from)) {
      if (!live()) return;
      playing = i;
      if (phase === 'question') { qi = i; render(); } else updateSheet();
      await playLines(flat[i].q.say, live);
      if (!live()) return;
      await new Promise((r) => setTimeout(r, (TYPES[flat[i].q.type].pause || 10) * 1000 * TAPE.scale));
    }
    if (!live()) return;
    endSection();
  }
  function stopTape() { tapeRun++; speaker.stop(); }

  /** Practice mode: a listening question plays when it opens (the full mock's tape plays by itself). */
  function autoPlay() {
    const { q } = flat[qi] || {};
    if (!q || q.part !== 'listening' || quiet || isTape()) return;
    const run = ++practicePlay;
    setTimeout(() => { if (run === practicePlay && phase === 'question' && flat[qi].q === q) playLines(q.say, () => run === practicePlay); }, 350);
  }

  // ----- answering and moving around the part -----
  function pick(v) {
    answers[qi] = answers[qi] === v ? null : v;
    const idx = secIdx();
    const pos = idx.indexOf(qi);
    render();
    // Move on to the next question of the part, except while the listening tape sets the pace.
    if (answers[qi] != null && !isTape() && pos < idx.length - 1) {
      const at = qi;
      setTimeout(() => { if (phase === 'question' && qi === at) go(idx[pos + 1]); }, 220);
    }
  }

  function go(i) {
    if (i == null || flat[i]?.sec !== si) return;
    qi = i;
    phase = 'question';
    render();
    autoPlay();
  }

  function finishPart() {
    const idx = secIdx();
    const blank = idx.filter((i) => answers[i] == null).length;
    if ((blank || idx.some((i) => flags.has(i))) && phase !== 'confirm') { phase = 'confirm'; render(); return; }
    endSection();
  }

  function finish() {
    stopClock();
    stopTape();
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
    if (phase === 'sheet' || phase === 'confirm') return renderSheet();
    return renderQuestion();
  }

  function renderIntro() {
    const r = readiness();
    const sc = SCORING[level];
    const full = FORMATS.full;
    const n = (f) => f.sections.reduce((a, s) => a + s.parts.reduce((b, [, c]) => b + c, 0), 0);
    const hist = store.exam.history.filter((h) => h.level === level).slice(-3).reverse();
    el.innerHTML = `<div class="stack exam">
      <h2 class="section-title">Mock JLPT ${level}</h2>
      <p>Practice in the real test's format, with original questions and the app's own voices. It's optional and nothing is locked by it. About once a month is plenty.</p>
      ${r && r.level === level ? `<p class="small ${r.ready ? 'good-c strong' : 'dim'}">${r.ready ? `You look ready: ${Math.round(r.overall * 100)}% of the way on your road to ${level}.`
        : `You're ${Math.round(r.overall * 100)}% of the way to ready. A mock now is fine too: it shows what to practise next.`}</p>` : ''}
      <div class="exam-formats">
        <div class="panel stack-sm">
          <h3 class="strong big">Mini mock <span class="tag">practice mode</span></h3>
          <p class="small">About ${FORMATS.mini.minutes} minutes: ${n(FORMATS.mini)} questions of every type, no clock. English hints are shown, and listening can be replayed.</p>
          <button class="btn primary wide" data-act="start" data-v="mini">Start the mini mock</button>
        </div>
        <div class="panel stack-sm">
          <h3 class="strong big">Full mock</h3>
          <p class="small">Like the real ${level}: ${n(full)} questions, ${full.sections.map((s) => `${s.title.toLowerCase()} ${s.minutes} min`).join(', ')}. Japanese only, and each listening item plays once. Passing it finishes ${level} on your road.</p>
          <button class="btn wide" data-act="start" data-v="full">Start the full mock</button>
        </div>
      </div>
      <details class="panel small"><summary class="strong">How it's scored</summary>
        <p>Like the real ${level}: vocabulary, grammar and reading together score 0 to ${sc.lk.max}, and listening scores 0 to ${sc.li.max}, for ${sc.total} in all. You pass with ${sc.pass} or more, as long as you also get at least ${sc.lk.min} in the first part and ${sc.li.min} in listening.</p>
        <p>Questions are weighted roughly like the real test: a reading question counts about three vocabulary questions, and the longer listening tasks a little more than the quick replies.</p>
        <p class="dim">The real test uses scaled scores (each question's weight depends on how hard it proved for everyone who sat it), so your score here is an estimate.</p>
      </details>
      <ul class="small dim">
        <li>Furigana as in the real test: none in the vocabulary part, and elsewhere only over kanji beyond ${level}.</li>
        <li>Within a part you can go back, change answers and flag questions until its time is up.</li>
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
    const listening = sec.id === 'listening';
    el.innerHTML = `<div class="stack exam">
      <p class="small dim">${esc(FORMATS[mock.format].title)} ${level} · part ${si + 1} of ${mock.sections.length}</p>
      ${timeUp ? '<p class="note-c small" role="status">Time\'s up for that part. In the real test you\'d move on now, so this one does too.</p>' : ''}
      <h2 class="section-title"><span lang="ja" data-noruby>${esc(sec.ja)}</span></h2>
      <p class="strong">${esc(sec.title)}</p>
      <p>${n} questions${sec.minutes ? `, ${sec.minutes} minutes` : ''}.${listening ? (quiet ? ' Quiet mode: you read each line instead of hearing it.'
        : mock.timed ? ' Each item plays once, then there\'s a short pause to answer, and the next one starts by itself. You can go back and change answers while it plays.'
          : ' Each one plays when it opens; you can replay it.') : ' You can go back and change answers until the part ends.'}</p>
      <button class="btn primary wide" data-act="begin">Start ${esc(sec.title.toLowerCase())}</button>
    </div>`;
    el.querySelector('[data-act=begin]')?.focus();
  }

  function renderPaused() {
    el.innerHTML = `<div class="stack exam">
      <h2 class="section-title">Paused</h2>
      <p>The clock is stopped at ${fmtTime(left)}. The question is hidden until you come back.${isTape() ? ' The listening item that was playing starts again from the beginning.' : ''}</p>
      <button class="btn primary wide" data-act="resume">Resume</button>
      <button class="btn ghost wide" data-act="quit">Stop the mock (nothing is saved)</button>
    </div>`;
    el.querySelector('[data-act=resume]')?.focus();
  }

  /** A Japanese text block: no furigana in the vocabulary part, otherwise furigana only beyond N5. */
  const jp = (q, s) => (q.part === 'vocab' ? esc(s) : furi(s));

  function docHTML(q) {
    const d = q.doc;
    if (q.type === 'info') {
      return `<div class="panel exam-doc exam-info exam-${esc(d.kind)}" lang="ja">
        <p class="exam-doc-title">${furi(d.title)}</p>
        ${d.lead ? `<p>${furi(d.lead)}</p>` : ''}
        ${d.table ? `<div class="exam-table-wrap"><table class="exam-table"><thead><tr>${d.table.head.map((h) => `<th>${furi(h)}</th>`).join('')}</tr></thead>
          <tbody>${d.table.rows.map((r) => `<tr>${r.map((c) => `<td>${furi(c)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>` : ''}
        ${(d.notes || []).map((l) => `<p>${furi(l)}</p>`).join('')}
      </div>`;
    }
    return `<div class="panel exam-doc exam-${esc(q.type)}" lang="ja">${d.title ? `<p class="exam-doc-title">${furi(d.title)}</p>` : ''}
      <p class="exam-text">${furi(d.text)}</p></div>`;
  }

  function essayHTML(q) {
    const e = q.essay;
    const text = furi(e.text).replace(/\{(\d)\}/g, (_, n) => `<span class="exam-blank ${+n === q.blank ? 'on' : ''}">${n}</span>`);
    return `<div class="panel exam-doc exam-essay" lang="ja"><p class="exam-doc-title">${furi(e.title)}</p>
      ${e.author ? `<p class="small right-text">${furi(e.author)}</p>` : ''}<p class="exam-text">${text}</p></div>
      <p class="small strong">Blank <span class="exam-blank on">${q.blank}</span></p>`;
  }

  /** The part of a question above its options. */
  function body(q, { review = false } = {}) {
    const hints = practice() || review;
    if (q.sentence) {
      const s = q.sentence;
      return `<p class="exam-jp" lang="ja">${esc(s.before)}<u class="exam-mark">${esc(s.mark)}</u>${esc(s.after)}</p>`;
    }
    if (q.blanked) return `<p class="exam-jp" lang="ja">${jp(q, q.blanked)}</p>${q.en && hints ? `<p class="small dim">"${esc(q.en)}"</p>` : ''}`;
    if (q.frame) {
      const f = q.frame;
      const slots = Array.from({ length: f.slots }, (_, i) => `<span class="exam-slot ${i === f.star ? 'star' : ''}">${i === f.star ? '★' : ''}</span>`).join('');
      return `<p class="exam-jp exam-frame" lang="ja">${f.before ? furi(f.before) : ''}${slots}${f.after ? furi(f.after) : ''}</p>
        ${hints ? `<p class="small dim">"${esc(q.en)}"</p>` : ''}`;
    }
    if (q.essay) return review ? `<details class="small"><summary class="strong">The text</summary>${essayHTML(q)}</details>` : essayHTML(q);
    if (q.doc) {
      const d = docHTML(q);
      return `${review ? `<details class="small"><summary class="strong">The text</summary>${d}</details>` : d}<p class="exam-ask" lang="ja">${furi(q.ask)}</p>`;
    }
    if (q.part === 'listening') {
      const pic = q.scene ? sceneSVG(q.scene, { label: 'The situation' }) : '';
      if (quiet || review) {
        return `${pic}<div class="panel exam-passage stack-sm" lang="ja">${q.transcript.map((l, i) => `<p>${q.heard && i > 0 ? `<span class="small dim">${i}.</span> ` : ''}${furi(l.text)}</p>`).join('')}</div>`;
      }
      const status = `<span class="small accent-c exam-status" id="ex-status" aria-live="polite">${playing === qi ? 'Playing…' : ''}</span>`;
      return `${pic}${practice() ? `<p class="small dim" lang="ja">${furi(q.ask)}</p>` : ''}
        <div class="row-gap">${practice() ? '<button class="btn" data-act="play">🔊 Play again</button>' : '<span class="small dim">Each item plays once.</span>'}${status}</div>`;
    }
    return '';
  }

  function optionsHTML(q) {
    const picked = answers[qi];
    const btn = (o, i, inner) => `<button class="btn exam-opt ${picked === o ? 'on' : ''}" data-act="pick" data-i="${i}" aria-pressed="${picked === o}"${q.ja ? ' lang="ja"' : ''}>${inner}</button>`;
    if (q.pictures) {
      return `<div class="exam-opts exam-pics">${q.shown.map((o, i) => btn(o, i, `<span class="exam-num">${i + 1}</span>${pictureSVG(o, { label: `Picture ${i + 1}` })}`)).join('')}</div>`;
    }
    if (q.heard) {
      const showText = practice() || quiet;
      return `<div class="exam-opts exam-heard">${q.shown.map((o, i) => btn(o, i, `<span class="exam-num">${i + 1}</span>${showText ? ` <span class="small">${furi(o)}</span>` : ''}`)).join('')}</div>`;
    }
    return `<div class="choice-grid exam-opts">${q.shown.map((o, i) => btn(o, i, `<span class="exam-num">${i + 1}</span> ${q.part === 'vocab' ? esc(o) : furi(o)}`)).join('')}</div>`;
  }

  function sheetGrid() {
    return `<div class="exam-sheet" role="list" aria-label="Answer sheet">${secIdx().map((i, k) => {
      const cls = [answers[i] != null ? 'done' : '', flags.has(i) ? 'flag' : '', i === qi ? 'cur' : '', i === playing ? 'live' : ''].join(' ');
      return `<span role="listitem"><button class="exam-cell ${cls}" data-act="goto" data-i="${i}" aria-label="Question ${k + 1}${answers[i] != null ? ', answered' : ', not answered'}${flags.has(i) ? ', flagged' : ''}">${k + 1}${flags.has(i) ? '<span class="exam-flag" aria-hidden="true">⚑</span>' : ''}</button></span>`;
    }).join('')}</div>`;
  }

  function header() {
    const sec = mock.sections[si];
    const idx = secIdx();
    return `<div class="row-between">
        <span class="small dim">${esc(sec.title)} · ${idx.indexOf(qi) + 1} of ${idx.length}</span>
        ${mock.timed ? `<span class="row-gap"><span class="mono strong" id="ex-clock" aria-label="Time left">${fmtTime(left)}</span>
          <button class="btn ghost small-btn" data-act="pause">Pause</button></span>` : ''}
      </div>`;
  }

  function renderQuestion() {
    const { q } = flat[qi];
    const sec = mock.sections[si];
    const idx = secIdx();
    const pos = idx.indexOf(qi);
    const t = TYPES[q.type];
    const prevSame = pos > 0 && flat[idx[pos - 1]].q.type === q.type;
    const answered = idx.filter((i) => answers[i] != null).length;
    el.innerHTML = `<div class="stack exam" data-noruby data-qid="${esc(q.qid || q.id)}" data-type="${q.type}">
      ${header()}
      <div class="bar" role="img" aria-label="${answered} of ${idx.length} answered"><span style="width:${(answered / idx.length) * 100}%"></span></div>
      <div class="exam-mondai ${prevSame ? 'compact' : ''}">
        <p class="strong" lang="ja">${esc(t.mondai)}</p>
        <p lang="ja" class="exam-inst">${esc(t.ja)}</p>
        <p class="small dim">${esc(t.en)}</p>
      </div>
      ${body(q)}
      ${optionsHTML(q)}
      <div class="exam-nav">
        <button class="btn small-btn" data-act="prev" ${pos === 0 ? 'disabled' : ''}>‹ Back</button>
        <button class="btn small-btn ${flags.has(qi) ? 'on' : ''}" data-act="flag" aria-pressed="${flags.has(qi)}">⚑ ${flags.has(qi) ? 'Flagged' : 'Flag'}</button>
        <button class="btn small-btn" data-act="sheet">Answer sheet</button>
        ${pos < idx.length - 1 ? '<button class="btn small-btn" data-act="next">Next ›</button>'
          : (isTape() ? '' : `<button class="btn small-btn primary" data-act="finishpart">Finish this part</button>`)}
      </div>
    </div>`;
  }

  function renderSheet() {
    const sec = mock.sections[si];
    const idx = secIdx();
    const blank = idx.filter((i) => answers[i] == null).length;
    const flagged = idx.filter((i) => flags.has(i)).length;
    el.innerHTML = `<div class="stack exam" data-noruby>
      ${header()}
      <h2 class="section-title">Answer sheet: ${esc(sec.title)}</h2>
      <p class="small dim">Tap a number to go back to it. Answered ones are filled; ⚑ marks the ones you flagged.${isTape() ? ' The listening keeps playing; the item playing now is outlined.' : ''}</p>
      ${sheetGrid()}
      ${phase === 'confirm' ? `<div class="panel note stack-sm" role="alert">
          <p class="strong">${blank ? `${blank} unanswered` : ''}${blank && flagged ? ' and ' : ''}${flagged ? `${flagged} flagged` : ''}. Finish ${esc(sec.title.toLowerCase())} anyway?</p>
          <div class="row2"><button class="btn" data-act="back">Keep working</button><button class="btn primary" data-act="finishpart">Finish this part</button></div>
        </div>` : `<div class="row2"><button class="btn" data-act="back">Back to the question</button>${isTape() ? '' : '<button class="btn primary" data-act="finishpart">Finish this part</button>'}</div>`}
    </div>`;
  }

  function updateSheet() { if (phase === 'sheet') renderSheet(); }

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
    const label = (q) => `${TYPES[q.type].mondai} · ${PARTS[q.part].title}`;
    const shown = (q, v) => (q.pictures ? pictureSVG(v, { cls: 'inline', label: v }) : furi(v));
    el.innerHTML = `<div class="stack exam exam-result" data-noruby>
      <p class="small dim">${esc(FORMATS[r.format].title)} ${level}</p>
      <h2 class="section-title">${r.pass ? 'Pass!' : 'Not yet, and that\'s useful to know.'}</h2>
      <p><span class="score-huge mono">${r.total}</span><span class="dim"> / ${sc.total}</span> <span class="small dim">(estimate)</span></p>
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
      <p class="small dim">An estimate: questions here are weighted roughly like the real test, but the real ${level} uses scaled scores worked out from everyone who sits it.</p>
      ${nowDone ? `<p class="panel good-panel strong">${level} is done on your road.${next ? ` Your Road to ${next.level} starts now.` : ''}</p>` : ''}
      ${r.pass && r.format === 'mini' ? `<p class="small">Try the full mock when you have about an hour and a half: passing that one finishes ${level} on your road.</p>` : ''}
      <h3 class="strong">By part</h3>
      <ul class="exam-parts">${partRows}</ul>
      <h3 class="strong">${missed.length ? `Your misses (${missed.length})` : 'No misses at all.'}</h3>
      ${missed.length ? `<p class="small dim">Each of these comes back in your Garden.</p>
        <div class="stack-sm">${missed.map(({ q, i }) => `<div class="panel stack-sm exam-miss">
          <p><span class="tag" lang="ja">${esc(label(q))}</span></p>
          ${body(q, { review: true })}
          <p class="small">${answers[i] == null ? 'No answer' : `You picked <span lang="ja">${shown(q, answers[i])}</span>`}. The answer: <span class="strong good-c" lang="ja">${shown(q, q.answer)}</span></p>
          <p class="small dim">${esc(q.why || '')}</p>
          ${q.say ? `<button class="btn small-btn" data-act="hear" data-i="${i}">🔊 Hear it</button>` : ''}
        </div>`).join('')}</div>` : ''}
      <div class="row2"><a class="btn primary" href="#/progress">See your progress</a><button class="btn" data-act="leave">Back to Today</button></div>
    </div>`;
  }

  const off = delegate(el, {
    start: (b) => start(b.dataset.v),
    begin: beginSection,
    pick: (b) => pick(flat[qi].q.shown[+b.dataset.i]),
    prev: () => { const idx = secIdx(); go(idx[idx.indexOf(qi) - 1]); },
    next: () => { const idx = secIdx(); go(idx[idx.indexOf(qi) + 1]); },
    flag: () => { if (flags.has(qi)) flags.delete(qi); else flags.add(qi); render(); },
    sheet: () => { phase = 'sheet'; render(); },
    back: () => { phase = 'question'; render(); },
    goto: (b) => go(+b.dataset.i),
    finishpart: finishPart,
    play: () => { const run = ++practicePlay; speaker.stop(); playLines(flat[qi].q.say, () => run === practicePlay); },
    pause: () => { stopClock(); stopTape(); phase = 'paused'; render(); },
    resume: () => {
      phase = 'question';
      startClock();
      if (isTape()) { qi = playing >= 0 ? playing : qi; render(); runTape(qi); } else render();
    },
    quit: () => { stopClock(); stopTape(); phase = 'intro'; mock = null; render(); },
    hear: (b) => { const run = ++practicePlay; speaker.stop(); playLines(flat[+b.dataset.i].q.say, () => run === practicePlay); },
    leave: () => { if (ctx.done) ctx.done(); else location.hash = '#/'; },
  });

  const onKey = (e) => {
    if (phase !== 'question' || e.target.closest?.('input, textarea, select')) return;
    const q = flat[qi]?.q;
    if (q && /^[1-4]$/.test(e.key) && q.shown[+e.key - 1] !== undefined) { e.preventDefault(); pick(q.shown[+e.key - 1]); }
  };
  window.addEventListener('keydown', onKey);

  store.markSession();
  render();
  return () => { off(); window.removeEventListener('keydown', onKey); stopClock(); stopTape(); practicePlay++; speaker.stop(); };
}
