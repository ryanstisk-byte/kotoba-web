// Katakana Rush: read a loanword in katakana (コーヒー, テレビ…) and pick what it means before the bar runs out.
// Kind to beginners: romaji training wheels until the katakana lessons are done, a timer that only reveals the answer
// (never ends the round), and a pace that adapts to keep you around 85% right.
import { store } from '../store.js';
import { speaker } from '../audio.js';
import { KATA_WORDS } from '../practice-data.js';
import { romaji } from '../romaji.js';
import { esc, shuffle, delegate } from '../ui.js';
import { choiceButtons } from '../practice-ui.js';
import * as fx from '../fx.js';

const ROUND = 12;
const MIN_T = 6;
const MAX_T = 15;

export function mount(el, ctx) {
  let wheels = !store.trackDone('katakana');
  let limit = 10;             // seconds per word, adapts
  let recent = [];
  let qs = [];
  let i = 0;
  let picked = -1;            // -1 unanswered, -2 timed out
  let hinted = false;
  let score = 0;
  let combo = 0;
  let right = 0;
  let answered = 0;
  let retried = new Set();
  let missed = [];
  let screen = 'intro';
  let started = 0;
  let left = 1;
  let timer = 0;

  function makeQ(w) {
    const others = shuffle(KATA_WORDS.filter((o) => o.en !== w.en)).slice(0, 3);
    const opts = shuffle([w, ...others]);
    return { w, options: opts.map((o) => o.en), right: opts.indexOf(w) };
  }

  function newRound() {
    qs = shuffle(KATA_WORDS).slice(0, ROUND).map(makeQ);
    i = 0; picked = -1; score = 0; combo = 0; right = 0; answered = 0; retried = new Set(); missed = [];
    screen = 'play';
    begin();
  }

  const q = () => qs[i];

  function begin() {
    picked = -1;
    hinted = false;
    started = performance.now();
    left = 1;
    render();
    clearInterval(timer);
    timer = setInterval(tick, 100);
  }

  function tick() {
    if (picked !== -1 || screen !== 'play') return;
    if (document.hidden) { started += 100; return; }   // the clock waits while the app is in the background
    left = Math.max(0, 1 - (performance.now() - started) / (limit * 1000));
    const bar = el.querySelector('.rush-bar > span');
    if (bar) bar.style.width = (left * 100).toFixed(1) + '%';
    if (left <= 0) timeUp();
  }

  function render() {
    if (screen === 'intro') {
      el.innerHTML = `
        <div class="stack center-text practice">
          <div class="hero-jp accent-c" lang="ja" data-noruby>カタカナ</div>
          <p class="lead strong">Katakana spell words borrowed from other languages. Read each one and pick its meaning.</p>
          <p class="dim">Sound it out: コーヒー is "kōhī", coffee. If the bar runs out you just see the answer; the round keeps going.</p>
          <label class="switch-row small left-text"><span>Romaji training wheels</span><input type="checkbox" role="switch" data-wheels ${wheels ? 'checked' : ''}></label>
          <button class="btn primary wide" data-act="start">⚡ Start a round of ${ROUND}</button>
        </div>`;
      return;
    }
    if (screen === 'summary') {
      const uniq = [...new Map(missed.map((w) => [w.w, w])).values()];
      el.innerHTML = `
        <div class="stack center-text practice">
          <div class="score-huge accent-c mono">${score}</div>
          <p class="strong lead">${right} of ${answered} read right</p>
          ${uniq.length ? `<div class="panel left-text stack-sm"><p class="section-label">READ THESE AGAIN</p>
            ${uniq.map((w) => `<div class="word-row"><span class="strong" lang="ja" data-noruby>${esc(w.w)}</span><span class="dim mono">${esc(romaji(w.w, { particles: false }))}</span><span class="grow"></span><span>${esc(w.en)}</span></div>`).join('')}</div>` : ''}
          <button class="btn primary wide" data-act="start">↻ Another round</button>
        </div>`;
      return;
    }
    const cur = q();
    const done = picked !== -1;
    const showRomaji = wheels || hinted || done;
    el.innerHTML = `
      <div class="stack practice rush" data-qid="${esc(cur.w.w)}">
        <div class="row-between"><span class="score mono">${score}</span><span class="accent-c strong">${combo > 1 ? '×' + combo : ''}</span>
          <span class="small dim mono">${Math.min(i + 1, qs.length)}/${qs.length}</span></div>
        <div class="rush-bar" aria-hidden="true"><span style="width:${done ? 0 : left * 100}%"></span></div>
        <div class="panel center-text stack-sm rush-card">
          <p class="rush-word" lang="ja" data-noruby>${esc(cur.w.w)}</p>
          <p class="mono dim rush-romaji">${showRomaji ? esc(romaji(cur.w.w, { particles: false })) : '&nbsp;'}</p>
          ${!done && !showRomaji ? '<button class="linkbtn" data-act="hint">Show romaji (half points)</button>' : ''}
        </div>
        <p class="small dim">What does it mean?</p>
        ${choiceButtons(cur.options, { answered: done, picked, right: cur.right })}
        ${done ? `<div class="panel ${picked === cur.right ? 'good-panel' : 'note'} stack-sm">
            <p class="strong ${picked === cur.right ? 'good-c' : 'miss-c'}">${picked === cur.right ? '✓ Right!' : picked === -2 ? "Time's up, no harm done:" : 'Not quite:'}
              <span lang="ja" data-noruby>${esc(cur.w.w)}</span> = ${esc(cur.w.en)}</p>
            <div class="row2"><button class="btn" data-act="hear">🔊 Hear it</button><button class="btn primary" data-act="next">Next ▶</button></div>
          </div>` : ''}
      </div>`;
  }

  function settle(ok) {
    clearInterval(timer);
    const cur = q();
    const firstTry = !retried.has(cur.w.w);
    answered++;
    recent.push(ok);
    if (recent.length > 6) recent.shift();
    // Aim for roughly 85% right: less time when it's easy, more when it's hard.
    if (recent.length >= 4) {
      const rate = recent.filter(Boolean).length / recent.length;
      if (rate > 0.9) limit = Math.max(MIN_T, limit - 1);
      else if (rate < 0.75) limit = Math.min(MAX_T, limit + 1.5);
    }
    if (firstTry) store.log(ok);
    store.grade({ skill: 'kana', id: 'kata:' + cur.w.w, ok, firstTry: firstTry && !hinted });
    if (ok) {
      right++;
      combo++;
      const base = 100 + Math.round(left * 50) + combo * 10;
      score += hinted ? Math.floor(base / 2) : base;
      if (cur.w.garden) store.plant(cur.w.garden);
    } else {
      combo = 0;
      missed.push(cur.w);
      if (firstTry) {
        retried.add(cur.w.w);
        qs.splice(Math.min(qs.length, i + 3), 0, makeQ(cur.w));
      }
    }
    speaker.speak(cur.w.say, { mps: 4 });
    if (ctx.today) ctx.today.report(`${Math.min(answered, ROUND)}/${ROUND}`);
    render();
    if (ok) fx.hit({ el: el.querySelector('.practice-opts .good') }); else fx.miss({ el: el.querySelector('.rush-card') });
    fx.announce(ok ? 'Right.' : `${cur.w.w} means ${cur.w.en}.`);
  }

  function choose(k) { if (picked !== -1) return; picked = k; settle(k === q().right); }
  function timeUp() { if (picked !== -1) return; picked = -2; settle(false); }

  function next() {
    i++;
    if (i >= qs.length) {
      clearInterval(timer);
      screen = 'summary';
      store.markStudied();
      if (ctx.today) { ctx.today.report(`${ROUND}/${ROUND}`); ctx.today.done(); }
      render();
      fx.hit({ big: true, el: el.querySelector('.score-huge') });
      return;
    }
    begin();
  }

  const off = delegate(el, {
    start: newRound,
    pick: (b) => choose(+b.dataset.i),
    hint: () => { hinted = true; render(); },
    hear: () => speaker.speak(q().w.say, { mps: 3.5 }),
    next,
  });
  const onChange = (ev) => { if (ev.target.matches('[data-wheels]')) wheels = ev.target.checked; };
  el.addEventListener('change', onChange);

  store.markSession();
  if (ctx.today) ctx.today.report(`0/${ROUND}`);
  render();
  return () => { off(); el.removeEventListener('change', onChange); clearInterval(timer); speaker.stop(); };
}
