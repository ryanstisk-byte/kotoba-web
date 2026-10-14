// Pitch Coach: learn to steer your pitch, beat by beat, with a live line over the word's melody (karaoke style).
//
//  * Live line: the mic's pitch (PitchTracker), median-filtered, drawn as you speak on a FIXED scale in semitones
//    around your own comfortable middle pitch (learned per device, see pitch-score.js). Your comfortable band is
//    shaded lightly behind. The target is drawn as high and low steps, timed to the app's own clip, with the drop
//    marked. Whispered beats (the す in です) are left out of the drawing and the scoring, with a note saying why.
//  * Ladder: hum it → ma-ma-ma → the word → the word with が. The model plays first each time; jump to any step.
//    Moving up is suggested after a Great or two Closes, never forced.
//  * Just this step: loops only two beats around a problem, cut from the real clip, until it's right twice.
//  * Ears first: before the first session on a word, hear it in two or three voices and tap where the pitch drops.
// Everything runs on the device; nothing is sent anywhere.
import { store } from './store.js';
import { speaker, PitchTracker, micSupported, micHelp, audioContext } from './audio.js';
import { CLIPS } from './clips.js';
import { moraInfo, targetPitch, moraSlots } from './pron-analysis.js';
import { modelClip, beatTimes, playClipPart } from './model-clip.js';
import {
  semitones, fromSemitones, yFor, medianFilter, voiceFrom, learnVoice, dropAt, withParticle, scorePitch, beatsPitch,
  SCALE_ST, STEP_ST, BIG_STEP_ST,
} from './pitch-score.js';
import { esc } from './ui.js';
import * as fx from './fx.js';

export const STEPS = [
  { id: 'hum', label: 'Hum it', short: 'Hum', how: 'Hum the melody on "mm": no sounds to worry about, just high and low.' },
  { id: 'ma', label: 'Ma-ma-ma', short: 'Ma-ma', how: 'Say "ma" on every beat, following the melody.' },
  { id: 'word', label: 'The word', short: 'Word', how: 'Now the word itself, with the same melody.' },
  { id: 'ga', label: 'Word + が', short: '+ が', how: 'The word with が after it: here you can hear whether the pitch drops after the last beat.' },
];

/** A Pitch Coach target from a starter phrase (Rhythm, Pitch Duel): its melody is known beat by beat. */
export function phraseTarget(p) {
  return { id: p.id, jp: p.display, reading: p.kana, say: p.speak || p.display, voice: 0, en: p.meaning, highs: (p.morae || []).map((m) => !!m.high) };
}

/** High/low per beat for the target: known accent or melody, else read from the model clip's own pitch. */
function highsFor(target, clip, morae) {
  const known = targetPitch(target, null);
  if (known && known.length === morae.length) return known;
  if (clip) {
    const times = beatTimes(clip, morae.length);
    const slots = times.map((t) => {
      const fs = clip.frames.filter((f) => f.time >= clip.span.from + t.from && f.time < clip.span.from + t.to && f.hz);
      const hz = fs.map((f) => f.hz).sort((a, b) => a - b);
      return { modelPitch: hz.length ? semitones(hz[Math.floor(hz.length / 2)], 150) : null };
    });
    const h = targetPitch({}, slots);
    if (h) return h;
  }
  return morae.map((_, i) => i > 0);   // a gentle default: low then high (the most common shape)
}

// ---------- the panel ----------
let coach = null;

function colors() {
  const cs = getComputedStyle(document.body);
  const v = (k, d) => cs.getPropertyValue('--' + k).trim() || d;
  return { ink: v('ink', '#222'), dim: v('dim', '#777'), accent: v('accent', '#c4300c'), good: v('good', '#1a7f4b'), band: v('surface-2', '#eee'), line: v('border', '#ddd'), fontJp: v('font-jp', 'sans-serif') };
}

/** What the current exercise is: its beats (kana, high/low, left out?) and how long each lasts in the model. */
function exercise() {
  const c = coach;
  const all = c.morae.map((m, i) => ({ kana: m.kana, high: c.highs[i], skip: m.devoice || m.type === 'sokuon', devoice: m.devoice }));
  if (c.mode === 'focus') {
    const { a, b } = c.focus;
    return { beats: all.slice(a, b + 1), times: c.times.slice(a, b + 1).map((t, i, arr) => ({ from: t.from - arr[0].from, to: t.to - arr[0].from })) };
  }
  const step = c.step;
  const beats = all.map((x) => (step === 'hum' || step === 'ma' ? { ...x, skip: x.skip && !x.devoice ? true : x.skip } : x));
  let times = c.times;
  if (step === 'ga') {
    const gaHigh = withParticle(c.highs, c.target.accent)[c.highs.length];
    beats.push({ kana: 'が', high: gaHigh, skip: false, particle: true });
    const per = times.length ? times[times.length - 1].to / times.length : 0.22;
    times = [...times, { from: times[times.length - 1]?.to || 0, to: (times[times.length - 1]?.to || 0) + per }];
  }
  return { beats, times };
}

