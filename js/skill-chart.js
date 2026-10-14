// Skill chart: a game-style radar of the foundations the app is building, like a character's stat screen. One axis per
// skill area, each scored 0-100% against the target for the level being worked toward (the next level not done, as in
// js/readiness.js). The level before stays as a faint "where you came from" outline, tabs look back at done levels,
// and locked levels show as locked, never as empty failures. Tapping an axis (or its row in the list) opens its
// "Foundations" panel: what the skill is, the research principle the app builds it with, the modes that train it and
// its numbers. Shown at the top of Progress; a small version sits on Today.
//
// Honest and kind: every axis is a count of things learned or a first-try accuracy, so nothing shrinks for time away
// (no 4-week windows, no streaks). Reviews waiting show as a calm "review waiting" note, never as a loss.
// Growth since the last visit animates (not with reduced motion). The last visit's values are kept on this device
// only (localStorage 'kotobaBeat.chart'), outside saved progress and sync.
import { store } from './store.js';
import { n5Areas, n4Areas, n3Areas, readiness } from './readiness.js';
import { APP_LEVELS, isUnlocked, lockLine, prevLevel } from './levels.js';
import { LESSONS } from './dojo-data.js';
import { BRUSH_KANA } from './brush-data.js';
import { recentRate } from './skills.js';
import { esc } from './ui.js';

const clamp = (x) => Math.max(0, Math.min(1, x || 0));
const pct = (x) => `${Math.round(clamp(x) * 100)}%`;

/** Rank titles along each axis, dojo style. */
export const RANKS = [
  { from: 0, jp: '入門', en: 'Newcomer' },
  { from: 0.25, jp: '見習い', en: 'Apprentice' },
  { from: 0.5, jp: '弟子', en: 'Disciple' },
  { from: 0.85, jp: '師範', en: 'Master' },
];
export const rankOf = (v) => RANKS.filter((r) => clamp(v) >= r.from).slice(-1)[0];

/** Items answered well (mastery 60+) each level asks for, in the skills measured from practice. */
export const ITEM_TARGETS = {
  N5: { listening: 40, speaking: 30, pitch: 20, counters: 20 },
  N4: { listening: 100, speaking: 60, pitch: 40, counters: 40 },
  N3: { listening: 180, speaking: 100, pitch: 60, counters: 60 },
};
/** First-try accuracy that counts as "there" (the app aims for about 85%). */
const RATE_TARGET = 0.8;

/**
 * The axes, in the order drawn (clockwise from the top). `about`: what the skill is. `principle`: how the app builds
 * it, in one plain sentence. `modes`: where to train it ([hash, name]); the first is the best one for a weak axis.
 */
export const AXES = [
  { id: 'kana', label: 'Kana', jp: '仮名', skill: 'kana',
    about: 'Reading (and at N4, writing) the two syllabaries, hiragana and katakana: the base every other skill stands on.',
    principle: 'Retrieval practice: you recall each character from memory, and spaced reviews bring it back just before you would forget it.',
    modes: [['#/play/dojo', 'Reading Dojo'], ['#/play/brush', 'Kana Brush'], ['#/play/kata', 'Katakana Rush']] },
  { id: 'kanji', label: 'Kanji', jp: '漢字', skill: 'kanji',
    about: 'Knowing kanji by meaning and reading, and the words they build.',
    principle: 'Mnemonics and parts: each kanji is learned as a small picture story built from parts you already know, then reviewed on a spaced schedule.',
    modes: [['#/play/dojo', 'Reading Dojo'], ['#/play/forge', 'Kanji Forge']] },
  { id: 'vocab', label: 'Vocabulary', jp: '語彙', skill: 'vocab',
    about: 'Words you know well enough to recognise and recall: the deck for this level.',
    principle: 'Spaced recall: each word comes back just before you would forget it, in both directions (see it, hear it, say it).',
    modes: [['#/play/garden', 'Garden'], ['#/play/rival', 'Rival Battle']] },
  { id: 'grammar', label: 'Grammar', jp: '文法', skill: 'grammar',
    about: "The patterns that join words into sentences: particles, forms and this level's grammar points.",
    principle: 'Explicit rules, then lots of use: a short lesson explains each point, and drills and cards make you produce it until it is automatic.',
    modes: [['#/course', 'Course'], ['#/play/particle', 'Particle Train'], ['#/play/conj', 'Conjugation Dojo'], ['#/play/build', 'Sentence Builder']] },
  { id: 'listening', label: 'Listening', jp: '聴解', skill: 'listening',
    about: 'Understanding spoken Japanese at the speed of the scenes and the test.',
    principle: 'Comprehensible input: lots of listening just above your level, with the text held back until you have tried.',
    modes: [['#/play/listen', 'Listening Lab'], ['#/play/numbers', 'Numbers & Time']] },
  { id: 'reading', label: 'Reading', jp: '読解', skill: null,
    about: 'Reading real lines and texts: the story chapters, and the kana and kanji under them.',
    principle: 'Comprehensible input: a story where each line adds about one new word, so you read a lot while understanding nearly all of it.',
    modes: [['#/play/story', 'Story'], ['#/play/dojo', 'Reading Dojo']] },
  { id: 'speaking', label: 'Speaking', jp: '会話', skill: 'speaking',
    about: 'Saying words and sentences out loud from memory, at a natural pace.',
    principle: 'Shadowing and output: you say lines along with a model voice and recall them under a little time pressure.',
    modes: [['#/play/rhythm', 'Rhythm'], ['#/play/slice', 'Speak Slice'], ['#/play/build', 'Sentence Builder']] },
  { id: 'pitch', label: 'Pitch', jp: '音調', skill: 'pitch',
    about: "Hearing and making Japanese pitch accent: where a word's pitch drops.",
    principle: 'Pitch accent training: minimal pairs like 箸 and 橋 train the ear first, then you match the melody with your own voice.',
    modes: [['#/play/duel', 'Pitch Duel'], ['#/play/rhythm', 'Rhythm']] },
  { id: 'counters', label: 'Numbers', jp: '数', skill: 'counters',
    about: 'Numbers, prices, times, dates and counters, caught by ear and said right.',
    principle: 'Retrieval in context: short scenes make you catch the number while the sound changes (さんびゃく, いっぽん) do their work.',
    modes: [['#/play/numbers', 'Numbers & Time'], ['#/play/shop', 'Shopkeeper']] },
];
export const AXIS_BY_ID = Object.fromEntries(AXES.map((a) => [a.id, a]));

