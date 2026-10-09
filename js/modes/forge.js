// Kanji Forge (KanjiForgeView.swift): combine components into a kanji to unlock a real word.
import { store } from '../store.js';
import { speaker } from '../audio.js';
import { KANJI, PART_NAMES } from '../data.js';
import { esc, shuffle, delegate, pick } from '../ui.js';

export function mount(el, ctx) {
  const GOAL = 3;
  let target = null;
  let tray = [];
  let anvil = [];
  let message = null;
  let forged = false;
  let showStory = false;
  let practice = false;   // all 12 forged: re-forge old ones for practice
  let done = 0;
  let firstTry = true;

  function nextTarget() {
    forged = false;
    showStory = false;
    message = null;
    anvil = [];
    firstTry = true;
    const have = store.forgedKanji;
    const remaining = KANJI.filter((k) => !have.has(k.kanji));
    practice = remaining.length === 0 && (practice || !!ctx.today);
    target = remaining[0] || (practice ? pick(KANJI.filter((k) => k !== target)) : null);
    if (!target) return;
    const uniq = [...new Set(target.parts)];
    const others = shuffle(Object.keys(PART_NAMES).filter((p) => !target.parts.includes(p))).slice(0, 8 - uniq.length);
    tray = shuffle(uniq.concat(others));
  }

  const tile = (part, hi, act, i) => `<button class="part ${hi ? 'hi' : ''}" data-act="${act}" data-i="${i}" lang="ja">
      <span class="part-k">${esc(part)}</span><span class="part-n">${esc(PART_NAMES[part] || '')}</span></button>`;

  function render() {
    const have = store.forgedKanji;
    const t = target;
    el.innerHTML = `
      <div class="stack">
        <div>
          <p class="strong mono">Forged ${have.size} of ${KANJI.length}</p>
          <div class="bar"><span style="width:${(have.size / KANJI.length) * 100}%"></span></div>
        </div>
        ${t ? `
          <div>
            <p class="small dim">${practice ? 'Practice: re-forge the kanji for' : 'Forge the kanji for'}</p>
            <p class="forge-meaning">"${esc(t.meaning)}"</p>
            ${showStory ? `<p class="trace-c">${esc(t.story)}</p>` : '<button class="linkbtn" data-act="story">Show the story hint</button>'}
          </div>
          <div class="panel anvil">
            ${forged ? `
              <div class="forged-k" lang="ja">${esc(t.kanji)}</div>
              <p class="strong lead" lang="ja">${esc(t.word)} (${esc(t.reading)}): ${esc(t.wordEn)}</p>
              <p class="small dim">${practice ? 'Already growing in your garden.' : 'Planted in your garden.'}</p>`
            : `<div class="anvil-row">${anvil.length ? anvil.map((p, i) => tile(p, true, 'unplace', i)).join('') : '<span class="dim small">Tap parts to place them on the anvil</span>'}</div>`}
          </div>
          ${message ? `<p class="miss-c">${esc(message)}</p>` : ''}
          ${forged
            ? '<button class="btn primary wide" data-act="next">🔨 Next kanji</button>'
            : `<div class="part-grid">${tray.map((p, i) => tile(p, false, 'add', i)).join('')}</div>
               <button class="btn primary wide" data-act="strike" ${anvil.length ? '' : 'disabled'}>🔨 Strike the anvil</button>`}
        ` : `<p>You've forged every kanji in this set. More are coming.</p>
             <button class="btn wide" data-act="practice">Practice re-forging</button>`}
        ${have.size ? `<p class="section-label">YOUR FORGE</p>
          <div class="forge-grid">${KANJI.filter((k) => have.has(k.kanji)).map((k) => `<span class="panel forge-k" lang="ja" title="${esc(k.word)} · ${esc(k.wordEn)}">${esc(k.kanji)}</span>`).join('')}</div>` : ''}
      </div>`;
  }

  function strike() {
    const t = target;
    const a = anvil.slice().sort().join();
    const b = t.parts.slice().sort().join();
    if (a === b) {
      forged = true;
      message = null;
      if (firstTry) store.log(true);
      if (!practice) {
        store.forge(t.kanji);
        store.plant(t.gardenID);
      }
      speaker.speak(t.reading, { mps: 3 });
      done++;
      if (ctx.today) {
        ctx.today.report(`${Math.min(done, GOAL)}/${GOAL}`);
        if (done >= GOAL) ctx.today.done();
      }
    } else {
      if (firstTry) store.log(false);
      firstTry = false;
      message = `Not quite. This kanji needs ${t.parts.length} parts.`;
      anvil = [];
    }
    render();
  }

  const off = delegate(el, {
    story: () => { showStory = true; render(); },
    add: (b) => { if (anvil.length < 3) { anvil.push(tray[+b.dataset.i]); render(); } },
    unplace: (b) => { anvil.splice(+b.dataset.i, 1); render(); },
    strike,
    next: () => { nextTarget(); render(); },
    practice: () => { practice = true; nextTarget(); render(); },
  });

  store.markSession();
  nextTarget();
  if (ctx.today) ctx.today.report(`0/${GOAL}`);
  render();
  return () => { off(); speaker.stop(); };
}