function stepHTML() {
  const c = coach;
  return `<div class="seg seg-wrap coach-steps" role="tablist" aria-label="Pitch Coach steps">${STEPS.map((s, i) => `
    <button class="seg-btn ${c.mode === 'ladder' && c.step === s.id ? 'on' : ''} ${c.suggest === s.id ? 'suggested' : ''}" role="tab" aria-selected="${c.mode === 'ladder' && c.step === s.id}"
      data-cact="step" data-step="${s.id}" ${c.busy ? 'disabled' : ''}>${i + 1}. ${esc(s.short)}</button>`).join('')}</div>`;
}

function render() {
  const c = coach;
  if (!c) return;
  const { el, target } = c;
  const head = `<div class="row-between pron-head"><h2 class="section-title" id="coach-h">Pitch Coach</h2>
      <button class="btn ghost small-btn" data-cact="close" aria-label="Close the Pitch Coach">✕ Close</button></div>
    <div class="pron-word"><span class="pron-jp" lang="ja">${esc(target.jp || target.reading)}</span>
      ${target.reading !== target.jp ? `<span class="small dim" lang="ja">${esc(target.reading)}</span>` : ''}
      ${target.en ? `<span class="small">${esc(target.en)}</span>` : ''}</div>`;
  let body = '';
  if (c.mode === 'loading') body = '<p role="status">Getting the melody ready…</p>';
  else if (c.mode === 'micerror') body = `<p class="miss-c">${esc(c.error)}</p><p class="small">The <a href="#/check" data-cact="close">sound &amp; mic check</a> can help find what's wrong.</p>`;
  else if (c.mode === 'calib') body = calibHTML();
  else if (c.mode === 'ears') body = earsHTML();
  else body = drillHTML();
  c.el.querySelector('.coach-body').innerHTML = head + body;
  const canvas = c.el.querySelector('canvas.coach-line');
  if (canvas) { c.canvas = canvas; draw(); }
}

// ---------- 1. your voice ----------
function calibHTML() {
  const c = coach;
  return `<p class="lead strong">First, find your voice</p>
    <p class="small">Say a long <span lang="ja" class="strong">あ</span> at your normal speaking voice, about two seconds, not too high or low. The coach uses it as your middle, so its scale fits you. It's saved on this device and keeps learning as you go.</p>
    ${c.calibMsg ? `<p class="small ${c.calibOk ? 'good-c' : 'miss-c'}" role="status">${esc(c.calibMsg)}</p>` : ''}
    ${c.recording ? `<p class="lead" role="status">Say あ… <span class="mono">${c.countdown || ''}</span></p><div class="meter" aria-hidden="true"><span id="coach-level" style="width:0%"></span></div>`
      : `<button class="btn primary wide" data-cact="calib">Say あ now (2 seconds)</button>
         <button class="btn ghost wide" data-cact="calibskip">Skip: guess for now</button>`}`;
}

async function runCalibration() {
  const c = coach;
  if (!(await ensureMic())) return;
  c.recording = true;
  c.calibMsg = '';
  const start = c.tracker.samples.length;
  let left = 2.2;
  c.countdown = '2';
  render();
  const tick = setInterval(() => {
    left -= 0.1;
    const lv = c.el.querySelector('#coach-level');
    if (lv) lv.style.width = Math.min(100, c.tracker.liveLevel * 600).toFixed(0) + '%';
    if (Math.ceil(left) !== Number(c.countdown)) { c.countdown = String(Math.max(0, Math.ceil(left))); const s = c.el.querySelector('.lead .mono'); if (s) s.textContent = c.countdown; }
    if (left <= 0) {
      clearInterval(tick);
      if (coach !== c) return;
      c.recording = false;
      const hzs = c.tracker.samples.slice(start).map((x) => x.hz).filter(Boolean);
      const v = voiceFrom(hzs);
      if (v) {
        store.setVoice({ ...v, n: 1 });
        c.calibOk = true;
        c.calibMsg = 'Got it. Your middle pitch is set.';
        startDrill();
      } else {
        c.calibOk = false;
        c.calibMsg = "I couldn't hear a steady あ. Try a little closer to the mic, or skip and it will learn as you practise.";
        render();
      }
    }
  }, 100);
  c.timers.push(tick);
}

