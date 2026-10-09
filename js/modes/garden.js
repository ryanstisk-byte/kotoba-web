// Garden (GardenView.swift): every word becomes a plant that needs watering at growing intervals. Nothing ever dies.
import { store, DAILY_REVIEW_CAP } from '../store.js';
import { speaker } from '../audio.js';
import { gardenStage, accentMorae, accentName, toMorae, N5_WORDS } from '../data.js';
import { esc, shuffle, delegate, melodySVG } from '../ui.js';
import * as fx from '../fx.js';

export function mount(el, ctx) {
  const cap = ctx.cap || DAILY_REVIEW_CAP;
  let session = [];
  let position = 0;
  let revealed = false;
  let sessionDone = 0;

  function startDaily() {
    const { queue } = store.dailyGardenQueue(cap);
    session = shuffle(queue);
    position = 0;
    revealed = false;
    render();
  }

  function render() {
    if (session.length && position < session.length) return renderCard(session[position]);
    renderOverview();
  }

  function renderOverview() {
    const planted = store.planted();
    const thirsty = store.thirsty();
    const daily = store.dailyGardenQueue(cap);
    const n = daily.queue.length;
    const reviewedToday = store.day().rev;
    let action = '';
    if (n) {
      action = `<button class="btn primary wide" data-act="water">💧 Water ${n} plant${n === 1 ? '' : 's'}</button>`;
    } else if (thirsty.length) {
      action = `<div class="panel note">Today's watering is done (${reviewedToday} reviewed). ${thirsty.length} more can wait for tomorrow; nothing wilts.</div>
        <button class="btn wide" data-act="extra">Optional extra round (${Math.min(thirsty.length, 20)})</button>`;
    }
    el.innerHTML = `
      <div class="stack">
        <div class="hero-jp good-c">庭</div>
        <p class="dim">${planted.length === 0
          ? "Your garden is empty. Words you meet in Rhythm, Story and Kanji Forge get planted here. Watering also introduces up to 5 new words a day: starter phrases first, then the N5 deck."
          : `${planted.length} plants. ${thirsty.length} need water. Plants grow each time you remember them, and they never die if you're away.`}</p>
        ${planted.length ? `<p class="small dim">N5 deck: ${planted.filter((p) => p.item.deck === 'n5').length} of ${N5_WORDS.length} words planted, up to 5 new a day.</p>` : ''}
        ${daily.waiting ? `<p class="small dim">Big backlog? Only ${cap} a day, most overdue first. The other ${daily.waiting} wait patiently.</p>` : ''}
        ${action}
        <div class="plant-grid">
          ${planted.map(({ item, prog }) => `
            <div class="plant" title="${esc(item.reading)} · ${esc(item.en)}">
              <span class="plant-emoji">${gardenStage(prog.level)}${prog.due <= Date.now() ? '<span class="drop">💧</span>' : ''}</span>
              <span class="plant-jp">${esc(item.jp)}</span>
            </div>`).join('')}
        </div>
      </div>`;
  }

  function renderCard(item) {
    el.innerHTML = `
      <div class="card-review">
        <p class="small dim mono">${position + 1} / ${session.length}</p>
        <div class="review-jp"${item.id.includes('|') ? ' data-noruby' : ''}>${esc(item.jp)}</div>
        ${item.deck === 'n5' ? '<p class="tiny dim">N5 word</p>' : ''}
        ${revealed
          ? `<p class="lead dim">${esc(item.reading)}</p><p class="lead trace-c strong">${esc(item.en)}</p>${item.deck === 'n5' ? n5Details(item) : ''}`
          : `<p class="dim">${ctx.quiet ? 'Say it in your head' : 'Say it out loud'} and recall the meaning, then check.</p>`}
        <div class="spacer"></div>
        ${revealed
          ? `<div class="row2"><button class="btn" data-act="forgot">↩ Forgot</button><button class="btn primary" data-act="knew">✓ Knew it</button></div>
             <div class="row2"><button class="btn ghost small-btn" data-act="hear">🔊 Hear it again</button><button class="btn ghost small-btn" data-act="slow">🐢 Slowly</button></div>`
          : `<button class="btn primary wide" data-act="check">👁 Check</button>`}
      </div>`;
  }

  // N5 deck cards also show the pitch melody and an example sentence.
  function n5Details(item) {
    const morae = accentMorae(item.reading, item.accent);
    return `
      <div class="n5-pitch" data-noruby title="Pitch: ${esc(accentName(item.accent, toMorae(item.reading).length))}">${melodySVG(morae, { height: 64 })}</div>
      <p class="tiny dim">Pitch: ${esc(accentName(item.accent, morae.length))}</p>
      ${item.ex ? `<div class="panel n5-ex">
        <p class="lead">${esc(item.ex)}</p>
        <p class="small dim">${esc(item.exEn)}</p>
        <button class="btn ghost small-btn" data-act="hearEx">🔊 Example</button>
      </div>` : ''}`;
  }

  const sayOf = (item) => item.say || item.reading;

  function answer(ok) {
    const item = session[position];
    store.recordReview(item.id, ok);
    store.grade({ skill: 'vocab', id: item.id, ok });
    sessionDone++;
    revealed = false;
    position++;
    if (ctx.today) ctx.today.report(`${Math.min(position, session.length)}/${session.length}`);
    if (position >= session.length) {
      session = [];
      if (ctx.today) ctx.today.done();
    }
    render();
    if (ok) fx.hit({ big: !session.length }); else fx.miss();
  }

  const off = delegate(el, {
    water: startDaily,
    extra: () => { session = shuffle(store.thirsty().slice(0, 20)); position = 0; revealed = false; render(); },
    check: () => { revealed = true; speaker.speak(sayOf(session[position]), { mps: 3.5 }); render(); },
    hear: () => speaker.speak(sayOf(session[position]), { mps: 3.5 }),
    slow: () => speaker.speak(sayOf(session[position]), { mps: 2.5, speed: 'slow' }),
    hearEx: () => speaker.speak(session[position].ex, { mps: 4 }),
    forgot: () => answer(false),
    knew: () => answer(true),
  });

  const onKey = (e) => {
    if (!session.length || position >= session.length) return;
    if (e.key === ' ' || e.key === 'Enter') {
      if (!revealed) { e.preventDefault(); el.querySelector('[data-act=check]')?.click(); }
    } else if (revealed && (e.key === '1' || e.key === 'ArrowLeft')) answer(false);
    else if (revealed && (e.key === '2' || e.key === 'ArrowRight')) answer(true);
  };
  window.addEventListener('keydown', onKey);

  if (ctx.today) {
    const { queue } = store.dailyGardenQueue(cap);
    if (queue.length) { startDaily(); ctx.today.report(`0/${session.length}`); }
    else { render(); ctx.today.done(store.thirsty().length ? "Today's watering is done. The rest wait for later days; nothing wilts." : 'Nothing to water right now. Your garden is fine.'); }
  } else {
    render();
  }

  return () => { off(); window.removeEventListener('keydown', onKey); speaker.stop(); };
}
