// Type It: recall a word by typing it. Three ways round:
//   - Meaning: see the word (in kana, katakana or kanji) and type what it means in English.
//   - Reading: see the word and type how it's read, in romaji (or kana if a Japanese keyboard is on).
//   - Japanese: see the English and type the word in Japanese: switch to the Japanese keyboard, or type romaji and it
//     turns into kana as you go.
// Typing an answer is harder recall than picking one (the generation effect), so it suits words already met. Scoring
// is generous: any listed meaning, small typos, a long vowel or small っ left out ("close"), and "I was right" after a
// miss when the answer was fine. A miss shows the answer and brings the word back three words later, never a penalty.
import { store } from '../store.js';
import { speaker } from '../audio.js';
import { GARDEN_CATALOG } from '../data.js';
import { KATA_WORDS } from '../practice-data.js';
import { content, itemOpen, levelBar } from '../levels.js';
import { romaji, toHiragana, KANJI_RE, KATA_RE } from '../romaji.js';
import { romajiToKana, checkMeaning, checkReading, checkJapanese } from '../kana-input.js';
import { esc, delegate, shuffle } from '../ui.js';
import * as fx from '../fx.js';

const ROUND = 10;
const PREFS_KEY = 'kotobaBeat.type';   // this device's choices (direction, script); not progress
export const DIRECTIONS = {
  meaning: { label: 'Meaning', how: 'See the word, type its English meaning.' },
  reading: { label: 'Reading', how: 'See the word, type how it sounds in romaji (or kana).' },
  japanese: { label: 'Japanese', how: 'See the English, type the word in Japanese (Japanese keyboard, or romaji).' },
};
export const SCRIPTS = {
  all: 'All',
  hiragana: 'Hiragana',
  katakana: 'Katakana',
  kanji: 'Kanji',
};

/** Which script a word is written in, for the filter. */
export function scriptOf(jp) {
  if (KANJI_RE.test(jp)) return 'kanji';
  if (KATA_RE.test(jp)) return 'katakana';
  return 'hiragana';
}

function loadPrefs() {
  try { return { dir: 'meaning', script: 'all', ...JSON.parse(localStorage.getItem(PREFS_KEY) || '{}') }; } catch (e) { return { dir: 'meaning', script: 'all' }; }
}
function savePrefs(p) { try { localStorage.setItem(PREFS_KEY, JSON.stringify(p)); } catch (e) { /* this device only */ } }

const asWord = (it) => it && it.jp && it.en && it.reading ? { id: it.id, jp: it.jp, reading: toHiragana(it.reading), en: it.en, say: it.say || it.reading, level: it.level } : null;

/**
 * Words for a round: Garden words already planted (due ones first, then a mix), in the chosen script; topped up with
 * the decks' early words (and Katakana Rush words for katakana) when fewer than a round are planted.
 */
export function typePool(script = 'all', n = ROUND) {
  const fits = (w) => w && (script === 'all' || scriptOf(w.jp) === script) && itemOpen(w) && !/[ 。、！？]/.test(w.jp);
  const now = Date.now();
  const planted = store.planted().filter((p) => !p.item.mined).map((p) => ({ w: asWord(p.item), due: p.prog.due <= now })).filter((x) => fits(x.w));
  const due = shuffle(planted.filter((x) => x.due)).map((x) => x.w);
  const rest = shuffle(planted.filter((x) => !x.due)).map((x) => x.w);
  const out = [...due, ...rest].slice(0, n);
  if (out.length < n) {
    const have = new Set(out.map((w) => w.jp));
    const extra = [
      ...content('type').map((w) => asWord(GARDEN_CATALOG[w.id] || w)),
      ...(script === 'katakana' || script === 'all' ? KATA_WORDS.filter(itemOpen).map((k) => asWord({ id: k.garden || 'kata:' + k.w, jp: k.w, reading: k.w, en: k.en, say: k.say, level: k.level })) : []),
    ].filter((w) => fits(w) && !have.has(w.jp));
    // The decks are in teaching order: the first words not planted yet, a few at a time.
    for (const w of extra.slice(0, (n - out.length) * 3)) if (!have.has(w.jp)) { have.add(w.jp); out.push(w); }
  }
  return shuffle(out.slice(0, n));
}