// ---------- the live line ----------
function draw() {
  const c = coach;
  if (!c || !c.canvas) return;
  const canvas = c.canvas;
  const dpr = window.devicePixelRatio || 1;
  const w = canvas.clientWidth || 320, h = 190;
  if (canvas.width !== Math.round(w * dpr)) { canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr); }
  const g = canvas.getContext('2d');
  g.setTransform(dpr, 0, 0, dpr, 0, 0);
  g.clearRect(0, 0, w, h);
  const col = colors();
  const { beats, times } = exercise();
  const total = times.length ? times[times.length - 1].to : 1;
  const user = c.line || [];
  const userEnd = user.length ? user[user.length - 1].t : 0;
  const axis = Math.max(total * 1.4, userEnd + 0.15, 0.8);
  const left = 10, right = w - 10, plotH = h - 30;
  const x = (t) => left + (t / axis) * (right - left);
  const y = (st) => yFor(st, plotH, 12);
  const step = c.bigger ? BIG_STEP_ST : STEP_ST;
  // Your comfortable band, lightly.
  const voice = store.voice;
  if (voice) {
    g.fillStyle = col.band;
    g.globalAlpha = 0.7;
    g.fillRect(left, y(voice.hi), right - left, y(voice.lo) - y(voice.hi));
    g.globalAlpha = 1;
  }
  // Middle line.
  g.strokeStyle = col.line;
  g.lineWidth = 1;
  g.setLineDash([3, 4]);
  g.beginPath(); g.moveTo(left, y(0)); g.lineTo(right, y(0)); g.stroke();
  g.setLineDash([]);
  // Target steps.
  const kDrop = beats.findIndex((b, i) => b.high && beats[i + 1] && beats[i + 1].high === false);
  beats.forEach((b, i) => {
    const t = times[i];
    if (!t) return;
    const yy = y(b.high ? step : -step);
    g.lineCap = 'round';
    if (b.skip) {
      g.strokeStyle = col.dim;
      g.lineWidth = 2;
      g.setLineDash([2, 5]);
      g.beginPath(); g.moveTo(x(t.from) + 4, yy); g.lineTo(x(t.to) - 4, yy); g.stroke();
      g.setLineDash([]);
    } else {
      g.strokeStyle = col.accent;
      g.globalAlpha = 0.35;
      g.lineWidth = 12;
      g.beginPath(); g.moveTo(x(t.from) + 6, yy); g.lineTo(x(t.to) - 6, yy); g.stroke();
      g.globalAlpha = 1;
    }
    g.fillStyle = b.skip ? col.dim : col.ink;
    g.font = `700 15px ${col.fontJp}`;
    g.textAlign = 'center';
    g.fillText(b.kana, (x(t.from) + x(t.to)) / 2, h - 8);
  });
  // The drop, clearly marked: a line down from the last high beat, with an arrowhead.
  if (kDrop >= 0 && times[kDrop]) {
    const xd = x(times[kDrop].to);
    g.strokeStyle = col.accent;
    g.lineWidth = 2.5;
    g.beginPath(); g.moveTo(xd, y(step) - 2); g.lineTo(xd, y(-step) + 2); g.stroke();
    g.beginPath(); g.moveTo(xd - 5, y(-step) - 5); g.lineTo(xd, y(-step) + 2); g.lineTo(xd + 5, y(-step) - 5); g.stroke();
    g.fillStyle = col.accent;
    g.font = '600 11px sans-serif';
    g.textAlign = 'left';
    g.fillText('drop', Math.min(xd + 4, right - 30), y(0) - 4);
  }
  // The model's playhead.
  if (c.playhead != null) {
    g.strokeStyle = col.dim;
    g.lineWidth = 1.5;
    g.beginPath(); g.moveTo(x(c.playhead), 6); g.lineTo(x(c.playhead), plotH); g.stroke();
  }
  // Your line.
  if (user.length) {
    g.strokeStyle = col.good;
    g.lineWidth = 3.5;
    g.lineJoin = 'round';
    g.beginPath();
    let pen = false;
    let lastT = -1;
    for (const p of user) {
      if (p.st == null) { pen = false; continue; }
      const gap = lastT >= 0 && p.t - lastT > 0.12;
      if (!pen || gap) g.moveTo(x(p.t), y(p.st)); else g.lineTo(x(p.t), y(p.st));
      pen = true;
      lastT = p.t;
    }
    g.stroke();
    const lastPt = [...user].reverse().find((p) => p.st != null);
    if (lastPt && c.recording) { g.fillStyle = col.good; g.beginPath(); g.arc(x(lastPt.t), y(lastPt.st), 5, 0, Math.PI * 2); g.fill(); }
  }
  canvas.setAttribute('aria-label', describe(beats));
}

