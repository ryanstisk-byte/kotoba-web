// The optional pronunciation check: a 🎤 button next to the 🔊 wherever a new word or phrase is taught, opening one
// shared panel. Everything runs on the device: the mic's pitch (PitchTracker), speech recognition (Recognizer) when
// the browser has it, and the app's own clip of the word as the model. pron-analysis.js does the comparing,
// pron-tips.js says what to work on. Optional and skippable every time; Settings can hide the buttons.
import { store } from './store.js';
import { speaker, PitchTracker, Recognizer, recognitionSupported, noRecognitionReason, micSupported, micHelp, normalizeJa } from './audio.js';
import { analyze, moraInfo, targetPitch } from './pron-analysis.js';
import { modelFrames } from './model-clip.js';
import { tipFor } from './pron-tips.js';
import { yFor } from './pitch-score.js';
import { openCoach, coachAvailable } from './pitch-coach.js';
import { readingOf } from './furigana.js';
import { esc } from './ui.js';
import { PHRASE_BY_ID, GARDEN_CATALOG } from './data.js';
import * as fx from './fx.js';

/**
 * A target: { id, jp, reading, say (the clip's text), voice, en, accent (Tokyo downstep, when known) or highs
 * (high/low per mora, from a phrase melody) }.
 */
export function pronAvailable() {
  const st = store.settings;
  return st.pronCheck !== false && !st.quiet && micSupported;
}

/**
 * The target for a Garden word (or a story word, by its Garden id): its clip, and its pitch when the app knows it
 * (the N5 deck's accent, or a starter phrase's melody).
 */
export function wordTarget(item, extra = {}) {
  const w = GARDEN_CATALOG[item.id] || item;
  const t = { id: item.id, jp: item.jp, reading: item.reading, say: item.say || w.say || item.reading, voice: 0, en: item.en };
  if (Number.isInteger(w.accent)) t.accent = w.accent;
  const ph = PHRASE_BY_ID[item.id];
  if (ph && Array.isArray(ph.morae) && ph.morae.length === moraInfo(item.reading).length) t.highs = ph.morae.map((m) => !!m.high);
  return { ...t, ...extra };
}

/** The 🎤 button for a target ('' when the check is hidden: Settings, Quiet mode, or no mic in this browser). */
export function pronButton(target, { compact = false, cls = 'btn ghost small-btn' } = {}) {
  if (!pronAvailable() || !target || !target.reading) return '';
  const label = `Check my pronunciation of ${target.jp || target.reading}`;
  return `<button type="button" class="${cls} pron-btn" data-pron="${esc(JSON.stringify(target))}" aria-label="${esc(label)}" title="${esc(label)}">🎤 ${compact ? 'Check' : 'Check my pronunciation'}</button>`;
}

// ---------- the panel ----------
let panel = null;     // { el, target, state, ... } while open

const VERDICT = {
  great: { title: 'Great!', line: 'That sounded natural. Nice work.', cls: 'good-c' },
  close: { title: 'Close!', line: 'Nearly there.', cls: 'accent-c' },
  try: { title: 'Try again', line: "Not quite yet, and that's fine: nothing is lost. Have another listen first.", cls: 'dim' },
  none: { title: 'No result', line: "I couldn't measure that one. Nothing is lost.", cls: 'dim' },
};

