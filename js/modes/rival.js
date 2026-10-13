// Rival Battle: a boss fight built entirely from review. A rival from the story attacks with quick recall items drawn
// from what you've already learned (js/rival-items.js), mixed together. Answer by tapping, or out loud with the mic
// (never in Quiet mode). Right answers in a row build a combo that ends in a finisher. A miss costs nothing: the rival
// "counters" by saying the answer, and that item comes back later in the fight. You can't lose: a fight that goes badly
// turns into a short training montage on the missed items, and the rival respects you anyway. No win counters.
import { store } from '../store.js';
import { speaker, Recognizer, recognitionSupported, normalizeJa } from '../audio.js';
import { RIVALS, RIVAL_BY_ID, FINISHERS, REN_VOICE, MONTAGE_LINE } from '../rival-data.js';
import { attackPool, planFight, nextAttack, optionsFor, unlockedRivals, MIN_ITEMS } from '../rival-items.js';
import { levelBar, itemOpen, lockLine, levelOf } from '../levels.js';

export { unlockedRivals };
import { esc, pick, delegate } from '../ui.js';
import { choiceButtons, sayAt } from '../practice-ui.js';
import * as fx from '../fx.js';

/** Right answers in a row that end in a finisher (which hits 3 times). */
export const COMBO_FINISH = 4;
const FINISHER_HITS = 3;
/** Attacks in a fight at most (comebacks included), so a fight stays about 5 minutes. */
const MAX_TURNS = 16;
/** A missed attack comes back this many turns later. */
const COMEBACK = 3;

/** Whether the fight has gone badly enough to turn into a training montage. */
export function needsMontage({ ok, tot, missRow }) {
  return missRow >= 3 || (tot >= 6 && ok / tot < 0.6);
}