function describe(beats) {
  const shape = beats.filter((b) => !b.skip).map((b) => `${b.kana} ${b.high ? 'high' : 'low'}`).join(', ');
  const r = coach.result;
  const yours = r && r.steps.length ? ` Your steps: ${r.steps.map((s) => `${s.got}${s.ok ? '' : ' (wanted ' + s.want + ')'}`).join(', ')}.` : '';
  return `Target melody: ${shape}.${yours}`;
}

// ---------- drill: the ladder and "just this step" ----------
function drillHTML() {
  const c = coach;
  const { beats } = exercise();
  const whisper = beats.filter((b) => b.devoice);
  const stepInfo = STEPS.find((s) => s.id === c.step);
  const r = c.result;
  const v = r ? { great: ['Great!', 'good-c'], close: ['Close!', 'accent-c'], try: ['Try again', 'dim'], none: ['No pitch heard', 'dim'] }[r.verdict] : null;
  const head = c.mode === 'focus'
    ? `<p class="strong">Just this step: <span lang="ja">${esc(beats.map((b) => b.kana).join(' → '))}</span></p>
       <p class="small">Copy just these two beats. Your line shows whether you went up or down. Right twice in a row and it's back to the whole word. <span class="mono">${c.focusRight}/2</span></p>`
    : `${stepHTML()}<p class="small">${esc(stepInfo.how)}</p>`;
  return `${head}
    <div class="coach-line-wrap"><canvas class="coach-line" role="img" height="190"></canvas></div>
    <p class="tiny dim coach-key"><span><span class="pron-key pron-key-t"></span> the melody: high and low steps${beats.some((b, i) => b.high && beats[i + 1]?.high === false) ? ', with the drop marked' : ''}</span> <span><span class="pron-key pron-key-u"></span> you, live</span></p>
    ${whisper.length ? `<p class="tiny dim">The <span lang="ja">${esc(whisper.map((b) => b.kana).join('、'))}</span> ${whisper.length > 1 ? 'are' : 'is'} whispered in normal speech (like the す in です), so there's no pitch to draw or score there.</p>` : ''}
    ${!store.voice ? '<p class="tiny dim">Your middle pitch is a guess for now; it learns from your attempts.</p>' : ''}
    <p class="small strong" role="status" aria-live="polite">${c.status || ''}</p>
    ${r ? `<div class="pron-verdict"><p class="pron-title ${v[1]}">${v[0]}</p>
      ${r.steps.length ? `<p class="small">${r.steps.map((s) => `<span class="coach-step ${s.ok ? 'ok' : 'miss'}" lang="ja">${esc(beats[s.from]?.kana || '')}→${esc(beats[s.to]?.kana || '')} ${arrow(s.got)}${s.ok ? ' ✓' : ` (${arrow(s.want)})`}</span>`).join(' ')}</p>` : ''}
      ${r.note ? `<p class="small">${esc(r.note)}</p>` : ''}</div>` : ''}
    <div class="row2">
      <button class="btn primary" data-cact="go" ${c.busy ? 'disabled' : ''}>${r ? '↻ Again' : '▶ Start'}</button>
      ${c.mode === 'ladder' && c.suggest && c.suggest !== c.step ? `<button class="btn good" data-cact="step" data-step="${c.suggest}">Next step ▶</button>`
        : c.recording ? '<button class="btn" data-cact="stop">■ Done</button>' : `<button class="btn" data-cact="model" ${c.busy ? 'disabled' : ''}>🔊 Model only</button>`}
    </div>
    <label class="switch-row small"><span>Bigger: exaggerate the drop</span><input type="checkbox" role="switch" data-cact-change="bigger" ${c.bigger ? 'checked' : ''}></label>
    <div class="coach-more">
      ${c.mode === 'focus' ? '<button class="btn ghost small-btn" data-cact="whole">Back to the whole word</button>' : `<button class="btn ghost small-btn" data-cact="ears" ${c.busy ? 'disabled' : ''}>Ears first: where does it drop?</button>`}
    </div>`;
}

// The arrows draw as line icons (icons.js); the hidden word says the direction to screen readers.
const arrow = (d) => ({ up: '↗<span class="sr-only">up</span>', down: '↘<span class="sr-only">down</span>', level: '→<span class="sr-only">level</span>' }[d] || '');

/** Plays the model for the current exercise; resolves when it's done. Moves the playhead along the target. */
function playModel() {
  const c = coach;
  const { beats, times } = exercise();
  const total = times.length ? times[times.length - 1].to : 0.5;
  return new Promise((resolve) => {
    const t0 = performance.now();
    let stopAudio = () => {};
    const anim = () => {
      if (coach !== c || c.playhead == null) return;
      c.playhead = Math.min(total, (performance.now() - t0) / 1000);
      draw();
      c.raf = requestAnimationFrame(anim);
    };
    const finish = () => { cancelAnimationFrame(c.raf); c.playhead = null; draw(); resolve(); };
    c.playhead = 0;
    c.raf = requestAnimationFrame(anim);
    if (c.mode === 'focus') {
      if (c.clip) stopAudio = playClipPart(c.clip, c.morae.length, c.focus.a, c.focus.b, { onend: finish });
      else stopAudio = playTone(beats, times, { articulate: true, onend: finish });
    } else if (c.step === 'word' && c.clip) {
      stopAudio = playClipPart(c.clip, c.morae.length, 0, c.morae.length - 1, { onend: finish, pad: 0.02 });
    } else if (c.step === 'word') {
      speaker.speak(c.target.say || c.target.jp, { mps: 3.5, voice: c.target.voice || 0, onend: finish });
      stopAudio = () => speaker.stop();
    } else {
      stopAudio = playTone(beats, times, { articulate: c.step !== 'hum', onend: finish });
    }
    c.stopModel = () => { stopAudio(); finish(); };
  });
}

/**
 * The melody as a soft tone in the learner's own range: one continuous hum, or a pulse per beat ("ma-ma-ma").
 * Whispered beats are left silent. Returns a stop function.
 */
function playTone(beats, times, { articulate = false, onend = null } = {}) {
  const ctx = audioContext();
  if (!ctx) { if (onend) setTimeout(onend, 0); return () => {}; }
  if (ctx.state === 'suspended') ctx.resume().catch(() => {});
  const mid = (store.voice && store.voice.mid) || 160;
  const stepSt = coach && coach.bigger ? BIG_STEP_ST : STEP_ST;
  const scale = 1.25;   // a little slower than the clip: easier to follow
  const t0 = ctx.currentTime + 0.05;
  const osc = ctx.createOscillator();
  osc.type = 'triangle';
  const filt = ctx.createBiquadFilter();
  filt.type = 'lowpass';
  filt.frequency.value = 900;
  const gain = ctx.createGain();
  gain.gain.value = 0;
  osc.connect(filt).connect(gain).connect(ctx.destination);
  beats.forEach((b, i) => {
    const from = t0 + times[i].from * scale, to = t0 + times[i].to * scale;
    const f = fromSemitones(b.high ? stepSt : -stepSt, mid);
    osc.frequency.setTargetAtTime(f, from, 0.015);
    if (b.skip) { gain.gain.setTargetAtTime(0, from, 0.01); return; }
    if (articulate) {
      gain.gain.setTargetAtTime(0.0, from, 0.005);
      gain.gain.setTargetAtTime(0.22, from + 0.02, 0.015);
      gain.gain.setTargetAtTime(0.0, to - 0.05, 0.015);
    } else gain.gain.setTargetAtTime(0.2, from, 0.02);
  });
  const end = t0 + (times[times.length - 1]?.to || 0.5) * scale;
  gain.gain.setTargetAtTime(0, end, 0.02);
  osc.start(t0);
  osc.stop(end + 0.15);
  let done = false;
  osc.onended = () => { if (!done) { done = true; if (onend) onend(); } };
  return () => { if (!done) { done = true; try { osc.stop(); } catch (e) { /* ignore */ } if (onend) onend(); } };
}

async function ensureMic() {
  const c = coach;
  if (c.tracker) return true;
  if (!micSupported) { c.mode = 'micerror'; c.error = 'This browser has no microphone access.'; render(); return false; }
  const t = new PitchTracker();
  try {
    await t.start();
  } catch (e) {
    c.mode = 'micerror';
    c.error = micHelp();
    render();
    return false;
  }
  if (coach !== c) { t.stop(); return false; }
  await t.whenLive();   // a phone sends silence for a moment before its mic is really on
  if (coach !== c) { t.stop(); return false; }
  c.tracker = t;
  return true;
}

/** One go: the model, then your turn with the live line, then the score. */
async function go() {
  const c = coach;
  if (c.busy) return;
  c.busy = true;
  c.result = null;
  c.line = [];
  c.status = 'Listen…';
  render();
  if (!(await ensureMic())) { c.busy = false; return; }
  await playModel();
  if (coach !== c) return;
  c.status = 'Your turn';
  render();
  await record();
  if (coach !== c) return;
  c.busy = false;
  scoreAttempt();
  render();
}

/** Records one attempt, drawing the live line as it comes. Stops after a short pause, the time limit, or Done. */
function record() {
  const c = coach;
  return new Promise((resolve) => {
    const tr = c.tracker;
    c.recording = true;
    c.attemptStart = tr.samples.length;
    c.stopRecording = () => { c.recording = false; };
    const { times } = exercise();
    const maxS = (times.length ? times[times.length - 1].to : 1) * 2.5 + 1.5;
    const t0 = performance.now();
    let onset = null, quietSince = null;
    const frame = () => {
      if (coach !== c) return resolve();
      const fr = tr.samples.slice(c.attemptStart);
      const thr = Math.max(tr.noiseFloor * 3, 0.008);
      if (onset == null) {
        const i = fr.findIndex((f) => f.level >= thr && f.hz);
        if (i >= 0) onset = fr[i].time;
      }
      if (onset != null) {
        const mid = (store.voice && store.voice.mid) || 160;
        const raw = fr.map((f) => (f.hz && f.level >= thr ? semitones(f.hz, mid) : null));
        const smooth = medianFilter(raw, 5);
        c.line = fr.map((f, i) => ({ t: f.time - onset, st: smooth[i] })).filter((p) => p.t >= -0.05);
        const last = fr[fr.length - 1];
        if (last && last.level < thr) { quietSince = quietSince ?? performance.now(); } else quietSince = null;
      }
      draw();
      const elapsed = (performance.now() - t0) / 1000;
      const doneBySilence = onset != null && quietSince != null && performance.now() - quietSince > 650;
      if (!c.recording || doneBySilence || elapsed > maxS) {
        c.recording = false;
        c.attemptFrames = tr.samples.slice(c.attemptStart);
        c.attemptOnset = onset;
        return resolve();
      }
      c.raf = requestAnimationFrame(frame);
    };
    c.raf = requestAnimationFrame(frame);
  });
}

/** Scores the attempt (direction of each step and the drop), learns the voice, grades, and suggests the next step. */
function scoreAttempt() {
  const c = coach;
  const frames = c.attemptFrames || [];
  const { beats } = exercise();
  const mid = (store.voice && store.voice.mid) || 160;
  let per;
  if (c.mode === 'focus') per = beatsPitch(frames, beats.length, mid);
  else if (c.step === 'hum') per = beatsPitch(frames, beats.length, mid);
  else if (c.step === 'ma') per = beatsPitch(frames, beats.length, mid, { segmented: true });
  else {
    const reading = c.step === 'ga' ? c.target.reading + 'が' : c.target.reading;
    const slots = moraSlots({ ...c.target, reading }, { frames, floor: c.tracker ? c.tracker.noiseFloor : 0 }, c.step === 'word' && c.clip ? { frames: c.clip.frames } : null);
    per = slots ? slots.map((s) => s.pitch) : beats.map(() => null);
  }
  const highs = beats.map((b) => b.high);
  const skip = beats.map((b) => b.skip);
  const sc = scorePitch(highs, per, { skip });
  c.result = sc;
  if (sc.verdict === 'none') {
    c.status = '';
    sc.note = "I couldn't hear a pitch. Try again a little louder, or closer to the mic.";
    return;
  }
  // Learn the voice from this attempt (never from silence).
  const hzs = frames.map((f) => f.hz).filter(Boolean);
  if (hzs.length >= 8) store.setVoice(learnVoice(store.voice, hzs));
  store.grade({ skill: 'pitch', id: `coach:${c.target.id || c.target.jp}:${c.mode === 'focus' ? 'step' : c.step}`, ok: sc.verdict !== 'try' });
  if (sc.drop && sc.drop.want >= 0 && !sc.drop.ok) sc.note = `Listen for the drop after ${beats[sc.drop.want].kana}: high, then down.`;
  else if (sc.firstMiss) sc.note = `${beats[sc.firstMiss.from].kana}→${beats[sc.firstMiss.to].kana} should go ${sc.firstMiss.want === 'level' ? 'level' : sc.firstMiss.want}.`;
  c.status = '';
  if (c.mode === 'focus') {
    c.focusRight = sc.verdict === 'great' || (sc.steps[0] && sc.steps[0].ok) ? c.focusRight + 1 : 0;
    if (c.focusRight >= 2) {
      sc.note = 'Right twice in a row. Back to the whole word.';
      fx.hit();
      c.timers.push(setTimeout(() => { if (coach === c) { c.mode = 'ladder'; c.step = 'word'; c.result = null; c.line = []; render(); } }, 1400));
    }
    return;
  }
  // Suggest moving up after a Great, or two Closes on this step. Never forced.
  const tally = c.tally[c.step] || (c.tally[c.step] = { great: 0, close: 0 });
  if (sc.verdict === 'great') tally.great++;
  if (sc.verdict === 'close') tally.close++;
  const i = STEPS.findIndex((s) => s.id === c.step);
  if ((tally.great >= 1 || tally.close >= 2) && i < STEPS.length - 1) c.suggest = STEPS[i + 1].id;
  if (sc.verdict === 'great') fx.hit({ el: c.el.querySelector('.coach-line-wrap') });
}

function startDrill() {
  const c = coach;
  c.mode = c.focus ? 'focus' : 'ladder';
  c.result = null;
  c.line = [];
  render();
}

// ---------- 4. ears first ----------
/** Up to three ways to hear the word: the app's other voices when it has the word in them, else the same clip
 *  played a little lower and higher (an honest stand-in: same melody, different voice height). */
function earVoices() {
  const c = coach;
  const text = c.target.say || c.target.jp;
  // Voices 1 and 3 first: they follow a set pitch accent closely; voice 2 (deep) much less.
  const real = [1, 3, 2].filter((v) => CLIPS[`${text}#${v}`]).slice(0, 2);
  if (real.length) return [{ voice: c.target.voice || 0, label: 'voice 1' }, ...real.map((v, i) => ({ voice: v, label: `voice ${i + 2}` }))];
  return [{ rate: 1, label: 'the voice' }, { rate: 0.86, label: 'lower' }, { rate: 1.16, label: 'higher' }];
}

