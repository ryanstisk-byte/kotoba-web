// Kana Brush: hear a kana and draw it from memory with a finger or the mouse. The drawing is checked generously
// (stroke count, rough order, shape; js/brush-check.js) against KanjiVG's strokes. A miss draws the right strokes in
// order and lets you try again; nothing is lost. Only kana met in the Reading Dojo come up, and each one's drawing card
// is reviewed on the Dojo's schedule (store.recordBrush). A guide outline shows at first and fades as a kana gets
// stronger.
import { store } from '../store.js';
import { speaker } from '../audio.js';
import { STROKES } from '../kana-strokes.js';
import { BRUSH_KANA, BRUSH_BY_KANA } from '../brush-data.js';
import { checkDrawing } from '../brush-check.js';
import { esc, shuffle, delegate } from '../ui.js';
import * as fx from '../fx.js';

const ROUND = 8;
/** New kana (never drawn) per round at most, so a round is mostly review. */
const NEW_PER_ROUND = 3;
/** Model strokes per kana, as SVG paths. */
const PATHS = Object.fromEntries(Object.entries(STROKES).map(([k, v]) => [k, v.map((s) => s[0])]));
const OTHERS = Object.fromEntries(BRUSH_KANA.map((x) => [x.k, PATHS[x.k]]));
const SVG_NS = 'http://www.w3.org/2000/svg';

/**
 * How strongly the guide outline shows for a kana (1 full … 0 none), from its drawing card: full until it has been
 * drawn right once, then fainter as its memory grows; a kana that needs help gets the full guide back.
 */
export function guideLevel(card) {
  if (!card || !card.r || card.help) return 1;
  if (card.s < 1) return 0.6;
  if (card.s < 4) return 0.3;
  return 0;
}
const GUIDE_WORD = (g) => (g >= 1 ? 'Guide on' : g > 0.4 ? 'Guide fading' : g > 0 ? 'Faint guide' : 'From memory');

/** Kana met in the Reading Dojo (they have a reading item) that Kana Brush can ask for, in lesson order. */
export function brushPool() {
  return BRUSH_KANA.filter((x) => store.item('kana:' + x.k));
}

/** A round: due drawings first, then a few never drawn, then the weakest drawn ones, then more new ones if still short. */
export function pickRound(n = ROUND) {
  const pool = brushPool();
  const inPool = new Set(pool.map((x) => x.k));
  const due = store.brushDue().filter((k) => inPool.has(k));
  const fresh = pool.filter((x) => !store.brushCard(x.k)).slice(0, NEW_PER_ROUND).map((x) => x.k);
  const picked = [...new Set([...due.slice(0, n), ...fresh])].slice(0, n);
  if (picked.length < n) {
    const rest = pool.map((x) => x.k).filter((k) => !picked.includes(k) && store.brushCard(k))
      .sort((a, b) => (store.brushCard(a).s || 0) - (store.brushCard(b).s || 0));
    picked.push(...rest.slice(0, n - picked.length));
  }
  if (picked.length < n) picked.push(...pool.map((x) => x.k).filter((k) => !picked.includes(k)).slice(0, n - picked.length));
  return shuffle(picked);
}