/** Items of a skill answered well (mastery 60 or more) in the skill model. */
function itemsWell(skill) {
  let n = 0;
  for (const [k, m] of Object.entries(store.engine.mastery)) if (k.startsWith(skill + '|') && m[0] >= 60) n++;
  return n;
}

/**
 * A practice skill's value: half how many items are known well (toward the level's count), half recent first-try
 * accuracy (toward 80%). Neither falls while you're away.
 */
function practiceAxis(skill, level) {
  const target = ITEM_TARGETS[level][skill];
  const n = itemsWell(skill);
  const rate = recentRate(store.engine, skill);
  const value = 0.5 * clamp(n / target) + 0.5 * (rate == null ? 0 : clamp(rate / RATE_TARGET));
  return {
    value,
    text: `${n}/${target}${rate == null ? '' : ` · ${pct(rate)}`}`,
    detail: `${n} of ${target} items answered well (the ${level} aim)${rate == null ? '; accuracy shows after 8 answers' : `, and ${pct(rate)} right on the first try lately (aim: ${pct(RATE_TARGET)})`}.`,
  };
}

/** Kana: at N5 the kana read in the Reading Dojo; from N4 on, the kana written from memory in Kana Brush. */
function kanaAxis(level) {
  if (level === 'N5') {
    const kana = LESSONS.flatMap((l) => l.chars.map((c) => c.k));
    const n = kana.filter((k) => (store.s.items['kana:' + k]?.level || 0) >= 1).length;
    return { value: n / kana.length, text: `${n}/${kana.length}`, detail: `${n} of the ${kana.length} hiragana and katakana learned in the Reading Dojo.` };
  }
  const target = Math.round(BRUSH_KANA.length * 0.8);
  const n = BRUSH_KANA.filter((x) => { const c = store.brushCard(x.k); return c && c.r && c.s >= 4; }).length;
  return { value: n / target, text: `${n}/${target}`, detail: `${n} of ${target} kana written from memory and holding in Kana Brush (from N4 on, the aim is writing them, not just reading).` };
}

/** Reviews waiting in an area: a calm note, never a loss. */
function reviewWaiting(id, now = Date.now()) {
  if (id === 'vocab') return store.dueCards(now).filter((c) => c.kind === 'word').length >= 20;
  if (id === 'grammar') return store.dueGrammar(now).length >= 8;
  if (id === 'kana') return store.dojoDue(now).filter((x) => String(x).startsWith('kana:')).length >= 10 || store.brushDue(now).length >= 10;
  if (id === 'kanji') return store.dojoDue(now).filter((x) => String(x).startsWith('kj:')).length >= 8;
  return false;
}

