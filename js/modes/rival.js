// Rival Battle: a monster-battle-style fight built entirely from review. The rival (top) and your fighter (bottom,
// seen from behind: Ren, Aoi, or a story character you've met) each have a name card and a stamina bar that runs green,
// then yellow, then red. Each attack is a quick recall item from what you've already learned (js/rival-items.js),
// thrown as a speech bubble that travels toward you: answer before it lands (tap, or out loud with the mic, never in
// Quiet mode) to counter it and hit the rival. A wrong answer or a bubble that lands costs you some stamina, the rival
// says the answer, and the item comes back later in the fight. Right answers in a row build a combo that ends in a
// finisher. You can't lose: run out of stamina and the fight turns into a short training montage on the missed items,
// and the rival respects you anyway. The bubble is generous and adapts to aim at ~85% (attackTime), saying it out
// loud pauses it, and nothing is saved beyond the usual grading: no win counters.
import { store } from '../store.js';
import { speaker, Recognizer, recognitionSupported, normalizeJa } from '../audio.js';
import { RIVALS, RIVAL_BY_ID, FINISHERS, MONTAGE_LINE, FIGHTERS, FIGHTER_BY_ID } from '../rival-data.js';
import { attackPool, planFight, nextAttack, optionsFor, unlockedRivals, MIN_ITEMS } from '../rival-items.js';
import { levelBar, itemOpen, lockLine, levelOf } from '../levels.js';
import { sprite } from '../rival-art.js';

export { unlockedRivals };
import { esc, pick, delegate, howTo } from '../ui.js';
import { choiceButtons, sayAt } from '../practice-ui.js';
import * as fx from '../fx.js';

/** Right answers in a row that end in a finisher (which hits 3 times). */
export const COMBO_FINISH = 4;
const FINISHER_HITS = 3;
/** Attacks in a fight at most (comebacks included), so a fight stays about 5 minutes. */
const MAX_TURNS = 16;
/** A missed attack comes back this many turns later. */
const COMEBACK = 3;
/** Your fighter's stamina, what an attack that gets through takes, and what a finisher wins back. */
export const REN_HP = 20;
export const COUNTER_DAMAGE = 5;
const FINISHER_HEAL = 5;

/** Whether the fight has gone badly enough to turn into a training montage: your fighter is out of stamina. */
export function needsMontage({ myHp }) {
  return myHp <= 0;
}

/** Stamina colour band for a bar at `pct` (0..100): green, then yellow at half, red under a fifth. */
export function hpBand(pct) {
  return pct > 50 ? 'hp-high' : pct > 20 ? 'hp-mid' : 'hp-low';
}

/**
 * How long (ms) an attack's bubble takes to reach your fighter. Generous for a beginner, longer for a sentence or a listening
 * attack, and adapted to aim at ~85%: longer while the fight's accuracy is under 80%, a little shorter over 90%.
 * Slow speech (the turtle setting) stretches it too.
 */
export function attackTime(a, { ok = 0, tot = 0 } = {}, slow = false) {
  let t = a.listen ? 11 : a.kind === 'kana' ? 8 : a.kind === 'particle' || a.kind === 'conj' ? 13 : 10;
  const rate = tot >= 3 ? ok / tot : null;
  if (rate != null && rate < 0.8) t *= 1.3;
  else if (rate != null && rate > 0.9) t *= 0.85;
  if (slow) t *= 1.25;
  return Math.round(t * 1000);
}

/** Fighters you can play as now: Ren and Aoi, and each story character once they've challenged you. */
export function availableFighters() {
  const met = new Set(unlockedRivals().map((r) => r.id));
  return FIGHTERS.filter((x) => !x.meet || met.has(x.meet));
}

/** Which fighter you play as stays on this device (kotobaBeat.fighter), like other per-device choices. */
const FIGHTER_KEY = 'kotobaBeat.fighter';
function savedFighter() {
  let id = null;
  try { id = localStorage.getItem(FIGHTER_KEY); } catch (e) { /* storage blocked: Ren */ }
  return availableFighters().find((x) => x.id === id) || FIGHTER_BY_ID.ren;
}