export function mount(el, ctx) {
  let screen = 'intro';   // intro | draw | result
  let round = [];
  let i = 0;
  let results = [];       // { k, ok }
  let cur = null;         // { k, info, guide, attempt, firstOk, state: 'draw' | 'missed' | 'passed', showRomaji }
  let pad = null;         // the drawing surface for the current question
  const timers = [];

  const say = (k) => speaker.speak(k, { mps: 3 });
  const later = (fn, ms) => timers.push(setTimeout(fn, ms));

  function render() {
    pad?.destroy();
    pad = null;
    if (screen === 'draw') return renderDraw();
    if (screen === 'result') return renderResult();
    renderIntro();
  }

  // ---------- intro ----------
  function renderIntro() {
    const pool = brushPool();
    const due = store.brushDue().filter((k) => BRUSH_BY_KANA[k] && store.item('kana:' + k)).length;
    const fresh = pool.filter((x) => !store.brushCard(x.k)).length;
    if (!pool.length) {
      el.innerHTML = `<div class="stack center-text practice">
          <div class="hero-jp accent-c" lang="ja" data-noruby>書</div>
          <p class="lead strong">Hear a kana, then draw it from memory.</p>
          <p class="dim">Kana Brush uses the kana you've met in the Reading Dojo. Do the first Dojo lesson (the vowels) and they'll be ready to draw here.</p>
          <a class="btn primary wide" href="#/play/dojo">🔤 Go to the Reading Dojo</a>
        </div>`;
      return;
    }
    el.innerHTML = `<div class="stack practice">
        <div class="hero-jp accent-c center-text" lang="ja" data-noruby>書</div>
        <p class="lead strong">Hear a kana, then draw it from memory with your finger or the mouse.</p>
        <p class="dim">A guide outline helps at first and fades as each kana gets stronger. A miss shows the strokes in order, then you try again: nothing is lost. Drawn kana come back for review like the rest of the Dojo.</p>
        <div class="tiles">
          <div class="tile"><span class="tile-v mono">${pool.length}</span><span class="small dim">kana you've met</span></div>
          <div class="tile"><span class="tile-v mono">${due}</span><span class="small dim">due to draw</span></div>
          <div class="tile"><span class="tile-v mono">${fresh}</span><span class="small dim">not drawn yet</span></div>
        </div>
        <button class="btn primary wide" data-act="start">✍ Start a round of ${Math.min(ROUND, pool.length)}</button>
        <section class="stack-sm" aria-label="Your kana">
          <h2 class="section-label">YOUR KANA</h2>
          <p class="small dim">Darker means stronger by hand. Tap one to hear it.</p>
          <div class="brush-chart" data-noruby>${pool.map((x) => {
            const g = guideLevel(store.brushCard(x.k));
            return `<button class="brush-cell g${Math.round((1 - g) * 3)}" data-act="hear" data-k="${esc(x.k)}" aria-label="${esc(x.k)} ${esc(x.r)}: ${esc(GUIDE_WORD(g).toLowerCase())}"><span lang="ja">${esc(x.k)}</span></button>`;
          }).join('')}</div>
        </section>
      </div>`;
  }

  // ---------- drawing ----------
  function start() {
    round = pickRound(ctx.today && ctx.n ? ctx.n : ROUND);
    i = 0;
    results = [];
    if (!round.length) { screen = 'intro'; render(); if (ctx.today) ctx.today.done('No kana to draw yet.'); return; }
    ask();
  }

  function ask() {
    const k = round[i];
    const info = BRUSH_BY_KANA[k];
    const guide = guideLevel(store.brushCard(k));
    cur = { k, info, guide, attempt: 1, firstOk: null, state: 'draw', showRomaji: false };
    screen = 'draw';
    render();
    if (ctx.today) ctx.today.report(`${i + 1}/${round.length}`);
    later(() => say(k), 200);
  }

  function renderDraw() {
    const { info, guide } = cur;
    const script = info.track === 'katakana' ? 'Katakana' : 'Hiragana';
    const showMnemonic = guide >= 0.6;
    el.innerHTML = `
      <div class="stack practice brush" data-noruby data-k="${esc(cur.k)}">
        <div class="row-between"><span class="small dim"><span class="tag">${script}</span> <span class="brush-guide-word">${esc(GUIDE_WORD(cur.attempt > 1 ? 1 : guide))}</span></span>
          <span class="small dim mono">${i + 1} / ${round.length}</span></div>
        <div class="bar"><span style="width:${(i / round.length) * 100}%"></span></div>
        <div class="brush-ask">
          <button class="btn brush-listen" data-act="hear-cur">🔊 Play again</button>
          <p class="small dim brush-romaji">${cur.showRomaji ? `Sound: <span class="mono strong">${esc(info.r)}</span>` : '<button class="linkbtn" data-act="romaji">Can\'t play sound? Show it in letters</button>'}</p>
        </div>
        <p class="small dim">Draw the ${script.toLowerCase()} for this sound.</p>
        ${showMnemonic ? `<p class="small panel note brush-hint">💡 ${esc(info.m)}</p>` : ''}
        <div class="brush-pad"></div>
        <div class="brush-feedback" aria-live="polite"></div>
        <div class="row3 brush-tools">
          <button class="btn" data-act="undo">↩ Undo</button>
          <button class="btn" data-act="clear">✕ Clear</button>
          <button class="btn primary" data-act="check">✓ Check</button>
        </div>
        <button class="linkbtn brush-giveup" data-act="giveup">🙈 I don't remember: show me</button>
      </div>`;
    pad = makePad(el.querySelector('.brush-pad'), cur.k, cur.attempt > 1 ? 1 : guide);
  }

  function setFeedback(html, toolsHTML) {
    el.querySelector('.brush-feedback').innerHTML = html;
    const tools = el.querySelector('.brush-tools');
    const give = el.querySelector('.brush-giveup');
    if (toolsHTML != null) { tools.innerHTML = toolsHTML; tools.className = toolsHTML ? 'row2 brush-tools' : 'brush-tools'; }
    if (give) give.hidden = cur.state !== 'draw';
    const hint = el.querySelector('.brush-hint');
    if (hint) hint.hidden = cur.state !== 'draw';   // the answer below repeats it
  }

  /** The answer: the kana itself, its sound, a button to hear it and the writing mnemonic. */
  const answerHTML = () => `<p class="brush-answer"><span class="brush-answer-k" lang="ja">${esc(cur.k)}</span>
      <span class="mono strong">${esc(cur.info.r)}</span> · ${STROKES[cur.k].length} stroke${STROKES[cur.k].length === 1 ? '' : 's'}</p>
    <p class="small">💡 ${esc(cur.info.m)}</p>`;

  function check() {
    if (cur.state !== 'draw') return;
    const strokes = pad.strokes();
    if (!strokes.length) { setFeedback('<p class="small dim">Draw it in the box first, then tap Check.</p>'); return; }
    const r = checkDrawing(strokes, PATHS[cur.k], { others: OTHERS, self: cur.k });
    const ok = r.verdict !== 'miss';
    settle(ok);
    if (ok) {
      cur.state = 'passed';
      const note = {
        ok: cur.attempt > 1 ? 'Now you have it. Next time it\'s from memory.' : 'Great, that\'s it.',
        order: 'Right shape! The strokes usually go in this order:',
        joined: `Right! You joined strokes ${r.at} and ${r.at + 1}. Fine in handwriting; in print they're separate.`,
        split: 'Right! In print, two of those are one stroke.',
      }[r.why];
      setFeedback(`<div class="panel good-panel stack-sm"><p class="strong good-c">✓ ${esc(note)}</p>${answerHTML()}</div>`,
        `<button class="btn" data-act="hear-cur">🔊 Hear it</button><button class="btn primary" data-act="next">Next ▶</button>`);
      pad.lock();
      if (r.why === 'order') pad.reveal({ fade: false });
      fx.hit();
      fx.announce(`Right. ${cur.k}, ${cur.info.r}.`);
      say(cur.k);
      return;
    }
    cur.state = 'missed';
    const n = STROKES[cur.k].length;
    const why = {
      empty: 'Draw it in the box first.',
      count: `Not quite: this one has ${n} stroke${n === 1 ? '' : 's'}, and you drew ${r.drawn}. Watch how it goes:`,
      shape: `Close, but stroke ${r.stroke} is off. Watch how it goes:`,
      like: `That looks like ${r.like} (${BRUSH_BY_KANA[r.like]?.r || ''}). This sound is written like this:`,
    }[r.why];
    missed(why);
  }

  function missed(text) {
    setFeedback(`<div class="panel note stack-sm"><p class="strong miss-c">${esc(text)}</p>${answerHTML()}</div>`,
      `<button class="btn" data-act="replay-strokes">↻ Show again</button><button class="btn primary" data-act="retry">✍ Try again</button>`);
    pad.lock();
    pad.reveal({ fade: true });
    fx.miss();
    fx.announce(`Not quite. It's ${cur.k}, ${cur.info.r}. Watch the strokes, then try again.`);
    say(cur.k);
  }

  function giveUp() {
    if (cur.state !== 'draw') return;
    settle(false);
    cur.state = 'missed';
    missed("No problem. Here's how it goes:");
  }

  /** Grades the first try only; tries after a miss are practice. */
  function settle(ok) {
    if (cur.firstOk !== null) return;
    cur.firstOk = ok;
    results.push({ k: cur.k, ok });
    store.recordBrush(cur.k, ok);
    store.grade({ skill: 'kana', id: 'draw:kana:' + cur.k, ok });
  }

  function retry() {
    cur.attempt += 1;
    cur.state = 'draw';
    renderDraw();
  }

  function next() {
    i += 1;
    if (i >= round.length) return finish();
    ask();
  }

  function finish() {
    store.markStudied();
    screen = 'result';
    render();
    fx.hit({ big: true, el: el.querySelector('.score-huge') });
    if (ctx.today) ctx.today.done();
  }

  function renderResult() {
    const right = results.filter((r) => r.ok).length;
    const missedK = results.filter((r) => !r.ok).map((r) => BRUSH_BY_KANA[r.k]);
    el.innerHTML = `
      <div class="stack center-text practice">
        <div class="score-huge accent-c mono">${right}/${results.length}</div>
        <p class="lead strong">${right === results.length ? 'Every one drawn on the first try.' : `${right} of ${results.length} drawn on the first try.`}</p>
        <p class="dim">${missedK.length ? 'The ones you missed come back soon, with the guide on. The rest come back later, with less guide each time.' : 'They come back later, with less guide each time.'}</p>
        ${missedK.length ? `<div class="panel left-text"><p class="section-label">PRACTICE THESE</p><div class="chips">${missedK.map((x) => `<button class="chip" data-act="hear" data-k="${esc(x.k)}"><span lang="ja" data-noruby>${esc(x.k)}</span> <span class="mono small">${esc(x.r)}</span></button>`).join('')}</div></div>` : ''}
        ${ctx.today ? '' : `<button class="btn primary wide" data-act="start">✍ Another round</button>
          <a class="btn ghost wide" href="#/play/dojo">🔤 Reading Dojo</a>`}
      </div>`;
  }

  const off = delegate(el, {
    start,
    hear: (b) => say(b.dataset.k),
    'hear-cur': () => cur && say(cur.k),
    romaji: () => { cur.showRomaji = true; el.querySelector('.brush-romaji').innerHTML = `Sound: <span class="mono strong">${esc(cur.info.r)}</span>`; },
    undo: () => pad?.undo(),
    clear: () => pad?.clear(),
    check,
    giveup: giveUp,
    retry,
    'replay-strokes': () => pad?.reveal({ fade: true }),
    next,
  });

  const onKey = (e) => {
    if (screen !== 'draw' || !cur || e.target.closest?.('input, textarea, select')) return;
    if (e.key === 'Enter') {
      if (e.target.closest?.('button, a')) return;   // let a focused button do its own thing
      e.preventDefault();
      if (cur.state === 'draw') check(); else if (cur.state === 'passed') next(); else retry();
    } else if ((e.key === 'z' && (e.ctrlKey || e.metaKey)) || e.key === 'Backspace') {
      if (cur.state === 'draw') { e.preventDefault(); pad?.undo(); }
    }
  };
  window.addEventListener('keydown', onKey);

  if (ctx.today) start(); else render();

  return () => {
    off();
    window.removeEventListener('keydown', onKey);
    timers.forEach(clearTimeout);
    pad?.destroy();
    speaker.stop();
  };
}