/** Every axis for a level: [{ ...axis, value (0..1), text, detail, rank, review }]. */
export function axesFor(level, now = new Date()) {
  const areas = Object.fromEntries(({ N4: n4Areas, N3: n3Areas }[level] || n5Areas)(now).map((a) => [a.id, a]));
  return AXES.map((a) => {
    let m;
    if (a.id === 'kana') m = kanaAxis(level);
    else if (['kanji', 'vocab', 'grammar', 'reading'].includes(a.id)) m = { value: areas[a.id].value, text: areas[a.id].text, detail: areas[a.id].title + '.' };
    else m = practiceAxis(a.skill, level);
    const value = clamp(m.value);
    return { ...a, value, text: m.text, detail: m.detail, rank: rankOf(value), review: reviewWaiting(a.id, now.getTime()) };
  });
}

/** The level the chart aims at: the next one not done (as readiness), or the last when every level is done. */
export function chartLevel(now = new Date()) {
  const r = readiness(now);
  return r && APP_LEVELS.includes(r.level) ? r.level : APP_LEVELS[APP_LEVELS.length - 1];
}

/** A level tab's state: done (finished), current (being worked toward), open (unlocked ahead), locked. */
export function levelState(level, current = chartLevel()) {
  if (store.examDone().has(level)) return 'done';
  if (level === current) return 'current';
  return isUnlocked(level) ? 'open' : 'locked';
}

/** Strongest and weakest axes (ties: the first in drawing order). */
export function extremes(axes) {
  const s = axes.slice().sort((a, b) => b.value - a.value)[0];
  const w = axes.slice().sort((a, b) => a.value - b.value)[0];
  return { strong: s, weak: w };
}

// ---------- the last visit's values (this device only) ----------
const KEY = 'kotobaBeat.chart';
export function lastValues(level) {
  try { return (JSON.parse(localStorage.getItem(KEY) || '{}') || {})[level] || null; } catch (e) { return null; }
}
function saveValues(level, axes) {
  try {
    const all = JSON.parse(localStorage.getItem(KEY) || '{}') || {};
    all[level] = Object.fromEntries(axes.map((a) => [a.id, Math.round(a.value * 1000) / 1000]));
    localStorage.setItem(KEY, JSON.stringify(all));
  } catch (e) { /* storage blocked: no growth animation, nothing else lost */ }
}

// ---------- drawing ----------
const N = AXES.length;
const angle = (i) => -Math.PI / 2 + (2 * Math.PI * i) / N;
const point = (i, v, r, cx, cy) => [cx + Math.cos(angle(i)) * r * v, cy + Math.sin(angle(i)) * r * v];
const pts = (vals, r, cx, cy) => vals.map((v, i) => point(i, Math.max(v, 0.03), r, cx, cy).map((x) => x.toFixed(1)).join(',')).join(' ');

/** The radar as SVG. `values`: one per axis (0..1); `ghost`: the level before's values, or null. */
export function radarSVG(axes, { values = axes.map((a) => a.value), ghost = null, mini = false, label = '' } = {}) {
  const W = mini ? 120 : 340, H = mini ? 120 : 300, cx = W / 2, cy = mini ? 60 : 150, R = mini ? 50 : 100;
  const rings = [0.25, 0.5, 0.75, 1].map((f) => `<polygon class="sc-ring" points="${pts(AXES.map(() => f), R, cx, cy)}"/>`).join('');
  const spokes = AXES.map((_, i) => { const [x, y] = point(i, 1, R, cx, cy); return `<line class="sc-spoke" x1="${cx}" y1="${cy}" x2="${x.toFixed(1)}" y2="${y.toFixed(1)}"/>`; }).join('');
  const labels = mini ? '' : axes.map((a, i) => {
    const [x, y] = point(i, 1, R + 18, cx, cy);
    const anchor = Math.abs(x - cx) < 8 ? 'middle' : x > cx ? 'start' : 'end';
    return `<g class="sc-label${a.review ? ' review' : ''}" data-act="axis" data-axis="${a.id}">
      <text x="${x.toFixed(1)}" y="${(y + (y > cy + 20 ? 10 : y < cy - 20 ? -2 : 4)).toFixed(1)}" text-anchor="${anchor}">${esc(a.label)}</text>
      <text class="sc-rank" x="${x.toFixed(1)}" y="${(y + (y > cy + 20 ? 23 : y < cy - 20 ? 11 : 17)).toFixed(1)}" text-anchor="${anchor}">${esc(a.rank.jp)} ${pct(a.value)}</text></g>`;
  }).join('');
  const dots = mini ? '' : values.map((v, i) => { const [x, y] = point(i, Math.max(v, 0.03), R, cx, cy); return `<circle class="sc-dot" data-axis="${AXES[i].id}" cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="3.5"/>`; }).join('');
  return `<svg class="skill-radar${mini ? ' mini' : ''}" viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(label)}">
    <g class="sc-grid" aria-hidden="true">${rings}${spokes}</g>
    ${ghost ? `<polygon class="sc-ghost" points="${pts(ghost, R, cx, cy)}" aria-hidden="true"/>` : ''}
    <polygon class="sc-shape" points="${pts(values, R, cx, cy)}" data-values="${values.map((v) => Math.round(v * 100)).join(',')}" aria-hidden="true"/>
    <g aria-hidden="true">${dots}</g>
    ${labels}
  </svg>`;
}

