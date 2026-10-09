// Rhythm (RhythmView.swift + RhythmScorer.swift): a line sweeps across the morae while you say them;
// the melody line shows pitch accent and your own pitch is drawn over it.
import { store } from '../store.js';
import { speaker, PitchTracker, semitones, micSupported, micHelp } from '../audio.js';
import { esc, delegate } from '../ui.js';
import { PHRASE_BY_ID } from '../data.js';
import * as fx from '../fx.js';
import { romajiIfWanted } from '../furigana.js';

// ---------- Scorer (generous) ----------

export function median(values) {
  if (!values.length) return null;
  const s = values.slice().sort((a, b) => a - b);
  return s[Math.floor(s.length / 2)];
}

/**
 * Timing is "were you voicing during the beat?", pitch is "did you go up and down where the melody
 * goes up and down?" relative to your own voice, so any voice range works.
 */
export function scoreRhythm(phrase, samples, beat, lineStart) {
  const morae = phrase.morae;
  // Allow for reaction time: lock onto when the player actually started (up to half a second late).
  const fv = samples.find((s) => s.hz != null && s.time > lineStart - 0.3);
  const firstVoiced = fv ? fv.time : lineStart;
  const offset = Math.min(Math.max(firstVoiced - lineStart, -0.15), 0.5);
  const start = lineStart + offset;

  const voicedHz = samples.map((s) => s.hz).filter((h) => h != null && h > 60 && h < 500);
  const reference = median(voicedHz) ?? 150;

  const results = morae.map((mo, i) => {
    const lo = start + i * beat;
    const hi = lo + beat;
    const win = samples.filter((s) => s.time >= lo && s.time < hi);
    const voicedShare = win.length ? win.filter((s) => s.hz != null).length / win.length : 0;
    const hit = mo.silent ? voicedShare < 0.5 : voicedShare >= 0.25;
    const md = median(win.map((s) => s.hz).filter((h) => h != null));
    return { hit, semitone: mo.silent || md == null ? null : semitones(md, reference) };
  });

  const timing = morae.length ? results.filter((r) => r.hit).length / morae.length : 0;

  // Compare each change in the target melody with the player's movement.
  let checks = 0, correct = 0, last = null;
  morae.forEach((mo, i) => {
    if (mo.silent) return;
    const prev = last;
    last = i;
    if (prev === null || morae[prev].high === mo.high) return;
    checks++;
    const a = results[prev].semitone, b = results[i].semitone;
    if (a == null || b == null) return;
    const rising = !morae[prev].high && mo.high;
    if (rising ? b - a > 0.4 : a - b > 0.4) correct++;
  });
  const pitch = checks === 0 ? 1 : correct / checks;
  const total = 0.6 * timing + 0.4 * pitch;
  return { timing, pitch, perMora: results, total, passed: total >= 0.8 };
}

// ---------- View ----------

