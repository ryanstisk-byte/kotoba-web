// Dictation Drops: hear a word or a short sentence and type it in kana. Only the sounds that were off get marked
// (js/dictation-check.js), so a miss shows exactly where the ear slipped: a small っ, a long vowel, a particle. It
// trains the step from hearing to spelling that the other modes skip. Replays and the slow clip are free; the hint
// shows how many sounds there are, then the first one. A miss shows the answer and brings the line back four lines
// later, never a penalty. Words come from the Garden first (due ones first), sentences from those words' examples,
// and both are topped up from the decks in teaching order. Every clip is already voiced, so no new audio.
import { store } from '../store.js';
import { speaker } from '../audio.js';
import { GARDEN_CATALOG } from '../data.js';
import { content, itemOpen, levelBar } from '../levels.js';
import { romaji } from '../romaji.js';
import { romajiToKana } from '../kana-input.js';
import { checkDictation, morae } from '../dictation-check.js';
import { esc, delegate, shuffle } from '../ui.js';
import * as fx from '../fx.js';

const PREFS_KEY = 'kotobaBeat.dictation';   // this device's choice (words or sentences); not progress
export const KINDS = {
  words: { label: 'Words', how: 'Single words. Start here.', round: 10 },
  sentences: { label: 'Sentences', how: 'Short example sentences, particles and all.', round: 6 },
};
/** Longest sentence offered, in morae. */
export const MAX_MORAE = 20;
const KANA_ONLY = /^[ぁ-ゖァ-ヺー\s・。、！？!?.,「」…〜]+$/;

function loadPrefs() {
  try { return { kind: 'words', ...JSON.parse(localStorage.getItem(PREFS_KEY) || '{}') }; } catch (e) { return { kind: 'words' }; }
}
function savePrefs(p) { try { localStorage.setItem(PREFS_KEY, JSON.stringify(p)); } catch (e) { /* this device only */ } }

/** A line to hear and type: { key, id, kind, say (what plays), reading (the kana answer), jp, en, level }. */
export function asLine(w, kind) {
  if (!w) return null;
  if (kind === 'sentences') {
    if (!w.ex || !w.exReading || !KANA_ONLY.test(w.exReading) || morae(w.exReading).length > MAX_MORAE) return null;
    return { key: 'ex:' + w.id, id: w.id, kind, say: w.ex, reading: w.exReading, jp: w.ex, en: w.exEn || '', level: w.level };
  }
  if (!w.jp || !w.reading || !w.en || !KANA_ONLY.test(w.reading) || /[ 。、！？]/.test(w.jp)) return null;
  return { key: w.id, id: w.id, kind, say: w.say || w.reading, reading: w.reading, jp: w.jp, en: w.en, level: w.level };
}

/**
 * Lines for a round: from words already planted in the Garden (due ones first, then a mix), topped up with the decks'
 * early words when fewer than a round are planted.
 */
export function dictationPool(kind = 'words', n = KINDS[kind].round) {
  const now = Date.now();
  const fits = (x) => x && itemOpen(x);
  const planted = store.planted().filter((p) => !p.item.mined)
    .map((p) => ({ x: asLine(GARDEN_CATALOG[p.item.id] || p.item, kind), due: p.prog.due <= now })).filter((y) => fits(y.x));
  const out = [...shuffle(planted.filter((y) => y.due)), ...shuffle(planted.filter((y) => !y.due))].map((y) => y.x).slice(0, n);
  const have = new Set(out.map((x) => x.reading));
  if (out.length < n) {
    // The decks are in teaching order: the first lines not planted yet, a few at a time.
    const extra = content('dictation').map((w) => asLine(w, kind)).filter((x) => fits(x) && !have.has(x.reading));
    for (const x of extra.slice(0, (n - out.length) * 3)) if (!have.has(x.reading)) { have.add(x.reading); out.push(x); }
  }
  return shuffle(out.slice(0, n));
}

