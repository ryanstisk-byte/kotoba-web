// Conjugation Dojo: rapid-fire verb and adjective forms (ます, ない, た, て, plain) for words from the N5 deck and
// the story. A right answer moves straight on; a miss shows the answer with a short "why" and comes back later.
import { store } from '../store.js';
import { speaker } from '../audio.js';
import { CONJ_WORDS, VERB_FORMS, ADJ_FORMS, FORM_LABEL, conjugate, conjPrompt, conjDistractors, conjWhy } from '../practice-data.js';
import { esc, shuffle, pick, delegate } from '../ui.js';
import { choiceButtons, shuffled } from '../practice-ui.js';
import * as fx from '../fx.js';

const ROUND = 12;

/** One question: a word and a form, with the right answer and up to three slips to choose from. */
function makeQuestion(word, form) {
  const answer = conjugate(word, form);
  const wrong = shuffle(conjDistractors(word, form)).slice(0, 3);
  return { word, form, answer, prompt: conjPrompt(word, form), ...shuffled([answer.jp, ...wrong]) };
}

function newRound() {
  // Mostly verbs, some adjectives; never the same word twice in a row.
  const qs = [];
  let lastWord = null;
  while (qs.length < ROUND) {
    const wantVerb = Math.random() < 0.7;
    const word = pick(CONJ_WORDS.filter((w) => (w.type === 'verb') === wantVerb && w !== lastWord));
    const form = pick(word.type === 'verb' ? VERB_FORMS : ADJ_FORMS);
    qs.push(makeQuestion(word, form));
    lastWord = word;
  }
  return qs;
}

export function mount(el, ctx) {
  let qs = newRound();
  let i = 0;
  let picked = -1;
  let right = 0;
  let answered = 0;
  let combo = 0;
  let bestCombo = 0;
  let retried = new Set();
  let missedWords = [];
  let roundDone = false;
  let autoTimer;

  const q = () => qs[i];

  function render() {
    if (roundDone) return renderSummary();
    const cur = q();
    const isAdj = cur.word.type === 'adj';
    el.innerHTML = `
      <div class="stack practice conj" data-qid="${esc(cur.word.jp)}|${cur.form}">
        <div class="row-between"><span class="strong mono">${right}/${answered} · ${Math.min(i + 1, qs.length)} of ${qs.length}</span>
          <span class="accent-c strong">${combo > 1 ? '×' + combo : ''}</span></div>
        <div class="bar"><span style="width:${(i / qs.length) * 100}%"></span></div>
        <div class="panel conj-card center-text stack-sm">
          <p class="small dim">${isAdj ? (cur.word.group === 'na' ? 'な-adjective' : 'い-adjective') : 'verb'} · ${esc(cur.word.en)}</p>
          <p class="conj-word" lang="ja">${esc(cur.prompt.jp)}</p>
          <p class="conj-form"><span aria-hidden="true">→ </span>${esc(FORM_LABEL[cur.form])}</p>
        </div>
        ${choiceButtons(cur.options, { answered: picked >= 0, picked, right: cur.right, ja: true })}
        ${picked >= 0 && picked !== cur.right ? `
          <div class="panel note stack-sm">
            <p class="strong miss-c" lang="ja">It's ${esc(cur.answer.jp)}${cur.answer.jp !== cur.answer.kana ? ` (${esc(cur.answer.kana)})` : ''}.</p>
            <p class="small" lang="ja">${esc(conjWhy(cur.word, cur.form))}</p>
            <div class="row2"><button class="btn" data-act="hear">🔊 Hear it</button><button class="btn primary" data-act="next">Next ▶</button></div>
          </div>` : ''}
        ${picked >= 0 && picked === cur.right ? '<button class="btn primary wide" data-act="next">Next ▶</button>' : ''}
      </div>`;
  }

  function renderSummary() {
    const pct = answered ? Math.round((right / answered) * 100) : 0;
    const uniq = [...new Map(missedWords.map((m) => [m.word.jp + m.form, m])).values()];
    el.innerHTML = `
      <div class="stack center-text practice">
        <div class="score-huge accent-c mono">${pct}%</div>
        <p class="strong lead">${right} of ${answered} right · best combo ×${bestCombo}</p>
        ${uniq.length ? `<div class="panel left-text stack-sm">
          <p class="section-label">WORTH ANOTHER LOOK</p>
          ${uniq.map((m) => `<div class="word-row"><span lang="ja">${esc(m.word.jp)}</span><span class="dim">${esc(FORM_LABEL[m.form])}</span><span class="grow"></span><span class="strong" lang="ja">${esc(m.answer.jp)}</span></div>`).join('')}
        </div>` : '<p class="dim">Clean round. Nice.</p>'}
        <button class="btn primary wide" data-act="again">↻ Another round</button>
      </div>`;
  }

  function answer(k) {
    if (picked >= 0) return;
    const cur = q();
    picked = k;
    const ok = k === cur.right;
    const key = cur.word.jp + '|' + cur.form;
    const firstTry = !retried.has(key);
    answered++;
    if (ok) { right++; combo++; bestCombo = Math.max(bestCombo, combo); } else combo = 0;
    if (firstTry) store.log(ok);
    store.grade({ skill: 'grammar', id: `conj:${key}`, ok, firstTry });
    if (cur.word.garden) store.plant(cur.word.garden);
    if (!ok) {
      missedWords.push(cur);
      if (firstTry) {
        // Ask it again a little later, with the options in a new order.
        retried.add(key);
        qs.splice(Math.min(qs.length, i + 3), 0, { ...cur, ...shuffled([cur.answer.jp, ...cur.options.filter((o) => o !== cur.answer.jp)]) });
      }
    }
    speaker.speak(cur.answer.jp, { mps: 4 });
    if (ctx.today) ctx.today.report(`${Math.min(answered, ROUND)}/${ROUND}`);
    render();
    if (ok) fx.hit({ el: el.querySelector('.practice-opts .good') }); else fx.miss();
    fx.announce(ok ? 'Right.' : `Not quite. It's ${cur.answer.jp}.`);
    if (ok) {
      const at = i;
      clearTimeout(autoTimer);
      autoTimer = setTimeout(() => { if (i === at && picked >= 0) next(); }, 900);
    }
  }

  function next() {
    clearTimeout(autoTimer);
    i++;
    picked = -1;
    if (i >= qs.length) {
      roundDone = true;
      store.markStudied();
      if (ctx.today) { ctx.today.report(`${ROUND}/${ROUND}`); ctx.today.done(); }
      render();
      fx.hit({ big: true, el: el.querySelector('.score-huge') });
      return;
    }
    render();
  }

  const off = delegate(el, {
    pick: (b) => answer(+b.dataset.i),
    next,
    hear: () => speaker.speak(q().answer.jp, { mps: 3.5 }),
    again: () => {
      qs = newRound(); i = 0; picked = -1; right = 0; answered = 0; combo = 0; retried = new Set(); missedWords = []; roundDone = false;
      render();
    },
  });

  store.markSession();
  if (ctx.today) ctx.today.report(`0/${ROUND}`);
  render();
  return () => { off(); clearTimeout(autoTimer); speaker.stop(); };
}