/**
 * A square drawing pad over a 109x109 practice grid (KanjiVG's box): a canvas for the learner's strokes, an SVG
 * under it for the guide outline and over it for the model strokes when they're shown. Touch never scrolls the page.
 * Returns { strokes(), undo(), clear(), lock(), reveal({ fade }), destroy() }.
 */
function makePad(host, kana, guide) {
  const model = STROKES[kana];
  host.innerHTML = `
    <svg class="brush-under" viewBox="0 0 109 109" aria-hidden="true">
      <path class="brush-grid" d="M54.5 0V109M0 54.5H109"/>
      ${guide > 0 ? `<g class="brush-guide" style="opacity:${(0.28 * guide).toFixed(2)}">${model.map((s) => `<path d="${s[0]}"/>`).join('')}</g>` : ''}
    </svg>
    <canvas class="brush-canvas" role="img" aria-label="Drawing area. Draw the kana here with your finger or the mouse."></canvas>
    <svg class="brush-over" viewBox="0 0 109 109" aria-hidden="true"></svg>`;
  const canvas = host.querySelector('canvas');
  const over = host.querySelector('.brush-over');
  const g = canvas.getContext('2d');
  const strokes = [];
  let live = null;
  let locked = false;
  let size = 0;

  function fit() {
    const r = canvas.getBoundingClientRect();
    if (!r.width) return;
    const dpr = Math.min(3, window.devicePixelRatio || 1);
    size = r.width;
    canvas.width = Math.round(r.width * dpr);
    canvas.height = Math.round(r.height * dpr);
    g.setTransform((dpr * r.width) / 109, 0, 0, (dpr * r.height) / 109, 0, 0);
    redraw();
  }

  function ink() { return getComputedStyle(host).getPropertyValue('--brush-ink').trim() || getComputedStyle(host).color; }

  function drawStroke(s) {
    g.beginPath();
    g.moveTo(s[0][0], s[0][1]);
    if (s.length === 1) g.lineTo(s[0][0] + 0.01, s[0][1]);
    for (let j = 1; j < s.length - 1; j++) {
      const mx = (s[j][0] + s[j + 1][0]) / 2, my = (s[j][1] + s[j + 1][1]) / 2;
      g.quadraticCurveTo(s[j][0], s[j][1], mx, my);
    }
    if (s.length > 1) g.lineTo(s[s.length - 1][0], s[s.length - 1][1]);
    g.stroke();
  }

  function redraw() {
    g.clearRect(0, 0, 109, 109);
    g.lineCap = 'round';
    g.lineJoin = 'round';
    g.lineWidth = 5.5;
    g.strokeStyle = ink();
    for (const s of strokes) drawStroke(s);
    if (live) drawStroke(live.pts);
  }

  const pos = (e) => {
    const r = canvas.getBoundingClientRect();
    return [((e.clientX - r.left) / r.width) * 109, ((e.clientY - r.top) / r.height) * 109];
  };

  function down(e) {
    if (locked || (e.pointerType === 'mouse' && e.button !== 0)) return;
    if (live) return;   // one finger at a time
    e.preventDefault();
    canvas.setPointerCapture?.(e.pointerId);
    live = { id: e.pointerId, pts: [pos(e)] };
    redraw();
  }
  function move(e) {
    if (!live || e.pointerId !== live.id) return;
    e.preventDefault();
    const evs = e.getCoalescedEvents ? e.getCoalescedEvents() : [e];
    for (const ev of (evs.length ? evs : [e])) {
      const p = pos(ev);
      const last = live.pts[live.pts.length - 1];
      if (Math.hypot(p[0] - last[0], p[1] - last[1]) >= 0.6) live.pts.push(p);
    }
    redraw();
  }
  function up(e) {
    if (!live || e.pointerId !== live.id) return;
    strokes.push(live.pts);
    live = null;
    redraw();
  }
  // Safari scrolls on touchmove unless it's cancelled, even with touch-action: none on older versions.
  const noScroll = (e) => { if (e.target === canvas) e.preventDefault(); };

  canvas.addEventListener('pointerdown', down);
  canvas.addEventListener('pointermove', move);
  canvas.addEventListener('pointerup', up);
  canvas.addEventListener('pointercancel', up);
  canvas.addEventListener('touchstart', noScroll, { passive: false });
  canvas.addEventListener('touchmove', noScroll, { passive: false });
  const ro = typeof ResizeObserver === 'function' ? new ResizeObserver(() => { if (canvas.getBoundingClientRect().width !== size) fit(); }) : null;
  ro?.observe(canvas);
  fit();

  return {
    strokes: () => strokes.map((s) => s.slice()),
    undo() { if (!locked) { strokes.pop(); redraw(); } },
    clear() { if (!locked) { strokes.length = 0; redraw(); } },
    lock() { locked = true; live = null; host.classList.add('locked'); },
    /** Draws the model strokes one by one with their numbers; `fade` dims the learner's drawing underneath. */
    reveal({ fade = true } = {}) {
      host.classList.toggle('faded', fade);
      over.innerHTML = '';
      const still = fx.reducedMotion();
      model.forEach(([d, x, y], j) => {
        const p = document.createElementNS(SVG_NS, 'path');
        p.setAttribute('d', d);
        p.setAttribute('pathLength', '1');
        p.setAttribute('class', 'brush-model' + (still ? '' : ' anim'));
        p.style.animationDelay = `${j * 0.7}s`;
        over.appendChild(p);
        const t = document.createElementNS(SVG_NS, 'text');
        t.setAttribute('x', String(x));
        t.setAttribute('y', String(y));
        t.setAttribute('class', 'brush-num' + (still ? '' : ' anim'));
        t.style.animationDelay = `${j * 0.7}s`;
        t.textContent = String(j + 1);
        over.appendChild(t);
      });
    },
    destroy() {
      ro?.disconnect();
      canvas.removeEventListener('touchstart', noScroll);
      canvas.removeEventListener('touchmove', noScroll);
    },
  };
}