/** One sentence the screen reader hears for the chart. */
export const chartLabel = (level, axes) => `Skill chart toward ${level}: ${axes.map((a) => `${a.label} ${pct(a.value)}, ${a.rank.en}`).join('; ')}.`;

const reduced = () => typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;

/** Grows the shape from the last visit's values to today's (about a second), unless motion is reduced. */
function animate(svg, from, to) {
  const shape = svg.querySelector('.sc-shape');
  if (!shape || reduced() || !from || from.every((v, i) => Math.abs(v - to[i]) < 0.005)) return;
  const box = svg.viewBox.baseVal;
  const cx = box.width / 2, cy = 150, R = 100;
  const dots = [...svg.querySelectorAll('.sc-dot')];
  svg.classList.add('growing');
  const t0 = performance.now();
  const step = (t) => {
    const k = Math.min(1, (t - t0) / 1000);
    const e = 1 - (1 - k) ** 3;
    const vals = to.map((v, i) => from[i] + (v - from[i]) * e);
    shape.setAttribute('points', pts(vals, R, cx, cy));
    dots.forEach((d, i) => { const [x, y] = point(i, Math.max(vals[i], 0.03), R, cx, cy); d.setAttribute('cx', x.toFixed(1)); d.setAttribute('cy', y.toFixed(1)); });
    if (k < 1) requestAnimationFrame(step); else svg.classList.remove('growing');
  };
  requestAnimationFrame(step);
}

// ---------- the Progress section ----------
/**
 * Mounts the chart into `el` (an element at the top of Progress). Returns a cleanup function. `level`: the tab to
 * show first (default: the level being worked toward).
 */
