// Small pieces shared by the newer practice modes (Listening Lab, Conjugation Dojo, Sentence Builder,
// Katakana Rush, Numbers & Time): answer buttons that reveal the right one, and speech at a chosen speed.
import { speaker } from './audio.js';
import { esc } from './ui.js';

/**
 * Multiple-choice buttons. Before answering they are plain; afterwards the right one is green, a wrong pick is red
 * and the rest fade, so a miss always shows the answer.
 */
export function choiceButtons(options, { answered = false, picked = -1, right = -1, ja = false, act = 'pick' } = {}) {
  return `<div class="choice-grid practice-opts">${options.map((o, i) => {
    let cls = '';
    if (answered) cls = i === right ? 'good' : i === picked ? 'wrong' : 'faded';
    return `<button class="btn ${cls}" data-act="${act}" data-i="${i}" ${answered ? 'disabled' : ''}${ja ? ' lang="ja"' : ''}>${esc(o)}</button>`;
  }).join('')}</div>`;
}

/** Shuffle options, remembering where the right one (always listed first in the data) went. */
export function shuffled(options, rightIndex = 0) {
  const order = options.map((_, i) => i);
  for (let i = order.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [order[i], order[j]] = [order[j], order[i]];
  }
  return { options: order.map((i) => options[i]), right: order.indexOf(rightIndex) };
}

/** Speak one line, optionally slowed (uses the slow recording when there is one), without changing the setting. */
export function sayAt(text, { voice = 0, slow = false, mps = 4, onend = null } = {}) {
  const prev = speaker.speed;
  if (slow) speaker.speed = 'slow';
  try { speaker.speak(text, { mps: slow ? 3 : mps, voice, onend }); } finally { speaker.speed = prev; }
}

/**
 * Plays lines one after another. Returns a player whose stop() cancels the rest (the speaker's own stop() calls
 * the pending onend, so every step checks it is still the current run).
 */
export function linePlayer(onLine) {
  let run = 0;
  return {
    play(lines, { slow = false } = {}) {
      const me = ++run;
      const step = (i) => {
        if (me !== run) return;
        onLine(i < lines.length ? i : -1);
        if (i >= lines.length) return;
        sayAt(lines[i].text, { voice: lines[i].voice, slow, onend: () => setTimeout(() => step(i + 1), 350) });
      };
      step(0);
    },
    stop() { run++; speaker.stop(); onLine(-1); },
  };
}
