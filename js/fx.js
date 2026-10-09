// Game feel: a short sound, a buzz and a burst on a right answer, a soft tone and a small nudge on a miss.
// Presentation only: nothing here changes scoring. Sounds are synthesized (no files), so they work offline.
// Settings › Sound effects / Vibration turn them off; reduced motion drops the movement but keeps the colour cues.
import { store } from './store.js';
import { audioContext } from './audio.js';

const layer = () => document.getElementById('fx');
export const reducedMotion = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

// Where the learner last tapped or pressed, so feedback appears where their attention is.
let point = null;
if (typeof window !== 'undefined') {
  window.addEventListener('pointerdown', (e) => { point = { x: e.clientX, y: e.clientY }; }, { capture: true, passive: true });
  window.addEventListener('keydown', () => {
    const r = document.activeElement && document.activeElement !== document.body ? document.activeElement.getBoundingClientRect() : null;
    if (r && r.width) point = { x: r.left + r.width / 2, y: r.top + r.height / 2 };
  }, { capture: true });
}

function tone(ac, { freq, to = freq, at = 0, dur = 0.09, gain = 0.08, type = 'triangle' }) {
  const t = ac.currentTime + at;
  const o = ac.createOscillator();
  const g = ac.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t);
  if (to !== freq) o.frequency.exponentialRampToValueAtTime(to, t + dur);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(gain, t + 0.008);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(ac.destination);
  o.start(t);
  o.stop(t + dur + 0.02);
}

const SOUNDS = {
  hit: (ac) => { tone(ac, { freq: 988, dur: 0.07 }); tone(ac, { freq: 1480, at: 0.06, dur: 0.12 }); },
  big: (ac) => {
    [784, 988, 1175, 1568].forEach((f, i) => tone(ac, { freq: f, at: i * 0.07, dur: 0.14, gain: 0.07 }));
    tone(ac, { freq: 140, to: 70, dur: 0.18, gain: 0.12, type: 'sine' });   // the "impact"
  },
  miss: (ac) => { tone(ac, { freq: 330, to: 262, dur: 0.18, gain: 0.05, type: 'sine' }); },
  fanfare: (ac) => {
    [523, 659, 784, 1047, 784, 1047].forEach((f, i) => tone(ac, { freq: f, at: i * 0.09 + (i > 3 ? 0.08 : 0), dur: 0.16, gain: 0.07 }));
    tone(ac, { freq: 120, to: 60, dur: 0.25, gain: 0.12, type: 'sine' });
  },
};

export function sound(name) {
  if (!store.settings.sfx) return;
  try {
    const ac = audioContext();
    if (ac && ac.state !== 'closed') SOUNDS[name](ac);
  } catch (e) { /* sound effects are optional */ }
}

export function buzz(pattern) {
  if (!store.settings.haptics) return;
  try { navigator.vibrate?.(pattern); } catch (e) { /* not supported (e.g. iPhone) */ }
}

function spawn(cls, at, ms) {
  const l = layer();
  if (!l || reducedMotion()) return;
  const el = document.createElement('div');
  el.className = cls;
  if (at) { el.style.left = at.x + 'px'; el.style.top = at.y + 'px'; el.style.setProperty('--x', at.x + 'px'); el.style.setProperty('--y', at.y + 'px'); }
  l.appendChild(el);
  setTimeout(() => el.remove(), ms);
}

function anchor(el) {
  if (el && el.isConnected) {
    const r = el.getBoundingClientRect();
    if (r.width) return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
  }
  return point || { x: window.innerWidth / 2, y: window.innerHeight / 2 };
}

/** A right answer. `big` for a finished train, a forged kanji, a cleared chapter or lesson. */
export function hit({ big = false, el = null } = {}) {
  sound(big ? 'big' : 'hit');
  buzz(big ? [18, 40, 28] : 14);
  const at = anchor(el);
  spawn('fx-burst' + (big ? ' big' : ''), at, 500);
  if (big) spawn('fx-lines', at, 520);
}

/** A miss: gentle. A soft tone and a small nudge of whatever was tapped, never a penalty. */
export function miss({ el = null } = {}) {
  sound('miss');
  buzz(8);
  if (reducedMotion()) return;
  // The screen re-renders on answer, so find what now sits under the tap.
  requestAnimationFrame(() => {
    const p = point;
    const target = el && el.isConnected ? el : p && document.elementFromPoint(p.x, p.y)?.closest('button, .panel');
    if (!target) return;
    target.classList.remove('fx-nudge');
    void target.offsetWidth;
    target.classList.add('fx-nudge');
    setTimeout(() => target.classList.remove('fx-nudge'), 400);
  });
}

/** Tell screen readers what just happened (right/wrong is otherwise only shown by colour and position). */
export function announce(text) {
  const live = document.getElementById('live');
  if (!live) return;
  live.textContent = '';
  setTimeout(() => { live.textContent = text; }, 30);
}
