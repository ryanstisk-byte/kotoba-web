// App shell: router, home ("Today" plan + all modes), today banner, theme, service worker.
import { store } from './store.js';
import { speaker } from './audio.js';
import { MODES, MODE_BY_ID } from './data.js';
import { esc, delegate, toast } from './ui.js';
import { todayPlan, accuracyNote } from './today.js';
import * as garden from './modes/garden.js';
import * as story from './modes/story.js';
import * as particle from './modes/particle.js';
import * as forge from './modes/forge.js';
import * as rhythm from './modes/rhythm.js';
import * as duel from './modes/duel.js';
import * as slice from './modes/slice.js';
import * as shop from './modes/shop.js';
import * as dojo from './modes/dojo.js';
import * as settings from './settings.js';
import * as soundcheck from './soundcheck.js';
import { initReadingHelp, clearReadingHelp, readingConfig } from './furigana.js';

const MOUNTS = { dojo, garden, story, particle, forge, rhythm, duel, slice, shop };

const view = document.getElementById('view');
const banner = document.getElementById('banner');
const titleEl = document.getElementById('title');
const backBtn = document.getElementById('back');
const quietBadge = document.getElementById('quiet-badge');
const rubyBtn = document.getElementById('ruby-toggle');
let cleanup = null;

// ---------- theme ----------
function applyTheme() {
  const t = store.settings.theme;
  if (t === 'auto') document.documentElement.removeAttribute('data-theme');
  else document.documentElement.setAttribute('data-theme', t);
  const dark = t === 'dark' || (t === 'auto' && window.matchMedia('(prefers-color-scheme: dark)').matches);
  document.querySelector('meta[name=theme-color]:not([media])')?.setAttribute('content', dark ? '#120f1c' : '#fbf7f3');
}

function refreshChrome() {
  quietBadge.hidden = !store.settings.quiet;
  speaker.source = store.settings.voice;
  const labels = { auto: 'Auto', romaji: 'Romaji', kana: 'Kana', off: 'Off' };
  rubyBtn.textContent = 'ふa';
  rubyBtn.title = `Reading help: ${labels[store.settings.readingHelp]} (tap to change)`;
  rubyBtn.setAttribute('aria-label', rubyBtn.title);
  rubyBtn.classList.toggle('off', store.settings.readingHelp === 'off');
}

/** Re-render everything with a new reading-help setting. */
export function rerender() {
  clearReadingHelp(document.body);
  route();
}

