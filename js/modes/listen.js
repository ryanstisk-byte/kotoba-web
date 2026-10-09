// Listening Lab: short audio-only scenes between the story characters, then comprehension questions.
// Replay and slow buttons; the text appears once the questions are answered (or on request). A miss shows the answer.
import { store } from '../store.js';
import { DIALOGUES, gardenIdsIn } from '../practice-data.js';
import { esc, shuffle, delegate } from '../ui.js';
import { choiceButtons, shuffled, sayAt, linePlayer } from '../practice-ui.js';
import * as fx from '../fx.js';

export function mount(el, ctx) {
  const GOAL = 2;
  let order = shuffle(DIALOGUES.map((_, i) => i));
  let pos = 0;
  let d = null;          // current dialogue
  let qs = [];           // its questions, options shuffled
  let qi = 0;
  let picked = -1;
  let textShown = false;
  let missed = false;
  let finished = 0;
  let right = 0;
  let asked = 0;
  let autoTimer;

  const player = linePlayer((i) => {
    const s = el.querySelector('#ll-status');
    if (s) s.textContent = i >= 0 ? `Playing line ${i + 1} of ${d.lines.length}…` : '';
  });
  const lines = () => d.lines.map((l) => ({ text: l.jp, voice: l.who.voice }));
  const play = (slow = false) => player.play(lines(), { slow });

  function start() {
    d = DIALOGUES[order[pos % order.length]];
    qs = d.questions.map((q) => ({ ...q, ...shuffled(q.options) }));
    qi = 0;
    picked = -1;
    textShown = false;
    missed = false;
    render();
    clearTimeout(autoTimer);
    autoTimer = setTimeout(() => play(), 400);
  }

  const done = () => qi >= qs.length;

  function render() {
    const q = qs[qi];
    const showText = textShown || done();
    el.innerHTML = `
      <div class="stack practice" data-qid="${esc(d.id)}">
        <div class="row-between"><span class="strong mono">${right}/${asked} right · ${finished} scenes</span><span class="small dim">Scene ${(pos % order.length) + 1} of ${order.length}</span></div>
        <div class="panel listen-stage">
          <span class="listen-scene" aria-hidden="true">${d.scene}</span>
          <div class="grow stack-sm">
            <p class="strong big">${esc(d.title)}</p>
            <p class="small dim">${showText ? 'Here is what they said.' : 'Listen: no text yet. Who is talking, and about what?'}</p>
            <p class="small accent-c" id="ll-status" aria-live="polite"></p>
          </div>
        </div>
        <div class="row3">
          <button class="btn" data-act="play">🔊 Replay</button>
          <button class="btn" data-act="slow">🐢 Slow</button>
          <button class="btn" data-act="text" ${showText ? 'disabled' : ''}>Show text</button>
        </div>
        ${showText ? transcript() : ''}
        ${!done() ? `
          <div class="stack-sm" data-question="${qi}">
            <p class="lead strong">${esc(q.q)}</p>
            ${choiceButtons(q.options, { answered: picked >= 0, picked, right: q.right })}
          </div>
          ${picked >= 0 ? feedback(q) : ''}` : `
          <div class="panel good-panel stack-sm">
            <p class="strong good-c">Scene cleared${missed ? '' : ' with every answer right'}!</p>
            <p class="small">Play it once more and follow along with the text: that's when it really sticks.</p>
          </div>
          <button class="btn primary wide" data-act="nextscene">Next scene ▶</button>`}
      </div>`;
  }

  function transcript() {
    return `<div class="panel stack-sm transcript">
      ${d.lines.map((l, i) => `
        <div class="t-line">
          <button class="iconbtn t-play" data-act="line" data-i="${i}" aria-label="Play line ${i + 1}">🔊</button>
          <div class="grow">
            <p class="small strong" style="color:${l.who.color}">${esc(l.who.name)}</p>
            <p class="t-jp" lang="ja">${esc(l.jp)}</p>
            <p class="small dim">${esc(l.en)}</p>
          </div>
        </div>`).join('')}
    </div>`;
  }

  function feedback(q) {
    const ok = picked === q.right;
    return `<div class="panel ${ok ? 'good-panel' : 'note'} stack-sm">
      <p class="strong ${ok ? 'good-c' : 'miss-c'}">${ok ? '✓ Right!' : `Not quite: it's "${esc(q.options[q.right])}".`}</p>
      ${q.why ? `<p class="small" lang="ja">${esc(q.why)}</p>` : ''}
      <button class="btn primary wide" data-act="next">${qi + 1 < qs.length ? 'Next question ▶' : 'Show the text ▶'}</button>
    </div>`;
  }

  function answer(i) {
    if (picked >= 0 || done()) return;
    const q = qs[qi];
    picked = i;
    const ok = i === q.right;
    asked++;
    if (ok) right++; else missed = true;
    store.log(ok);
    store.grade({ skill: 'listening', id: `listen:${d.id}:${qi}`, ok, firstTry: !textShown });
    render();
    if (ok) fx.hit({ el: el.querySelector('.practice-opts .good') }); else fx.miss();
    fx.announce(ok ? 'Right.' : `Not quite. The answer is ${q.options[q.right]}.`);
  }

  function nextQuestion() {
    qi++;
    picked = -1;
    if (done()) {
      finished++;
      // The known words in the scene go into the Garden.
      for (const id of gardenIdsIn(d.lines.map((l) => l.jp).join(' '))) store.plant(id);
      store.markStudied();
      if (ctx.today) {
        ctx.today.report(`${Math.min(finished, GOAL)}/${GOAL}`);
        if (finished >= GOAL) ctx.today.done();
      }
    }
    render();
    if (done()) fx.hit({ big: true, el: el.querySelector('.good-panel') });
  }

  const off = delegate(el, {
    play: () => play(false),
    slow: () => play(true),
    text: () => { textShown = true; render(); },
    line: (b) => { player.stop(); const l = d.lines[+b.dataset.i]; sayAt(l.jp, { voice: l.who.voice }); },
    pick: (b) => answer(+b.dataset.i),
    next: nextQuestion,
    nextscene: () => { player.stop(); pos++; if (pos % order.length === 0) order = shuffle(order); start(); },
  });

  store.markSession();
  if (ctx.today) ctx.today.report(`0/${GOAL}`);
  start();
  return () => { off(); clearTimeout(autoTimer); player.stop(); };
}