/** How alike two strings are (shared character pairs), 0..1. Generous: recognition is imperfect. */
export function likeness(a, b) {
  const pairs = (s) => { const out = []; for (let i = 0; i < s.length - 1; i++) out.push(s.slice(i, i + 2)); return out.length ? out : [s]; };
  const pa = pairs(a);
  const pool = [...pairs(b)];
  let hit = 0;
  for (const p of pa) { const j = pool.indexOf(p); if (j >= 0) { hit++; pool.splice(j, 1); } }
  return (2 * hit) / (pa.length + pool.length + hit);
}

export function mount(el, ctx) {
  const quiet = !!ctx.quiet;
  const recognizer = new Recognizer();
  let speech = !quiet && recognitionSupported;
  let screen = 'pick';    // pick | fight | montage | end
  let rival = unlockedRivals().slice(-1)[0];
  let f = null;           // the fight
  let me = savedFighter(); // who you fight as
  const timers = [];
  const later = (fn, ms) => timers.push(setTimeout(fn, ms));
  const powered = (r) => levelOf(r) !== 'N5';

  const line = (l, voice, onend) => sayAt(l.jp, { voice, mps: 4, onend });

  function newFight() {
    const pool = attackPool();
    return {
      hp: rival.hp, myHp: REN_HP, hpShown: rival.hp, myShown: REN_HP,
      combo: 0, best: 0, ok: 0, tot: 0, missRow: 0, turn: 0,
      queue: planFight(pool, MAX_TURNS, rival.level), comebacks: [], missed: [], seen: new Set(),
      cur: null, opts: null, picked: -1, how: null, done: false, heard: '', listening: false,
      clock: null, flash: null, ko: null, fainted: false,
      bubble: pick(rival.intro), status: '', finisher: null, montage: null, end: null,
    };
  }

  // ---------- the attack clock (the bubble's flight) ----------
  const elapsed = () => (f && f.clock ? f.clock.used + (f.clock.since != null ? Date.now() - f.clock.since : 0) : 0);

  function startClock() {
    const c = f && f.clock;
    if (!c || c.since != null || f.picked !== -1 || f.listening || document.hidden) return;
    c.since = Date.now();
    c.tid = setTimeout(timeUp, Math.max(0, c.dur - c.used));
    syncBubble();
  }

  function pauseClock() {
    const c = f && f.clock;
    if (!c || c.since == null) return;
    c.used += Date.now() - c.since;
    c.since = null;
    clearTimeout(c.tid);
    syncBubble();
  }

  /** Points the bubble and fuse animations at the clock without re-rendering. */
  function syncBubble() {
    const c = f && f.clock;
    if (!c) return;
    el.querySelectorAll('.atk-bubble, .atk-fuse > i').forEach((n) => {
      n.style.animationDelay = `-${elapsed()}ms`;
      n.style.animationPlayState = c.since != null ? 'running' : 'paused';
      // Restart so the new delay takes effect from where the clock is now.
      const name = n.style.animationName;
      n.style.animationName = 'none';
      void n.offsetWidth;
      n.style.animationName = name;
    });
  }

  function timeUp() {
    if (!f || screen !== 'fight' || f.picked !== -1) return;
    f.clock.used = f.clock.dur;
    f.clock.since = null;
    f.picked = -2;   // nothing picked: it landed
    answer(false, 'late');
  }

  const onVisibility = () => {
    if (!f || screen !== 'fight') return;
    if (document.hidden) pauseClock(); else startClock();
  };
  document.addEventListener('visibilitychange', onVisibility);

  // ---------- screens ----------
  function render() {
    if (screen === 'fight') return renderFight();
    if (screen === 'montage') return renderMontage();
    if (screen === 'end') return renderEnd();
    renderPick();
  }

  function renderPick() {
    const pool = attackPool();
    const open = unlockedRivals();
    const enough = pool.length >= MIN_ITEMS;
    el.innerHTML = `
      <div class="stack practice rival">
        ${levelBar('rival')}
        <p class="lead strong">A rival challenges you. Every attack is something you've already learned.</p>
        ${howTo(`<p>Each attack flies at you as a speech bubble. Answer before it lands${speech ? ', by tapping or saying it out loud' : ''}, and you counter and hit the rival. If it lands, you lose a little stamina and the rival shows you the answer; it comes back later. Answers in a row build a finisher. You can't lose: run out of stamina and you train instead.</p>`)}
        ${quiet ? '<div class="panel note small">Quiet mode: tap answers only.</div>' : ''}
        ${!enough ? `<div class="panel note">The rivals wait until you've learned a little more: a few Garden words, Reading Dojo kana or practice games. (${pool.length} of ${MIN_ITEMS} so far.)</div>` : ''}
        <button class="btn primary wide" data-act="start" ${enough ? '' : 'disabled'}>⚔ Fight ${esc(rival.name)} as ${esc(me.name)}</button>
        <h2 class="section-label">YOUR FIGHTER</h2>
        <div class="fighter-list" role="radiogroup" aria-label="Your fighter">
          ${FIGHTERS.map((x) => {
            const on = availableFighters().includes(x);
            return `<button class="fighter-card ${me === x ? 'on' : ''}" data-act="fighter" data-id="${x.id}" role="radio" aria-checked="${me === x}" ${on ? '' : 'disabled'}
                title="${esc(on ? x.blurb : `Meet ${x.name} in the story first.`)}">
              <span class="fighter-pic sprite" aria-hidden="true">${on ? sprite(x.id, { back: true }) : '<span class="fighter-lock">🔒</span>'}</span>
              <span class="small strong">${esc(on ? x.name : '???')}</span></button>`;
          }).join('')}
        </div>
        <p class="small dim">${esc(me.blurb)}</p>
        <h2 class="section-label">CHOOSE A RIVAL</h2>
        <div class="rival-list">
          ${RIVALS.map((r) => {
            const on = open.includes(r);
            return `<button class="panel rival-card ${rival === r ? 'on' : ''}" data-act="choose" data-id="${r.id}" ${on ? '' : 'disabled'} aria-pressed="${rival === r}" style="--rival:${r.color}">
              <span class="rival-face sprite" aria-hidden="true">${sprite(r.id, { power: powered(r) })}</span>
              <span class="grow left-text"><span class="strong">${esc(r.name)}</span> <span class="small dim" lang="ja" data-noruby>${esc(r.jpName)}</span><br>
                <span class="small dim">${on ? esc(r.blurb) : !itemOpen(r) ? `🔒 ${levelOf(r)}. ${esc(lockLine(levelOf(r)))}` : `🔒 Challenges you after story chapter ${esc(r.after.slice(2))}.`}</span></span>
            </button>`;
          }).join('')}
        </div>
      </div>`;
  }

  /** A stamina bar drawn at what was last shown; animateBars() then runs it to the real value. */
  function hpBar(who, shown, max, name) {
    const pct = Math.max(0, (shown / max) * 100);
    return `<div class="hp-row"><span class="hp-tag">HP</span><div class="rival-hp ${who}-hp" role="meter" aria-label="${esc(name)}'s stamina" aria-valuemin="0" aria-valuemax="${max}" aria-valuenow="${Math.max(0, who === 'foe' ? f.hp : f.myHp)}"><span class="${hpBand(pct)}" style="width:${pct}%"></span></div></div>`;
  }

  function animateBars() {
    if (!f || f.finisher) return;   // the finisher splash covers the arena: drain once it's gone
    const set = (sel, val, max) => {
      const s = el.querySelector(sel);
      if (!s) return;
      const pct = Math.max(0, (val / max) * 100);
      s.style.width = `${pct}%`;
      s.className = hpBand(pct);
    };
    requestAnimationFrame(() => requestAnimationFrame(() => {
      if (!f || screen !== 'fight') return;
      set('.foe-hp > span', f.hp, rival.hp);
      set('.me-hp > span', f.myHp, REN_HP);
      const num = el.querySelector('.me-num');
      if (num) num.textContent = `${Math.max(0, f.myHp)}/${REN_HP}`;
      f.hpShown = f.hp;
      f.myShown = f.myHp;
      if (f.ko && !f.fainted) {
        later(() => {
          if (!f || screen !== 'fight') return;
          f.fainted = true;
          el.querySelector(f.ko === 'foe' ? '.foe-sprite' : '.me-sprite')?.classList.add('ko');
          const t = el.querySelector('.rival-text');
          if (t) t.innerHTML = koText();
          fx.announce(f.ko === 'foe' ? `${rival.name} is down!` : `${me.name} is out of stamina. Time to train.`);
        }, fx.reducedMotion() ? 200 : 950);
      }
    }));
  }

  const koText = () => f.ko === 'foe'
    ? `<span class="strong">${esc(rival.name)} is down!</span>`
    : `<span class="strong">${esc(me.name)} is out of stamina.</span><span class="small dim">Time for a training montage.</span>`;

  function comboPips() {
    return `<span class="rival-combo" aria-label="Combo ${f.combo} of ${COMBO_FINISH}">${Array.from({ length: COMBO_FINISH }, (_, i) => `<i class="${i < f.combo ? 'on' : ''}"></i>`).join('')}</span>`;
  }

  function attackBubble(a) {
    const c = f.clock;
    const answered = f.picked !== -1;
    const state = !answered ? '' : f.how === 'hit' ? 'blocked' : 'landed';
    const anim = `--dur:${c.dur}ms; animation-delay:-${elapsed()}ms; animation-play-state:${c.since != null ? 'running' : 'paused'}`;
    const body = a.listen
      ? '<span class="atk-listen">🔊 Listen</span>'
      : `<span class="rival-prompt ${a.promptJa ? '' : 'latin'}" ${a.promptJa ? 'lang="ja"' : ''} ${a.noruby ? 'data-noruby' : ''}>${esc(a.prompt)}</span>`;
    return `<div class="atk-bubble ${state}" style="${anim}" aria-hidden="${answered}">
        <div class="atk-in">${body}${a.promptEn ? `<span class="small dim">${esc(a.promptEn)}</span>` : ''}
        <span class="atk-fuse" aria-hidden="true"><i style="${anim}"></i></span></div></div>`;
  }

  function renderFight() {
    const a = f.cur;
    const answered = f.picked !== -1;
    const right = answered && f.how === 'hit';
    const flash = f.flash;
    f.flash = null;
    const status = f.fainted ? koText()
      : f.bubble ? `<span lang="ja">${esc(f.bubble.jp)}</span><span class="small dim">${esc(f.bubble.en)}</span>`
        : `<span class="small">${esc(f.status || `${rival.name} attacks!`)}</span>`;
    el.innerHTML = `
      <div class="stack practice rival" data-key="${esc(a.key)}" data-kind="${a.kind}" style="--rival:${rival.color}">
        <div class="arena">
          <div class="bcard foe-card">
            <div class="row-between"><span class="strong">${esc(rival.name)}</span><span class="lv mono small">${esc(levelOf(rival))}</span></div>
            ${hpBar('foe', f.hpShown, rival.hp, rival.name)}
          </div>
          <div class="foe-sprite sprite ${f.fainted && f.ko === 'foe' ? 'ko' : ''} ${flash === 'foe' ? 'hurt' : ''}">${sprite(rival.id, { power: powered(rival), label: rival.name })}</div>
          <div class="me-sprite sprite ${f.fainted && f.ko === 'me' ? 'ko' : ''} ${flash === 'me' ? 'hurt' : ''}">${sprite(me.id, { back: true, label: `${me.name}, you` })}</div>
          <div class="bcard me-card">
            <div class="row-between"><span class="strong">${esc(me.name)}</span><span class="small dim">you</span></div>
            ${hpBar('me', f.myShown, REN_HP, me.name)}
            <div class="me-num mono small">${Math.max(0, f.myShown)}/${REN_HP}</div>
          </div>
          ${f.ko ? '' : attackBubble(a)}
        </div>
        <div class="rival-text ${f.bubble || f.fainted ? '' : 'quiet'}" aria-live="polite">${status}</div>
        <div class="row-between small"><span class="dim">Combo ${comboPips()}</span><span class="dim">Attack ${f.turn} · ${f.ok}/${f.tot}</span></div>
        <p class="small dim center-text atk-ask">${esc(a.ask)}</p>
        ${a.listen ? '<button class="btn quiz-listen wide" data-act="listen">🔊 Play again</button>' : ''}
        ${choiceButtons(f.opts.options, { answered, picked: f.picked, right: f.opts.right, ja: a.optionsJa })}
        ${!answered && speech && a.sayable ? `<button class="btn wide ${f.listening ? 'on' : ''}" data-act="mic" aria-pressed="${f.listening}">🎤 ${f.listening ? 'Listening… say it (the attack waits)' : 'Say it instead'}</button>
          <p class="small dim center-text" id="rv-heard" aria-live="polite">${f.heard ? `Heard: 「${esc(f.heard)}」` : ''}</p>` : ''}
        ${answered ? `<div class="panel ${right ? 'good-panel' : 'note'} stack-sm">
            <p class="strong ${right ? 'good-c' : 'miss-c'}">${right ? '✓ Countered! Hit!'
              : f.how === 'late' ? `Too slow: ${esc(rival.name)}'s attack landed. It comes back later.`
                : `${esc(rival.name)} counters. It comes back later.`}</p>
            <p class="small">${esc(a.detail)}</p>
            <div class="row2"><button class="btn" data-act="hear">🔊 Hear it</button><button class="btn primary" data-act="next">${f.ko === 'foe' ? 'Finish' : f.ko === 'me' ? 'Train' : 'Next'} ▶</button></div>
          </div>` : ''}
        ${f.finisher ? `<div class="rival-finisher" role="status"><span class="rival-slash" aria-hidden="true"></span>
            <span class="rival-fin-name">${esc(f.finisher.name)}!</span><span lang="ja" class="rival-fin-line">${esc(f.finisher.line.jp)}</span></div>` : ''}
      </div>`;
    animateBars();
  }

  function renderMontage() {
    const m = f.montage;
    const a = m.list[m.i];
    const answered = m.picked !== -1;
    el.innerHTML = `
      <div class="stack practice rival montage" data-key="${esc(a.key)}" style="--rival:${rival.color}">
        <p class="rival-kicker">TRAINING MONTAGE</p>
        <p class="lead strong" lang="ja">${esc(MONTAGE_LINE.jp)} <span class="small dim">${esc(MONTAGE_LINE.en)}</span></p>
        <p class="small dim">Quick drills on the ones that got through. ${m.i + 1} of ${m.list.length}.</p>
        <div class="panel center-text stack-sm">
          <p class="small dim">${m.step === 'show' ? 'Look and listen:' : esc(a.ask)}</p>
          ${a.listen && m.step === 'ask' ? '<button class="btn quiz-listen" data-act="listen">🔊 Play again</button>'
            : `<p class="rival-prompt ${a.promptJa || a.listen ? '' : 'latin'}" lang="ja" ${a.noruby ? 'data-noruby' : ''}>${esc(a.prompt || a.say)}</p>`}
          ${m.step === 'show' ? `<p class="strong">${esc(a.answer)}</p><p class="small">${esc(a.detail)}</p>` : ''}
        </div>
        ${m.step === 'show' ? '<div class="row2"><button class="btn" data-act="hear">🔊 Hear it</button><button class="btn primary" data-act="drill">Got it ▶</button></div>'
          : choiceButtons(m.opts.options, { answered, picked: m.picked, right: m.opts.right, ja: a.optionsJa, act: 'mpick' })
            + (answered ? '<button class="btn primary wide" data-act="mnext">Next ▶</button>' : '')}
      </div>`;
  }

  function renderEnd() {
    const won = f.end === 'win';
    const l = won ? rival.defeat : rival.respect;
    const uniq = [...new Map(f.missed.map((a) => [a.key, a])).values()];
    el.innerHTML = `
      <div class="stack center-text practice rival" style="--rival:${rival.color}">
        <span class="rival-face big-face sprite ${won ? 'down' : ''}" aria-hidden="true">${sprite(rival.id, { power: powered(rival) })}</span>
        <p class="rival-kicker">${won ? `${esc(rival.name.toUpperCase())} IS DOWN` : `${esc(rival.name.toUpperCase())} BOWS`}</p>
        <p class="lead strong" lang="ja">${esc(l.jp)}</p>
        <p class="dim">${esc(l.en)}</p>
        <p class="strong">${f.ok} of ${f.tot} attacks countered on the first try${f.best >= COMBO_FINISH ? ` · best combo ${f.best}` : ''}.</p>
        ${uniq.length ? `<div class="panel left-text stack-sm"><p class="section-label">THESE GOT THROUGH</p>
          ${uniq.map((a) => `<div class="word-row"><span class="grow small">${esc(a.detail)}</span></div>`).join('')}
          <p class="small dim">They come back in your reviews soon.</p></div>` : ''}
        ${ctx.today ? '' : `<button class="btn primary wide" data-act="again">⚔ Fight again</button>
          <button class="btn ghost wide" data-act="pickscreen">Choose a rival</button>`}
      </div>`;
    later(() => line(l, rival.voice), 300);
  }

  // ---------- the fight ----------
  function start() {
    f = newFight();
    screen = 'fight';
    if (!f.queue.length) { screen = 'pick'; render(); return; }
    line(f.bubble, rival.voice);
    advance(true);
  }

  function advance(first = false) {
    stopMic();
    if (f.clock) clearTimeout(f.clock.tid);
    f.finisher = null;
    // A missed attack comes back once its turn arrives.
    const back = f.comebacks.findIndex((c) => c.at <= f.turn);
    let a = null;
    if (back >= 0) a = f.comebacks.splice(back, 1)[0].a;
    else a = nextAttack(f.queue, f);
    if (!a && f.comebacks.length) a = f.comebacks.shift().a;
    if (!a || f.turn >= MAX_TURNS) { finish(f.hp <= 0 ? 'win' : 'respect'); return; }
    f.turn += 1;
    f.cur = a;
    f.opts = optionsFor(a);
    f.picked = -1;
    f.how = null;
    f.heard = '';
    f.status = '';
    f.clock = { dur: attackTime(a, f, store.s.settings.speed === 'slow'), used: 0, since: null, tid: 0 };
    if (!first) f.bubble = null;
    render();
    if (ctx.today) ctx.today.report(`${f.turn}`);
    // The bubble sets off once the rival has spoken (first turn) or the listening clip has played.
    const go = () => { if (f && f.cur === a) startClock(); };
    if (a.listen) {
      later(() => {
        if (!f || f.cur !== a) return;
        let started = false;
        const once = () => { if (!started) { started = true; later(go, 250); } };
        sayAt(a.listen.text, { voice: a.listen.voice, mps: 4, onend: once });
        later(once, 7000);   // in case the clip never reports its end
      }, first ? 2600 : 350);
    } else later(go, first ? 2600 : 500);
  }

  function answer(ok, how = ok ? 'hit' : 'counter') {
    const a = f.cur;
    pauseClock();
    if (f.clock) clearTimeout(f.clock.tid);
    const firstTry = !f.seen.has(a.key);
    f.seen.add(a.key);
    a.grade(ok, firstTry);
    f.tot += 1;
    f.how = how;
    stopMic();
    if (ok) {
      f.ok += 1;
      f.missRow = 0;
      f.combo += 1;
      f.best = Math.max(f.best, f.combo);
      f.hp -= 1;
      f.flash = 'foe';
      f.status = `${me.name} counters! ${rival.name} takes a hit.`;
      if (f.combo >= COMBO_FINISH) {
        f.combo = 0;
        f.hp -= FINISHER_HITS - 1;
        f.myHp = Math.min(REN_HP, f.myHp + FINISHER_HEAL);
        if (f.hp <= 0) f.ko = 'foe';
        f.finisher = pick(FINISHERS);
        render();
        fx.hit({ big: true, el: el.querySelector('.rival-finisher') });
        fx.buzz([30, 40, 60]);
        fx.announce(`Finisher: ${f.finisher.name}!`);
        line(f.finisher.line, me.voice);
        later(() => { if (f && f.finisher) { f.finisher = null; f.flash = 'foe'; render(); } }, fx.reducedMotion() ? 1200 : 1800);
        return;
      }
      if (f.hp <= 0) f.ko = 'foe';
      render();
      fx.hit({ el: el.querySelector('.foe-hp') });
      fx.announce(f.ko ? `Hit. ${rival.name}'s stamina runs out.` : 'Countered. Hit.');
      sayAt(a.say, { voice: a.sayVoice || 0, mps: 4 });
    } else {
      f.combo = 0;
      f.missRow += 1;
      f.myHp = Math.max(0, f.myHp - COUNTER_DAMAGE);
      if (f.myHp <= 0) f.ko = 'me';
      f.flash = 'me';
      f.missed.push(a);
      f.comebacks.push({ a, at: f.turn + COMEBACK });
      f.bubble = pick(rival.counter);
      render();
      fx.miss({ el: el.querySelector('.me-card') });
      fx.announce(`${how === 'late' ? 'The attack landed' : `${rival.name} counters`}. The answer is ${a.answer}.`);
      // The rival says the counter line, then the answer.
      line(f.bubble, rival.voice, () => later(() => sayAt(a.say, { voice: a.sayVoice || 0, mps: 3.5 }), 200));
    }
  }

  function next() {
    if (f.hp <= 0) { finish('win'); return; }
    if (!f.montage && needsMontage(f)) { startMontage(); return; }
    advance();
  }

  function finish(kind) {
    stopMic();
    if (f.clock) clearTimeout(f.clock.tid);
    f.end = kind;
    screen = 'end';
    store.markStudied();
    render();
    if (ctx.today) ctx.today.done(kind === 'win' ? `${rival.name} is down.` : `${rival.name} respects you.`);
  }

  // ---------- training montage ----------
  function startMontage() {
    const list = [...new Map(f.missed.map((a) => [a.key, a])).values()];
    f.montage = { list, i: 0, step: 'show', picked: -1, opts: null };
    screen = 'montage';
    render();
    line(MONTAGE_LINE, me.voice, () => later(() => sayAt(list[0].say, { voice: list[0].sayVoice || 0, mps: 3.5 }), 200));
  }

  function drill() {
    const m = f.montage;
    m.step = 'ask';
    m.opts = optionsFor(m.list[m.i]);
    m.picked = -1;
    render();
    const a = m.list[m.i];
    if (a.listen) later(() => sayAt(a.listen.text, { voice: a.listen.voice, mps: 4 }), 300);
  }

  function montagePick(i) {
    const m = f.montage;
    if (m.picked !== -1) return;
    m.picked = i;
    const ok = i === m.opts.right;
    m.list[m.i].grade(ok, false);   // practice, not a first try
    render();
    if (ok) fx.hit(); else fx.miss();
    sayAt(m.list[m.i].say, { voice: m.list[m.i].sayVoice || 0, mps: 3.5 });
  }

  function montageNext() {
    const m = f.montage;
    m.i += 1;
    if (m.i >= m.list.length) { finish('respect'); return; }
    m.step = 'show';
    render();
    const a = m.list[m.i];
    sayAt(a.say, { voice: a.sayVoice || 0, mps: 3.5 });
  }

  // ---------- speaking ----------
  function startMic() {
    const a = f.cur;
    const targets = [...new Set((a.targets || [a.sayable]).filter(Boolean).map((t) => normalizeJa(t)))];
    f.listening = true;
    pauseClock();   // saying it out loud is the better practice: the attack waits
    renderFight();
    recognizer.onTranscript = (text, alts = '') => {
      if (!f || f.cur !== a || f.picked !== -1) return;
      f.heard = text;
      const tries = [text, ...String(alts || '').split(/\s*\|\s*|\n/)].filter(Boolean).map((t) => normalizeJa(t));
      if (tries.some((h) => targets.some((t) => h.includes(t) || likeness(h, t) >= 0.6))) {
        f.picked = f.opts.right;
        answer(true);
        return;
      }
      const h = el.querySelector('#rv-heard');
      if (h) h.textContent = `Heard: 「${text}」`;
    };
    recognizer.onUnavailable = () => { speech = false; f.listening = false; if (screen === 'fight') { render(); startClock(); } };
    recognizer.start([a.sayable]);
  }

  function stopMic() {
    if (f) f.listening = false;
    recognizer.stop();
  }

  const off = delegate(el, {
    choose: (b) => { rival = RIVAL_BY_ID[b.dataset.id] || rival; render(); },
    fighter: (b) => {
      me = availableFighters().find((x) => x.id === b.dataset.id) || me;
      try { localStorage.setItem(FIGHTER_KEY, me.id); } catch (e) { /* this visit only */ }
      render();
    },
    start,
    again: start,
    pickscreen: () => { screen = 'pick'; render(); },
    pick: (b) => { if (f.picked !== -1 || f.ko) return; f.picked = +b.dataset.i; answer(f.picked === f.opts.right); },
    next,
    hear: () => { const a = screen === 'montage' ? f.montage.list[f.montage.i] : f.cur; sayAt(a.say, { voice: a.sayVoice || 0, mps: 3.5 }); },
    listen: () => { const a = screen === 'montage' ? f.montage.list[f.montage.i] : f.cur; sayAt(a.listen.text, { voice: a.listen.voice, mps: 4 }); },
    mic: () => { if (f.listening) { stopMic(); renderFight(); startClock(); } else startMic(); },
    drill,
    mpick: (b) => montagePick(+b.dataset.i),
    mnext: montageNext,
  });

  const onKey = (e) => {
    if (e.target.closest?.('input, textarea, select, button, a')) return;
    if (screen === 'fight' && f && f.picked === -1 && /^[1-4]$/.test(e.key)) {
      const i = +e.key - 1;
      if (f.opts.options[i] !== undefined) { f.picked = i; answer(i === f.opts.right); }
    } else if (screen === 'fight' && f && f.picked !== -1 && !f.finisher && e.key === 'Enter') { e.preventDefault(); next(); }
  };
  window.addEventListener('keydown', onKey);

  if (ctx.today) {
    if (attackPool().length >= MIN_ITEMS) start();
    else { render(); ctx.today.done('Not enough learned yet for a rival.'); }
  } else render();

  return () => {
    off();
    window.removeEventListener('keydown', onKey);
    document.removeEventListener('visibilitychange', onVisibility);
    if (f && f.clock) clearTimeout(f.clock.tid);
    timers.forEach(clearTimeout);
    recognizer.stop();
    speaker.stop();
    f = null;
  };
}