export function mount(el, ctx = {}) {
  let prefs = loadPrefs();
  if (!KINDS[prefs.kind]) prefs.kind = 'words';
  let screen = 'intro';
  let qs = [];
  let i = 0;
  let result = null;       // null | checkDictation's result + { typedText, overridden }
  let typed = '';
  let hint = 0;            // 0 none, 1 how many sounds, 2 the first sound too
  let kanjiNote = false;
  let right = 0;
  let answered = 0;
  let retried = new Set();
  let missed = [];

  const q = () => qs[i];
  const round = () => KINDS[prefs.kind].round;
  const play = (speed = null) => { const x = q(); if (x) speaker.speak(x.say, { mps: x.kind === 'words' ? 3.5 : 4, speed }); };

  function newRound() {
    savePrefs(prefs);
    qs = dictationPool(prefs.kind);
    i = 0; right = 0; answered = 0; retried = new Set(); missed = [];
    screen = qs.length ? 'play' : 'intro';
    begin();
  }

  function begin() {
    result = null;
    typed = '';
    hint = 0;
    kanjiNote = false;
    render();
    if (screen !== 'play') return;
    el.querySelector('#dict-answer')?.focus();
    play();
  }

  function submit(text) {
    if (result || !text.trim()) return;
    const r = checkDictation(text, q());
    if (r.kanji) { kanjiNote = true; typed = text; render(); el.querySelector('#dict-answer')?.focus(); return; }
    settle(r, text);
  }

  function settle(r, text) {
    const x = q();
    const firstTry = !retried.has(x.key);
    result = { ...r, typedText: text, overridden: false };
    answered++;
    const good = !!r.ok;
    if (firstTry) store.log(good);
    store.grade({ skill: 'listening', id: x.key, ok: good, firstTry: firstTry && !hint });
    if (good) right++;
    else {
      missed.push(x);
      if (firstTry) { retried.add(x.key); qs.splice(Math.min(qs.length, i + 4), 0, x); }
      if (x.id && store.s.items[x.id]) store.recapMissed([x.id]);
    }
    if (ctx.today) ctx.today.report(`${Math.min(answered, round())}/${round()}`);
    render();
    if (good) fx.hit({ el: el.querySelector('.dict-card') }); else fx.miss({ el: el.querySelector('.dict-card') });
    el.querySelector('[data-act=next]')?.focus();
  }

  /** "I was right": a miss that was really fine. Counted right after all, and the extra repeat is taken back. */
  function override() {
    if (!result || result.ok || result.overridden) return;
    const x = q();
    result.overridden = true;
    right++;
    missed = missed.filter((m) => m !== x);
    const again = qs.indexOf(x, i + 1);
    if (again > i) qs.splice(again, 1);
    store.grade({ skill: 'listening', id: x.key, ok: true, firstTry: false });
    render();
  }

  function next() {
    if (i + 1 < qs.length) { i++; begin(); return; }
    screen = 'summary';
    store.markStudied();
    render();
    if (ctx.today) ctx.today.done(`${right} of ${answered} heard and typed right`);
  }

  const moraRow = (list, cls) => `<span class="dict-morae ${cls}" lang="ja" data-noruby>${list.map((m) => `<span class="dict-mora${m.wrong ? ' off' : ''}">${esc(m.s)}</span>`).join('')}</span>`;

  function hintLine(x) {
    if (!hint) return '';
    const ms = morae(x.reading);
    const slots = ms.map((m, k) => `<span class="dict-slot">${hint > 1 && k === 0 ? esc(m) : ''}</span>`).join('');
    return `<span class="dict-slots" lang="ja" data-noruby aria-label="${ms.length} sounds">${slots}</span><span class="small dim">${ms.length} sounds</span>`;
  }

  function renderPlay() {
    const x = q();
    const done = !!result;
    const ok = done && (result.ok || result.overridden);
    const preview = /[a-z]/i.test(typed) ? romajiToKana(typed) : '';
    el.innerHTML = `
      <div class="stack practice dict-mode">
        ${levelBar('dictation')}
        <div class="row-between"><span class="small dim">${KINDS[prefs.kind].label}</span>
          <span class="small dim mono dict-pos">${Math.min(i + 1, qs.length)}/${qs.length}</span></div>
        <div class="panel center-text stack-sm dict-card">
          <p class="small dim">Listen, then type what you hear in kana</p>
          <button class="btn primary dict-play" data-act="hear" aria-label="Play it again">🔊 Play</button>
          <button class="btn ghost small-btn" data-act="slow" aria-label="Play it slowly">🐢 Slow</button>
          ${done ? '' : `<div class="dict-hint" aria-live="polite">${hintLine(x)}</div>`}
        </div>
        <form class="stack-sm" data-form="answer" autocomplete="off">
          <label class="sr-only" for="dict-answer">What you heard</label>
          <input id="dict-answer" class="mine-input type-input" type="text" value="${esc(typed)}" ${done ? 'disabled' : ''}
            lang="ja" placeholder="かな, or romaji" autocomplete="off" autocapitalize="off" autocorrect="off" spellcheck="false" enterkeyhint="done">
          <p class="small dim type-preview mono" aria-live="polite" data-noruby>${kanjiNote ? 'Type it in kana or romaji, the way it sounds.' : preview ? `<span lang="ja">${esc(preview)}</span>` : '&nbsp;'}</p>
          ${done ? '' : `<div class="row2">
            <button type="button" class="btn" data-act="hint">Hint</button>
            <button type="submit" class="btn primary">Check ✓</button></div>
            <button type="button" class="linkbtn" data-act="reveal">Show me the answer</button>`}
        </form>
        ${done ? `<div class="panel ${ok ? 'good-panel' : 'note'} stack-sm" role="status">
            <p class="strong ${ok ? 'good-c' : 'miss-c'}">${result.overridden ? '✓ Counted right.' : result.ok === 'exact' ? '✓ Right!' : result.ok === 'close' ? '✓ Close enough!' : result.typedText ? 'Not quite.' : 'It was:'}</p>
            ${result.typedText && result.ok !== 'exact' ? `<p class="dict-line"><span class="small dim">You typed</span> ${moraRow(result.typed, 'mine')}</p>` : ''}
            <p class="dict-line"><span class="small dim">${result.ok === 'exact' ? 'It was' : 'Answer'}</span> ${moraRow(result.typedText ? result.answer : result.answer.map((m) => ({ ...m, wrong: false })), 'key')}</p>
            <p class="type-answer"><span class="strong" lang="ja">${esc(x.jp)}</span>${x.kind === 'words' ? `<span class="mono dim">${esc(romaji(x.reading, { particles: false }))}</span>` : ''}</p>
            ${x.en ? `<p>${esc(x.en)}</p>` : ''}
            ${result.ok === 'close' ? '<p class="small dim">The marked sound was off. Small っ and long vowels change the word, so listen for them.</p>' : ''}
            ${result.particle ? '<p class="small dim">は, へ and を sound like わ, え and お when they are particles, but they are written は, へ, を.</p>' : ''}
            ${!result.ok && result.typedText && !result.overridden ? `<p class="small dim">The marked sounds were off. It comes back in a moment.</p>
              <button class="linkbtn" data-act="override">I was right (count it)</button>` : ''}
            <div class="row2"><button class="btn" data-act="hear">🔊 Hear it</button><button class="btn primary" data-act="next">Next ▶</button></div>
          </div>` : ''}
      </div>`;
  }

  function renderIntro() {
    const pool = dictationPool(prefs.kind);
    el.innerHTML = `
      <div class="stack practice dict-mode">
        ${levelBar('dictation')}
        <div class="center-text stack-sm">
          <div class="hero-jp accent-c" lang="ja" data-noruby>書き取り</div>
          <p class="lead strong">Hear it, then type it in kana.</p>
          <p class="dim">Only the sounds you miss get marked, so you can hear exactly where it slipped. Replays are free.</p>
        </div>
        <div class="panel stack-sm">
          <p class="section-label">WHAT YOU HEAR</p>
          <div class="seg" role="radiogroup" aria-label="What you hear">
            ${Object.entries(KINDS).map(([k, d]) => `<button class="seg-btn ${prefs.kind === k ? 'on' : ''}" data-act="kind" data-k="${k}" role="radio" aria-checked="${prefs.kind === k}">${d.label}</button>`).join('')}
          </div>
          <p class="small dim">${esc(KINDS[prefs.kind].how)}</p>
        </div>
        <p class="small dim">Type romaji ("kitte" becomes きって) or use a Japanese keyboard. Hiragana or katakana both count.</p>
        <p class="small dim">${pool.length ? `${pool.length} ${prefs.kind === 'words' ? 'words' : 'sentences'} this round, from your Garden first.` : 'Nothing to hear yet.'}</p>
        <button class="btn primary wide" data-act="start" ${pool.length ? '' : 'disabled'}>▶ Start a round of ${round()}</button>
      </div>`;
  }

  function renderSummary() {
    const uniq = [...new Map(missed.map((x) => [x.key, x])).values()];
    el.innerHTML = `
      <div class="stack center-text practice dict-mode">
        <div class="score-huge accent-c mono">${right}/${answered}</div>
        <p class="strong lead">heard and typed right</p>
        ${uniq.length ? `<div class="panel left-text stack-sm"><p class="section-label">HEAR THESE AGAIN SOON</p>
          ${uniq.map((x) => `<div class="word-row"><span class="strong" lang="ja">${esc(x.reading)}</span><span class="grow"></span><span>${esc(x.en)}</span></div>`).join('')}</div>` : ''}
        <button class="btn primary wide" data-act="start">↻ Another round</button>
        ${ctx.today ? '' : '<button class="btn ghost wide" data-act="intro">Change what you hear</button>'}
      </div>`;
  }

  function render() {
    if (screen === 'summary') return renderSummary();
    if (screen === 'play') return renderPlay();
    return renderIntro();
  }

  const off = delegate(el, {
    kind: (b) => { prefs.kind = b.dataset.k; savePrefs(prefs); render(); },
    start: newRound,
    intro: () => { screen = 'intro'; render(); },
    hint: () => {
      typed = el.querySelector('#dict-answer')?.value || typed;
      hint = Math.min(2, hint + 1);
      render();
      const input = el.querySelector('#dict-answer');
      if (input) { input.focus(); input.setSelectionRange(input.value.length, input.value.length); }
    },
    reveal: () => settle(checkDictation('', q()), ''),
    override,
    hear: () => play(),
    slow: () => play('slow'),
    next,
  });
  const onSubmit = (ev) => {
    if (!ev.target.closest('[data-form=answer]')) return;
    ev.preventDefault();
    submit(el.querySelector('#dict-answer')?.value || '');
  };
  // Enter while a Japanese keyboard is still converting picks the conversion; it doesn't submit.
  const onKey = (ev) => {
    if (ev.target.id === 'dict-answer' && ev.key === 'Enter' && (ev.isComposing || ev.keyCode === 229)) ev.preventDefault();
  };
  const onInput = (ev) => {
    if (ev.target.id !== 'dict-answer') return;
    typed = ev.target.value;
    const p = el.querySelector('.type-preview');
    if (p) p.innerHTML = /[a-z]/i.test(typed) ? `<span lang="ja">${esc(romajiToKana(typed))}</span>` : '&nbsp;';
  };
  el.addEventListener('submit', onSubmit);
  el.addEventListener('keydown', onKey, true);
  el.addEventListener('input', onInput);
  render();
  return () => { off(); el.removeEventListener('submit', onSubmit); el.removeEventListener('keydown', onKey, true); el.removeEventListener('input', onInput); speaker.stop(); };
}
