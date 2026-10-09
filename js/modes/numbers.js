// Numbers & Time: prices, times, dates and counters by ear, as tiny scenes (train times, shop prices…).
// Listen, pick the number. Replay, slow and a text button help; a miss shows the answer and the rule behind it.
import { store } from '../store.js';
import { speaker } from '../audio.js';
import { NUMBER_SCENES } from '../practice-data.js';
import { esc, shuffle, delegate } from '../ui.js';
import { choiceButtons, shuffled, sayAt } from '../practice-ui.js';
import * as fx from '../fx.js';

const ROUND = 8;
const KIND = { time: '🕒 What time?', price: '💴 How much?', date: '📅 Which day?', count: '🔢 How many?' };

export function mount(el, ctx) {
  let qs = [];
  let i = 0;
  let picked = -1;
  let textShown = false;
  let right = 0;
  let answered = 0;
  let roundDone = false;
  let autoTimer;

  function newRound() {
    // A mix of every kind: shuffle within each kind, then deal them out in turn.
    const byKind = Object.keys(KIND).map((k) => shuffle(NUMBER_SCENES.filter((s) => s.kind === k)));
    const dealt = [];
    for (let r = 0; dealt.length < ROUND; r++) for (const list of shuffle(byKind)) if (list[r] && dealt.length < ROUND) dealt.push(list[r]);
    qs = dealt.map((s) => ({ s, ...shuffled(s.options) }));
    i = 0; right = 0; answered = 0; roundDone = false;
    begin();
  }

  const q = () => qs[i];
  const play = (slow = false) => { const cur = q(); if (cur && !roundDone) sayAt(cur.s.jp, { voice: cur.s.voice, slow, mps: 4 }); };

  function begin() {
    picked = -1;
    textShown = false;
    render();
    clearTimeout(autoTimer);
    autoTimer = setTimeout(() => play(), 350);
  }

  function render() {
    if (roundDone) {
      el.innerHTML = `
        <div class="stack center-text practice">
          <div class="score-huge accent-c mono">${right}/${answered}</div>
          <p class="strong lead">numbers caught by ear</p>
          <p class="dim">Numbers are hard for everyone at first. The ones you missed will come round again.</p>
          <button class="btn primary wide" data-act="again">↻ Another round</button>
        </div>`;
      return;
    }
    const { s, options, right: r } = q();
    const done = picked >= 0;
    el.innerHTML = `
      <div class="stack practice numbers" data-qid="${esc(s.id)}">
        <div class="row-between"><span class="strong mono">${right}/${answered} right</span><span class="small dim mono">${i + 1}/${qs.length}</span></div>
        <div class="panel listen-stage">
          <span class="listen-scene" aria-hidden="true">${s.scene}</span>
          <div class="grow stack-sm">
            <p class="small strong accent-c">${KIND[s.kind]}</p>
            ${textShown || done ? `<p class="t-jp" lang="ja">${esc(s.jp)}</p><p class="small dim">${esc(s.en)}</p>` : '<p class="dim">🔊 Listen…</p>'}
          </div>
        </div>
        <div class="row3">
          <button class="btn" data-act="play">🔊 Replay</button>
          <button class="btn" data-act="slow">🐢 Slow</button>
          <button class="btn" data-act="text" ${textShown || done ? 'disabled' : ''}>Show text</button>
        </div>
        <p class="lead strong">${esc(s.q)}</p>
        ${choiceButtons(options, { answered: done, picked, right: r })}
        ${done ? `<div class="panel ${picked === r ? 'good-panel' : 'note'} stack-sm">
            <p class="strong ${picked === r ? 'good-c' : 'miss-c'}">${picked === r ? '✓ Right!' : `Not quite: it's ${esc(options[r])}.`}</p>
            <p class="small" lang="ja">${esc(s.why)}</p>
            <button class="btn primary wide" data-act="next">${i + 1 < qs.length ? 'Next ▶' : 'Finish ▶'}</button>
          </div>` : ''}
      </div>`;
  }

  function answer(k) {
    if (picked >= 0) return;
    const { s, right: r } = q();
    picked = k;
    const ok = k === r;
    answered++;
    if (ok) right++;
    store.log(ok);
    store.grade({ skill: 'counters', id: 'num:' + s.id, ok, firstTry: !textShown });
    if (!textShown) store.grade({ skill: 'listening', id: 'num:' + s.id, ok });
    for (const id of s.garden) store.plant(id);
    if (ctx.today) ctx.today.report(`${Math.min(answered, ROUND)}/${ROUND}`);
    render();
    if (ok) fx.hit({ el: el.querySelector('.practice-opts .good') }); else { fx.miss(); play(true); }
    fx.announce(ok ? 'Right.' : `Not quite. It's ${q().options[r]}.`);
  }

  function next() {
    i++;
    if (i >= qs.length) {
      clearTimeout(autoTimer);
      roundDone = true;
      store.markStudied();
      if (ctx.today) { ctx.today.report(`${ROUND}/${ROUND}`); ctx.today.done(); }
      render();
      fx.hit({ big: true, el: el.querySelector('.score-huge') });
      return;
    }
    begin();
  }

  const off = delegate(el, {
    play: () => play(false),
    slow: () => play(true),
    text: () => { textShown = true; render(); },
    pick: (b) => answer(+b.dataset.i),
    next,
    again: newRound,
  });

  store.markSession();
  if (ctx.today) ctx.today.report(`0/${ROUND}`);
  newRound();
  return () => { off(); clearTimeout(autoTimer); speaker.stop(); };
}