function earsAnswer() {
  const c = coach;
  const k = dropAt(c.highs);
  return k >= 0 && k < c.highs.length - 1 ? k : -1;   // a drop after the last beat can't be heard on the word alone
}

function earsHTML() {
  const c = coach;
  const e = c.ears;
  const ans = earsAnswer();
  return `<p class="lead strong">Ears first: where does the pitch drop?</p>
    <p class="small">Listen to it ${earVoices().length} ways, then tap the beat where the pitch falls, or "No drop".</p>
    <button class="btn wide" data-cact="earsplay">🔊 Play again</button>
    <div class="coach-beats" role="group" aria-label="Drops after which beat?">
      ${c.morae.map((m, i) => `<button class="btn ${e.picked != null ? (i === ans ? 'good' : i === e.picked ? 'wrong' : 'faded') : ''}" data-cact="earspick" data-i="${i}" lang="ja" ${e.picked != null || i === c.morae.length - 1 ? 'disabled' : ''}>${esc(m.kana)}</button>`).join('')}
      <button class="btn ${e.picked != null ? (ans === -1 ? 'good' : e.picked === -1 ? 'wrong' : 'faded') : ''}" data-cact="earspick" data-i="-1" ${e.picked != null ? 'disabled' : ''}>No drop</button>
    </div>
    ${e.picked != null ? `<p class="${e.picked === ans ? 'good-c' : ''}" role="status">${e.picked === ans ? 'Yes!' : 'Not quite.'} ${ans >= 0 ? `It drops after <span lang="ja">${esc(c.morae[ans].kana)}</span>: high on ${esc(c.morae[ans].kana)}, then down.` : dropAt(c.highs) === c.highs.length - 1 ? 'No drop on the word itself: it stays up. Its drop comes after it, on a particle like が (step 4).' : 'No drop on the word itself: it stays up.'}${e.picked !== ans ? ' Listen once more.' : ''}</p>
      <button class="btn primary wide" data-cact="earsdone">On to the Pitch Coach ▶</button>` : ''}
    <button class="btn ghost small-btn" data-cact="earsdone">Skip</button>`;
}