function melodyHTML(target, res) {
  const morae = moraInfo(target.reading);
  const highs = (res && res.pitch && res.pitch.highs) || targetPitch(target, null);
  if (!highs) return '';
  const n = morae.length;
  const slot = 40, h = 96, hiY = 18, loY = 54;
  const w = n * slot;
  const dots = highs.map((hgh, i) => [(i + 0.5) * slot, hgh ? hiY : loY]);
  const silent = morae.map((m) => m.type === 'sokuon');
  const tLine = dots.filter((_, i) => !silent[i]).map((p) => p.join(',')).join(' ');
  let user = '';
  const u = res && res.pitch && res.pitch.user;
  const skip = (res && res.pitch && res.pitch.skip) || morae.map((m) => m.devoice || m.type === 'sokuon');
  if (u && u.some((x) => x != null)) {
    // A fixed scale in semitones around your own middle (the attempt's median), so a small wobble stays small.
    const y = (x) => 4 + yFor(x, 66, 8);
    const pts = u.map((x, i) => (x == null || skip[i] ? null : `${(i + 0.5) * slot},${y(x).toFixed(1)}`)).filter(Boolean).join(' ');
    user = `<polyline class="pron-user" points="${pts}" fill="none" stroke-width="4" stroke-linecap="round" stroke-linejoin="round" stroke-dasharray="1 7"/>
      ${u.map((x, i) => (x == null || skip[i] ? '' : `<circle class="pron-user-dot" cx="${(i + 0.5) * slot}" cy="${y(x).toFixed(1)}" r="4.5"/>`)).join('')}`;
  }
  return `<figure class="pron-melody" aria-label="Pitch: the model's in dots, yours as a line">
    <svg viewBox="0 0 ${w} ${h}" style="width:min(100%, ${Math.max(160, w * 1.4)}px)" aria-hidden="true">
      <polyline points="${tLine}" fill="none" class="pron-target" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
      ${dots.map(([x, y], i) => (silent[i] ? '' : `<circle cx="${x}" cy="${y}" r="6" class="pron-target-dot"/>`)).join('')}
      ${user}
      ${morae.map((m, i) => `<text x="${(i + 0.5) * slot}" y="${h - 14}" text-anchor="middle" class="melody-kana">${esc(m.kana)}</text>`).join('')}
    </svg>
    <figcaption class="tiny dim"><span class="pron-key pron-key-t"></span> the word's pitch ${u ? '<span class="pron-key pron-key-u"></span> yours' : ''}</figcaption>
  </figure>`;
}

function moraeHTML(target, res) {
  const morae = moraInfo(target.reading);
  const per = res && res.sounds && res.sounds.available ? res.sounds.per : null;
  const slots = res && res.slots;
  const unit = res && res.length && res.length.unit;
  return `<div class="pron-morae" role="list" aria-label="Each beat">${morae.map((m, i) => {
    const st = per ? (per[i].ok ? 'ok' : 'miss') : '';
    const held = slots && slots[i] && unit ? Math.max(0.2, Math.min(2.5, slots[i].dur / unit)) : null;
    return `<span class="pron-mora ${st}" role="listitem" lang="ja" title="${per ? (per[i].ok ? 'heard' : `not heard${per[i].heard ? ` (heard ${per[i].heard})` : ''}`) : ''}">
      <span class="pron-kana">${esc(m.kana)}</span>${per ? `<span class="pron-mark" aria-label="${per[i].ok ? 'heard' : 'not heard'}">${per[i].ok ? '✓' : '·'}</span>` : ''}
      ${held != null ? `<span class="pron-hold" style="width:${(held * 18).toFixed(0)}px" aria-hidden="true"></span>` : ''}</span>`;
  }).join('')}</div>`;
}

/** The way into the Pitch Coach from the panel. */
function coachButton() {
  return coachAvailable() ? '<button class="btn ghost wide" data-pact="coach">Pitch Coach: practise the melody step by step</button>' : '';
}

/** When the check found a pitch problem between two beats: practise just that step. */
function pitchFocus(res) {
  const x = res && res.issues.find((i) => /^pitch_/.test(i.id) && Number.isInteger(i.at) && Number.isInteger(i.to));
  return x ? { a: x.at, b: x.to } : null;
}

function focusButton(res) {
  const f = pitchFocus(res);
  if (!f || !coachAvailable()) return '';
  const m = moraInfo(panel.target.reading);
  return `<button class="btn good wide" data-pact="focus">Practise just this step: <span lang="ja">${esc(m[f.a].kana)} → ${esc(m[f.b].kana)}</span></button>`;
}