export function mountSkillChart(el, { level = null } = {}) {
  const current = chartLevel();
  let shown = level && levelState(level, current) !== 'locked' ? level : current;
  let open = null;   // the axis whose Foundations panel is open

  function render({ grow = false } = {}) {
    const axes = axesFor(shown);
    const before = prevLevel(shown);
    const ghost = before && levelState(before, current) !== 'locked' ? axesFor(before).map((a) => a.value) : null;
    const last = shown === current ? lastValues(shown) : null;
    const lastVals = last ? AXES.map((a) => (a.id in last ? last[a.id] : null)) : null;
    const grew = lastVals ? axes.filter((a, i) => lastVals[i] != null && a.value - lastVals[i] >= 0.01) : [];
    const { strong, weak } = extremes(axes);
    const best = weak.modes[0];
    const st = (lv) => levelState(lv, current);
    el.innerHTML = `<section class="panel stack-sm skill-chart" aria-labelledby="sc-h" data-level="${shown}">
      <div class="row-between wrap-gap"><h2 class="section-title" id="sc-h">Your skills</h2>
        <div class="seg sc-tabs" role="tablist" aria-label="Level">${APP_LEVELS.map((lv) => `<button class="seg-btn ${lv === shown ? 'on' : ''}" role="tab" aria-selected="${lv === shown}"
          data-act="sc-level" data-lv="${lv}" data-state="${st(lv)}" ${st(lv) === 'locked' ? 'disabled' : ''}>${st(lv) === 'locked' ? '🔒 ' : st(lv) === 'done' ? '✓ ' : ''}${lv}</button>`).join('')}</div></div>
      <p class="small dim">${shown === current ? `Each axis fills toward what ${shown} asks for.` : st(shown) === 'done' ? `${shown} is done: this is where you finished it.` : `A look ahead at ${shown}: you're working toward ${current} now.`}${ghost ? ` The faint outline is ${before}.` : ''}</p>
      ${APP_LEVELS.filter((lv) => st(lv) === 'locked').slice(0, 1).map((lv) => `<p class="small dim sc-locked">🔒 ${lv}: ${esc(lockLine(lv))}</p>`).join('')}
      <div class="sc-figure">${radarSVG(axes, { values: axes.map((a) => a.value), ghost, label: chartLabel(shown, axes) })}</div>
      <p class="sc-summary">Strongest: <span class="strong">${esc(strong.label)}</span> <span lang="ja">${esc(strong.rank.jp)}</span> (${pct(strong.value)}). Next to grow: <span class="strong">${esc(weak.label)}</span> <span lang="ja">${esc(weak.rank.jp)}</span> (${pct(weak.value)}).</p>
      ${shown === current ? `<a class="btn primary wide" href="${best[0]}" data-act="sc-train">Train ${esc(weak.label.toLowerCase())} in ${esc(best[1])}</a>` : ''}
      <div class="sc-panel" id="sc-panel" aria-live="polite">${open ? panelHTML(axes.find((a) => a.id === open)) : ''}</div>
      <h3 class="section-label">THE NUMBERS</h3>
      <ul class="sc-list" aria-label="Skill chart as a list">${axes.map((a) => `<li>
        <button class="sc-row${open === a.id ? ' on' : ''}" data-act="axis" data-axis="${a.id}" aria-expanded="${open === a.id}" aria-controls="sc-panel">
          <span class="sc-row-name"><span class="strong">${esc(a.label)}</span> <span class="small dim" lang="ja">${esc(a.rank.jp)} · ${esc(a.rank.en)}</span></span>
          <span class="bar" aria-hidden="true"><span style="width:${Math.round(a.value * 100)}%"></span></span>
          <span class="mono small sc-pct" data-value="${Math.round(a.value * 100)}">${pct(a.value)}</span>
          ${grew.includes(a) ? `<span class="tag good sc-grew">+${Math.round((a.value - lastVals[AXES.indexOf(AXIS_BY_ID[a.id])]) * 100)}%</span>` : ''}
          ${a.review ? '<span class="tag sc-review">review waiting</span>' : ''}
        </button></li>`).join('')}</ul>
      <p class="tiny dim">Ranks: ${RANKS.map((r) => `<span lang="ja">${r.jp}</span> ${r.en} (${Math.round(r.from * 100)}%+)`).join(' · ')}. Nothing here goes down while you're away.</p>
    </section>`;
    if (grow && shown === current) animate(el.querySelector('.skill-radar'), lastVals && lastVals.every((v) => v != null) ? lastVals : null, axes.map((a) => a.value));
    if (shown === current) saveValues(shown, axes);
  }

  function panelHTML(a) {
    return `<div class="panel note stack-sm sc-foundation" data-axis="${a.id}">
      <p class="strong">${esc(a.label)} <span lang="ja">${esc(a.jp)}</span> · <span lang="ja">${esc(a.rank.jp)}</span> ${esc(a.rank.en)}, ${pct(a.value)}</p>
      <p class="small">${esc(a.about)}</p>
      <p class="small"><span class="strong">How the app builds it:</span> ${esc(a.principle)}</p>
      <p class="small"><span class="strong">Your numbers:</span> ${esc(a.detail)}${a.review ? ' Some reviews are waiting; they come back whenever you do.' : ''}</p>
      <div class="row-gap wrap-gap">${a.modes.map(([href, name]) => `<a class="btn small-btn" href="${href}">${esc(name)}</a>`).join('')}</div>
    </div>`;
  }

  const onClick = (ev) => {
    const b = ev.target.closest('[data-act]');
    if (!b || !el.contains(b)) return;
    if (b.dataset.act === 'sc-level' && !b.disabled) { shown = b.dataset.lv; open = null; render(); }
    if (b.dataset.act === 'axis') { open = open === b.dataset.axis ? null : b.dataset.axis; render(); el.querySelector('#sc-panel')?.scrollIntoView({ block: 'nearest' }); }
  };
  el.addEventListener('click', onClick);
  render({ grow: true });
  return () => el.removeEventListener('click', onClick);
}

// ---------- the small version on Today ----------
export function skillMini() {
  const level = chartLevel();
  const axes = axesFor(level);
  const { strong, weak } = extremes(axes);
  // Road to N5 sits right beside it on Today and already names what to grow next, with a tip; this names the strongest.
  return `<a class="panel link-panel skill-mini" href="#/progress" aria-label="Your skills toward ${level}: strongest ${esc(strong.label)}, next to grow ${esc(weak.label)}. Open Progress.">
    ${radarSVG(axes, { mini: true, label: chartLabel(level, axes) })}
    <span class="grow small"><span class="strong">Your skills · ${level}</span><br>Strongest: ${esc(strong.label)} <span lang="ja">${esc(strong.rank.jp)}</span></span>
    <span class="dim chev" aria-hidden="true">›</span></a>`;
}
