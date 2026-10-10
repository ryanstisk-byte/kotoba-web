// Particle Train (ParticleTrainView.swift): couple the word cars with the right particles.
// A wrong one derails the train, with a reason. Nothing is lost.
import { store } from '../store.js';
import { speaker } from '../audio.js';
import { TRAINS, TRAIN_PALETTE, assembleTrain } from '../data.js';
import { esc, shuffle, delegate } from '../ui.js';
import * as fx from '../fx.js';

export function mount(el, ctx) {
  const GOAL = 6;
  // A course unit can limit practice to its own trains (ctx.trainIds); the mechanics stay the same.
  // Its own trains come first, then others that use only particles taught so far (ctx.extraTrainIds).
  const ids = ctx.trainIds?.length ? ctx.trainIds.filter((i) => TRAINS[i]) : TRAINS.map((_, i) => i);
  const extras = ctx.trainIds?.length ? (ctx.extraTrainIds || []).filter((i) => TRAINS[i] && !ids.includes(i)) : [];
  let order = [...shuffle(ids), ...shuffle(extras)];
  let position = 0;
  let filled = {};
  let activeGap = null;
  let derail = null;
  let departed = false;
  let clean = 0;
  let hadDerail = false;
  let done = 0;

  const sentence = () => TRAINS[order[position % order.length]];
  const openGaps = () => sentence().gaps.map((g, i) => i).filter((i) => sentence().gaps[i] && filled[i] === undefined);

  function render(shake = false) {
    const t = sentence();
    el.innerHTML = `
      <div class="stack">
        <p class="strong mono">${clean} trains departed cleanly</p>
        <p class="lead dim">${esc(t.en)}</p>
        <div class="train-scroll"><div class="train ${shake ? 'shake' : ''}">
          ${t.cars.map((car, i) => `
            <div class="car"><span class="car-body ${i === 0 ? 'engine' : ''}" lang="ja">${esc(car)}</span><span class="wheels"><i></i><i></i></span></div>
            ${i < t.gaps.length ? coupling(i) : ''}`).join('')}
        </div></div>
        ${derail ? `<div class="panel miss-c">⚠️ ${esc(derail)}</div>` : ''}
        ${!departed ? `
          <p class="small dim">${activeGap === null ? 'Tap a coupling (○) to choose its particle.' : 'Pick the particle for the glowing coupling:'}</p>
          <div class="particle-grid">
            ${TRAIN_PALETTE.map((p) => `<button class="btn particle" data-act="place" data-p="${p}" lang="ja" ${activeGap === null ? 'disabled' : ''}>${p}</button>`).join('')}
          </div>` : `
          <p class="lead good-c strong" lang="ja">出発進行！ ${esc(assembleTrain(t, filled))}</p>
          <button class="btn primary wide" data-act="nexttrain">🚃 Next train</button>`}
      </div>`;
    // Let the train roll out of the station (animate after it has been drawn in place).
    if (departed) requestAnimationFrame(() => requestAnimationFrame(() => el.querySelector('.train')?.classList.add('departed')));
  }

  function coupling(i) {
    const g = sentence().gaps[i];
    if (!g) return '<span class="link-bar"></span>';
    const f = filled[i];
    return `<button class="coupling ${activeGap === i ? 'active' : ''} ${f ? 'filled' : ''}" data-act="gap" data-i="${i}" ${f ? 'disabled' : ''} aria-label="Coupling ${i + 1}">${f ? esc(f) : '○'}</button>`;
  }

  function place(particle) {
    const t = sentence();
    const gap = activeGap;
    if (gap === null || !t.gaps[gap]) return;
    const g = t.gaps[gap];
    if (g.correct.includes(particle)) {
      filled[gap] = particle;
      derail = null;
      store.log(true);
      store.grade({ skill: 'grammar', id: `train:${order[position % order.length]}`, ok: true, firstTry: !hadDerail });
      const open = openGaps();
      activeGap = open.length ? open[0] : null;
      if (!open.length) {
        if (!hadDerail) clean++;
        departed = true;
        done++;
        speaker.speak(assembleTrain(t, filled), { mps: 4 });
        if (ctx.today) {
          ctx.today.report(`${Math.min(done, GOAL)}/${GOAL}`);
          if (done >= GOAL) ctx.today.done();
        }
      }
      render();
      if (departed) fx.hit({ big: true, el: el.querySelector('.car-body.engine') }); else fx.hit();
    } else {
      if (!hadDerail) store.log(false);
      store.grade({ skill: 'grammar', id: `train:${order[position % order.length]}`, ok: false, firstTry: !hadDerail });
      hadDerail = true;
      derail = `Derailed! ${particle} doesn't fit here. ${g.why}`;
      render(true);
      fx.miss({ el: el.querySelector('.train') });
    }
  }

  function nextTrain() {
    position++;
    if (position % order.length === 0) order = shuffle(order);
    filled = {};
    derail = null;
    departed = false;
    hadDerail = false;
    activeGap = openGaps()[0] ?? null;
    render();
  }

  const off = delegate(el, {
    gap: (b) => { activeGap = +b.dataset.i; render(); },
    place: (b) => place(b.dataset.p),
    nexttrain: nextTrain,
  });

  store.markSession();
  activeGap = openGaps()[0] ?? null;
  if (ctx.today) ctx.today.report(`0/${GOAL}`);
  render();
  return () => { off(); speaker.stop(); };
}