function playEars() {
  const c = coach;
  const voices = earVoices();
  let i = 0;
  const next = () => {
    if (coach !== c || i >= voices.length) return;
    const v = voices[i++];
    const after = () => c.timers.push(setTimeout(next, 450));
    // Normal speed: voices 1-3 only have normal-speed clips, and the 🐢 setting would swap in voice 0's slow one.
    if (v.voice != null) speaker.speak(c.target.say || c.target.jp, { mps: 3.5, voice: v.voice, speed: 'normal', onend: after });
    else if (c.clip) c.stopModel = playClipPart(c.clip, c.morae.length, 0, c.morae.length - 1, { rate: v.rate, onend: after });
    else speaker.speak(c.target.say || c.target.jp, { mps: 3.5, voice: 0, onend: after });
  };
  next();
}

// ---------- open / close ----------
export function closeCoach() {
  const c = coach;
  if (!c) return;
  coach = null;
  cancelAnimationFrame(c.raf);
  c.timers.forEach(clearInterval);
  c.timers.forEach(clearTimeout);
  if (c.stopModel) { try { c.stopModel(); } catch (e) { /* ignore */ } }
  if (c.tracker) c.tracker.stop();
  speaker.stop();
  c.el.remove();
  document.removeEventListener('keydown', c.onKey, true);
  window.removeEventListener('resize', c.onResize);
  if (c.returnFocus && document.contains(c.returnFocus)) c.returnFocus.focus({ preventScroll: true });
}