/** How alike two strings are (shared character pairs), 0..1. Generous: recognition is imperfect. */
function likeness(a, b) {
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
  const timers = [];
  const later = (fn, ms) => timers.push(setTimeout(fn, ms));

  const line = (l, voice, onend) => sayAt(l.jp, { voice, mps: 4, onend });

  function newFight() {
    const pool = attackPool();
    return {
      hp: rival.hp, combo: 0, best: 0, ok: 0, tot: 0, missRow: 0, turn: 0,
      queue: planFight(pool, MAX_TURNS, rival.level), comebacks: [], missed: [], seen: new Set(),
      cur: null, opts: null, picked: -1, done: false, heard: '', listening: false,
      bubble: pick(rival.intro), finisher: null, montage: null, end: null,
    };
  }

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
        <div class="hero-jp accent-c center-text" lang="ja" data-noruby>戦</div>
        <p class="lead strong">A rival challenges you. Every attack is something you've already learned.</p>
        <p class="dim">Answer by tapping${speech ? ', or say it out loud with the mic' : ''}. Answers in a row build a combo and a finisher. A miss costs nothing: the rival says the answer and it comes back later. You can't lose.</p>
        ${quiet ? '<div class="panel note small">Quiet mode: tap answers only.</div>' : ''}
        ${!enough ? `<div class="panel note">The rivals wait until you've learned a little more: a few Garden words, Reading Dojo kana or practice games. (${pool.length} of ${MIN_ITEMS} so far.)</div>` : ''}
        <div class="rival-list">
          ${RIVALS.map((r) => {
            const on = open.includes(r);
            return `<button class="panel rival-card ${rival === r ? 'on' : ''}" data-act="choose" data-id="${r.id}" ${on ? '' : 'disabled'} aria-pressed="${rival === r}" style="--rival:${r.color}">
              <span class="rival-face" lang="ja" data-noruby aria-hidden="true">${esc(r.jpName.slice(0, 1))}</span>
              <span class="grow left-text"><span class="strong">${esc(r.name)}</span> <span class="small dim" lang="ja" data-noruby>${esc(r.jpName)}</span><br>
                <span class="small dim">${on ? esc(r.blurb) : !itemOpen(r) ? `🔒 ${levelOf(r)}. ${esc(lockLine(levelOf(r)))}` : `🔒 Challenges you after story chapter ${esc(r.after.slice(2))}.`}</span></span>
            </button>`;
          }).join('')}
        </div>
        <button class="btn primary wide" data-act="start" ${enough ? '' : 'disabled'}>⚔ Fight ${esc(rival.name)}</button>
      </div>`;
  }

  function hpBar() {
    const pct = Math.max(0, (f.hp / rival.hp) * 100);
    return `<div class="rival-hp" role="meter" aria-label="${esc(rival.name)}'s stamina" aria-valuemin="0" aria-valuemax="${rival.hp}" aria-valuenow="${Math.max(0, f.hp)}"><span style="width:${pct}%"></span></div>`;
  }

  function comboPips() {
    return `<span class="rival-combo" aria-label="Combo ${f.combo} of ${COMBO_FINISH}">${Array.from({ length: COMBO_FINISH }, (_, i) => `<i class="${i < f.combo ? 'on' : ''}"></i>`).join('')}</span>`;
  }

  function renderFight() {
    const a = f.cur;
    const answered = f.picked !== -1;
    const right = answered && f.picked === f.opts.right;
    el.innerHTML = `
      <div class="stack practice rival" data-key="${esc(a.key)}" data-kind="${a.kind}" style="--rival:${rival.color}">
        <div class="rival-top">
          <span class="rival-face small-face" lang="ja" data-noruby aria-hidden="true">${esc(rival.jpName.slice(0, 1))}</span>
          <div class="grow stack-xs"><div class="row-between"><span class="strong">${esc(rival.name)}</span><span class="small dim mono">${f.ok}/${f.tot}</span></div>${hpBar()}</div>
        </div>
        <div class="rival-bubble ${f.bubble ? '' : 'quiet'}" aria-live="polite">${f.bubble ? `<span lang="ja">${esc(f.bubble.jp)}</span><span class="small dim">${esc(f.bubble.en)}</span>` : '<span class="small dim">…</span>'}</div>
        <div class="row-between small"><span class="dim">Combo ${comboPips()}</span><span class="dim">${esc(a.kind === 'number' ? 'Listen' : 'Attack')} ${f.turn}</span></div>
        <div class="panel rival-attack center-text stack-sm">
          <p class="small dim">${esc(a.ask)}</p>
          ${a.listen ? `<button class="btn quiz-listen" data-act="listen">🔊 Play again</button>`
            : `<p class="rival-prompt ${a.promptJa ? '' : 'latin'}" ${a.promptJa ? 'lang="ja"' : ''} ${a.noruby ? 'data-noruby' : ''}>${esc(a.prompt)}</p>`}
          ${a.promptEn ? `<p class="small dim">${esc(a.promptEn)}</p>` : ''}
        </div>
        ${choiceButtons(f.opts.options, { answered, picked: f.picked, right: f.opts.right, ja: a.optionsJa })}
        ${!answered && speech && a.sayable ? `<button class="btn wide ${f.listening ? 'on' : ''}" data-act="mic" aria-pressed="${f.listening}">🎤 ${f.listening ? 'Listening… say it' : 'Say it instead'}</button>
          <p class="small dim center-text" id="rv-heard" aria-live="polite">${f.heard ? `Heard: 「${esc(f.heard)}」` : ''}</p>` : ''}
        ${answered ? `<div class="panel ${right ? 'good-panel' : 'note'} stack-sm">
            <p class="strong ${right ? 'good-c' : 'miss-c'}">${right ? '✓ Hit!' : `${esc(rival.name)} counters. It comes back later; nothing lost.`}</p>
            <p class="small">${esc(a.detail)}</p>
            <div class="row2"><button class="btn" data-act="hear">🔊 Hear it</button><button class="btn primary" data-act="next">Next ▶</button></div>
          </div>` : ''}
        ${f.finisher ? `<div class="rival-finisher" role="status"><span class="rival-slash" aria-hidden="true"></span>
            <span class="rival-fin-name">${esc(f.finisher.name)}!</span><span lang="ja" class="rival-fin-line">${esc(f.finisher.line.jp)}</span></div>` : ''}
      </div>`;
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
        <span class="rival-face big-face" lang="ja" data-noruby aria-hidden="true">${esc(rival.jpName.slice(0, 1))}</span>
        <p class="rival-kicker">${won ? `${esc(rival.name.toUpperCase())} IS DOWN` : `${esc(rival.name.toUpperCase())} BOWS`}</p>
        <p class="lead strong" lang="ja">${esc(l.jp)}</p>
        <p class="dim">${esc(l.en)}</p>
        <p class="strong">${f.ok} of ${f.tot} attacks answered on the first try${f.best >= COMBO_FINISH ? ` · best combo ${f.best}` : ''}.</p>
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
    f.heard = '';
    if (!first) f.bubble = null;
    render();
    if (ctx.today) ctx.today.report(`${f.turn}`);
    if (a.listen) later(() => sayAt(a.listen.text, { voice: a.listen.voice, mps: 4 }), first ? 2600 : 350);
  }

  function answer(ok) {
    const a = f.cur;
    const firstTry = !f.seen.has(a.key);
    f.seen.add(a.key);
    a.grade(ok, firstTry);
    f.tot += 1;
    stopMic();
    if (ok) {
      f.ok += 1;
      f.missRow = 0;
      f.combo += 1;
      f.best = Math.max(f.best, f.combo);
      f.hp -= 1;
      if (f.combo >= COMBO_FINISH) {
        f.combo = 0;
        f.hp -= FINISHER_HITS - 1;
        f.finisher = pick(FINISHERS);
        render();
        fx.hit({ big: true, el: el.querySelector('.rival-finisher') });
        fx.buzz([30, 40, 60]);
        fx.announce(`Finisher: ${f.finisher.name}!`);
        line(f.finisher.line, REN_VOICE);
        later(() => { if (f && f.finisher) { f.finisher = null; render(); } }, fx.reducedMotion() ? 1200 : 1800);
        return;
      }
      render();
      fx.hit({ el: el.querySelector('.rival-hp') });
      fx.announce('Hit.');
      sayAt(a.say, { voice: a.sayVoice || 0, mps: 4 });
    } else {
      f.combo = 0;
      f.missRow += 1;
      f.missed.push(a);
      f.comebacks.push({ a, at: f.turn + COMEBACK });
      f.bubble = pick(rival.counter);
      render();
      fx.miss({ el: el.querySelector('.rival-attack') });
      fx.announce(`${rival.name} counters. The answer is ${a.answer}.`);
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
    line(MONTAGE_LINE, REN_VOICE, () => later(() => sayAt(list[0].say, { voice: list[0].sayVoice || 0, mps: 3.5 }), 200));
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
    recognizer.onUnavailable = () => { speech = false; f.listening = false; if (screen === 'fight') render(); };
    recognizer.start([a.sayable]);
  }

  function stopMic() {
    if (f) f.listening = false;
    recognizer.stop();
  }

  const off = delegate(el, {
    choose: (b) => { rival = RIVAL_BY_ID[b.dataset.id] || rival; render(); },
    start,
    again: start,
    pickscreen: () => { screen = 'pick'; render(); },
    pick: (b) => { if (f.picked !== -1) return; f.picked = +b.dataset.i; answer(f.picked === f.opts.right); },
    next,
    hear: () => { const a = screen === 'montage' ? f.montage.list[f.montage.i] : f.cur; sayAt(a.say, { voice: a.sayVoice || 0, mps: 3.5 }); },
    listen: () => { const a = screen === 'montage' ? f.montage.list[f.montage.i] : f.cur; sayAt(a.listen.text, { voice: a.listen.voice, mps: 4 }); },
    mic: () => { if (f.listening) { stopMic(); renderFight(); } else startMic(); },
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
    timers.forEach(clearTimeout);
    recognizer.stop();
    speaker.stop();
    f = null;
  };
}