function render() {
  if (!panel) return;
  const { el, target, state, res, notes } = panel;
  const head = `<div class="row-between pron-head"><h2 class="section-title" id="pron-h">🎤 Pronunciation check</h2>
    <button class="btn ghost small-btn" data-pact="close" aria-label="Close the pronunciation check">✕ Close</button></div>
    <div class="pron-word"><span class="pron-jp" lang="ja">${esc(target.jp || target.reading)}</span>
      ${target.reading !== target.jp ? `<span class="small dim" lang="ja">${esc(target.reading)}</span>` : ''}
      ${target.en ? `<span class="small">${esc(target.en)}</span>` : ''}</div>`;
  const listen = `<button class="btn" data-pact="hear">🔊 Hear it</button><button class="btn" data-pact="slow">🐢 Slowly</button>`;
  let body = '';
  if (state === 'ready') {
    body = `${melodyHTML(target, null)}
      <p class="small">Listen first, then tap <span class="strong">Start</span>, say it once, and pause: it stops by itself. This is optional; close it any time.</p>
      <div class="row2">${listen}</div>
      <button class="btn primary wide" data-pact="start">🎤 Start</button>
      ${coachButton()}`;
  } else if (state === 'recording') {
    body = `<p class="lead strong" role="status">🎤 Listening… say <span lang="ja">${esc(target.jp || target.reading)}</span></p>
      <div class="meter" aria-hidden="true"><span id="pron-level" style="width:0%"></span></div>
      <button class="btn wide" data-pact="stop">■ Done</button>`;
  } else if (state === 'checking') {
    body = '<p class="lead" role="status">Checking…</p>';
  } else if (state === 'micerror') {
    body = `<p class="miss-c">${esc(panel.error)}</p>
      <p class="small">The <a href="#/check" data-pact="close">sound &amp; mic check</a> can help find what's wrong.</p>
      <div class="row2">${listen}</div>`;
  } else if (state === 'result') {
    const v = VERDICT[res.verdict] || VERDICT.none;
    const tips = res.issues.map((x) => tipFor(x, target, moraInfo(target.reading), res.pitch.highs)).filter(Boolean);
    body = `<div class="pron-verdict" role="status"><p class="pron-title ${v.cls}">${v.title}</p><p class="small">${v.line}${res.verdict !== 'try' && tips.length ? (tips.length > 1 ? ' A couple of small things to try:' : ' One small thing to try:') : ''}</p></div>
      ${moraeHTML(target, res)}
      ${res.sounds.available && res.sounds.heard ? `<p class="small dim">Recognition heard 「<span lang="ja">${esc(res.sounds.heard)}</span>」. It's forgiving and sometimes tidies up what it hears, so a match means close enough, not perfect.</p>` : ''}
      ${melodyHTML(target, res)}
      ${tips.length ? `<ul class="pron-tips">${tips.map((t) => `<li><p class="strong">${esc(t.tip)}</p><p class="small dim">${esc(t.example)}</p></li>`).join('')}</ul>` : ''}
      ${notes.length ? `<p class="small dim">${notes.map(esc).join(' ')}</p>` : ''}
      <div class="row2">${listen}</div>
      <div class="row2"><button class="btn primary" data-pact="start">↻ Try again</button>
        <button class="btn" data-pact="side" ${panel.recording ? '' : 'disabled'}>⇄ Side by side</button></div>
      ${focusButton(res)}${coachButton()}`;
  }
  el.querySelector('.pron-body').innerHTML = head + body;
}

function playModel(slow = false, onend = null) {
  const t = panel.target;
  speaker.speak(t.say || t.jp, { mps: slow ? 2.5 : 3.5, voice: t.voice || 0, speed: slow ? 'slow' : 'normal', onend });
}

function stopAll() {
  if (!panel) return;
  clearInterval(panel.poll);
  if (panel.tracker) { try { panel.tracker.stop(); } catch (e) { /* ignore */ } }
  if (panel.rec) { try { panel.rec.stop(); } catch (e) { /* ignore */ } }
  if (panel.mediaRec && panel.mediaRec.state !== 'inactive') { try { panel.mediaRec.stop(); } catch (e) { /* ignore */ } }
  panel.tracker = null;
  panel.rec = null;
}

async function startAttempt() {
  const p = panel;
  stopAll();
  speaker.stop();
  p.notes = [];
  p.transcripts = [];
  p.recognition = recognitionSupported;
  if (p.recording) { URL.revokeObjectURL(p.recording); p.recording = null; }
  p.state = 'recording';
  render();
  const tracker = new PitchTracker();
  try {
    await tracker.start();
  } catch (e) {
    p.state = 'micerror';
    p.error = e && e.name === 'NotAllowedError' ? micHelp() : e && e.name === 'NotFoundError' ? 'No microphone was found on this device.' : micHelp();
    render();
    return;
  }
  if (panel !== p) { tracker.stop(); return; }
  p.tracker = tracker;
  // A copy of the attempt, for "side by side".
  if (typeof MediaRecorder !== 'undefined' && tracker.stream) {
    try {
      const chunks = [];
      const mr = new MediaRecorder(tracker.stream);
      mr.ondataavailable = (ev) => { if (ev.data && ev.data.size) chunks.push(ev.data); };
      mr.onstop = () => { if (chunks.length && panel === p) { p.recording = URL.createObjectURL(new Blob(chunks, { type: mr.mimeType || 'audio/webm' })); render(); } };
      mr.start();
      p.mediaRec = mr;
    } catch (e) { p.mediaRec = null; }
  }
  // What recognition hears, when this browser has it.
  if (recognitionSupported) {
    const rec = new Recognizer();
    rec.onTranscript = (text, alts) => {
      if (text) p.transcripts = [text, ...String(alts || '').split('|').filter(Boolean)];
    };
    rec.onUnavailable = (reason) => { p.recognition = false; p.recReason = reason; };
    rec.start([p.target.say || p.target.jp]);
    p.rec = rec;
  } else {
    p.recReason = noRecognitionReason();
  }
  const t0 = performance.now();
  const maxMs = 2500 + 350 * moraInfo(p.target.reading).length;
  let spoke = 0, quietSince = 0;
  p.poll = setInterval(() => {
    if (panel !== p || !p.tracker) return;
    const now = performance.now() - t0;
    if (now > 300 && !p.calibrated) { tracker.calibrateNoise(tracker.samples.slice(0, 8)); p.calibrated = true; }
    const level = tracker.liveLevel;
    const meter = p.el.querySelector('#pron-level');
    if (meter) meter.style.width = Math.min(100, level * 600).toFixed(0) + '%';
    const loud = level > Math.max(tracker.noiseFloor * 3, 0.01);
    if (loud) { spoke = spoke || now; quietSince = 0; } else if (spoke && !quietSince) quietSince = now;
    if ((spoke && quietSince && now - quietSince > 700 && now - spoke > 300) || now > maxMs) finishAttempt();
  }, 100);
}

async function finishAttempt() {
  const p = panel;
  if (!p || !p.tracker) return;
  clearInterval(p.poll);
  const tracker = p.tracker;
  const user = { frames: tracker.samples.slice(), floor: tracker.noiseFloor };
  tracker.stop();
  p.tracker = null;
  if (p.mediaRec && p.mediaRec.state !== 'inactive') { try { p.mediaRec.stop(); } catch (e) { /* ignore */ } }
  p.state = 'checking';
  render();
  // Recognition can lag behind the voice a little: give it a moment to finish.
  if (p.rec) await new Promise((r) => setTimeout(r, p.transcripts.length ? 300 : 900));
  if (panel !== p) return;
  if (p.rec) { p.rec.stop(); p.rec = null; }
  const model = await modelFrames(p.target);
  if (panel !== p) return;
  const transcripts = p.recognition ? p.transcripts.map((t) => normalizeJa(t)) : null;
  p.res = analyze(p.target, { user, model, transcripts, readingOf: (s) => readingOf(s) || '' });
  if (!p.recognition) p.notes.push(`Sound check off: ${p.recReason || noRecognitionReason()} Pitch and rhythm are still checked.`);
  else if (!model) p.notes.push('No clip of this one to compare beat lengths with, so rhythm is judged from your own timing.');
  p.state = 'result';
  render();
  if (p.res.verdict !== 'none') {
    store.grade({ skill: 'speaking', id: `pron:${p.target.id || p.target.jp}`, ok: p.res.verdict !== 'try' });
    if (p.res.verdict === 'great') fx.hit({ el: p.el.querySelector('.pron-title') });
  }
}

function sideBySide() {
  const p = panel;
  if (!p || !p.recording) return;
  playModel(false, () => {
    if (panel !== p) return;
    const a = new Audio(p.recording);
    p.audio = a;
    a.play().catch(() => {});
  });
}

export function closePron() {
  if (!panel) return;
  const p = panel;
  stopAll();
  speaker.stop();
  if (p.audio) { try { p.audio.pause(); } catch (e) { /* ignore */ } }
  if (p.recording) URL.revokeObjectURL(p.recording);
  p.el.remove();
  document.removeEventListener('keydown', p.onKey, true);
  panel = null;
  if (p.returnFocus && document.contains(p.returnFocus)) p.returnFocus.focus({ preventScroll: true });
}

/** Opens the check for a target. */
export function openPron(target, from = null) {
  closePron();
  const el = document.createElement('div');
  el.className = 'pron-overlay';
  el.innerHTML = '<div class="pron-sheet panel" role="dialog" aria-modal="true" aria-labelledby="pron-h"><div class="pron-body stack-sm"></div></div>';
  document.body.appendChild(el);
  const onKey = (e) => {
    if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); closePron(); return; }
    // Keep the mode's own shortcuts (Space, 1, 2…) from firing underneath while the check is open.
    if (!['Tab', 'Enter', ' '].includes(e.key) || !el.contains(e.target)) e.stopPropagation();
  };
  panel = { el, target, state: 'ready', res: null, notes: [], transcripts: [], returnFocus: from, onKey };
  document.addEventListener('keydown', onKey, true);
  el.addEventListener('click', (ev) => {
    if (ev.target === el) { closePron(); return; }
    const b = ev.target.closest('[data-pact]');
    if (!b) return;
    const act = b.dataset.pact;
    if (act !== 'close' || b.tagName !== 'A') ev.preventDefault();
    if (act === 'close') closePron();
    else if (act === 'hear') playModel(false);
    else if (act === 'slow') playModel(true);
    else if (act === 'start') startAttempt();
    else if (act === 'stop') finishAttempt();
    else if (act === 'side') sideBySide();
    else if (act === 'coach' || act === 'focus') {
      const t = panel.target, back = panel.returnFocus, focus = act === 'focus' ? pitchFocus(panel.res) : null;
      closePron();
      openCoach(t, { focus, from: back });
    }
  });
  render();
  el.querySelector('[data-pact=start]')?.focus({ preventScroll: true });
}

let wired = false;
/** Wires every 🎤 button in the app to the panel (once, at start-up). */
export function initPron() {
  if (wired) return;
  wired = true;
  document.addEventListener('click', (ev) => {
    const b = ev.target.closest && ev.target.closest('[data-pron]');
    if (!b) return;
    ev.preventDefault();
    ev.stopPropagation();
    let target = null;
    try { target = JSON.parse(b.dataset.pron); } catch (e) { return; }
    openPron(target, b);
  }, true);
}
