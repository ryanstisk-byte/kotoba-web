// Pitch Duel (PitchDuelView.swift): listen (a different voice each time) and pick the melody, or the word, you heard.
import { store } from '../store.js';
import { speaker } from '../audio.js';
import { PHRASES } from '../data.js';
import { esc, shuffle, pick, delegate, melodySVG } from '../ui.js';
import * as fx from '../fx.js';

/** Every standard Tokyo accent pattern for a word of n morae (type 0 = flat, type k = drop after mora k). */
export function allPatterns(n) {
  if (n <= 0) return [];
  const out = [];
  out.push([...Array(n)].map((_, i) => i > 0 || n === 1));     // heiban
  out.push([...Array(n)].map((_, i) => i === 0));               // atamadaka
  if (n >= 3) for (let k = 2; k < n; k++) out.push([...Array(n)].map((_, i) => i > 0 && i < k));
  const seen = new Set();
  return out.filter((p) => { const key = p.join(); if (seen.has(key)) return false; seen.add(key); return true; });
}

export function distractor(morae) {
  const correct = morae.map((x) => x.high).join();
  const options = allPatterns(morae.length).filter((p) => p.join() !== correct);
  const choice = options.length ? pick(options) : morae.map((x) => !x.high);
  return morae.map((x, i) => ({ kana: x.kana, high: choice[i], silent: x.silent }));
}

export function mount(el, ctx) {
  const GOAL = 10;
  let question = null;
  let chosen = null;
  let right = 0;
  let asked = 0;
  let timer;

  function nextQuestion() {
    chosen = null;
    const bosses = PHRASES.filter((p) => p.isBoss);
    // Half the time a true minimal pair (same sounds, different pitch), otherwise a melody choice.
    if (Math.random() < 0.5) {
      const answer = pick(bosses);
      const partners = bosses.filter((p) => p.kana === answer.kana);
      question = { answer, isPair: true, options: shuffle(partners).map((p) => ({ label: p.prompt, morae: p.morae, correct: p.id === answer.id })) };
    } else {
      const answer = pick(PHRASES.filter((p) => !p.isBoss));
      const opts = shuffle([{ morae: answer.morae, correct: true }, { morae: distractor(answer.morae), correct: false }]);
      question = { answer, isPair: false, options: opts.map((o, i) => ({ ...o, label: i === 0 ? 'A' : 'B' })) };
    }
    render();
    clearTimeout(timer);
    question.voice = Math.floor(Math.random() * 4);
    // Only the voice label changes here: redrawing the whole screen could swallow a tap that's landing right now.
    timer = setTimeout(() => { speaker.speak(question.answer.speak, { mps: 3.5, voice: question.voice }); showVoice(); }, 300);
  }

  function showVoice() {
    const v = el.querySelector('.duel-voice');
    if (v) v.textContent = speaker.currentVoiceName ? 'Voice: ' + speaker.currentVoiceName : '';
  }

  function colorFor(i) {
    if (chosen === null) return 'var(--accent)';
    if (question.options[i].correct) return 'var(--good)';
    return i === chosen ? 'var(--miss)' : 'var(--dim)';
  }

  function render() {
    const q = question;
    const ok = chosen !== null && q.options[chosen].correct;
    el.innerHTML = `
      <div class="stack">
        <div class="row-between"><span class="strong mono">${right}/${asked} correct</span>
          <span class="small dim duel-voice">${speaker.currentVoiceName ? 'Voice: ' + esc(speaker.currentVoiceName) : ''}</span></div>
        <p class="lead strong">${q.isPair ? 'Which one did you hear?' : 'Which melody did you hear?'}</p>
        ${q.isPair ? '' : `<p class="dim" lang="ja">${esc(q.answer.display)} · ${esc(q.answer.meaning)}</p>`}
        <button class="btn wide" data-act="play">🔊 Play again (new voice)</button>
        ${q.options.map((o, i) => `
          <button class="panel duel-opt ${chosen !== null && o.correct ? 'correct' : ''}" data-act="choose" data-i="${i}" ${chosen !== null ? 'disabled' : ''}>
            <span class="duel-label ${q.isPair ? 'emoji' : ''}">${esc(o.label)}</span>
            <span class="grow">${melodySVG(o.morae, { color: colorFor(i) })}</span>
          </button>`).join('')}
        ${chosen !== null ? `
          <p class="${ok ? 'good-c' : 'miss-c'}">${ok ? 'Yes! Listen once more to lock it in.' : 'Not quite. The green one is right: play it again and follow that melody.'}</p>
          <button class="btn primary wide" data-act="next">Next ▶</button>` : ''}
        ${!speaker.hasClip(q.answer.speak) && speaker.supported && !speaker.voices.length ? '<p class="small miss-c">No Japanese voice found on this device. Install one (see Settings) for real pitch.</p>' : ''}
        <p class="tiny dim">Built-in voices usually get pitch accent right, but not always. Trust OJAD over the voice if they disagree.</p>
      </div>`;
  }

  function choose(i) {
    chosen = i;
    asked++;
    const ok = question.options[i].correct;
    if (ok) right++;
    store.recordSlice(question.answer, ok);
    store.grade({ skill: 'pitch', id: question.answer.id, ok });
    // After answering, replay the right answer so the contrast sticks.
    speaker.speak(question.answer.speak, { mps: 3.0, voice: question.voice });
    if (ctx.today) {
      ctx.today.report(`${Math.min(asked, GOAL)}/${GOAL}`);
      if (asked >= GOAL) ctx.today.done();
    }
    render();
    if (ok) fx.hit({ el: el.querySelector('.duel-opt.correct') }); else fx.miss();
    fx.announce(ok ? 'Right.' : 'Not quite. The right one is now marked.');
  }

  const off = delegate(el, {
    play: () => { question.voice = (question.voice + 1) % 4; speaker.speak(question.answer.speak, { mps: 3.5, voice: question.voice }); showVoice(); },
    choose: (b) => choose(+b.dataset.i),
    next: nextQuestion,
  });
  const offVoices = speaker.onVoices(() => question && render());

  store.markSession();
  if (ctx.today) ctx.today.report(`0/${GOAL}`);
  nextQuestion();
  return () => { off(); offVoices(); clearTimeout(timer); speaker.stop(); };
}
