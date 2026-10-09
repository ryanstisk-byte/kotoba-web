// Speak Slice (SliceView.swift): say the Japanese for whatever is flying to cut it.
// Nothing is lost when one falls; the answer is shown instead.
// Without speech recognition: self-grade (Reveal / I said it ✓ / Missed). In quiet mode: listen-and-choose.
import { store } from '../store.js';
import { sliceSpawn } from '../tuning.js';
import { speaker, Recognizer, recognitionSupported, normalizeJa } from '../audio.js';
import { PHRASES } from '../data.js';
import { esc, shuffle, pick, rand, delegate } from '../ui.js';
import * as fx from '../fx.js';

const ROUND = 60;
const GRAVITY = 0.42;

export function mount(el, ctx) {
  const recognizer = new Recognizer();
  let input = ctx.quiet ? 'choose' : recognitionSupported ? 'speech' : 'self';
  let fallbackNote = ctx.quiet ? 'Quiet mode: pick the Japanese word for the lowest object.' : recognitionSupported ? '' : 'Speech recognition is not available in this browser, so you grade yourself: say it, then tap "I said it ✓".';
  let g = null;           // game state
  let raf = 0;
  let nextId = 1;
  let state = 'intro';
  let controlsFor = -1;   // focus flyer the controls were drawn for

  function newGame() {
    return { flyers: [], score: 0, combo: 0, hits: 0, misses: 0, timeLeft: ROUND, spawnInterval: sliceSpawn(store.engine, input === 'choose'), sinceSpawn: 99,
      recent: [], matchCounts: {}, reveal: null, revealUntil: 0, missed: [], lastTick: performance.now(), choices: null, choiceFor: null };
  }

  // ---------- screens ----------
  function renderIntro() {
    el.innerHTML = `
      <div class="stack center-text">
        <div class="hero-jp accent-c" lang="ja">斬</div>
        <p class="lead strong">Things fly up. Say their Japanese name out loud to slice them.</p>
        <p class="dim">Stuck? Tap an object for its first kana (half points). If one falls, you'll see the answer. Nothing is lost.</p>
        ${fallbackNote ? `<div class="panel note">${esc(fallbackNote)}</div>` : ''}
        <button class="btn primary wide" data-act="start">🎤 Start a 60-second round</button>
      </div>`;
  }

  function renderPlayfield() {
    el.innerHTML = `
      <div class="slice-wrap">
        <div class="slice-hud">
          <div class="row-between"><span class="score mono" id="sl-score">0</span><span class="accent-c strong" id="sl-combo"></span><span class="grow"></span><span class="strong mono dim" id="sl-time">60s</span></div>
          <div class="row-gap small dim"><span class="dot" id="sl-dot"></span><span id="sl-status" class="ellipsis"></span></div>
          <div id="sl-reveal"></div>
        </div>
        <div class="playfield" id="sl-field"></div>
        <div class="slice-controls" id="sl-controls"></div>
      </div>`;
    renderControls();
  }

  function renderControls() {
    const c = el.querySelector('#sl-controls');
    if (!c) return;
    controlsFor = focusFlyer()?.id ?? 0;
    if (input === 'speech') { c.innerHTML = ''; return; }
    const f = focusFlyer();
    if (input === 'self') {
      c.innerHTML = `<p class="small dim">${f ? 'Say the lowest (ringed) one, then grade yourself.' : 'Wait for the next one…'}</p>
        <div class="row3">
          <button class="btn" data-act="sg-reveal" ${f && !f.revealed ? '' : 'disabled'}>Reveal</button>
          <button class="btn good" data-act="sg-ok" ${f ? '' : 'disabled'}>I said it ✓</button>
          <button class="btn" data-act="sg-miss" ${f ? '' : 'disabled'}>Missed</button>
        </div>`;
      return;
    }
    // choose
    if (f && g.choiceFor !== f.id) {
      const others = shuffle(PHRASES.filter((p) => p.kana !== f.phrase.kana)).slice(0, 3);
      g.choices = shuffle([f.phrase, ...others]);
      g.choiceFor = f.id;
    }
    c.innerHTML = f
      ? `<p class="small dim">Which is the lowest (ringed) one?</p><div class="choice-grid">${g.choices.map((p, i) => `<button class="btn" data-act="choose" data-i="${i}" lang="ja">${esc(p.display)}</button>`).join('')}</div>`
      : '<p class="small dim">Wait for the next one…</p><div class="choice-grid"></div>';
  }

  function renderSummary() {
    const missed = [...new Map(g.missed.map((p) => [p.id, p])).values()].sort((a, b) => (a.id < b.id ? -1 : 1));
    el.innerHTML = `
      <div class="stack center-text">
        <div class="score-huge accent-c mono">${g.score}</div>
        <p class="strong lead">${g.hits} sliced · ${g.misses} got away</p>
        ${missed.length ? `<div class="panel left-text stack-sm">
          <p class="section-label">REVIEW THESE (they'll come back sooner)</p>
          ${missed.map((p) => `<div class="word-row"><span class="w110">${esc(p.prompt)}</span><span class="strong" lang="ja">${esc(p.display)}</span><span class="grow"></span><span class="dim" lang="ja">${esc(p.kana)}</span></div>`).join('')}
        </div>` : ''}
        <button class="btn primary wide" data-act="start">↻ Play again</button>
      </div>`;
  }

  // ---------- game loop ----------
  function start() {
    g = newGame();
    state = 'running';
    renderPlayfield();
    store.markSession();
    if (input === 'speech') {
      recognizer.onTranscript = (text) => handleTranscript(text);
      recognizer.onRestart = () => { if (g) g.matchCounts = {}; };
      recognizer.onState = () => updateStatus();
      recognizer.onUnavailable = (reason) => {
        input = 'self';
        fallbackNote = reason + ' Grade yourself instead: say it, then tap "I said it ✓".';
        renderControls();
        updateStatus();
      };
      recognizer.start(PHRASES.flatMap((p) => p.accept));
    }
    updateStatus();
    cancelAnimationFrame(raf);
    raf = requestAnimationFrame(tick);
  }

  function updateStatus() {
    const s = el.querySelector('#sl-status');
    const d = el.querySelector('#sl-dot');
    if (!s) return;
    if (input === 'speech') {
      d.className = 'dot ' + (recognizer.listening ? 'on' : 'off');
      s.textContent = recognizer.transcript ? `「${recognizer.transcript.slice(-18)}」` : recognizer.status;
    } else {
      d.className = 'dot off';
      s.textContent = input === 'choose' ? 'Quiet mode: listen and choose' : (fallbackNote || 'Self-grade mode');
    }
  }

  function tick() {
    if (state !== 'running') return;
    const now = performance.now();
    const dt = Math.min((now - g.lastTick) / 1000, 0.05);
    g.lastTick = now;
    g.timeLeft -= dt;
    if (g.timeLeft <= 0) return finish();
    if (g.reveal && now > g.revealUntil) { g.reveal = null; drawReveal(); }

    g.sinceSpawn += dt;
    const live = g.flyers.filter((f) => !f.slicedAt).length;
    if (g.sinceSpawn >= g.spawnInterval && live < 3) { spawn(); g.sinceSpawn = 0; }

    const keep = [];
    for (const f of g.flyers) {
      if (f.slicedAt) {
        if (now - f.slicedAt < 700) keep.push(f); else f.el?.remove();
        continue;
      }
      f.vy -= GRAVITY * dt;
      f.x += f.vx * dt;
      f.y += f.vy * dt;
      f.spin += dt * 30;
      if (f.y < -0.15 && f.vy < 0) { f.el?.remove(); miss(f.phrase); }
      else keep.push(f);
    }
    g.flyers = keep;
    drawFlyers(now);
    if ((focusFlyer()?.id ?? 0) !== controlsFor) renderControls();
    const t = el.querySelector('#sl-time');
    if (t) t.textContent = Math.ceil(g.timeLeft) + 's';
    raf = requestAnimationFrame(tick);
  }

  function spawn() {
    const onScreen = new Set(g.flyers.filter((f) => !f.slicedAt).map((f) => f.phrase.id));
    const candidates = PHRASES.filter((p) => !onScreen.has(p.id));
    // Words that are due for review show up more often.
    const weighted = candidates.flatMap((p) => (store.isDue(p) ? [p, p, p] : [p]));
    if (!weighted.length) return;
    const phrase = pick(weighted);
    const apex = rand(0.62, 0.82);
    const x = rand(0.18, 0.82);
    g.flyers.push({ id: nextId++, phrase, x, y: -0.1, vx: (0.5 - x) * rand(0.05, 0.18), vy: Math.sqrt(2 * GRAVITY * (apex + 0.1)),
      spin: rand(-20, 20), hinted: false, revealed: false, slicedAt: 0, el: null });
  }

  /** Lowest (most urgent) live flyer. */
  function focusFlyer() {
    if (!g) return null;
    const live = g.flyers.filter((f) => !f.slicedAt);
    return live.sort((a, b) => a.y - b.y)[0] || null;
  }

  function drawFlyers(now) {
    const field = el.querySelector('#sl-field');
    if (!field) return;
    const W = field.clientWidth, H = field.clientHeight;
    const focus = input !== 'speech' ? focusFlyer() : null;
    for (const f of g.flyers) {
      const isEmoji = (f.phrase.prompt.codePointAt(0) || 0) > 0x2000;
      if (!f.el) {
        f.el = document.createElement('button');
        f.el.className = 'flyer' + (isEmoji ? ' emoji' : '');
        f.el.dataset.act = 'hint';
        f.el.dataset.id = f.id;
        field.appendChild(f.el);
      }
      const want = f.slicedAt ? 'sliced' : `${f.hinted}|${f.revealed}|${focus === f}`;
      if (f.el.dataset.state !== want) {
        f.el.dataset.state = want;
        f.el.classList.toggle('focus', focus === f);
        if (f.slicedAt) {
          f.el.className = 'flyer sliced';
          f.el.innerHTML = `<span class="sliced-text" lang="ja">${esc(f.phrase.display)}</span><span class="slash"></span>`;
        } else {
          const hint = f.revealed ? `<span class="flyer-hint" lang="ja">${esc(f.phrase.display)}</span>`
            : f.hinted ? `<span class="flyer-hint" lang="ja">${esc(f.phrase.morae[0].kana)}…</span>` : '';
          f.el.innerHTML = `<span class="flyer-prompt">${esc(f.phrase.prompt)}</span>${hint}`;
          f.el.setAttribute('aria-label', `Flying: ${f.phrase.prompt}. Tap for a hint.`);
        }
      }
      const px = f.x * W, py = (1 - f.y) * H;
      if (f.slicedAt) {
        const age = Math.min((now - f.slicedAt) / 700, 1);
        f.el.style.transform = `translate(-50%, -50%) translate(${px}px, ${py}px) scale(${1 + age * 0.5})`;
        f.el.style.opacity = String(1 - age);
      } else {
        f.el.style.transform = `translate(-50%, -50%) translate(${px}px, ${py}px)`;
        const p = f.el.firstElementChild;
        if (p && isEmoji) p.style.transform = `rotate(${f.spin}deg)`;
      }
    }
  }

  function drawReveal() {
    const r = el.querySelector('#sl-reveal');
    if (!r) return;
    const p = g.reveal;
    r.innerHTML = p ? `<div class="panel reveal"><p class="lead strong" lang="ja">${esc(p.prompt)}  →  ${esc(p.display)}</p><p class="small" lang="ja">${esc(p.kana)} · ${esc(p.meaning)}</p></div>` : '';
  }

  function drawHud() {
    const s = el.querySelector('#sl-score');
    if (s) s.textContent = g.score;
    const c = el.querySelector('#sl-combo');
    if (c) c.textContent = g.combo > 1 ? '×' + g.combo : '';
  }

  function miss(phrase) {
    g.misses++;
    g.combo = 0;
    record(false);
    g.missed.push(phrase);
    store.recordSlice(phrase, false);
    store.grade({ skill: input === 'choose' ? 'vocab' : 'speaking', id: phrase.id, ok: false });
    // Show the answer instead of taking a life.
    g.reveal = phrase;
    g.revealUntil = performance.now() + 2800;
    drawReveal();
    fx.miss({ el: el.querySelector('#sl-reveal .reveal') });
    drawHud();
    renderControls();
  }

  function record(hit) {
    g.recent.push(hit);
    if (g.recent.length > 8) g.recent.shift();
    if (g.recent.length < 4) return;
    const rate = g.recent.filter(Boolean).length / g.recent.length;
    // Aim for roughly 85% success: speed up when it's easy, ease off when it's hard.
    if (rate > 0.9) g.spawnInterval = Math.max(1.4, g.spawnInterval - 0.25);
    else if (rate < 0.75) g.spawnInterval = Math.min(4.5, g.spawnInterval + 0.3);
  }

  function slice(f) {
    f.slicedAt = performance.now();
    g.hits++;
    g.combo++;
    const base = 100 + g.combo * 10;
    g.score += f.hinted || f.revealed ? Math.floor(base / 2) : base;
    record(true);
    store.recordSlice(f.phrase, true);
    store.grade({ skill: input === 'choose' ? 'vocab' : 'speaking', id: f.phrase.id, ok: true, firstTry: !f.hinted && !f.revealed });
    if (input !== 'speech') speaker.speak(f.phrase.speak, { mps: 4 });
    fx.hit({ el: f.el });
    drawHud();
    renderControls();
  }

  const occurrences = (needle, hay) => (needle ? hay.split(needle).length - 1 : 0);

  /** Check the latest transcript for any word currently in the air. */
  function handleTranscript(text) {
    if (state !== 'running') return;
    updateStatus();
    const order = g.flyers.filter((f) => !f.slicedAt).sort((a, b) => a.y - b.y);   // lowest (most urgent) first
    for (const f of order) {
      for (const raw of f.phrase.accept) {
        const form = normalizeJa(raw);
        const seen = occurrences(form, text);
        if (seen > (g.matchCounts[form] || 0)) {
          g.matchCounts[form] = seen;
          slice(f);
          return;
        }
      }
    }
  }

  function finish() {
    state = 'finished';
    cancelAnimationFrame(raf);
    recognizer.stop();
    renderSummary();
    if (ctx.today) { ctx.today.report('1/1'); ctx.today.done(); }
  }

  const off = delegate(el, {
    start,
    hint: (b) => {
      const f = g && g.flyers.find((x) => x.id === +b.dataset.id);
      if (f && !f.slicedAt) { f.hinted = true; drawFlyers(performance.now()); }
    },
    'sg-reveal': () => { const f = focusFlyer(); if (f) { f.revealed = true; speaker.speak(f.phrase.speak, { mps: 3.5 }); drawFlyers(performance.now()); renderControls(); } },
    'sg-ok': () => { const f = focusFlyer(); if (f) slice(f); },
    'sg-miss': () => { const f = focusFlyer(); if (f) { f.slicedAt = performance.now() - 700; miss(f.phrase); } },
    choose: (b) => {
      const f = focusFlyer();
      if (!f || !g.choices) return;
      const p = g.choices[+b.dataset.i];
      if (p.id === f.phrase.id) slice(f);
      else { f.slicedAt = performance.now() - 700; miss(f.phrase); speaker.speak(f.phrase.speak, { mps: 3.5 }); }
    },
  });

  renderIntro();
  if (ctx.today) ctx.today.report('0/1');
  return () => { off(); state = 'gone'; cancelAnimationFrame(raf); recognizer.stop(); speaker.stop(); };
}