export function mount(el, ctx = {}) {
  let prefs = loadPrefs();
  let screen = 'intro';
  let qs = [];
  let i = 0;
  let result = null;       // null | { ok: 'exact' | 'close' | false, typed, overridden }
  let typed = '';
  let hint = 0;            // characters of the answer shown
  let right = 0;
  let answered = 0;
  let retried = new Set();
  let missed = [];

  const q = () => qs[i];
  const dir = () => prefs.dir;
  const answerText = (w) => (dir() === 'meaning' ? w.en : dir() === 'reading' ? romaji(w.reading, { particles: false }) : w.jp);
  const expectsJapanese = () => dir() !== 'meaning';

  function newRound() {
    savePrefs(prefs);
    qs = typePool(prefs.script, ROUND);
    i = 0; right = 0; answered = 0; retried = new Set(); missed = [];
    screen = qs.length ? 'play' : 'empty';
    begin();
  }

  function begin() {
    result = null;
    typed = '';
    hint = 0;
    render();
    const input = el.querySelector('#type-answer');
    if (input) input.focus();
    if (screen === 'play' && dir() === 'reading') speaker.stop();
  }

  function check(text) {
    const w = q();
    if (dir() === 'meaning') return checkMeaning(text, w.en);
    if (dir() === 'reading') return checkReading(text, w.reading);
    return checkJapanese(text, w);
  }

  function submit(text) {
    if (result || !text.trim()) return;
    const w = q();
    const ok = check(text);
    settle(ok, text);
  }

  function settle(ok, text) {
    const w = q();
    const firstTry = !retried.has(w.jp);
    result = { ok, typed: text, overridden: false };
    answered++;
    const good = !!ok;
    if (firstTry) store.log(good);
    store.grade({ skill: skillFor(w), id: w.id || 'type:' + w.jp, ok: good, firstTry: firstTry && !hint });
    if (good) right++;
    else {
      missed.push(w);
      if (firstTry) { retried.add(w.jp); qs.splice(Math.min(qs.length, i + 4), 0, w); }
      if (w.id && store.s.items[w.id]) store.recapMissed([w.id]);
    }
    if (ctx.today) ctx.today.report(`${Math.min(answered, ROUND)}/${ROUND}`);
    render();
    speaker.speak(w.say, { mps: 3.5 });
    if (good) fx.hit({ el: el.querySelector('.type-card') }); else fx.miss({ el: el.querySelector('.type-card') });
    el.querySelector('[data-act=next]')?.focus();
  }

  /** "I was right": a miss that was really fine (a synonym the list doesn't have). Counted right after all. */
  function override() {
    if (!result || result.ok || result.overridden) return;
    const w = q();
    result.overridden = true;
    right++;
    missed = missed.filter((m) => m !== w);
    // Take back the extra repeat added for the miss.
    const again = qs.indexOf(w, i + 1);
    if (again > i) qs.splice(again, 1);
    store.grade({ skill: skillFor(w), id: w.id || 'type:' + w.jp, ok: true, firstTry: false });
    render();
  }

  const skillFor = (w) => (dir() === 'reading' ? (scriptOf(w.jp) === 'kanji' ? 'kanji' : 'kana') : 'vocab');

  function next() {
    if (i + 1 < qs.length) { i++; begin(); return; }
    screen = 'summary';
    store.markStudied();
    render();
    if (ctx.today) ctx.today.done(`${right} of ${answered} typed right`);
  }

  function prompt(w) {
    if (dir() === 'japanese') {
      return `<p class="small dim">Type this in Japanese</p>
        <p class="type-prompt-en">${esc(w.en)}</p>`;
    }
    return `<p class="small dim">${dir() === 'meaning' ? 'What does it mean? Type it in English' : 'How is it read? Type it in romaji'}</p>
      <p class="type-prompt-jp" lang="ja" data-noruby>${esc(w.jp)}</p>
      ${dir() === 'meaning' ? '<button class="btn ghost small-btn" data-act="hear" aria-label="Hear it">🔊</button>' : ''}`;
  }

  function renderPlay() {
    const w = q();
    const done = !!result;
    const ok = done && (result.ok || result.overridden);
    const ans = answerText(w);
    const preview = expectsJapanese() && /[a-z]/i.test(typed) ? romajiToKana(typed) : '';
    el.innerHTML = `
      <div class="stack practice type-mode">
        ${levelBar('type')}
        <div class="row-between"><span class="small dim">${DIRECTIONS[dir()].label} · ${SCRIPTS[prefs.script]}</span>
          <span class="small dim mono">${Math.min(i + 1, qs.length)}/${qs.length}</span></div>
        <div class="panel center-text stack-sm type-card">${prompt(w)}</div>
        <form class="stack-sm type-form" data-form="answer" autocomplete="off">
          <label class="sr-only" for="type-answer">Your answer</label>
          <input id="type-answer" class="mine-input type-input" type="text" value="${esc(typed)}" ${done ? 'disabled' : ''}
            ${expectsJapanese() ? 'lang="ja" placeholder="日本語, or romaji"' : 'lang="en" placeholder="English meaning"'}
            autocomplete="off" autocapitalize="off" autocorrect="off" spellcheck="false" enterkeyhint="done">
          <p class="small dim type-preview mono" aria-live="polite" data-noruby>${preview ? `<span lang="ja">${esc(preview)}</span>` : hint ? `Starts with: <span lang="ja">${esc([...ans].slice(0, hint).join(''))}</span>…` : '&nbsp;'}</p>
          ${done ? '' : `<div class="row2">
            <button type="button" class="btn" data-act="hint">Hint</button>
            <button type="submit" class="btn primary">Check ✓</button></div>
            <button type="button" class="linkbtn" data-act="reveal">Show me the answer</button>`}
        </form>
        ${done ? `<div class="panel ${ok ? 'good-panel' : 'note'} stack-sm" role="status">
            <p class="strong ${ok ? 'good-c' : 'miss-c'}">${result.overridden ? '✓ Counted right.' : result.ok === 'exact' ? '✓ Right!' : result.ok === 'close' ? '✓ Close enough!' : result.typed ? 'Not quite. The answer:' : 'The answer:'}</p>
            <p class="type-answer"><span class="strong" lang="ja">${esc(w.jp)}</span>${w.reading !== w.jp ? ` <span lang="ja" class="dim">${esc(w.reading)}</span>` : ''}
              <span class="mono dim">${esc(romaji(w.reading, { particles: false }))}</span></p>
            <p>${esc(w.en)}</p>
            ${result.ok === 'close' ? `<p class="small dim">${dir() === 'meaning' ? 'Watch the spelling.' : 'Watch the long vowels and small っ: they change the word.'}</p>` : ''}
            ${!result.ok && result.typed && !result.overridden ? `<p class="small dim">You typed: <span lang="${expectsJapanese() ? 'ja' : 'en'}">${esc(result.typed)}</span>. It comes back in a moment.</p>
              <button class="linkbtn" data-act="override">I was right (count it)</button>` : ''}
            <div class="row2"><button class="btn" data-act="hear">🔊 Hear it</button><button class="btn primary" data-act="next">Next ▶</button></div>
          </div>` : ''}
      </div>`;
  }

  function renderIntro() {
    const pool = typePool(prefs.script, ROUND);
    el.innerHTML = `
      <div class="stack practice type-mode">
        ${levelBar('type')}
        <div class="center-text stack-sm">
          <div class="hero-jp accent-c" lang="ja" data-noruby>打つ</div>
          <p class="lead strong">Type the answer from memory.</p>
          <p class="dim">Typing an answer is harder than picking one, and that's what makes it stick. Misses just show the answer.</p>
        </div>
        <div class="panel stack-sm">
          <p class="section-label">TYPE THE</p>
          <div class="seg" role="radiogroup" aria-label="What you type">
            ${Object.entries(DIRECTIONS).map(([k, d]) => `<button class="seg-btn ${prefs.dir === k ? 'on' : ''}" data-act="dir" data-k="${k}" role="radio" aria-checked="${prefs.dir === k}">${d.label}</button>`).join('')}
          </div>
          <p class="small dim">${esc(DIRECTIONS[prefs.dir].how)}</p>
          <p class="section-label">WORDS WRITTEN IN</p>
          <div class="seg" role="radiogroup" aria-label="Words written in">
            ${Object.entries(SCRIPTS).map(([k, label]) => `<button class="seg-btn ${prefs.script === k ? 'on' : ''}" data-act="script" data-k="${k}" role="radio" aria-checked="${prefs.script === k}">${label}</button>`).join('')}
          </div>
        </div>
        ${prefs.dir === 'japanese' ? '<p class="small dim">To type Japanese, add the Japanese keyboard (iPhone: Settings › General › Keyboard › Keyboards; Windows: Settings › Time & language › Language). Or just type romaji: "taberu" becomes たべる.</p>' : ''}
        <p class="small dim">${pool.length ? `${pool.length} words this round, from your Garden first.` : 'No words in this script yet.'}</p>
        <button class="btn primary wide" data-act="start" ${pool.length ? '' : 'disabled'}>⌨ Start a round of ${ROUND}</button>
      </div>`;
  }

  function renderSummary() {
    const uniq = [...new Map(missed.map((w) => [w.jp, w])).values()];
    el.innerHTML = `
      <div class="stack center-text practice type-mode">
        <div class="score-huge accent-c mono">${right}/${answered}</div>
        <p class="strong lead">typed right</p>
        ${uniq.length ? `<div class="panel left-text stack-sm"><p class="section-label">TYPE THESE AGAIN SOON</p>
          ${uniq.map((w) => `<div class="word-row"><span class="strong" lang="ja">${esc(w.jp)}</span><span class="dim mono">${esc(romaji(w.reading, { particles: false }))}</span><span class="grow"></span><span>${esc(w.en)}</span></div>`).join('')}</div>` : ''}
        <button class="btn primary wide" data-act="start">↻ Another round</button>
        ${ctx.today ? '' : '<button class="btn ghost wide" data-act="intro">Change what you type</button>'}
      </div>`;
  }

  function render() {
    if (screen === 'intro') return renderIntro();
    if (screen === 'summary') return renderSummary();
    if (screen === 'empty') { screen = 'intro'; return renderIntro(); }
    return renderPlay();
  }

  const off = delegate(el, {
    dir: (b) => { prefs.dir = b.dataset.k; savePrefs(prefs); render(); },
    script: (b) => { prefs.script = b.dataset.k; savePrefs(prefs); render(); },
    start: newRound,
    intro: () => { screen = 'intro'; render(); },
    hint: () => {
      const ans = answerText(q());
      hint = Math.min([...ans].length - 1, hint + 1);
      typed = el.querySelector('#type-answer')?.value || typed;
      render();
      const input = el.querySelector('#type-answer');
      if (input) { input.focus(); input.setSelectionRange(input.value.length, input.value.length); }
    },
    reveal: () => settle(false, ''),
    override,
    hear: () => speaker.speak(q().say, { mps: 3.5 }),
    next,
  });
  const onSubmit = (ev) => {
    if (!ev.target.closest('[data-form=answer]')) return;
    ev.preventDefault();
    submit(el.querySelector('#type-answer')?.value || '');
  };
  // Enter while a Japanese keyboard is still converting picks the conversion; it doesn't submit.
  const onKey = (ev) => {
    if (ev.target.id === 'type-answer' && ev.key === 'Enter' && (ev.isComposing || ev.keyCode === 229)) ev.preventDefault();
  };
  const onInput = (ev) => {
    if (ev.target.id !== 'type-answer') return;
    typed = ev.target.value;
    const p = el.querySelector('.type-preview');
    if (p && expectsJapanese()) p.innerHTML = /[a-z]/i.test(typed) ? `<span lang="ja">${esc(romajiToKana(typed))}</span>` : '&nbsp;';
  };
  el.addEventListener('submit', onSubmit);
  el.addEventListener('keydown', onKey, true);
  el.addEventListener('input', onInput);
  render();
  return () => { off(); el.removeEventListener('submit', onSubmit); el.removeEventListener('keydown', onKey, true); el.removeEventListener('input', onInput); speaker.stop(); };
}