/**
 * Opens the Pitch Coach for a target. Options: step ('hum' | 'ma' | 'word' | 'ga') to start on, focus { a, b } to
 * practise just the step between two beats, ears: true to start with "where does it drop?".
 */
export async function openCoach(target, { step = 'hum', focus = null, ears = null, from = null } = {}) {
  closeCoach();
  const el = document.createElement('div');
  el.className = 'pron-overlay coach-overlay';
  el.innerHTML = '<div class="pron-sheet panel coach-sheet" role="dialog" aria-modal="true" aria-labelledby="coach-h"><div class="coach-body stack-sm"></div></div>';
  document.body.appendChild(el);
  const morae = moraInfo(target.reading);
  const c = {
    el, target, morae, mode: 'loading', step, focus, focusRight: 0, bigger: false, tally: {}, suggest: null,
    line: [], result: null, timers: [], returnFocus: from, ears: { picked: null }, highs: [], times: [],
  };
  coach = c;
  c.onKey = (e) => {
    if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); closeCoach(); return; }
    if (!['Tab', 'Enter', ' '].includes(e.key) || !el.contains(e.target)) e.stopPropagation();
  };
  c.onResize = () => draw();
  document.addEventListener('keydown', c.onKey, true);
  window.addEventListener('resize', c.onResize);
  el.addEventListener('click', (ev) => {
    if (ev.target === el) { closeCoach(); return; }
    const b = ev.target.closest('[data-cact]');
    if (!b || b.disabled) return;
    const act = b.dataset.cact;
    if (act !== 'close' || b.tagName !== 'A') ev.preventDefault();
    if (act === 'close') closeCoach();
    else if (act === 'go') go();
    else if (act === 'stop') { if (c.stopRecording) c.stopRecording(); }
    else if (act === 'model') { c.busy = true; render(); playModel().then(() => { c.busy = false; render(); }); }
    else if (act === 'step') { c.mode = 'ladder'; c.step = b.dataset.step; c.result = null; c.line = []; c.suggest = null; render(); }
    else if (act === 'whole') { c.mode = 'ladder'; c.step = 'word'; c.result = null; c.line = []; render(); }
    else if (act === 'calib') runCalibration();
    else if (act === 'calibskip') startDrill();
    else if (act === 'ears') { c.mode = 'ears'; c.ears = { picked: null }; render(); playEars(); }
    else if (act === 'earsplay') playEars();
    else if (act === 'earspick') {
      const i = +b.dataset.i;
      c.ears.picked = i;
      const ok = i === earsAnswer() || (earsAnswer() === -1 && i === c.morae.length - 1);
      store.grade({ skill: 'pitch', id: `ears:${target.id || target.jp}`, ok });
      render();
      if (!ok) c.timers.push(setTimeout(playEars, 500));
    } else if (act === 'earsdone') { store.markEars(target.id || target.jp); if (!store.voice) { c.mode = 'calib'; render(); } else startDrill(); }
  });
  el.addEventListener('change', (ev) => {
    if (ev.target.matches('[data-cact-change=bigger]')) { c.bigger = ev.target.checked; draw(); }
  });
  render();
  c.clip = await modelClip(target).catch(() => null);
  if (coach !== c) return;
  c.highs = highsFor(target, c.clip, morae);
  c.times = beatTimes(c.clip, morae.length);
  if (focus) c.focus = { a: Math.max(0, Math.min(focus.a, morae.length - 2)), b: Math.min(morae.length - 1, Math.max(focus.b, focus.a + 1)) };
  // Ears first before the first session on a word; then your voice, the first time ever; then the drill.
  const wantEars = ears ?? (!focus && !store.earsDone(target.id || target.jp));
  if (wantEars) { c.mode = 'ears'; render(); playEars(); }
  else if (!store.voice) { c.mode = 'calib'; render(); }
  else startDrill();
  el.querySelector('.coach-body button')?.focus({ preventScroll: true });
}

/** A "Pitch Coach" button (for the pronunciation panel, Rhythm and Pitch Duel). */
export function coachAvailable() { return micSupported && !store.settings.quiet; }

export { SCALE_ST };
