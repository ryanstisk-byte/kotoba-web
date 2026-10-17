// Encounters (出会い): short real-life conversations on the Rival Battle screen. The person you meet stands top right
// with a name card and a rapport bar that fills as the talk goes well; you (your pick of Hyreign's pixel cast, seen
// from behind) stand bottom left with a nerve bar. Each of their lines flies at you as a speech bubble (voiced in
// their own voice); you counter with the right reply, tapped or said out loud, before it lands.
//
// - A right reply at the wrong politeness level (too casual with shop staff, too stiff with a classmate) still
//   counts: the person reacts to it, and a note says what's natural.
// - A wrong reply, or a bubble that lands, costs some nerve: the person looks puzzled and the right reply is shown
//   and played. If nerve runs out, you take a breath and practise the replies that slipped, then carry on. You can't
//   fail a scene.
// - The bubble is generous and adapts to aim at ~85% (as in Rival Battle); saying it out loud pauses it.
// - Each reply is graded as speaking (`meet:<scene>:<turn>`), so per-item mastery decides which scene comes next with
//   each person: the first one not yet learned, so a missed reply brings its scene back. Nothing else is saved; the
//   look you play as stays on this device (kotobaBeat.meetAs).
import { store } from '../store.js';
import { speaker, Recognizer, recognitionSupported, normalizeJa } from '../audio.js';
import { PEOPLE, PERSON, LOOKS, SCENES, REPLY_VOICE } from '../encounter-data.js';
import { levelBar, content, levelOf } from '../levels.js';
import { esc, pick, delegate, howTo, shuffle } from '../ui.js';
import { choiceButtons, sayAt } from '../practice-ui.js';
import { hpBand, likeness } from './rival.js';
import * as fx from '../fx.js';

/** Your nerve, and what a reply that slips costs. */
export const NERVE = 20;
export const SLIP = 5;
/** Mastery (0-100) at which a reply counts as learned (one right first try gets there). */
const LEARNED = 70;
const LOOK_KEY = 'kotobaBeat.meetAs';

const turnId = (s, i) => `meet:${s.id}:${i}`;
const masteryOf = (s, i) => (store.engine.mastery[`speaking|${turnId(s, i)}`] || [null])[0];

/** A scene's state for you: 'new' (never played), 'met' (some replies not learned yet) or 'learned'. */
export function sceneState(s) {
  const m = s.turns.map((_, i) => masteryOf(s, i));
  if (m.every((x) => x == null)) return 'new';
  return m.every((x) => x != null && x >= LEARNED) ? 'learned' : 'met';
}

/** Scenes with a person at the open levels, in order. */
export const scenesWith = (who) => content('meet').filter((s) => s.who === who);

/** The scene to play next with a person: the first not yet learned, else the one with the weakest replies. */
export function nextScene(who) {
  const list = scenesWith(who);
  const open = list.find((s) => sceneState(s) !== 'learned');
  if (open) return open;
  const avg = (s) => s.turns.reduce((n, _, i) => n + (masteryOf(s, i) ?? 0), 0) / s.turns.length;
  return list.slice().sort((a, b) => avg(a) - avg(b))[0];
}

/** How long (ms) a line's bubble takes to land: longer at higher levels, adapted to aim at ~85% like Rival Battle. */
export function lineTime(s, { ok = 0, tot = 0 } = {}, slow = false) {
  let t = { N5: 12, N4: 14, N3: 16 }[levelOf(s)] || 12;
  const rate = tot >= 3 ? ok / tot : null;
  if (rate != null && rate < 0.8) t *= 1.3;
  else if (rate != null && rate > 0.9) t *= 0.85;
  if (slow) t *= 1.25;
  return Math.round(t * 1000);
}

const front = (id, label = '') => `<img class="px-sprite" src="img/encounters/${id}-front.png" alt="${esc(label)}" ${label ? '' : 'aria-hidden="true"'} draggable="false">`;
const back = (id, label = '') => `<img class="px-sprite" src="img/encounters/${id}-back.png" alt="${esc(label)}" ${label ? '' : 'aria-hidden="true"'} draggable="false">`;

function savedLook() {
  let id = null;
  try { id = localStorage.getItem(LOOK_KEY); } catch (e) { /* storage blocked */ }
  return LOOKS.find((x) => x.id === id) || LOOKS[0];
}

