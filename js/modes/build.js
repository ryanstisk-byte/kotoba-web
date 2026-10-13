// Sentence Builder: see the English (and a scene), build the Japanese from shuffled tiles, then say it out loud.
// Translation recall. A wrong build shows the right sentence. Speaking uses speech recognition when there is one,
// grading yourself when there isn't, and is skipped in Quiet mode.
import { store } from '../store.js';
import { speaker, Recognizer, recognitionSupported, normalizeJa } from '../audio.js';
import { BUILD_SENTENCES, wordsInTiles } from '../practice-data.js';
import { romaji } from '../romaji.js';
import { readingOf } from '../furigana.js';
import { esc, shuffle, delegate } from '../ui.js';
import * as fx from '../fx.js';

const GOAL = 5;
const WORDS = BUILD_SENTENCES.map((x) => wordsInTiles(x.tiles));
const JOINS = new Set(['は', 'が', 'を', 'に', 'で', 'へ', 'と', 'の', 'も', 'から', 'だ', 'ですか']);
/** The sentence with a space after each particle (レンは ラーメンを たべます), so reading help splits it by word. */
const spaced = (tiles) => tiles.reduce((acc, t) => (acc.length && JOINS.has(t) ? [...acc.slice(0, -1), acc[acc.length - 1] + t] : [...acc, t]), []).join(' ');
/** A word counts as known once it has been planted in the Garden (taught somewhere, or met here). */
const isKnown = (w) => w.ids.some((id) => store.item(id));
const newWords = (i) => WORDS[i].filter((w) => !isKnown(w));
/** Sentences with the fewest new words first, shuffled among equals. */
const byKnown = () => shuffle(BUILD_SENTENCES.map((_, i) => i)).sort((a, b) => Math.min(newWords(a).length, 3) - Math.min(newWords(b).length, 3));

/** How alike two strings are (shared character pairs), 0..1. Generous on purpose: recognition is imperfect. */
function likeness(a, b) {
  const pairs = (s) => { const out = []; for (let i = 0; i < s.length - 1; i++) out.push(s.slice(i, i + 2)); return out.length ? out : [s]; };
  const pa = pairs(a);
  const pb = pairs(b);
  const pool = [...pb];
  let hit = 0;
  for (const p of pa) { const j = pool.indexOf(p); if (j >= 0) { hit++; pool.splice(j, 1); } }
  return (2 * hit) / (pa.length + pb.length);
}