// ---------- routing ----------
function parse() {
  const h = location.hash.replace(/^#\/?/, '');
  const parts = h.split('/').filter(Boolean);
  return parts;
}

function route() {
  if (cleanup) { try { cleanup(); } catch (e) { console.warn(e); } cleanup = null; }
  speaker.stop();
  banner.innerHTML = '';
  banner.hidden = true;
  view.innerHTML = '';
  view.className = 'view';
  window.scrollTo(0, 0);
  const [a, b, c] = parse();
  refreshChrome();

  if (a === 'play' && MOUNTS[b]) {
    setTitle(MODE_BY_ID[b].title, true);
    view.classList.add('mode-' + b);
    cleanup = MOUNTS[b].mount(view, { quiet: store.settings.quiet });
    return;
  }
  if (a === 'today' && b) {
    const plan = todayPlan();
    const block = plan.blocks.find((x) => x.id === b);
    if (!block) { location.hash = '#/'; return; }
    const modeId = block.mode || c;
    if (!modeId || !MOUNTS[modeId]) { return renderFreePicker(block); }
    setTitle(MODE_BY_ID[modeId].title, true);
    view.classList.add('mode-' + modeId);
    const today = makeTodayCtx(block, modeId);
    cleanup = MOUNTS[modeId].mount(view, { ...block.ctx, quiet: store.settings.quiet, today });
    return;
  }
  if (a === 'settings') {
    setTitle('Settings', true);
    cleanup = settings.mount(view, { applyTheme, refreshChrome, rerender });
    return;
  }
  if (a === 'check') {
    setTitle('Sound & mic check', true);
    cleanup = soundcheck.mount(view);
    return;
  }
  setTitle('今日 · Today', false);
  document.title = 'Kotoba Beat';
  renderHome();
}

function setTitle(t, back) {
  titleEl.textContent = t;
  backBtn.hidden = !back;
  document.title = back ? `${t} · Kotoba Beat` : 'Kotoba Beat';
}

// ---------- today banner ----------
function makeTodayCtx(block, modeId) {
  let progress = '';
  let doneMsg = '';
  let isDone = block.status === 'done';
  const draw = () => {
    banner.hidden = false;
    banner.innerHTML = isDone
      ? `<div class="banner done"><span class="grow"><span class="strong">✓ Block ${block.n} done</span>${doneMsg ? `<br><span class="small">${esc(doneMsg)}</span>` : ''}</span>
          <a class="btn primary small-btn" href="#/">Back to Today</a></div>`
      : `<div class="banner"><span class="grow"><span class="small dim">Today · block ${block.n}</span><br><span class="strong">${esc(MODE_BY_ID[modeId].title)}</span> <span class="mono small dim">${esc(progress)}</span></span>
          <button class="btn small-btn" data-bact="skip">Skip</button><button class="btn small-btn good" data-bact="done">Done ✓</button></div>`;
  };
  banner.onclick = (ev) => {
    const t = ev.target.closest('[data-bact]');
    if (!t) return;
    if (t.dataset.bact === 'skip') { store.setBlock(block.id, 'skipped'); location.hash = '#/'; }
    if (t.dataset.bact === 'done') { store.setBlock(block.id, 'done'); location.hash = '#/'; }
  };
  draw();
  return {
    report(text) { progress = text; if (!isDone) draw(); },
    done(msg = '') {
      doneMsg = msg;
      if (!isDone) { isDone = true; store.setBlock(block.id, 'done'); }
      draw();
    },
  };
}

function renderFreePicker(block) {
  setTitle('Free choice', true);
  const quiet = store.settings.quiet;
  view.innerHTML = `<div class="stack"><p class="lead strong">Saturday: pick anything.</p>
    <div class="mode-grid">${MODES.map((m) => modeCard(m, quiet, `#/today/${block.id}/${m.id}`)).join('')}</div></div>`;
}

// ---------- home ----------
function welcome() {
  const last = store.previousSession;
  if (!last) return "ようこそ! Let's start with sounds you mostly know.";
  const days = Math.floor((Date.now() - last) / 86_400_000);
  if (days >= 2) return `おかえり! ${days} days away. Nothing was lost; let's warm up.`;
  return 'おかえり! Pick up where you left off.';
}

function modeCard(m, quiet, href) {
  const needsMic = m.mic && quiet;
  return `<a class="panel mode-card" href="${href}">
    <span class="mode-icon" aria-hidden="true">${m.icon}</span>
    <span class="grow"><span class="strong big">${esc(m.title)}</span> <span class="small dim" lang="ja">${esc(m.jp)}</span>
      ${needsMic ? `<span class="tag">${m.id === 'slice' ? 'quiet: listen &amp; choose' : 'needs mic'}</span>` : ''}
      <br><span class="small dim">${esc(m.body)}</span></span>
    <span class="dim chev" aria-hidden="true">›</span></a>`;
}

function isStandalone() {
  return window.matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
}

function renderHome() {
  const plan = todayPlan();
  const items = Object.values(store.s.items);
  const thirsty = store.thirsty().length;
  const well = items.filter((p) => p.level >= 2).length;
  const quiet = store.settings.quiet;
  const showHint = !isStandalone() && !store.settings.hideIosHint;
  const doneCount = plan.blocks.filter((b) => b.status === 'done').length;

  const blockRow = (b) => {
    const st = b.status;
    const href = `#/today/${b.id}`;
    return `<div class="block-row ${st || ''}">
      <span class="block-check" aria-label="${st === 'done' ? 'done' : st === 'skipped' ? 'skipped' : 'to do'}">${st === 'done' ? '✓' : st === 'skipped' ? '–' : b.n}</span>
      <span class="grow"><span class="strong">${esc(b.title)}</span> <span class="small dim">~${b.mins} min</span><br><span class="small dim">${esc(b.desc)}</span></span>
      ${st === 'done' ? `<a class="btn small-btn" href="${href}">Again</a>`
        : `<span class="block-actions"><a class="btn primary small-btn" href="${href}">${st === 'skipped' ? 'Do it' : 'Start'}</a>${st ? '' : `<button class="btn small-btn ghost" data-act="skip" data-id="${b.id}">Skip</button>`}</span>`}
    </div>`;
  };

  const acc = store.weekAccuracy();
  view.innerHTML = `
    <div class="stack">
      <div>
        <h1 class="app-title">Kotoba Beat</h1>
        <p class="dim">${esc(welcome())}</p>
      </div>
      ${showHint ? `<div class="panel hint"><span class="grow small">📱 On iPhone: <span class="strong">Share › Add to Home Screen</span> keeps your progress safe (Safari may clear website data after ~7 days unused).</span>
        <button class="iconbtn" data-act="hidehint" aria-label="Dismiss">✕</button></div>` : ''}
      ${!store.trackDone('hiragana') && !store.clearedLessons.size ? `<a class="panel hint link-panel" href="#/play/dojo"><span class="grow small">🔤 <span class="strong">New to reading Japanese?</span> Start in the Reading Dojo: hiragana, katakana, then kanji. Until then, every game shows romaji (tap ふa at the top to change it).</span><span class="dim chev" aria-hidden="true">›</span></a>` : ''}
      <a class="panel hint link-panel" href="#/check"><span class="grow small">🔧 No sound, or the mic doesn't hear you? Run the <span class="strong">sound &amp; mic check</span>.</span><span class="dim chev" aria-hidden="true">›</span></a>
      <div class="tiles">
        <div class="panel tile"><span class="tile-v mono">${thirsty}</span><span class="small dim">plants need water</span></div>
        <div class="panel tile"><span class="tile-v mono">${well}</span><span class="small dim">remembered well</span></div>
        <div class="panel tile"><span class="tile-v mono">${store.daysStudiedThisMonth()}</span><span class="small dim">days studied this month</span></div>
      </div>

      <section class="panel today" aria-labelledby="today-h">
        <div class="row-between wrap-gap">
          <h2 id="today-h" class="section-title">Today</h2>
          <div class="seg compact" role="radiogroup" aria-label="Session length">
            <button class="seg-btn ${!plan.short ? 'on' : ''}" data-act="len" data-v="standard" role="radio" aria-checked="${!plan.short}">Standard ~20m</button>
            <button class="seg-btn ${plan.short ? 'on' : ''}" data-act="len" data-v="short" role="radio" aria-checked="${plan.short}">Short ~10m</button>
          </div>
        </div>
        <label class="switch-row small"><span>🤫 Quiet mode (no speaking: trains, planes)</span><input type="checkbox" data-act="quiet" ${quiet ? 'checked' : ''}></label>
        ${plan.blocks.map(blockRow).join('')}
        ${plan.sunday ? '<p class="small dim">Sunday: review only. 休む ことも 修行だ (resting is part of training too).</p>' : ''}
        <p class="tiny dim">Skip anything. Nothing is lost by skipping blocks or days.</p>
      </section>

      ${plan.finished && doneCount ? `
      <section class="panel summary" aria-label="Today's summary">
        <h2 class="section-title">お疲れさま! Today's done</h2>
        <div class="tiles">
          <div class="tile"><span class="tile-v mono">${Object.keys(store.s.items).length}</span><span class="small dim">words in the garden</span></div>
          <div class="tile"><span class="tile-v mono">${store.day().rev}</span><span class="small dim">reviewed today</span></div>
          <div class="tile"><span class="tile-v mono">${acc.rate == null ? '–' : Math.round(acc.rate * 100) + '%'}</span><span class="small dim">accuracy this week</span></div>
        </div>
        <p class="small">${esc(accuracyNote(acc.rate, plan.short))}</p>
        <p class="small dim">Days studied this month: ${store.daysStudiedThisMonth()}. No streaks here; come back whenever.</p>
      </section>` : ''}

      <h2 class="section-label">ALL MODES</h2>
      <div class="mode-grid">${MODES.map((m) => modeCard(m, quiet, `#/play/${m.id}`)).join('')}</div>
      <p class="small dim">Tip: the app has its own built-in voice that works everywhere. For more variety, switch to your device's Japanese voices in Settings.</p>
    </div>`;
  const off = delegate(view, {
    skip: (b) => { store.setBlock(b.dataset.id, 'skipped'); renderHome(); },
    len: (b) => { store.setSetting('length', b.dataset.v); renderHome(); },
    hidehint: () => { store.setSetting('hideIosHint', true); renderHome(); },
  });
  const onChange = (ev) => {
    if (ev.target.matches('[data-act=quiet]')) { store.setSetting('quiet', ev.target.checked); refreshChrome(); renderHome(); }
  };
  view.addEventListener('change', onChange);
  if (cleanup) cleanup();
  cleanup = () => { off(); view.removeEventListener('change', onChange); };
}

// ---------- boot ----------
backBtn.addEventListener('click', () => {
  const [a] = parse();
  if (a === 'today' || a === 'play' || a === 'settings' || a === 'check') location.hash = '#/';
  else history.back();
});
window.addEventListener('hashchange', route);
rubyBtn.addEventListener('click', () => {
  const order = ['auto', 'romaji', 'kana', 'off'];
  const next = order[(order.indexOf(store.settings.readingHelp) + 1) % order.length];
  store.setSetting('readingHelp', next);
  const c = readingConfig();
  const what = next === 'off' ? 'off' : next === 'auto'
    ? `auto (now: ${c.hira ? 'romaji over everything' : c.kata ? 'romaji over katakana, furigana over kanji' : 'furigana over kanji'})`
    : next === 'romaji' ? 'romaji over everything' : 'furigana over kanji';
  refreshChrome();
  rerender();
  toast(`Reading help: ${what}`);
});
window.matchMedia('(prefers-color-scheme: dark)').addEventListener?.('change', applyTheme);
applyTheme();
store.markSession();
refreshChrome();
initReadingHelp([document.body]);
route();

// Ask the browser not to evict our storage (helps on Chrome; Safari needs Add to Home Screen).
try { navigator.storage?.persist?.().catch(() => {}); } catch (e) { /* ignore */ }

if ('serviceWorker' in navigator && location.protocol !== 'file:') {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch((e) => console.warn('SW registration failed', e));
  });
}