export function mount(el, ctx) {
  const quiet = !!ctx.quiet;
  const recognizer = new Recognizer();
  let speech = !quiet && recognitionSupported;
  let screen = 'pick';    // pick | talk | breath | end
  let who = PEOPLE[0];
  let look = savedLook();
  let chosen = null;      // a scene picked from the list (else the next one)
  let g = null;           // the conversation
  const timers = [];
  const later = (fn, ms) => timers.push(setTimeout(fn, ms));
  const slow = () => store.s.settings.speed === 'slow';
  const say = (l, voice, onend) => sayAt(l.jp, { voice, mps: 4, onend });

  // ---------- the bubble clock ----------
  const elapsed = () => (g && g.clock ? g.clock.used + (g.clock.since != null ? Date.now() - g.clock.since : 0) : 0);
  function startClock() {
    const c = g && g.clock;
    if (!c || c.since != null || g.picked !== -1 || g.listening || document.hidden || screen !== 'talk') return;
    c.since = Date.now();
    c.tid = setTimeout(timeUp, Math.max(0, c.dur - c.used));
    syncBubble();
  }
  function pauseClock() {
    const c = g && g.clock;
    if (!c || c.since == null) return;
    c.used += Date.now() - c.since;
    c.since = null;
    clearTimeout(c.tid);
    syncBubble();
  }
  function syncBubble() {
    const c = g && g.clock;
    if (!c) return;
    el.querySelectorAll('.atk-bubble, .atk-fuse > i').forEach((n) => {
      n.style.animationDelay = `-${elapsed()}ms`;
      n.style.animationPlayState = c.since != null ? 'running' : 'paused';
      const name = n.style.animationName;
      n.style.animationName = 'none';
      void n.offsetWidth;
      n.style.animationName = name;
    });
  }
  function timeUp() {
    if (!g || screen !== 'talk' || g.picked !== -1) return;
    g.clock.used = g.clock.dur;
    g.clock.since = null;
    g.picked = -2;   // nothing picked: it landed
    answer('late');
  }
  const onVisibility = () => { if (g && screen === 'talk') { if (document.hidden) pauseClock(); else startClock(); } };
  document.addEventListener('visibilitychange', onVisibility);

  // ---------- screens ----------
  function render() {
    if (screen === 'talk') return renderTalk();
    if (screen === 'breath') return renderBreath();
    if (screen === 'end') return renderEnd();
    renderPick();
  }

  function renderPick() {
    const scenes = scenesWith(who.id);
    const next = chosen && chosen.who === who.id ? chosen : nextScene(who.id);
    const label = { new: 'New', met: 'Practise again', learned: 'Learned' };
    el.innerHTML = `
      <div class="stack practice meet" style="--rival:${who.color}">
        ${levelBar('meet')}
        <p class="lead strong">Meet people and talk your way through real moments.</p>
        ${howTo(`<p>Each line they say flies at you as a speech bubble. Pick the reply that fits${speech ? ', or say it out loud' : ''}, before it lands. The right words at the wrong politeness still count, and they'll react. A slip costs a little nerve and shows you the right reply. Replies you miss bring their scene back next time.</p>`)}
        ${quiet ? '<div class="panel note small">Quiet mode: tap replies only.</div>' : ''}
        <h2 class="section-label">WHO TO MEET</h2>
        <div class="meet-people">
          ${PEOPLE.map((p) => `<button class="panel meet-person ${p === who ? 'on' : ''}" data-act="who" data-id="${p.id}" aria-pressed="${p === who}" style="--rival:${p.color}">
              <span class="meet-pic">${front(p.id)}</span>
              <span class="strong">${esc(p.name)}</span><span class="small dim">${esc(p.role)}</span></button>`).join('')}
        </div>
        <div class="panel stack-sm">
          <p class="small dim">With ${esc(who.name)} at ${esc(who.place)}. ${who.polite ? 'Polite speech (です, ます) is natural here.' : 'Casual speech is natural here.'}</p>
          <div class="meet-scenes" role="radiogroup" aria-label="Scenes">
            ${scenes.map((s) => `<button class="meet-scene ${s === next ? 'on' : ''}" data-act="scene" data-id="${s.id}" role="radio" aria-checked="${s === next}">
                <span class="mono small dim">${esc(levelOf(s))}</span> <span class="strong">${esc(s.title)}</span>
                <span class="small dim">${label[sceneState(s)]}</span></button>`).join('')}
          </div>
        </div>
        <button class="btn primary wide" data-act="start">Meet ${esc(who.name)}: ${esc(next.title)}</button>
        <h2 class="section-label">YOU</h2>
        <div class="fighter-list meet-looks" role="radiogroup" aria-label="How you look">
          ${LOOKS.map((x) => `<button class="fighter-card ${x === look ? 'on' : ''}" data-act="look" data-id="${x.id}" role="radio" aria-checked="${x === look}">
              <span class="fighter-pic px">${back(x.id)}</span><span class="small strong">${esc(x.name)}</span></button>`).join('')}
        </div>
      </div>`;
  }

  function bar(cls, val, max, name, band = true) {
    const pct = Math.max(0, Math.min(100, (val / max) * 100));
    return `<div class="hp-row"><span class="hp-tag">${cls === 'rap' ? 'BOND' : 'HP'}</span><div class="rival-hp ${cls}-bar" role="meter" aria-label="${esc(name)}" aria-valuemin="0" aria-valuemax="${max}" aria-valuenow="${Math.max(0, cls === 'rap' ? g.rapport : g.nerve)}"><span class="${band ? hpBand(pct) : 'hp-high'}" style="width:${pct}%"></span></div></div>`;
  }

  function animateBars() {
    requestAnimationFrame(() => requestAnimationFrame(() => {
      if (!g || screen !== 'talk') return;
      const set = (sel, val, max, band) => {
        const s = el.querySelector(sel);
        if (!s) return;
        const pct = Math.max(0, Math.min(100, (val / max) * 100));
        s.style.width = `${pct}%`;
        if (band) s.className = hpBand(pct);
      };
      set('.rap-bar > span', g.rapport, g.rapMax, false);
      set('.nerve-bar > span', g.nerve, NERVE, true);
      const num = el.querySelector('.me-num');
      if (num) num.textContent = `${Math.max(0, g.nerve)}/${NERVE}`;
      g.rapShown = g.rapport;
      g.nerveShown = g.nerve;
    }));
  }

  function bubble(t) {
    const c = g.clock;
    const answered = g.picked !== -1;
    const state = !answered ? '' : g.how === 'late' || g.how === 'miss' ? 'landed' : 'blocked';
    const anim = `--dur:${c.dur}ms; animation-delay:-${elapsed()}ms; animation-play-state:${c.since != null ? 'running' : 'paused'}`;
    return `<div class="atk-bubble meet-bubble ${state}" style="${anim}">
        <div class="atk-in"><span class="meet-line" lang="ja">${esc(t.says.jp)}</span>
        ${g.showEn || answered ? `<span class="small dim">${esc(t.says.en)}</span>` : ''}
        <span class="atk-fuse" aria-hidden="true"><i style="${anim}"></i></span></div></div>`;
  }

  function renderTalk() {
    const s = g.scene;
    const t = s.turns[g.i];
    const answered = g.picked !== -1;
    const flash = g.flash;
    g.flash = null;
    const reply = g.how === 'good' || g.how === 'tone';
    const status = g.react
      ? `<span lang="ja">${esc(g.react.jp)}</span><span class="small dim">${esc(g.react.en)}</span>`
      : `<span class="small">${esc(g.status)}</span>`;
    el.innerHTML = `
      <div class="stack practice rival meet" data-scene="${esc(s.id)}" data-turn="${g.i}" style="--rival:${who.color}">
        <div class="arena meet-arena">
          <div class="bcard foe-card">
            <div class="row-between"><span class="strong">${esc(who.name)}</span><span class="lv mono small">${esc(levelOf(s))}</span></div>
            ${bar('rap', g.rapShown, g.rapMax, `Rapport with ${who.name}`, false)}
          </div>
          <div class="foe-sprite sprite px ${flash === 'foe' ? 'hurt' : ''}">${front(who.id, who.name)}</div>
          <div class="me-sprite sprite px ${flash === 'me' ? 'hurt' : ''}">${back(look.id, 'You')}</div>
          <div class="bcard me-card">
            <div class="row-between"><span class="strong">You</span><span class="small dim">nerve</span></div>
            ${bar('nerve', g.nerveShown, NERVE, 'Your nerve')}
            <div class="me-num mono small">${Math.max(0, g.nerveShown)}/${NERVE}</div>
          </div>
          ${bubble(t)}
        </div>
        <div class="rival-text ${g.react ? '' : 'quiet'}" aria-live="polite">${status}</div>
        <div class="row-between small"><span class="dim">${esc(s.title)}</span><span class="dim">${g.i + 1} of ${s.turns.length}</span></div>
        <p class="center-text meet-want"><span class="small dim">You want to:</span> <span class="strong">${esc(t.want)}</span></p>
        <div class="row2">
          <button class="btn" data-act="again">🔊 Hear it again</button>
          ${answered || g.showEn ? '<span></span>' : '<button class="btn ghost" data-act="english">Show English</button>'}
        </div>
        ${choiceButtons(g.opts.map((o) => o.l.jp), { answered, picked: g.picked, right: g.right, ja: true })}
        ${!answered && speech ? `<button class="btn wide ${g.listening ? 'on' : ''}" data-act="mic" aria-pressed="${g.listening}">🎤 ${g.listening ? 'Listening… say it (the bubble waits)' : 'Say it instead'}</button>
          <p class="small dim center-text" id="mt-heard" aria-live="polite">${g.heard ? `Heard: 「${esc(g.heard)}」` : ''}</p>` : ''}
        ${answered ? `<div class="panel ${g.how === 'good' ? 'good-panel' : 'note'} stack-sm">
            <p class="strong ${reply ? 'good-c' : 'miss-c'}">${g.how === 'good' ? '✓ Nice reply!'
              : g.how === 'tone' ? '✓ Understood, but…'
                : g.how === 'late' ? "Too slow: the moment passed. Here's what fits." : "That one didn't fit. Here's what does."}</p>
            ${g.how === 'tone' ? `<p class="small">${esc(who.toneNote)} Natural here: <span lang="ja">${esc(t.reply.jp)}</span></p>` : ''}
            <p class="small"><span lang="ja">${esc(t.reply.jp)}</span> = ${esc(t.reply.en)}</p>
            <div class="row2"><button class="btn" data-act="hear">🔊 Hear the reply</button><button class="btn primary" data-act="next">${g.i + 1 >= s.turns.length ? 'Finish' : 'Next'} ▶</button></div>
          </div>` : ''}
      </div>`;
    animateBars();
  }

  /** Out of nerve: a breather to practise the replies that slipped, then the talk goes on. */
  function renderBreath() {
    const b = g.breath;
    const m = b.list[b.i];
    const answered = b.picked !== -1;
    el.innerHTML = `
      <div class="stack practice meet breath" style="--rival:${who.color}">
        <p class="rival-kicker">TAKE A BREATH</p>
        <p class="small dim">Quick practice on the replies that slipped. ${b.i + 1} of ${b.list.length}. Then you pick up where you left off.</p>
        <div class="panel center-text stack-sm">
          <p lang="ja" class="lead strong">${esc(m.t.says.jp)}</p>
          <p class="small dim">${esc(m.t.says.en)}</p>
          <p class="small"><span class="dim">You want to:</span> ${esc(m.t.want)}</p>
        </div>
        ${choiceButtons(b.opts.map((o) => o.l.jp), { answered, picked: b.picked, right: b.right, ja: true, act: 'bpick' })}
        ${answered ? `<div class="row2"><button class="btn" data-act="bhear">🔊 Hear it</button><button class="btn primary" data-act="bnext">Next ▶</button></div>` : ''}
      </div>`;
  }

  function renderEnd() {
    const s = g.scene;
    const slipped = [...new Map(g.slipped.map((m) => [m.i, m])).values()];
    const next = nextScene(who.id);
    el.innerHTML = `
      <div class="stack center-text practice meet" style="--rival:${who.color}">
        <div class="meet-end-pic">${front(who.id)}</div>
        <p class="rival-kicker">${esc(s.title.toUpperCase())}</p>
        <p class="lead strong" lang="ja">${esc(s.bye.jp)}</p>
        <p class="dim">${esc(s.bye.en)}</p>
        <p class="strong">${g.ok} of ${s.turns.length} replies fit on the first try.</p>
        ${slipped.length ? `<div class="panel left-text stack-sm"><p class="section-label">REPLIES TO PRACTISE</p>
          ${slipped.map((m) => `<div class="word-row"><span class="grow small"><span lang="ja">${esc(m.t.reply.jp)}</span> = ${esc(m.t.reply.en)}</span></div>`).join('')}
          <p class="small dim">This scene comes back next time you meet ${esc(who.name)}.</p></div>` : ''}
        ${ctx.today ? '' : `<button class="btn primary wide" data-act="start">Meet ${esc(who.name)} again: ${esc(next.title)}</button>
          <button class="btn ghost wide" data-act="pickscreen">Meet someone else</button>`}
      </div>`;
    later(() => say(s.bye, who.voice), 300);
  }

  // ---------- the conversation ----------
  function start() {
    const scene = chosen && chosen.who === who.id ? chosen : nextScene(who.id);
    chosen = null;
    g = { scene, i: -1, ok: 0, tot: 0, nerve: NERVE, nerveShown: NERVE, rapport: 0, rapShown: 0, rapMax: scene.turns.length * 2,
      slipped: [], breathTaken: [], picked: -1, how: null, react: null, status: scene.setup, clock: null, listening: false, heard: '' };
    screen = 'talk';
    turn();
  }

  function turn() {
    stopMic();
    if (g.clock) clearTimeout(g.clock.tid);
    g.i += 1;
    const s = g.scene;
    if (g.i >= s.turns.length) { finish(); return; }
    const t = s.turns[g.i];
    const opts = shuffle([{ l: t.reply, kind: 'good' }, ...(t.tone ? [{ l: t.tone, kind: 'tone' }] : []), ...t.wrong.map((l) => ({ l, kind: 'miss' }))]);
    g.opts = opts;
    g.right = opts.findIndex((o) => o.kind === 'good');
    g.picked = -1;
    g.how = null;
    g.heard = '';
    g.showEn = false;
    if (g.i > 0) { g.react = null; g.status = `${who.name}:`; }
    g.clock = { dur: lineTime(s, g, slow()), used: 0, since: null, tid: 0 };
    render();
    if (ctx.today) ctx.today.report(`${g.i + 1}`);
    // The bubble sets off once they've said the line.
    let started = false;
    const go = () => { if (!started && g && g.scene === s && g.i === s.turns.indexOf(t)) { started = true; later(startClock, 250); } };
    later(() => { if (g && g.scene === s) say(t.says, who.voice, go); }, g.i === 0 ? 400 : 300);
    later(go, 6000);   // in case the clip never reports its end
  }

  function answer(kind) {
    const s = g.scene;
    const t = s.turns[g.i];
    pauseClock();
    if (g.clock) clearTimeout(g.clock.tid);
    stopMic();
    const ok = kind === 'good' || kind === 'tone';
    store.log(ok);
    store.grade({ skill: 'speaking', id: turnId(s, g.i), ok });
    g.tot += 1;
    g.how = kind;
    if (ok) {
      g.ok += 1;
      g.rapport = Math.min(g.rapMax, g.rapport + (kind === 'good' ? 2 : 1));
      g.react = kind === 'tone' ? pick(who.toneLines) : null;
      g.status = kind === 'good' ? `${who.name} nods.` : '';
      render();
      fx.hit({ el: el.querySelector('.rap-bar') });
      fx.announce(kind === 'good' ? 'Nice reply.' : 'Understood, but the politeness is off.');
      const playReply = () => later(() => sayAt(t.reply.jp, { voice: REPLY_VOICE, mps: 4 }), 200);
      if (g.react) say(g.react, who.voice, playReply); else sayAt((kind === 'tone' ? t.tone : t.reply).jp, { voice: REPLY_VOICE, mps: 4 });
    } else {
      g.nerve = Math.max(0, g.nerve - SLIP);
      g.flash = 'me';
      g.slipped.push({ i: g.i, t });
      g.react = pick(who.huhLines);
      render();
      fx.miss({ el: el.querySelector('.me-card') });
      fx.announce(`That didn't fit. The reply is ${t.reply.jp}.`);
      say(g.react, who.voice, () => later(() => sayAt(t.reply.jp, { voice: REPLY_VOICE, mps: 3.5 }), 200));
    }
  }

  function next() {
    if (g.nerve <= 0) { startBreath(); return; }
    turn();
  }

  function finish() {
    stopMic();
    screen = 'end';
    store.markStudied();
    render();
    if (ctx.today) ctx.today.done(`You talked with ${who.name}.`);
  }

  // ---------- take a breath ----------
  function startBreath() {
    const list = [...new Map(g.slipped.filter((m) => !g.breathTaken.includes(m.i)).map((m) => [m.i, m])).values()];
    g.breathTaken.push(...list.map((m) => m.i));
    g.breath = { list, i: -1 };
    screen = 'breath';
    breathNext();
  }
  function breathNext() {
    const b = g.breath;
    b.i += 1;
    if (b.i >= b.list.length) {
      g.nerve = NERVE / 2;
      g.nerveShown = 0;
      screen = 'talk';
      turn();
      return;
    }
    const t = b.list[b.i].t;
    b.opts = shuffle([{ l: t.reply, kind: 'good' }, ...t.wrong.map((l) => ({ l, kind: 'miss' }))]);
    b.right = b.opts.findIndex((o) => o.kind === 'good');
    b.picked = -1;
    render();
    say(t.says, who.voice);
  }
  function breathPick(i) {
    const b = g.breath;
    if (b.picked !== -1) return;
    b.picked = i;
    const ok = i === b.right;
    store.grade({ skill: 'speaking', id: turnId(g.scene, b.list[b.i].i), ok, firstTry: false });   // practice
    render();
    if (ok) fx.hit(); else fx.miss();
    sayAt(b.list[b.i].t.reply.jp, { voice: REPLY_VOICE, mps: 3.5 });
  }

  // ---------- speaking ----------
  function startMic() {
    const s = g.scene;
    const t = s.turns[g.i];
    const targets = [t.reply, t.tone].filter(Boolean).map((l) => ({ l, n: normalizeJa(l.jp), r: normalizeJa(l.reading) }));
    g.listening = true;
    pauseClock();
    renderTalk();
    recognizer.onTranscript = (text, alts = '') => {
      if (!g || g.scene !== s || g.picked !== -1) return;
      g.heard = text;
      const tries = [text, ...String(alts || '').split(/\s*\|\s*|\n/)].filter(Boolean).map((x) => normalizeJa(x));
      const hit = targets.find((x) => tries.some((h) => h.includes(x.n) || likeness(h, x.n) >= 0.6 || likeness(h, x.r) >= 0.6));
      if (hit) {
        g.picked = hit.l === t.reply ? g.right : g.opts.findIndex((o) => o.l === hit.l);
        answer(hit.l === t.reply ? 'good' : 'tone');
        return;
      }
      const h = el.querySelector('#mt-heard');
      if (h) h.textContent = `Heard: 「${text}」`;
    };
    recognizer.onUnavailable = () => { speech = false; g.listening = false; if (screen === 'talk') { render(); startClock(); } };
    recognizer.start([t.reply.jp]);
  }
  function stopMic() {
    if (g) g.listening = false;
    recognizer.stop();
  }

  const off = delegate(el, {
    who: (b) => { who = PERSON[b.dataset.id] || who; chosen = null; render(); },
    scene: (b) => { chosen = SCENES.find((s) => s.id === b.dataset.id) || null; render(); },
    look: (b) => {
      look = LOOKS.find((x) => x.id === b.dataset.id) || look;
      try { localStorage.setItem(LOOK_KEY, look.id); } catch (e) { /* this visit only */ }
      render();
    },
    start,
    pickscreen: () => { screen = 'pick'; render(); },
    pick: (b) => { if (!g || g.picked !== -1) return; g.picked = +b.dataset.i; answer(g.opts[g.picked].kind); },
    next,
    again: () => { const t = g.scene.turns[g.i]; say(t.says, who.voice); },
    english: () => { g.showEn = true; renderTalk(); },
    hear: () => { const t = g.scene.turns[g.i]; sayAt(t.reply.jp, { voice: REPLY_VOICE, mps: 3.5 }); },
    mic: () => { if (g.listening) { stopMic(); renderTalk(); startClock(); } else startMic(); },
    bpick: (b) => breathPick(+b.dataset.i),
    bhear: () => sayAt(g.breath.list[g.breath.i].t.reply.jp, { voice: REPLY_VOICE, mps: 3.5 }),
    bnext: breathNext,
  });

  const onKey = (e) => {
    if (e.target.closest?.('input, textarea, select, button, a')) return;
    if (screen === 'talk' && g && g.picked === -1 && /^[1-4]$/.test(e.key)) {
      const i = +e.key - 1;
      if (g.opts[i]) { g.picked = i; answer(g.opts[i].kind); }
    } else if (screen === 'talk' && g && g.picked !== -1 && e.key === 'Enter') { e.preventDefault(); next(); }
  };
  window.addEventListener('keydown', onKey);

  if (ctx.today) start(); else render();

  return () => {
    off();
    window.removeEventListener('keydown', onKey);
    document.removeEventListener('visibilitychange', onVisibility);
    if (g && g.clock) clearTimeout(g.clock.tid);
    timers.forEach(clearTimeout);
    recognizer.stop();
    speaker.stop();
    g = null;
  };
}