export function mount(el, ctx) {
  const recognizer = new Recognizer();
  let input = ctx.quiet ? 'quiet' : recognitionSupported ? 'speech' : 'self';
  let note = ctx.quiet ? 'Quiet mode: build the sentences; the speaking step is skipped.' : recognitionSupported ? '' : 'No speech recognition in this browser: say each sentence, then grade yourself.';
  let order = byKnown();
  let pos = 0;
  let s = null;          // current sentence
  let bank = [];         // { id, text } still to place
  let placed = [];       // { id, text } in the answer row
  let step = 'build';    // 'meet' (a new word appears) | 'build' | 'say' | 'done'
  let meet = [];         // the new words to learn before this sentence
  let micOn = false;     // the mic starts when the learner taps 🎤, or on its own if Settings says so
  let ok = false;        // built right?
  let hinted = false;
  let heard = '';
  let spoke = null;      // null | true | false
  let built = 0;
  let right = 0;

  function start() {
    s = BUILD_SENTENCES[order[pos % order.length]];
    meet = newWords(order[pos % order.length]);
    const tiles = s.tiles.map((text, id) => ({ id, text }));
    bank = shuffle(tiles);
    // Never start in the right order already.
    if (bank.length > 1 && bank.every((t, k) => t.id === k)) bank.push(bank.shift());
    placed = [];
    step = meet.length ? 'meet' : 'build';
    micOn = false;
    ok = false;
    hinted = false;
    heard = '';
    spoke = null;
    render();
  }

  const accepted = () => [s.tiles.join(''), ...s.alts];
  const builtText = () => placed.map((t) => t.text).join('');

  /** The next sentence (after this one) whose words are all known, or -1. */
  function knownAhead() {
    for (let k = 1; k < order.length; k++) if (!newWords(order[(pos + k) % order.length]).length) return k;
    return -1;
  }

  function renderMeet() {
    const ahead = knownAhead();
    el.innerHTML = `
      <div class="stack practice build" data-qid="${esc(s.id)}">
        <div class="panel challenger stack-sm">
          <p class="challenger-head">⚡ ${meet.length > 1 ? 'New words appear!' : 'A new word appears!'}</p>
          <p class="small dim">The next sentence uses ${meet.length > 1 ? 'words' : 'a word'} you haven't learned yet. Learn ${meet.length > 1 ? 'them' : 'it'} first, or skip to a sentence you know.</p>
          <div class="learn-grid" data-noruby>
            ${meet.map((w, k) => `<button class="panel learn-card" data-act="meetword" data-k="${k}" aria-label="Hear ${esc(w.reading)}">
              <span class="learn-k pre-word" lang="ja">${esc(w.jp)}</span>
              <span class="small" lang="ja">${w.reading !== w.jp ? `${esc(w.reading)} · ` : ''}<span class="mono">${esc(romaji(w.reading))}</span></span>
              <span class="small dim">${esc(w.en)}</span></button>`).join('')}
          </div>
          <button class="btn primary wide" data-act="learnnew">Learn ${meet.length > 1 ? 'them' : 'it'} and build ▶</button>
          <button class="btn wide" data-act="skipnew" ${ahead < 0 ? 'disabled' : ''}>${ahead < 0 ? 'Every sentence left has a new word' : 'Skip to a sentence I know'}</button>
        </div>
      </div>`;
  }

  function render() {
    if (step === 'meet') return renderMeet();
    el.innerHTML = `
      <div class="stack practice build" data-qid="${esc(s.id)}">
        <div class="row-between"><span class="strong mono">${right}/${built} built right</span><span class="small dim">${Math.min(built, GOAL)}/${GOAL} today</span></div>
        ${note && step === 'build' && !built ? `<div class="panel note">${esc(note)}</div>` : ''}
        <div class="panel build-prompt">
          <span class="build-scene" aria-hidden="true">${s.scene || '🗣️'}</span>
          <div class="grow"><p class="small dim">Say this in Japanese:</p><p class="lead strong">${esc(s.en)}</p></div>
        </div>
        <div class="tile-row answer-row ${step !== 'build' ? (ok ? 'is-right' : 'is-wrong') : ''}" aria-label="Your sentence">
          ${placed.length ? placed.map((t, k) => `<button class="word-tile placed" data-act="untile" data-k="${k}" lang="ja" ${step !== 'build' ? 'disabled' : ''}>${esc(t.text)}</button>`).join('')
            : '<span class="small dim">Tap the tiles in order.</span>'}
        </div>
        ${step === 'build' ? `
          <div class="tile-row bank" aria-label="Tiles">
            ${bank.map((t, k) => `<button class="word-tile" data-act="tile" data-k="${k}" lang="ja">${esc(t.text)}</button>`).join('')}
          </div>
          <div class="row3">
            <button class="btn" data-act="hint">💡 Hint</button>
            <button class="btn" data-act="clear" ${placed.length ? '' : 'disabled'}>Clear</button>
            <button class="btn primary" data-act="check" ${bank.length ? 'disabled' : ''}>Check</button>
          </div>` : result()}
      </div>`;
  }

  function result() {
    const head = ok
      ? `<p class="strong good-c">✓ ${hinted ? 'Built (with a hint).' : 'Built it!'}</p>`
      : `<p class="strong miss-c">Not quite. Here's the sentence:</p>`;
    const answer = `<p class="build-answer" lang="ja">${esc(/\s/.test(s.say) ? s.say : spaced(s.tiles))}</p>`;
    let speak = '';
    if (step === 'say') {
      if (input === 'speech') {
        speak = micOn
          ? `<p class="small strong">Now say it out loud.</p>
          <p class="small dim" id="bd-heard" aria-live="polite">${heard ? `Heard: 「${esc(heard)}」` : recognizer.listening ? '🎤 Listening…' : 'Starting the mic…'}</p>
          <div class="row2"><button class="btn good" data-act="sg-ok">I said it ✓</button><button class="btn" data-act="sg-skip">Skip</button></div>`
          : `<p class="small strong">Want to say it out loud?</p>
          <div class="row3"><button class="btn" data-act="hear">🔊 Hear it</button><button class="btn good" data-act="mic">🎤 Say it</button><button class="btn" data-act="sg-skip">Skip</button></div>`;
      } else if (input === 'self') {
        speak = `<p class="small strong">Now say it out loud, then grade yourself.</p>
          <div class="row3"><button class="btn" data-act="hear">🔊 Hear it</button><button class="btn good" data-act="sg-ok">I said it ✓</button><button class="btn" data-act="sg-miss">Not yet</button></div>`;
      }
    }
    const said = spoke === true ? '<p class="small good-c strong">🎤 Said it. Nice.</p>' : spoke === false ? '<p class="small dim">Listen once more and try it next time.</p>' : '';
    return `<div class="panel ${ok ? 'good-panel' : 'note'} stack-sm">${head}${answer}<p class="small dim">${esc(s.en)}</p>${speak}${said}
      ${step === 'done' || input === 'quiet' ? `<div class="row2"><button class="btn" data-act="hear">🔊 Hear it</button><button class="btn primary" data-act="nextsent">Next ▶</button></div>` : ''}
    </div>`;
  }

  function check() {
    if (bank.length || step !== 'build') return;
    ok = accepted().includes(builtText());
    built++;
    if (ok) right++;
    store.log(ok && !hinted);
    store.grade({ skill: 'grammar', id: `build:${s.id}`, ok, firstTry: !hinted });
    for (const w of WORDS[order[pos % order.length]]) if (!isKnown(w)) store.plant(w.ids[0]);
    // Show the right sentence either way, in its usual order.
    if (!ok) placed = s.tiles.map((text, id) => ({ id, text }));
    // "Start the mic on its own" (Settings): listen once the model sentence has finished, so the mic doesn't hear it.
    const at = pos;
    const autoListen = () => { if (store.settings.autoMic && input === 'speech' && step === 'say' && !micOn && pos === at) { micOn = true; render(); listen(); } };
    speaker.speak(s.say, { mps: 4, voice: s.voice, onend: autoListen });
    step = input === 'quiet' ? 'done' : 'say';
    if (ctx.today) {
      ctx.today.report(`${Math.min(built, GOAL)}/${GOAL}`);
      if (built >= GOAL) ctx.today.done();
    }
    render();
    if (ok) fx.hit({ el: el.querySelector('.answer-row') }); else fx.miss({ el: el.querySelector('.answer-row') });
    fx.announce(ok ? 'Right.' : `Not quite. The sentence is ${s.say}`);
  }

  function listen() {
    const targets = [normalizeJa(s.say), normalizeJa(readingOf(normalizeJa(s.say)) || '')].filter(Boolean);
    recognizer.onTranscript = (text) => {
      if (step !== 'say') return;
      heard = text;
      if (targets.some((t) => text.includes(t) || likeness(text, t) >= 0.5)) said(true);
      else status();
    };
    recognizer.onState = () => { if (step === 'say') status(); };
    recognizer.onUnavailable = (reason) => {
      input = 'self';
      note = reason;
      if (step === 'say') render();
    };
    recognizer.start([s.say]);
  }

  function status() {
    const h = el.querySelector('#bd-heard');
    if (h) h.textContent = heard ? `Heard: 「${heard}」` : recognizer.listening ? '🎤 Listening…' : 'Starting the mic…';
  }

  function said(yes) {
    if (step !== 'say') return;
    recognizer.stop();
    spoke = yes;
    store.grade({ skill: 'speaking', id: `build:${s.id}`, ok: yes });
    step = 'done';
    render();
    if (yes) fx.hit({ el: el.querySelector('.build-answer') });
    else speaker.speak(s.say, { mps: 3.5, voice: s.voice });
  }

  const off = delegate(el, {
    tile: (b) => { const [t] = bank.splice(+b.dataset.k, 1); placed.push(t); render(); },
    untile: (b) => { const [t] = placed.splice(+b.dataset.k, 1); bank.push(t); render(); },
    clear: () => { bank = bank.concat(placed); placed = []; render(); },
    hint: () => {
      // Place the next right tile (keeping what's already right at the start).
      hinted = true;
      let k = 0;
      while (k < placed.length && placed[k].text === s.tiles[k]) k++;
      bank = bank.concat(placed.splice(k));
      const want = bank.findIndex((t) => t.text === s.tiles[k]);
      if (want >= 0) placed.push(bank.splice(want, 1)[0]);
      render();
    },
    check,
    meetword: (b) => speaker.speak(meet[+b.dataset.k].say, { mps: 3 }),
    learnnew: () => {
      for (const w of meet) store.plant(w.ids[0]);
      meet = [];
      step = 'build';
      render();
    },
    skipnew: () => {
      const k = knownAhead();
      if (k < 0) return;
      // Swap the known sentence into this turn; the skipped one comes back later.
      const a = pos % order.length;
      const b = (pos + k) % order.length;
      [order[a], order[b]] = [order[b], order[a]];
      start();
    },
    mic: () => { if (micOn || step !== 'say') return; micOn = true; speaker.stop(); render(); listen(); },
    hear: () => speaker.speak(s.say, { mps: 3.5, voice: s.voice }),
    'sg-ok': () => said(true),
    'sg-miss': () => said(false),
    'sg-skip': () => { recognizer.stop(); step = 'done'; render(); },
    nextsent: () => { recognizer.stop(); pos++; if (pos % order.length === 0) order = byKnown(); start(); },
  });

  store.markSession();
  if (ctx.today) ctx.today.report(`0/${GOAL}`);
  start();
  return () => { off(); recognizer.stop(); speaker.stop(); };
}