export function mount(el, ctx) {
  const GOAL = 3;
  const COUNTDOWN = 1.6;
  const tracker = new PitchTracker();
  // A course unit can limit the phrases (ctx.phraseIds), keeping the review order for the ones it includes.
  const unitQueue = () => {
    const q = store.queue();
    if (!ctx.phraseIds?.length) return q;
    const mine = q.filter((p) => ctx.phraseIds.includes(p.id));
    return mine.length ? mine : ctx.phraseIds.map((id) => PHRASE_BY_ID[id]).filter(Boolean);
  };
  let queue = unitQueue();
  let index = 0;
  let phase = 'ready';
  let playStart = 0;
  let result = null;
  let micError = null;
  let selfGrade = !micSupported || ctx.quiet;   // no mic: grade yourself
  let attempted = new Set();
  let raf = 0;
  let timers = [];
  let colors = {};

  const phrase = () => queue[index % queue.length];
  const level = () => store.level(phrase());
  const mps = () => Math.min(2.0 + 0.8 * level(), 7.0);
  const beat = () => 1 / mps();
  const latency = () => (store.settings.latencyMs || 0) / 1000;
  const showDisplay = () => level() < 2 || phase === 'result';
  /** Hide more of the lyrics as you level up, so you say it from memory. Everything shows again after a try. */
  const kanaVisible = (i) => phase === 'result' || level() === 0 || (level() === 1 && i % 2 === 0);

  function readColors() {
    const cs = getComputedStyle(document.documentElement);
    for (const k of ['panel', 'ink', 'dim', 'accent', 'trace', 'good', 'miss', 'line']) colors[k] = cs.getPropertyValue('--' + k).trim();
  }

  function render() {
    const p = phrase();
    const busy = phase === 'countdown' || phase === 'playing';
    el.innerHTML = `
      <div class="stack">
        ${ctx.quiet ? '<div class="panel note">🤫 Quiet mode: Rhythm needs your voice, so the mic is off. Listen, mouth along, and grade yourself.</div>' : ''}
        <div class="row-between">
          <span class="badge ${p.isBoss ? 'boss' : ''}">${p.isBoss ? 'BOSS · pitch pair' : 'Level ' + level()}</span>
          <span class="small dim mono">${mps().toFixed(1)} morae/sec</span>
        </div>
        <p class="lead strong">${esc(p.meaning)}</p>
        <p class="rhythm-display" lang="ja">${showDisplay() ? esc(p.display) : '・・・'}</p>
        ${micError ? `<p class="small miss-c">${esc(micError)}</p>` : ''}
        <div class="track-wrap"><canvas class="track" height="230" aria-label="Rhythm track"></canvas></div>
        <div class="row3">
          <button class="btn" data-act="listen" ${busy ? 'disabled' : ''}>🔊 Listen</button>
          <button class="btn primary" data-act="play" ${busy ? 'disabled' : ''}>${phase === 'result' ? '🎤 Again' : '🎤 Sing it'}</button>
          <button class="btn" data-act="next" ${busy ? 'disabled' : ''}>Next ▶</button>
        </div>
        ${phase === 'result' && result ? resultCard(p) : ''}
        ${phase === 'result' && !result ? `<div class="panel stack-sm">
            <p>How did it go? Compare with the melody, then grade yourself.</p>
            <div class="row3">
              <button class="btn" data-act="listen">Reveal 🔊</button>
              <button class="btn good" data-act="sg-ok">I said it ✓</button>
              <button class="btn" data-act="sg-miss">Missed</button>
            </div></div>` : ''}
        ${phase === 'ready' ? `<p class="small dim">Tap Sing it: after Ready, Set, Go, say one mora per beat as the line sweeps. ${selfGrade ? 'No mic here, so you grade yourself.' : 'Pink dots are the target melody; blue dots are your voice.'}</p>` : ''}
      </div>`;
    draw();
  }

  function resultCard(p) {
    const r = result;
    return `<div class="panel stack-sm">
      <div class="row-gap baseline"><span class="score-big ${r.passed ? 'good-c' : ''}">${Math.round(r.total * 100)}%</span>
        <span class="small dim">${r.passed ? "Cleared. Next time it's faster, with fewer lyrics." : 'Close. Listen once more, then try again.'}</span></div>
      <div class="row-gap"><span><span class="tiny dim strong">RHYTHM</span><br><span class="strong mono">${Math.round(r.timing * 100)}%</span></span>
        <span><span class="tiny dim strong">PITCH</span><br><span class="strong mono">${Math.round(r.pitch * 100)}%</span></span></div>
      <p class="small dim" lang="ja">${esc(p.kana)} · ${esc(p.meaning)}</p></div>`;
  }

  function draw() {
    const canvas = el.querySelector('canvas.track');
    if (!canvas) return;
    const dpr = window.devicePixelRatio || 1;
    const W = canvas.clientWidth || 300;
    const H = 230;
    if (canvas.width !== Math.round(W * dpr)) { canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr); }
    const g = canvas.getContext('2d');
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.clearRect(0, 0, W, H);
    const p = phrase();
    const n = p.morae.length;
    const left = 8, right = W - 8;
    const slot = (right - left) / n;
    const highY = 40, lowY = 110, kanaY = 175;
    const elapsed = (performance.now() - playStart) / 1000;
    const lineElapsed = elapsed - COUNTDOWN;

    // Lane background
    g.fillStyle = colors.panel;
    roundRect(g, 0, 0, W, H, 18); g.fill();

    // Beat dividers
    g.strokeStyle = colors.line; g.lineWidth = 1;
    for (let i = 0; i <= n; i++) {
      const x = left + i * slot;
      g.beginPath(); g.moveTo(x, 18); g.lineTo(x, H - 18); g.stroke();
    }

    // Target melody
    const pts = [];
    p.morae.forEach((mo, i) => { if (!mo.silent) pts.push([left + (i + 0.5) * slot, mo.high ? highY : lowY]); });
    g.strokeStyle = colors.accent; g.globalAlpha = 0.85; g.lineWidth = 4; g.lineCap = 'round'; g.lineJoin = 'round';
    g.beginPath(); pts.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); g.stroke();
    g.globalAlpha = 1; g.fillStyle = colors.accent;
    pts.forEach(([x, y]) => { g.beginPath(); g.arc(x, y, 9, 0, Math.PI * 2); g.fill(); });

    // Player's pitch trace, relative to their own average voice
    if ((phase === 'playing' || phase === 'result') && tracker.samples.length) {
      const voiced = tracker.samples.map((s) => s.hz).filter((h) => h != null);
      const ref = median(voiced);
      if (ref) {
        const total = n * beat();
        const mid = (highY + lowY) / 2;
        const perSemitone = (lowY - highY) / 6;
        g.fillStyle = colors.trace; g.globalAlpha = 0.9;
        for (const s of tracker.samples) {
          if (s.hz == null) continue;
          const t = s.time - COUNTDOWN - latency();
          if (t < -0.1 || t > total + 0.3) continue;
          const x = left + (t / total) * (right - left);
          const st = Math.max(-5, Math.min(5, semitones(s.hz, ref)));
          const y = mid - st * perSemitone;
          g.beginPath(); g.arc(x, y, 2.5, 0, Math.PI * 2); g.fill();
        }
        g.globalAlpha = 1;
      }
    }

    // Kana lyrics, with per-mora result colors after a try
    const fs = Math.min(30, slot * 0.6);
    g.font = `700 ${fs}px "Hiragino Sans", "Yu Gothic", "Noto Sans JP", "IPAGothic", system-ui, sans-serif`;
    g.textAlign = 'center'; g.textBaseline = 'middle';
    p.morae.forEach((mo, i) => {
      const cx = left + (i + 0.5) * slot;
      if (phase === 'result' && result && i < result.perMora.length) {
        g.fillStyle = result.perMora[i].hit ? colors.good : colors.miss;
        g.globalAlpha = 0.25;
        roundRect(g, cx - slot / 2 + 3, kanaY - 24, slot - 6, 48, 10); g.fill();
        g.globalAlpha = 1;
      }
      g.fillStyle = colors.ink;
      g.fillText(kanaVisible(i) ? mo.kana : '・', cx, kanaY);
      // Romaji under each mora while hiragana is still being learned.
      const ro = kanaVisible(i) && !mo.silent ? romajiIfWanted(mo.kana) : '';
      if (ro) {
        g.save();
        g.font = `600 ${Math.min(15, slot * 0.32)}px system-ui, sans-serif`;
        g.fillStyle = colors.dim;
        g.fillText(ro, cx, kanaY + fs * 0.5 + 14);
        g.restore();
      }
    });

    // Sweeping line
    if (phase === 'playing') {
      const total = n * beat();
      const prog = Math.max(0, Math.min(1, lineElapsed / total));
      const x = left + prog * (right - left);
      g.strokeStyle = colors.ink; g.lineWidth = 3;
      g.beginPath(); g.moveTo(x, 10); g.lineTo(x, H - 10); g.stroke();
    }

    if (phase === 'countdown') {
      const remaining = Math.max(0, COUNTDOWN - elapsed);
      g.font = '900 44px system-ui, sans-serif';
      g.fillStyle = colors.accent;
      g.fillText(remaining > 1.05 ? 'Ready' : remaining > 0.5 ? 'Set' : 'Go', W / 2, H / 2 - 10);
    }
  }

  function loop() {
    draw();
    if (phase === 'countdown' || phase === 'playing') raf = requestAnimationFrame(loop);
  }

  async function play() {
    const p = phrase();
    speaker.stop();
    result = null;
    micError = null;
    if (!selfGrade) {
      try {
        await tracker.start();
      } catch (e) {
        selfGrade = true;
        micError = e && e.name === 'NotAllowedError'
          ? micHelp() + ' For now, grade yourself.'
          : `Couldn't start the microphone (${(e && e.message) || e}). Grade yourself for now.`;
      }
    }
    tracker.resetClock();
    playStart = performance.now();
    phase = 'countdown';
    render();
    cancelAnimationFrame(raf);
    raf = requestAnimationFrame(loop);
    const total = p.morae.length * beat();
    timers.push(setTimeout(() => { if (!selfGrade) tracker.calibrateNoise(tracker.samples); }, 1000));
    timers.push(setTimeout(() => { phase = 'playing'; render(); cancelAnimationFrame(raf); raf = requestAnimationFrame(loop); }, COUNTDOWN * 1000));
    timers.push(setTimeout(() => {
      if (selfGrade) {
        result = null;
      } else {
        result = scoreRhythm(p, tracker.samples, beat(), COUNTDOWN + latency());
        store.recordRhythm(p, result.total);
        store.grade({ skill: 'speaking', id: p.id, ok: result.passed });
        store.grade({ skill: 'pitch', id: p.id, ok: result.pitch >= 0.75 });
        countAttempt(p);
      }
      phase = 'result';
      render();
      if (result) { if (result.passed) fx.hit({ el: el.querySelector('.score-big') }); else fx.miss({ el: el.querySelector('.score-big') }); }
    }, (COUNTDOWN + total + 0.6) * 1000));
  }

  function countAttempt(p) {
    attempted.add(p.id);
    if (ctx.today) {
      ctx.today.report(`${Math.min(attempted.size, GOAL)}/${GOAL}`);
      if (attempted.size >= GOAL) ctx.today.done();
    }
  }

  function selfGraded(ok) {
    const p = phrase();
    // Generous: saying it along counts as a clear.
    result = { timing: ok ? 1 : 0, pitch: ok ? 1 : 0, perMora: p.morae.map(() => ({ hit: ok })), total: ok ? 0.85 : 0, passed: ok };
    store.recordRhythm(p, result.total);
    store.grade({ skill: 'speaking', id: p.id, ok });
    countAttempt(p);
    render();
    if (ok) fx.hit({ el: el.querySelector('.score-big') }); else fx.miss();
  }

  function next() {
    result = null;
    phase = 'ready';
    const current = phrase()?.id;
    queue = unitQueue();
    const i = queue.findIndex((q) => q.id === current);
    index = queue.length > 1 && i >= 0 ? (i + 1) % queue.length : 0;
    render();
  }

  const off = delegate(el, {
    listen: () => speaker.speak(phrase().speak, { mps: mps() }),
    play,
    next,
    'sg-ok': () => selfGraded(true),
    'sg-miss': () => selfGraded(false),
  });
  const onResize = () => draw();
  window.addEventListener('resize', onResize);
  const mq = window.matchMedia('(prefers-color-scheme: dark)');
  const onScheme = () => { readColors(); draw(); };
  mq.addEventListener?.('change', onScheme);

  store.markSession();
  readColors();
  if (ctx.today) ctx.today.report(`0/${GOAL}`);
  render();

  return () => {
    off();
    timers.forEach(clearTimeout);
    cancelAnimationFrame(raf);
    window.removeEventListener('resize', onResize);
    mq.removeEventListener?.('change', onScheme);
    tracker.stop();
    speaker.stop();
  };
}

function roundRect(g, x, y, w, h, r) {
  g.beginPath();
  g.moveTo(x + r, y);
  g.arcTo(x + w, y, x + w, y + h, r);
  g.arcTo(x + w, y + h, x, y + h, r);
  g.arcTo(x, y + h, x, y, r);
  g.arcTo(x, y, x + w, y, r);
  g.closePath();
}
